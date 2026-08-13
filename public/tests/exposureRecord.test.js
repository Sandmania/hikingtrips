import { expect } from './imports-test.js';
import {
    parseSensorLog,
    wallTimeToInstant,
    tripWindowFromTrack,
    toExposureRecord
} from '../assets/components/weatherTimeline/exposureRecord.js';

// Shaped like the Kestrel DROP 2 export: three device rows above the header,
// a units row below it, and samples in descending time order.
const SENSOR_LOG = [
    '"Device Name","SandWeather"',
    '"Device Model","Kestrel DROP 2"',
    '"Serial Number","2224283"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type","Record name"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-04 12:00:00 PM","18.4","61.0","18.1","10.6","point"',
    '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"',
    '"2025-07-04 11:00:00 AM","16.0","70.1","15.9","10.6","point"',
    ''
].join('\n');

describe('Sensor Log parsing', () => {

    it('reads samples from below the header row, whatever its position', () => {
        const samples = parseSensorLog(SENSOR_LOG);

        expect(samples).to.have.lengthOf(3);
        expect(samples.map(s => s.temperature)).to.have.members([18.4, 17.2, 16.0]);
    });

    it('keeps only rows whose Data Type is point', () => {
        const withSessionRows = SENSOR_LOG.replace(
            '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"',
            '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"\n'
            + '"2025-07-04 11:15:00 AM","99.9","0.0","99.9","0.0","session"'
        );

        const samples = parseSensorLog(withSessionRows);

        expect(samples).to.have.lengthOf(3);
        expect(samples.map(s => s.temperature)).to.not.include(99.9);
    });

    it('sorts ascending, since the export is newest-first', () => {
        const samples = parseSensorLog(SENSOR_LOG);

        expect(samples.map(s => s.wallTime)).to.deep.equal([
            '2025-07-04 11:00:00',
            '2025-07-04 11:30:00',
            '2025-07-04 12:00:00'
        ]);
    });

});

describe('wall time to instant', () => {

    it('reads a naive wall time in the trip timezone, not the viewer\'s', () => {
        // Europe/Helsinki is UTC+3 in July.
        const instant = wallTimeToInstant('2025-07-04 12:00:00', 'Europe/Helsinki');

        expect(instant.toISOString()).to.equal('2025-07-04T09:00:00.000Z');
    });

    it('follows the zone across DST rather than assuming a fixed offset', () => {
        // Same zone, January: UTC+2.
        const instant = wallTimeToInstant('2025-01-04 12:00:00', 'Europe/Helsinki');

        expect(instant.toISOString()).to.equal('2025-01-04T10:00:00.000Z');
    });

});

// One <trk> per day, as combined.gpx is built, with the trackpoint times in UTC.
const TRACK = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Day 1</name><trkseg>
    <trkpt lat="69.40" lon="25.85"><ele>250</ele><time>2025-07-04T08:09:00Z</time></trkpt>
    <trkpt lat="69.41" lon="25.86"><ele>255</ele><time>2025-07-04T08:39:00Z</time></trkpt>
  </trkseg></trk>
  <trk><name>Day 2</name><trkseg>
    <trkpt lat="69.42" lon="25.87"><ele>260</ele><time>2025-07-05T06:00:00Z</time></trkpt>
    <trkpt lat="69.43" lon="25.88"><ele>265</ele><time>2025-07-05T11:56:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe('Trip Window', () => {

    it('spans the first and last trackpoint of the actual route', () => {
        const tripWindow = tripWindowFromTrack(TRACK);

        expect(tripWindow.start.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
        expect(tripWindow.end.toISOString()).to.equal('2025-07-05T11:56:00.000Z');
    });

});

// The logger ran from indoors before the walk-in, as the real one did: a warm
// spike at 09:30 local that belongs to a building, not to the trip.
const LOG_STARTING_INDOORS = [
    '"Device Name","SandWeather"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-05 03:00:00 PM","19.5","55.0","19.2","10.1","point"',
    '"2025-07-05 09:00:00 AM","12.8","78.0","12.6","9.1","point"',
    '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"',
    '"2025-07-04 11:09:00 AM","16.0","70.1","15.9","10.6","point"',
    '"2025-07-04 09:30:00 AM","24.3","31.0","23.8","6.0","point"',
    '"2025-07-04 09:00:00 AM","39.7","18.0","38.9","5.5","point"',
    ''
].join('\n');

describe('Exposure Record', () => {

    it('drops samples taken before the trip started', () => {
        const record = toExposureRecord(LOG_STARTING_INDOORS, {
            timeZone: 'Europe/Helsinki',
            tripWindow: tripWindowFromTrack(TRACK)
        });

        expect(record.map(s => s.temperature)).to.not.include(39.7);
        expect(record.map(s => s.temperature)).to.not.include(24.3);
    });

    it('keeps every sample from the first trackpoint to the last, in order', () => {
        const record = toExposureRecord(LOG_STARTING_INDOORS, {
            timeZone: 'Europe/Helsinki',
            tripWindow: tripWindowFromTrack(TRACK)
        });

        // Trip Window is 08:09Z–11:56Z, i.e. 11:09–14:56 Helsinki: the 11:09
        // sample sits exactly on the opening edge and must survive it.
        expect(record.map(s => s.wallTime)).to.deep.equal([
            '2025-07-04 11:09:00',
            '2025-07-04 11:30:00',
            '2025-07-05 09:00:00'
        ]);
    });

    it('carries the trip-local wall time alongside the instant', () => {
        const record = toExposureRecord(LOG_STARTING_INDOORS, {
            timeZone: 'Europe/Helsinki',
            tripWindow: tripWindowFromTrack(TRACK)
        });

        expect(record[0].instant.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
        expect(record[0].wallTime).to.equal('2025-07-04 11:09:00');
    });

});

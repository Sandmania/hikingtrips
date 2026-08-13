import { expect } from './imports-test.js';
import { toExposureRecord } from '../assets/components/weatherTimeline/exposureRecord.js';
import { parseActualRoute } from '../assets/components/weatherTimeline/actualRoute.js';
import { extremes } from '../assets/components/weatherTimeline/extremes.js';

// Two Walking Windows with a Camp between them, shaped like the muotka2025
// story: 09:00-14:00 then 10:00-13:00 the next day, Helsinki time.
const TRACK = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Combined Track</name>
  <trkseg>
    <trkpt lat="69.40" lon="25.85"><time>2025-07-05T06:00:00Z</time></trkpt>
    <trkpt lat="69.41" lon="25.86"><time>2025-07-05T11:00:00Z</time></trkpt>
  </trkseg>
  <trkseg>
    <trkpt lat="69.42" lon="25.87"><time>2025-07-06T07:00:00Z</time></trkpt>
    <trkpt lat="69.43" lon="25.88"><time>2025-07-06T10:00:00Z</time></trkpt>
  </trkseg>
</trk>
</gpx>`;

// The trip's shape in miniature: a warm spike indoors before the walk-in, a
// night in camp colder than any walking hour, and a midday peak in full sun.
const SENSOR_LOG = [
    '"Device Name","SandWeather"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-06 12:30:00 PM","30.5","24.0","30.0","8.2","point"',
    '"2025-07-06 10:30:00 AM","8.6","95.0","8.5","7.9","point"',
    '"2025-07-06 01:00:00 AM","3.1","88.0","3.0","1.3","point"',
    '"2025-07-05 01:00:00 PM","21.0","48.0","20.6","9.4","point"',
    '"2025-07-05 09:00:00 AM","12.0","70.0","11.9","6.8","point"',
    '"2025-07-04 05:00:00 PM","39.7","18.0","38.9","5.5","point"',
    ''
].join('\n');

const TIME_ZONE = 'Europe/Helsinki';

function muotkaShaped(sensorLog = SENSOR_LOG, track = TRACK) {
    const { walkingWindows, tripWindow } = parseActualRoute(track);
    return {
        record: toExposureRecord(sensorLog, { timeZone: TIME_ZONE, tripWindow }),
        walkingWindows
    };
}

describe('Exposure Record extremes', () => {

    it('finds the coldest reading of the trip, nights included', () => {
        const { record, walkingWindows } = muotkaShaped();

        const { coldest } = extremes(record, walkingWindows);

        // 01:00 in a tent, hours after the watch stopped recording.
        expect(coldest.temperature).to.equal(3.1);
        expect(coldest.wallTime).to.equal('2025-07-06 01:00:00');
    });

    it('finds the warmest reading, taking the record as trimmed', () => {
        const { record, walkingWindows } = muotkaShaped();

        const { warmest } = extremes(record, walkingWindows);

        // The 39.7 °C indoor spike the day before the walk-in is not in the
        // Exposure Record at all, so it cannot be the trip's maximum.
        expect(warmest.temperature).to.equal(30.5);
        expect(warmest.wallTime).to.equal('2025-07-06 12:30:00');
    });

    it('reads the coldest walking hour from inside the Walking Windows alone', () => {
        const { record, walkingWindows } = muotkaShaped();

        const { coldestWalking } = extremes(record, walkingWindows);

        // The 3.1 °C night is colder, but the watch was off and the hiker was
        // in Camp: this tile answers what it was like to walk, which is why the
        // elevation profile's minimum and the trip's minimum disagree.
        expect(coldestWalking.temperature).to.equal(8.6);
        expect(coldestWalking.wallTime).to.equal('2025-07-06 10:30:00');
    });

    it('has no walking reading to give when the log only covers Camp', () => {
        const inCampOnly = onlyReading('2025-07-06 01:00:00 AM', '3.1');
        const { record, walkingWindows } = muotkaShaped(inCampOnly);

        const { coldest, coldestWalking } = extremes(record, walkingWindows);

        // Nothing was measured while moving, so there is no answer to give —
        // and saying so is not the same as failing to draw the trip at all.
        expect(coldest.temperature).to.equal(3.1);
        expect(coldestWalking).to.be.null;
    });

    it('counts a reading taken exactly as the watch started or stopped', () => {
        // The windows run 09:00-14:00 and 10:00-13:00 on the trip's own clock,
        // and the logger's half-hour cadence lands on both of those edges.
        const atFirstTrackpoint = onlyReading('2025-07-05 09:00:00 AM', '7.0');
        const atLastTrackpoint = onlyReading('2025-07-06 01:00:00 PM', '6.5');

        expect(coldestWalkingOf(atFirstTrackpoint).temperature).to.equal(7.0);
        expect(coldestWalkingOf(atLastTrackpoint).temperature).to.equal(6.5);
    });

});

/** A Sensor Log holding one reading, so it is the only one left to choose. */
function onlyReading(wallTime, temperature) {
    return [
        '"Device Name","SandWeather"',
        '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
        '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
        `"${wallTime}","${temperature}","70.0","7.0","5.0","point"`,
        ''
    ].join('\n');
}

function coldestWalkingOf(sensorLog) {
    const { record, walkingWindows } = muotkaShaped(sensorLog);
    return extremes(record, walkingWindows).coldestWalking;
}

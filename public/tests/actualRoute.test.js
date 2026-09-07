import { expect } from './imports-test.js';
import { parseActualRoute } from '../assets/components/weatherTimeline/actualRoute.js';

// One <trk> per day, each a single Walking Window, with trackpoint times in UTC.
const TRACK_PER_DAY = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Day 1</name><trkseg>
    <trkpt lat="69.40" lon="25.85"><ele>250</ele><time>2025-07-04T08:09:00Z</time></trkpt>
    <trkpt lat="69.41" lon="25.86"><ele>255</ele><time>2025-07-04T14:12:00Z</time></trkpt>
  </trkseg></trk>
  <trk><name>Day 2</name><trkseg>
    <trkpt lat="69.42" lon="25.87"><ele>260</ele><time>2025-07-05T06:00:00Z</time></trkpt>
    <trkpt lat="69.43" lon="25.88"><ele>265</ele><time>2025-07-05T11:56:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

// muotka2025's combined.gpx as it really is: a single <trk> holding one
// <trkseg> per day, with these true first and last trackpoint times.
const MUOTKA_DAYS = [
    ['2025-07-04T08:09:18Z', '2025-07-04T14:12:47Z'],
    ['2025-07-05T06:55:33Z', '2025-07-05T13:57:29Z'],
    ['2025-07-06T06:33:39Z', '2025-07-06T14:12:01Z'],
    ['2025-07-07T08:18:50Z', '2025-07-07T11:12:01Z'],
    ['2025-07-08T06:31:06Z', '2025-07-08T13:43:53Z'],
    ['2025-07-09T07:27:42Z', '2025-07-09T14:37:11Z'],
    ['2025-07-10T06:32:42Z', '2025-07-10T11:56:47Z']
];

export const MUOTKA_TRACK = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Combined Track</name>
${MUOTKA_DAYS.map(([start, end], day) => `  <trkseg>
    <trkpt lat="69.${300 + day}" lon="26.${100 + day}"><time>${start}</time></trkpt>
    <trkpt lat="69.${310 + day}" lon="26.${110 + day}"><time>${end}</time></trkpt>
  </trkseg>`).join('\n')}
</trk>
</gpx>`;

describe('Walking Windows', () => {

    it('reads one window per track, from its first trackpoint to its last', () => {
        const { walkingWindows } = parseActualRoute(TRACK_PER_DAY);

        expect(walkingWindows).to.have.lengthOf(2);
        expect(walkingWindows[0].start.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
        expect(walkingWindows[0].end.toISOString()).to.equal('2025-07-04T14:12:00.000Z');
        expect(walkingWindows[1].start.toISOString()).to.equal('2025-07-05T06:00:00.000Z');
        expect(walkingWindows[1].end.toISOString()).to.equal('2025-07-05T11:56:00.000Z');
    });

    it('numbers the windows by day, in the order they were walked', () => {
        const outOfOrder = TRACK_PER_DAY.replace(
            /(<trk><name>Day 1<\/name>[\s\S]*?<\/trk>)\s*(<trk><name>Day 2<\/name>[\s\S]*?<\/trk>)/,
            '$2\n  $1'
        );

        const { walkingWindows } = parseActualRoute(outOfOrder);

        expect(walkingWindows.map(w => w.day)).to.deep.equal([1, 2]);
        expect(walkingWindows[0].start.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
    });

    it('keeps every trackpoint\'s time and position, so the file is read only once', () => {
        const { walkingWindows } = parseActualRoute(TRACK_PER_DAY);

        const trackpoints = walkingWindows[0].trackpoints;
        expect(trackpoints).to.have.lengthOf(2);
        expect(trackpoints[0].at.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
        expect(trackpoints[0].latitude).to.equal(69.40);
        expect(trackpoints[0].longitude).to.equal(25.85);
        expect(trackpoints[1].latitude).to.equal(69.41);
    });

    it('finds muotka2025\'s seven windows in one track, the shortest being day 4', () => {
        const { walkingWindows } = parseActualRoute(MUOTKA_TRACK);

        expect(walkingWindows).to.have.lengthOf(7);

        const hours = walkingWindows.map(w => (w.end - w.start) / 3600000);
        const shortest = walkingWindows[hours.indexOf(Math.min(...hours))];
        expect(shortest.day).to.equal(4);
        expect(Math.min(...hours)).to.be.below(3);   // day 4, 2.9 h
        expect(hours[0]).to.be.above(6);             // day 1, 6.1 h
    });

    it('leaves a gap between consecutive windows, which is the night in Camp', () => {
        const { walkingWindows } = parseActualRoute(MUOTKA_TRACK);

        const camps = walkingWindows.slice(1)
            .map((window, index) => (window.start - walkingWindows[index].end) / 3600000);

        expect(camps).to.have.lengthOf(6);
        expect(Math.min(...camps)).to.be.above(0);
    });

});

describe('Trip Window', () => {

    it('spans from the start of the first Walking Window to the end of the last', () => {
        const { tripWindow } = parseActualRoute(TRACK_PER_DAY);

        expect(tripWindow.start.toISOString()).to.equal('2025-07-04T08:09:00.000Z');
        expect(tripWindow.end.toISOString()).to.equal('2025-07-05T11:56:00.000Z');
    });

    it('refuses a route with no timed trackpoints, since there is nothing to trim to', () => {
        const untimed = TRACK_PER_DAY.replace(/<time>.*?<\/time>/g, '');

        expect(() => parseActualRoute(untimed)).to.throw(/Trip Window/);
    });

});

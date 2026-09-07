import { expect } from './imports-test.js';
import { parseActualRoute } from '../assets/components/weatherTimeline/actualRoute.js';
import { positionAt } from '../assets/components/weatherTimeline/positionAt.js';
import { wallTimeToInstant } from '../assets/components/weatherTimeline/exposureRecord.js';
import { MUOTKA_TRACK } from './actualRoute.test.js';

// Two days of walking with a night between them, each day recorded at a
// trackpoint an hour: enough points that "nearest in time" is a real choice
// rather than a coin toss between two.
const TWO_DAYS = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Day 1</name><trkseg>
    <trkpt lat="69.40" lon="25.85"><time>2025-07-04T08:00:00Z</time></trkpt>
    <trkpt lat="69.41" lon="25.86"><time>2025-07-04T09:00:00Z</time></trkpt>
    <trkpt lat="69.42" lon="25.87"><time>2025-07-04T10:00:00Z</time></trkpt>
  </trkseg></trk>
  <trk><name>Day 2</name><trkseg>
    <trkpt lat="69.50" lon="25.95"><time>2025-07-05T08:00:00Z</time></trkpt>
    <trkpt lat="69.51" lon="25.96"><time>2025-07-05T09:00:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

const { walkingWindows } = parseActualRoute(TWO_DAYS);

describe('where the hiker was', () => {

    it('is the trackpoint nearest in time, while walking', () => {
        const at = new Date('2025-07-04T09:40:00Z');

        const position = positionAt(walkingWindows, at);

        // Nearer 10:00 than 09:00, and it is a recorded position rather than
        // one interpolated along the line between the two.
        expect(position.latitude).to.equal(69.42);
        expect(position.longitude).to.equal(25.87);
    });

    it('holds at the preceding Camp between two Walking Windows', () => {
        const night = new Date('2025-07-04T22:00:00Z');

        const position = positionAt(walkingWindows, night);

        // A Camp is the last trackpoint of the day that ended there, so the
        // night belongs to where day 1 stopped and not to where day 2 began —
        // even though 22:00 is nearer day 2's first trackpoint in time.
        expect(position.latitude).to.equal(69.42);
        expect(position.longitude).to.equal(25.87);
        expect(position.camp).to.be.true;
    });

    it('puts muotka2025\'s coldest hour at the camp of 05-06 Jul', () => {
        const { walkingWindows: muotka } = parseActualRoute(MUOTKA_TRACK);
        // 3.1 °C, the trip's low, on the trip's own clock.
        const coldest = wallTimeToInstant('2025-07-06 01:00:00', 'Europe/Helsinki');

        const position = positionAt(muotka, coldest);

        // Day 2 ended at 13:57 UTC and day 3 began at 06:33 the next morning:
        // the cold hour between them was spent where day 2 stopped.
        const dayTwo = muotka[1].trackpoints[muotka[1].trackpoints.length - 1];
        expect(position.camp).to.be.true;
        expect(position.latitude).to.equal(dayTwo.latitude);
        expect(position.longitude).to.equal(dayTwo.longitude);
    });

});

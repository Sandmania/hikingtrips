import { expect } from './imports-test.js';
import { nearestSample } from '../assets/components/weatherTimeline/nearestSample.js';

// The logger's half-hourly cadence, through the coldest hour of a night.
const SAMPLES = [
    { at: new Date('2025-07-05T00:30:00Z'), temperature: 4.2 },
    { at: new Date('2025-07-05T01:00:00Z'), temperature: 3.1 },
    { at: new Date('2025-07-05T01:30:00Z'), temperature: 3.6 }
];

describe('nearest sample', () => {

    it('reads a moment between two readings as the nearer one, not as a value between them', () => {
        const sample = nearestSample(SAMPLES, new Date('2025-07-05T01:19:00Z'));

        // 01:19 is 11 minutes from 01:30 and 19 from 01:00. An interpolated
        // 3.42 °C would be a temperature the device never recorded.
        expect(sample.temperature).to.equal(3.6);
    });

    it('reads a moment past the last reading as that reading', () => {
        const sample = nearestSample(SAMPLES, new Date('2025-07-05T02:10:00Z'));

        // The Trip Window ends where the watch stopped, which the logger's own
        // cadence need not line up with. The stretch of axis past the last
        // reading is still part of the trip, and pointing at it must answer.
        expect(sample.temperature).to.equal(3.6);
    });

    it('reads a moment exactly between two readings as the earlier one', () => {
        const sample = nearestSample(SAMPLES, new Date('2025-07-05T01:15:00Z'));

        // Arbitrary, but fixed: an even split that answered differently from
        // one pointer event to the next would flicker between two readings.
        expect(sample.temperature).to.equal(3.1);
    });

});

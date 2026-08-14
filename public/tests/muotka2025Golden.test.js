import { expect } from './imports-test.js';
import { parseActualRoute } from '../assets/components/weatherTimeline/actualRoute.js';
import { toExposureRecord } from '../assets/components/weatherTimeline/exposureRecord.js';
import { extremes } from '../assets/components/weatherTimeline/extremes.js';

// The golden test: muotka2025's real Sensor Log and real actual route, run
// through the real pipeline, asserted against the trip's known figures.
//
// Every other weather test uses a fixture, and fixtures pin the parsing rules.
// This one pins the trip's actual story, and so is the test that notices when a
// re-exported GPX shifts the Trip Window or a re-pulled CSV changes the
// extremes -- quietly turning the chart into a claim about a different trip.
const TRIP = '../muotka2025';
const SENSOR_LOG = `${TRIP}/SandWeather_Jul_10,_2025___17_00_00.csv`;
const ACTUAL_ROUTE = `${TRIP}/actual_route/combined.gpx`;
const TIME_ZONE = 'Europe/Helsinki';

describe('muotka2025, as walked', () => {

    // The whole trip, read once: the route is 213 KB of GPX and every figure
    // below is a different reading of the same two files.
    let config;
    let route;
    let record;
    let trip;

    before(async () => {
        let csvText, gpxText;
        [csvText, gpxText, config] = await Promise.all([
            fetchText(SENSOR_LOG),
            fetchText(ACTUAL_ROUTE),
            fetchText(`${TRIP}/trip_config.yaml`)
        ]);
        route = parseActualRoute(gpxText);
        record = toExposureRecord(csvText, { timeZone: TIME_ZONE, tripWindow: route.tripWindow });
        trip = extremes(record, route.walkingWindows);
    });

    // The figures below are only the trip's if the site reads the same two files
    // this test does. Renaming the Sensor Log, re-pointing the actual route or
    // moving the trip to another zone would leave every assertion here passing
    // while the chart went on to say something else entirely.
    it('is drawn from the files this test asserts', () => {
        expect(`${TRIP}/${configValue(config, 'weather', 'csvUrl')}`,
            'weather.csvUrl in trip_config.yaml').to.equal(SENSOR_LOG);
        expect(`${TRIP}/${configValue(config, 'actualRoute', 'gpx')}`,
            'actualRoute.gpx in trip_config.yaml').to.equal(ACTUAL_ROUTE);
        expect(configValue(config, 'weather', 'timezone'),
            'weather.timezone in trip_config.yaml').to.equal(TIME_ZONE);
    });

    it('logged 295 samples inside the Trip Window', () => {
        expect(record.length, 'samples in the Trip Window').to.equal(295);
    });

    // Seven days walked, one <trkseg> each: combined.gpx is a single <trk>
    // holding a segment per day, and the breaks between those segments are the
    // nights in Camp. Anyone merging them into one segment loses the Camps —
    // the trip becomes one unbroken walk — and this count is what catches it.
    it('was walked in 7 Walking Windows, one per day', () => {
        expect(route.walkingWindows.length, 'Walking Windows').to.equal(7);
    });

    // The trip's low came at 01:00 on the fourth night, in the tent, hours after
    // the watch stopped -- so it exists only in the Exposure Record. Wall times
    // are the device's own, i.e. already the trip's clock, never the viewer's.
    it('was coldest at 3.1 °C, 2025-07-06 01:00 local', () => {
        const { coldest } = trip;

        expect(coldest.temperature, 'coldest').to.equal(3.1);
        expect(coldest.wallTime, 'coldest, at').to.equal('2025-07-06 01:00:00');
    });

    // Midday on the last day, with the sensor hanging off the pack in full sun:
    // what the hiker was exposed to, not shade air temperature (CONTEXT.md).
    it('was warmest at 30.5 °C, 2025-07-10 12:30 local', () => {
        const { warmest } = trip;

        expect(warmest.temperature, 'warmest').to.equal(30.5);
        expect(warmest.wallTime, 'warmest, at').to.equal('2025-07-10 12:30:00');
    });

    // Day 4's walk, and 5.5 °C above the trip's low: the gap between this figure
    // and `coldest` is the whole reason both are shown, since the elevation
    // profile can only ever know the Walking Windows.
    it('was coldest while walking at 8.6 °C, 2025-07-07 13:00 local', () => {
        const { coldestWalking } = trip;

        expect(coldestWalking.temperature, 'coldest while walking').to.equal(8.6);
        expect(coldestWalking.wallTime, 'coldest while walking, at').to.equal('2025-07-07 13:00:00');
    });

});

/**
 * One setting out of a trip config, read from the YAML text.
 *
 * The test page loads no YAML parser -- the site's own comes from a global the
 * trip view pulls in -- and this needs two scalars out of two known blocks, so
 * it reads the indented `key: value` lines under a top-level key rather than
 * bringing a parser along for it.
 */
function configValue(yamlText, block, key) {
    // The final setting in the file may have no newline after it, so read
    // against a text that always ends in one.
    const section = new RegExp(`^${block}:\\s*$\\n((?:[ \\t].*\\n|\\s*\\n)*)`, 'm')
        .exec(`${yamlText}\n`);
    if (!section) throw new Error(`trip_config.yaml has no ${block}: block`);

    const setting = new RegExp(`^\\s+${key}:\\s*(.+?)\\s*$`, 'm').exec(section[1]);
    if (!setting) throw new Error(`trip_config.yaml has no ${block}.${key}`);

    return setting[1].replace(/^["'](.*)["']$/, '$1');
}

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    return response.text();
}

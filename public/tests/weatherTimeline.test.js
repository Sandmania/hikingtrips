import { expect, render, waitFor } from './imports-test.js';
import { weatherControl } from '../assets/js/leaflet/weatherControl.js';
import { parseActualRoute } from '../assets/components/weatherTimeline/actualRoute.js';
import { wallTimeToInstant } from '../assets/components/weatherTimeline/exposureRecord.js';
import { MUOTKA_TRACK } from './actualRoute.test.js';
import '../assets/components/weatherTimeline/WeatherTimeline.js';

describe('weather control', () => {

    it('is added when the trip has both a sensor log and an actual route', () => {
        const control = weatherControl({ csvUrl: 'muotka2025/sand.csv', gpxUrl: 'muotka2025/combined.gpx' });

        expect(control.canAdd()).to.be.true;
    });

    it('is not added without an actual route, since there is no Trip Window', () => {
        const control = weatherControl({ csvUrl: 'muotka2025/sand.csv', gpxUrl: undefined });

        expect(control.canAdd()).to.be.false;
    });

    it('is not added without a sensor log', () => {
        const control = weatherControl({ csvUrl: undefined, gpxUrl: 'muotka2025/combined.gpx' });

        expect(control.canAdd()).to.be.false;
    });

});

const SENSOR_LOG = [
    '"Device Name","SandWeather"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-04 02:00:00 PM","19.5","55.0","19.2","10.1","point"',
    '"2025-07-04 01:00:00 PM","21.4","48.0","21.0","9.8","point"',
    '"2025-07-04 12:00:00 PM","18.4","61.0","18.1","10.6","point"',
    '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"',
    '"2025-07-04 09:00:00 AM","39.7","18.0","38.9","5.5","point"',
    ''
].join('\n');

const TRACK = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Day 1</name><trkseg>
    <trkpt lat="69.40" lon="25.85"><time>2025-07-04T08:09:00Z</time></trkpt>
    <trkpt lat="69.41" lon="25.86"><time>2025-07-04T11:56:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

const MUOTKA = { csvUrl: 'trip/sand.csv', gpxUrl: 'trip/combined.gpx', timeZone: 'Europe/Helsinki' };

/** The plot's own width in view units: the 960 viewBox less the two margins. */
const PLOT_WIDTH = 874;

/** A day in cloud: 95 % relative humidity at 9.9 °C, drying out by mid-afternoon. */
const FOG_LOG = [
    '"Device Name","SandWeather"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-04 02:00:00 PM","9.9","30.0","9.5","-7.0","point"',
    '"2025-07-04 01:00:00 PM","9.5","69.0","9.2","4.2","point"',
    '"2025-07-04 12:00:00 PM","9.9","95.0","9.8","9.2","point"',
    ''
].join('\n');

/**
 * The trip in miniature, against MUOTKA_TRACK's seven Walking Windows: an
 * indoor spike before the walk-in, a night in Camp colder than any walking
 * hour, and a midday peak with the sensor in full sun.
 */
const CAMP_AND_SUN_LOG = [
    '"Device Name","SandWeather"',
    '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
    '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
    '"2025-07-05 12:30:00 PM","30.5","24.0","30.0","8.2","point"',
    '"2025-07-05 11:00:00 AM","8.6","95.0","8.5","7.9","point"',
    '"2025-07-05 01:00:00 AM","3.1","88.0","3.0","1.3","point"',
    '"2025-07-04 01:00:00 PM","21.4","48.0","21.0","9.8","point"',
    '"2025-07-04 11:30:00 AM","17.2","64.2","17.0","10.3","point"',
    '"2025-07-04 09:00:00 AM","39.7","18.0","38.9","5.5","point"',
    ''
].join('\n');

/**
 * An Exposure Record shaped like the real one: a reading every half hour across
 * the whole Trip Window, nights included, so there is something to find wherever
 * a cursor lands. Temperature follows the hour of the day, which puts the cold
 * hours in Camp where they belong, and the trip's real low — 3.1 °C at 06 Jul
 * 01:00 — is written in at the hour it happened.
 */
const WHOLE_TRIP_LOG = (() => {
    const rows = [];
    for (let at = Date.UTC(2025, 6, 4, 11, 0); at <= Date.UTC(2025, 6, 10, 15, 0); at += 30 * 60000) {
        const time = new Date(at); // a wall clock, as the device writes it
        const wallTime = time.toISOString().slice(0, 19).replace('T', ' ');
        const hour = time.getUTCHours() + time.getUTCMinutes() / 60;
        const isTripLow = wallTime === '2025-07-06 01:00:00';
        const temperature = isTripLow ? 3.1 : 12 + 8 * Math.cos((hour - 14) / 24 * 2 * Math.PI);
        const relativeHumidity = isTripLow ? 88.0 : 60;
        rows.push(`"${wallTime}","${temperature.toFixed(1)}","${relativeHumidity.toFixed(1)}",` +
            `"${temperature.toFixed(1)}","5.0","point"`);
    }
    return [
        '"Device Name","SandWeather"',
        '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
        '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
        ...rows,
        ''
    ].join('\n');
})();

/** Serve the fixtures, and record what was asked for. */
function stubFetch(requested, sensorLog = SENSOR_LOG, track = TRACK) {
    return (url) => {
        requested.push(String(url));
        const body = String(url).endsWith('.csv') ? sensorLog : track;
        return Promise.resolve({ ok: true, text: () => Promise.resolve(body) });
    };
}

/** The y coordinates an SVG path passes through, in user units. */
function pathYs(path) {
    return path.getAttribute('d')
        .match(/-?[\d.]+,-?[\d.]+/g)
        .map(pair => parseFloat(pair.split(',')[1]));
}

/** Open the timeline and wait for the drawn chart. */
async function openTimeline(el, sensorLog, track) {
    window.fetch = stubFetch([], sensorLog, track);
    el.trip = MUOTKA;
    document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
    return waitFor(
        () => {
            const surface = el.shadowRoot.querySelector('rect.hover-surface');
            expect(surface).to.exist;
            return surface;
        },
        { timeout: 15000 }
    );
}

/**
 * Point at the plot, a fraction of the way across it. Given in fractions rather
 * than pixels because the chart is drawn in view units and scaled by viewBox, so
 * the only stable thing to aim at is the plot's own width.
 */
function pointAt(el, fraction, { type = 'pointermove', pointerType = 'mouse' } = {}) {
    const surface = el.shadowRoot.querySelector('rect.hover-surface');
    const box = surface.getBoundingClientRect();
    surface.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        pointerType,
        clientX: box.left + box.width * fraction,
        clientY: box.top + box.height / 2
    }));
}

/** Where a moment on the trip's own clock falls across the plot, as a fraction. */
function fractionOf(wallTime, track = MUOTKA_TRACK) {
    const { tripWindow } = parseActualRoute(track);
    const at = wallTimeToInstant(wallTime, MUOTKA.timeZone);
    return (at - tripWindow.start) / (tripWindow.end - tripWindow.start);
}

/** Whether a moment on the trip's clock fell inside a Walking Window. */
function isWalking(wallTime, track = MUOTKA_TRACK) {
    const at = wallTimeToInstant(wallTime, MUOTKA.timeZone);
    return parseActualRoute(track).walkingWindows
        .some(window => at >= window.start && at <= window.end);
}

/** Whether the hairline and its readout are on show. */
function isHoverShown(el) {
    const hover = el.shadowRoot.querySelector('g.hover');
    return hover !== null && hover.getAttribute('display') !== 'none';
}

/** Where the hairline stands, in plot units. */
function hairlineX(el) {
    return parseFloat(el.shadowRoot.querySelector('line.hairline').getAttribute('x1'));
}

/** Where the readout's box sits across the plot, in plot units. */
function readoutSpan(el) {
    const group = el.shadowRoot.querySelector('g.readout');
    const left = parseFloat(group.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]);
    const width = parseFloat(el.shadowRoot.querySelector('rect.readout-box').getAttribute('width'));
    return { left, right: left + width };
}

/** What the readout says, as its lines of text. */
function readout(el) {
    return Array.from(el.shadowRoot.querySelectorAll('.readout text'), text => text.textContent);
}

describe('WeatherTimeline', () => {

    let el;
    let originalFetch;
    // What the timeline tells the rest of the page about the hover. In the app
    // the map is on the other end of these; here nothing is, which is the point
    // — the chart has to work with no map present.
    let hovers;
    let onHover;
    let onHoverEnd;

    beforeEach(() => {
        el = render(document.createElement('tt-weather-timeline'));
        originalFetch = window.fetch;

        hovers = [];
        onHover = event => hovers.push(event.detail);
        onHoverEnd = () => hovers.push(null);
        document.addEventListener('weather-hover', onHover);
        document.addEventListener('weather-hover-end', onHoverEnd);
    });

    afterEach(() => {
        window.fetch = originalFetch;
        document.removeEventListener('weather-hover', onHover);
        document.removeEventListener('weather-hover-end', onHoverEnd);
    });

    it('stays hidden until the control is clicked', () => {
        const block = el.shadowRoot.querySelector('#weather-timeline');

        expect(block.classList.contains('hidden')).to.be.true;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        expect(block.classList.contains('hidden')).to.be.false;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        expect(block.classList.contains('hidden')).to.be.true;
    });

    it('fetches nothing until it is first opened, and not again after that', async () => {
        const requested = [];
        window.fetch = stubFetch(requested);

        el.trip = MUOTKA;
        expect(requested).to.be.empty;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        await waitFor(() => {
            expect(requested).to.have.members(['trip/sand.csv', 'trip/combined.gpx']);
        });

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        await waitFor(() => {
            expect(el.shadowRoot.querySelector('#weather-timeline').classList.contains('hidden')).to.be.false;
        });

        expect(requested).to.have.lengthOf(2);
    });

    it('draws one temperature line, scaled by viewBox rather than fixed pixels', async function () {
        this.timeout(20000); // may have to fetch d3 from unpkg
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const line = await waitFor(
            () => {
                const path = el.shadowRoot.querySelector('path.temperature');
                expect(path).to.exist;
                return path;
            },
            { timeout: 15000 }
        );

        expect(line.getAttribute('d')).to.match(/^M[\d.-]/);

        const svg = el.shadowRoot.querySelector('svg');
        expect(svg.getAttribute('viewBox')).to.exist;
        expect(svg.getAttribute('width')).to.be.null;
    });

    it('scales to the Trip Window only, leaving the pre-trip indoor spike off the axis', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const ticks = await waitFor(
            () => {
                const labels = Array.from(
                    el.shadowRoot.querySelectorAll('.axis-temperature .tick text'),
                    text => parseFloat(text.textContent)
                );
                expect(labels).to.not.be.empty;
                return labels;
            },
            { timeout: 15000 }
        );

        // The trimmed record peaks at 21.4 °C; the 39.7 °C indoor reading at
        // 09:00, before the first trackpoint, must not stretch the scale.
        expect(Math.max(...ticks)).to.be.below(30);
    });

    it('labels the time axis in the trip\'s own timezone, not the viewer\'s', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const labels = await waitFor(
            () => {
                const texts = Array.from(
                    el.shadowRoot.querySelectorAll('.axis-time .tick text'),
                    text => text.textContent
                );
                expect(texts).to.not.be.empty;
                return texts;
            },
            { timeout: 15000 }
        );

        // Helsinki wall times run 11:30 to 14:00; the same instants are 08:30
        // to 11:00 UTC. The axis must read the hiker's clock either way.
        expect(labels.some(l => /^1[1-4]:/.test(l))).to.be.true;
        expect(labels.some(l => /^0[89]:/.test(l))).to.be.false;
    });

    it('says the readings come off a pack in the sun, not from a weather station', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        await waitFor(
            () => {
                const caption = el.shadowRoot.querySelector('.caption');
                expect(caption).to.exist;
                expect(caption.textContent).to.match(/sun/i);
            },
            { timeout: 15000 }
        );
    });

    it('draws humidity as a filled area behind the temperature line', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const marks = await waitFor(
            () => {
                const paths = Array.from(el.shadowRoot.querySelectorAll('path.humidity, path.temperature'));
                expect(paths).to.have.lengthOf(2);
                return paths;
            },
            { timeout: 15000 }
        );

        // Painted first, so the line reads on top of it rather than under it.
        expect(marks[0].classList.contains('humidity')).to.be.true;
        expect(marks[0].getAttribute('d')).to.match(/^M[\d.-]/);
        expect(marks[0].getAttribute('d')).to.match(/Z$/); // closed: an area, not a line
    });

    it('pins the humidity axis to 0-100 %, whatever range the trip happened to have', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const labels = await waitFor(
            () => {
                const texts = Array.from(
                    el.shadowRoot.querySelectorAll('.axis-humidity .tick text'),
                    text => text.textContent
                );
                expect(texts).to.not.be.empty;
                return texts;
            },
            { timeout: 15000 }
        );

        // The trip's readings only span 48-64 %; the axis must still run the
        // whole share of saturation, so 64 % reads as the middling value it is.
        expect(labels[0]).to.equal('0 %');
        expect(labels[labels.length - 1]).to.equal('100 %');
    });

    it('says which series each axis belongs to, so neither has to be guessed', () => {
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const legend = el.shadowRoot.querySelector('.legend');

        expect(legend).to.exist;
        const temperature = legend.querySelector('.key-temperature').textContent;
        expect(temperature).to.match(/temperature/i);
        expect(temperature).to.match(/°C/);
        expect(temperature).to.match(/left/i);

        const humidity = legend.querySelector('.key-humidity').textContent;
        expect(humidity).to.match(/humidity/i);
        expect(humidity).to.match(/%/);
        expect(humidity).to.match(/right/i);
    });

    it('says what the bars are, and that the gaps between them are Camp', () => {
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const key = el.shadowRoot.querySelector('.legend .key-walking-windows');

        expect(key).to.exist;
        expect(key.textContent).to.match(/walking/i);
        // The absence of a bar is the other half of the reading, and nothing
        // on the strip itself can say so.
        expect(key.textContent).to.match(/camp/i);
    });

    it('fills nearly the whole plot when the air is nearly saturated', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], FOG_LOG);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const area = await waitFor(
            () => {
                const path = el.shadowRoot.querySelector('path.humidity');
                expect(path).to.exist;
                return path;
            },
            { timeout: 15000 }
        );

        // Each reading stands as tall as its share of saturation, so the 95 %
        // hour towers over the 30 % one instead of the two being stretched
        // apart to fill the plot between them.
        const ys = pathYs(area);
        const baseline = Math.max(...ys); // 0 %, the foot of the area
        const heights = [...new Set(ys)].map(y => (baseline - y) / baseline).sort();

        expect(heights).to.have.lengthOf(4); // three readings plus the baseline
        expect(heights[0]).to.equal(0);
        expect(heights[1]).to.be.closeTo(0.30, 0.01);
        expect(heights[2]).to.be.closeTo(0.69, 0.01);
        expect(heights[3]).to.be.closeTo(0.95, 0.01);
    });

    it('draws one bar per Walking Window, seven for muotka2025', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], SENSOR_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const bars = await waitFor(
            () => {
                const rects = el.shadowRoot.querySelectorAll('rect.walking-window');
                expect(rects).to.have.lengthOf(7);
                return rects;
            },
            { timeout: 15000 }
        );

        expect(bars).to.have.lengthOf(7);
    });

    it('draws each bar to its true width, so the short day looks short', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], SENSOR_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const bars = await waitFor(
            () => {
                const rects = Array.from(el.shadowRoot.querySelectorAll('rect.walking-window'));
                expect(rects).to.have.lengthOf(7);
                return rects;
            },
            { timeout: 15000 }
        );

        const widths = bars.map(bar => parseFloat(bar.getAttribute('width')));

        // Day 4 is 2.9 h against day 3's 7.6 h. Equal-width day markers would
        // throw that away, so the ratio of the bars must be the ratio of the
        // hours — a bit over a third.
        expect(widths[3]).to.equal(Math.min(...widths));
        expect(widths[3] / widths[2]).to.be.closeTo(2.89 / 7.64, 0.02);
        expect(widths[0] / widths[3]).to.be.closeTo(6.06 / 2.89, 0.02);
    });

    it('labels every bar with its day', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], SENSOR_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const labels = await waitFor(
            () => {
                const texts = Array.from(
                    el.shadowRoot.querySelectorAll('text.walking-window-label'),
                    text => text.textContent
                );
                expect(texts).to.have.lengthOf(7);
                return texts;
            },
            { timeout: 15000 }
        );

        expect(labels).to.deep.equal(['1', '2', '3', '4', '5', '6', '7']);
    });

    it('leaves a gap between bars for every night spent in Camp', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], SENSOR_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const bars = await waitFor(
            () => {
                const rects = Array.from(el.shadowRoot.querySelectorAll('rect.walking-window'));
                expect(rects).to.have.lengthOf(7);
                return rects;
            },
            { timeout: 15000 }
        );

        const spans = bars.map(bar => ({
            start: parseFloat(bar.getAttribute('x')),
            end: parseFloat(bar.getAttribute('x')) + parseFloat(bar.getAttribute('width'))
        }));

        // Six nights, none of them zero-width: the strip must read as seven
        // separate stints, not one continuous week of walking.
        const camps = spans.slice(1).map((span, index) => span.start - spans[index].end);
        expect(camps).to.have.lengthOf(6);
        expect(Math.min(...camps)).to.be.above(0);

        // And the strip spans the axis it is read against, edge to edge.
        expect(spans[0].start).to.be.closeTo(0, 0.5);
        expect(spans[6].end).to.be.closeTo(874, 0.5); // 960 less the two margins
    });

    it('summarises the trip as three tiles: coldest, coldest walking, warmest', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], CAMP_AND_SUN_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const tiles = await waitFor(
            () => {
                const found = Array.from(el.shadowRoot.querySelectorAll('.tile'));
                expect(found).to.have.lengthOf(3);
                return found;
            },
            { timeout: 15000 }
        );

        const read = selector => tiles.map(tile => tile.querySelector(selector).textContent.trim());

        expect(read('.tile-label')).to.deep.equal(['Coldest', 'Coldest walking', 'Warmest']);
        // The middle one is the whole point: 8.6 °C is the coldest hour spent
        // moving, and it is nowhere near the 3.1 °C the trip actually reached.
        // The maximum carries its footnote marker; what that ties to is below.
        expect(read('.tile-value')).to.deep.equal(['3.1 °C', '8.6 °C', '30.5 °C†']);
    });

    it('dates each tile in the trip\'s own time, not the viewer\'s', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], CAMP_AND_SUN_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const when = await waitFor(
            () => {
                const texts = Array.from(
                    el.shadowRoot.querySelectorAll('.tile .tile-when'),
                    text => text.textContent.trim()
                );
                expect(texts).to.have.lengthOf(3);
                return texts;
            },
            { timeout: 15000 }
        );

        // 01:00 Helsinki is 22:00 UTC the day before: a viewer's clock would
        // move both the hour and the date of the trip's coldest hour.
        expect(when).to.deep.equal(['05 Jul 01:00', '05 Jul 11:00', '05 Jul 12:30']);
    });

    it('marks the warmest tile, and only that one, back to the sun caption', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], CAMP_AND_SUN_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const tiles = await waitFor(
            () => {
                const found = Array.from(el.shadowRoot.querySelectorAll('.tile'));
                expect(found).to.have.lengthOf(3);
                return found;
            },
            { timeout: 15000 }
        );

        // 30.5 °C is the pack in full sun, not the air: temperature jumps ~9 °C
        // while the dew point stays flat, which no air mass does. Only that
        // tile is qualified, and the mark has to lead somewhere.
        const marks = tiles.map(tile => tile.querySelector('.tile-footnote'));
        expect(marks[0]).to.not.exist;
        expect(marks[1]).to.not.exist;
        expect(marks[2]).to.exist;

        const caption = el.shadowRoot.querySelector('.caption');
        expect(caption.textContent).to.include(marks[2].textContent.trim());
        expect(caption.textContent).to.match(/sun/i);
    });

    it('summarises the trimmed record, so the indoor spike is not the trip maximum', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([]); // SENSOR_LOG: 39.7 °C at 09:00, before the first trackpoint
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const values = await waitFor(
            () => {
                const texts = Array.from(
                    el.shadowRoot.querySelectorAll('.tile .tile-value'),
                    value => value.textContent.trim()
                );
                expect(texts).to.have.lengthOf(3);
                return texts;
            },
            { timeout: 15000 }
        );

        expect(values.join(' ')).to.not.include('39.7');
        expect(values[2]).to.include('21.4 °C');
    });

    it('still draws a trip whose logger never ran while the watch did', async function () {
        this.timeout(20000);
        // Every reading falls between the Walking Windows, so there is no
        // coldest walking hour to report.
        const campOnly = [
            '"Device Name","SandWeather"',
            '"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type"',
            '"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"',
            '"2025-07-05 01:00:00 AM","3.1","88.0","3.0","1.3","point"',
            '"2025-07-04 11:00:00 PM","5.2","84.0","5.0","2.7","point"',
            ''
        ].join('\n');
        window.fetch = stubFetch([], campOnly, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        const tiles = await waitFor(
            () => {
                expect(el.shadowRoot.querySelector('path.temperature')).to.exist;
                return Array.from(el.shadowRoot.querySelectorAll('.tile-label'), t => t.textContent);
            },
            { timeout: 15000 }
        );

        // The missing tile is left out rather than shown empty, and it takes
        // the chart with it under no circumstances.
        expect(tiles).to.deep.equal(['Coldest', 'Warmest']);
    });

    it('drops the tiles with the chart when the trip is closed', async function () {
        this.timeout(20000);
        window.fetch = stubFetch([], CAMP_AND_SUN_LOG, MUOTKA_TRACK);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        await waitFor(
            () => { expect(el.shadowRoot.querySelectorAll('.tile')).to.have.lengthOf(3); },
            { timeout: 15000 }
        );

        document.dispatchEvent(new CustomEvent('trip-cleanup'));

        // Numbers outlive a chart quietly: three tiles reading 3.1 / 8.6 / 30.5
        // above another trip's blank chart would be read as that trip's.
        expect(el.shadowRoot.querySelectorAll('.tile')).to.be.empty;
    });

    it('follows the cursor with a hairline across the plot', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.25);
        expect(el.shadowRoot.querySelector('line.hairline')).to.exist;
        const quarter = hairlineX(el);

        pointAt(el, 0.75);
        const threeQuarters = hairlineX(el);

        // It is the same line moved, not a second one left behind, and it moves
        // the way the cursor did.
        expect(el.shadowRoot.querySelectorAll('line.hairline')).to.have.lengthOf(1);
        expect(threeQuarters).to.be.above(quarter);
    });

    it('reads out the moment, the temperature and the humidity', async function () {
        this.timeout(20000);
        await openTimeline(el, CAMP_AND_SUN_LOG, MUOTKA_TRACK);

        pointAt(el, fractionOf('2025-07-05 12:30:00'));

        // The trip's own clock, both units named: two series on two axes, so a
        // bare pair of numbers would leave the reader matching them up.
        expect(readout(el)).to.deep.equal(['05 Jul 12:30', '30.5 °C', '24 %', 'Walking']);
    });

    it('stands on the reading it reports, rather than between two of them', async function () {
        this.timeout(20000);
        await openTimeline(el, CAMP_AND_SUN_LOG, MUOTKA_TRACK);

        // 12:30 falls between the 11:30 and 13:00 readings, nearer the later.
        pointAt(el, fractionOf('2025-07-04 12:30:00'));

        // The line the cursor crosses at 12:30 is at about 19.5 °C, which is a
        // temperature the device never recorded. The reading is the 13:00 one,
        // and the hairline stands there to say so.
        expect(readout(el)).to.deep.equal(['04 Jul 13:00', '21.4 °C', '48 %', 'Walking']);
        expect(hairlineX(el)).to.be.closeTo(fractionOf('2025-07-04 13:00:00') * PLOT_WIDTH, 0.5);
    });

    it('reads out the hours spent in Camp, not only the hours spent walking', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        // 01:00 on the third night: the watch was off, so this hour exists on
        // no other chart in the app. Two thirds of the Trip Window is like it.
        const night = '2025-07-06 01:00:00';
        expect(isWalking(night)).to.be.false;

        pointAt(el, fractionOf(night));

        expect(readout(el)).to.deep.equal(['06 Jul 01:00', '3.1 °C', '88 %', 'Camp']);
    });

    it('takes the hairline away when the cursor leaves the plot', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.4);
        expect(isHoverShown(el)).to.be.true;

        pointAt(el, 0.4, { type: 'pointerleave' });

        // A hairline left standing over a chart nobody is pointing at claims a
        // reading is being asked about when none is.
        expect(isHoverShown(el)).to.be.false;
    });

    it('reads out where a finger touches down, without waiting for it to move', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        // A tap is a pointerdown with no move after it, so a chart that only
        // listens for movement answers a mouse and ignores a finger.
        pointAt(el, fractionOf('2025-07-06 01:00:00'), { type: 'pointerdown', pointerType: 'touch' });

        expect(isHoverShown(el)).to.be.true;
        expect(readout(el)).to.deep.equal(['06 Jul 01:00', '3.1 °C', '88 %', 'Camp']);
    });

    it('does not leave the hairline stuck where a finger was lifted', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.4, { type: 'pointerdown', pointerType: 'touch' });
        pointAt(el, 0.45, { pointerType: 'touch' });
        expect(isHoverShown(el)).to.be.true;

        pointAt(el, 0.45, { type: 'pointerup', pointerType: 'touch' });

        // A lifted finger sends no pointerleave — it stops existing where it
        // was — so a chart that waits for one keeps that reading on screen for
        // the rest of the visit.
        expect(isHoverShown(el)).to.be.false;
    });

    it('flips the readout to the near side rather than off the edge of the plot', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.5);
        expect(readoutSpan(el).left).to.be.above(hairlineX(el));

        // The last hour of the trip is one a reader will want: it is where the
        // walk ended. A readout that hangs past the plot is clipped there.
        pointAt(el, 1);

        expect(readoutSpan(el).right).to.be.at.most(PLOT_WIDTH);
        expect(readoutSpan(el).left).to.be.below(hairlineX(el));
    });

    it('says where the hiker was, at the trackpoint nearest the hovered hour', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        // 12:30 on the trip's clock is 09:30 UTC, inside day 2's window.
        const walking = '2025-07-05 12:30:00';
        expect(isWalking(walking)).to.be.true;

        pointAt(el, fractionOf(walking));

        // Day 2 ran 06:55 to 13:57 UTC, so 09:30 is nearer where it started.
        // The position is dispatched rather than placed: the component holds no
        // map, and hovering has to work whether or not there is one.
        expect(hovers).to.have.lengthOf(1);
        expect(hovers[0].latitude).to.equal(69.301);
        expect(hovers[0].longitude).to.equal(26.101);
        expect(hovers[0].camp).to.be.false;
    });

    it('calls the hover off when the cursor leaves the plot', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.4);
        expect(hovers[hovers.length - 1]).to.not.be.null;

        pointAt(el, 0.4, { type: 'pointerleave' });

        // A marker left standing on the map claims the hiker is being asked
        // about when nobody is asking.
        expect(hovers[hovers.length - 1]).to.be.null;
    });

    it('calls the hover off when the timeline is shut, and when the trip closes', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, 0.4);
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        // The chart the marker was answering is gone from the page, so a marker
        // left on the map has nothing left to explain it.
        expect(hovers[hovers.length - 1]).to.be.null;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        pointAt(el, 0.4);
        document.dispatchEvent(new CustomEvent('trip-cleanup'));

        expect(hovers[hovers.length - 1]).to.be.null;
    });

    it('says whether the position is one the watch recorded or one held at Camp', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        pointAt(el, fractionOf('2025-07-05 12:30:00'));
        expect(readout(el)).to.include('Walking');

        // A held position is a weaker claim than a tracked one — the hiker was
        // at the camp all night, not at that spot at that minute — so the
        // readout has to say which of the two is being shown.
        pointAt(el, fractionOf('2025-07-06 01:00:00'));
        expect(readout(el)).to.include('Camp');
        expect(readout(el)).to.not.include('Walking');
    });

    it('marks the camp of 05-06 Jul when the trip\'s coldest hour is hovered', async function () {
        this.timeout(20000);
        await openTimeline(el, WHOLE_TRIP_LOG, MUOTKA_TRACK);

        // 3.1 °C at 01:00, the trip's low: the watch was off, and the hiker was
        // in the tent where day 2 ended.
        const coldest = '2025-07-06 01:00:00';
        expect(isWalking(coldest)).to.be.false;

        pointAt(el, fractionOf(coldest));

        expect(readout(el)).to.include('3.1 °C');
        expect(hovers).to.have.lengthOf(1);
        expect(hovers[0].camp).to.be.true;
        // Day 2's last trackpoint, which is what that camp's position is.
        expect(hovers[0].latitude).to.equal(69.311);
        expect(hovers[0].longitude).to.equal(26.111);
    });

    it('surfaces a missing sensor log as an error rather than an empty block', async () => {
        window.fetch = () => Promise.resolve({ ok: false, statusText: 'Not Found' });
        const errors = [];
        const listener = e => errors.push(e.detail.message);
        document.addEventListener('show-error', listener);

        try {
            el.trip = MUOTKA;
            document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

            await waitFor(() => {
                expect(errors).to.have.lengthOf(1);
                expect(errors[0]).to.match(/sensor log|actual route/i);
            });
        } finally {
            document.removeEventListener('show-error', listener);
        }
    });

    it('hides and forgets the previous trip when another is opened', async function () {
        this.timeout(20000);
        const requested = [];
        window.fetch = stubFetch(requested);
        el.trip = MUOTKA;

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
        await waitFor(
            () => { expect(el.shadowRoot.querySelector('path.temperature')).to.exist; },
            { timeout: 15000 }
        );

        document.dispatchEvent(new CustomEvent('trip-cleanup'));

        const block = el.shadowRoot.querySelector('#weather-timeline');
        expect(block.classList.contains('hidden')).to.be.true;
        expect(el.shadowRoot.querySelector('path.temperature')).to.not.exist;

        // A second trip's data must actually be fetched, not inherited.
        el.trip = { ...MUOTKA, csvUrl: 'other/sand.csv', gpxUrl: 'other/combined.gpx' };
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        await waitFor(() => {
            expect(requested).to.include('other/sand.csv');
        });
    });

    it('does not draw a trip that was closed while its data was still loading', async function () {
        this.timeout(20000);
        let release;
        const held = new Promise(resolve => { release = resolve; });
        window.fetch = (url) => held.then(() => ({
            ok: true,
            text: () => Promise.resolve(String(url).endsWith('.csv') ? SENSOR_LOG : TRACK)
        }));

        el.trip = MUOTKA;
        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        // The viewer switches trips before the sensor log arrives.
        document.dispatchEvent(new CustomEvent('trip-cleanup'));
        release();
        await held;
        await new Promise(resolve => setTimeout(resolve, 300));

        expect(el.shadowRoot.querySelector('path.temperature')).to.not.exist;
        expect(el.shadowRoot.querySelector('#weather-timeline').classList.contains('hidden')).to.be.true;
    });

    it('stops responding to the control after removal from the DOM', () => {
        el.remove();

        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));

        expect(el.shadowRoot.querySelector('#weather-timeline').classList.contains('hidden')).to.be.true;
    });

});

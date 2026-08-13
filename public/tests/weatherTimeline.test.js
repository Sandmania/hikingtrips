import { expect, render, waitFor } from './imports-test.js';
import { weatherControl } from '../assets/js/leaflet/weatherControl.js';
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

/** Serve the fixtures, and record what was asked for. */
function stubFetch(requested) {
    return (url) => {
        requested.push(String(url));
        const body = String(url).endsWith('.csv') ? SENSOR_LOG : TRACK;
        return Promise.resolve({ ok: true, text: () => Promise.resolve(body) });
    };
}

describe('WeatherTimeline', () => {

    let el;
    let originalFetch;
    beforeEach(() => {
        el = render(document.createElement('tt-weather-timeline'));
        originalFetch = window.fetch;
    });

    afterEach(() => {
        window.fetch = originalFetch;
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

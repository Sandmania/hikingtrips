import { showError } from '../../js/error.js';
import { toExposureRecord, tripWindowFromTrack } from './exposureRecord.js';

// Per ADR-0001 we share leaflet-elevation's d3 rather than shipping our own.
// This is the URL that library loads, so loadScript's dedupe by URL means
// whoever gets there first wins and there is never a second copy.
const D3_URL = 'https://unpkg.com/d3@7.8.4/dist/d3.min.js';

// The chart is drawn once at this size and scaled by viewBox, so these are
// aspect ratios rather than pixels.
const VIEW = { width: 960, height: 260 };
const MARGIN = { top: 12, right: 40, bottom: 26, left: 46 };

class WeatherTimeline extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._trip = null;
        this._record = null;
        this._loading = null;
        this.shadowRoot.innerHTML = `
          <link rel="stylesheet" href="assets/components/weatherTimeline/WeatherTimeline.css">
          <div id="weather-timeline" class="hidden">
            <p class="legend">
              <span class="key key-temperature"><span class="swatch"></span>Temperature (°C, left)</span>
              <span class="key key-humidity"><span class="swatch"></span>Relative humidity (%, right)</span>
            </p>
            <div id="chart"></div>
            <p class="caption">Measured by a sensor carried on the outside of the pack, so
              midday peaks include full sun rather than shade air temperature.</p>
          </div>
        `;
    }

    /** @param {{csvUrl: string, gpxUrl: string, timeZone: string}|null} trip */
    set trip(trip) {
        this._trip = trip;
        this._record = null;
        this._loading = null;
    }

    get trip() {
        return this._trip;
    }

    connectedCallback() {
        this._toggleListener = () => this.toggle();
        this._cleanupListener = () => this.clear();
        document.addEventListener('toggle-weather-timeline', this._toggleListener);
        document.addEventListener('trip-cleanup', this._cleanupListener);
    }

    disconnectedCallback() {
        document.removeEventListener('toggle-weather-timeline', this._toggleListener);
        document.removeEventListener('trip-cleanup', this._cleanupListener);
    }

    clear() {
        this.trip = null;
        this.shadowRoot.querySelector('#chart').innerHTML = '';
        this.shadowRoot.querySelector('#weather-timeline').classList.add('hidden');
    }

    toggle() {
        const block = this.shadowRoot.querySelector('#weather-timeline');
        block.classList.toggle('hidden');
        if (!block.classList.contains('hidden')) this._show();
    }

    /** Load on first open: a timeline nobody opens costs nothing. */
    async _show() {
        if (!this._trip || this._loading) return;
        this._loading = this._load();
        await this._loading;
    }

    async _load() {
        const trip = this._trip;
        const { csvUrl, gpxUrl, timeZone } = trip;
        try {
            const [csvText, gpxText] = await Promise.all([
                fetchText(csvUrl, 'sensor log'),
                fetchText(gpxUrl, 'actual route')
            ]);
            const d3 = await loadD3();
            // The viewer may have moved to another trip while this was in
            // flight; a superseded load must not draw over its successor.
            if (this._trip !== trip) return;

            this._record = toExposureRecord(csvText, {
                timeZone,
                tripWindow: tripWindowFromTrack(gpxText)
            });
            this._render(d3);
        } catch (error) {
            if (this._trip !== trip) return;
            showError(error);
        }
    }

    _render(d3) {
        const record = this._record;
        if (!record?.length) return;

        const plotWidth = VIEW.width - MARGIN.left - MARGIN.right;
        const plotHeight = VIEW.height - MARGIN.top - MARGIN.bottom;

        // Plotting the wall time as if it were UTC puts the trip's own clock on
        // the axis, so the chart reads the same wherever it is opened from.
        const points = record.map(sample => ({
            at: wallTimeAsPlotDate(sample.wallTime),
            temperature: sample.temperature,
            relativeHumidity: sample.relativeHumidity
        }));

        const x = d3.scaleUtc()
            .domain([points[0].at, points[points.length - 1].at])
            .range([0, plotWidth]);
        // Two vertical scales, so neither is called y: temperature is fitted to
        // the trip, humidity is not.
        const celsius = d3.scaleLinear()
            .domain(d3.extent(points, p => p.temperature))
            .nice()
            .range([plotHeight, 0]);
        // Relative humidity is a share of saturation, so its axis is the whole
        // share. Fitting it to the data would make a 95 % reading — air that
        // wets everything it touches — look like an unremarkable middle value.
        const humidity = d3.scaleLinear()
            .domain([0, 100])
            .range([plotHeight, 0]);

        const host = this.shadowRoot.querySelector('#chart');
        host.innerHTML = '';

        const svg = d3.select(host).append('svg')
            .attr('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const plot = svg.append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        plot.append('g')
            .attr('class', 'axis axis-time')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(formatTripLocalTick));

        plot.append('g')
            .attr('class', 'axis axis-temperature')
            .call(d3.axisLeft(celsius).ticks(5).tickFormat(degrees => `${degrees} °C`));

        plot.append('g')
            .attr('class', 'axis axis-humidity')
            .attr('transform', `translate(${plotWidth},0)`)
            .call(d3.axisRight(humidity).ticks(5).tickFormat(share => `${share} %`));

        // Humidity first, so the temperature line is drawn over it.
        plot.append('path')
            .datum(points)
            .attr('class', 'humidity')
            .attr('d', d3.area()
                .x(p => x(p.at))
                .y0(humidity(0))
                .y1(p => humidity(p.relativeHumidity)));

        plot.append('path')
            .datum(points)
            .attr('class', 'temperature')
            .attr('fill', 'none')
            .attr('d', d3.line().x(p => x(p.at)).y(p => celsius(p.temperature)));
    }
}

/**
 * Read a trip-local wall time as if it were UTC. The resulting Date is not the
 * instant the reading was taken — it is a position on a trip-local clock, which
 * is what a d3 UTC scale needs to label the axis in the hiker's own time.
 */
function wallTimeAsPlotDate(wallTime) {
    const [date, time] = wallTime.split(' ');
    return new Date(`${date}T${time}Z`);
}

/** Date at midnight, time otherwise, so multi-day spans stay readable. */
function formatTripLocalTick(at) {
    return at.getUTCHours() === 0 && at.getUTCMinutes() === 0
        ? at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
        : `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}`;
}

async function fetchText(url, what) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${what}: ${response.statusText}`);
    return response.text();
}

async function loadD3() {
    // leaflet-elevation guards its own load the same way, so sharing works in
    // both directions: whichever chart is drawn first loads the one copy.
    if (typeof window.d3 !== 'object' || window.d3 === null) {
        await loadScript(D3_URL);
    }
    return window.d3;
}

customElements.define('tt-weather-timeline', WeatherTimeline);

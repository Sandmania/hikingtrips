// The Exposure Record: what a hiker was subjected to across a whole trip.
//
// A Sensor Log is one device's own export, in its own units and time base. This
// module turns that export into an Exposure Record by converting its naive wall
// times to instants and trimming it to the Trip Window.

// The Kestrel export puts three device rows above the header and a units row
// below it. Rather than trust those positions, find the header by its content.
const HEADER_MARKER = 'DATE_TIME';

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})(?:\s*([AaPp])\.?[Mm]\.?)?$/;

// The reading taken from each row, by the header the device writes it under.
const COLUMNS = {
    temperature: 'Temperature',
    relativeHumidity: 'Relative Humidity',
    heatIndex: 'Heat Index',
    dewPoint: 'Dew Point'
};

// What the Weather Timeline plots. Heat index and dew point are read too, but
// nothing renders them yet, so a log without those columns still draws.
const RENDERED = ['temperature', 'relativeHumidity'];

function parseCsvRow(line) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
            if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            cells.push(cell); cell = '';
        } else {
            cell += ch;
        }
    }
    cells.push(cell);
    return cells.map(c => c.trim());
}

/**
 * Read a Sensor Log export into samples carrying their original wall times.
 *
 * @param {string} csvText the device's export, verbatim
 * @returns {Array<{wallTime: string, temperature: number, relativeHumidity: number,
 *                  heatIndex: number, dewPoint: number}>}
 */
export function parseSensorLog(csvText) {
    const rows = csvText.split(/\r?\n/)
        .filter(line => line.trim() !== '')
        .map(parseCsvRow);

    const headerIndex = rows.findIndex(row => row[0]?.toUpperCase().includes(HEADER_MARKER));
    if (headerIndex === -1) {
        throw new Error(`Sensor log has no header row containing ${HEADER_MARKER}`);
    }

    const header = rows[headerIndex].map(cell => cell.toLowerCase());
    const columnIndex = name => header.indexOf(name);

    const fields = Object.fromEntries(Object.entries(COLUMNS)
        .map(([field, column]) => [field, columnIndex(column.toLowerCase())]));

    // Say a column is missing rather than let it become a column of nulls: the
    // chart draws those as a broken line or an empty plot, which reads as a bad
    // trip rather than as a bad file.
    const missing = RENDERED.filter(field => fields[field] === -1).map(field => COLUMNS[field]);
    if (missing.length) {
        throw new Error(`Sensor log has no ${missing.join(' or ')} column`);
    }

    const dataTypeIndex = columnIndex('data type');

    const samples = [];
    for (const row of rows.slice(headerIndex + 1)) {
        // The units row sits directly below the header and has no parseable
        // timestamp in column 0, which is how it tells itself apart from data.
        if (!TIMESTAMP.test(row[0] ?? '')) continue;
        // Anything but a point is a session summary, not a reading.
        if (dataTypeIndex !== -1 && row[dataTypeIndex]?.toLowerCase() !== 'point') continue;

        const sample = { wallTime: normaliseWallTime(row[0]) };
        for (const [field, index] of Object.entries(fields)) {
            sample[field] = index === -1 ? null : parseFloat(row[index]);
        }
        samples.push(sample);
    }

    // The export is newest-first. Normalised wall times sort lexicographically.
    return samples.sort((a, b) => a.wallTime.localeCompare(b.wallTime));
}

/**
 * The Exposure Record: a Sensor Log placed on the world clock and trimmed to
 * the Trip Window, so that only what the hiker was actually subjected to on the
 * trip remains. Each sample keeps the device's own wall time alongside its
 * instant, so a chart can render trip-local times without consulting `Intl`
 * again — or the viewer's clock.
 *
 * @param {string} csvText the Sensor Log export, verbatim
 * @param {{timeZone: string, tripWindow: {start: Date, end: Date}}} trip
 * @returns {Array<{instant: Date, wallTime: string, temperature: number,
 *                  relativeHumidity: number, heatIndex: number, dewPoint: number}>}
 */
export function toExposureRecord(csvText, { timeZone, tripWindow }) {
    // Without a zone `Intl` answers on the viewer's clock, which trims the
    // record and labels the axis by where the page was opened rather than by
    // where the trip happened — wrong, and plausible enough to go unnoticed.
    if (!timeZone) {
        throw new Error('Sensor log states no offset, so weather.timezone must be set for this trip');
    }

    return parseSensorLog(csvText)
        .map(sample => ({ ...sample, instant: wallTimeToInstant(sample.wallTime, timeZone) }))
        .filter(sample => sample.instant >= tripWindow.start && sample.instant <= tripWindow.end);
}

/**
 * Place a naive wall time on the world clock using the trip's own timezone.
 *
 * Sensor logs state no offset, so the same string means a different instant
 * depending on where the trip happened. Resolving it through `Intl` rather than
 * `new Date(...)` keeps the answer independent of the viewer's own timezone.
 *
 * @param {string} wallTime `YYYY-MM-DD HH:MM:SS`, as the device wrote it
 * @param {string} timeZone an IANA zone, e.g. `Europe/Helsinki`
 * @returns {Date}
 */
export function wallTimeToInstant(wallTime, timeZone) {
    const [, year, month, day, hour, minute, second] = TIMESTAMP.exec(normaliseWallTime(wallTime));
    const asIfUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);

    // The zone's offset is itself a function of the instant, so guess with the
    // offset at the naive reading, then correct once with the offset actually
    // in force there. Two passes settle every case a DST shift can produce.
    const guess = asIfUtc - zoneOffset(asIfUtc, timeZone);
    return new Date(asIfUtc - zoneOffset(guess, timeZone));
}

/**
 * Read an instant on the trip's own clock — the inverse of `wallTimeToInstant`,
 * for the times that arrive as instants rather than as wall times, such as the
 * UTC trackpoint times bounding a Walking Window.
 *
 * @param {Date} instant
 * @param {string} timeZone an IANA zone, e.g. `Europe/Helsinki`
 * @returns {string} `YYYY-MM-DD HH:MM:SS` on that zone's clock
 */
export function instantToWallTime(instant, timeZone) {
    const parts = Object.fromEntries(
        WALL_CLOCK_IN_ZONE(timeZone).formatToParts(instant).map(part => [part.type, part.value])
    );
    // `hour12: false` renders midnight as 24 in some engines, so wrap it.
    const hour = String(+parts.hour % 24).padStart(2, '0');
    return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

/** How far ahead of UTC `timeZone` is at the given instant, in milliseconds. */
function zoneOffset(instantMs, timeZone) {
    const [, year, month, day, hour, minute, second] =
        TIMESTAMP.exec(instantToWallTime(new Date(instantMs), timeZone));
    return Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) - instantMs;
}

const _zoneFormatters = new Map();
function WALL_CLOCK_IN_ZONE(timeZone) {
    if (!_zoneFormatters.has(timeZone)) {
        _zoneFormatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
            timeZone, hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }));
    }
    return _zoneFormatters.get(timeZone);
}

/** Restate a timestamp in 24-hour `YYYY-MM-DD HH:MM:SS` form. */
function normaliseWallTime(raw) {
    const match = TIMESTAMP.exec(raw.trim());
    if (!match) throw new Error(`Unrecognised timestamp ${raw}`);
    const [, year, month, day, hour, minute, second, meridiem] = match;

    let hours = Number(hour);
    if (meridiem) {
        const isPm = meridiem.toUpperCase() === 'P';
        if (isPm && hours !== 12) hours += 12;
        if (!isPm && hours === 12) hours = 0;
    }

    return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minute}:${second}`;
}

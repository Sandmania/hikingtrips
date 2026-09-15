// What a track actually recorded at the spot that was clicked.
//
// A click lands on a drawn line, not on a trackpoint, so the answer is the
// nearest point the track really holds — its coordinates verbatim from the GPX,
// with the elevation and time that came with them. Reporting the clicked pixel
// instead would state a position the track never recorded.

const POPUP = {
    className: 'trackpoint-popup',
    // The tip is what marks the trackpoint being reported, so the map must not
    // slide out from under it.
    autoPan: false
};

// Five decimals is about a metre — finer than a watch on a wrist resolves, and
// short enough to read off the screen and type somewhere else.
const COORDINATE_DECIMALS = 5;

/**
 * Answer clicks on a trip's tracks with the trackpoint that was hit.
 *
 * @param {L.Map} map the trip's map
 * @returns {{bind: function(L.Layer, string=): void}} how to put a track under it
 */
export function trackPointPopup(map) {
    /**
     * @param {L.Layer} layer one track, or a group holding them — a leg read by
     *        leaflet-gpx arrives as a group of groups, with the start and end
     *        icons among the lines
     * @param {string} [heading] what the track is, when the reader needs telling
     */
    function bind(layer, heading) {
        if (layer.getLatLngs) {
            layer.on('click', event => {
                const point = nearestTrackPoint(map, layer, event.latlng);
                if (!point) return;
                L.popup(POPUP)
                    .setLatLng(point.latlng)
                    .setContent(trackPointContent(point, heading))
                    .openOn(map);
            });
            return;
        }
        if (layer.eachLayer) {
            layer.eachLayer(child => bind(child, heading));
            return;
        }
        // A start or end icon is one point already — there is no nearest
        // trackpoint to look for — so it keeps saying what it always said.
        if (heading && layer.bindPopup) layer.bindPopup(heading);
    }

    return { bind };
}

/**
 * The trackpoint of `layer` nearest `latlng`.
 *
 * @param {L.Map} map for the distances, which are metres on the ground
 * @param {L.Polyline} layer one track
 * @param {L.LatLng} latlng where the reader clicked
 * @returns {{latlng: L.LatLng, elevation: ?number, at: ?Date}|null} null for a track with no points
 */
export function nearestTrackPoint(map, layer, latlng) {
    const times = coordTimesOf(layer);
    let nearest = null;

    ringsOf(layer).forEach((ring, ringIndex) => {
        ring.forEach((point, pointIndex) => {
            const distance = map.distance(latlng, point);
            if (nearest && distance >= nearest.distance) return;
            nearest = { distance, point, at: timeOf(point, times[ringIndex]?.[pointIndex]) };
        });
    });

    if (!nearest) return null;
    return { latlng: nearest.point, elevation: elevationOf(nearest.point), at: nearest.at };
}

/** A track's points as rings: one for a plain track, several for a split one. */
function ringsOf(layer) {
    const latlngs = layer.getLatLngs();
    return Array.isArray(latlngs[0]) ? latlngs : [latlngs];
}

/**
 * The trackpoint times togeojson hangs off the feature, in the shape the rings
 * are in. That is how the actual route arrives — leaflet-elevation reads it
 * through togeojson, which strips the times out of the geometry and parks them
 * beside it, one list per ring. leaflet-gpx, which reads the planned legs,
 * carries the time on each point instead — see `timeOf`.
 */
function coordTimesOf(layer) {
    const properties = layer.feature?.properties;
    // `coordinateProperties.times` is what togeojson 5 writes; `coordTimes` is
    // what 4 wrote, and what plenty of GeoJSON in the wild still carries.
    const times = properties?.coordinateProperties?.times ?? properties?.coordTimes;
    if (!Array.isArray(times) || times.length === 0) return [];
    return Array.isArray(times[0]) ? times : [times];
}

function timeOf(point, coordTime) {
    const at = point.meta?.time ?? (coordTime ? new Date(coordTime) : null);
    // leaflet-gpx stands 1970 in for a trackpoint that carried no `<time>` —
    // planned routes are full of them — so the epoch is an absent time, not a
    // time, and a popup must not read it out as one.
    if (!at || Number.isNaN(at.getTime()) || at.getUTCFullYear() <= 1970) return null;
    return at;
}

function elevationOf(point) {
    // leaflet-elevation puts the elevation on the LatLng itself; leaflet-gpx
    // keeps its own reading beside it. A track may carry neither.
    const elevation = point.alt ?? point.meta?.ele;
    return Number.isFinite(elevation) ? elevation : null;
}

/**
 * The popup for one trackpoint.
 *
 * Built as elements rather than as markup, so the copy button can be wired up
 * here, beside the value it copies.
 */
function trackPointContent(point, heading) {
    const content = document.createElement('div');
    content.className = 'trackpoint';

    if (heading) content.appendChild(line('trackpoint-heading', heading));

    const coordinates = formatCoordinates(point.latlng);
    const position = document.createElement('div');
    position.className = 'trackpoint-position';
    position.appendChild(line('trackpoint-coordinates', coordinates));
    const copy = copyButton(coordinates);
    if (copy) position.appendChild(copy);
    content.appendChild(position);

    const detail = [
        point.elevation !== null ? `${Math.round(point.elevation)} m` : null,
        point.at ? formatUtc(point.at) : null
    ].filter(Boolean);
    if (detail.length) content.appendChild(line('trackpoint-detail', detail.join(' · ')));

    // Said plainly, because it is a different claim from "here is where you
    // clicked": the point is one the track recorded, and on a sparse planned
    // leg it can sit some way from the line the reader aimed at.
    content.appendChild(line('trackpoint-note', 'nearest trackpoint'));

    return content;
}

function line(className, text) {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = text;
    return element;
}

/** Nothing to click when there is no clipboard to copy into. */
function copyButton(text) {
    if (!navigator.clipboard) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'trackpoint-copy';
    button.title = 'Copy coordinates';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
        navigator.clipboard.writeText(text)
            .then(() => { button.textContent = 'Copied'; })
            .catch(() => { button.textContent = 'Copy failed'; });
    });
    return button;
}

function formatCoordinates(latlng) {
    return `${latlng.lat.toFixed(COORDINATE_DECIMALS)}, ${latlng.lng.toFixed(COORDINATE_DECIMALS)}`;
}

/**
 * A trackpoint's time, as `18 Aug 2026 08:32 UTC`. GPX times are UTC and the
 * trip's own zone is only known where a Weather Timeline is configured, so the
 * zone is named rather than quietly assumed.
 */
function formatUtc(at) {
    const day = at.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
    const hours = String(at.getUTCHours()).padStart(2, '0');
    const minutes = String(at.getUTCMinutes()).padStart(2, '0');
    return `${day} ${hours}:${minutes} UTC`;
}

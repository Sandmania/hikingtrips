// The actual route's waypoints, drawn so that every one of them can be reached.
//
// leaflet-elevation would draw these itself, but it caches one icon per symbol
// and shares it between every marker using it, so no marker can carry anything
// of its own — a count, or the photos of the waypoints it stands for. The map
// therefore draws them, and the library is told not to (`wptIcons: false`).

import { groupByProximity, mergeGroupContent } from './waypointGroups.js';

// The icon box. Two icons closer than this overlap, so that is exactly when
// they are drawn as one; zooming in still pulls them apart, as it always did.
const MIN_SEPARATION = 30;

const ICON = {
    className: 'waypoint-marker',
    iconSize: [30, 30],
    iconAnchor: [8, 30]
};

// Hover to look, click to keep it open — the behaviour the waypoints already
// had, kept rather than reinvented.
const TOOLTIP = { className: 'waypoint-tooltip', direction: 'auto', sticky: true, opacity: 1 };
const POPUP = { className: 'waypoint-popup', keepInView: true };

/**
 * Draw a trip's waypoints, merging the ones that crowd each other.
 *
 * @param {L.Map} map the trip's map
 * @param {Array<{latitude: number, longitude: number, sym: string, name: string, desc: string}>} waypoints
 * @param {{minSeparation?: number}} [options]
 * @returns {{layer: L.FeatureGroup, remove: function(): void}} the layer to show,
 *          and the way to stop it following the zoom
 */
export function waypointLayer(map, waypoints, { minSeparation = MIN_SEPARATION } = {}) {
    const layer = L.featureGroup();

    const draw = () => {
        layer.clearLayers();
        // Projected at the current zoom, so the distances are the ones the
        // reader sees. They do not change as the map is panned, only zoomed.
        const zoom = map.getZoom();
        const placed = waypoints.map(waypoint => {
            const { x, y } = map.project([waypoint.latitude, waypoint.longitude], zoom);
            return { x, y, waypoint };
        });

        groupByProximity(placed, minSeparation)
            .map(group => markerFor(group.map(point => point.waypoint)))
            .forEach(marker => layer.addLayer(marker));
    };

    draw();
    map.on('zoomend', draw);

    return {
        layer,
        remove() {
            map.off('zoomend', draw);
            layer.clearLayers();
            layer.remove();
        }
    };
}

/** One marker speaking for one spot's waypoints. */
function markerFor(waypoints) {
    const { html, items, hasPhoto, hasCamp } = mergeGroupContent(waypoints);
    // The first waypoint's position, not the group's centre: the group is no
    // wider than the icon anyway, and an anchor that does not move keeps the
    // marker where the reader last saw it.
    const anchor = waypoints[0];

    // The camp wins the icon. A camp is a fact about the trip — a night spent
    // in a place — while a photo is something to look at, and in these trips
    // almost every camp has photos taken metres from it. Letting the photos
    // take the icon left a map with nothing on it to say where the nights were.
    const marker = L.marker([anchor.latitude, anchor.longitude], {
        icon: L.divIcon({
            ...ICON,
            html: iconHtml(hasCamp ? 'camp' : 'photo', items, hasCamp && hasPhoto)
        })
    });

    if (html) marker.bindTooltip(html, TOOLTIP).bindPopup(html, POPUP);
    return marker;
}

function iconHtml(symbol, items, alsoPhotos) {
    // A spot showing one thing needs no count; the icon already says what it is.
    const count = items > 1 ? `<span class="waypoint-count">${items}</span>` : '';
    // A camp that gave up its icon still has photos worth hovering for, and
    // nothing else on it would say so.
    const photos = alsoPhotos ? '<i class="waypoint-also photo"></i>' : '';
    return `<i class="waypoint-icon ${symbol}"></i>${photos}${count}`;
}

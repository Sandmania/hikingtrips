// The marker that follows the Weather Timeline's hover.
//
// The timeline says where the hiker was — it holds no map and knows nothing
// about Leaflet — and the map answers by moving a marker there.

const MARKER = {
    radius: 6,
    weight: 2,
    // A pointer at the map, not something to click: a marker that took clicks
    // would swallow the route popups underneath wherever it happened to sit.
    interactive: false,
    className: 'weather-hover-position'
};

/**
 * Follow the Weather Timeline's hover with a marker on the map.
 *
 * @param {L.Map} map the trip's map
 * @returns {{remove: function(): void}} stops following and clears the marker
 */
export function hoverMarker(map) {
    let marker = null;

    const onHover = ({ detail }) => {
        const position = [detail.latitude, detail.longitude];
        if (marker) marker.setLatLng(position);
        else marker = L.circleMarker(position, MARKER).addTo(map);

        // A position held at Camp is a weaker claim than a tracked one — the
        // hiker was there all night rather than at that spot at that minute —
        // so the two are drawn differently rather than identically.
        const element = marker.getElement();
        element.classList.toggle('camp', detail.camp);
        element.classList.toggle('walking', !detail.camp);
    };

    const onHoverEnd = () => {
        if (!marker) return;
        marker.remove();
        marker = null;
    };

    document.addEventListener('weather-hover', onHover);
    document.addEventListener('weather-hover-end', onHoverEnd);

    return {
        remove() {
            document.removeEventListener('weather-hover', onHover);
            document.removeEventListener('weather-hover-end', onHoverEnd);
            onHoverEnd();
        }
    };
}

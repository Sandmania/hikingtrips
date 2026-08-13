const DEFAULTS = {
    position: 'topright',
    title: 'Show/Hide Weather Timeline'
};

export function weatherControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            // Per ADR-0002 the Trip Window comes from the track, so a sensor log
            // without an actual route has nothing to be trimmed to and no chart.
            return !!config.csvUrl && !!config.gpxUrl;
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const WeatherControl = L.Control.extend({
                onAdd: function () {
                    const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control weather-timeline-button');
                    L.DomEvent.disableClickPropagation(btn);
                    btn.title = config.title;
                    btn.onclick = () => {
                        document.dispatchEvent(new CustomEvent('toggle-weather-timeline'));
                    };
                    return btn;
                }
            });

            map.addControl(new WeatherControl({ position: config.position }));
        }
    };
}

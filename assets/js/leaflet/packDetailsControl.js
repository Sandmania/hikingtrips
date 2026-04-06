const DEFAULTS = {
    position: 'topright',
    selector: 'tt-pack-details', // DOM element to check for
    title: 'Show/Hide Pack Details'
};

export function packDetailsControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            return !!config.csvUrl;
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const PackDetailsControl = L.Control.extend({
                onAdd: function () {
                    const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control pack-details-button');
                    L.DomEvent.disableClickPropagation(btn);
                    btn.title = config.title;
                    btn.onclick = () => {
                        document.dispatchEvent(new CustomEvent('toggle-pack-details'));
                    };
                    return btn;
                }
            });

            map.addControl(new PackDetailsControl({ position: config.position }));
        }
    };
}
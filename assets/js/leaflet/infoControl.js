const DEFAULTS = {
    position: 'topright',
    title: 'Show/Hide Trip Info',
};

export function infoControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            return config.tripInfo;
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const infoControl = L.Control.extend({
                onAdd: function () {
                    var infoButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control info-button');
                    L.DomEvent.disableClickPropagation(infoButton);
                    infoButton.title = config.title;
                    infoButton.onclick = function () {
                        document.dispatchEvent(new CustomEvent('toggle-trip-info'));
                    };
                    return infoButton;
                }
            });
            map.addControl(new infoControl({ position: 'topright' }));
        }
    };
}
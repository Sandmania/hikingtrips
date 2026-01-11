const DEFAULTS = {
    position: 'topright',
    title: 'Open Gallery',
};

export function galleryControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            return config.url;
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const GalleryControl = L.Control.extend({
                onAdd: function () {
                    const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control gallery-button');
                    L.DomEvent.disableClickPropagation(btn);
                    btn.title = config.title;
                    btn.onclick = () => window.open(config.url, '_blank');
                    return btn;
                }
            });

            map.addControl(new GalleryControl({ position: config.position }));
        }
    };
}
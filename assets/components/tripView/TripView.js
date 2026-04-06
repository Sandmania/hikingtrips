class TripView extends HTMLElement {
    constructor() {
        super();
        this._depsLoaded = false;
    }

    connectedCallback() {
        this.style.display = 'none';
    }

    async show() {
        if (!this._depsLoaded) {
            await this._loadDeps();
            this._depsLoaded = true;
        }
        this.style.display = 'flex';
    }

    hide() {
        this.style.display = 'none';
    }

    async _loadDeps() {
        loadStylesheet('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css');
        loadStylesheet('https://api.tiles.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.css');

        await Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js'),
            loadScript('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js'),
            loadScript('https://api.tiles.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.js'),
        ]);

        await Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/2.1.2/gpx.min.js'),
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl-leaflet/0.0.16/leaflet-mapbox-gl.js'),
        ]);
    }
}

customElements.define('trip-view', TripView);

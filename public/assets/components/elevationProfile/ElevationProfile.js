class ElevationProfile extends HTMLElement {
    connectedCallback() {
        this._handleInit = this._handleInit.bind(this);
        this._handleToggle = this._handleToggle.bind(this);
        this._handleDestroy = this._handleDestroy.bind(this);

        document.addEventListener('elevation-init', this._handleInit);
        document.addEventListener('elevation-toggle', this._handleToggle);
        document.addEventListener('elevation-destroy', this._handleDestroy);
    }

    disconnectedCallback() {
        document.removeEventListener('elevation-init', this._handleInit);
        document.removeEventListener('elevation-toggle', this._handleToggle);
        document.removeEventListener('elevation-destroy', this._handleDestroy);
        this._destroy();
    }

    async _handleInit(event) {
        const { mapInstance, gpxPath } = event.detail;
        this._mapInstance = mapInstance;
        this._gpxPath = gpxPath;

        await this._loadDeps();

        const routeLayer = L.featureGroup();
        let photoLayer = null;

        this._elevationControl = L.control.elevation({
            edgeScale: false,
            theme: "magenta-theme",
            collapsed: true,
            detached: true,
            elevationDiv: "#elevation-profile",
            slope: "summary",
            followMarker: false,
            downloadLink: false,
            distanceMarkers: false,
            hotline: false
        }).addTo(mapInstance);

        this._elevationControl.on('eledata_loaded', ({ layer }) => {
            if (!this._mapInstance) return;

            layer.eachLayer((trkseg) => {
                if (trkseg.feature.geometry.type !== "Point") {
                    routeLayer.addLayer(trkseg);
                } else if (trkseg.feature.properties.sym === "Photo") {
                    if (!photoLayer) {
                        photoLayer = L.featureGroup();
                    }
                    photoLayer.addLayer(trkseg);
                }
            });

            document.dispatchEvent(new CustomEvent('elevation-layers-ready', {
                detail: { routeLayer, photoLayer }
            }));
        });

        this._elevationControl.load(gpxPath);
    }

    _handleToggle(event) {
        if (!this._elevationControl) return;
        this._elevationControl.clear();
        if (event.detail.visible) {
            this._elevationControl.load(this._gpxPath);
        }
    }

    _handleDestroy() {
        this._destroy();
    }

    async _loadDeps() {
        loadStylesheet('https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.1/dist/leaflet-elevation.min.css');

        await loadScript(
            'https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js',
            { integrity: 'sha256-Z/FTYiiAVwGeE4rl3LpmVN6p5KlulJ64thKUoneYMwk=', crossOrigin: 'anonymous' }
        );
    }

    _destroy() {
        if (this._elevationControl) {
            this._elevationControl.clear();
            this._elevationControl = null;
        }
        this.innerHTML = '';
        this._mapInstance = null;
        this._gpxPath = null;
    }
}

customElements.define('elevation-profile', ElevationProfile);

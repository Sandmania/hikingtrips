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
            hotline: false,
            // The waypoints are handed on as data and drawn by the map, which
            // merges the ones that crowd each other — see waypointLayer.js.
            // The chart keeps its own dots for them either way.
            wptIcons: false
        }).addTo(mapInstance);

        this._elevationControl.on('eledata_loaded', ({ layer, data }) => {
            if (!this._mapInstance) return;

            // Built per load rather than once: switching the route overlay off
            // and on reads the GPX again, and the second reading must replace
            // the first rather than stack a second track on top of it.
            const routeLayer = L.featureGroup();
            layer.eachLayer((trkseg) => {
                if (trkseg.feature.geometry.type !== "Point") {
                    routeLayer.addLayer(trkseg);
                }
            });

            document.dispatchEvent(new CustomEvent('elevation-layers-ready', {
                detail: { routeLayer, waypoints: waypointsIn(data) }
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

/**
 * A trip's waypoints, as plain positions and text.
 *
 * The component holds no map, so it hands the waypoints on as data and lets the
 * map decide how they are drawn.
 *
 * @param {Object} geojson what leaflet-elevation read the GPX into
 * @returns {Array<{latitude: number, longitude: number, sym: string, name: string, desc: string}>}
 */
function waypointsIn(geojson) {
    const features = geojson?.features ?? (geojson ? [geojson] : []);
    return features
        .filter(feature => feature.geometry?.type === "Point")
        .map(feature => {
            const [longitude, latitude] = feature.geometry.coordinates;
            const { sym = '', name = '', desc = '' } = feature.properties ?? {};
            return { latitude, longitude, sym, name, desc };
        });
}

customElements.define('elevation-profile', ElevationProfile);

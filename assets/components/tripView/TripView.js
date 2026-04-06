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
        loadStylesheet('https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.1/dist/leaflet-elevation.min.css');

        await Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js'),
            loadScript('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js'),
            loadScript('https://api.tiles.mapbox.com/mapbox-gl-js/v1.5.0/mapbox-gl.js'),
        ]);

        await Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/2.1.2/gpx.min.js'),
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl-leaflet/0.0.16/leaflet-mapbox-gl.js'),
            loadScript(
                'https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js',
                { integrity: 'sha256-Z/FTYiiAVwGeE4rl3LpmVN6p5KlulJ64thKUoneYMwk=', crossOrigin: 'anonymous' }
            ),
        ]);
    }
}

const _scriptLoadPromises = new Map();

function loadScript(src, options = {}) {
    if (_scriptLoadPromises.has(src)) {
        return _scriptLoadPromises.get(src);
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && existing.getAttribute('data-loaded') === 'true') {
        return Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
        const targetScript = existing || document.createElement('script');
        const onLoad = () => {
            targetScript.setAttribute('data-loaded', 'true');
            _scriptLoadPromises.delete(src);
            resolve();
        };
        const onError = (event) => {
            _scriptLoadPromises.delete(src);
            reject(event);
        };

        if (existing) {
            existing.addEventListener('load', onLoad, { once: true });
            existing.addEventListener('error', onError, { once: true });
        } else {
            targetScript.src = src;
            if (options.integrity) targetScript.integrity = options.integrity;
            if (options.crossOrigin) targetScript.crossOrigin = options.crossOrigin;
            targetScript.addEventListener('load', onLoad, { once: true });
            targetScript.addEventListener('error', onError, { once: true });
            document.head.appendChild(targetScript);
        }
    });

    _scriptLoadPromises.set(src, promise);
    return promise;
}

function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
}

customElements.define('trip-view', TripView);

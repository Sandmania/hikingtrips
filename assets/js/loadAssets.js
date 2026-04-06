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

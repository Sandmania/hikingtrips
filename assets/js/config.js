let configPromise = null;

export function clearConfigCache() {
    configPromise = null;
}

export async function loadYAMLConfig(url = 'trip_config.yaml', signal) {
    if (!configPromise) {
        configPromise = (async () => {
            console.log("Loading config from " + url)
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error(`Trip not found: "${url}" returned ${response.status}`);
            const yamlText = await response.text();
            return jsyaml.load(yamlText);
        })();
    }
    return configPromise;
}
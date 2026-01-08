let configPromise = null;

export async function loadYAMLConfig(url = 'trip_config.yaml') {
    if (!configPromise) {
        configPromise = (async () => {
            console.log("Loading config from " + url)
            const response = await fetch(url);
            const yamlText = await response.text();
            return jsyaml.load(yamlText);
        })();
    }
    return configPromise;
}
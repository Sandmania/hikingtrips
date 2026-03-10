export function initializeConfiguredBasemaps(config) {
    const allBaseMaps = {
        "Esri World Imagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        "NLS Topographic map": L.tileLayer('https://api.joun.in/nls_proxy?z={z}&y={y}&x={x}', {
            maxZoom: 15,
            attribution:
                '&copy; <a href="https://www.maanmittauslaitos.fi/avoindata_lisenssi_versio1_20120501"' +
                "target=new>Maanmittauslaitos</a>"
        }),
        "OpenTopoMap": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: &copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> contributors'
        }),
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        "NLS Ortophoto": L.tileLayer('https://tiles.kartat.kapsi.fi/ortokuva_3067/{z}/{x}/{y}.jpg', {
            maxZoom: 19,
            attribution: 'National Land Survey of Finland, Ortophoto'
        }),                              
        "Lantmäteriet": new L.tileLayer('https://api.joun.in/SLR_proxy?z={z}&y={y}&x={x}', {
            maxZoom: 17,
            maxNativeZoom: 14,
            attribution: '&copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a> Topografisk Webbkarta Visning, CCB',
        }),
        "Kartverket": new L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
            attribution: '&copy; <a href="http://kartverket.no">Kartverket</a>',
            maxZoom: 18,
            tileSize: 256
        }),
        "NLS Vector tiles": L.mapboxGL({
            style: 'nls_vector_map.json',
            attribution: 
                '&copy; <a href="https://www.maanmittauslaitos.fi/avoindata_lisenssi_versio1_20120501"' +
                "target=new>Maanmittauslaitos</a>"
        }),
        "FiSeNo Composite": L.layerGroup([
                new L.tileLayer('https://api.joun.in/SLR_proxy?z={z}&y={y}&x={x}', {
                maxZoom: 17,
                maxNativeZoom: 14,
                attribution: '&copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a> Topografisk Webbkarta Visning, CCB',
            }),
                new L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
                attribution: '&copy; <a href="http://kartverket.no">Kartverket</a>',
                maxZoom: 18,
                tileSize: 256
            }),
            L.mapboxGL({
                style: 'assets/vectormap/nls_vector_map.json',
                attribution: 
                    '&copy; <a href="https://www.maanmittauslaitos.fi/avoindata_lisenssi_versio1_20120501"' +
                    "target=new>Maanmittauslaitos</a>"
            })
        ])
    };

    if (config && config.defaults && config.defaults.availableTileLayers) {
        const availableTileLayers = config.defaults.availableTileLayers;
        return availableTileLayers.reduce((baseMaps, layerName) => {
            if (allBaseMaps[layerName]) {
                baseMaps[layerName] = allBaseMaps[layerName];
            }
            return baseMaps;
        }, {});
    }

    return allBaseMaps;
}
let map;
let configurationForAll = {};
// Feature groups for different route types
let legFeatureGroup = L.featureGroup();

export async function loadYAMLConfig(url) {
    const response = await fetch(url);
    const yamlText = await response.text();
    return jsyaml.load(yamlText);
}

export function initMap(globalConfig) {
    configurationForAll = globalConfig;
    console.log("Initializing map. Global config is: ", globalConfig);
    if(globalConfig === undefined) {
        console.warn("Global config is undefined. This might lead to problems.");
    }
    map = new L.map("map", {
        crs: L.TileLayer.MML.get3067Proj()
    });
    map.setView([68.3469, 27.4620], 13);

    // Base maps
    var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> contributors'
    });

    var OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var orto = L.tileLayer('https://tiles.kartat.kapsi.fi/ortokuva/{z}/{x}/{y}.jpg', {
        maxZoom: 19,
        attribution: 'National Land Survey of Finland, Ortophoto'
    });

    var maastokartta = L.tileLayer.mml_wmts({ layer: "maastokartta" }).addTo(map);

    var baseMaps = {
        "NLS Topographic map": maastokartta,
        "OpenTopoMap": OpenTopoMap,
        "OpenStreetMap": OpenStreetMap,
        "NLS Ortophoto": orto
    };

    L.control.layers(baseMaps).addTo(map);

    // Event listener for baselayer change to handle CRS change
    map.on('baselayerchange', function (e) {
        console.log("baselayerchange event name " + e.name)
        var center = map.getCenter();
        var zoom = map.getZoom();
        var currentLayers = [];

        map.eachLayer(function (layer) {
            currentLayers.push(layer);
        });

        // Re-initialize map with new CRS if necessary
        if (e.name === 'NLS Topographic map') {
            console.log("Set CRS to 3067")
            map.options.crs = L.TileLayer.MML.get3067Proj();
        } else {
            console.log("Set CRS to EPSG3857")
            map.options.crs = L.CRS.EPSG3857;
        }

        map.setView(center, zoom);
        e.layer.addTo(map);

        // Re-add other layers if necessary
        currentLayers.forEach(function (layer) {
            if (layer !== e.layer) {
                map.addLayer(layer);
            }
        });
    });

    addRoutesToFeatureGroup(globalConfig.trip, legFeatureGroup);
    map.addLayer(legFeatureGroup);
    return map;
}

export function addRoutesToFeatureGroup(route, featureGroup) {
    route.forEach((leg, index) => {
        console.log("Adding leg to feature group: ", leg, index);
        loadGPX(leg, true, featureGroup, {}, function(gpx, distance) {
            console.log("Loaded leg: ", gpx, distance);
        });
    });
}

function loadGPX(routeConfig, showIcons, featureGroup, defaultOptions, callback) {
    const gpxOptions = {
        async: true,
        marker_options: getMarkerOptions(routeConfig, showIcons),
        polyline_options: getPolylineOptions(routeConfig, defaultOptions)
    };

    new L.GPX(routeConfig.gpx, gpxOptions).on('loaded', function(e) {
        const distance = e.target.get_distance() / 1000; // convert to km
        featureGroup.addLayer(e.target);
        callback(e.target, distance);
    });
}

function getMarkerOptions(routeConfig, showIcons) {
    return {
        startIconUrl: showIcons && routeConfig.startIcon ? routeConfig.startIcon : null,
        endIconUrl: showIcons && routeConfig.endIcon ? routeConfig.endIcon : null,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.4.0/pin-shadow.png'
    };
}

/**
 * Get polyline options for GPX route
 * @param {Object} routeConfig - Configuration for the route
 * @param {Object} defaultOptions - Default options for the route
 * @returns {Object} Polyline options
 */
function getPolylineOptions(routeConfig, defaultOptions) {
    console.log("Getting polyline options for route: ", routeConfig, defaultOptions, configurationForAll);
    return {
        color: routeConfig.color || defaultOptions.color,
        opacity: routeConfig.opacity || defaultOptions.opacity,
        weight: routeConfig.weight || defaultOptions.weight,
        dashArray: routeConfig.dashArray || defaultOptions.dashArray || null
    };
}
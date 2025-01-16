let map;
let globalConfiguration = {};
// Feature groups for different route types
let legFeatureGroup = L.featureGroup();
let evacuationFeatureGroup = L.featureGroup();
let alternativeFeatureGroup = L.featureGroup();

export async function loadYAMLConfig(url) {
    const response = await fetch(url);
    const yamlText = await response.text();
    return jsyaml.load(yamlText);
}

export function initMap(fullConfiguration) {
    globalConfiguration = fullConfiguration;
    console.log("Initializing map. Global config is: ", fullConfiguration);
    if(fullConfiguration === undefined) {
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
    
    map.addLayer(legFeatureGroup);
    map.addLayer(evacuationFeatureGroup);
    map.addLayer(alternativeFeatureGroup);
    var routeType = "trip";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], legFeatureGroup);
    routeType = "evacuation";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], evacuationFeatureGroup);
    routeType = "alternatives";
    //addRoutesToFeatureGroup(routeType, evacuationFeatureGroup);
    return map;
}

export function addRoutesToFeatureGroup(routeType, routesForType, featureGroup) {
    const defaultOptionsForRouteType = globalConfiguration.defaults[routeType];
    const totalNumberOfRoutesForType = routesForType.length;
    console.log("Adding routes of type " + routeType + ". Total number of routes for type: " + totalNumberOfRoutesForType);
    routesForType.forEach((leg, index) => {
        loadGPX(leg, true, featureGroup, defaultOptionsForRouteType, function(gpx, distance) {
            if (index >= totalNumberOfRoutesForType-1) {
                console.log("Last route loaded.");
                // L.GPX is asynchronous, so we need to wait until all routes are loaded before fitting bounds
                if(routeType === "trip") {
                    console.log("Fitting bounds.");
                    map.fitBounds(featureGroup.getBounds());
                }
            }
        });
        if (leg.alternatives) {
            addRoutesToFeatureGroup("alternatives", leg.alternatives, featureGroup);
        }
    });
}

function loadGPX(leg, showIcons, featureGroup, defaultOptions, callback) {
    const gpxOptions = {
        async: true,
        marker_options: getMarkerOptions(leg, showIcons),
        polyline_options: getPolylineOptions(leg, defaultOptions)
    };

    new L.GPX(leg.gpx, gpxOptions).on('loaded', function(e) {
        const distance = e.target.get_distance() / 1000; // convert to km
        featureGroup.addLayer(e.target);
        callback(e.target, distance);
    });
}

function getMarkerOptions(leg, showIcons) {
    return {
        startIconUrl: showIcons && leg.startIcon ? leg.startIcon : null,
        endIconUrl: showIcons && leg.endIcon ? leg.endIcon : null,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.4.0/pin-shadow.png'
    };
}

/**
 * Get polyline options for GPX route
 * @param {Object} leg - Configuration for the leg
 * @param {Object} defaultOptions - Default options for the route
 * @returns {Object} Polyline options
 */
function getPolylineOptions(leg, defaultOptions) {
    console.log("Getting polyline options for route: ", leg, defaultOptions, globalConfiguration);
    return {
        color: leg.color || defaultOptions.color,
        opacity: leg.opacity || defaultOptions.opacity,
        weight: leg.weight || defaultOptions.weight,
        dashArray: leg.dashArray || defaultOptions.dashArray || null
    };
}
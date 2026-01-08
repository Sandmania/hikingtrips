import { showError } from './error.js'
import { packDetailsControl } from './leaflet/packDetailsControl.js'
import { galleryControl } from './leaflet/galleryControl.js'
import { calendarControl } from './leaflet/calendarControl.js'
import { infoControl } from './leaflet/infoControl.js'
import { initializeConfiguredBasemaps } from './leaflet/baseMaps.js'

let map;
let layerControl;
let globalConfiguration = {};
// Feature groups for different route types
let legFeatureGroup = L.featureGroup();
let evacuationFeatureGroup = L.featureGroup();
let alternativeFeatureGroup = L.featureGroup();
let actualRouteLayer = L.featureGroup();

let selectedTripConfiguration;

export function initMap(fullConfiguration) {
    globalConfiguration = fullConfiguration;
    console.log("Initializing map. Global config is: ", fullConfiguration);
    map = new L.map("map").setView([66.50, 25.72], 6);

    var baseMaps = initializeConfiguredBasemaps(globalConfiguration);
    resolveDefaultTileLayer(baseMaps).addTo(map);

    layerControl = L.control.layers(baseMaps, null, {position:'topleft'}).addTo(map);

    if(!globalConfiguration) {
        console.log("No configuration defined. Returning simple map.")
        return map
    }

    if(hasRoutesForType(globalConfiguration["trip"])) {
        layerControl.addOverlay(legFeatureGroup, "Trip");
    }
    if(hasRoutesForType(globalConfiguration["evacuation"])) {
        layerControl.addOverlay(evacuationFeatureGroup, "Evacuation");
    }
    if(hasRoutesForType(gatherAllAlternatives(globalConfiguration))) {
        layerControl.addOverlay(alternativeFeatureGroup, "Alternatives");
    }

    if (globalConfiguration?.actualRoute?.gpx) {
        // If actual route configuration is given, then display only actual route on initial load
        // Other layers can still be toggled on by layercontrols
        setupActualRouteElevation(map, globalConfiguration.actualRoute.gpx);
   } else {
        // Else, display trip, evac and alternative layers on initial load
        map.addLayer(legFeatureGroup);    
        map.addLayer(evacuationFeatureGroup);
        map.addLayer(alternativeFeatureGroup);
    }

    var routeType = "trip";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], legFeatureGroup);
    routeType = "evacuation";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], evacuationFeatureGroup);
    routeType = "alternatives";
    addRoutesToFeatureGroup(routeType, gatherAllAlternatives(globalConfiguration), alternativeFeatureGroup);

    infoControl(({tripInfo: globalConfiguration.trip})).addTo(map);
    packDetailsControl().addTo(map);
    galleryControl({url: globalConfiguration?.photo_info?.galleryUrl}).addTo(map);
    calendarControl({travelInfo: globalConfiguration.travel_info}).addTo(map);
    
    return map;
}

function resolveDefaultTileLayer(baseMaps) {
    const defaultTileLayerName = globalConfiguration?.defaults?.tileLayer || "OpenTopoMap";
    const defaultTileLayer = baseMaps[defaultTileLayerName] || OpenTopoMap;
    return defaultTileLayer;
}

function setupActualRouteElevation(map, gpxPath) {
    actualRouteLayer = L.featureGroup();

    // Initialize elevation control
    const elevationControl = L.control.elevation({
        edgeScale: false,
        theme: "magenta-theme",
        collapsed: true,
        detached: true,
        elevationDiv: "#elevation-div",
        slope: "summary",
        followMarker: false,
        downloadLink: false,
        distanceMarkers: false,
        edgeScale: false,
        hotline: false
    }).addTo(map);

    actualRouteLayer.addTo(map);
    layerControl.addOverlay(actualRouteLayer, "Actual route")

    elevationControl.on('eledata_loaded', 
        ({ layer, name }) => {
            layer.eachLayer((trkseg) => {
                if (trkseg.feature.geometry.type !== "Point") {
                    actualRouteLayer.addLayer(trkseg);
                } else {
                    // If sym == Photo, add to photoLayer so that photo icons can be toggled
                    if (trkseg.feature.properties.sym === "Photo") {
                        if (!map.photoLayer) {
                            map.photoLayer = L.featureGroup().addTo(map);
                            layerControl.addOverlay(map.photoLayer, "Photos");
                        }
                        map.photoLayer.addLayer(trkseg);
                    }
                }
            });
        }
    );
    elevationControl.load(gpxPath);

    /**
     * This somewhat complex logic is here so that start and end icons are also removed
     * when the overlay is toggled off.
     * 
     * An unfortunate side effect for this is, that the photo icons work weirdly when toggling elevation layer off/on.
     */
    map.on('overlayadd', function(e) {
        if (e.layer === actualRouteLayer) {
            elevationControl.clear();
            elevationControl.load(gpxPath);
        }
    });
    map.on('overlayremove', function(e) {
        if (e.layer === actualRouteLayer) {
            elevationControl.clear();
        }
    });
}



function hasRoutesForType(routesForType) {
    return routesForType !== undefined && routesForType !== null && routesForType.length > 0
}

export function addRoutesToFeatureGroup(routeType, routesForType, featureGroup) {
    console.log("Adding routes to feature group for type " + routeType);
    console.log("Routes for type: ", routesForType);
    console.log("Feature group: ", featureGroup);

    if (!hasRoutesForType(routesForType)) {
        console.log("Routes for type " + routeType + " is undefined, null or empty. Skipping.");
        return;
    }

    const defaultOptionsForRouteType = globalConfiguration.defaults[routeType];
    const totalNumberOfRoutesForType = routesForType.length;
    
    routesForType.totalDistance = 0;
    console.log("Adding routes of type " + routeType + ". Total number of routes for type: " + totalNumberOfRoutesForType);
    const loadAllRoutes = routesForType.map((leg, index) => {
        return loadGPX(leg, true, featureGroup, defaultOptionsForRouteType).then((gpx) => {
            setMetadataFromGpxToLegAtIndex(gpx, leg, index);
            createInfoPopupForGpxLayer(gpx, leg);
            // Increase the total distance of specific routes
            routesForType.totalDistance += leg.distance;
            console.log("Loaded route " + index + " of type " + routeType + " with name " + leg.name);
        }).catch(showError);
    });

    if (routeType === "trip") {
        Promise.allSettled(loadAllRoutes).then(() => {
            console.log("All routes loaded.");
            map.fitBounds(featureGroup.getBounds());
            // Selected trip configuration is displayed in trip information view
            // This can be either the pre configured trip in configuration, or a dynamic trip
            // constructed from various selected alternatives
            selectedTripConfiguration = routesForType;
            document.dispatchEvent(
                new CustomEvent('trip-loaded', {
                    detail: {
                        tripConfiguration: selectedTripConfiguration,
                        walkingSpeed: globalConfiguration.defaults.walkingSpeed,
                        defaults: globalConfiguration.defaults
                    }
                })
            );
        }).catch((error) => {
            console.error("Error loading routes: ", error);
        });
    } else if (routeType == "alternatives") {
        document.addEventListener('alternatives-change', (event) => {
            console.log('Alternatives updated:', event.detail.selectedAlternatives);
            updateMapWithAlternatives(event.detail.selectedAlternatives);
        });
    }
}

function createInfoPopupForGpxLayer(gpx, leg) {
    gpx.loadedGpx.eachLayer(layer => {
        let popupContent = `${leg.name}: ${leg.distance.toFixed(2)} km`;
        if (leg.elevationGain || leg.elevationLoss) {
            popupContent += ` (+${leg.elevationGain || 0} m / -${leg.elevationLoss || 0} m)`;
        }
        layer.bindPopup(popupContent);
    });
}

function setMetadataFromGpxToLegAtIndex(gpx, leg, index) {
    setLegElevationData(gpx, leg);
    setLegName(gpx, leg, index + 1);
    setLegDistance(leg, gpx);
}

/**
 * 
 * @param {L.GPX} gpx leaflet gpx from which a name will be extracted, if any
 * @param {*} leg 
 * @param {String} fallback name for leg
 * @returns 
 */
function setLegName(gpx, leg, fallback) {
    const name = leg.name != null ? leg.name : gpx.loadedGpx.get_name() != null ? gpx.loadedGpx.get_name() : fallback;
    if (leg.name === undefined) {
        leg.name = name;
    }
    return name;
}

function setLegElevationData(gpx, leg) {
    try {
        if (gpx.loadedGpx.get_elevation_data()) {
            leg.elevationGain = Math.round(gpx.loadedGpx.get_elevation_gain());
            leg.elevationLoss = Math.round(gpx.loadedGpx.get_elevation_loss());
        }
    } catch (error) {
        // console.warn("Error retrieving elevation data:", error);
    }
}

function setLegDistance(leg, gpx) {
    leg.distance = gpx.loadedGpx.get_distance() / 1000; // convert to km
}

function loadGPX(leg, showIcons, featureGroup, defaultOptions) {

    return new Promise((resolve, reject) => {
        new L.GPX(leg.gpx, {
            async: true,
            markers: getMarkerOptions(leg, showIcons, defaultOptions),
            marker_options: {
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.4.0/pin-shadow.png'
            },
            polyline_options: getPolylineOptions(leg, defaultOptions)
        })
        /*.on('addpoint', function (e) {
            console.log('Added ' + e.point_type + ' point: ' + e.point);
        })*/
        .on('loaded', function (e) {
            featureGroup.addLayer(e.target);
            resolve({ loadedGpx: e.target });
        })
        .on('error', function (e) {
            console.log('Error loading file: ' + e.err);
            reject(e.err)
        });
    });
}

function getMarkerOptions(leg, showIcons, defaultOptions) {
    return {
        startIcon: showIcons && (leg.startIcon !== undefined ? leg.startIcon : defaultOptions.startIcon),
        endIcon: showIcons && (leg.endIcon !== undefined ? leg.endIcon : defaultOptions.endIcon),
    };
}

/**
 * Get polyline options for GPX route
 * @param {Object} leg - Configuration for the leg
 * @param {Object} defaultOptions - Default options for the route
 * @returns {Object} Polyline options
 */
function getPolylineOptions(leg, defaultOptions) {
    return {
        color: leg.color || defaultOptions.color,
        opacity: leg.opacity || defaultOptions.opacity,
        weight: leg.weight || defaultOptions.weight,
        dashArray: leg.dashArray || defaultOptions.dashArray || null
    };
}

export function updateMapWithAlternatives(selectedAlternatives) {
    // Create a set to keep track of legs to be skipped
    const legsToSkip = new Set();

    // Build the trip with selected alternatives and determine legs to skip
    const tripWithAlternatives = globalConfiguration.trip.map((leg, index) => {
        const selectedAlt = selectedAlternatives.find(alt => alt.legIndex === index);
        if (selectedAlt) {
            const alternative = leg.alternatives[selectedAlt.altIndex];
            if (alternative.skips) {
                alternative.skips.forEach(skipIndex => legsToSkip.add(skipIndex - 1)); // Convert to zero-based index
            }
            return alternative;
        }
        return leg;
    }).filter((leg, index) => !legsToSkip.has(index)); // Filter out legs to be skipped

    legFeatureGroup.clearLayers();

    addRoutesToFeatureGroup('trip', tripWithAlternatives, legFeatureGroup);
}

/**
 * Gather all alternatives from the trip configuration
 * @param {Object} config - Parsed configuration object
 * @returns {Array} - Array of all alternatives
 */
function gatherAllAlternatives(config) {
    const alternatives = [];

    if (!config.trip || !Array.isArray(config.trip)) {
        console.warn("No trip configuration found. Skipping gatherAllAlternatives.");
        return;
    }

    config.trip.forEach((leg, legIndex) => {
        if (leg.alternatives) {
            leg.alternatives.forEach((alt, altIndex) => {
                alternatives.push({
                    legIndex: legIndex,
                    altIndex: altIndex,
                    ...alt
                });
            });
        }
    });
    return alternatives;
}
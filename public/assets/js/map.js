import { showError } from './error.js'
import { packDetailsControl } from './leaflet/packDetailsControl.js'
import { mealPlanControl } from './leaflet/mealPlanControl.js'
import { galleryControl } from './leaflet/galleryControl.js'
import { calendarControl } from './leaflet/calendarControl.js'
import { infoControl } from './leaflet/infoControl.js'
import { initializeConfiguredBasemaps } from './leaflet/baseMaps.js'

let map;
let layerControl;
let globalConfiguration = {};
// Feature groups for different route types
let legFeatureGroup;
let evacuationFeatureGroup;
let alternativeFeatureGroup;
let actualRouteLayer;

let selectedTripConfiguration;
let pendingElevationListener;

document.addEventListener('alternatives-change', (event) => {
    if (!map) return;
    console.log('Alternatives updated:', event.detail.selectedAlternatives);
    if (!map.hasLayer(legFeatureGroup)) map.addLayer(legFeatureGroup);
    if (!map.hasLayer(alternativeFeatureGroup)) map.addLayer(alternativeFeatureGroup);
    updateMapWithAlternatives(event.detail.selectedAlternatives);
});

export function destroyMap() {
    if (map) {
        map.remove();
        map = null;
    }
    if (pendingElevationListener) {
        document.removeEventListener('elevation-layers-ready', pendingElevationListener);
        pendingElevationListener = null;
    }
    legFeatureGroup = L.featureGroup();
    evacuationFeatureGroup = L.featureGroup();
    alternativeFeatureGroup = L.featureGroup();
    actualRouteLayer = L.featureGroup();
    document.dispatchEvent(new CustomEvent('elevation-destroy'));
}

export function initMap(fullConfiguration) {
    globalConfiguration = fullConfiguration;
    legFeatureGroup = L.featureGroup();
    evacuationFeatureGroup = L.featureGroup();
    alternativeFeatureGroup = L.featureGroup();
    actualRouteLayer = L.featureGroup();
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
        addRoutesToFeatureGroup("trip", globalConfiguration.trip, legFeatureGroup);
    }
    if(hasRoutesForType(globalConfiguration["evacuation"])) {
        layerControl.addOverlay(evacuationFeatureGroup, "Evacuation");
        addRoutesToFeatureGroup("evacuation", globalConfiguration.evacuation, evacuationFeatureGroup);
    }
    if(hasRoutesForType(gatherAllAlternatives(globalConfiguration))) {
        layerControl.addOverlay(alternativeFeatureGroup, "Alternatives");
        addRoutesToFeatureGroup("alternatives", gatherAllAlternatives(globalConfiguration), alternativeFeatureGroup);
    }

    if (globalConfiguration?.actualRoute?.gpx) {
        const gpxPath = globalConfiguration.actualRoute.gpx;

        const onLayersReady = (event) => {
            pendingElevationListener = null;
            const { routeLayer, photoLayer } = event.detail;
            actualRouteLayer = routeLayer;
            routeLayer.addTo(map);
            layerControl.addOverlay(routeLayer, "Actual route");

            if (photoLayer) {
                photoLayer.addTo(map);
                layerControl.addOverlay(photoLayer, "Photos");
            }

            map.on('overlayadd', function(e) {
                if (e.layer === routeLayer) {
                    document.dispatchEvent(new CustomEvent('elevation-toggle', {
                        detail: { visible: true, gpxPath }
                    }));
                }
            });
            map.on('overlayremove', function(e) {
                if (e.layer === routeLayer) {
                    document.dispatchEvent(new CustomEvent('elevation-toggle', {
                        detail: { visible: false }
                    }));
                }
            });
        };
        pendingElevationListener = onLayersReady;
        document.addEventListener('elevation-layers-ready', onLayersReady, { once: true });

        document.dispatchEvent(new CustomEvent('elevation-init', {
            detail: { mapInstance: map, gpxPath }
        }));
    } else {
        // Else, display trip, evac and alternative layers on initial load
        map.addLayer(legFeatureGroup);    
        map.addLayer(evacuationFeatureGroup);
        map.addLayer(alternativeFeatureGroup);
    }

    infoControl(({tripInfo: globalConfiguration.trip})).addTo(map);
    packDetailsControl({csvUrl: globalConfiguration?.packDetails?.csvUrl}).addTo(map);
    mealPlanControl({csvUrl: globalConfiguration?.mealPlan?.csvUrl}).addTo(map);
    galleryControl({url: globalConfiguration?.photo_info?.galleryUrl}).addTo(map);
    calendarControl({travelInfo: globalConfiguration.travel_info}).addTo(map);
    
    return map;
}

function resolveDefaultTileLayer(baseMaps) {
    const defaultTileLayerName = globalConfiguration?.defaults?.tileLayer || "OpenTopoMap";
    const defaultTileLayer = baseMaps[defaultTileLayerName] || OpenTopoMap;
    return defaultTileLayer;
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

function hasRoutesForType(routesForType) {
    return routesForType !== undefined && routesForType !== null && routesForType.length > 0
}
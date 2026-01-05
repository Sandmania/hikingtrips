import { showError } from './error.js'

let map;
let layerControl;
let globalConfiguration = {};
// Feature groups for different route types
let legFeatureGroup = L.featureGroup();
let evacuationFeatureGroup = L.featureGroup();
let alternativeFeatureGroup = L.featureGroup();
let actualRouteLayer = L.featureGroup();

let totalMealPlans = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0
};

let selectedTripConfiguration;

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
    map = new L.map("map").setView([66.50, 25.72], 6);

    var baseMaps = initializeBaseMaps(globalConfiguration);

    // Determine the default tile layer
    const defaultTileLayerName = globalConfiguration?.defaults?.tileLayer || "OpenTopoMap";
    const defaultTileLayer = baseMaps[defaultTileLayerName] || OpenTopoMap;

    // Add the default tile layer to the map
    defaultTileLayer.addTo(map);

    if(!globalConfiguration) {
        console.log("No configuration defined. Returning simple map.")
        return map
    }

    layerControl = L.control.layers(baseMaps, null, {position:'topleft'}).addTo(map);
    if(hasRoutesForType(globalConfiguration["trip"])) {
        layerControl.addOverlay(legFeatureGroup, "Trip");
    }
    if(hasRoutesForType(globalConfiguration["evacuation"])) {
        layerControl.addOverlay(evacuationFeatureGroup, "Evacuation");
    }
    if(hasRoutesForType(gatherAllAlternatives(globalConfiguration))) {
        layerControl.addOverlay(alternativeFeatureGroup, "Alternatives");
    }

    // --- Add elevation control and actual route layer if GPX exists ---
    if (globalConfiguration?.actualRoute?.gpx) {
        setupActualRouteElevation(map, baseMaps, globalConfiguration.actualRoute.gpx);
   } else {
        map.addLayer(legFeatureGroup);    
        map.addLayer(evacuationFeatureGroup);
        map.addLayer(alternativeFeatureGroup);
    }
    // --- end elevation control ---

    generateAlternativeCheckboxes(globalConfiguration);

    var routeType = "trip";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], legFeatureGroup, addRouteInformationToInfoDiv);
    routeType = "evacuation";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], evacuationFeatureGroup);
    routeType = "alternatives";
    addRoutesToFeatureGroup(routeType, gatherAllAlternatives(globalConfiguration), alternativeFeatureGroup);


    // Add custom control for toggling the plan info overlay
    if(globalConfiguration.trip) {
        const infoControl = L.Control.extend({
            onAdd: function(map) {
                const infoButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control info-button');
                // Don't propagate click events to the map, double clicking would zoom in
                L.DomEvent.disableClickPropagation(infoButton);
                infoButton.innerHTML = '';
                const rightContent = document.getElementById('right-content');
                infoButton.onclick = function() {
                    if (rightContent.style.display === 'none' || rightContent.style.display === '') {
                        rightContent.style.display = 'flex';
                    } else {
                        rightContent.style.display = 'none';
                    }
                };
                return infoButton;
            }
        });

        map.addControl(new infoControl({ position: 'topright' }));
    }

    if (globalConfiguration.travel_info) {
        console.log("Travel info is available. Adding calendar control.");
        const calendarControl = L.Control.extend({
            onAdd: function(map) {
                var calendarButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control calendar-button');
                // Don't propagate click events to the map, double clicking would zoom in
                L.DomEvent.disableClickPropagation(calendarButton);
                calendarButton.innerHTML = '';
                const rightContent = document.getElementById('calendar-container');
                calendarButton.onclick = function() {
                    if (rightContent.style.display === 'none' || rightContent.style.display === '') {
                        rightContent.style.display = 'flex';
                    } else {
                        rightContent.style.display = 'none';
                    }
                };
                return calendarButton;
            }
        });

        map.addControl(new calendarControl({ position: 'topright' }));
    }

    if (document.querySelector('tt-pack-details')) {
        const packDetailsControl = L.Control.extend({
            onAdd: function(map) {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control pack-details-button');
                L.DomEvent.disableClickPropagation(btn);
                btn.title = "Show/Hide Pack Details";
                btn.onclick = function() {
                    document.dispatchEvent(new CustomEvent('toggle-pack-details'));
                };
                return btn;
            }
        });

        map.addControl(new packDetailsControl({ position: 'topright' }));
    }

    // --- Add gallery control button ---
    if (globalConfiguration.photo_info && globalConfiguration.photo_info.galleryUrl) {
        const galleryControl = L.Control.extend({
            onAdd: function(map) {
                const galleryButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control gallery-button');
                L.DomEvent.disableClickPropagation(galleryButton);
                galleryButton.innerHTML = '';
                galleryButton.title = "Open Gallery";
                galleryButton.onclick = function() {
                    window.open(globalConfiguration.photo_info.galleryUrl, '_blank');
                };
                return galleryButton;
            }
        });

        map.addControl(new galleryControl({ position: 'topright' }));
    }
    
    return map;
}

function setupActualRouteElevation(map, baseMaps, gpxPath) {
    actualRouteLayer = L.featureGroup();
    let actualRouteLayerAdded = false;

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
                            // Add to layer control if not already present
                            if (layerControl && !layerControl._layers.some(layer => layer.name === "Photos")) {
                                layerControl.addOverlay(map.photoLayer, "Photos");
                            }
                        }
                        map.photoLayer.addLayer(trkseg);
                    }
                }
            });
        }
    );
    elevationControl.load(gpxPath);

    map.on('overlayadd', function(e) {
        if (e.layer === actualRouteLayer) {
            // Prevent duplicate add on initial load
            if (actualRouteLayerAdded) {
                elevationControl.clear();
                elevationControl.load(gpxPath);
            }
            actualRouteLayerAdded = true;
        }
    });
    map.on('overlayremove', function(e) {
        if (e.layer === actualRouteLayer) {
            elevationControl.clear();
        }
    });
}

function initializeBaseMaps(config) {
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
                style: 'nls_vector_map.json',
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

function addRouteInformationToInfoDiv() {
    const speed = globalConfiguration.defaults.walkingSpeed;
    const trip = selectedTripConfiguration || globalConfiguration.trip;
    trip.forEach((leg, index) => {
        const mealPlan = leg.mealPlan || globalConfiguration.defaults.trip.mealPlan;
        const mealPlanDetails = calculateMealPlan(leg.distance, speed, mealPlan);
        leg.mealPlanDetails = mealPlanDetails;
        if (mealPlan.breakfast) totalMealPlans.breakfast++;
        if (mealPlan.lunch) totalMealPlans.lunch++;
        if (mealPlan.dinner) totalMealPlans.dinner++;
        if (mealPlan.snacks) totalMealPlans.snacks += Math.floor(leg.distance / speed);
        let elevationInfo = '';
        if (leg.elevationGain || leg.elevationLoss) {
            elevationInfo = ` (+${leg.elevationGain || 0} m / -${leg.elevationLoss || 0} m)`;
        }
        let distanceInfo = '';
        if (leg.distance) {
            distanceInfo = `: ${leg.distance.toFixed(2)} km`;
        }
        document.getElementById('info').innerHTML += `<p>Leg ${index + 1}: ${distanceInfo}${elevationInfo}</p>`;
        document.getElementById('info').innerHTML += `<p>Meal Plan: ${mealPlanDetails}</p>`;
    });
    const zeroDays = globalConfiguration.defaults.numberOfZeroDays;
    for (let i = 0; i < zeroDays; i++) {
        const mealPlan = globalConfiguration.defaults.zero.mealPlan;
        const mealPlanDetails = calculateMealPlan(0, speed, mealPlan);
        if (mealPlan.breakfast) totalMealPlans.breakfast++;
        if (mealPlan.lunch) totalMealPlans.lunch++;
        if (mealPlan.dinner) totalMealPlans.dinner++;
        document.getElementById('info').innerHTML += `<p>Zero Day ${i + 1}</p>`;
        document.getElementById('info').innerHTML += `<p>Meal Plan: ${mealPlanDetails}</p>`;
    }
    document.getElementById('info').innerHTML += `<p>Total length: ${selectedTripConfiguration.totalDistance.toFixed(2)} km</p>`;
    document.getElementById('info').innerHTML += `<p>Total Meals: Breakfasts: ${totalMealPlans.breakfast}, Lunches: ${totalMealPlans.lunch}, Dinners: ${totalMealPlans.dinner}, Snacks: ${totalMealPlans.snacks}</p>`;
}

function hasRoutesForType(routesForType) {
    return routesForType !== undefined && routesForType !== null && routesForType.length > 0
}

export function addRoutesToFeatureGroup(routeType, routesForType, featureGroup, callback) {
    console.log("Adding routes to feature group for type " + routeType);
    console.log("Routes for type: ", routesForType);
    console.log("Feature group: ", featureGroup);
    console.log("Callback: ", callback);
    if (routesForType === undefined || routesForType === null || routesForType.length === 0) {
        console.log("Routes for type " + routeType + " is undefined, null or empty. Skipping.");
        return;
    }

    callback = callback || function(){};
    if (routeType !== "alternatives") {
        document.getElementById('info').innerHTML = '';
        totalMealPlans = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 }; // Reset meal plans
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
            console.log("Loaded route " + index + " with name " + leg.name);
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
            callback();
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

// Function to calculate meal plan
function calculateMealPlan(distance, speed, mealPlan) {
    var time = distance / speed;
    var mealPlanDetails = [];

    if (mealPlan.breakfast) mealPlanDetails.push("Breakfast");
    if (mealPlan.lunch) mealPlanDetails.push("Lunch");
    if (mealPlan.dinner) mealPlanDetails.push("Dinner");

    if (mealPlan.snacks) {
        var snacks = Math.floor(time);
        mealPlanDetails.push(`${snacks} Snack Bar${snacks > 1 ? 's' : ''}`);
    }

    return mealPlanDetails.join(", ");
}

function generateAlternativeCheckboxes(config) {
    const alternativeRoutesDiv = document.getElementById('alternative-routes');

    if (!config || !config.trip || !Array.isArray(config.trip)) {
        console.warn("No trip configuration found. Skipping alternative checkboxes.");
        return;
    }

    config.trip.forEach((leg, legIndex) => {
        if (leg.alternatives) {
            leg.alternatives.forEach((alt, altIndex) => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `alt-leg-${legIndex + 1}-${altIndex + 1}`;
                checkbox.dataset.legIndex = legIndex;
                checkbox.dataset.altIndex = altIndex;

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.innerText = `Alternative for Leg ${legIndex + 1} - Option ${altIndex + 1}`;

                alternativeRoutesDiv.appendChild(checkbox);
                alternativeRoutesDiv.appendChild(label);
                alternativeRoutesDiv.appendChild(document.createElement('br'));
            });
        }
    });
}

export function updateMapWithAlternatives() {
    const selectedAlternatives = Array.from(document.querySelectorAll('#alternative-routes input:checked')).map(checkbox => ({
        legIndex: parseInt(checkbox.dataset.legIndex),
        altIndex: parseInt(checkbox.dataset.altIndex)
    }));

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

    addRoutesToFeatureGroup('trip', tripWithAlternatives, legFeatureGroup, addRouteInformationToInfoDiv);
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
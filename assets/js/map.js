let map;
let layerControl;
let globalConfiguration = {};
// Feature groups for different route types
let legFeatureGroup = L.featureGroup();
let evacuationFeatureGroup = L.featureGroup();
let alternativeFeatureGroup = L.featureGroup();

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
    map = new L.map("map");

    var baseMaps = initializeBaseMaps(globalConfiguration);

    // Determine the default tile layer
    const defaultTileLayerName = globalConfiguration.defaults.tileLayer || "OpenTopoMap";
    const defaultTileLayer = baseMaps[defaultTileLayerName] || OpenTopoMap;

    // Set the CRS based on the tile layer
    setCRSBasedOnTileLayer(defaultTileLayerName);

    // Add the default tile layer to the map
    defaultTileLayer.addTo(map);

    layerControl = L.control.layers(baseMaps).addTo(map);

    // Event listener for baselayer change to handle CRS change
    map.on('baselayerchange', function (e) {
        console.log("baselayerchange event name " + e.name)
        var center = map.getCenter();
        var zoom = map.getZoom();
        var currentLayers = [];

        map.eachLayer(function (layer) {
            currentLayers.push(layer);
        });

        // Set new CRS if necessary
        setCRSBasedOnTileLayer(e.name);

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

    generateAlternativeCheckboxes(globalConfiguration);

    var routeType = "trip";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], legFeatureGroup, addRouteInformationToInfoDiv);
    routeType = "evacuation";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], evacuationFeatureGroup);
    routeType = "alternatives";
    addRoutesToFeatureGroup(routeType, gatherAllAlternatives(globalConfiguration), alternativeFeatureGroup);

    // Add custom control for toggling the overlay
    const toggleControl = L.Control.extend({
        onAdd: function(map) {
            const button = L.DomUtil.create('button', 'leaflet-control-toggle');
            button.innerHTML = 'Trip details';
            const rightContent = document.getElementById('right-content');
            button.onclick = function() {
                if (rightContent.style.display === 'none' || rightContent.style.display === '') {
                    rightContent.style.display = 'flex';
                } else {
                    rightContent.style.display = 'none';
                }
            };
            return button;
        }
    });

    map.addControl(new toggleControl({ position: 'topright' }));
    
    return map;
}

function initializeBaseMaps(config) {
    const allBaseMaps = {
        "NLS Topographic map": L.tileLayer.mml_wmts({ layer: "maastokartta" }),
        "OpenTopoMap": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: &copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> contributors'
        }),
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        "NLS Ortophoto": L.tileLayer('https://tiles.kartat.kapsi.fi/ortokuva/{z}/{x}/{y}.jpg', {
            maxZoom: 19,
            attribution: 'National Land Survey of Finland, Ortophoto'
        }),
        "Lantmäteriet": new L.tileLayer('https://api.joun.in/SLR_proxy?z={z}&y={y}&x={x}', {
            maxZoom: 9,
            attribution: '&copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a> Topografisk Webbkarta Visning, CCB',
        })
    };

    if (config.defaults && config.defaults.availableTileLayers) {
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

function setCRSBasedOnTileLayer(tileLayerName) {
    if (tileLayerName === 'NLS Topographic map') {
        console.log("Set CRS to 3067");
        map.options.crs = L.TileLayer.MML.get3067Proj();
    } else if (tileLayerName === 'Lantmäteriet') {
        console.log("Set CRS to 3006");
        map.options.crs = new L.Proj.CRS('EPSG:3006',
            '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
            {
                resolutions: [
                    4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8
                ],
                origin: [-1200000.000000, 8500000.000000],
                bounds: L.bounds([-1200000.000000, 8500000.000000], [4305696.000000, 2994304.000000])
            });
    } else {
        console.log("Set CRS to EPSG3857");
        map.options.crs = L.CRS.EPSG3857;
    }
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
        document.getElementById('info').innerHTML += `<p>Leg ${index + 1} length: ${leg.distance.toFixed(2)} km</p>`;
        document.getElementById('info').innerHTML += `<p>Meal Plan for ${index + 1}: ${mealPlanDetails}</p>`;
    });
    document.getElementById('info').innerHTML += `<p>Total length: ${selectedTripConfiguration.totalDistance.toFixed(2)} km</p>`;
    document.getElementById('info').innerHTML += `<p>Total Meal Plans: Breakfasts: ${totalMealPlans.breakfast}, Lunches: ${totalMealPlans.lunch}, Dinners: ${totalMealPlans.dinner}, Snacks: ${totalMealPlans.snacks}</p>`;
}

export function addRoutesToFeatureGroup(routeType, routesForType, featureGroup, callback) {
    console.log("Adding routes to feature group for type " + routeType);
    console.log("Routes for type: ", routesForType);
    console.log("Feature group: ", featureGroup);
    console.log("Callback: ", callback);
    if (routesForType === undefined || routesForType.length === 0) {
        console.log("Routes for type " + routeType + " is undefined or empty. Skipping.");
        return;
    }
    // Add toggle checkbox for the feature group
    layerControl.addOverlay(featureGroup, routeType);

    callback = callback || function(){};
    if (routeType !== "alternatives") {
        document.getElementById('info').innerHTML = '';
        totalMealPlans = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 }; // Reset meal plans
    }
    const defaultOptionsForRouteType = globalConfiguration.defaults[routeType];
    const totalNumberOfRoutesForType = routesForType.length;
    let totalLengtOfRoutes = 0;
    routesForType.totalDistance = 0;
    console.log("Adding routes of type " + routeType + ". Total number of routes for type: " + totalNumberOfRoutesForType);
    const loadAllRoutes = routesForType.map((leg, index) => {
        return loadGPX(leg, true, featureGroup, defaultOptionsForRouteType).then((gpx) => {
            console.log("Loaded route " + index + " with distance " + gpx.distance);
            console.log(gpx + " " + gpx.distance);
            // Display popup with route number and distance
            gpx.loadedGpx.eachLayer(layer => {
                layer.bindPopup(`${index + 1}: ${gpx.distance.toFixed(2)} km`);
            });
            leg.distance = gpx.distance;
            routesForType.totalDistance += leg.distance;
            if(routeType === "trip") {
                selectedTripConfiguration = routesForType;
            }
        });
    });

    if (routeType === "trip") {
        Promise.all(loadAllRoutes).then(() => {
            console.log("All routes loaded.");
            map.fitBounds(featureGroup.getBounds());
            callback();
        }).catch((error) => {
            console.error("Error loading routes: ", error);
        });
    }
}

function loadGPX(leg, showIcons, featureGroup, defaultOptions) {
    return new Promise((resolve) => {
        const gpxOptions = {
            async: true,
            markers: getMarkerOptions(leg, showIcons, defaultOptions),
            marker_options: {
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.4.0/pin-shadow.png'
            },
            polyline_options: getPolylineOptions(leg, defaultOptions)
        };

        new L.GPX(leg.gpx, gpxOptions).on('loaded', function(e) {
            const distance = e.target.get_distance() / 1000; // convert to km
            console.log("Loaded GPX with distance: " + distance);
            featureGroup.addLayer(e.target);
            resolve({loadedGpx: e.target, distance});
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
    map.fitBounds(legFeatureGroup.getBounds());
}

/**
 * Gather all alternatives from the trip configuration
 * @param {Object} config - Parsed configuration object
 * @returns {Array} - Array of all alternatives
 */
function gatherAllAlternatives(config) {
    const alternatives = [];
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
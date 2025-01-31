let map;
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
        //crs: L.TileLayer.MML.get3067Proj()
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

    var maastokartta = L.tileLayer.mml_wmts({ layer: "maastokartta" });

    var baseMaps = {
        "NLS Topographic map": maastokartta,
        "OpenTopoMap": OpenTopoMap,
        "OpenStreetMap": OpenStreetMap,
        "NLS Ortophoto": orto
    };

    // Determine the default tile layer
    const defaultTileLayerName = globalConfiguration.defaults.tileLayer || "OpenTopoMap";
    const defaultTileLayer = baseMaps[defaultTileLayerName] || OpenTopoMap;

    // Set the CRS based on the tile layer
    if (defaultTileLayerName === 'NLS Topographic map') {
        console.log("Set CRS to 3067")
        map.options.crs = L.TileLayer.MML.get3067Proj();
    } else {
        console.log("Set CRS to EPSG3857")
        map.options.crs = L.CRS.EPSG3857;
    }

    // Add the default tile layer to the map
    defaultTileLayer.addTo(map);

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
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], legFeatureGroup, addTotalLengthOfRoutesToInfoDiv);
    routeType = "evacuation";
    addRoutesToFeatureGroup(routeType, globalConfiguration[routeType], evacuationFeatureGroup);
    routeType = "alternatives";
    //addRoutesToFeatureGroup(routeType, evacuationFeatureGroup);
    generateAlternativeCheckboxes(globalConfiguration);
    return map;
}

function addTotalLengthOfRoutesToInfoDiv(totalLengthOfRoutes) {
    console.log("Displaying total length of routes: " + totalLengthOfRoutes);
    document.getElementById('info').innerHTML += `<p>Total length: ${totalLengthOfRoutes.toFixed(2)} km</p>`;
    document.getElementById('info').innerHTML += `<p>Total Meal Plans: Breakfasts: ${totalMealPlans.breakfast}, Lunches: ${totalMealPlans.lunch}, Dinners: ${totalMealPlans.dinner}, Snacks: ${totalMealPlans.snacks}</p>`;
}

export function addRoutesToFeatureGroup(routeType, routesForType, featureGroup, callback) {
    console.log("Adding routes to feature group for type " + routeType);
    console.log("Routes for type: ", routesForType);
    console.log("Feature group: ", featureGroup);
    console.log("Callback: ", callback);
    if (routesForType === undefined) {
        console.log("Routes for type " + routeType + " is undefined. Skipping.");
        return;
    }
    callback = callback || function(){};
    if (routeType !== "alternatives") {
        document.getElementById('info').innerHTML = '';
        totalMealPlans = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 }; // Reset meal plans
    }
    const defaultOptionsForRouteType = globalConfiguration.defaults[routeType];
    const totalNumberOfRoutesForType = routesForType.length;
    let totalLengtOfRoutes = 0;
    console.log("Adding routes of type " + routeType + ". Total number of routes for type: " + totalNumberOfRoutesForType);
    routesForType.forEach((leg, index) => {
        loadGPX(leg, true, featureGroup, defaultOptionsForRouteType, function(gpx, distance) {
            // Display popup with route number and distance
            gpx.eachLayer(layer => {
                layer.bindPopup(`${index + 1}: ${distance.toFixed(2)} km`);
            });
            if(routeType === "trip") {
                console.log("Adding distance to total length: " + distance);
                totalLengtOfRoutes += distance;
                console.log("Total length of routes after addition " + totalLengtOfRoutes);
                document.getElementById('info').innerHTML += `<p>Leg ${index + 1} length: ${distance.toFixed(2)} km</p>`;
                const speed = globalConfiguration.defaults.walkingSpeed;
                const mealPlan = leg.mealPlan || globalConfiguration.defaults[routeType].mealPlan;
                const mealPlanDetails = calculateMealPlan(distance, speed, mealPlan);
                document.getElementById('info').innerHTML += `<p>Meal Plan for ${index + 1}: ${mealPlanDetails}</p>`;

                // Update total meal plans
                if (mealPlan.breakfast) totalMealPlans.breakfast++;
                if (mealPlan.lunch) totalMealPlans.lunch++;
                if (mealPlan.dinner) totalMealPlans.dinner++;
                if (mealPlan.snacks) totalMealPlans.snacks += Math.floor(distance / speed);
            }
            var isLastRoute = index >= totalNumberOfRoutesForType-1;
            if (isLastRoute) {
                console.log("Last route loaded.");
                // L.GPX is asynchronous, so we need to wait until all routes are loaded before fitting bounds
                if(routeType === "trip") {
                    console.log("Fitting bounds.");
                    map.fitBounds(featureGroup.getBounds());
                    callback(totalLengtOfRoutes);
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
        marker_options: getMarkerOptions(leg, showIcons, defaultOptions),
        polyline_options: getPolylineOptions(leg, defaultOptions)
    };

    new L.GPX(leg.gpx, gpxOptions).on('loaded', function(e) {
        const distance = e.target.get_distance() / 1000; // convert to km
        featureGroup.addLayer(e.target);
        callback(e.target, distance);
    });
}

function getMarkerOptions(leg, showIcons, defaultOptions) {
    return {
        startIconUrl: showIcons && leg.startIcon ? leg.startIcon : defaultOptions.startIcon,
        endIconUrl: showIcons && leg.endIcon ? leg.endIcon : defaultOptions.endIcon,
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
    addRoutesToFeatureGroup('trip', tripWithAlternatives, legFeatureGroup, addTotalLengthOfRoutesToInfoDiv);
    map.fitBounds(legFeatureGroup.getBounds());
}
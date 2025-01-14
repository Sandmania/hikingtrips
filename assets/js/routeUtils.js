/**
 * Finalize the route addition process
 * @param {number} map - Leaflet map object
 * @param {number} totalLength - Total length of the routes
 * @param {Object} featureGroup - Feature group containing the routes
 * @param {HTMLElement} infoDiv - HTML element to display route information
 * @param {boolean} isAlternative - Flag to indicate if the routes are alternatives
 */
export function finalizeRoutes(map, totalLength, featureGroup, infoDiv, isAlternative) {
    if (!isAlternative) {
        infoDiv.innerHTML += `<p>Total length: ${totalLength.toFixed(2)} km</p>`;
        if (featureGroup.getLayers().length > 0) {
            map.fitBounds(featureGroup.getBounds()); // Fit bounds after all routes are added
        }
    }
}

/**
 * Determine if a leg should be skipped based on selected alternatives
 * @param {number} index - Index of the current route
 * @param {Array} selectedAlternatives - Array of selected alternative routes
 * @returns {boolean} - True if the leg should be skipped, false otherwise
 */
export function shouldSkipLeg(index, selectedAlternatives) {
    return selectedAlternatives.some(alt => alt.skips && alt.skips.includes(index + 1));
}

/**
 * Display route information in the infoDiv
 * @param {HTMLElement} infoDiv - HTML element to display route information
 * @param {string} prefix - Prefix for route names
 * @param {number} index - Index of the current route
 * @param {number} distance - Distance of the current route
 * @param {Object} route - Route configuration
 * @param {Object} globalConfig - Global configurations for the trip
 */
export function displayRouteInfo(infoDiv, prefix, index, distance, route, globalConfig) {
    infoDiv.innerHTML += `<p>${prefix} ${index + 1}: ${distance.toFixed(2)} km</p>`;
    const speed = globalConfig.speed || 3;
    const mealPlan = route.mealPlan || { breakfast: true, lunch: true, dinner: true, snacks: true };
    const mealPlanDetails = calculateMealPlan(distance, speed, mealPlan);
    infoDiv.innerHTML += `<p>Meal Plan for ${prefix} ${index + 1}: ${mealPlanDetails}</p>`;
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

/**
 * Bind a popup to each layer of the GPX route
 * @param {Object} gpx - The loaded GPX layer
 * @param {string} prefix - Prefix for route names
 * @param {number} index - Index of the current route
 * @param {number} distance - Distance of the current route
 */
export function bindPopupToLayer(gpx, prefix, index, distance) {
    gpx.eachLayer(layer => {
        layer.bindPopup(`${prefix} ${index + 1}: ${distance.toFixed(2)} km`);
    });
}
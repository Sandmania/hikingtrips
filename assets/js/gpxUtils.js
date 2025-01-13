/**
 * Load GPX file and add to map
 * @param {Object} routeConfig - Configuration for the route
 * @param {boolean} showIcons - Flag to show or hide icons
 * @param {Object} featureGroup - Feature group to add the route to
 * @param {Object} defaultOptions - Default options for the route
 * @param {Function} callback - Callback function to execute after loading
 */
export function loadGPX(routeConfig, showIcons, featureGroup, defaultOptions, callback) {
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

/**
 * Get marker options for GPX route
 * @param {Object} routeConfig - Configuration for the route
 * @param {boolean} showIcons - Flag to show or hide icons
 * @returns {Object} Marker options
 */
export function getMarkerOptions(routeConfig, showIcons) {
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
export function getPolylineOptions(routeConfig, defaultOptions) {
    return {
        color: routeConfig.color || defaultOptions.color,
        opacity: routeConfig.opacity || defaultOptions.opacity,
        weight: routeConfig.weight || defaultOptions.weight,
        dashArray: routeConfig.dashArray || defaultOptions.dashArray || null
    };
}
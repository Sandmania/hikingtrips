import { loadYAMLConfig, clearConfigCache } from './config.js';
import { initMap, destroyMap } from './map.js';
import { renderTripCalendar } from '../components/calendar/calendar.js';
import '../components/calendar/calendar.js'; // Ensure web component is registered

let currentController = null;

export async function initTrip() {
    console.log("init")

    if (currentController) currentController.abort();
    currentController = new AbortController();
    const { signal } = currentController;

    destroyMap();
    clearConfigCache();
    document.dispatchEvent(new CustomEvent('trip-cleanup'));

    const tripId = window.location.hash.slice(1);
    if (!tripId) {
        return;
    }

    const configUrl = `${tripId}/trip_config.yaml`;

    try {
        const config = await loadYAMLConfig(configUrl, signal);
        if (signal.aborted) return;

        resolveRelativePaths(config, tripId);

        // Set the page title from the configuration
        document.title = config?.heading ?? document.title;

        initMap(config);

        initializeLegAlternatives(config);
        initializePackDetails(config, signal);
        initializeMealPlan(config, signal);

        if (config?.travel_info) {
            renderTripCalendar(config.travel_info);
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        throw err;
    }
}

function initializeLegAlternatives(config) {
    const legAlternatives = document.querySelector('leg-alternatives');
    if(!legAlternatives) {
        console.log("Leg Alternatives web component not available. Selecting alternatives is disabled.")
        return;
    }
    legAlternatives.trip = config.trip;
}

function initializePackDetails(config, signal) {
    const packDetails = document.querySelector('tt-pack-details');
    if(!packDetails) {
        console.log("Pack details web component not available.")
        return;
    }
    if (!config?.packDetails?.csvUrl) {
        packDetails.csvUrl = null;
        return;
    }
    packDetails.loadCsv(config.packDetails.csvUrl, signal);
}

function initializeMealPlan(config, signal) {
    const mealPlan = document.querySelector('tt-meal-plan');
    if(!mealPlan) {
        console.log("Meal plan web component not available.")
        return;
    }
    if (!config?.mealPlan?.csvUrl) {
        mealPlan.csvUrl = null;
        return;
    }
    mealPlan.loadCsv(config.mealPlan.csvUrl, signal);
}

function resolveRelativePaths(config, tripId) {
    function resolvePath(path) {
        if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path;
        if (path.startsWith('../')) return path.slice(3); // ../assets/images/x.svg → assets/images/x.svg
        return `${tripId}/${path}`; // planned_route/x.gpx → muotka2025/planned_route/x.gpx
    }

    function resolveRouteArray(routes) {
        if (!Array.isArray(routes)) return;
        routes.forEach(leg => {
            if (leg.gpx) leg.gpx = resolvePath(leg.gpx);
            if (leg.startIcon) leg.startIcon = resolvePath(leg.startIcon);
            if (leg.endIcon) leg.endIcon = resolvePath(leg.endIcon);
            if (Array.isArray(leg.alternatives)) resolveRouteArray(leg.alternatives);
        });
    }

    ['trip', 'alternatives', 'evacuation', 'zero'].forEach(key => {
        const defaults = config?.defaults?.[key];
        if (defaults?.startIcon) defaults.startIcon = resolvePath(defaults.startIcon);
        if (defaults?.endIcon) defaults.endIcon = resolvePath(defaults.endIcon);
    });

    resolveRouteArray(config.trip);
    resolveRouteArray(config.evacuation);

    if (config.actualRoute?.gpx) config.actualRoute.gpx = resolvePath(config.actualRoute.gpx);
    if (config.photo_info?.galleryUrl) config.photo_info.galleryUrl = resolvePath(config.photo_info.galleryUrl);
    if (config.packDetails?.csvUrl) config.packDetails.csvUrl = resolvePath(config.packDetails.csvUrl);
    if (config.mealPlan?.csvUrl) config.mealPlan.csvUrl = resolvePath(config.mealPlan.csvUrl);
}
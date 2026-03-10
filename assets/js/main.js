import { loadYAMLConfig, clearConfigCache } from './config.js';
import { showError } from './error.js';
import { initMap, destroyMap } from './map.js';
import { renderTripCalendar } from '../components/calendar/calendar.js';
import '../components/calendar/calendar.js'; // Ensure web component is registered

let currentController = null;

async function init() {
    console.log("init")

    if (currentController) currentController.abort();
    currentController = new AbortController();
    const { signal } = currentController;

    destroyMap();
    clearConfigCache();

    const tripId = window.location.hash.slice(1);
    if (!tripId) {
        showError(new Error('No trip specified. Add a trip ID to the URL hash (e.g., trip.html#muotka2025).'));
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
        initializePackDetails(config);

        if (config?.travel_info) {
            renderTripCalendar(config.travel_info);
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to initialize page:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', init);

function initializeLegAlternatives(config) {
    const legAlternatives = document.querySelector('leg-alternatives');
    if(!legAlternatives) {
        console.log("Leg Alternatives web component not available. Selecting alternatives is disabled.")
        return;
    }
    legAlternatives.trip = config.trip;
}

function initializePackDetails(config) {
    if (!config?.packDetails?.csvUrl) {
        console.log("No pack details CSV URL configured.");
        return;
    }
    const packDetails = document.querySelector('tt-pack-details');
    if(!packDetails) {
        console.log("Pack details web component not available.")
        return;
    }
    packDetails.csvUrl = config.packDetails.csvUrl;
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
}
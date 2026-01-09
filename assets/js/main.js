import { loadYAMLConfig } from './config.js';
import { initMap } from './map.js';
import { renderTripCalendar } from './calendar.js';

const configurationFileName = 'trip_config.yaml';

async function init() {
    console.log("init")
    try {
        const config = await loadYAMLConfig(configurationFileName);
        
        // Set the page title from the configuration
        document.title = config?.heading ?? document.title;

        initMap(config);

        initializeLegAlternatives(config);
        initializePackDetails(config);

        if (config?.travel_info) {
            renderTripCalendar(config.travel_info);
        }
    } catch (err) {
        console.error('Failed to initialize page:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);

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
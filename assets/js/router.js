import { renderTripCards } from './index.js';
import { initTrip } from './main.js';
import { showError } from './error.js';

const indexView = document.getElementById('index-view');
const tripView = document.getElementById('trip-view');

async function route() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        indexView.style.display = 'none';
        tripView.style.display = 'flex';
        try {
            await initTrip();
        } catch (err) {
            window.location.hash = '';
            showError(new Error(`Trip "${hash}" not found.`));
        }
    } else {
        tripView.style.display = 'none';
        indexView.style.display = 'block';
        renderTripCards();
    }
}

document.addEventListener('DOMContentLoaded', route);
window.addEventListener('hashchange', route);

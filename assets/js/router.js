import { initTrip } from './main.js';
import { showError } from './error.js';

const indexView = document.getElementById('index-view');
const tripView = document.querySelector('trip-view');

async function route() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        indexView.style.display = 'none';
        try {
            await tripView.show();
        } catch (err) {
            window.location.hash = '';
            indexView.style.display = 'block';
            const error = err instanceof Error ? err : new Error(String(err));
            showError(error);
            return;
        }
        try {
            await initTrip();
        } catch (err) {
            window.location.hash = '';
            showError(new Error(`Trip "${hash}" not found.`));
        }
    } else {
        tripView.hide();
        indexView.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', route);
window.addEventListener('hashchange', route);

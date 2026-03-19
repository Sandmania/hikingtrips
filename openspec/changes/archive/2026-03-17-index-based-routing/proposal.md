## Why

The current setup requires two HTML files (`index.html` for the trip listing, `trip.html` for individual trips), producing awkward URLs like `/hikes/trip.html#muotka2025`. Consolidating into a single `index.html` entry point gives cleaner URLs (`/hikes/#muotka2025`) and a simpler mental model: one file, hash determines the view.

## What Changes

- `index.html` becomes the single entry point for both the trip listing and individual trip views
- A new `assets/js/router.js` module handles view switching based on `window.location.hash`
- `assets/js/index.js` is refactored into an ES module so the router can import its card-rendering logic
- All CDN dependencies (Leaflet, Mapbox GL, leaflet-elevation, js-yaml) move into `index.html`
- Trip card URLs updated from `trip.html#<tripId>` to `#<tripId>`
- **BREAKING**: `trip.html` is deleted; any existing bookmarks to `trip.html#...` will break

## Capabilities

### New Capabilities
- `index-based-routing`: Single `index.html` entry point that renders the trip listing when no hash is present, or the trip map/detail view when a hash is present; `router.js` coordinates view switching on load and `hashchange`

### Modified Capabilities
- `hash-routing`: The routing requirement changes — trips are now resolved from `index.html#<tripId>` rather than `trip.html#<tripId>`, and the no-hash state shows the trip listing instead of an error

## Impact

- `index.html` — rewritten to include all deps and both view containers
- `trip.html` — deleted
- `assets/js/router.js` — new file
- `assets/js/index.js` — refactored to ES module with exported `renderTripCards()`
- `assets/js/main.js` — entry point changes from `DOMContentLoaded` listener to exported `initTrip()` function called by router

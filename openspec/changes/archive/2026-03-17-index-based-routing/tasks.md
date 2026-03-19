## 1. Refactor JS entry points

- [x] 1.1 Convert `assets/js/index.js` to an ES module — export a `renderTripCards()` function containing the current card-rendering logic
- [x] 1.2 Update trip URLs in `index.js` from `trip.html#<tripId>` to `#<tripId>`
- [x] 1.3 Export `initTrip()` from `assets/js/main.js` (rename current `init()`) and remove its own `DOMContentLoaded` and `hashchange` event listeners

## 2. Create router.js

- [x] 2.1 Create `assets/js/router.js` as an ES module that imports `renderTripCards` from `index.js` and `initTrip` from `main.js`
- [x] 2.2 Implement view switching logic: show `#index-view` / hide `#trip-view` when no hash; show `#trip-view` / hide `#index-view` when hash is present
- [x] 2.3 Add `DOMContentLoaded` and `hashchange` listeners in `router.js` that call the appropriate function based on `window.location.hash`

## 3. Merge index.html and trip.html

- [x] 3.1 Add all CDN `<script>` and `<link>` tags from `trip.html` into `index.html` `<head>` (Leaflet, Mapbox GL, leaflet-elevation, js-yaml, web components)
- [x] 3.2 Add both stylesheet links (`index.css`, `main.css`, `info.css`) to `index.html` `<head>`
- [x] 3.3 Wrap the current `<div id="trips-grid">` in a `<div id="index-view">` container
- [x] 3.4 Add a `<div id="trip-view">` container to `index.html` `<body>` containing all elements from `trip.html`'s `<div id="content">` (map, elevation, calendar, pack-container, errorToast, trip-info, pack-details)
- [x] 3.5 Replace the `<script src="assets/js/index.js">` tag with `<script type="module" src="assets/js/router.js">`

## 4. Cleanup and verification

- [x] 4.1 Delete `trip.html`
- [ ] 4.2 Verify root `/` shows the trip cards listing
- [ ] 4.3 Verify `/#muotka2025` (or any valid tripId) loads the correct trip map and details
- [ ] 4.4 Verify browser back button from a trip returns to the cards listing
- [ ] 4.5 Verify direct navigation to `/#muotka2025` (simulating a bookmarked URL) works correctly


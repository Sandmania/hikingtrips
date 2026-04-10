## 1. Data

- [x] 1.1 Create `trips.json` at project root with all 5 existing trips (id, name, dates, image)
- [x] 1.2 Create `scripts/generate-trips-manifest.js` deploy script that reads each trip folder's `trip_config.yaml` and writes `trips.json`

## 2. TripCard Component

- [x] 2.1 Create `assets/components/tripCard/TripCard.js` with shadow DOM, `.trip` property setter, and card markup (bg image, overlay, title, dates, link)
- [x] 2.2 Derive card link URL from `id` as `#<id>` inside the component
- [x] 2.3 Add encapsulated styles inside `TripCard.js` (card, overlay, title, dates, hover effects — migrated from `index.css`)

## 3. TripGrid Component

- [x] 3.1 Create `assets/components/tripGrid/TripGrid.js` with shadow DOM and `connectedCallback` that fetches `trips.json`
- [x] 3.2 On successful fetch, create and append one `<trip-card>` per entry with `.trip` property set
- [x] 3.3 Handle fetch errors gracefully (log to console, render empty grid)
- [x] 3.4 Add encapsulated grid layout styles inside `TripGrid.js` (responsive 2-column grid — migrated from `index.css`)

## 4. Wiring

- [x] 4.1 Add `<script>` tags for `TripCard.js` and `TripGrid.js` in `index.html`
- [x] 4.2 Replace `<div id="trips-grid">` in `index.html` with `<trip-grid>`
- [x] 4.3 Remove `renderTripCards` import and call from `assets/js/router.js`
- [x] 4.4 Remove `renderTripCards()` function and hardcoded trips array from `assets/js/index.js` (delete file if nothing else remains)
- [x] 4.5 Remove card and grid CSS rules from `assets/css/index.css` (keep body background style)

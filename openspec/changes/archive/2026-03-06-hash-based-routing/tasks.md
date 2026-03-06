## 1. Create trip.html

- [x] 1.1 Copy `muotka2025/index.html` to `trip.html` at the repository root
- [x] 1.2 Update all asset paths in `trip.html` to be root-relative (remove `../` prefixes from CSS, JS, and component script references)
- [x] 1.3 Remove the `<base target="_top">` tag (no longer needed at root level)

## 2. Update main.js for hash-based config loading

- [x] 2.1 Modify `assets/js/main.js` to read `window.location.hash` and strip the leading `#` to get the trip ID
- [x] 2.2 Derive the config URL as `<tripId>/trip_config.yaml` and pass it to `loadYAMLConfig()`
- [x] 2.3 Add a guard: if hash is empty or missing, display a user-visible error (use existing error toast or `console.error`) without attempting a fetch

## 3. Update trip listing links

- [x] 3.1 Update each trip entry in `assets/js/index.js` to use `trip.html#<tripId>` format instead of `<tripId>/index.html`

## 4. Remove per-trip index.html files

- [x] 4.1 Delete `muotka2025/index.html`
- [x] 4.2 Delete `paistunturi2024/index.html`
- [x] 4.3 Delete `repovesi2023/index.html`
- [x] 4.4 Delete `sarek2025/index.html`
- [x] 4.5 Delete `moskangaisi2026/index.html`

## 5. Verify

- [ ] 5.1 Load `trip.html#muotka2025` locally and confirm the map, calendar, and other components initialize correctly
- [ ] 5.2 Load `trip.html` with no hash and confirm a meaningful error is shown
- [ ] 5.3 Load `trip.html#nonexistent` and confirm the error toast appears
- [ ] 5.4 Load `index.html` and confirm trip cards link to `trip.html#<tripId>` URLs

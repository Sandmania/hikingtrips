## Why

Each trip currently requires its own `index.html` file that is nearly identical across all trips — the only differences are relative asset paths. Hash-based routing would allow a single `index.html` at the root to serve all trip views, using the URL hash (e.g., `#muotka2025`) to determine which trip config to load, eliminating duplication and making it trivial to add new trips.

## What Changes

- A single `trip.html` (or reuse root `index.html`) at the root level replaces all per-trip `index.html` files
- The hash in the URL (e.g., `index.html#muotka2025`) identifies which trip directory to load `trip_config.yaml` from
- `main.js` reads `window.location.hash` to derive the config path instead of assuming a relative `trip_config.yaml`
- Asset paths in the shared HTML (CSS, JS, components) become root-relative, removing the need for `../` prefixes
- The trip listing in `index.js` updates URLs to use hash-based links (e.g., `trip.html#muotka2025`)
- Per-trip `index.html` files are removed

## Capabilities

### New Capabilities
- `hash-routing`: URL hash-based trip selection — reading the hash to resolve and load the correct trip config, handling missing/invalid hashes gracefully

### Modified Capabilities
- (none — no existing specs to update)

## Impact

- **Removed**: `muotka2025/index.html`, `paistunturi2024/index.html`, `repovesi2023/index.html`, `sarek2025/index.html`, `moskangaisi2026/index.html`
- **Modified**: `assets/js/main.js` — config loading derives path from hash; `assets/js/index.js` — trip URLs updated to hash format
- **Added**: `trip.html` at root (or repurposed `index.html` split into listing vs trip view)
- **No new dependencies** — pure browser APIs (`window.location.hash`, `hashchange` event)

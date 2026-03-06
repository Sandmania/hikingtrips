## Context

The app currently has one `index.html` per trip (e.g., `muotka2025/index.html`). Each file is ~58 lines of near-identical boilerplate — same CDN scripts, same component registrations, same layout — differing only in `../` relative paths. Adding a new trip means copying and editing this file. Hash-based routing eliminates this by using a single HTML entry point and encoding the trip identifier in the URL fragment.

Current flow: `muotka2025/index.html` → loads `trip_config.yaml` (same-directory relative URL)
Target flow: `trip.html#muotka2025` → derives `muotka2025/trip_config.yaml` from hash → loads config

## Goals / Non-Goals

**Goals:**
- Single shared `trip.html` replaces all per-trip `index.html` files
- Hash fragment identifies trip directory (e.g., `#muotka2025`)
- Config path resolved as `<hash>/trip_config.yaml`
- Trip listing links updated to use hash-based URLs
- Graceful error when hash is missing or config not found

**Non-Goals:**
- Server-side routing or history API (`pushState`) — hash-only to keep it static-file-friendly
- Supporting multiple config file names per trip
- Backward compatibility with old per-trip `index.html` URLs (they're deleted)
- Gallery pages (`gallery.html`, `travel_info.html`) — not in scope

## Decisions

### D1: Use `window.location.hash` rather than query params or path segments
Hash fragments work on any static file server (GitHub Pages, local `file://`) without server configuration. Query params also work but are less conventional for SPA-style navigation. Path segments require server rewrite rules.

**Alternatives**: `?trip=muotka2025` (query param) — workable but hash is more idiomatic for client-side routing on static sites.

### D2: New `trip.html` at root rather than repurposing `index.html`
`index.html` is the trip listing page. Keeping them separate avoids conditional logic in one file ("is there a hash? show trip; otherwise show listing"). Clean separation of concerns.

**Alternative**: Single `index.html` that renders listing when no hash and trip view when hash is present. Adds complexity with no real benefit.

### D3: Config path derived as `${hash}/trip_config.yaml`
The hash value is the trip directory name (e.g., `muotka2025`). This is the simplest mapping — no lookup table needed, no registry to update when adding trips.

**Alternative**: Maintain a trips registry mapping hash keys to config paths. More flexible but unnecessary complexity for this use case.

### D4: Asset paths in `trip.html` are root-relative
Since `trip.html` lives at the root, paths like `/assets/js/main.js` or `assets/js/main.js` (root-relative) work correctly without `../` adjustments. This also means all component scripts use consistent paths.

## Risks / Trade-offs

- **Broken bookmarks to old per-trip URLs** → Mitigation: The old `<trip>/index.html` files are deleted; users with old bookmarks get a 404 (acceptable for a personal site)
- **Hash stripping by some link sharing tools** → Low risk; this is a personal archive site not dependent on social sharing
- **`main.js` config path derivation is implicit** → If a trip directory doesn't match the hash exactly, a fetch 404 occurs. Mitigation: clear error handling already exists in `main.js`'s try/catch

## Migration Plan

1. Create `trip.html` at root (copy from any per-trip `index.html`, fix asset paths to root-relative)
2. Update `assets/js/main.js` to derive config URL from `window.location.hash`
3. Update `assets/js/index.js` trip URLs to `trip.html#<trip-id>`
4. Delete all per-trip `index.html` files
5. Test locally: `trip.html#muotka2025`, `trip.html#repovesi2023`, `trip.html` (no hash — should show error)

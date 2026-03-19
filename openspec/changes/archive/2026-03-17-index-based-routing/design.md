## Context

The site currently has two HTML entry points: `index.html` (trip listing) and `trip.html` (trip map/detail view). The previous hash-routing change made `trip.html` hash-driven, but the two-file structure still produces URLs like `/trip.html#muotka2025`. This change merges everything into `index.html`, using the hash alone to determine which view to render.

## Goals / Non-Goals

**Goals:**
- Single HTML file serves both the trip listing and individual trip views
- Clean URLs: `/` for listing, `/#<tripId>` for trips
- Browser back/forward works naturally via hash history
- No change to the trip loading logic in `main.js` beyond its entry point

**Non-Goals:**
- Lazy-loading CDN dependencies (Option B) — deferred for now
- Server-side routing or redirects
- Migrating `trip.html#...` bookmarks (breaking change, acceptable)

## Decisions

### New `router.js` as the single entry point

**Decision**: Add `assets/js/router.js` as a module script in `index.html`. It imports from both `index.js` and `main.js`, listens for `hashchange`, and delegates to the right view.

**Rationale**: Keeps `main.js` and `index.js` focused on their own concerns. The router is a thin coordinator — it owns the show/hide logic and nothing else. Alternatives considered:
- Extending `main.js` to handle the no-hash case — would mix trip logic with card-rendering concerns
- Extending `index.js` — same problem in reverse; also `index.js` is currently not a module

### Refactor `index.js` into an ES module

**Decision**: Convert `index.js` to export a `renderTripCards()` function and update trip URLs from `trip.html#<tripId>` to `#<tripId>`.

**Rationale**: `router.js` needs to import from it. Making it a module also aligns it with the rest of the codebase (`main.js` is already a module).

### Export `initTrip()` from `main.js`, remove its own `DOMContentLoaded` listener

**Decision**: `main.js` exports `initTrip()` (the current `init()` function). The `DOMContentLoaded` and `hashchange` listeners move to `router.js`.

**Rationale**: `router.js` owns the event lifecycle. `main.js` should be a pure function the router calls, not an autonomous script.

### View switching via CSS show/hide on wrapper divs

**Decision**: `index.html` has two wrapper divs — `#index-view` (cards) and `#trip-view` (map/detail). `router.js` toggles `display: none` / `display: block` (or a CSS class) on each.

**Rationale**: Simple and reliable. No DOM creation/destruction on each navigation, which matters since Leaflet attaches to a DOM element.

### All CDN deps in `index.html`

**Decision**: Move Leaflet, Mapbox GL, leaflet-elevation, and js-yaml `<script>`/`<link>` tags from `trip.html` into `index.html`.

**Rationale**: Option A approach — load everything upfront. Acceptable for a personal site where the listing page is rarely a cold start without a specific trip in mind.

## Risks / Trade-offs

- **Leaflet map div must exist in DOM before `initTrip()` runs** → `#map` lives inside `#trip-view` which is always in the DOM (just hidden), so this is safe
- **CSS conflicts between index and trip stylesheets** → Both `index.css` and `main.css`/`info.css` are loaded together. Low risk since they target distinct element IDs, but worth a visual check after implementation
- **Landing page loads ~500kb of map deps even when just browsing cards** → Known trade-off of Option A; acceptable for now

## Migration Plan

1. Merge HTML files, add `router.js`
2. Verify locally with both direct `/#tripId` and root `/` navigation
3. Delete `trip.html`
4. No server configuration needed — purely client-side

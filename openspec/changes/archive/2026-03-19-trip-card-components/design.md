## Context

The trip index currently renders cards via `renderTripCards()` in `assets/js/index.js`, called imperatively from `router.js`. Trip data is hardcoded in that file as a JS array. This is inconsistent with the web component pattern used for `TripInfo`, `PackDetails`, `LegAlternatives`, and others, and makes trip metadata hard to maintain separately from code.

The site is a static app hosted on S3, which means no directory listing — a manifest file is required to enumerate trips regardless of approach.

## Goals / Non-Goals

**Goals:**
- Replace `renderTripCards()` with a self-driving `<trip-grid>` custom element
- Introduce `<trip-card>` as a self-contained card organism with encapsulated styles
- Source trip data from `trips.json` (auto-generated at deploy time)
- Remove the imperative `renderTripCards()` call from `router.js`
- Maintain visual parity with the current card design

**Non-Goals:**
- Changing the visual design of the cards
- Making the cards editable or dynamic at runtime
- Changing how individual trip pages load or route

## Decisions

### `<trip-grid>` is self-driving

`<trip-grid>` fetches `trips.json` in its `connectedCallback` rather than accepting a property set from outside. This means `router.js` no longer needs to call anything to initialize the index view — it just shows/hides the view div. The `import { renderTripCards }` in `router.js` is removed entirely.

**Alternatives considered:** Keeping an imperative call in `router.js` (sets data via property). Rejected — the self-driving approach is simpler and consistent with how `TripInfo` drives itself via a `trip-loaded` event.

### Trip data flows as a JS property, not an HTML attribute

`<trip-grid>` passes each trip entry to `<trip-card>` via a `.trip` property setter (plain object), not as individual HTML attributes. Serializing structured data into attributes is awkward and fragile.

### Shadow DOM for both components

Consistent with `TripInfo`, `PackDetails`, and `LegAlternatives`. Card and grid styles are encapsulated inside the components — the relevant rules migrate out of `index.css`.

### `trips.json` lives at the project root

Consistent with how trip configs are accessed — paths in `trips.json` are relative to the root (same as `trip_config.yaml` paths). The deploy script reads each trip's `trip_config.yaml` for `heading`, dates, and hero image.

### URL derived from `id` at render time

`<trip-card>` constructs the hash URL as `#<id>` — no need to store it in `trips.json`. Reduces the data to maintain.

## Risks / Trade-offs

- **Fetch on every index view load** → `trips.json` is tiny and cacheable; not a meaningful concern for this scale.
- **`trips.json` out of sync with actual trip folders** → Mitigated by the deploy script; adding a trip manually requires updating both.
- **Shadow DOM CSS path for linked stylesheets** → Both components inline their styles via a `<style>` tag in shadow DOM (or a `<link>` with a root-relative path), consistent with existing components.

## Migration Plan

1. Add `trips.json` to project root
2. Implement `<trip-card>` and `<trip-grid>` components
3. Update `index.html`: replace `<div id="trips-grid">` with `<trip-grid>`, add script tags
4. Remove `renderTripCards()` from `index.js` (or the whole file if nothing else remains)
5. Remove `renderTripCards` import and call from `router.js`
6. Migrate card/grid CSS out of `index.css` into components; leave body styles in place
7. Add deploy script at `scripts/generate-trips-manifest.js`

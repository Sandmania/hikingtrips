# Share leaflet-elevation's d3 rather than adding our own charting dependency

The conditions timeline needs scales and axes, and this repo has deliberately shipped no charting library (`MacroChart` is a CSS `conic-gradient`). But `@raruto/leaflet-elevation` 2.5.1 already pulls `https://unpkg.com/d3@7.8.4/dist/d3.min.js` into every trip page that has an actual route — which is exactly the set of pages that can show a timeline at all, since the **Trip Window** is derived from the track. We therefore draw the timeline with d3, obtaining it the same way the library does: `if (typeof d3 !== "object") await loadScript(<that same unpkg URL>)`.

## Considered options

- **Hand-rolled inline SVG** (~200–250 lines). No dependency, closest to the repo's ethos — rejected because d3 is already on the page in every case where the chart exists, so the hand-rolling buys nothing but code to maintain.
- **A separate d3 or uPlot from our own CDN URL.** `loadScript` dedupes by URL, and we don't control leaflet-elevation's URL, so a different URL means a genuine second copy.
- **Blindly awaiting `window.d3`.** Rejected: `import(this.__D3)` fires asynchronously when the elevation control adds data, so a visitor who opens the timeline early loses the race.

## Consequences

- leaflet-elevation guards its own load with `"object" != typeof d3`, so whoever loads first wins and there is never a second copy — the sharing works in both directions.
- We are exposed to leaflet-elevation changing or bundling its d3 version. Mitigated by using only APIs stable since d3 4: `scaleTime`, `scaleLinear`, `line`, `area`, `axisBottom`/`axisLeft`. If that library ever bundles d3 instead of exposing the global, our guard simply loads our own copy and nothing breaks.
- This is not a general licence to build on other libraries' internals; the `d3` global is a documented UMD export, not private state.

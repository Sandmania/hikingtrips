# 0001 — Weather Timeline: temperature line end to end

- **Type**: HITL
- **Status**: awaiting review
- **Blocked by**: none — can start immediately

## What to build

The first complete path from config to pixels for the **Weather Timeline**: a trip that declares a Sensor Log CSV and an actual route gains a map control button which toggles a full-width chart block below the elevation profile, showing trip temperature against time.

Scope covers every layer once, narrowly:

- A `weather:` key in `trip_config.yaml` carrying `csvUrl` and `timezone` (IANA, e.g. `Europe/Helsinki`), with `csvUrl` path-resolved alongside the existing `packDetails` and `mealPlan` keys. Trips without the key degrade silently.
- A Leaflet control following the `mealPlanControl` pattern, dispatching `toggle-weather-timeline` on the document. Its `canAdd()` requires **both** a configured `csvUrl` and an actual route — see ADR-0002, the Trip Window comes from the track, so there is no chart without one.
- A `<tt-weather-timeline>` component rendered as a full-width block (like the elevation profile, not like the floating meal plan card), hidden until toggled, fetching its data on first open rather than at page load.
- Sensor Log parsing: locate the header row by content rather than position, skip the units row, keep only rows whose Data Type is `point`, and sort ascending (the export is in descending time order). `tools/TrailTreader/tools/mergeSensorGpx.py` is a tested reference for these quirks.
- Timestamps in the CSV are naive local wall times with no offset stated. Convert them to instants using the configured IANA zone via `Intl`, never via the viewer's own timezone.
- Trip Window derivation: first and last trackpoint times of the actual route GPX (which are UTC), used to trim the Exposure Record.
- d3 acquired per ADR-0001: use the global if present, otherwise load the same URL leaflet-elevation uses. Restrict usage to APIs stable since d3 4.
- One temperature line, a time axis in trip-local time, a °C axis, responsive via `viewBox`.
- Failures surface through `showError`.

HITL: this slice fixes the chart's margins, tick density and aspect ratio, which every later slice inherits. Have a human look at it before building on it.

## Acceptance criteria

- [x] A trip with `weather.csvUrl` and an actual route shows the control button; a trip missing either shows no button and logs no error
- [x] Clicking the button toggles the block; the CSV and GPX are fetched on first open only
- [x] The plotted series is trimmed to the Trip Window — 295 samples for muotka2025, with nothing from the pre-trip indoor stretch and no 39.7 °C spike on the axis
- [x] Times render identically regardless of the viewer's own timezone
- [x] The chart works whether the elevation profile has loaded d3 first or not
- [x] Fixture tests cover Sensor Log parsing, wall-time→instant conversion, and Trip Window trimming, registered in the test index page

## Review notes

The margins, tick density and aspect ratio a human is asked to sign off on live in
`VIEW` and `MARGIN` at the top of `WeatherTimeline.js`: a 960×260 viewBox
(≈3.7:1), 46 px left gutter for the `n °C` labels, daily ticks on the time axis
(`.ticks(8)`, which d3 resolves to one per day over a six-day trip).

The direct-sun caption overlaps issue 0004, which owns the footnote proper. It is
here because this slice already puts the 30.5 °C peak on screen and CONTEXT.md
resolves that the chart must not present its maximum as an air temperature; 0004
should replace it with the `†`-marked version tied to the warmest tile.

## Blocked by

None - can start immediately

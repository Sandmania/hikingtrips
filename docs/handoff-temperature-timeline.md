# Handoff: whole-trip temperature timeline

Written 2026-08-13. Audience: a fresh agent session with no memory of the work that produced this.

## The task

Build a chart showing the **complete** temperature record of the muotka2025 trip — all nine days, nights included — as a view separate from the existing elevation profile.

## Why it has to be separate

The elevation profile now carries temperature (`gpxtpx:atemp` on every trackpoint, `temperature: true` in `public/assets/components/elevationProfile/ElevationProfile.js:36`). That chart plots against **distance**, so it can only show values at trackpoints — and the watch only ran while walking.

Of 436 readings in the log, **86** fall inside a walking window. The other 350 — every evening, every night, the whole of the pre-trip approach — have no trackpoint to attach to and cannot appear on that chart at any price:

| night of | coldest that night | coldest while walking that day |
|---|---|---|
| 07-06 01:00 | **3.1 °C** | 12.2 °C |
| 07-05 04:00 | 5.0 °C | 8.9 °C |
| 07-07 05:00 | 5.0 °C | 8.6 °C |
| 07-09 04:00 | 5.3 °C | 10.7 °C |
| 07-08 02:00 | 5.9 °C | 9.3 °C |

The elevation chart's Min Temp tile reads 9 °C. The trip's actual low was 3.1 °C. Both are correct; they answer different questions. **Do not try to fix this by changing the elevation chart** — it is behaving correctly and the data it needs is not expressible against a distance axis.

## The data

`public/muotka2025/SandWeather_Jul_10,_2025___17_00_00.csv` (note the comma and spaces in the filename — quote it in shell). Export from a Kestrel DROP 2 carried on the outside of the pack.

Shape:

```
"Device Name","SandWeather"                        <- 3 device rows
"Device Model","Kestrel DROP 2"
"Serial Number","2224283"
"FORMATTED DATE_TIME","Temperature","Relative Humidity","Heat Index","Dew Point","Data Type",...
"YYYY-MM-DD HH:MM:SS","°C","%","°C","°C"           <- units row
"2025-07-10 05:00:00 PM","21.1","53.2","20.7","11.2","point"
...                                                 <- DESCENDING time order
                                                    <- trailing blank line
```

Facts established by measurement, not assumption:

- **436 usable samples**, 30-minute cadence, no gap wider than 30 min anywhere in the file.
- Timestamps are **local time with no offset stated**. Europe/Helsinki, so UTC+3 in July. The last row (17:00) matches the export time in the filename, which is what pins it to local.
- Log window: `2025-07-01 15:30` → `2025-07-10 17:00` local.
- Track window (for reference): `2025-07-04 11:09` → `2025-07-10 14:56` local.
- Real trip range: **3.1 °C** (07-06 01:00) to **30.5 °C** (07-10 12:30).

Two things that will bite whoever plots this:

1. **The first ~2.5 days are not the hike.** From 07-01 15:30 until roughly 07-04 09:30 local the logger sat indoors or in transit: a flat ~24 °C right through two nights, and a 39.7 °C spike at 07-01 17:00. On the route chart this was invisible (no trackpoints there). On a timeline it is 141 samples of nonsense at the left edge. Decide deliberately whether to trim to the track window, trim to a `--from` argument, or plot it with an annotation.
2. **Direct sun on the sensor.** The 30.5 °C at 07-10 12:30 and 27.1 °C at 14:30, against ~21 °C either side, are the pack in sunshine — not shade air temperature. Worth a caption; definitely worth not describing the trip as having hit 30 °C without qualification.

## What already exists

- `tools/TrailTreader/tools/mergeSensorGpx.py` — merges this CSV into GPX trackpoints. **The timeline does not need it**; read the CSV directly. But its CSV parsing is a tested reference for the format quirks above (header located by content not position, units-row detection, `Data Type == "point"` filtering, descending-order sort, tz handling). 28 unit tests in `tools/TrailTreader/tools/test_mergeSensorGpx.py`.
- `public/muotka2025/actual_route/combined.gpx` — one `<trk>` holding 7 `<trkseg>` (one per day), 2128 trackpoints, each carrying `<gpxtpx:atemp>`. Useful if you want to shade walking windows on the timeline: the trkpt `<time>` values give you exact start/end per day. (Corrected while implementing issue 0003, which was written from this line's earlier claim of "7 `<trk>` elements". The seven days are real; the element is `<trkseg>`.)

## Repo conventions you must follow

No build step, no bundler, no npm, no framework. ES modules served straight out of `public/`. Everything below is the existing pattern — follow it rather than inventing a new one.

**Component**: `public/assets/components/<name>/<Name>.js` + `<Name>.css`. Shadow DOM, stylesheet linked *inside* `shadowRoot.innerHTML` with a path relative to the page (`assets/components/...`), not to the component file. See `public/assets/components/mealPlan/MealPlan.js:1-15`. Register with `customElements.define('tt-...')` and place the tag in `public/index.html` inside `<trip-view>` (see lines 29-38).

**Toggling a panel**: a Leaflet control button in `public/assets/js/leaflet/<name>Control.js` that dispatches a `CustomEvent` on `document`; the component listens for it. `mealPlanControl.js` is 33 lines and is the whole pattern — copy it. Note `canAdd()` returning `!!config.csvUrl`, which is how trips lacking the data show no button. Register the control in `initMap()` at `public/assets/js/map.js:120-124`.

**Config**: add a key to `public/muotka2025/trip_config.yaml` (e.g. `weather: { csvUrl: SandWeather_Jul_10,_2025___17_00_00.csv }`) and resolve its path in `resolveConfigPaths` at `public/assets/js/main.js:111-114`, next to the `packDetails` and `mealPlan` lines. Trips without the key must degrade silently.

**Charts**: there is **no chart library in this codebase**. `MacroChart.js` is a donut built from a CSS `conic-gradient`. d3 7.8.4 does get loaded at runtime — but only by leaflet-elevation, only when a trip has an actual route. Do not reach for it implicitly; if you want it, load it explicitly through `loadScript` in `public/assets/js/loadAssets.js` (which dedupes by URL and supports SRI).

**Tests**: `public/tests/*.test.js`, browser mocha + chai + @testing-library/dom pulled from unpkg by `public/tests/index.html`. Fixtures are inline CSV strings — see `mealPlan.test.js:5-25`. Add new test files to the script list in `public/tests/index.html`.

**Errors**: `showError` from `public/assets/js/error.js`, surfaced by the `error-toast` component.

## Decisions to make before writing code

These are genuinely open. Ask the user rather than assuming — they have clear preferences and will tell you.

1. **Where it lives.** Toggled panel with its own Leaflet button (consistent with meal plan / pack details) vs. always-on strip under the elevation profile. Panel is the conventional choice here.
2. **Chart technology.** Hand-rolled inline SVG (~150 lines, no dependency, matches the repo's ethos) vs. d3 vs. a CDN charting library. The repo has resisted dependencies so far.
3. **Which series.** Temperature alone, or temperature plus relative humidity and/or dew point — the CSV carries all of them and `--column` in the merge script already proves they parse. Humidity explains the 07-07 leg (95% RH, 8.6–9.9 °C all day) in a way temperature alone does not.
4. **The pre-trip tail.** Trim, annotate, or plot raw. See gotcha 1 above.
5. **Walking windows.** Shading the hours when the watch was recording would tie the timeline to the route chart and make the "why is the route chart's minimum 9 °C" question answer itself. Data is in `combined.gpx`.
6. **No night shading.** Muotkatunturi is at ~69.3 °N; in early July the sun does not set. Do not add a dusk/dawn band — there isn't one. The 03:00 minima happen in daylight.
7. **Time axis in local time** (UTC+3), matching how the user reads the CSV, not UTC.

## Verifying you got it right

Numbers to check the finished chart against:

```
samples plotted (full log)     436
samples in trip window         295
min                            3.1 °C at 2025-07-06 01:00 local
max                           30.5 °C at 2025-07-10 12:30 local
walking-hours min              8.6 °C at 2025-07-07 13:00 local   <- matches elevation chart
```

Run the existing suite by opening `public/tests/index.html`; nothing there covers the elevation or map path today, so a green run only tells you that you didn't break the meal plan, pack details, calendar, trip card or trip grid components.

## Traps already discovered the hard way

- **togeojson 5.6.2 misindexes per-segment extensions.** `props[name][i] = val` where `i` indexes extensions rather than segments (`dist/togeojson.es.mjs:236-241`). A `<trk>` holding several `<trkseg>`s therefore keeps one segment's sensor values and nulls the rest. Fixed in 7.x, but leaflet-elevation pins 5.6.2 as late as 2.6.0, so **the GPX works around it** by giving each day its own `<trk>`. If you touch `combineGpx.sh` or the elevation path, preserve that. Verified empirically, not guessed.
- leaflet-elevation's summary tiles round to integers (`Math.round`), which is why 8.6 renders as 9.
- Upgrading `@raruto/leaflet-elevation` (2.5.1 → 2.5.2/2.6.0) does **not** change the pinned parser. Checked.
- The user does not want third-party dependencies swapped or shimmed underneath a library. Work with what a library supports, or change our own data.

## Repo state at handoff

`hikingtrips` has these staged but **not committed**: `.gitignore`, `.gitmodules`, the weather CSV, the enriched `combined.gpx`, the `ElevationProfile.js` change, and the `tools/TrailTreader` gitlink at `20c2fdf`.

`tools/TrailTreader` has two commits on `main` (`b0ebb25`, `20c2fdf`) that exist **locally only**. Until they are pushed, a fresh clone of `hikingtrips` cannot check out the submodule. Its remote is SSH (`git@github.com:Sandmania/TrailTreader.git`).

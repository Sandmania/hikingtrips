# 0006 — Map marker follows the Weather Timeline hover, holding at Camp

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0003, 0005

## What to build

Hovering the timeline shows where the hiker was at that moment. Inside a **Walking Window** the marker sits at the trackpoint nearest that time; outside one it holds at the preceding **Camp** — which is not a fallback but the correct answer, since a camp's position is the last trackpoint of the day that ended there. Hovering the trip's 3.1 °C low should therefore point at the camp that was that cold.

Wiring follows the pattern already used throughout the app: the component dispatches `weather-hover` (carrying position and time) and `weather-hover-end` on the document, and the map module owns the marker and moves it. The component must not hold a Leaflet map reference, and must not touch leaflet-elevation's own route marker — ADR-0001 draws the line at the documented `d3` global and no further.

Camp positions and walking positions must be visually distinguishable — a held position is a weaker claim than a tracked one, and the two should not look identical. The readout from 0005 should say which it is.

Positions come from the trackpoints already parsed in 0003; no additional fetch.

## Acceptance criteria

- [x] Hovering inside a Walking Window places the marker at the nearest trackpoint in time
- [x] Hovering a camp hour places the marker at the preceding camp, styled distinctly, and the readout labels it as camp
- [x] Hovering the coldest moment of the muotka2025 trip marks the 05–06 Jul camp
- [x] The marker clears when the cursor leaves the chart and when the timeline is toggled shut
- [x] The timeline still renders and hovers correctly with no map present
- [x] No reference to leaflet-elevation's marker or internals is introduced

## Implementation notes

The question "where was the hiker at this moment" is its own module,
`positionAt.js`, beside `nearestSample.js`: it takes the Walking Windows and an
instant, and returns a position and whether it is held at Camp. Nothing else
has to know the rule, and the two callers — the readout's label and the map's
marker — cannot disagree about the answer, because there is only one.

It is deliberately not folded into `nearestSample`. The two are both folds over
things carrying an `at`, but they answer different questions: a reading is
always the nearest one taken, while a position outside a Walking Window is not
the nearest trackpoint at all. Hovering 22:00 on the first night is nearer the
next morning's first trackpoint than the previous evening's last, and answering
with the morning one would put the hiker somewhere they had not yet walked to.
That test is in `positionAt.test.js` and would pass by accident against a plain
nearest-in-time fold on any fixture whose camps happen to fall the other way.

The component holds no map. It dispatches `weather-hover` with the position, the
moment and whether it is a Camp; `hoverMarker.js` listens and owns an
`L.circleMarker`, created on the first hover and moved thereafter. It is
`interactive: false`, so it never swallows a click meant for the route
underneath it.

`weather-hover-end` fires from three places, and the third was the one worth
finding: leaving the plot, lifting a finger, and shutting the timeline. The
chart hides its own hairline when toggled shut, so without that third dispatch
the marker stayed on the map with nothing left on the page to explain it.

The two states are drawn differently because they are different claims: while
walking, the watch recorded that spot at about that minute, so the mark is a
solid dot; in Camp the position is held — one trackpoint standing for a whole
night — so the mark is hollow and dashed.

The suite now loads Leaflet, so `hoverMarker.js` is tested against a real map
rather than a stand-in: the marker is a real layer at a real `LatLng`, and the
tests read it back through Leaflet's own API. Leaflet keeps window listeners
under `_leaflet_events`, which joins `d3` in `mocha.globals`.

Adds 14 tests, 163 passing against 149 before. Verified against the real
muotka2025 files as well as the fixtures: the 3.1 °C low at 06 Jul 01:00
resolves to 69.231212, 26.181443 with `camp: true`, which is the last trackpoint
of day 2 — the camp of the night of 05–06 Jul — and the 30.5 °C maximum at
10 Jul 12:30 resolves to a walking position on day 7.

## Blocked by

- 0003
- 0005

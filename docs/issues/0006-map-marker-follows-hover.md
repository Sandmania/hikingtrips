# 0006 — Map marker follows the Weather Timeline hover, holding at Camp

- **Type**: AFK
- **Status**: ready
- **Blocked by**: 0003, 0005

## What to build

Hovering the timeline shows where the hiker was at that moment. Inside a **Walking Window** the marker sits at the trackpoint nearest that time; outside one it holds at the preceding **Camp** — which is not a fallback but the correct answer, since a camp's position is the last trackpoint of the day that ended there. Hovering the trip's 3.1 °C low should therefore point at the camp that was that cold.

Wiring follows the pattern already used throughout the app: the component dispatches `weather-hover` (carrying position and time) and `weather-hover-end` on the document, and the map module owns the marker and moves it. The component must not hold a Leaflet map reference, and must not touch leaflet-elevation's own route marker — ADR-0001 draws the line at the documented `d3` global and no further.

Camp positions and walking positions must be visually distinguishable — a held position is a weaker claim than a tracked one, and the two should not look identical. The readout from 0005 should say which it is.

Positions come from the trackpoints already parsed in 0003; no additional fetch.

## Acceptance criteria

- [ ] Hovering inside a Walking Window places the marker at the nearest trackpoint in time
- [ ] Hovering a camp hour places the marker at the preceding camp, styled distinctly, and the readout labels it as camp
- [ ] Hovering the coldest moment of the muotka2025 trip marks the 05–06 Jul camp
- [ ] The marker clears when the cursor leaves the chart and when the timeline is toggled shut
- [ ] The timeline still renders and hovers correctly with no map present
- [ ] No reference to leaflet-elevation's marker or internals is introduced

## Blocked by

- 0003
- 0005

# 0003 — Weather Timeline: Walking Window bar strip

- **Type**: AFK
- **Status**: ready
- **Blocked by**: 0001

## What to build

Show the trip's **Walking Windows** as a thin row of labelled bars beneath the x-axis, so a reader can see at a glance which hours were spent moving and which were spent in **Camp**.

The actual route GPX holds one `<trk>` per day, each a single Walking Window, so the windows are simply each track's first and last trackpoint time. This slice widens the GPX parse introduced in 0001 from "the trip's outer bounds" to "per-day windows, plus every trackpoint's time and position" — the positions are not used here but are what 0006 will need, and re-parsing a 448 KB file twice is worth avoiding.

Deliberately **not** vertical bands behind the plot: the humidity area already occupies the translucent-fill channel, and stacking a second fill over it produces overlap shades no reader can decode.

The windows are unequal — day 4 is under 3 hours, day 1 over 6 — and that inequality is information, so bars must be drawn to true width against the time axis rather than as equal-sized day markers.

For muotka2025 the strip should show seven bars, the gaps between them being the six nights in camp.

## Acceptance criteria

- [ ] One bar per Walking Window, positioned and sized against the same time scale as the chart
- [ ] Bars are labelled by day
- [ ] Gaps between bars correspond to time spent in camp
- [ ] muotka2025 renders exactly seven bars, the shortest being day 4
- [ ] Trackpoint times and positions are parsed once and retained for later use
- [ ] Fixture test covers deriving windows from a multi-`<trk>` GPX

## Blocked by

- 0001

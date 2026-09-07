# 0003 — Weather Timeline: Walking Window bar strip

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0001

## What to build

Show the trip's **Walking Windows** as a thin row of labelled bars beneath the x-axis, so a reader can see at a glance which hours were spent moving and which were spent in **Camp**.

The actual route GPX holds one `<trk>` per day, each a single Walking Window, so the windows are simply each track's first and last trackpoint time. This slice widens the GPX parse introduced in 0001 from "the trip's outer bounds" to "per-day windows, plus every trackpoint's time and position" — the positions are not used here but are what 0006 will need, and re-parsing a 448 KB file twice is worth avoiding.

Deliberately **not** vertical bands behind the plot: the humidity area already occupies the translucent-fill channel, and stacking a second fill over it produces overlap shades no reader can decode.

The windows are unequal — day 4 is under 3 hours, day 1 over 6 — and that inequality is information, so bars must be drawn to true width against the time axis rather than as equal-sized day markers.

For muotka2025 the strip should show seven bars, the gaps between them being the six nights in camp.

## Acceptance criteria

- [x] One bar per Walking Window, positioned and sized against the same time scale as the chart
- [x] Bars are labelled by day
- [x] Gaps between bars correspond to time spent in camp
- [x] muotka2025 renders exactly seven bars, the shortest being day 4
- [x] Trackpoint times and positions are parsed once and retained for later use
- [x] Fixture test covers deriving windows from a multi-`<trk>` GPX

## Implementation notes

**A Walking Window is a `<trkseg>`, not a `<trk>`.** This issue and the handoff
both say `combined.gpx` holds one `<trk>` per day. It does not: it holds a single
`<trk>` named "Combined Track" with seven `<trkseg>` inside it. The seven windows
and their unequal lengths are exactly as described (day 4 2.9 h, day 1 6.1 h) —
only the element is different. `parseActualRoute` in `actualRoute.js` therefore
reads segments, which is also the correct reading in the general case: a `<trkseg>`
*is* a contiguous span of recording, which is what a Walking Window is. Both shapes
are covered by fixtures — one `<trk>` per day in `TRACK_PER_DAY`, and the real
one-track-seven-segments file in `MUOTKA_TRACK`.

The GPX parse moved out of `exposureRecord.js` into its own `actualRoute.js`, one
module per source file, and `tripWindowFromTrack` went with it. The Trip Window is
no longer the min/max over every trackpoint but the first window's start to the
last window's end — which is how CONTEXT.md defines it, and gives the same answer.
`parseActualRoute` returns the windows with every trackpoint's time and position
attached, so 0006 needs no second read of the 448 KB file.

Two things a later slice inherits:

- **The viewBox grew to 960×280** (from 260) and `MARGIN.bottom` to 46, which is
  26 for the time axis plus 8 gap plus a 12-unit strip. The plot itself is still
  the 222 units 0001 was signed off on — the chart got taller rather than the plot
  getting shorter. Aspect ratio is now 3.4:1.
- **The x domain is the Trip Window, not the record's extent.** It used to run
  first sample → last sample, which lands wherever the logger's half-hour cadence
  happened to fall; the bars have to line up with the trip itself, so the axis now
  does too. The line consequently starts a few pixels in from the left edge, which
  is accurate: the first sample was taken after the first trackpoint.

`instantToWallTime` is the new inverse of `wallTimeToInstant` in
`exposureRecord.js` — window bounds arrive as UTC instants and have to be read
onto the trip's clock before they can share an axis with the samples.

## Blocked by

- 0001

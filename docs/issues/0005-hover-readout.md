# 0005 — Weather Timeline: hover hairline and readout

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0001

## What to build

A vertical hairline that follows the cursor across the chart, with a small readout giving the nearest sample's time, temperature and relative humidity.

Nearest-sample lookup rather than interpolation: these are 30-minute point measurements, and showing an invented value between them would misrepresent what the device recorded.

The readout must work anywhere across the Trip Window, including the two thirds of it spent in camp — the sleeping hours are the reason this chart exists, so they cannot be the hours where hover goes dead.

Self-contained to the component. The cross-component consequence of hovering is 0006's job; keep the two separable so that hovering still works if the map is absent.

## Acceptance criteria

- [x] A hairline tracks the cursor within the plot area and disappears on leaving it
- [x] The readout shows time in trip-local time, temperature in °C and RH in %, for the nearest sample
- [x] Values shown are always real samples, never interpolated
- [x] Hover works over camp hours as well as walking hours
- [x] Touch input does not leave a stuck hairline

## Implementation notes

The lookup is its own module, `nearestSample.js`, beside `extremes.js`: sixteen
lines, one exported function, and it returns the sample itself rather than a
formatted reading, so 0006 can ask the same question and use the answer's time.
It is a linear scan over 295 samples, which is nothing next to the repaint it
precedes; a bracketing search would be faster and would answer wrongly at both
ends of the axis, where the Trip Window extends past the outermost reading.

The hairline stands on the reading it reports rather than under the cursor. At
half-hourly cadence over six days that is about three units of the plot's 874,
so it still reads as following the cursor — but it means the line and the
numbers can never disagree about which sample is being asked about, which was
the point of choosing nearest-sample over interpolation in the first place.

Two things the tests turned up rather than confirmed:

- A tap is a touch that never moves, so listening for `pointermove` alone gives
  a chart that answers a mouse and ignores a finger. Both `pointerdown` and
  `pointermove` show the readout now.
- A lifted finger sends no `pointerleave` — it stops existing where it was — so
  hiding on `pointerleave` alone left the readout on screen for the rest of the
  visit. `pointerup`/`pointercancel` clear it for any pointer that is not a
  mouse; a mouse keeps its reading until it actually leaves the plot.

The readout flips to the near side of the hairline when the plot has no room
for it on the far side. The last hours of a trip are worth reading, and they
are exactly where a box that only ever sat to the right would be clipped.

Nothing about hovering leaves the component, so it works with no map present.
0006 adds the dispatch.

## Blocked by

- 0001

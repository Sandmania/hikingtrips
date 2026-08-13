# 0005 — Weather Timeline: hover hairline and readout

- **Type**: AFK
- **Status**: ready
- **Blocked by**: 0001

## What to build

A vertical hairline that follows the cursor across the chart, with a small readout giving the nearest sample's time, temperature and relative humidity.

Nearest-sample lookup rather than interpolation: these are 30-minute point measurements, and showing an invented value between them would misrepresent what the device recorded.

The readout must work anywhere across the Trip Window, including the two thirds of it spent in camp — the sleeping hours are the reason this chart exists, so they cannot be the hours where hover goes dead.

Self-contained to the component. The cross-component consequence of hovering is 0006's job; keep the two separable so that hovering still works if the map is absent.

## Acceptance criteria

- [ ] A hairline tracks the cursor within the plot area and disappears on leaving it
- [ ] The readout shows time in trip-local time, temperature in °C and RH in %, for the nearest sample
- [ ] Values shown are always real samples, never interpolated
- [ ] Hover works over camp hours as well as walking hours
- [ ] Touch input does not leave a stuck hairline

## Blocked by

- 0001

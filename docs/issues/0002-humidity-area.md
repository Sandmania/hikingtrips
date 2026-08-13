# 0002 — Weather Timeline: humidity area on a fixed 0–100 % axis

- **Type**: AFK
- **Status**: ready
- **Blocked by**: 0001

## What to build

Add relative humidity to the Weather Timeline as a second series, drawn as a pale filled area behind the temperature line, on a right-hand axis pinned to 0–100 %.

Two constraints that are the whole point of the slice:

- The RH axis is **fixed at 0–100 %, never auto-scaled to the data**. Trip values span roughly 26–95 %, and auto-scaling makes a 95 % reading look mid-range when what matters is that it is nearly saturated.
- Temperature and humidity must be distinguishable **without consulting a legend**, which is why they use different mark types (line vs. filled area) rather than two lines of similar weight. A reader should never have to work out which series belongs to which axis.

The check that this worked: on 07-07 the trip sat at 69–95 % RH and 5.0–9.9 °C all day. That day should look obviously different from every other day on the chart.

## Acceptance criteria

- [ ] RH renders as a filled area behind the temperature line, which stays legible on top of it
- [ ] The right axis reads 0–100 % regardless of the data range
- [ ] A legend or label identifies both series and their axes
- [ ] The fog day (07-07) is visually distinct from the surrounding days

## Blocked by

- 0001

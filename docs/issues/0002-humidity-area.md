# 0002 — Weather Timeline: humidity area on a fixed 0–100 % axis

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0001

## What to build

Add relative humidity to the Weather Timeline as a second series, drawn as a pale filled area behind the temperature line, on a right-hand axis pinned to 0–100 %.

Two constraints that are the whole point of the slice:

- The RH axis is **fixed at 0–100 %, never auto-scaled to the data**. Trip values span roughly 26–95 %, and auto-scaling makes a 95 % reading look mid-range when what matters is that it is nearly saturated.
- Temperature and humidity must be distinguishable **without consulting a legend**, which is why they use different mark types (line vs. filled area) rather than two lines of similar weight. A reader should never have to work out which series belongs to which axis.

The check that this worked: on 07-07 the trip sat at 69–95 % RH and 5.0–9.9 °C all day. That day should look obviously different from every other day on the chart.

## Acceptance criteria

- [x] RH renders as a filled area behind the temperature line, which stays legible on top of it
- [x] The right axis reads 0–100 % regardless of the data range
- [x] A legend or label identifies both series and their axes
- [x] The fog day (07-07) is visually distinct from the surrounding days

## Implementation notes

The RH scale is `humidity` in `WeatherTimeline._render`, and its `.domain([0, 100])`
is the point of the slice — a comment there says so, because `.nice()` or
`d3.extent` would look like a tidy-up rather than the regression it is.

The pale fill (`#2a78d6` at 0.16) and the existing crimson line were checked as a
pair for colour-vision separation before use; they clear every gate with room to
spare (worst CVD ΔE 20.6). The legend swatches repeat the mark shapes — a stroke
for temperature, a filled block for humidity — so the legend confirms a reading
the marks already make on their own.

Two things a later slice inherits:

- `MARGIN.right` went from 16 to 40 px to fit the `n %` labels, which touches the
  aspect ratio 0001 was signed off on. The viewBox is unchanged at 960×260; the
  plot is 24 px narrower.
- This is a two-scale plot, which is normally a bad idea: the alignment of the two
  axes is arbitrary, so the crossings between line and area mean nothing. What
  makes it legible here is that neither axis is fitted to the other's data — RH is
  pinned to 0–100 % — and the marks are different kinds. Keep both properties if
  the chart gains a third series; if it ever needs a fourth, split the plot rather
  than adding a third scale.

## Blocked by

- 0001

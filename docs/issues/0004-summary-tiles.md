# 0004 — Weather Timeline: summary tiles and the direct-sun footnote

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0003

## What to build

Three summary tiles above or beside the chart, plus a caption that keeps the chart honest about what its sensor measured.

```
Coldest           3.1 °C   06 Jul 01:00
Coldest walking   8.6 °C   07 Jul 13:00
Warmest          30.5 °C   10 Jul 12:30 †
```

The middle tile is the reason this feature exists. The elevation profile reports a minimum of 9 °C because it can only show values at trackpoints, and the watch only ran while walking; the trip's actual low of 3.1 °C happened at 01:00 in a tent. Both numbers are correct answers to different questions, and showing them side by side is what stops them reading as a contradiction. (The elevation profile rounds to integers, which is why its tile says 9 and ours says 8.6 — same reading.)

The footnote on the warmest reading: the logger was carried on the outside of the pack, so midday peaks include direct sun rather than shade air temperature. The 30.5 °C reading is diagnostic — temperature jumps roughly 9 °C while dew point stays flat around 8 °C, which no air mass does. Word the caption so the page never claims the trip reached 30 °C without qualification.

Extremes are computed over the trimmed Trip Window, not the full Sensor Log, or the maximum becomes the 39.7 °C indoor spike from before the trip started.

## Acceptance criteria

- [x] Three tiles render with value, date and time in trip-local time
- [x] For muotka2025 they read 3.1, 8.6 and 30.5 °C at the times above
- [x] The warmest tile carries a marker tied to a visible caption about the sensor being in direct sun
- [x] Tiles are computed from the trimmed record, never the full log
- [x] Fixture test covers extreme selection, including that the walking minimum only considers samples inside Walking Windows

## Implementation notes

The extremes are their own module, `extremes.js`, beside `exposureRecord.js` and
`actualRoute.js`: `extremes(record, walkingWindows)` returns the three chosen
samples whole, rather than a reduced value-and-time shape, so a later slice that
wants the humidity or dew point at the trip's maximum already has it. Choosing
happens on the Exposure Record the component already holds, so "computed from
the trimmed record" is structural — there is no path by which the full Sensor
Log could reach it. The walking minimum filters by instant against the Walking
Window bounds, inclusively: the logger's half-hour cadence lands exactly on a
window edge often enough that excluding those would silently drop real readings.

**A trip can have no walking reading at all** — a logger that only ran in Camp.
`coldestWalking` is then null and that tile is left out rather than rendered
empty, because the alternative found while writing the test was worse: the
`reduce` threw, the exception escaped `_render`, and the whole chart was
replaced by an error toast over a trip whose other two readings were fine.

The footnote marker sits on the value (`30.5 °C†`), not after the timestamp as
the sketch in this issue had it. What is being qualified is the reading, and at
the end of the row it reads as attaching to the date instead. The caption it
ties to now says outright that the warmest reading is not the air temperature
the trip reached, rather than only explaining where the sensor hung.

`clear()` empties the tiles along with the chart. Numbers outlive a chart
quietly: three tiles reading 3.1 / 8.6 / 30.5 left standing above the next
trip's blank plot would be read as that trip's.

The tiles are uncoloured — grey rule, grey ground. The two series own the colour
channel in this component, and a blue tile beside the blue humidity area would
be read as belonging to it.

Verified against the real files, not only the fixtures: 7 Walking Windows, the
same 295 samples issue 0001 established, and 3.1 °C at 06 Jul 01:00, 8.6 °C at
07 Jul 13:00, 30.5 °C at 10 Jul 12:30 — the three numbers this issue asks for,
including the 8.6 that the elevation profile rounds to the 9 it displays.

## Blocked by

- 0003

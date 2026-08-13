# 0004 — Weather Timeline: summary tiles and the direct-sun footnote

- **Type**: AFK
- **Status**: ready
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

- [ ] Three tiles render with value, date and time in trip-local time
- [ ] For muotka2025 they read 3.1, 8.6 and 30.5 °C at the times above
- [ ] The warmest tile carries a marker tied to a visible caption about the sensor being in direct sun
- [ ] Tiles are computed from the trimmed record, never the full log
- [ ] Fixture test covers extreme selection, including that the walking minimum only considers samples inside Walking Windows

## Blocked by

- 0003

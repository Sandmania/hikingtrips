# 0007 — Golden test: the muotka2025 Exposure Record

- **Type**: AFK
- **Status**: done
- **Blocked by**: 0003

## What to build

One end-to-end test that loads the real muotka2025 Sensor Log and actual route, runs them through the real pipeline, and asserts the trip's known figures:

```
samples in the Trip Window        295
Walking Windows                     7
coldest                    3.1 °C at 2025-07-06 01:00 local
warmest                   30.5 °C at 2025-07-10 12:30 local
coldest while walking      8.6 °C at 2025-07-07 13:00 local
```

The fixture tests in 0001–0004 pin the parsing rules; this one pins the trip's actual story. It is the thing that notices when a re-exported GPX shifts the Trip Window, or a re-pulled CSV changes the extremes, and quietly turns the chart into a claim about a different trip.

Note it loads a 448 KB GPX inside the browser test runner, which will be slower than anything currently in the suite. If that proves disruptive, keep the assertions and reduce the fixture rather than dropping the test.

Related: the actual route GPX gives each day its own `<trk>` deliberately, to work around a per-segment extension bug in the togeojson version that leaflet-elevation pins. A test that counts seven Walking Windows will also catch anyone flattening that structure.

## Acceptance criteria

- [x] The test loads the committed muotka2025 CSV and GPX, not fixtures
- [x] All five figures above are asserted, times compared in trip-local time
- [x] The test is registered in the test index page and passes alongside the existing suite
- [x] Failure messages identify which figure diverged

## Blocked by

- 0003

# Issues

Markdown issue tracker. One file per issue, `NNNN-slug.md`. Each is a vertical slice: a narrow but complete path through config, control, component and tests, verifiable on its own.

**Type** is `AFK` (implementable and mergeable without human interaction) or `HITL` (needs a human decision or design review).

## Weather Timeline

Design record: [handoff](../handoff-temperature-timeline.md) · [glossary](../../CONTEXT.md) · [ADR-0001](../adr/0001-share-leaflet-elevations-d3.md) · [ADR-0002](../adr/0002-trip-window-comes-from-the-track.md)

| # | Issue | Type | Status | Blocked by |
|---|---|---|---|---|
| 0001 | [Temperature line end to end](0001-weather-timeline-temperature-line.md) | HITL | ready | — |
| 0002 | [Humidity area on a fixed 0–100 % axis](0002-humidity-area.md) | AFK | ready | 0001 |
| 0003 | [Walking Window bar strip](0003-walking-window-strip.md) | AFK | ready | 0001 |
| 0004 | [Summary tiles and the direct-sun footnote](0004-summary-tiles.md) | AFK | ready | 0003 |
| 0005 | [Hover hairline and readout](0005-hover-readout.md) | AFK | ready | 0001 |
| 0006 | [Map marker follows the hover, holding at Camp](0006-map-marker-follows-hover.md) | AFK | ready | 0003, 0005 |
| 0007 | [Golden test: the muotka2025 Exposure Record](0007-golden-test.md) | AFK | ready | 0003 |

```
0001 ─┬─ 0002
      ├─ 0003 ─┬─ 0004
      │        ├─ 0007
      │        └─ 0006
      └─ 0005 ─────┘
```

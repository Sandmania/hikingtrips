# The Trip Window is defined by the track, not by when the sensor went outdoors

The Kestrel ran for 436 samples from 2025-07-01 15:30 to 2025-07-10 17:00, but the trip is only part of that. We define the **Trip Window** as first trackpoint → last trackpoint of `actual_route/combined.gpx` (2025-07-04 11:09 → 2025-07-10 14:56 local, 295 samples) and trim the **Exposure Record** to it. The alternative — explicit `from`/`to` timestamps in `trip_config.yaml` — was rejected as one more thing to hand-maintain per trip.

## Consequences

- **The timeline requires an actual route.** A trip with a sensor CSV but no GPX has no Trip Window and therefore no chart; `weatherControl.canAdd()` gates on both `weather.csvUrl` and `actualRoute.gpx`.
- **Roughly two hours of genuine outdoor exposure are cut**, and this is known, not accidental: the 07-04 walk-in from 09:30 (dew point drops 15.6 → 8.5 °C as the logger leaves Hotel Guossi) and the 07-10 arrival from 14:56 to 15:30 (dew point jumps 5.9 → 12.7 °C on entering Muotkan Ruoktu). Neither affects the trip's extremes: min 3.1 °C and max 30.5 °C are identical under both definitions.
- The rejected `from`/`to` option remains a cheap escape hatch if a future trip's logger is switched on days early *and* the clipped edges matter.

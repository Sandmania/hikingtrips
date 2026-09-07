# Hiking Trips

A static site that presents planned and walked hiking trips: routes on a map, what was carried, what was eaten, and what the conditions were. One trip per directory under `public/`, each described by a `trip_config.yaml`.

## Language

### Conditions

**Exposure Record**:
The continuous log of conditions a hiker was subjected to across a whole trip, sleeping hours included.
_Avoid_: weather history, forecast

**Weather Timeline**:
The chart that renders a trip's **Exposure Record** against time — the feature name used in config (`weather:`), the component (`<tt-weather-timeline>`) and filenames.

**Sensor Log**:
A single logging device's own export, in its own units, cadence and time base, before any trimming or joining.

**Walking Window**:
A contiguous span of a day during which the watch was recording a track, i.e. the hiker was moving.
_Avoid_: leg, day, segment

**Camp**:
Where a hiker stayed between two **Walking Windows** — positionally, the last trackpoint of the earlier one.
_Avoid_: overnight, stop, rest

**Trip Window**:
The span from the first trackpoint of a trip's actual route to its last — the trip's outer bounds, from which the **Exposure Record** is trimmed.
_Avoid_: track window, log window

## Relationships

- A **Trip** has exactly one **Exposure Record**
- An **Exposure Record** is derived from one or more **Sensor Logs**, trimmed to the **Trip Window**
- A **Trip Window** spans from the start of the first **Walking Window** to the end of the last
- A **Trip** has zero or more **Walking Windows** per day; **Walking Windows** cover only part of an **Exposure Record**
- Between two consecutive **Walking Windows** there is exactly one **Camp**, whose position is the earlier window's final trackpoint
- A **Weather Timeline** renders one **Exposure Record**, marking its **Walking Windows** and resolving any moment outside them to a **Camp**

## Example dialogue

> **Dev:** "The elevation profile shows a minimum of 9 °C, but you say the trip's low was 3.1 °C. Which is right?"
> **Hiker:** "Both. The elevation profile only knows **Walking Windows** — the watch was off in camp. 3.1 °C is from the **Exposure Record**, at 01:00 when I was in the tent."
> **Dev:** "So the **Exposure Record** is what the trip felt like, not what a weather station would have said?"
> **Hiker:** "Right. The sensor hung off my pack. It caught full sun at midday. That's what I was exposed to, even though it isn't shade air temperature."

## Flagged ambiguities

- "weather" is the feature's name (**Weather Timeline**), but it is not what the data is. The readings come from one sensor on the outside of a pack, so they include full sun at midday. Resolved: the name is `weather` everywhere in code and config; the chart itself must not present its maximum as an air temperature.
- A **Sensor Log** may extend beyond the **Trip Window** at both ends (transit, hotels), where its readings are of the building, not of the trip. Resolved: those samples are outside the **Exposure Record** and are not shown.
- "temperature data" was used to mean both the `gpxtpx:atemp` values merged into trackpoints (**Walking Window** coverage only) and the full **Sensor Log**. Resolved: these are different extents of the same measurements, and only the **Exposure Record** covers the whole trip.

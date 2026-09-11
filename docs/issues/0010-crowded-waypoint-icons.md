# 0010 — Waypoints that crowd each other are drawn as one

- **Type**: AFK
- **Status**: done
- **Blocked by**: —

## What to build

Waypoint icons are a fixed 30 px whatever the zoom, but waypoints are placed by
where the hiker was. On moskangaisi2026 `DSC04101`–`DSC04103` are three metres
apart, the `Leg 1` camp is five metres from `DSC04009`, and `Leg 3`/`Leg 4` are
two metres apart. Their icons land on the same pixel, and an overlapped icon
cannot be hovered — whichever is on top takes the pointer. Reading those photos
means zooming until the icons separate, which for the three-metre trio is past
the base map's maximum zoom, so they cannot be separated at all.

Waypoints that would overlap are therefore drawn as a single marker, and that
marker speaks for all of them: every photo of the group in one `.image-grid`,
headed by the names of any camps in it, with a count on the icon. The grouping
is redone at every zoom, so zooming in still pulls them apart wherever there is
room.

A merged marker shows one icon, and the camp must be the one it shows. A camp is
a fact about the trip — a night spent in a place — while a photo is something to
look at, and a map that cannot say where the nights were is missing the more
important of the two. A bonfire that also holds photos carries a small camera
mark, so nothing at that spot goes unadvertised.

The marker must stay on the waypoint's own position. A waypoint is a claim about
a place; nudging icons apart to make space would make every one of them slightly
false, which is why this merges rather than spreads.

## Acceptance criteria

- [x] A camp and the photo taken at it draw as one marker at trip zoom, and as
      two once the zoom gives them room
- [x] A crowded spot's hover shows every one of its photos in one grid
- [x] A group holding a camp is a bonfire, whatever else is in it; a group with
      no camp is a camera
- [x] A bonfire whose group also holds photos carries a camera mark, and one
      whose group does not carries none
- [x] The count on the icon equals the number of things the hover shows
- [x] A marker standing for one thing carries no count
- [x] Switching the actual route off and on leaves one track, one set of
      waypoints, and no duplicate entries in the layer control
- [x] Closing the trip leaves no markers and no zoom handler behind

## Implementation notes

leaflet-elevation drew these markers, and could not be made to do this: it
caches one `L.divIcon` per `sym` and shares it between every marker using it
(`_registerMarker`), so no marker can carry a count of its own. It is now told
`wptIcons: false`, which makes its `pointToLayer` return nothing — Leaflet's
`geometryToLayer` drops such a feature — while its chart still gets its dots.
The waypoints travel on `elevation-layers-ready` as plain data and the map draws
them, keeping the rule from [0006](0006-map-marker-follows-hover.md) that the
component holds no map.

Grouping is greedy against a fixed anchor, not single-link. Photos taken while
walking sit strung along the track, each close to the next, and grouping by
reach from any member would chain a whole day's walking into one marker.
`groupByProximity` is tested against exactly that case.

The count is the number of thumbnails plus the number of names — what the hover
actually shows — rather than the number of waypoints merged, so a badge can
never disagree with the content behind it. It is why a single `<wpt>` carrying
two photos is badged `2`: one marker, two things to look at.

Taking ownership of the markers exposed a second bug. Switching the "Actual
route" overlay off and on reloads the GPX, which fires `elevation-layers-ready`
again; `map.js` listened `{ once: true }` and ignored every firing after the
first. leaflet-elevation redrew its own layers regardless, so the only visible
symptom was a stale entry in the layer control — but with the library no longer
drawing the waypoints, the second firing had to be handled. Each arrival now
replaces the last, and the `overlayadd`/`overlayremove` handlers are registered
once rather than per arrival.

The icon precedence went the other way first, and that was wrong. Choosing the
camera whenever a group held any photo read as the sensible default — the photos
are what most groups hold — but it erased something the count could not replace:
at moskangaisi2026's fitted zoom the map drew 21 markers and **no** bonfires at
all, because each of its five camps has photos taken within a few metres. The
same rule cost muotka2025 five of its seven and paistunturi2024 eight of its
nine. The camps are the same five, seven and nine spots at every zoom, so once
the bonfire takes precedence they are never missing.

Not touched: the planned route's start/end pins, which come from leaflet-gpx in
a different feature group. They are `clickable: false`, so they can sit over a
photo icon without taking its hover.

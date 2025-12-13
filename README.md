Lantmäteriet
https://geotorget.lantmateriet.se/dokumentation/GEODOK/72/latest/atkomst-och-leverans/teknisk-beskrivning.html
https://apimanager.lantmateriet.se/devportal/apis
https://www.lantmateriet.se/contentassets/7f1d8234566942e8a58140d2911bd105/api-portal-get-started-guide.pdf

https://kartena.github.io/Proj4Leaflet/
Just take a look at the source and fix the API url:
https://kartena.github.io/Proj4Leaflet/examples/wmts/

## Lantmäteriet

API Keys and service subscriptions:
https://apimanager.lantmateriet.se/devportal/apis

Api portal getting started
https://www.lantmateriet.se/contentassets/7f1d8234566942e8a58140d2911bd105/api-portal-get-started-guide.pdf

WMTS Technical documentation
https://geotorget.lantmateriet.se/dokumentation/GEODOK/72/latest/atkomst-och-leverans/teknisk-beskrivning.html

Examples:
https://kartena.github.io/Proj4Leaflet/
Just take a look at the source and fix the API url as this page doesn't currently work (using old api endpoint)
https://kartena.github.io/Proj4Leaflet/examples/wmts/

## Kartverket

https://www.kartverket.no/api-og-data


https://github.com/kartverket/example-clients

## Route planning

### Draw route
Whole world
https://caltopo.com/map.html

Finland
https://retkikartta.fi/


Get map trace from openstreetmap relation or way

https://overpass-turbo.eu/

rel(1019948); out geom;

OR

way(762977045); out geom;

Hit Run

-> Export -> GPX

### Add elevation profile
https://www.gpsvisualizer.com/elevation


## Creating actual route

Match photo timestamps to track timestamps:

```
../../trailtreader/tools/createPhotoTrack.sh /Users/sandman/personal/code/hikingtrips/muotka2025/photos actual_route
```

Combine __tracks__ to a single gpx file.
```
 ../../trailtreader/tools/combineGpx.sh /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-04T08-09-18Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-05T06-55-33Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-06T06-33-39Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-07T08-18-50Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-08T06-31-06Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-09T07-27-42Z-track.gpx /Users/sandman/personal/code/hikingtrips/muotka2025/actual_route/suuntoapp-Trekking-2025-07-10T06-32-42Z-track.gpx
 ```

Create photo thumbnails
```
sips -s formatOptions 95 --resampleWidth 580 *.jpeg --out thumbs
```

## Developing

Plain Vanilla https://plainvanillaweb.com/index.html



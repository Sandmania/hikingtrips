let map;
function initMap() {
    map = new L.map("map", {
        crs: L.TileLayer.MML.get3067Proj()
    });
    map.setView([68.3469, 27.4620], 13);

    // Base maps
    var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> contributors'
    });

    var OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var orto = L.tileLayer('https://tiles.kartat.kapsi.fi/ortokuva/{z}/{x}/{y}.jpg', {
        maxZoom: 19,
        attribution: 'National Land Survey of Finland, Ortophoto'
    });

    var maastokartta = L.tileLayer.mml_wmts({ layer: "maastokartta" }).addTo(map);

    var baseMaps = {
        "NLS Topographic map": maastokartta,
        "OpenTopoMap": OpenTopoMap,
        "OpenStreetMap": OpenStreetMap,
        "NLS Ortophoto": orto
    };

    L.control.layers(baseMaps).addTo(map);

    // Event listener for baselayer change to handle CRS change
    map.on('baselayerchange', function (e) {
        console.log("baselayerchange event name " + e.name)
        var center = map.getCenter();
        var zoom = map.getZoom();
        var currentLayers = [];

        map.eachLayer(function (layer) {
            currentLayers.push(layer);
        });

        // Re-initialize map with new CRS if necessary
        if (e.name === 'NLS Topographic map') {
            console.log("Set CRS to 3067")
            map.options.crs = L.TileLayer.MML.get3067Proj();
        } else {
            console.log("Set CRS to EPSG3857")
            map.options.crs = L.CRS.EPSG3857;
        }

        map.setView(center, zoom);
        e.layer.addTo(map);

        // Re-add other layers if necessary
        currentLayers.forEach(function (layer) {
            if (layer !== e.layer) {
                map.addLayer(layer);
            }
        });
    });
}
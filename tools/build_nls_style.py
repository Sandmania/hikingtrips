"""Generate public/assets/vectormap/nls_vector_map.json.

The NLS Vector tiles basemap (taustakartta, via api.joun.in) styled with the
offtiler hiking palette: offtiler's built hiking style is Protomaps light plus
offtiler/config/overlays/hiking.json, and the colours and widths below are
taken from it, mapped onto NLS kohdeluokka codes.

This script is the source of truth; edit it, not the JSON, then run:

    python3 tools/build_nls_style.py

The page loads mapbox-gl 1.5.0, so stay within its style spec: no
["in", value, array] expression, no data-driven line-dasharray, no
line-sort-key.
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public/assets/vectormap/nls_vector_map.json"
S = "taustakartta"


def z(*stops, base=None):
    interp = ["exponential", base] if base else ["linear"]
    return ["interpolate", interp, ["zoom"], *stops]


def kl(*codes):
    return ["match", ["get", "kohdeluokka"], list(codes), True, False]


LINE = ["==", ["geometry-type"], "LineString"]
ROUND = {"line-cap": "round", "line-join": "round"}

# ---- offtiler palette -------------------------------------------------------
EARTH = "#e2dfda"
WATER = "#80deea"
WATER_EDGE = "#00838f"
WATER_LABEL = "#728dd4"
WETLAND = "#9fc9c0"
PARK = "#9cd3b4"
GRASS = "#99d2bb"
FARMLAND = "#d8efd2"
SCRUB = "#eaefd2"
SAND = "#e2e0d7"
ROCK = "#d3cfc7"  # offtiler has no rock class; a step darker than SAND
INDUSTRIAL = "#d1dde1"
URBAN = "#e6e6e6"
AERODROME = "#dadbdf"
RUNWAY = "#e9e9ed"
CASING = "#e0e0e0"
TUNNEL = "#d5d5d5"
PATH = "#7a3b12"
RAIL = "#a7b1b3"
BOUNDARY = "#adadad"
CONTOUR = "#a06a3c"
BUILDING = "#7a7066"
BUILDING_EDGE = "#3a322a"
NATURE_LABEL = "#20834d"
PLACE_LABEL = "#5c5c5c"
PLACE_HALO = "#e0e0e0"
ROAD_LABEL = "#91888b"

# ---- road classes (NLS kohdeluokka -> offtiler/Protomaps kind) -------------
HIGHWAY = [12111, 12112]                  # Autotie Ia/Ib
MAJOR = [12121, 12122, 12131, 12132]      # Autotie IIa/IIb/IIIa/IIIb
MINOR = [12141]                           # Ajotie
PATHS = [12313, 12314, 12316]             # Polku, Kävely- ja pyörätie, Ajopolku
RAILWAY = [14110, 14111, 14112, 14121, 14131, 14151, 14152]

HIGHWAY_W = z(3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15, base=1.6)
MAJOR_W = z(6, 0, 12, 1.6, 15, 3, 18, 13, base=1.6)
MINOR_W = z(11, 0.8, 12.5, 1, 15, 2, 18, 11, base=1.6)
MINOR_CASING_W = z(11, 2, 12.5, 2.2, 15, 4, 18, 13, base=1.6)
PATH_W = z(11, 1, 16, 3.5)
RAIL_W = z(3, 0, 6, 0.15, 18, 9, base=1.6)

# ---- label layout (NLS names, fonts served by api.joun.in/glyphs) ----------
NAME = ["coalesce", ["get", "nimi_fin"], ["get", "nimi_swe"], ["get", "nimi_sme"],
        ["get", "nimi_sms"], ["get", "nimi_smn"]]
FONT = ["Liberation Sans NLSFI"]
MAASTO_VEDET = ["match", ["get", "teema"], ["Maasto", "Vedet"], True, False]
LUONNONPUISTO = ["match", ["get", "laji"], ["Kansallispuisto", "Luonnonpuisto"], True, False]

layers = []


def add(layer):
    head = {"id": layer["id"], "type": layer["type"], "source": S,
            "source-layer": layer["source-layer"]}
    layers.append({**head, **{k: v for k, v in layer.items() if k not in head}})


# No land polygon in taustakartta, so this tints everything, including
# Sweden/Norway; the FiSeNo composite hides it (see baseMaps.js).
layers.append({"id": "background", "type": "background",
               "paint": {"background-color": EARTH}})

# ---- land ------------------------------------------------------------------
PARK_FADE = z(6, 0, 11, 1)
add({
    "id": "maankaytto", "type": "fill", "source-layer": "maankaytto",
    "filter": kl(32111, 32112, 32113, 32200, 32300, 32500, 32611, 32612, 32800, 32900,
                 33100, 34300, 38900, 40200),
    "paint": {
        "fill-color": ["match", ["get", "kohdeluokka"],
                       40200, URBAN,                      # taajama
                       32611, FARMLAND,                   # pelto
                       [32200, 32900, 32612, 33100], PARK,  # hautausmaa, puisto, puutarha, urheilu
                       32800, GRASS,                      # niitty
                       34300, SAND,                       # hietikko
                       INDUSTRIAL],                       # ottoalue, kaatopaikka, louhos, varasto
        "fill-opacity": PARK_FADE,
    },
})
add({
    "id": "maasto_alue", "type": "fill", "source-layer": "maasto_alue",
    "filter": kl(35300, 35411, 35412, 35421, 35422, 34300, 34100, 34700, 38300, 38700,
                 39110, 39120, 39130, 33000, 38400, 38600, 35401, 35402),
    "paint": {
        "fill-color": ["match", ["get", "kohdeluokka"],
                       [35300, 35401, 35402, 35411, 35412, 35421, 35422], WETLAND,  # suot, soistuma
                       [34100, 34700, 38600], ROCK,       # kallio, kivikko, vesikivikko
                       [39110, 39120], SCRUB,             # avoin metsämaa, varvikko
                       [38300, 38400, 38700, 39130], WATER,  # maatuva vesi, tulva, matalikko, vesijättö
                       33000, "#e3e0d4",                  # täytemaa
                       34300, SAND,
                       "rgba(0,0,0,0)"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"],
                         7, 0,
                         11, ["match", ["get", "kohdeluokka"],
                              [35300, 35401, 35402, 35411, 35412, 35421, 35422], 0.45,
                              [38300, 38400, 38700, 39130], 0.35,
                              1]],
    },
})
add({
    "id": "lentokentta_alue", "type": "fill", "source-layer": "liikenne",
    "filter": ["all", ["==", ["geometry-type"], "Polygon"],
               kl(32411, 32412, 32413, 32414, 32415, 32416, 32417, 32418, 32441, 32442)],
    "paint": {
        "fill-color": ["match", ["get", "kohdeluokka"], [32411, 32412], RUNWAY, AERODROME],
        "fill-outline-color": ["match", ["get", "kohdeluokka"], [32441, 32442], CASING, "rgba(0,0,0,0)"],
    },
})
RUNWAY_LINE = ["any", ["==", "kohdeluokka", 32431], ["==", "kohdeluokka", 32432]]
add({"id": "lentokentta_viiva", "type": "line", "source-layer": "liikenne",
     "filter": RUNWAY_LINE, "paint": {"line-color": CASING, "line-width": 7}})
add({"id": "lentokentta_viiva2", "type": "line", "source-layer": "liikenne",
     "filter": RUNWAY_LINE, "paint": {"line-color": RUNWAY, "line-width": 6}})

# ---- contours (offtiler: 5 m minor from z13, 20 m index from z11) ----------
# z13+ tiles carry korkeusarvo in millimetres (2.5 m interval); lower zooms
# carry a generalised `korkeus` in metres, or nothing.
ELE = ["case",
       ["has", "korkeusarvo"], ["/", ["get", "korkeusarvo"], 1000],
       ["has", "korkeus"], ["get", "korkeus"],
       -1]
CONTOUR_LINE = ["all", LINE, ["==", ["get", "kohdeluokka"], 52100]]
IS_INDEX = ["any", ["==", ELE, -1], ["==", ["%", ELE, 20], 0]]
add({
    "id": "korkeus_viiva", "type": "line", "source-layer": "korkeus", "minzoom": 13,
    "filter": ["all", CONTOUR_LINE, ["==", ["%", ELE, 5], 0], ["!", IS_INDEX]],
    "paint": {"line-color": CONTOUR, "line-width": z(13, 0.4, 16, 0.8), "line-opacity": 0.5},
})
add({
    "id": "korkeus_viiva_johtokayra", "type": "line", "source-layer": "korkeus", "minzoom": 11,
    "filter": ["all", CONTOUR_LINE, IS_INDEX],
    "paint": {"line-color": CONTOUR, "line-width": z(11, 0.6, 16, 1.6), "line-opacity": 0.65},
})

# ---- water -----------------------------------------------------------------
# Casings sit under the opaque lake fill so a centreline is only edged where
# it crosses land (same trick as offtiler's water_stream_casing).
IS_STREAM = ["==", ["get", "kohdeluokka"], 36311]  # Virtavesi, alle 2 m


def by_stream(stream, river):
    return ["case", IS_STREAM, stream, river]


add({
    "id": "vesisto_viiva_reuna", "type": "line", "source-layer": "vesisto_viiva",
    "layout": ROUND,
    "paint": {
        "line-color": WATER_EDGE,
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"],
                       6, by_stream(0, 0.8), 11, by_stream(1.6, 2.4),
                       14, by_stream(2.5, 3.2), 18, by_stream(5, 8)],
    },
})
add({
    "id": "vesisto_viiva", "type": "line", "source-layer": "vesisto_viiva",
    "layout": ROUND,
    "paint": {
        "line-color": WATER,
        "line-width": ["interpolate", ["exponential", 1.6], ["zoom"],
                       6, by_stream(0, 0.3), 11, by_stream(0.5, 1),
                       14, by_stream(0.8, 1.6), 18, by_stream(2, 5)],
    },
})
add({"id": "vesisto_alue", "type": "fill", "source-layer": "vesisto_alue",
     "paint": {"fill-color": WATER}})
add({"id": "vesisto_alue_reuna", "type": "line", "source-layer": "vesisto_alue",
     "layout": {"line-join": "round"},
     "paint": {"line-color": WATER_EDGE, "line-width": 1}})

add({"id": "maastoaluereuna", "type": "line", "source-layer": "maastoaluereuna",
     "filter": ["all",
                ["in", "kartografinenluokka", 32200, 32300, 32411, 32412, 32413, 32414,
                 32415, 32416, 32417, 32418, 33100],
                ["==", "kohdeluokka", 30211]],
     "paint": {"line-color": "#c8c4c5", "line-width": 0.5}})
add({"id": "rakennus", "type": "fill", "source-layer": "rakennus",
     "paint": {"fill-color": BUILDING, "fill-opacity": 0.9, "fill-outline-color": BUILDING_EDGE}})

# ---- roads -----------------------------------------------------------------


def road(level_filter, suffix):
    def f(codes):
        return ["all", LINE, kl(*codes), level_filter]

    out = [
        {"id": f"ajotie_reuna{suffix}", "type": "line", "filter": f(MINOR), "layout": ROUND,
         "paint": {"line-color": CASING, "line-width": MINOR_CASING_W}},
        {"id": f"tiet_2_3_reuna{suffix}", "type": "line", "filter": f(MAJOR), "layout": ROUND,
         "paint": {"line-color": CASING, "line-gap-width": MAJOR_W,
                   "line-width": z(9, 0, 9.5, 1, base=1.6)}},
        {"id": f"tiet_1_reuna{suffix}", "type": "line", "filter": f(HIGHWAY), "layout": ROUND,
         "paint": {"line-color": CASING, "line-gap-width": HIGHWAY_W,
                   "line-width": z(7, 0, 7.5, 1, base=1.6)}},
        {"id": f"ajotie{suffix}", "type": "line", "filter": f(MINOR), "layout": ROUND,
         "paint": {"line-color": z(11, "#ebebeb", 16, "#ffffff", base=1.6), "line-width": MINOR_W}},
        {"id": f"tiet_2_3{suffix}", "type": "line", "filter": f(MAJOR), "layout": ROUND,
         "paint": {"line-color": "#ffffff", "line-width": MAJOR_W}},
        {"id": f"tiet_1{suffix}", "type": "line", "filter": f(HIGHWAY), "layout": ROUND,
         "paint": {"line-color": "#ffffff", "line-width": HIGHWAY_W}},
        {"id": f"rautatie{suffix}", "type": "line", "filter": f(RAILWAY),
         "paint": {"line-color": RAIL, "line-opacity": 0.5, "line-width": RAIL_W,
                   "line-dasharray": [0.3, 0.75]}},
        {"id": f"polku{suffix}", "type": "line", "filter": f(PATHS), "minzoom": 11,
         "layout": ROUND,
         "paint": {"line-color": PATH, "line-width": PATH_W, "line-dasharray": [2, 1.5]}},
    ]
    for l in out:
        l["source-layer"] = "liikenne"
        add(l)


# Tunnels: one muted group (offtiler roads_tunnels_*), no per-level stacking.
TUNNEL_F = ["<", ["get", "tasosijainti"], 0]
ROAD_CODES = HIGHWAY + MAJOR + MINOR
TUNNEL_W = ["interpolate", ["exponential", 1.6], ["zoom"],
            6, ["match", ["get", "kohdeluokka"], HIGHWAY, 1.1, 0],
            12, ["match", ["get", "kohdeluokka"], MINOR, 1, 1.6],
            15, ["match", ["get", "kohdeluokka"], HIGHWAY, 5, MAJOR, 3, 2],
            18, ["match", ["get", "kohdeluokka"], HIGHWAY, 15, MAJOR, 13, 11]]
for l in [
    {"id": "tiet tunnelissa_reuna", "type": "line",
     "filter": ["all", LINE, kl(*ROAD_CODES), TUNNEL_F],
     "paint": {"line-color": CASING, "line-dasharray": [3, 2], "line-gap-width": TUNNEL_W,
               "line-width": z(12, 0, 12.5, 1, base=1.6)}},
    {"id": "tiet tunnelissa", "type": "line",
     "filter": ["all", LINE, kl(*ROAD_CODES), TUNNEL_F],
     "paint": {"line-color": TUNNEL, "line-width": TUNNEL_W}},
    {"id": "polku tunnelissa", "type": "line", "minzoom": 11,
     "filter": ["all", LINE, kl(*PATHS), TUNNEL_F],
     "paint": {"line-color": TUNNEL, "line-width": PATH_W, "line-dasharray": [2, 1.5]}},
]:
    l["source-layer"] = "liikenne"
    add(l)

# Surface + bridge levels. Generalised low-zoom tiles tag most roads level 1,
# so bridges look like surface roads and the level only sets draw order.
road(["==", ["get", "tasosijainti"], 0], ", pinnalla")
for level in range(1, 6):
    road(["==", ["get", "tasosijainti"], level], f", sillalla {level}")

for l in [
    {"id": "lautta ja lossi", "filter": ["all", LINE, kl(12151, 12152)],
     "paint": {"line-color": WATER_LABEL, "line-opacity": 0.6, "line-dasharray": [6, 8],
               "line-width": z(6, 1, 20, 6, base=1.55)}},
    {"id": "laiva ja venevaylat", "filter": ["all", LINE, kl(16511, 16512)],
     "paint": {"line-color": WATER_LABEL, "line-opacity": 0.4, "line-dasharray": [6, 8],
               "line-width": z(6, 0.75, 20, 4, base=1.55)}},
]:
    l.update({"type": "line", "source-layer": "liikenne"})
    add(l)

add({"id": "hallintorajat", "type": "line", "source-layer": "hallintoalue",
     "paint": {"line-color": BOUNDARY, "line-width": 0.7, "line-dasharray": [2, 1]}})
add({"id": "rakennelmat", "type": "line", "source-layer": "rakennelma",
     "filter": ["any", ["==", "kohdeluokka", 45700], ["==", "kohdeluokka", 45111],
                ["==", "kohdeluokka", 45112], ["==", "kohdeluokka", 44500]],
     "paint": {"line-color": "#918a8c", "line-width": 0.5}})

# ---- labels ----------------------------------------------------------------
add({
    "id": "korkeus_teksti", "type": "symbol", "source-layer": "korkeus", "minzoom": 13,
    "filter": ["all", CONTOUR_LINE, ["has", "korkeusarvo"], ["==", ["%", ELE, 20], 0]],
    "layout": {"symbol-placement": "line", "text-field": ["to-string", ELE],
               "text-font": FONT, "text-size": 10, "symbol-spacing": 700},
    "paint": {"text-color": CONTOUR, "text-halo-color": "#ffffff", "text-halo-width": 1.2},
})
add({
    "id": "tienimet", "type": "symbol", "source-layer": "liikenne",
    "filter": ["all", ["<", "tasosijainti", 1]],
    "layout": {"text-field": "{nimi_suomi}        {nimi_ruotsi}", "text-font": FONT,
               "symbol-placement": "line", "text-size": 11},
    "paint": {"text-color": ROAD_LABEL, "text-halo-color": "#ffffff", "text-halo-width": 1},
})
add({
    "id": "nimisto-maasto-vedet", "type": "symbol", "source-layer": "nimisto",
    "filter": MAASTO_VEDET,
    "layout": {
        "text-field": NAME,
        "text-font": ["match", ["get", "teema"],
                      "Vedet", ["literal", ["Liberation Sans NLSFI Left"]],
                      "Maasto", ["literal", ["Liberation Sans NLSFI Right"]],
                      ["literal", FONT]],
        "text-size": z(1, ["step", ["get", "prioriteetti"], 20, 3, 16],
                       10, ["step", ["get", "prioriteetti"], 20, 4, 14],
                       16, ["step", ["get", "prioriteetti"], 22, 5, 12]),
        "visibility": "visible",
    },
    "paint": {
        "text-color": ["match", ["get", "teema"], "Vedet", WATER_LABEL, NATURE_LABEL],
        "text-halo-color": ["match", ["get", "teema"], "Vedet", WATER, "#ffffff"],
        "text-halo-width": ["match", ["get", "teema"], "Vedet", 1, 1.2],
    },
})
add({
    "id": "nimisto", "type": "symbol", "source-layer": "nimisto",
    "filter": ["all", ["!", MAASTO_VEDET],
               ["!=", ["get", "alaryhma"], "Hallintoalueet"],
               ["match", ["get", "laji"], ["Kansallispuisto", "Luonnonpuisto"], False, True]],
    "layout": {
        "text-transform": ["match", ["get", "alaryhma"], "Rautatieliikennepaikat", "uppercase", "none"],
        "text-field": NAME,
        "icon-ignore-placement": True,
        "icon-allow-overlap": True,
        "text-font": FONT,
        "text-size": z(1, ["interpolate", ["linear"], ["get", "prioriteetti"], 1, 20, 3, 16],
                       10, ["interpolate", ["linear"], ["get", "prioriteetti"], 5, 16, 7, 13],
                       14, ["interpolate", ["linear"], ["get", "prioriteetti"], 5, 22, 10, 12]),
        "visibility": "visible",
    },
    "paint": {
        "text-color": ["match", ["get", "teema"],
                       "Vedet", WATER_LABEL, "Suojellut kohteet", NATURE_LABEL, PLACE_LABEL],
        "text-halo-color": ["match", ["get", "teema"], "Vedet", WATER, PLACE_HALO],
        "text-halo-width": 1,
    },
})
add({
    "id": "nimisto_luonnopuistot", "type": "symbol", "source-layer": "nimisto",
    "filter": LUONNONPUISTO,
    "layout": {"text-field": NAME, "icon-ignore-placement": True, "icon-allow-overlap": False,
               "text-font": FONT, "visibility": "visible"},
    "paint": {"text-color": NATURE_LABEL, "text-halo-color": EARTH, "text-halo-width": 1},
})
add({
    "id": "nimisto_kunnat", "type": "symbol", "source-layer": "nimisto",
    "filter": ["all", ["==", ["get", "alaryhma"], "Hallintoalueet"], ["==", ["get", "laji"], "Kunta"]],
    "layout": {
        "text-field": NAME,
        "icon-ignore-placement": False,
        "icon-allow-overlap": False,
        "text-size": z(1, 16, 14, 28, base=1.35),
        "text-font": ["step", ["zoom"], ["literal", FONT], 6, ["literal", ["Liberation Sans NLSFI Bold"]]],
    },
    "paint": {"text-color": PLACE_LABEL, "text-halo-color": PLACE_HALO, "text-halo-width": 1},
})

style = {
    "version": 8,
    "name": "NLS Basemap",
    "center": [21.645, 63.101],
    "zoom": 11.35,
    "sources": {S: {"type": "vector", "url": "https://api.joun.in/nls_vectortilejson"}},
    "glyphs": "https://api.joun.in/glyphs/{fontstack}/{range}",
    "id": "NLS-Basemap",
    "metadata": {"hikingtrips:palette": "offtiler hiking (Protomaps light + hiking overlay)"},
    "layers": layers,
}


def fmt(v, ind=0):
    """Objects one key per line, arrays (expressions) inline."""
    if isinstance(v, dict):
        pad = "  " * (ind + 1)
        body = ",\n".join(f"{pad}{json.dumps(k)}: {fmt(x, ind + 1)}" for k, x in v.items())
        return "{\n" + body + "\n" + "  " * ind + "}"
    if isinstance(v, list) and any(isinstance(x, dict) and "id" in x for x in v):
        pad = "  " * (ind + 1)
        return "[\n" + ",\n".join(pad + fmt(x, ind + 1) for x in v) + "\n" + "  " * ind + "]"
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))


out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
out.write_text(fmt(style) + "\n")
print(f"wrote {len(layers)} layers to {out}")

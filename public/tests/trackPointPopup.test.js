import { expect, render } from './imports-test.js';
import { trackPointPopup, nearestTrackPoint } from '../assets/js/leaflet/trackPointPopup.js';

const teardown = [];
afterEach(() => {
    while (teardown.length) teardown.pop()();
});

/** A real map, sized so Leaflet can place things on it, thrown away after. */
function aMap() {
    const container = render(document.createElement('div'));
    container.style.width = '400px';
    container.style.height = '300px';
    const map = L.map(container).setView([69.05, 20.80], 13);
    teardown.push(() => map.remove());
    return map;
}

/** A trackpoint as leaflet-elevation hands it over: the elevation on the LatLng. */
function point(lat, lon, elevation) {
    return L.latLng(lat, lon, elevation);
}

/** A trackpoint as leaflet-gpx hands it over: its readings beside the LatLng. */
function gpxPoint(lat, lon, meta) {
    const latlng = L.latLng(lat, lon);
    latlng.meta = { time: null, ele: null, ...meta };
    return latlng;
}

/** A track on the map, already answering clicks. */
function aTrack(map, latlngs, heading) {
    const track = L.polyline(latlngs).addTo(map);
    trackPointPopup(map).bind(track, heading);
    return track;
}

function clickAt(track, lat, lon) {
    track.fire('click', { latlng: L.latLng(lat, lon) });
}

/** The popup as the reader sees it. */
function openPopup(map) {
    return map.getContainer().querySelector('.trackpoint');
}

/** Where Leaflet put the open popup. */
function popupPosition(map) {
    let position = null;
    map.eachLayer(layer => { if (layer instanceof L.Popup) position = layer.getLatLng(); });
    return position;
}

function textOf(map, selector) {
    return openPopup(map)?.querySelector(selector)?.textContent;
}

const LEG = [
    point(69.047933, 20.797931, 495.8),
    point(69.048193, 20.798774, 501.2),
    point(69.048450, 20.799622, 505.4)
];

describe('clicking a track', () => {

    it('answers with the coordinates of the trackpoint that was hit', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        // Between the first two points, a shade nearer the second.
        clickAt(track, 69.048150, 20.798700);

        expect(textOf(map, '.trackpoint-coordinates')).to.equal('69.04819, 20.79877');
    });

    it('reports a point the track recorded rather than the spot clicked', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        // Well off the end of the track: the nearest recorded point is still an
        // honest answer, and the popup says which point it is reporting.
        clickAt(track, 69.049000, 20.801000);

        expect(textOf(map, '.trackpoint-coordinates')).to.equal('69.04845, 20.79962');
        expect(textOf(map, '.trackpoint-note')).to.equal('nearest trackpoint');
    });

    it('opens the popup on the trackpoint, not where the click landed', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        clickAt(track, 69.048150, 20.798700);

        // The tip is the only thing on the map marking the point being
        // reported, so it has to sit on it and not on the click.
        const at = popupPosition(map);
        expect(at.lat).to.be.closeTo(69.048193, 0.000001);
        expect(at.lng).to.be.closeTo(20.798774, 0.000001);
    });

    it('gives the elevation the track carried', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        clickAt(track, 69.047933, 20.797931);

        expect(textOf(map, '.trackpoint-detail')).to.equal('496 m');
    });

    it('gives the time a recorded track was there', () => {
        const map = aMap();
        const track = aTrack(map, [
            gpxPoint(69.047933, 20.797931, { ele: 495.8, time: new Date('2026-08-18T08:32:21Z') }),
            gpxPoint(69.048193, 20.798774, { ele: 501.2, time: new Date('2026-08-18T08:33:19Z') })
        ]);

        clickAt(track, 69.047933, 20.797931);

        // Named as UTC, because a trip's own zone is only known where a Weather
        // Timeline is configured and must not be quietly assumed here.
        expect(textOf(map, '.trackpoint-detail')).to.equal('496 m · 18 Aug 2026 08:32 UTC');
    });

    it('says nothing about a time a planned route never had', () => {
        const map = aMap();
        // leaflet-gpx stands 1970 in for a trackpoint with no <time>, which is
        // every trackpoint of a route that was drawn rather than walked.
        const track = aTrack(map, [
            gpxPoint(69.047933, 20.797931, { ele: 492.1, time: new Date('1970-01-01T00:00:00') }),
            gpxPoint(69.048193, 20.798774, { ele: 494.3, time: new Date('1970-01-01T00:00:00') })
        ]);

        clickAt(track, 69.047933, 20.797931);

        expect(textOf(map, '.trackpoint-detail')).to.equal('492 m');
    });

    it('answers with the coordinates alone when the track carried nothing else', () => {
        const map = aMap();
        const track = aTrack(map, [L.latLng(69.052988, 20.253875), L.latLng(69.053080, 20.253470)]);

        clickAt(track, 69.052988, 20.253875);

        expect(textOf(map, '.trackpoint-coordinates')).to.equal('69.05299, 20.25388');
        expect(openPopup(map).querySelector('.trackpoint-detail')).to.be.null;
    });

    it('heads the answer with the leg, where the click was on one', () => {
        const map = aMap();
        const track = aTrack(map, LEG, 'Leg 1: 12.40 km (+520 m / -310 m)');

        clickAt(track, 69.047933, 20.797931);

        expect(textOf(map, '.trackpoint-heading')).to.equal('Leg 1: 12.40 km (+520 m / -310 m)');
    });

    it('leaves the heading out where there is no leg to name', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        clickAt(track, 69.047933, 20.797931);

        expect(openPopup(map).querySelector('.trackpoint-heading')).to.be.null;
    });

    it('offers the coordinates for copying', () => {
        const map = aMap();
        const track = aTrack(map, LEG);

        clickAt(track, 69.047933, 20.797931);

        // A coordinate read off a screen is a coordinate typed in by hand
        // somewhere else, which is exactly where the digits get lost.
        expect(openPopup(map).querySelector('.trackpoint-copy')).to.exist;
    });

    it('leaves a leg\'s start and end icons saying what the leg is', () => {
        const map = aMap();
        // A leg read by leaflet-gpx arrives as a group of groups, with the
        // icons among the lines.
        const leg = L.featureGroup([
            L.featureGroup([L.polyline(LEG)]),
            L.marker([69.047933, 20.797931])
        ]).addTo(map);
        trackPointPopup(map).bind(leg, 'Day 5: 21.49 km');

        const icon = leg.getLayers()[1];
        expect(icon.getPopup().getContent()).to.equal('Day 5: 21.49 km');

        // And the line inside the nested group still answers with the point.
        leg.getLayers()[0].getLayers()[0].fire('click', { latlng: L.latLng(69.047933, 20.797931) });
        expect(textOf(map, '.trackpoint-coordinates')).to.equal('69.04793, 20.79793');
    });

    it('reaches every track of a group', () => {
        const map = aMap();
        // The actual route arrives as a group with a layer per Walking Window.
        const group = L.featureGroup([
            L.polyline(LEG),
            L.polyline([point(69.060923, 20.557556, 483.4), point(69.061000, 20.557900, 484.0)])
        ]).addTo(map);
        trackPointPopup(map).bind(group);

        group.getLayers()[1].fire('click', { latlng: L.latLng(69.060923, 20.557556) });

        expect(textOf(map, '.trackpoint-coordinates')).to.equal('69.06092, 20.55756');
    });

});

describe('the nearest trackpoint', () => {

    it('is searched across every ring of a track that was split', () => {
        const map = aMap();
        const track = L.polyline([
            [point(69.047933, 20.797931, 495.8)],
            [point(69.060923, 20.557556, 483.4), point(69.061000, 20.557900, 484.0)]
        ]);

        const nearest = nearestTrackPoint(map, track, L.latLng(69.061000, 20.557900));

        expect(nearest.latlng.lat).to.be.closeTo(69.061000, 0.000001);
        expect(nearest.elevation).to.equal(484.0);
    });

    it('takes the time from the feature when that is where the track keeps it', () => {
        const map = aMap();
        // The shape the actual route really arrives in: one MultiLineString for
        // the whole trip, with a list of times per Walking Window beside it.
        const track = L.polyline([
            [point(69.047933, 20.797931, 495.8), point(69.048193, 20.798774, 501.2)],
            [point(69.060923, 20.557556, 483.4)]
        ]);
        track.feature = {
            properties: {
                coordinateProperties: {
                    times: [
                        ['2026-08-18T08:32:21.000Z', '2026-08-18T08:33:19.000Z'],
                        ['2026-08-19T07:04:11.000Z']
                    ]
                }
            }
        };

        const nearest = nearestTrackPoint(map, track, L.latLng(69.060923, 20.557556));

        expect(nearest.at.toISOString()).to.equal('2026-08-19T07:04:11.000Z');
    });

    it('takes the time from the older spelling too', () => {
        const map = aMap();
        const track = L.polyline([point(69.047933, 20.797931, 495.8), point(69.048193, 20.798774, 501.2)]);
        track.feature = {
            properties: { coordTimes: ['2026-08-18T08:32:21.000Z', '2026-08-18T08:33:19.000Z'] }
        };

        const nearest = nearestTrackPoint(map, track, L.latLng(69.048193, 20.798774));

        expect(nearest.at.toISOString()).to.equal('2026-08-18T08:33:19.000Z');
    });

    it('is nothing at all for a track with no points', () => {
        const map = aMap();

        expect(nearestTrackPoint(map, L.polyline([]), L.latLng(69.05, 20.80))).to.be.null;
    });

});

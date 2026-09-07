import { expect, render } from './imports-test.js';
import { hoverMarker } from '../assets/js/leaflet/hoverMarker.js';

const teardown = [];
afterEach(() => {
    while (teardown.length) teardown.pop()();
});

/** A real map, sized so Leaflet can place things on it, thrown away after. */
function aMap() {
    const container = render(document.createElement('div'));
    container.style.width = '400px';
    container.style.height = '300px';
    const map = L.map(container).setView([69.30, 26.10], 10);
    teardown.push(() => map.remove());
    return map;
}

/** A map already listening for the timeline's hover. */
function mapFollowingTheHover() {
    const map = aMap();
    const marker = hoverMarker(map);
    teardown.push(() => marker.remove());
    return map;
}

/** Whatever the hover put on the map, as Leaflet's own layers. */
function markers(map) {
    const found = [];
    map.eachLayer(layer => { if (layer.getLatLng) found.push(layer); });
    return found;
}

function hover(detail) {
    document.dispatchEvent(new CustomEvent('weather-hover', { detail }));
}

/** The marker as it is drawn on the map, which is what the reader sees. */
function drawnMarker(map) {
    return map.getContainer().querySelector('.weather-hover-position');
}

const WALKING = { latitude: 69.301, longitude: 26.101, at: new Date('2025-07-05T09:30:00Z'), camp: false };
const CAMP = { latitude: 69.311, longitude: 26.111, at: new Date('2025-07-05T22:00:00Z'), camp: true };

describe('the hover marker', () => {

    it('marks where the hiker was when the timeline is hovered', () => {
        const map = mapFollowingTheHover();

        hover(CAMP);

        const placed = markers(map);
        expect(placed).to.have.lengthOf(1);
        expect(placed[0].getLatLng().lat).to.be.closeTo(69.311, 0.0001);
        expect(placed[0].getLatLng().lng).to.be.closeTo(26.111, 0.0001);
    });

    it('draws a position held at Camp differently from one the watch tracked', () => {
        const map = mapFollowingTheHover();

        hover(WALKING);
        expect(drawnMarker(map).classList.contains('walking')).to.be.true;

        hover(CAMP);

        // The two are not the same claim — one is where the hiker was that
        // minute, the other where they were all night — so they must not be
        // read off the map as the same thing.
        expect(drawnMarker(map).classList.contains('camp')).to.be.true;
        expect(drawnMarker(map).classList.contains('walking')).to.be.false;
    });

    it('moves the one marker rather than leaving a trail of them', () => {
        const map = mapFollowingTheHover();

        hover(WALKING);
        hover(CAMP);

        // Dragged across a week of chart, a marker per hovered hour would bury
        // the route it is meant to be pointing at.
        expect(markers(map)).to.have.lengthOf(1);
        expect(markers(map)[0].getLatLng().lat).to.be.closeTo(69.311, 0.0001);
    });

    it('takes the marker off the map when the hover ends', () => {
        const map = mapFollowingTheHover();
        hover(WALKING);

        document.dispatchEvent(new CustomEvent('weather-hover-end'));

        // Nobody is pointing at the chart any more, so nothing on the map is
        // being claimed about.
        expect(markers(map)).to.be.empty;
    });

    it('marks the next hover after one has ended', () => {
        const map = mapFollowingTheHover();
        hover(WALKING);
        document.dispatchEvent(new CustomEvent('weather-hover-end'));

        hover(CAMP);

        expect(markers(map)).to.have.lengthOf(1);
        expect(markers(map)[0].getLatLng().lat).to.be.closeTo(69.311, 0.0001);
    });

    it('stops following once the map is torn down', () => {
        const map = aMap();
        const following = hoverMarker(map);

        following.remove();
        hover(WALKING);

        // A trip is closed by tearing the map down and building the next one;
        // a listener left behind would put this trip's camps on that map.
        expect(markers(map)).to.be.empty;
    });

});

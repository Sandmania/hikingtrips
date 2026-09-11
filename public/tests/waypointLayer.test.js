import { expect, render } from './imports-test.js';
import { waypointLayer } from '../assets/js/leaflet/waypointLayer.js';

const teardown = [];
afterEach(() => {
    while (teardown.length) teardown.pop()();
});

// Real waypoints from moskangaisi2026's combined.gpx. The camp and the photo
// taken at it are about five metres apart; the three photos of one view are
// three metres apart. Nothing about them is exaggerated for the test.
const LEG_1 = { latitude: 69.06092318706214, longitude: 20.55755638517439, sym: '', name: 'Leg 1', desc: '' };
const LEG_3 = { latitude: 68.97329424507916, longitude: 20.36547484807670, sym: '', name: 'Leg 3', desc: '' };
const LEG_4 = { latitude: 68.97327278740704, longitude: 20.36561817862093, sym: '', name: 'Leg 4', desc: '' };
const DSC04009 = photo('DSC04009', 69.06092402525246, 20.55742663331329);
const DSC04101 = photo('DSC04101', 69.00450568646192, 20.33606241457164);
const DSC04102 = photo('DSC04102', 69.00447475723922, 20.33605059608817);
const DSC04103 = photo('DSC04103', 69.00447945110499, 20.33615360967814);

function photo(name, latitude, longitude) {
    return {
        latitude,
        longitude,
        sym: 'Photo',
        name: '',
        desc: `<div class="image-grid"><a href="photos/${name}.jpeg"><img src="photos/thumbs/${name}.jpeg"></a></div>`
    };
}

/** A real map, sized so Leaflet can place things on it, thrown away after. */
function aMap(zoom) {
    const container = render(document.createElement('div'));
    container.style.width = '400px';
    container.style.height = '300px';
    const map = L.map(container).setView([69.00, 20.40], zoom);
    teardown.push(() => map.remove());
    return map;
}

/** The waypoints as they are drawn, which is what the reader can hover. */
function drawn(map, waypoints) {
    const drawing = waypointLayer(map, waypoints);
    teardown.push(() => drawing.remove());
    drawing.layer.addTo(map);
    return drawing;
}

function markers(drawing) {
    return drawing.layer.getLayers();
}

function iconOf(marker) {
    return marker.options.icon.options.html;
}

function badgeOf(marker) {
    return drawnIcon(marker).querySelector('.waypoint-count')?.textContent ?? null;
}

/** Whether the marker also says there are photos behind it. */
function cameraMarkOn(marker) {
    return drawnIcon(marker).querySelector('.waypoint-also.photo') !== null;
}

function drawnIcon(marker) {
    return new DOMParser().parseFromString(iconOf(marker), 'text/html').body;
}

function hoverContent(marker) {
    return marker.getTooltip().getContent();
}

describe('the waypoints on the actual route', () => {

    it('draws a camp and the photo taken at it as one marker', () => {
        const map = aMap(13);

        const drawing = drawn(map, [LEG_1, DSC04009]);

        // Five metres apart: two icons on the same pixel, one of them
        // unreachable, unless they are drawn as one.
        expect(markers(drawing)).to.have.lengthOf(1);
    });

    it('pulls them apart again once the zoom gives them room', () => {
        const map = aMap(13);
        const drawing = drawn(map, [LEG_1, DSC04009]);

        map.setZoom(20);

        expect(markers(drawing)).to.have.lengthOf(2);
    });

    it('shows every photo of a crowded spot in one hover', () => {
        const drawing = drawn(aMap(13), [DSC04101, DSC04102, DSC04103]);

        const [marker] = markers(drawing);
        const body = new DOMParser().parseFromString(hoverContent(marker), 'text/html').body;
        expect(body.querySelectorAll('.image-grid img')).to.have.lengthOf(3);
        expect(badgeOf(marker)).to.equal('3');
    });

    it('stays a bonfire when photos were taken at the camp', () => {
        const drawing = drawn(aMap(13), [LEG_1, DSC04009]);

        const [marker] = markers(drawing);
        // Nearly every camp on these trips has photos taken metres from it, so
        // letting the photos take the icon leaves a map with no camps on it.
        expect(iconOf(marker)).to.contain('waypoint-icon camp');
        expect(cameraMarkOn(marker)).to.be.true;
        expect(hoverContent(marker)).to.contain('Leg 1');
        expect(badgeOf(marker)).to.equal('2');
    });

    it('marks a bonfire that has no photos behind it as such', () => {
        const drawing = drawn(aMap(13), [LEG_3, LEG_4]);

        const [marker] = markers(drawing);
        expect(iconOf(marker)).to.contain('waypoint-icon camp');
        expect(cameraMarkOn(marker)).to.be.false;
        expect(badgeOf(marker)).to.equal('2');
    });

    it('is a camera where there is no camp', () => {
        const drawing = drawn(aMap(13), [DSC04101, DSC04102, DSC04103]);

        const [marker] = markers(drawing);
        expect(iconOf(marker)).to.contain('waypoint-icon photo');
        // The camera mark is what a bonfire wears to say there are photos too;
        // on a camera it would say nothing.
        expect(cameraMarkOn(marker)).to.be.false;
    });

    it('badges a marker only when it stands for more than one thing', () => {
        const drawing = drawn(aMap(13), [DSC04009]);

        expect(badgeOf(markers(drawing)[0])).to.be.null;
    });

    it('sits where the waypoints are, not where there was room', () => {
        const drawing = drawn(aMap(13), [LEG_1, DSC04009]);

        // A merged marker is still a claim about a place, so it must not be
        // nudged off it.
        const { lat, lng } = markers(drawing)[0].getLatLng();
        expect(lat).to.be.closeTo(LEG_1.latitude, 0.0001);
        expect(lng).to.be.closeTo(LEG_1.longitude, 0.0001);
    });

    it('stops redrawing once it is taken off the map', () => {
        const map = aMap(13);
        const drawing = waypointLayer(map, [LEG_1, DSC04009]);
        drawing.layer.addTo(map);

        drawing.remove();
        map.setZoom(20);

        // A trip is closed by tearing the map down and building the next one;
        // a zoom handler left behind would redraw this trip onto that map.
        expect(markers(drawing)).to.be.empty;
        expect(map.hasLayer(drawing.layer)).to.be.false;
    });

});

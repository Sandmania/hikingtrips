import { expect } from './imports-test.js';
import { groupByProximity, mergeGroupContent } from '../assets/js/leaflet/waypointGroups.js';

const SEPARATION = 30;

function at(x, y) {
    return { x, y };
}

function aPhoto(...names) {
    return {
        sym: 'Photo',
        name: '',
        desc: `<div class="image-grid">${names
            .map(name => `<a href="photos/${name}.jpeg" target="_blank"><img src="photos/thumbs/${name}.jpeg"></a>`)
            .join('\n')}</div>`
    };
}

function aCamp(name) {
    return { sym: '', name, desc: '' };
}

function thumbnails(html) {
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    return Array.from(body.querySelectorAll('.image-grid img')).map(img => img.getAttribute('src'));
}

describe('grouping waypoints that crowd each other', () => {

    it('draws waypoints closer together than an icon as one', () => {
        const groups = groupByProximity([at(100, 100), at(104, 103), at(97, 108)], SEPARATION);

        expect(groups).to.have.lengthOf(1);
        expect(groups[0]).to.have.lengthOf(3);
    });

    it('leaves waypoints an icon apart alone', () => {
        const groups = groupByProximity([at(100, 100), at(140, 100), at(180, 100)], SEPARATION);

        expect(groups).to.have.lengthOf(3);
    });

    it('does not chain a line of waypoints into one blob', () => {
        // Photos taken while walking sit along the track, each near the next.
        // Grouping by reach from any member would swallow the whole day.
        const groups = groupByProximity([at(0, 0), at(25, 0), at(50, 0), at(75, 0)], SEPARATION);

        expect(groups).to.have.lengthOf(2);
        expect(groups[0]).to.have.lengthOf(2);
        expect(groups[1]).to.have.lengthOf(2);
    });

    it('keeps the waypoints in the order they were given', () => {
        const first = at(100, 100);
        const second = at(103, 100);

        expect(groupByProximity([first, second], SEPARATION)[0]).to.deep.equal([first, second]);
    });

});

describe('what a group of waypoints shows', () => {

    it('puts every photo of the group in one grid, in order', () => {
        const { html } = mergeGroupContent([aPhoto('DSC04101'), aPhoto('DSC04102'), aPhoto('DSC04103')]);

        const body = new DOMParser().parseFromString(html, 'text/html').body;
        // One grid, not three stacked ones: they are photos of one spot.
        expect(body.querySelectorAll('.image-grid')).to.have.lengthOf(1);
        expect(thumbnails(html)).to.deep.equal([
            'photos/thumbs/DSC04101.jpeg',
            'photos/thumbs/DSC04102.jpeg',
            'photos/thumbs/DSC04103.jpeg'
        ]);
    });

    it('keeps the photos a single waypoint already carried together', () => {
        const { html, items } = mergeGroupContent([aPhoto('DSC03999', 'DSC04001')]);

        expect(thumbnails(html)).to.have.lengthOf(2);
        expect(items).to.equal(2);
    });

    it('heads the photos with the name of the camp they were taken at', () => {
        const { html } = mergeGroupContent([aCamp('Leg 1'), aPhoto('DSC04009')]);

        const body = new DOMParser().parseFromString(html, 'text/html').body;
        expect(body.querySelector('b').textContent).to.equal('Leg 1');
        expect(thumbnails(html)).to.deep.equal(['photos/thumbs/DSC04009.jpeg']);
    });

    it('names every camp of a group that has more than one', () => {
        const { html, items } = mergeGroupContent([aCamp('Leg 3'), aCamp('Leg 4')]);

        const body = new DOMParser().parseFromString(html, 'text/html').body;
        expect(Array.from(body.querySelectorAll('b')).map(b => b.textContent)).to.deep.equal(['Leg 3', 'Leg 4']);
        expect(items).to.equal(2);
    });

    it('leaves no empty heading for a photo that has no name', () => {
        // The waypoints written by the photo tooling carry a description and
        // nothing else, and an empty <b></b> is a blank line above the grid.
        const { html } = mergeGroupContent([aPhoto('DSC04009')]);

        expect(html).to.not.contain('<b>');
    });

    it('counts what the hover shows, so the badge cannot disagree with it', () => {
        const { items } = mergeGroupContent([aCamp('Leg 1'), aPhoto('DSC04009'), aPhoto('DSC04010', 'DSC04011')]);

        expect(items).to.equal(4);
    });

    it('says what kinds of thing the group holds', () => {
        // The icon is chosen from these two, so a group of camps and a group of
        // photos must not answer the same.
        expect(mergeGroupContent([aCamp('Leg 3'), aCamp('Leg 4')])).to.include({ hasPhoto: false, hasCamp: true });
        expect(mergeGroupContent([aPhoto('DSC04009')])).to.include({ hasPhoto: true, hasCamp: false });
        expect(mergeGroupContent([aCamp('Leg 1'), aPhoto('DSC04009')])).to.include({ hasPhoto: true, hasCamp: true });
    });

    it('keeps a description that is not a photo grid', () => {
        const { html } = mergeGroupContent([{ sym: '', name: 'Camp', desc: '<p>Windy all night</p>' }]);

        expect(html).to.contain('Windy all night');
    });

});

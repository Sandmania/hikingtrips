import { render, expect, waitFor } from './imports-test.js';
import '../assets/components/tripCard/TripCard.js';
import '../assets/components/tripGrid/TripGrid.js';

const sampleTrips = [
    { id: 'paistunturi2024', name: 'Paistunturi', dates: '2024-07-15 – 2024-07-22', image: 'paistunturi2024/cover.jpg' },
    { id: 'repovesi2023', name: 'Repovesi', dates: '2023-08-01 – 2023-08-03', image: 'repovesi2023/cover.jpg' },
    { id: 'muotka2025', name: 'Muotka', dates: '2025-03-10 – 2025-03-16', image: 'muotka2025/cover.jpg' },
];

function makeGrid() {
    return document.createElement('trip-grid');
}

describe('TripGrid', () => {

    describe('template structure', () => {
        it('has a grid container in shadow DOM', () => {
            const el = makeGrid();
            render(el);

            expect(el.shadowRoot.querySelector('.grid')).to.exist;
        });

        it('adopts a stylesheet via adoptedStyleSheets', async () => {
            const el = makeGrid();
            render(el);

            await waitFor(() => {
                expect(el.shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
            });
        });
    });

    describe('trips property', () => {
        it('renders a trip-card for each trip', () => {
            const el = makeGrid();
            render(el);
            el.trips = sampleTrips;

            const cards = el.shadowRoot.querySelectorAll('trip-card');
            expect(cards).to.have.lengthOf(3);
        });

        it('passes trip data to each card', () => {
            const el = makeGrid();
            render(el);
            el.trips = sampleTrips;

            const cards = el.shadowRoot.querySelectorAll('trip-card');
            expect(cards[0].shadowRoot.querySelector('.trip-title').textContent).to.equal('Paistunturi');
            expect(cards[1].shadowRoot.querySelector('.trip-title').textContent).to.equal('Repovesi');
            expect(cards[2].shadowRoot.querySelector('.trip-title').textContent).to.equal('Muotka');
        });

        it('replaces previous cards when trips is set again', () => {
            const el = makeGrid();
            render(el);
            el.trips = sampleTrips;

            el.trips = [sampleTrips[0]];

            const cards = el.shadowRoot.querySelectorAll('trip-card');
            expect(cards).to.have.lengthOf(1);
            expect(cards[0].shadowRoot.querySelector('.trip-title').textContent).to.equal('Paistunturi');
        });

        it('renders no cards for an empty array', () => {
            const el = makeGrid();
            render(el);
            el.trips = [];

            const cards = el.shadowRoot.querySelectorAll('trip-card');
            expect(cards).to.have.lengthOf(0);
        });
    });
});

import { render, expect, waitFor } from './imports-test.js';
import '../assets/components/tripCard/TripCard.js';

const sampleTrip = {
    id: 'paistunturi2024',
    name: 'Paistunturi',
    dates: '2024-07-15 – 2024-07-22',
    image: 'paistunturi2024/cover.jpg',
};

function makeCard() {
    return document.createElement('trip-card');
}

describe('TripCard', () => {

    describe('template structure', () => {
        it('has the expected shadow DOM skeleton after construction', () => {
            const el = makeCard();
            render(el);

            expect(el.shadowRoot.querySelector('.trip-card')).to.exist;
            expect(el.shadowRoot.querySelector('.trip-link')).to.exist;
            expect(el.shadowRoot.querySelector('.trip-overlay')).to.exist;
            expect(el.shadowRoot.querySelector('.trip-title')).to.exist;
            expect(el.shadowRoot.querySelector('.trip-dates')).to.exist;
        });

        it('adopts a stylesheet via adoptedStyleSheets', async () => {
            const el = makeCard();
            render(el);

            await waitFor(() => {
                expect(el.shadowRoot.adoptedStyleSheets).to.have.lengthOf(1);
            });
        });
    });

    describe('rendering', () => {
        it('populates title and dates from trip data', () => {
            const el = makeCard();
            render(el);
            el.trip = sampleTrip;

            expect(el.shadowRoot.querySelector('.trip-title').textContent).to.equal('Paistunturi');
            expect(el.shadowRoot.querySelector('.trip-dates').textContent).to.equal('2024-07-15 – 2024-07-22');
        });

        it('sets the link href to the trip id hash', () => {
            const el = makeCard();
            render(el);
            el.trip = sampleTrip;

            const link = el.shadowRoot.querySelector('.trip-link');
            expect(link.getAttribute('href')).to.equal('#paistunturi2024');
        });

        it('sets the background image on the card', () => {
            const el = makeCard();
            render(el);
            el.trip = sampleTrip;

            const card = el.shadowRoot.querySelector('.trip-card');
            expect(card.style.backgroundImage).to.include('paistunturi2024/cover.jpg');
        });

        it('does not render when trip is not set', () => {
            const el = makeCard();
            render(el);

            expect(el.shadowRoot.querySelector('.trip-title').textContent).to.equal('');
            expect(el.shadowRoot.querySelector('.trip-dates').textContent).to.equal('');
        });

        it('updates when trip is changed', () => {
            const el = makeCard();
            render(el);
            el.trip = sampleTrip;

            el.trip = { id: 'repovesi2023', name: 'Repovesi', dates: '2023-08-01 – 2023-08-03', image: 'repovesi2023/cover.jpg' };

            expect(el.shadowRoot.querySelector('.trip-title').textContent).to.equal('Repovesi');
            expect(el.shadowRoot.querySelector('.trip-link').getAttribute('href')).to.equal('#repovesi2023');
        });
    });

    describe('XSS safety', () => {
        it('treats trip name as text, not HTML', () => {
            const el = makeCard();
            render(el);
            el.trip = { ...sampleTrip, name: '<script>alert("xss")</script>' };

            const title = el.shadowRoot.querySelector('.trip-title');
            expect(title.textContent).to.equal('<script>alert("xss")</script>');
            expect(title.querySelector('script')).to.not.exist;
        });
    });
});

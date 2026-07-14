import { render, expect, waitFor } from './imports-test.js';
import '../assets/components/calendar/calendar.js';

// Sample travel data: train to Rovaniemi, stay one night, hike 3 days, stay one night, bus home
const sampleTravelInfo = {
    to: [
        {
            transportation: {
                type: 'train',
                from: 'Helsinki',
                to: 'Rovaniemi',
                outboundDate: '2025-07-01',
                outboundTime: '10:00',
                url: 'https://example.com/ticket',
            },
        },
        {
            accommodation: {
                name: 'Hotel Rovaniemi',
                checkInDate: '2025-07-01',
                checkInTime: '15:00',
                checkOutDate: '2025-07-02',
                checkOutTime: '10:00',
                url: 'https://example.com/hotel',
            },
        },
    ],
    from: [
        {
            accommodation: {
                name: 'Fell Hotel',
                checkInDate: '2025-07-05',
                checkInTime: '14:00',
                checkOutDate: '2025-07-06',
                checkOutTime: '10:00',
                url: 'https://example.com/fell',
            },
        },
        {
            transportation: {
                type: 'bus',
                from: 'Saariselkä',
                to: 'Helsinki',
                outboundDate: '2025-07-06',
                outboundTime: '12:00',
                url: 'https://example.com/bus',
            },
        },
    ],
};

function makeCalendar() {
    return document.createElement('hiking-calendar');
}

describe('HikingCalendar', () => {

    describe('buildEventMap', () => {
        let calendar;
        beforeEach(() => { calendar = makeCalendar(); });

        it('includes travel events on the correct date', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);
            const events = eventMap['2025-07-01'] || [];
            const travelEvent = events.find(e => e.type === 'travel');
            expect(travelEvent).to.exist;
            expect(travelEvent.from).to.equal('Helsinki');
            expect(travelEvent.to).to.equal('Rovaniemi');
            expect(travelEvent.vehicle).to.equal('train');
        });

        it('includes stay check-in and check-out events on their respective dates', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);

            const checkInEvents = (eventMap['2025-07-01'] || []).filter(e => e.type === 'stay');
            expect(checkInEvents).to.have.length.greaterThan(0);
            expect(checkInEvents[0].name).to.equal('Hotel Rovaniemi');

            const checkOutEvents = (eventMap['2025-07-02'] || []).filter(e => e.type === 'stay');
            expect(checkOutEvents).to.have.length.greaterThan(0);
            expect(checkOutEvents[0].name).to.equal('Hotel Rovaniemi');
        });

        it('generates a hike event for each day between last to-checkout and first from-checkin', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);

            // Hike spans 2025-07-02 (checkout) through 2025-07-05 (checkin)
            for (const date of ['2025-07-02', '2025-07-03', '2025-07-04', '2025-07-05']) {
                const hikeEvent = (eventMap[date] || []).find(e => e.type === 'hike');
                expect(hikeEvent, `expected hike event on ${date}`).to.exist;
            }
        });

        it('does not generate hike events outside the hike window', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);

            for (const date of ['2025-07-01', '2025-07-06']) {
                const hikeEvent = (eventMap[date] || []).find(e => e.type === 'hike');
                expect(hikeEvent, `unexpected hike event on ${date}`).to.not.exist;
            }
        });

        it('sets a time close after hikeStart for the first hike day', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);
            const firstDayHike = (eventMap['2025-07-02'] || []).find(e => e.type === 'hike');
            expect(firstDayHike).to.exist;
            // time should be 15 minutes after 10:00 = 10:15
            expect(firstDayHike.time).to.equal('10:15');
        });

        it('sets a time 2 hours before hikeEnd for the last hike day', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);
            const lastDayHike = (eventMap['2025-07-05'] || []).find(e => e.type === 'hike');
            expect(lastDayHike).to.exist;
            // time should be 2 hours before 14:00 = 12:00
            expect(lastDayHike.time).to.equal('12:00');
        });

        it('events within a day are sorted by time', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);
            const day = eventMap['2025-07-01'] || [];
            for (let i = 1; i < day.length; i++) {
                expect(day[i].isoDateTime.getTime()).to.be.at.least(day[i - 1].isoDateTime.getTime());
            }
        });

        it('returns an empty map when given empty directions', () => {
            const eventMap = calendar.buildEventMap({ to: [], from: [] });
            expect(Object.keys(eventMap)).to.have.lengthOf(0);
        });
    });

    describe('calculateHikeDateTimes', () => {
        let calendar;
        beforeEach(() => { calendar = makeCalendar(); });

        it('sets hikeStart to the latest checkout date in the "to" direction', () => {
            const { hikeStart } = calendar.calculateHikeDateTimes(sampleTravelInfo);
            expect(hikeStart).to.be.instanceOf(Date);
            expect(hikeStart.toISOString().slice(0, 10)).to.equal('2025-07-02');
        });

        it('sets hikeEnd to the earliest checkin date in the "from" direction', () => {
            const { hikeEnd } = calendar.calculateHikeDateTimes(sampleTravelInfo);
            expect(hikeEnd).to.be.instanceOf(Date);
            expect(hikeEnd.toISOString().slice(0, 10)).to.equal('2025-07-05');
        });

        it('returns null for hikeStart and hikeEnd when directions are empty', () => {
            const { hikeStart, hikeEnd } = calendar.calculateHikeDateTimes({ to: [], from: [] });
            expect(hikeStart).to.be.null;
            expect(hikeEnd).to.be.null;
        });
    });

    describe('getInitialYearMonth', () => {
        let calendar;
        beforeEach(() => { calendar = makeCalendar(); });

        it('returns the year and month of the first event', () => {
            const eventMap = calendar.buildEventMap(sampleTravelInfo);
            const { year, month } = calendar.getInitialYearMonth(eventMap);
            expect(year).to.equal(2025);
            expect(month).to.equal(7);
        });

        it('falls back to the current month when the eventMap is empty', () => {
            const now = new Date();
            const { year, month } = calendar.getInitialYearMonth({});
            expect(year).to.equal(now.getFullYear());
            expect(month).to.equal(now.getMonth() + 1);
        });
    });

    describe('rendering', () => {
        it('renders a calendar table with the correct month caption', async () => {
            const el = makeCalendar();
            render(el);
            el.setTravelInfo(sampleTravelInfo);

            await waitFor(() => {
                const caption = el.shadowRoot.querySelector('.calendar-header');
                expect(caption).to.exist;
                expect(caption.textContent).to.include('July');
                expect(caption.textContent).to.include('2025');
            });
        });

        it('renders date cells for every day in the month', async () => {
            const el = makeCalendar();
            render(el);
            el.setTravelInfo(sampleTravelInfo);

            await waitFor(() => {
                const cells = el.shadowRoot.querySelectorAll('.date-cell');
                expect(cells.length).to.equal(31); // July has 31 days
            });
        });

        it('date cells carry a data-date attribute in YYYY-MM-DD format', async () => {
            const el = makeCalendar();
            render(el);
            el.setTravelInfo(sampleTravelInfo);

            await waitFor(() => {
                const cell = el.shadowRoot.querySelector('[data-date="2025-07-01"]');
                expect(cell).to.exist;
            });
        });

        it('a day with only one event type gets that type as a CSS class', async () => {
            const el = makeCalendar();
            render(el);
            el.setTravelInfo(sampleTravelInfo);

            await waitFor(() => {
                // 2025-07-03 and 2025-07-04 are pure hike days
                const cell = el.shadowRoot.querySelector('[data-date="2025-07-03"]');
                expect(cell).to.exist;
                expect(cell.classList.contains('hike')).to.be.true;
            });
        });

        it('a day with mixed events gets a gradient background instead of a single class', async () => {
            const el = makeCalendar();
            render(el);
            el.setTravelInfo(sampleTravelInfo);

            await waitFor(() => {
                // 2025-07-01 has travel + stay
                const cell = el.shadowRoot.querySelector('[data-date="2025-07-01"]');
                expect(cell).to.exist;
                const bg = cell.style.getPropertyValue('--cell-background');
                expect(bg).to.include('linear-gradient');
            });
        });

        it('does not render when setTravelInfo has not been called', () => {
            const el = makeCalendar();
            render(el);
            const table = el.shadowRoot.querySelector('table');
            expect(table).to.not.exist;
        });
    });
});

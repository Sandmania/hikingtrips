import { render, expect, waitFor } from './imports-test.js';
import '../assets/components/packDetails/PackDetails.js';

const SAMPLE_CSV = [
    'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable',
    'Tent,Shelter,Lightweight tent,1,1200,gram,,0,,',
    'Sleeping Bag,Shelter,Down bag,1,800,gram,,0,,',
    'Rain Jacket,Clothing,Waterproof,1,300,gram,,0,worn,',
    'Trail Mix,Food,Nuts and berries,2,150,gram,,0,,consumable',
].join('\n');

// Expected weights from SAMPLE_CSV:
// Shelter: 1200 + 800 = 2000
// Clothing: 300 (worn)
// Food: 2 * 150 = 300 (consumable)
// Grand Total: 2600
// Base Weight: 2600 - 300 (worn) - 300 (consumable) = 2000
// Carried Weight: 2000 + 300 = 2300

function makePackDetails() {
    return document.createElement('tt-pack-details');
}

describe('PackDetails', () => {

    describe('parseCsv', () => {
        let el;
        beforeEach(() => { el = makePackDetails(); });

        it('parses CSV into an array of objects with correct headers', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            expect(items).to.have.lengthOf(4);
            expect(items[0]['Item Name']).to.equal('Tent');
            expect(items[0].Category).to.equal('Shelter');
            expect(items[0].qty).to.equal('1');
            expect(items[0].weight).to.equal('1200');
        });

        it('handles quoted fields containing commas', () => {
            const csv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable\n"Tent, poles & bag",Shelter,"Big, roomy",1,1500,gram,,0,,';
            const items = el.parseCsv(csv);
            expect(items[0]['Item Name']).to.equal('Tent, poles & bag');
            expect(items[0].desc).to.equal('Big, roomy');
        });

        it('handles escaped double quotes inside quoted fields', () => {
            const csv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable\n"The ""Best"" Tent",Shelter,Good,1,1000,gram,,0,,';
            const items = el.parseCsv(csv);
            expect(items[0]['Item Name']).to.equal('The "Best" Tent');
        });

        it('returns empty array for header-only CSV', () => {
            const csv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable';
            const items = el.parseCsv(csv);
            expect(items).to.have.lengthOf(0);
        });

        it('returns empty array for empty input', () => {
            expect(el.parseCsv('')).to.have.lengthOf(0);
        });

        it('returns empty array for whitespace-only input', () => {
            expect(el.parseCsv('  \n \r\n\t\n')).to.have.lengthOf(0);
        });
    });

    describe('categorizeItems', () => {
        let el;
        beforeEach(() => { el = makePackDetails(); });

        it('groups items by their Category field', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            expect(Object.keys(categories)).to.have.lengthOf(3);
            expect(categories['Shelter']).to.have.lengthOf(2);
            expect(categories['Clothing']).to.have.lengthOf(1);
            expect(categories['Food']).to.have.lengthOf(1);
        });

        it('uses Uncategorized when Category is missing', () => {
            const items = [{ 'Item Name': 'Mystery Item', qty: '1', weight: '100', unit: 'gram', worn: '', consumable: '' }];
            const categories = el.categorizeItems(items);
            expect(categories['Uncategorized']).to.have.lengthOf(1);
        });
    });

    describe('render — weight calculations', () => {
        let el;
        beforeEach(() => {
            el = makePackDetails();
            render(el);
        });

        it('computes correct category totals', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            el.render(categories);

            const catTotals = el.shadowRoot.querySelectorAll('.category-total');
            const totals = Array.from(catTotals).map(t => t.textContent);
            expect(totals).to.include('2000 g'); // Shelter
            expect(totals).to.include('300 g');  // Clothing & Food
        });

        it('computes Base Weight = Grand Total - Worn - Consumable', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            el.render(categories);

            const baseWeight = el.shadowRoot.querySelector('.base-weight');
            expect(baseWeight.textContent).to.include('2000 g');
        });

        it('computes Carried Weight = Base Weight + Consumable', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            el.render(categories);

            const carriedWeight = el.shadowRoot.querySelector('.carried-weight');
            expect(carriedWeight.textContent).to.include('2300 g');
        });

        it('renders worn and consumable weight summaries', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            el.render(categories);

            const wornWeight = el.shadowRoot.querySelector('.worn-weight');
            expect(wornWeight.textContent).to.include('300 g');

            const consumableWeight = el.shadowRoot.querySelector('.consumable-weight');
            expect(consumableWeight.textContent).to.include('300 g');
        });

        it('renders a summary container', () => {
            const items = el.parseCsv(SAMPLE_CSV);
            const categories = el.categorizeItems(items);
            el.render(categories);

            const summary = el.shadowRoot.querySelector('.summary-container');
            expect(summary).to.exist;
        });
    });

    describe('csvUrl setter and clear', () => {
        let el;
        beforeEach(() => {
            el = makePackDetails();
            render(el);
        });

        it('setting csvUrl to a URL loads and renders items', async () => {
            // Stub fetch to return our sample CSV
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SAMPLE_CSV) });

            try {
                el.csvUrl = '/fake/pack.csv';

                await waitFor(() => {
                    const items = el.shadowRoot.querySelectorAll('.item');
                    expect(items.length).to.equal(4);
                });
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('setting csvUrl to null clears output and hides details', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SAMPLE_CSV) });

            try {
                el.csvUrl = '/fake/pack.csv';

                await waitFor(() => {
                    const items = el.shadowRoot.querySelectorAll('.item');
                    expect(items.length).to.equal(4);
                });

                el.csvUrl = null;

                const output = el.shadowRoot.querySelector('#output');
                expect(output.innerHTML).to.equal('');
                const details = el.shadowRoot.querySelector('#details');
                expect(details.classList.contains('hidden')).to.be.true;
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('re-setting csvUrl replaces previous content', async () => {
            const shortCsv = 'Item Name,Category,desc,qty,weight,unit,url,price,worn,consumable\nKnife,Tools,Sharp,1,50,gram,,0,,';
            const originalFetch = window.fetch;
            let currentCsv = SAMPLE_CSV;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(currentCsv) });

            try {
                el.csvUrl = '/fake/pack.csv';

                await waitFor(() => {
                    const items = el.shadowRoot.querySelectorAll('.item');
                    expect(items.length).to.equal(4);
                });

                currentCsv = shortCsv;
                el.csvUrl = '/fake/other.csv';

                await waitFor(() => {
                    const items = el.shadowRoot.querySelectorAll('.item');
                    expect(items.length).to.equal(1);
                });
            } finally {
                window.fetch = originalFetch;
            }
        });
    });

    describe('toggleDetails', () => {
        let el;
        beforeEach(() => {
            el = makePackDetails();
            render(el);
        });

        it('toggles hidden class on #details div', () => {
            const details = el.shadowRoot.querySelector('#details');
            expect(details.classList.contains('hidden')).to.be.true;

            el.toggleDetails();
            expect(details.classList.contains('hidden')).to.be.false;

            el.toggleDetails();
            expect(details.classList.contains('hidden')).to.be.true;
        });

        it('responds to toggle-pack-details custom event', () => {
            const details = el.shadowRoot.querySelector('#details');
            expect(details.classList.contains('hidden')).to.be.true;

            document.dispatchEvent(new CustomEvent('toggle-pack-details'));
            expect(details.classList.contains('hidden')).to.be.false;
        });
    });

    describe('disconnectedCallback', () => {
        it('stops responding to toggle-pack-details after removal from DOM', () => {
            const el = makePackDetails();
            render(el);

            const details = el.shadowRoot.querySelector('#details');
            expect(details.classList.contains('hidden')).to.be.true;

            // Remove from DOM
            el.remove();

            // Event should no longer toggle
            document.dispatchEvent(new CustomEvent('toggle-pack-details'));
            expect(details.classList.contains('hidden')).to.be.true;
        });
    });
});

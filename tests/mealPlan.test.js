import { render, expect, waitFor } from './imports-test.js';
import '../assets/components/macroChart/MacroChart.js';
import '../assets/components/mealPlan/MealPlan.js';

const SINGLE_PERSON_CSV = [
    'Day,PersonIndex,MealType,Name,Brand,Net Weight,Gross Weight,CaloriesPortion,ProteinPortion,FatPortion,CarbsPortion,Calories100g,Protein100g,Fat100g,Carbs100g,MainCarb,PrimaryProtein',
    '1,1,Breakfast,Porridge with ham,Voyager,120,140,492,27.0,18.0,55.0,410,23.0,15.0,45.0,GRAIN,PORK',
    '1,1,Lunch,Cod Brandade,Voyager,110,130,431,17.0,9.2,67.0,392,16.0,8.4,61.0,POTATO,FISH',
    '1,1,Dinner,Chicken Curry,Voyager,150,172,650,25.0,21.0,88.0,434,17.0,14.0,59.0,RICE,POULTRY',
    '1,1,Snack,Protein Bar,Maxim,55,,204,16.0,9.2,20.0,372,29.0,17.0,36.0,NONE,VEGETARIAN',
    '2,1,Breakfast,Porridge with ham,Voyager,120,140,492,27.0,18.0,55.0,410,23.0,15.0,45.0,GRAIN,PORK',
    '2,1,Lunch,Quinoa with lentils,Voyager,135,156,514,24.0,14.0,66.0,381,18.0,10.0,49.0,GRAIN,VEGETARIAN',
    '2,1,Dinner,Beef with rice,Voyager,185,204,1023,33.0,65.0,74.0,553,18.0,35.0,40.0,RICE,BEEF',
].join('\n');

const MULTI_PERSON_CSV = [
    'Day,PersonIndex,MealType,Name,Brand,Net Weight,Gross Weight,CaloriesPortion,ProteinPortion,FatPortion,CarbsPortion,Calories100g,Protein100g,Fat100g,Carbs100g,MainCarb,PrimaryProtein',
    '1,1,Breakfast,Porridge with ham,Voyager,120,140,492,27.0,18.0,55.0,410,23.0,15.0,45.0,GRAIN,PORK',
    '1,1,Lunch,Cod Brandade,Voyager,110,130,431,17.0,9.2,67.0,392,16.0,8.4,61.0,POTATO,FISH',
    '1,2,Breakfast,Muesli,Brand X,100,120,400,15.0,10.0,60.0,400,15.0,10.0,60.0,GRAIN,VEGETARIAN',
    '1,2,Lunch,Pasta Bolognese,Brand Y,200,230,700,30.0,20.0,80.0,350,15.0,10.0,40.0,PASTA,BEEF',
].join('\n');

function makeMealPlan() {
    return document.createElement('tt-meal-plan');
}

describe('MealPlan', () => {

    describe('parseCsv', () => {
        let el;
        beforeEach(() => { el = makeMealPlan(); });

        it('parses CSV into array of row objects with correct headers', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            expect(rows).to.have.lengthOf(7);
            expect(rows[0].Name).to.equal('Porridge with ham');
            expect(rows[0].Brand).to.equal('Voyager');
            expect(rows[0].Day).to.equal('1');
            expect(rows[0].PersonIndex).to.equal('1');
            expect(rows[0].MealType).to.equal('Breakfast');
        });

        it('handles quoted fields containing commas', () => {
            const csv = 'Day,PersonIndex,MealType,Name,Brand,Net Weight,Gross Weight,CaloriesPortion,ProteinPortion,FatPortion,CarbsPortion,Calories100g,Protein100g,Fat100g,Carbs100g,MainCarb,PrimaryProtein\n1,1,Dinner,"Chicken, Rice & Vegetables",Voyager,150,172,650,25.0,21.0,88.0,434,17.0,14.0,59.0,RICE,POULTRY';
            const rows = el.parseCsv(csv);
            expect(rows[0].Name).to.equal('Chicken, Rice & Vegetables');
        });

        it('returns empty array for header-only CSV', () => {
            const csv = 'Day,PersonIndex,MealType,Name,Brand,Net Weight,Gross Weight,CaloriesPortion,ProteinPortion,FatPortion,CarbsPortion,Calories100g,Protein100g,Fat100g,Carbs100g,MainCarb,PrimaryProtein';
            const rows = el.parseCsv(csv);
            expect(rows).to.have.lengthOf(0);
        });
    });

    describe('structureData', () => {
        let el;
        beforeEach(() => { el = makeMealPlan(); });

        it('groups rows by person', () => {
            const rows = el.parseCsv(MULTI_PERSON_CSV);
            const data = el.structureData(rows);
            expect(data.persons).to.have.lengthOf(2);
            expect(data.persons[0].index).to.equal(1);
            expect(data.persons[1].index).to.equal(2);
        });

        it('groups rows by day within a person', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            expect(data.persons[0].days).to.have.lengthOf(2);
            expect(data.persons[0].days[0].day).to.equal(1);
            expect(data.persons[0].days[1].day).to.equal(2);
        });

        it('groups rows by meal type within a day', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            const day1 = data.persons[0].days[0];
            expect(day1.meals.Breakfast).to.have.lengthOf(1);
            expect(day1.meals.Lunch).to.have.lengthOf(1);
            expect(day1.meals.Dinner).to.have.lengthOf(1);
            expect(day1.meals.Snack).to.have.lengthOf(1);
        });

        it('uses gross weight when available', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            const breakfast = data.persons[0].days[0].meals.Breakfast[0];
            expect(breakfast.weight).to.equal(140); // gross weight
        });

        it('falls back to net weight when gross weight is missing', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            const snack = data.persons[0].days[0].meals.Snack[0];
            expect(snack.weight).to.equal(55); // net weight (no gross)
            expect(snack.grossWeight).to.be.null;
        });

        it('computes correct day-level aggregates', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            const day1 = data.persons[0].days[0];
            // 140 + 130 + 172 + 55 = 497
            expect(day1.totalWeight).to.equal(497);
            // 492 + 431 + 650 + 204 = 1777
            expect(day1.totalCalories).to.equal(1777);
        });

        it('computes correct person-level totals', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            const totals = data.persons[0].totals;
            // Day 1: 1777 + Day 2: 492 + 514 + 1023 = 2029 → total = 3806
            expect(totals.calories).to.equal(3806);
        });

        it('returns single person for single-person CSV', () => {
            const rows = el.parseCsv(SINGLE_PERSON_CSV);
            const data = el.structureData(rows);
            expect(data.persons).to.have.lengthOf(1);
        });
    });

    describe('summary view (drill level 0)', () => {
        let el;
        beforeEach(() => {
            el = makeMealPlan();
            render(el);
        });

        it('renders summary view with totals after CSV load', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    const summary = el.shadowRoot.querySelector('.summary-view');
                    expect(summary).to.exist;
                });

                const statValues = el.shadowRoot.querySelectorAll('.stat-value');
                const texts = Array.from(statValues).map(s => s.textContent);
                // Should have total weight, total calories, days, avg cal/day
                expect(texts).to.have.lengthOf(4);
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('renders macro chart in summary', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    const chart = el.shadowRoot.querySelector('tt-macro-chart');
                    expect(chart).to.exist;
                    expect(chart.getAttribute('protein')).to.exist;
                    expect(chart.getAttribute('fat')).to.exist;
                    expect(chart.getAttribute('carbs')).to.exist;
                });
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('shows drill link to daily breakdown', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    const link = el.shadowRoot.querySelector('.drill-link');
                    expect(link).to.exist;
                    expect(link.textContent).to.include('daily');
                });
            } finally {
                window.fetch = originalFetch;
            }
        });
    });

    describe('daily view (drill level 1)', () => {
        let el;
        let originalFetch;

        beforeEach(async () => {
            el = makeMealPlan();
            render(el);

            originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            el.csvUrl = '/fake/meal.csv';

            await waitFor(() => {
                expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
            });
        });

        afterEach(() => {
            window.fetch = originalFetch;
        });

        it('shows daily view when drill link is clicked', () => {
            el._drillLevel = 1;
            el._renderView();

            const daily = el.shadowRoot.querySelector('.daily-view');
            expect(daily).to.exist;
        });

        it('renders a row per day', () => {
            el._drillLevel = 1;
            el._renderView();

            const dayRows = el.shadowRoot.querySelectorAll('.day-row');
            expect(dayRows).to.have.lengthOf(2);
        });

        it('displays day title and stats', () => {
            el._drillLevel = 1;
            el._renderView();

            const dayTitle = el.shadowRoot.querySelector('.day-title');
            expect(dayTitle.textContent).to.include('Day 1');

            const dayStats = el.shadowRoot.querySelector('.day-stats');
            expect(dayStats.textContent).to.include('kcal');
            expect(dayStats.textContent).to.include('P:');
            expect(dayStats.textContent).to.include('F:');
            expect(dayStats.textContent).to.include('C:');
        });

        it('displays meals grouped by type', () => {
            el._drillLevel = 1;
            el._renderView();

            const mealTypeLabels = el.shadowRoot.querySelectorAll('.meal-type-label');
            const labels = Array.from(mealTypeLabels).map(l => l.textContent);
            expect(labels).to.include('Breakfast');
            expect(labels).to.include('Lunch');
            expect(labels).to.include('Dinner');
        });

        it('shows meal name, brand and calories', () => {
            el._drillLevel = 1;
            el._renderView();

            const mealItems = el.shadowRoot.querySelectorAll('.meal-item');
            expect(mealItems.length).to.be.greaterThan(0);

            const first = mealItems[0];
            expect(first.querySelector('.meal-name').textContent).to.include('Porridge');
            expect(first.querySelector('.meal-brand').textContent).to.include('Voyager');
            expect(first.querySelector('.meal-calories').textContent).to.include('kcal');
        });

        it('shows back link to summary', () => {
            el._drillLevel = 1;
            el._renderView();

            const backLink = el.shadowRoot.querySelector('.back-link');
            expect(backLink).to.exist;
            expect(backLink.textContent).to.include('Summary');
        });
    });

    describe('day detail view (drill level 2)', () => {
        let el;
        let originalFetch;

        beforeEach(async () => {
            el = makeMealPlan();
            render(el);

            originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            el.csvUrl = '/fake/meal.csv';

            await waitFor(() => {
                expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
            });
        });

        afterEach(() => {
            window.fetch = originalFetch;
        });

        it('shows detail view for a specific day', () => {
            el._drillLevel = 2;
            el._selectedDay = 1;
            el._renderView();

            const detail = el.shadowRoot.querySelector('.detail-view');
            expect(detail).to.exist;
        });

        it('displays all field CSS classes for visibility control', () => {
            el._drillLevel = 2;
            el._selectedDay = 1;
            el._renderView();

            const fieldClasses = [
                '.field-name', '.field-brand', '.field-net-weight', '.field-gross-weight',
                '.field-calories', '.field-protein', '.field-fat', '.field-carbs',
                '.field-calories100g', '.field-protein100g', '.field-fat100g', '.field-carbs100g',
                '.field-main-carb', '.field-primary-protein'
            ];

            fieldClasses.forEach(cls => {
                const elements = el.shadowRoot.querySelectorAll(cls);
                expect(elements.length, `Expected elements with class ${cls}`).to.be.greaterThan(0);
            });
        });

        it('shows back link to daily view', () => {
            el._drillLevel = 2;
            el._selectedDay = 1;
            el._renderView();

            const backLink = el.shadowRoot.querySelector('.back-link');
            expect(backLink).to.exist;
            expect(backLink.textContent).to.include('Daily');
        });

        it('shows meal sections grouped by type', () => {
            el._drillLevel = 2;
            el._selectedDay = 1;
            el._renderView();

            const sections = el.shadowRoot.querySelectorAll('.detail-meal-type');
            const types = Array.from(sections).map(s => s.textContent);
            expect(types).to.include('Breakfast');
            expect(types).to.include('Lunch');
            expect(types).to.include('Dinner');
        });
    });

    describe('person tabs', () => {
        let el;
        beforeEach(() => {
            el = makeMealPlan();
            render(el);
        });

        it('does not render tabs for single-person data', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
                });

                const tabs = el.shadowRoot.querySelectorAll('.person-tab');
                expect(tabs).to.have.lengthOf(0);
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('renders tabs for multi-person data', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(MULTI_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
                });

                const tabs = el.shadowRoot.querySelectorAll('.person-tab');
                expect(tabs).to.have.lengthOf(2);
                expect(tabs[0].textContent).to.include('Person 1');
                expect(tabs[1].textContent).to.include('Person 2');
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('defaults to person 1 selected', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(MULTI_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    const tabs = el.shadowRoot.querySelectorAll('.person-tab');
                    expect(tabs).to.have.lengthOf(2);
                });

                const activeTab = el.shadowRoot.querySelector('.person-tab.active');
                expect(activeTab.textContent).to.include('Person 1');
            } finally {
                window.fetch = originalFetch;
            }
        });

        it('switching person resets drill level to summary', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(MULTI_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
                });

                // Drill into daily view
                el._drillLevel = 1;
                el._renderView();
                expect(el.shadowRoot.querySelector('.daily-view')).to.exist;

                // Click person 2 tab
                const tabs = el.shadowRoot.querySelectorAll('.person-tab');
                tabs[1].click();

                // Should reset to summary
                expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
                expect(el._selectedPerson).to.equal(1); // index 1 = person 2
            } finally {
                window.fetch = originalFetch;
            }
        });
    });

    describe('toggle and lifecycle', () => {
        let el;
        beforeEach(() => {
            el = makeMealPlan();
            render(el);
        });

        it('toggles hidden class on #meal-plan div', () => {
            const container = el.shadowRoot.querySelector('#meal-plan');
            expect(container.classList.contains('hidden')).to.be.true;

            el.toggleDetails();
            expect(container.classList.contains('hidden')).to.be.false;

            el.toggleDetails();
            expect(container.classList.contains('hidden')).to.be.true;
        });

        it('responds to toggle-meal-plan custom event', () => {
            const container = el.shadowRoot.querySelector('#meal-plan');
            expect(container.classList.contains('hidden')).to.be.true;

            document.dispatchEvent(new CustomEvent('toggle-meal-plan'));
            expect(container.classList.contains('hidden')).to.be.false;
        });

        it('stops responding after removal from DOM', () => {
            const container = el.shadowRoot.querySelector('#meal-plan');
            expect(container.classList.contains('hidden')).to.be.true;

            el.remove();

            document.dispatchEvent(new CustomEvent('toggle-meal-plan'));
            expect(container.classList.contains('hidden')).to.be.true;
        });

        it('setting csvUrl to null clears output and hides', async () => {
            const originalFetch = window.fetch;
            window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SINGLE_PERSON_CSV) });

            try {
                el.csvUrl = '/fake/meal.csv';

                await waitFor(() => {
                    expect(el.shadowRoot.querySelector('.summary-view')).to.exist;
                });

                el.csvUrl = null;

                const output = el.shadowRoot.querySelector('#output');
                expect(output.innerHTML).to.equal('');
                const container = el.shadowRoot.querySelector('#meal-plan');
                expect(container.classList.contains('hidden')).to.be.true;
            } finally {
                window.fetch = originalFetch;
            }
        });
    });
});

describe('MacroChart', () => {
    it('renders a donut with conic-gradient', () => {
        const chart = document.createElement('tt-macro-chart');
        chart.setAttribute('protein', '25');
        chart.setAttribute('fat', '20');
        chart.setAttribute('carbs', '55');
        render(chart);

        const donut = chart.shadowRoot.querySelector('.donut');
        expect(donut).to.exist;
        expect(donut.style.background).to.include('conic-gradient');
    });

    it('renders percentage labels in legend', () => {
        const chart = document.createElement('tt-macro-chart');
        chart.setAttribute('protein', '30');
        chart.setAttribute('fat', '30');
        chart.setAttribute('carbs', '40');
        render(chart);

        const legend = chart.shadowRoot.querySelector('.legend');
        expect(legend.textContent).to.include('Protein');
        expect(legend.textContent).to.include('Fat');
        expect(legend.textContent).to.include('Carbs');
        expect(legend.textContent).to.include('%');
    });

    it('updates when attributes change', () => {
        const chart = document.createElement('tt-macro-chart');
        chart.setAttribute('protein', '10');
        chart.setAttribute('fat', '10');
        chart.setAttribute('carbs', '10');
        render(chart);

        const legendBefore = chart.shadowRoot.querySelector('.legend').textContent;

        chart.setAttribute('protein', '50');
        const legendAfter = chart.shadowRoot.querySelector('.legend').textContent;

        expect(legendBefore).to.not.equal(legendAfter);
    });

    it('handles zero values gracefully', () => {
        const chart = document.createElement('tt-macro-chart');
        chart.setAttribute('protein', '0');
        chart.setAttribute('fat', '0');
        chart.setAttribute('carbs', '0');
        render(chart);

        const donut = chart.shadowRoot.querySelector('.donut');
        expect(donut).to.exist;
        // Should show a grey fallback, not crash
        expect(donut.style.background).to.include('rgb(238, 238, 238)');
    });
});

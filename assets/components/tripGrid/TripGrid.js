customElements.define('trip-grid', class extends HTMLElement {
    static styleSheet = fetchCSS(['../assets/components/tripGrid/TripGrid.css']);
    static template = Object.assign(document.createElement('template'), {
        innerHTML: `
            <div class="grid"></div>
        `
    });

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(
            this.constructor.template.content.cloneNode(true)
        );
    }

    connectedCallback() {
        if (this.shadowRoot.adoptedStyleSheets.length === 0) {
            this.constructor.styleSheet.then((sheet) => {
                this.shadowRoot.adoptedStyleSheets = [sheet];
            });
        }
    }

    set trips(value) {
        this._trips = value;
        this.renderTrips(value);
    }

    renderTrips(trips) {
        const grid = this.shadowRoot.querySelector('.grid');
        grid.innerHTML = '';
        trips.forEach(trip => {
            const card = document.createElement('trip-card');
            card.trip = trip;
            grid.appendChild(card);
        });
    }
});

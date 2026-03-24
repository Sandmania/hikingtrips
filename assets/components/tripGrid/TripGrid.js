class TripGrid extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 2rem;
                    padding: 2rem;
                }

                @media (max-width: 980px) {
                    .grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <div class="grid"></div>
        `;
    }

    connectedCallback() {
        this.loadTrips();
    }

    async loadTrips() {
        try {
            const response = await fetch('trips.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch trips.json: ${response.status} ${response.statusText}`);
            }
            const trips = await response.json();
            this.renderTrips(trips);
        } catch (err) {
            console.error('TripGrid: could not load trips.json', err);
        }
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
}

customElements.define('trip-grid', TripGrid);

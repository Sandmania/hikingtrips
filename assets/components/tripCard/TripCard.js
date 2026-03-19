class TripCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set trip(value) {
        this._trip = value;
        this.render();
    }

    render() {
        if (!this._trip) return;
        const { id, name, dates, image } = this._trip;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .trip-card {
                    position: relative;
                    height: 320px;
                    border-radius: 1rem;
                    overflow: hidden;
                    background-size: cover;
                    background-position: center;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
                    transition: transform 0.2s;
                }

                .trip-card:hover {
                    transform: scale(1.03);
                }

                .trip-link {
                    display: block;
                    height: 100%;
                    text-decoration: none;
                    color: inherit;
                }

                .trip-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(20, 20, 20, 0.55);
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding: 2rem;
                    transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .trip-card:hover .trip-overlay {
                    background: rgba(20, 20, 20, 0.25);
                }

                .trip-title {
                    margin: 0;
                    font-size: 1.6rem;
                    font-weight: bold;
                }

                .trip-dates {
                    margin: 0.5rem 0 0 0;
                    font-size: 1.1rem;
                    font-weight: 400;
                    opacity: 0.85;
                }

                @media (max-width: 980px) {
                    .trip-title { font-size: 2rem; }
                    .trip-dates { font-size: 1.3rem; }
                }
            </style>

            <div class="trip-card" style="background-image: url('${image}')">
                <a class="trip-link" href="#${id}">
                    <div class="trip-overlay">
                        <h2 class="trip-title">${name}</h2>
                        <h3 class="trip-dates">${dates}</h3>
                    </div>
                </a>
            </div>
        `;
    }
}

customElements.define('trip-card', TripCard);

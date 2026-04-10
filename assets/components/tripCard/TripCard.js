customElements.define('trip-card', class extends HTMLElement {
    static styleSheet = fetchCSS(['../assets/components/tripCard/TripCard.css']);
    static template = Object.assign(document.createElement('template'), {
        innerHTML: `
            <div class="trip-card">
                <a class="trip-link">
                    <div class="trip-overlay">
                        <h2 class="trip-title"></h2>
                        <h3 class="trip-dates"></h3>
                    </div>
                </a>
            </div>
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

    set trip(value) {
        this._trip = value;
        this.render();
    }

    render() {
        if (!this._trip) return;
        const { id, name, dates, image } = this._trip;

        this.shadowRoot.querySelector('.trip-card').style.backgroundImage =
            `url('${CSS.escape(image)}')`;
        this.shadowRoot.querySelector('.trip-link').href = `#${id}`;
        this.shadowRoot.querySelector('.trip-title').textContent = name;
        this.shadowRoot.querySelector('.trip-dates').textContent = dates;
    }
});

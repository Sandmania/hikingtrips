class LegAlternatives extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._trip = [];
        this._selected = new Map();
    }

    set trip(value) {
        this._trip = value ?? [];
        this.render();
    }

    render() {
        const hasAlternatives = this._trip.some(leg => leg.alternatives?.length > 0);
        if (!hasAlternatives) {
            this.shadowRoot.innerHTML = '';
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
            </style>
            <h3>Alternatives</h3>
            ${this._trip.flatMap((leg, legIndex) =>
                (leg.alternatives || []).map((_, altIndex) => `
                    <label>
                        <input
                            type="checkbox"
                            data-leg="${legIndex}"
                            data-alt="${altIndex}"
                        />
                        Alternative for Leg ${legIndex + 1} – Option ${altIndex + 1}
                    </label><br />
                `)
            ).join('')}
        `;

        this.shadowRoot.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = `${e.target.dataset.leg}-${e.target.dataset.alt}`;
                e.target.checked
                    ? this._selected.set(key, true)
                    : this._selected.delete(key);

                this.dispatchEvent(
                    new CustomEvent('alternatives-change', {
                        detail: {
                            selectedAlternatives: serializeSelectedAlternatives(this._selected)
                        },
                        bubbles: true,
                        composed: true
                    })
                );
            });
        });
    }
}

function serializeSelectedAlternatives(selectedAlternatives) {
    return Array.from(selectedAlternatives.keys()).map(key => {
        const [legIndex, altIndex] = key.split('-').map(Number);
        return { legIndex, altIndex };
    });
}

customElements.define('leg-alternatives', LegAlternatives);
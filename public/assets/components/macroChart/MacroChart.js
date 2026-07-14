class MacroChart extends HTMLElement {
  static get observedAttributes() {
    return ['protein', 'fat', 'carbs'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .chart-container {
          position: relative;
          width: 100px;
          height: 100px;
        }
        .donut {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: conic-gradient(
            var(--protein-segment),
            var(--fat-segment),
            var(--carbs-segment)
          );
        }
        .donut-hole {
          position: absolute;
          top: 25%;
          left: 25%;
          width: 50%;
          height: 50%;
          border-radius: 50%;
          background: white;
        }
        .legend {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 6px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-swatch {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .swatch-protein { background: #4CAF50; }
        .swatch-fat { background: #FF9800; }
        .swatch-carbs { background: #2196F3; }
      </style>
      <div class="chart-container">
        <div class="donut"></div>
        <div class="donut-hole"></div>
      </div>
      <div class="legend"></div>
    `;
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const protein = parseFloat(this.getAttribute('protein')) || 0;
    const fat = parseFloat(this.getAttribute('fat')) || 0;
    const carbs = parseFloat(this.getAttribute('carbs')) || 0;
    const total = protein + fat + carbs;

    if (total === 0) {
      this.shadowRoot.querySelector('.donut').style.background = '#eee';
      this.shadowRoot.querySelector('.legend').innerHTML = '';
      return;
    }

    const pPct = Math.round((protein / total) * 100);
    const fPct = Math.round((fat / total) * 100);
    const cPct = 100 - pPct - fPct;

    const pEnd = pPct;
    const fEnd = pEnd + fPct;

    const donut = this.shadowRoot.querySelector('.donut');
    donut.style.background = `conic-gradient(
      #4CAF50 0% ${pEnd}%,
      #FF9800 ${pEnd}% ${fEnd}%,
      #2196F3 ${fEnd}% 100%
    )`;

    const legend = this.shadowRoot.querySelector('.legend');
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-swatch swatch-protein"></span>Protein ${pPct}%</div>
      <div class="legend-item"><span class="legend-swatch swatch-fat"></span>Fat ${fPct}%</div>
      <div class="legend-item"><span class="legend-swatch swatch-carbs"></span>Carbs ${cPct}%</div>
    `;
  }
}

customElements.define('tt-macro-chart', MacroChart);

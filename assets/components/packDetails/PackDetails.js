class PackDetails extends HTMLElement {
  static observedAttributes = ['csvurl'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="../assets/components/packDetails/PackDetails.css">
      <button id="toggleButton"></button>
      <div id="details" class="hidden">
        <slot></slot>
        <div id="output"></div>
      </div>
    `;

    this.toggleButton = this.shadowRoot.querySelector('#toggleButton');
    this.details = this.shadowRoot.querySelector('#details');

    this.toggleButton.addEventListener('click', () => this.toggleDetails());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'csvurl' && newValue) {
      this.loadCsv(newValue);
    }
  }

  connectedCallback() {
    const csvUrl = this.getAttribute('csvurl');
    if (csvUrl) {
      this.loadCsv(csvUrl);
    } else {
      console.error('No CSV URL provided.');
    }
  }

  toggleDetails() {
    const isHidden = this.details.classList.toggle('hidden');
  }

  async loadCsv(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      const csvData = await response.text();
      const items = this.parseCsv(csvData);
      const categorizedItems = this.categorizeItems(items);
      this.render(categorizedItems);
    } catch (error) {
      console.error('Error loading CSV:', error);
    }
  }

  parseCsv(csvData) {
    const rows = csvData.split('\n').filter(row => row.trim() !== ''); // Remove empty rows
    const headers = this.parseCsvRow(rows.shift()); // Parse the header row

    return rows.map(row => {
      const values = this.parseCsvRow(row);
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index] ? values[index].trim() : ''; // Handle missing values
      });
      return item;
    });
  }

  parseCsvRow(row) {
    const regex = /(?:,|\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^",\n]*))/g;
    const result = [];
    let match;
    while ((match = regex.exec(row))) {
      if (match[1]) {
        // Handle quoted fields (replace double quotes with single quotes)
        result.push(match[1].replace(/""/g, '"'));
      } else {
        // Handle unquoted fields
        result.push(match[2]);
      }
    }
    return result;
  }

  categorizeItems(items) {
    const categories = {};
    items.forEach(item => {
      const category = item.Category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });
    return categories;
  }

  render(categorizedItems) {
    const output = this.shadowRoot.querySelector('#output');
    output.innerHTML = '';

    let grandTotalWeight = 0;
    let wornWeight = 0;
    let consumableWeight = 0;

    Object.keys(categorizedItems).forEach(category => {
      const items = categorizedItems[category];
      let categoryTotalWeight = 0;

      const categoryDiv = document.createElement('div');
      categoryDiv.classList.add('category');

      const categoryTitle = document.createElement('div');
      categoryTitle.classList.add('category-title');
      categoryTitle.textContent = category;
      categoryDiv.appendChild(categoryTitle);

      items.forEach(item => {
        const qty = parseFloat(item.qty) || 0;
        const weight = parseFloat(item.weight) || 0;
        const totalWeight = qty * weight;
        categoryTotalWeight += totalWeight;

        // Collect worn and consumable weights
        if (item.worn && item.worn.trim().toLowerCase() === 'worn') {
          wornWeight += totalWeight;
        }
        if (item.consumable && item.consumable.trim().toLowerCase() === 'consumable') {
          consumableWeight += totalWeight;
        }

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('item');

        itemDiv.innerHTML = `
          <div class="item-row">
            <div class="item-name">${item['Item Name']}</div>
            <div class="item-desc">${item.desc || ''}</div>
            <div class="item-qty">${qty} x ${weight} ${item.unit[0]}</div>
            <div class="item-weight">${totalWeight.toFixed()} g</div>
          </div>
        `;
        categoryDiv.appendChild(itemDiv);
      });

      const catTotalDiv = document.createElement('div');
      catTotalDiv.classList.add('category-total');
      catTotalDiv.textContent = `${categoryTotalWeight.toFixed()} g`;
      categoryDiv.appendChild(catTotalDiv);

      grandTotalWeight += categoryTotalWeight;
      output.appendChild(categoryDiv);
    });

    const grandTotalDiv = document.createElement('div');
    grandTotalDiv.classList.add('grand-total');
    grandTotalDiv.textContent = `Grand Total Weight: ${grandTotalWeight.toFixed()}`;
    output.appendChild(grandTotalDiv);

    const wornDiv = document.createElement('div');
    wornDiv.classList.add('worn-weight');
    wornDiv.textContent = `Worn Weight: ${wornWeight.toFixed()}`;
    output.appendChild(wornDiv);

    const consumableDiv = document.createElement('div');
    consumableDiv.classList.add('consumable-weight');
    consumableDiv.textContent = `Consumable Weight: ${consumableWeight.toFixed()}`;
    output.appendChild(consumableDiv);

    const baseWeight = grandTotalWeight - wornWeight - consumableWeight;
    const baseDiv = document.createElement('div');
    baseDiv.classList.add('base-weight');
    baseDiv.textContent = `Base Weight: ${baseWeight.toFixed()}`;
    output.appendChild(baseDiv);
  }
}

customElements.define('tt-pack-details', PackDetails);
class PackDetails extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._csvUrl = null;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="../assets/components/packDetails/PackDetails.css">
      <div id="details" class="hidden">
        <slot></slot>
        <div id="output"></div>
      </div>
    `;
  }

  set csvUrl(url) {
    this._csvUrl = url;
    if (url) {
      this.loadCsv(url);
    } else {
      this.clear();
    }
  }

  get csvUrl() {
    return this._csvUrl;
  }

  connectedCallback() {
    this._toggleListener = () => this.toggleDetails();
    this._cleanupListener = () => this.clear();
    document.addEventListener('toggle-pack-details', this._toggleListener);
    document.addEventListener('trip-cleanup', this._cleanupListener);
  }

  disconnectedCallback() {
    document.removeEventListener('toggle-pack-details', this._toggleListener);
    document.removeEventListener('trip-cleanup', this._cleanupListener);
  }

  clear() {
    const output = this.shadowRoot.querySelector('#output');
    output.innerHTML = '';
    const details = this.shadowRoot.querySelector('#details');
    details.classList.add('hidden');
  }

  toggleDetails() {
    const details = this.shadowRoot.querySelector('#details');
    if (details) {
      details.classList.toggle('hidden');
    }
  }

  async loadCsv(url, signal) {
    this._csvUrl = url;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      const csvData = await response.text();
      const items = this.parseCsv(csvData);
      const categorizedItems = this.categorizeItems(items);
      this.render(categorizedItems);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error loading CSV:', error);
    }
  }

  parseCsv(csvData) {
    const rows = csvData.split(/\r?\n/).filter(row => row.trim() !== ''); // Remove empty rows
    if (rows.length === 0) return [];
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

    // Calculate weights
    const baseWeight = grandTotalWeight - wornWeight - consumableWeight;
    const carriedWeight = baseWeight + consumableWeight;

    // Create summary elements in the requested order
    const summaryFragment = document.createDocumentFragment();

    const baseDiv = document.createElement('div');
    baseDiv.classList.add('base-weight');
    baseDiv.innerHTML = `<strong>Base Weight: ${baseWeight.toFixed()} g</strong>`;
    summaryFragment.appendChild(baseDiv);

    const consumableDiv = document.createElement('div');
    consumableDiv.classList.add('consumable-weight');
    consumableDiv.textContent = `Consumable Weight: ${consumableWeight.toFixed()} g`;
    summaryFragment.appendChild(consumableDiv);

    const carriedDiv = document.createElement('div');
    carriedDiv.classList.add('carried-weight');
    carriedDiv.textContent = `Carried Weight: ${carriedWeight.toFixed()} g`;
    summaryFragment.appendChild(carriedDiv);

    const wornDiv = document.createElement('div');
    wornDiv.classList.add('worn-weight');
    wornDiv.textContent = `Worn Weight: ${wornWeight.toFixed()} g`;
    summaryFragment.appendChild(wornDiv);

    const grandTotalDiv = document.createElement('div');
    grandTotalDiv.classList.add('grand-total');
    grandTotalDiv.textContent = `Grand Total Weight: ${grandTotalWeight.toFixed()} g`;
    //summaryFragment.appendChild(grandTotalDiv);

    // Prepend summary to output
    const summaryContainer = document.createElement('div');
    summaryContainer.classList.add('summary-container');
    summaryContainer.appendChild(summaryFragment);
    output.prepend(summaryContainer);
  }
}

customElements.define('tt-pack-details', PackDetails);
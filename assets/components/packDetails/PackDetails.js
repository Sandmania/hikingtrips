class PackDetails extends HTMLElement {
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

  connectedCallback() {
    const csvUrl = this.getAttribute('data-url'); // Get the CSV URL from the component's attribute
    if (csvUrl) {
      this.loadCsv(csvUrl);
    } else {
      console.error('No CSV URL provided. Add a "data-url" attribute to the component.');
    }
  }

  toggleDetails() {
    const isHidden = this.details.classList.toggle('hidden');
    //this.toggleButton.textContent = isHidden ? '🔽' : '🔼'; // Update the icon
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

      // Create a scrollable container for the table
      const tableContainer = document.createElement('div');
      tableContainer.classList.add('table-container');

      const table = document.createElement('table');

      // Define column widths
      const colgroup = document.createElement('colgroup');
      colgroup.innerHTML = `
        <col>
        <col>
        <col>
        <col>
      `;
      table.appendChild(colgroup);

      // Use the caption as the category header
      const caption = document.createElement('caption');
      caption.textContent = category;
      table.appendChild(caption);

      const tbody = document.createElement('tbody');
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

        const row1 = document.createElement('tr');
        row1.classList.add('item-main');
        row1.innerHTML = `
          <td colspan="2">${item['Item Name']}</td>
          <td colspan="2">${totalWeight.toFixed()} ${item.unit[0]}</td>
        `;

        const row2 = document.createElement('tr');
        row2.classList.add('item-detail');
        row2.innerHTML = `
          <td colspan="2">${item.desc || ''}</td>
          <td colspan="2">${
            qty > 1 ? `${qty} x ${weight} ${item.unit[0]}` : ''
          }</td>
        `;

        tbody.appendChild(row1);
        tbody.appendChild(row2);
      });
      table.appendChild(tbody);

      const categoryTotalRow = document.createElement('tfoot');
      categoryTotalRow.innerHTML = `
        <tr>
          <td colspan="2"></td>
          <td><strong>${categoryTotalWeight.toFixed()} g</strong></td>
        </tr>
      `;
      table.appendChild(categoryTotalRow);

      grandTotalWeight += categoryTotalWeight;

      tableContainer.appendChild(table);
      output.appendChild(tableContainer);
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
class MealPlan extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._csvUrl = null;
    this._data = null;
    this._selectedPerson = 0;
    this._drillLevel = 0;
    this._selectedDay = null;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="../assets/components/mealPlan/MealPlan.css">
      <div id="meal-plan" class="hidden">
        <div id="person-tabs"></div>
        <div id="output"></div>
      </div>

      <template id="tpl-summary">
        <div class="summary-view">
          <div class="summary-layout">
            <tt-macro-chart></tt-macro-chart>
            <div class="summary-stats">
              <div class="stat">
                <span class="stat-label">Total Weight</span>
                <span class="stat-value" data-stat="weight"></span>
              </div>
              <div class="stat">
                <span class="stat-label">Total Calories</span>
                <span class="stat-value" data-stat="calories"></span>
              </div>
              <div class="stat">
                <span class="stat-label">Days</span>
                <span class="stat-value" data-stat="days"></span>
              </div>
              <div class="stat">
                <span class="stat-label">Avg Calories/Day</span>
                <span class="stat-value" data-stat="avg"></span>
              </div>
            </div>
          </div>
          <a class="drill-link" href="#">Show daily breakdown</a>
        </div>
      </template>

      <template id="tpl-daily-view">
        <div class="daily-view">
          <a class="back-link" href="#">← Summary</a>
        </div>
      </template>

      <template id="tpl-day-row">
        <div class="day-row">
          <div class="day-header">
            <span class="day-title"></span>
            <span class="day-stats"></span>
          </div>
          <div class="day-meals"></div>
          <a class="drill-link drill-link-small" href="#">Full details</a>
        </div>
      </template>

      <template id="tpl-meal-type-group">
        <div class="meal-type-group">
          <div class="meal-type-label"></div>
        </div>
      </template>

      <template id="tpl-meal-item">
        <div class="meal-item">
          <span class="meal-name"></span>
          <span class="meal-brand"></span>
          <span class="meal-calories"></span>
        </div>
      </template>

      <template id="tpl-detail-view">
        <div class="detail-view">
          <a class="back-link" href="#">← Daily overview</a>
          <h3 class="detail-heading"></h3>
          <div class="detail-day-summary">
            <span data-stat="calories"></span>
            <span data-stat="weight"></span>
            <span data-stat="macros"></span>
          </div>
        </div>
      </template>

      <template id="tpl-detail-section">
        <div class="detail-meal-section">
          <div class="detail-meal-type"></div>
        </div>
      </template>

      <template id="tpl-detail-item">
        <div class="detail-item">
          <div class="detail-item-header">
            <span class="field-name"></span>
            <span class="field-brand"></span>
          </div>
          <div class="detail-item-fields">
            <span class="field-net-weight"></span>
            <span class="field-gross-weight"></span>
            <span class="field-calories"></span>
            <span class="field-protein"></span>
            <span class="field-fat"></span>
            <span class="field-carbs"></span>
          </div>
          <div class="detail-item-per100g">
            <span class="field-calories100g"></span>
            <span class="field-protein100g"></span>
            <span class="field-fat100g"></span>
            <span class="field-carbs100g"></span>
          </div>
          <div class="detail-item-tags">
            <span class="field-main-carb"></span>
            <span class="field-primary-protein"></span>
          </div>
        </div>
      </template>
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
    document.addEventListener('toggle-meal-plan', this._toggleListener);
    document.addEventListener('trip-cleanup', this._cleanupListener);
  }

  disconnectedCallback() {
    document.removeEventListener('toggle-meal-plan', this._toggleListener);
    document.removeEventListener('trip-cleanup', this._cleanupListener);
  }

  clear() {
    this._data = null;
    this._selectedPerson = 0;
    this._drillLevel = 0;
    this._selectedDay = null;
    const output = this.shadowRoot.querySelector('#output');
    output.innerHTML = '';
    const tabs = this.shadowRoot.querySelector('#person-tabs');
    tabs.innerHTML = '';
    const container = this.shadowRoot.querySelector('#meal-plan');
    container.classList.add('hidden');
  }

  toggleDetails() {
    const container = this.shadowRoot.querySelector('#meal-plan');
    if (container) {
      container.classList.toggle('hidden');
    }
  }

  async loadCsv(url, signal) {
    this._csvUrl = url;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch meal plan CSV: ${response.statusText}`);
      }
      const csvData = await response.text();
      const rows = this.parseCsv(csvData);
      this._data = this.structureData(rows);
      this._selectedPerson = 0;
      this._drillLevel = 0;
      this._selectedDay = null;
      this.render();
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error loading meal plan CSV:', error);
    }
  }

  parseCsv(csvData) {
    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = this.parseCsvRow(lines.shift());

    return lines.map(line => {
      const values = this.parseCsvRow(line);
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ? values[i].trim() : '';
      });
      return row;
    });
  }

  parseCsvRow(row) {
    const regex = /(?:,|\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^",\n]*))/g;
    const result = [];
    let match;
    while ((match = regex.exec(row))) {
      if (match[1] !== undefined) {
        result.push(match[1].replace(/""/g, '"'));
      } else {
        result.push(match[2]);
      }
    }
    return result;
  }

  structureData(rows) {
    const personMap = {};

    rows.forEach(row => {
      const personIndex = parseInt(row.PersonIndex) || 1;
      const day = parseInt(row.Day) || 1;
      const mealType = row.MealType || 'Other';
      const netWeight = parseFloat(row['Net Weight']) || 0;
      const grossWeight = parseFloat(row['Gross Weight']) || 0;
      const weight = grossWeight || netWeight;
      const calories = parseFloat(row.CaloriesPortion) || 0;
      const protein = parseFloat(row.ProteinPortion) || 0;
      const fat = parseFloat(row.FatPortion) || 0;
      const carbs = parseFloat(row.CarbsPortion) || 0;

      if (!personMap[personIndex]) {
        personMap[personIndex] = { index: personIndex, dayMap: {} };
      }
      const person = personMap[personIndex];

      if (!person.dayMap[day]) {
        person.dayMap[day] = {
          day,
          totalWeight: 0,
          totalCalories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          meals: {}
        };
      }
      const dayData = person.dayMap[day];

      if (!dayData.meals[mealType]) {
        dayData.meals[mealType] = [];
      }

      dayData.meals[mealType].push({
        name: row.Name || '',
        brand: row.Brand || '',
        mealType,
        netWeight,
        grossWeight: grossWeight || null,
        weight,
        calories,
        protein,
        fat,
        carbs,
        calories100g: parseFloat(row.Calories100g) || 0,
        protein100g: parseFloat(row.Protein100g) || 0,
        fat100g: parseFloat(row.Fat100g) || 0,
        carbs100g: parseFloat(row.Carbs100g) || 0,
        mainCarb: row.MainCarb || '',
        primaryProtein: row.PrimaryProtein || ''
      });

      dayData.totalWeight += weight;
      dayData.totalCalories += calories;
      dayData.protein += protein;
      dayData.fat += fat;
      dayData.carbs += carbs;
    });

    const persons = Object.values(personMap)
      .sort((a, b) => a.index - b.index)
      .map(person => {
        const days = Object.values(person.dayMap).sort((a, b) => a.day - b.day);
        const totals = days.reduce((acc, d) => ({
          weight: acc.weight + d.totalWeight,
          calories: acc.calories + d.totalCalories,
          protein: acc.protein + d.protein,
          fat: acc.fat + d.fat,
          carbs: acc.carbs + d.carbs
        }), { weight: 0, calories: 0, protein: 0, fat: 0, carbs: 0 });

        return { index: person.index, days, totals };
      });

    return { persons };
  }

  _getSelectedPerson() {
    if (!this._data || this._data.persons.length === 0) return null;
    return this._data.persons[this._selectedPerson] || this._data.persons[0];
  }

  _cloneTpl(id) {
    return this.shadowRoot.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  render() {
    if (!this._data) return;
    this._renderPersonTabs();
    this._renderView();
  }

  _renderPersonTabs() {
    const tabsEl = this.shadowRoot.querySelector('#person-tabs');
    tabsEl.innerHTML = '';

    if (this._data.persons.length <= 1) return;

    this._data.persons.forEach((person, i) => {
      const tab = document.createElement('button');
      tab.classList.add('person-tab');
      if (i === this._selectedPerson) tab.classList.add('active');
      tab.textContent = `Person ${person.index}`;
      tab.addEventListener('click', () => {
        this._selectedPerson = i;
        this._drillLevel = 0;
        this._selectedDay = null;
        this.render();
      });
      tabsEl.appendChild(tab);
    });
  }

  _renderView() {
    const output = this.shadowRoot.querySelector('#output');
    output.innerHTML = '';

    switch (this._drillLevel) {
      case 0: this._renderSummary(output); break;
      case 1: this._renderDaily(output); break;
      case 2: this._renderDayDetail(output); break;
    }
  }

  _renderSummary(container) {
    const person = this._getSelectedPerson();
    if (!person) return;

    const { totals, days } = person;
    const avgCalories = days.length > 0 ? Math.round(totals.calories / days.length) : 0;

    const summary = this._cloneTpl('tpl-summary');

    const chart = summary.querySelector('tt-macro-chart');
    chart.setAttribute('protein', totals.protein.toFixed(1));
    chart.setAttribute('fat', totals.fat.toFixed(1));
    chart.setAttribute('carbs', totals.carbs.toFixed(1));

    summary.querySelector('[data-stat="weight"]').textContent = this._formatWeight(totals.weight);
    summary.querySelector('[data-stat="calories"]').textContent = `${Math.round(totals.calories).toLocaleString()} kcal`;
    summary.querySelector('[data-stat="days"]').textContent = String(days.length);
    summary.querySelector('[data-stat="avg"]').textContent = `${avgCalories.toLocaleString()} kcal`;

    summary.querySelector('.drill-link').addEventListener('click', (e) => {
      e.preventDefault();
      this._drillLevel = 1;
      this._renderView();
    });

    container.appendChild(summary);
  }

  _renderDaily(container) {
    const person = this._getSelectedPerson();
    if (!person) return;

    const daily = this._cloneTpl('tpl-daily-view');

    daily.querySelector('.back-link').addEventListener('click', (e) => {
      e.preventDefault();
      this._drillLevel = 0;
      this._renderView();
    });

    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    person.days.forEach(dayData => {
      const dayEl = this._cloneTpl('tpl-day-row');

      const { pPct, fPct, cPct } = this._macroPercentages(dayData);
      dayEl.querySelector('.day-title').textContent = `Day ${dayData.day}`;
      dayEl.querySelector('.day-stats').textContent =
        `${Math.round(dayData.totalCalories)} kcal · ${this._formatWeight(dayData.totalWeight)} · P:${pPct}% F:${fPct}% C:${cPct}%`;

      const mealsContainer = dayEl.querySelector('.day-meals');
      const orderedTypes = mealTypeOrder.filter(t => dayData.meals[t]);
      const otherTypes = Object.keys(dayData.meals).filter(t => !mealTypeOrder.includes(t));

      [...orderedTypes, ...otherTypes].forEach(mealType => {
        const items = dayData.meals[mealType];
        const groupEl = this._cloneTpl('tpl-meal-type-group');
        groupEl.querySelector('.meal-type-label').textContent = mealType;

        items.forEach(item => {
          const itemEl = this._cloneTpl('tpl-meal-item');
          itemEl.querySelector('.meal-name').textContent = item.name;
          itemEl.querySelector('.meal-brand').textContent = item.brand;
          itemEl.querySelector('.meal-calories').textContent = `${Math.round(item.calories)} kcal`;
          groupEl.appendChild(itemEl);
        });

        mealsContainer.appendChild(groupEl);
      });

      dayEl.querySelector('.drill-link').addEventListener('click', (e) => {
        e.preventDefault();
        this._drillLevel = 2;
        this._selectedDay = dayData.day;
        this._renderView();
      });

      daily.appendChild(dayEl);
    });

    container.appendChild(daily);
  }

  _renderDayDetail(container) {
    const person = this._getSelectedPerson();
    if (!person) return;
    const dayData = person.days.find(d => d.day === this._selectedDay);
    if (!dayData) return;

    const detail = this._cloneTpl('tpl-detail-view');

    detail.querySelector('.back-link').addEventListener('click', (e) => {
      e.preventDefault();
      this._drillLevel = 1;
      this._selectedDay = null;
      this._renderView();
    });

    detail.querySelector('.detail-heading').textContent = `Day ${dayData.day}`;

    const { pPct, fPct, cPct } = this._macroPercentages(dayData);
    detail.querySelector('[data-stat="calories"]').textContent = `${Math.round(dayData.totalCalories)} kcal`;
    detail.querySelector('[data-stat="weight"]').textContent = this._formatWeight(dayData.totalWeight);
    detail.querySelector('[data-stat="macros"]').textContent = `P:${pPct}% F:${fPct}% C:${cPct}%`;

    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const orderedTypes = mealTypeOrder.filter(t => dayData.meals[t]);
    const otherTypes = Object.keys(dayData.meals).filter(t => !mealTypeOrder.includes(t));

    [...orderedTypes, ...otherTypes].forEach(mealType => {
      const items = dayData.meals[mealType];
      const section = this._cloneTpl('tpl-detail-section');
      section.querySelector('.detail-meal-type').textContent = mealType;

      items.forEach(item => {
        const row = this._cloneTpl('tpl-detail-item');
        row.querySelector('.field-name').textContent = item.name;
        row.querySelector('.field-brand').textContent = item.brand;
        row.querySelector('.field-net-weight').textContent = `Net: ${item.netWeight}g`;
        row.querySelector('.field-gross-weight').textContent =
          item.grossWeight !== null ? `Gross: ${item.grossWeight}g` : '';
        row.querySelector('.field-calories').textContent = `Cal: ${Math.round(item.calories)}`;
        row.querySelector('.field-protein').textContent = `P: ${item.protein}g`;
        row.querySelector('.field-fat').textContent = `F: ${item.fat}g`;
        row.querySelector('.field-carbs').textContent = `C: ${item.carbs}g`;
        row.querySelector('.field-calories100g').textContent = `Cal/100g: ${item.calories100g}`;
        row.querySelector('.field-protein100g').textContent = `P/100g: ${item.protein100g}g`;
        row.querySelector('.field-fat100g').textContent = `F/100g: ${item.fat100g}g`;
        row.querySelector('.field-carbs100g').textContent = `C/100g: ${item.carbs100g}g`;
        row.querySelector('.field-main-carb').textContent =
          item.mainCarb ? `Carb: ${item.mainCarb}` : '';
        row.querySelector('.field-primary-protein').textContent =
          item.primaryProtein ? `Protein: ${item.primaryProtein}` : '';
        section.appendChild(row);
      });

      detail.appendChild(section);
    });

    container.appendChild(detail);
  }

  _macroPercentages(dayData) {
    const macroTotal = dayData.protein + dayData.fat + dayData.carbs;
    const pPct = macroTotal > 0 ? Math.round((dayData.protein / macroTotal) * 100) : 0;
    const fPct = macroTotal > 0 ? Math.round((dayData.fat / macroTotal) * 100) : 0;
    const cPct = macroTotal > 0 ? 100 - pPct - fPct : 0;
    return { pPct, fPct, cPct };
  }

  _formatWeight(grams) {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)} kg`;
    }
    return `${Math.round(grams)} g`;
  }
}

customElements.define('tt-meal-plan', MealPlan);

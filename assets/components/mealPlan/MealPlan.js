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

  async loadCsv(url) {
    try {
      const response = await fetch(url);
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
      console.error('Error loading meal plan CSV:', error);
    }
  }

  parseCsv(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
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

    const summary = document.createElement('div');
    summary.classList.add('summary-view');
    summary.innerHTML = `
      <div class="summary-layout">
        <tt-macro-chart
          protein="${totals.protein.toFixed(1)}"
          fat="${totals.fat.toFixed(1)}"
          carbs="${totals.carbs.toFixed(1)}"
        ></tt-macro-chart>
        <div class="summary-stats">
          <div class="stat"><span class="stat-label">Total Weight</span><span class="stat-value">${this._formatWeight(totals.weight)}</span></div>
          <div class="stat"><span class="stat-label">Total Calories</span><span class="stat-value">${Math.round(totals.calories).toLocaleString()} kcal</span></div>
          <div class="stat"><span class="stat-label">Days</span><span class="stat-value">${days.length}</span></div>
          <div class="stat"><span class="stat-label">Avg Calories/Day</span><span class="stat-value">${avgCalories.toLocaleString()} kcal</span></div>
        </div>
      </div>
    `;

    const drillLink = document.createElement('a');
    drillLink.classList.add('drill-link');
    drillLink.href = '#';
    drillLink.textContent = 'Show daily breakdown';
    drillLink.addEventListener('click', (e) => {
      e.preventDefault();
      this._drillLevel = 1;
      this._renderView();
    });
    summary.appendChild(drillLink);

    container.appendChild(summary);
  }

  _renderDaily(container) {
    const person = this._getSelectedPerson();
    if (!person) return;

    const daily = document.createElement('div');
    daily.classList.add('daily-view');

    const backLink = this._createBackLink('Summary', () => {
      this._drillLevel = 0;
      this._renderView();
    });
    daily.appendChild(backLink);

    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    person.days.forEach(dayData => {
      const daySection = document.createElement('div');
      daySection.classList.add('day-row');

      const macroTotal = dayData.protein + dayData.fat + dayData.carbs;
      const pPct = macroTotal > 0 ? Math.round((dayData.protein / macroTotal) * 100) : 0;
      const fPct = macroTotal > 0 ? Math.round((dayData.fat / macroTotal) * 100) : 0;
      const cPct = macroTotal > 0 ? 100 - pPct - fPct : 0;

      const header = document.createElement('div');
      header.classList.add('day-header');
      header.innerHTML = `
        <span class="day-title">Day ${dayData.day}</span>
        <span class="day-stats">${Math.round(dayData.totalCalories)} kcal &middot; ${this._formatWeight(dayData.totalWeight)} &middot; P:${pPct}% F:${fPct}% C:${cPct}%</span>
      `;
      daySection.appendChild(header);

      const mealsDiv = document.createElement('div');
      mealsDiv.classList.add('day-meals');

      const orderedTypes = mealTypeOrder.filter(t => dayData.meals[t]);
      const otherTypes = Object.keys(dayData.meals).filter(t => !mealTypeOrder.includes(t));
      [...orderedTypes, ...otherTypes].forEach(mealType => {
        const items = dayData.meals[mealType];
        const typeDiv = document.createElement('div');
        typeDiv.classList.add('meal-type-group');
        typeDiv.innerHTML = `<div class="meal-type-label">${mealType}</div>`;

        items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.classList.add('meal-item');
          itemDiv.innerHTML = `
            <span class="meal-name">${item.name}</span>
            <span class="meal-brand">${item.brand}</span>
            <span class="meal-calories">${Math.round(item.calories)} kcal</span>
          `;
          typeDiv.appendChild(itemDiv);
        });

        mealsDiv.appendChild(typeDiv);
      });

      daySection.appendChild(mealsDiv);

      const detailLink = document.createElement('a');
      detailLink.classList.add('drill-link', 'drill-link-small');
      detailLink.href = '#';
      detailLink.textContent = 'Full details';
      detailLink.addEventListener('click', (e) => {
        e.preventDefault();
        this._drillLevel = 2;
        this._selectedDay = dayData.day;
        this._renderView();
      });
      daySection.appendChild(detailLink);

      daily.appendChild(daySection);
    });

    container.appendChild(daily);
  }

  _renderDayDetail(container) {
    const person = this._getSelectedPerson();
    if (!person) return;
    const dayData = person.days.find(d => d.day === this._selectedDay);
    if (!dayData) return;

    const detail = document.createElement('div');
    detail.classList.add('detail-view');

    const backLink = this._createBackLink('Daily overview', () => {
      this._drillLevel = 1;
      this._selectedDay = null;
      this._renderView();
    });
    detail.appendChild(backLink);

    const heading = document.createElement('h3');
    heading.classList.add('detail-heading');
    heading.textContent = `Day ${dayData.day}`;
    detail.appendChild(heading);

    const macroTotal = dayData.protein + dayData.fat + dayData.carbs;
    const pPct = macroTotal > 0 ? Math.round((dayData.protein / macroTotal) * 100) : 0;
    const fPct = macroTotal > 0 ? Math.round((dayData.fat / macroTotal) * 100) : 0;
    const cPct = macroTotal > 0 ? 100 - pPct - fPct : 0;

    const daySummary = document.createElement('div');
    daySummary.classList.add('detail-day-summary');
    daySummary.innerHTML = `
      <span>${Math.round(dayData.totalCalories)} kcal</span>
      <span>${this._formatWeight(dayData.totalWeight)}</span>
      <span>P:${pPct}% F:${fPct}% C:${cPct}%</span>
    `;
    detail.appendChild(daySummary);

    const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const orderedTypes = mealTypeOrder.filter(t => dayData.meals[t]);
    const otherTypes = Object.keys(dayData.meals).filter(t => !mealTypeOrder.includes(t));

    [...orderedTypes, ...otherTypes].forEach(mealType => {
      const items = dayData.meals[mealType];
      const section = document.createElement('div');
      section.classList.add('detail-meal-section');

      const sectionTitle = document.createElement('div');
      sectionTitle.classList.add('detail-meal-type');
      sectionTitle.textContent = mealType;
      section.appendChild(sectionTitle);

      items.forEach(item => {
        const row = document.createElement('div');
        row.classList.add('detail-item');
        row.innerHTML = `
          <div class="detail-item-header">
            <span class="field-name">${item.name}</span>
            <span class="field-brand">${item.brand}</span>
          </div>
          <div class="detail-item-fields">
            <span class="field-net-weight">Net: ${item.netWeight}g</span>
            <span class="field-gross-weight">${item.grossWeight !== null ? `Gross: ${item.grossWeight}g` : ''}</span>
            <span class="field-calories">Cal: ${Math.round(item.calories)}</span>
            <span class="field-protein">P: ${item.protein}g</span>
            <span class="field-fat">F: ${item.fat}g</span>
            <span class="field-carbs">C: ${item.carbs}g</span>
          </div>
          <div class="detail-item-per100g">
            <span class="field-calories100g">Cal/100g: ${item.calories100g}</span>
            <span class="field-protein100g">P/100g: ${item.protein100g}g</span>
            <span class="field-fat100g">F/100g: ${item.fat100g}g</span>
            <span class="field-carbs100g">C/100g: ${item.carbs100g}g</span>
          </div>
          <div class="detail-item-tags">
            <span class="field-main-carb">${item.mainCarb ? `Carb: ${item.mainCarb}` : ''}</span>
            <span class="field-primary-protein">${item.primaryProtein ? `Protein: ${item.primaryProtein}` : ''}</span>
          </div>
        `;
        section.appendChild(row);
      });

      detail.appendChild(section);
    });

    container.appendChild(detail);
  }

  _createBackLink(label, onClick) {
    const link = document.createElement('a');
    link.classList.add('back-link');
    link.href = '#';
    link.innerHTML = `&larr; ${label}`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return link;
  }

  _formatWeight(grams) {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)} kg`;
    }
    return `${Math.round(grams)} g`;
  }
}

customElements.define('tt-meal-plan', MealPlan);

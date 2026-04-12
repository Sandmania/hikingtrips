## 1. MacroChart Atom

- [x] 1.1 Create `assets/components/macroChart/MacroChart.js` — `<tt-macro-chart>` custom element with shadow DOM, observed attributes (`protein`, `fat`, `carbs`), conic-gradient donut rendering with percentage labels, inline `<style>`

## 2. MealPlan Component — Data Layer

- [x] 2.1 Create `assets/components/mealPlan/MealPlan.js` — `<tt-meal-plan>` custom element with shadow DOM, `csvUrl` setter/getter, `<link>` to external CSS, toggle event listener (`toggle-meal-plan`), `connectedCallback`/`disconnectedCallback` lifecycle, `clear()` and `toggleDetails()` methods
- [x] 2.2 Implement `parseCsv(text)` — parse CSV text into array of row objects using the same regex approach as PackDetails
- [x] 2.3 Implement `structureData(rows)` — group parsed rows into `{ persons: [{ index, days: [{ day, totalWeight, totalCalories, protein, fat, carbs, meals: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] } }], totals: { weight, calories, protein, fat, carbs } }] }`. Weight per item uses `Gross Weight || Net Weight`. Pre-compute aggregates at day and person level.

## 3. MealPlan Component — Views

- [x] 3.1 Implement summary view (drill level 0) — render total weight, total calories, number of days, average calories/day, and a `<tt-macro-chart>` for the selected person. Include a clickable element to drill to daily view.
- [x] 3.2 Implement daily view (drill level 1) — render per-day rows with weight, calories, macro text (P:X% F:Y% C:Z%), and meals grouped by type (name, brand, calories). Include back link to summary and clickable element per day to drill to detail.
- [x] 3.3 Implement day detail view (drill level 2) — render all CSV fields for each meal item in the selected day, grouped by meal type, styled like PackDetails. Each field element gets a CSS class (e.g. `.field-calories100g`, `.field-protein100g`, `.field-main-carb`). Include back link to daily view.
- [x] 3.4 Implement person tabs — render tab bar only when data has multiple persons, default to person 1, switch person resets drill to summary. Hidden for single-person plans.

## 4. MealPlan Styles

- [x] 4.1 Create `assets/components/mealPlan/MealPlan.css` — styles for all three views, person tabs, drill navigation, detail field grid. Add `@media` queries for mobile-responsive layout. Use `.field-*` classes on detail view elements for visibility control.

## 5. Leaflet Control

- [x] 5.1 Create `assets/js/leaflet/mealPlanControl.js` — factory function following `packDetailsControl` pattern with `canAdd()` and `addTo(map)`, button dispatches `toggle-meal-plan` custom event
- [x] 5.2 Add meal plan button icon style to CSS (button background icon for the map control)

## 6. Integration

- [x] 6.1 Wire into `main.js` — add `initializeMealPlan(config)` function, add `mealPlan.csvUrl` path resolution in `resolveRelativePaths`
- [x] 6.2 Wire into `map.js` — import `mealPlanControl`, add to map alongside existing controls
- [x] 6.3 Wire into `index.html` — add `<script>` tags for MealPlan.js and MacroChart.js, add `<link>` for MealPlan.css, add `<tt-meal-plan>` element inside `<trip-view>`

## 7. Tests

- [x] 7.1 Create `tests/mealPlan.test.js` — test CSV parsing (single person, multi-person, empty, missing fields), data structuring (grouping, aggregates, weight fallback), all three render views (summary content, daily content, detail content with field classes), person tab visibility and switching, toggle event handling, disconnectedCallback cleanup
- [x] 7.2 Add test script to `tests/index.html`

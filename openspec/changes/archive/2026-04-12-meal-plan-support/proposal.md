## Why

Hiking trips involve detailed food planning — knowing total weight, calorie targets, macro balance, and per-day meal assignments. This data already exists as CSV exports from an external meal planning tool, but there's no way to view it alongside the trip's route, pack list, and calendar. Adding meal plan support lets the user review and reference their food plan directly in the trip view, following the same pattern as pack details.

## What Changes

- Introduce `<meal-plan>` custom element (shadow DOM organism) that loads a meal plan CSV, parses it into a per-person/per-day/per-meal structure, and renders three drill-down levels via view replacement
- Introduce `<macro-chart>` custom element (shadow DOM atom) that renders a CSS conic-gradient donut chart from protein/fat/carb values
- Add `mealPlanControl.js` Leaflet control following the `packDetailsControl` pattern — map button dispatches `toggle-meal-plan` event
- Wire into trip loading: `trip_config.yaml` gains a `mealPlan.csvUrl` key, `main.js` initializes the component, `map.js` adds the control
- Add meal plan CSV files per trip (e.g. `moskangaisi2026/mealplan.csv`)
- Add tests for CSV parsing, data structuring, rendering at each drill level, person switching, and toggle behaviour

## Capabilities

### New Capabilities
- `meal-plan`: A `<meal-plan>` custom element that loads a CSV meal plan and provides three drill-down views — summary, daily breakdown, and full day detail — with per-person tab selection
- `macro-chart`: A `<macro-chart>` custom element that renders a CSS-only donut chart showing protein/fat/carb distribution from attributes
- `meal-plan-control`: A Leaflet map control button that toggles meal plan visibility via custom event

### Modified Capabilities
- Trip config loading (`main.js`): reads `mealPlan.csvUrl` from config and sets it on the `<meal-plan>` component
- Map initialization (`map.js`): adds `mealPlanControl` alongside existing controls
- `index.html`: includes new component scripts and elements

## Impact

- `index.html`: add `<script>` tags for `MealPlan.js`, `MacroChart.js`; add `<meal-plan>` element inside `<trip-view>`; add CSS link for `MealPlan.css`
- `assets/js/main.js`: add `initializeMealPlan(config)` function following `initializePackDetails` pattern
- `assets/js/map.js`: import and add `mealPlanControl` to map
- New files:
  - `assets/components/mealPlan/MealPlan.js` — main component
  - `assets/components/mealPlan/MealPlan.css` — styles with CSS classes per data field for show/hide control and responsive media queries
  - `assets/components/macroChart/MacroChart.js` — donut chart atom
  - `assets/components/macroChart/MacroChart.css` — chart styles
  - `assets/js/leaflet/mealPlanControl.js` — Leaflet control
  - `assets/css/meal-plan.css` — (if needed for non-shadow styles)
  - `tests/mealPlan.test.js` — component tests
- Per-trip: `mealplan.csv` added to trip folders that have meal plan data

## Design Decisions

### Three-level drill-down with view replacement (not accordion)
Each level replaces the previous view with a back link at the top. This works well on mobile — each view fits a screen without deep scrolling. Levels:
1. **Summary**: total weight, total calories, days, avg calories/day, `<macro-chart>` donut
2. **Daily**: per-day rows showing weight, calories, macro distribution as compact text (P:25% F:22% C:53%), and meal listings (name, brand, calories) grouped by meal type
3. **Day detail**: full table with all CSV fields for a single day, styled like pack details

### Person tabs — conditional, default to person 1
Tabs shown only when CSV contains multiple `PersonIndex` values. Person 1 selected by default. All views filter to the selected person.

### CSS conic-gradient donut for macro chart
Pure CSS, no canvas or libraries. Works in shadow DOM. Lightweight and consistent with the vanilla JS approach.

### Macro display varies by drill level
- Summary: visual donut chart via `<macro-chart>`
- Daily: compact text per day row (e.g. `P:25% F:22% C:53%`)
- Day detail: full numeric values per item

### Weight fallback: gross → net (silent)
`grossWeight || netWeight` used for weight calculations. No UI indication at summary/daily levels. At the day detail level, the gross weight column naturally shows empty when absent.

### CSS classes for field visibility control
Each data field in the detail view gets a descriptive CSS class (e.g. `.field-calories100g`, `.field-protein100g`). This makes it easy to hide fields via CSS — including responsive hiding via `@media` queries for mobile. No JS changes needed to adjust what's shown.

### Testability
- CSV parsing and data structuring are pure functions, testable without DOM
- Render output queryable via shadow DOM selectors
- Drill-down state changes testable by simulating clicks and checking rendered view
- Person switching testable by clicking tabs and verifying filtered data
- Toggle behaviour testable via custom event dispatch

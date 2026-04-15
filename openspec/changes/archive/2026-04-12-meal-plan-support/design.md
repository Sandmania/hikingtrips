## Context

The app displays hiking trip data (routes, pack lists, calendars) via vanilla web components with shadow DOM. Each feature follows a pattern: a Leaflet map control button dispatches a custom event, and a corresponding web component toggles its visibility in response. Trip-specific data (CSVs, GPX files) is referenced in per-trip `trip_config.yaml` files and loaded via path resolution in `main.js`.

Meal plan data is exported as CSV from an external tool with columns: Day, PersonIndex, MealType, Name, Brand, Net Weight, Gross Weight, CaloriesPortion, ProteinPortion, FatPortion, CarbsPortion, Calories100g, Protein100g, Fat100g, Carbs100g, MainCarb, PrimaryProtein. A plan can contain entries for one or more persons across multiple days.

## Goals / Non-Goals

**Goals:**
- Display meal plan data from CSV in a three-level drill-down UI (summary → daily → day detail)
- Support multi-person plans with tab-based person selection
- Follow existing component patterns (shadow DOM, custom events, Leaflet control)
- Make the detail view fields easy to show/hide via CSS classes (including responsive hiding)
- Ensure core logic (parsing, data structuring) is testable without DOM

**Non-Goals:**
- Editing or creating meal plans in the UI (data comes from external tool)
- Sharing meal plan data between trips
- Nutritional recommendations or validation

## Decisions

### Two custom elements: `<meal-plan>` and `<macro-chart>`

`<meal-plan>` is the organism that owns data loading, person selection, drill state, and rendering. `<macro-chart>` is a self-contained atom that renders a CSS conic-gradient donut from protein/fat/carb gram attributes. Meal items and day rows are rendered as HTML within `<meal-plan>` — they don't need their own custom elements since they have no reuse outside this context and no independent logic.

**Alternatives considered:** Single component with inline chart rendering. Rejected — the chart has self-contained rendering logic (compute percentages from grams, draw gradient) that benefits from isolation and independent testability.

**Alternatives considered:** Separate `<day-summary>` and `<meal-item>` elements. Rejected — over-atomizing for what are essentially styled div sections with no standalone behaviour.

### View replacement for drill-down (not accordion)

Clicking "Show daily breakdown" replaces the summary view with the daily view. Clicking a day replaces the daily view with that day's full detail. A back link at the top navigates up. This pattern works well on mobile because each view fits a screen without deep scrolling through expanded sections.

**Alternatives considered:** Accordion/progressive disclosure. Rejected for mobile — an 8-day trip with 6+ items per day creates an unmanageably long scrollable area.

### Person tabs, conditional visibility

Tab bar rendered only when the CSV contains more than one distinct PersonIndex value. Person 1 selected by default. All views filter to the selected person. Switching person resets drill level to summary.

### CSS conic-gradient for macro chart

Pure CSS donut using `conic-gradient()` with a white circle overlay for the hole. No canvas, no library. Protein/fat/carb percentages computed from gram values passed as attributes. Displayed at summary level only.

### Compact text macros at daily level

Instead of repeating the donut chart per day, the daily view shows macro distribution as inline text: `P:25% F:22% C:53%`. This keeps the daily rows compact and scannable.

### Weight fallback: gross → net, silent

Weight calculations use `grossWeight || netWeight`. No UI indication at summary/daily levels. The day detail view shows both columns — missing gross weight is naturally visible as an empty cell.

### CSS classes for detail field visibility

Each field in the day detail view gets a CSS class matching its data role (e.g. `.field-calories100g`, `.field-protein100g`, `.field-main-carb`). Fields can be hidden via CSS rules — either in the component stylesheet or via `@media` queries for responsive hiding. No JS changes needed to adjust what's shown.

### Data pipeline: parse → structure → render

CSV text is parsed into row objects (reusing the same `parseCsvRow` regex approach as PackDetails). Rows are then structured into a nested object: `persons[].days[].meals.{MealType}[].items[]`. Each level pre-computes its aggregates (total weight, calories, macros). The render method reads the current drill state and selected person to decide what to display.

Parsing and structuring are pure functions (no DOM dependency), making them directly unit-testable.

## Component Interfaces

### `<meal-plan>` (`tt-meal-plan`)
- **Shadow DOM**: yes, `mode: 'open'`
- **CSS**: external stylesheet via `<link>` in shadow DOM (same pattern as PackDetails)
- **Properties**: `csvUrl` setter/getter — triggers load pipeline or clear
- **Events listened**: `toggle-meal-plan` (document-level custom event)
- **Internal state**: `_selectedPerson` (index), `_drillLevel` (0=summary, 1=daily, 2=detail), `_selectedDay` (day number for level 2)
- **Methods**: `parseCsv(text)`, `structureData(rows)`, `render()`, `toggleDetails()`, `clear()`

### `<macro-chart>` (`tt-macro-chart`)
- **Shadow DOM**: yes, `mode: 'open'`
- **CSS**: inline `<style>` in shadow DOM (small enough to not warrant a separate file)
- **Attributes**: `protein`, `fat`, `carbs` (gram values as strings)
- **Observed attributes**: renders on attribute change
- **Rendering**: computes percentages, sets `conic-gradient` on a circular div, overlays a white circle for donut hole, shows percentage labels

### `mealPlanControl` (Leaflet control factory)
- Same API as `packDetailsControl`: `{ canAdd(), addTo(map) }`
- `canAdd()`: returns `!!config.csvUrl`
- Button dispatches `toggle-meal-plan` custom event

## File Layout

```
assets/
  components/
    mealPlan/
      MealPlan.js          # <tt-meal-plan> custom element
      MealPlan.css          # styles with .field-* classes, @media queries
    macroChart/
      MacroChart.js         # <tt-macro-chart> custom element (inline styles)
  js/
    leaflet/
      mealPlanControl.js    # Leaflet control factory
  css/
    meal-plan-control.css   # Map button icon style (if not inlined)
tests/
  mealPlan.test.js          # Unit tests
```

## Integration Points

1. **`trip_config.yaml`** — add `mealPlan.csvUrl` key (e.g. `mealPlan: { csvUrl: mealplan.csv }`)
2. **`main.js`** — add `initializeMealPlan(config)` following `initializePackDetails` pattern; add `mealPlan.csvUrl` to path resolution in `resolveRelativePaths`
3. **`map.js`** — import `mealPlanControl`, add to map alongside existing controls
4. **`index.html`** — add `<script>` tags, `<link>` for CSS, `<tt-meal-plan>` element inside `<trip-view>`
5. **`tests/index.html`** — add `<script>` for `mealPlan.test.js`

## Risks / Trade-offs

- **Large CSV on slow connection** — Meal plan CSVs for 8-day, 2-person trips are ~200 rows, well under 50KB. Not a concern.
- **CSS conic-gradient browser support** — Supported in all modern browsers. The app already uses modern JS features, so this aligns with the existing baseline.
- **Shadow DOM CSS path** — Using `../assets/components/mealPlan/MealPlan.css` relative path, same as PackDetails. Works because the HTML page is served from the project root.

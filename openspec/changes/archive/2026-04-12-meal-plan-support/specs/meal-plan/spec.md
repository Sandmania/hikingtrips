## ADDED Requirements

### Requirement: Meal plan loads and parses CSV data via csvUrl setter
The `<tt-meal-plan>` custom element SHALL fetch and parse a meal plan CSV when its `.csvUrl` property is set, and clear its contents when set to null.

#### Scenario: CSV loaded and parsed
- **WHEN** `.csvUrl` is set to a valid URL
- **THEN** the component fetches the CSV, parses it into structured data grouped by person, day, and meal type, and renders the summary view

#### Scenario: csvUrl set to null clears content
- **WHEN** `.csvUrl` is set to null
- **THEN** the component clears its rendered output and hides itself

#### Scenario: Fetch error handled gracefully
- **WHEN** the CSV fetch fails
- **THEN** the component logs an error to the console and does not crash

### Requirement: Meal plan structures data by person, day, and meal type
The `<tt-meal-plan>` component SHALL parse CSV rows into a nested structure: persons → days → meal types → items, with pre-computed aggregates at each level.

#### Scenario: Single person data
- **WHEN** CSV contains rows with only PersonIndex 1
- **THEN** structured data contains one person with days and meals grouped correctly

#### Scenario: Multi-person data
- **WHEN** CSV contains rows with PersonIndex 1 and 2
- **THEN** structured data contains two persons, each with their own days and meals

#### Scenario: Weight uses gross weight with net weight fallback
- **WHEN** computing weight totals
- **THEN** each item's weight is `Gross Weight` if present, otherwise `Net Weight`

#### Scenario: Aggregates computed per day and overall
- **WHEN** data is structured
- **THEN** each day has totalWeight, totalCalories, totalProtein, totalFat, totalCarbs; and each person has overall totals across all days

### Requirement: Summary view displays trip-level overview
The summary view (drill level 0) SHALL display total weight, total calories, number of days, average calories per day, and a `<tt-macro-chart>` donut showing protein/fat/carb distribution.

#### Scenario: Summary view rendered by default
- **WHEN** CSV is loaded
- **THEN** the summary view is displayed with aggregate totals for the selected person

#### Scenario: Summary shows navigation to daily view
- **WHEN** summary view is displayed
- **THEN** a clickable element allows drilling into the daily breakdown

### Requirement: Daily view displays per-day breakdown
The daily view (drill level 1) SHALL show each day's weight, calories, macro distribution as text, and meal listings grouped by meal type (name, brand, calories).

#### Scenario: Daily view shows all days
- **WHEN** the user drills from summary to daily view
- **THEN** each day is listed with its total weight, total calories, and macro percentages as compact text (e.g. P:25% F:22% C:53%)

#### Scenario: Daily view shows meals per day
- **WHEN** a day is displayed in the daily view
- **THEN** meals are listed grouped by type (Breakfast, Lunch, Dinner, Snack) showing name, brand, and calories per portion

#### Scenario: Daily view has back navigation
- **WHEN** the daily view is displayed
- **THEN** a back link navigates to the summary view

#### Scenario: Daily view allows drilling into a specific day
- **WHEN** a day is displayed in the daily view
- **THEN** a clickable element allows drilling into that day's full detail

### Requirement: Day detail view displays all fields
The day detail view (drill level 2) SHALL display all CSV fields for every meal item in the selected day, styled with CSS classes per field for show/hide control.

#### Scenario: All fields displayed
- **WHEN** the user drills into a specific day
- **THEN** all CSV columns are rendered for each item: Name, Brand, MealType, Net Weight, Gross Weight, CaloriesPortion, ProteinPortion, FatPortion, CarbsPortion, Calories100g, Protein100g, Fat100g, Carbs100g, MainCarb, PrimaryProtein

#### Scenario: Fields have CSS classes for visibility control
- **WHEN** the detail view is rendered
- **THEN** each field element has a CSS class matching its data role (e.g. `.field-calories100g`, `.field-protein100g`) allowing hiding via CSS

#### Scenario: Day detail has back navigation
- **WHEN** the day detail view is displayed
- **THEN** a back link navigates to the daily view

### Requirement: Person tabs for multi-person plans
The `<tt-meal-plan>` component SHALL display person-selection tabs when the CSV contains more than one PersonIndex, defaulting to person 1.

#### Scenario: Single person — no tabs
- **WHEN** CSV contains only one PersonIndex
- **THEN** no person tabs are rendered

#### Scenario: Multiple persons — tabs visible
- **WHEN** CSV contains multiple PersonIndex values
- **THEN** tabs are rendered, one per person, with person 1 selected by default

#### Scenario: Switching person updates the view
- **WHEN** the user clicks a different person tab
- **THEN** the view updates to show that person's data and resets to the summary view

### Requirement: Toggle visibility via custom event
The `<tt-meal-plan>` component SHALL toggle its visibility when a `toggle-meal-plan` custom event is dispatched on the document.

#### Scenario: Toggle shows hidden component
- **WHEN** `toggle-meal-plan` is dispatched and the component is hidden
- **THEN** the component becomes visible

#### Scenario: Toggle hides visible component
- **WHEN** `toggle-meal-plan` is dispatched and the component is visible
- **THEN** the component becomes hidden

#### Scenario: Event listener cleaned up on disconnect
- **WHEN** the component is removed from the DOM
- **THEN** it no longer responds to `toggle-meal-plan` events

### Requirement: Meal plan uses shadow DOM
The `<tt-meal-plan>` custom element SHALL use shadow DOM with mode 'open' for style encapsulation.

#### Scenario: Styles are encapsulated
- **WHEN** `<tt-meal-plan>` is rendered
- **THEN** its styles do not leak into or inherit from the outer document

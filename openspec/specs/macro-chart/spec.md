### Requirement: Macro chart renders a CSS donut from gram values
The `<tt-macro-chart>` custom element SHALL render a conic-gradient donut chart showing protein, fat, and carb distribution from gram values provided as attributes.

#### Scenario: Chart renders with valid values
- **WHEN** `protein`, `fat`, and `carbs` attributes are set to numeric gram values
- **THEN** the chart displays a conic-gradient donut with segments proportional to each macro's percentage of total grams

#### Scenario: Chart displays percentage labels
- **WHEN** the chart is rendered
- **THEN** percentage labels for protein, fat, and carbs are visible

### Requirement: Macro chart updates on attribute change
The `<tt-macro-chart>` custom element SHALL re-render when any observed attribute (`protein`, `fat`, `carbs`) changes.

#### Scenario: Attribute change triggers re-render
- **WHEN** the `protein` attribute is changed
- **THEN** the chart re-renders with updated proportions

### Requirement: Macro chart uses shadow DOM
The `<tt-macro-chart>` custom element SHALL use shadow DOM with mode 'open' and inline styles.

#### Scenario: Styles are encapsulated
- **WHEN** `<tt-macro-chart>` is rendered
- **THEN** its styles are scoped to the shadow DOM

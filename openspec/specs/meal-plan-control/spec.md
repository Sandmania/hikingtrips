### Requirement: Meal plan control adds a map button when CSV URL is configured
The `mealPlanControl` factory SHALL add a Leaflet control button to the map only when a `csvUrl` is provided in the config.

#### Scenario: csvUrl present — button added
- **WHEN** `mealPlanControl({ csvUrl: 'mealplan.csv' }).addTo(map)` is called
- **THEN** a button is added to the map's top-right control area

#### Scenario: csvUrl absent — no button
- **WHEN** `mealPlanControl({}).canAdd()` is called
- **THEN** it returns false and `addTo` does not add a control

### Requirement: Meal plan control button dispatches toggle event
The control button SHALL dispatch a `toggle-meal-plan` custom event on the document when clicked.

#### Scenario: Button click dispatches event
- **WHEN** the meal plan control button is clicked
- **THEN** a `toggle-meal-plan` CustomEvent is dispatched on the document

### Requirement: Alternatives UI hidden when no alternatives configured
The `LegAlternatives` component SHALL render no content when none of the trip legs have alternatives configured.

#### Scenario: Trip with no alternatives
- **WHEN** `legAlternatives.trip` is set to a trip where no leg has an `alternatives` array
- **THEN** the component renders nothing (empty shadow DOM)

#### Scenario: Trip with at least one alternative
- **WHEN** `legAlternatives.trip` is set to a trip where at least one leg has a non-empty `alternatives` array
- **THEN** the component renders the "Alternatives" heading and the corresponding checkboxes

### Requirement: Auto-show map layers when alternative is toggled
When an alternative checkbox is toggled, both the Trip layer (`legFeatureGroup`) and the Alternatives layer (`alternativeFeatureGroup`) SHALL be added to the map if they are not currently visible, before the route change is applied.

#### Scenario: Both layers visible
- **WHEN** an alternative checkbox is toggled AND both Trip and Alternatives layers are visible on the map
- **THEN** both layers remain visible and the trip route updates normally

#### Scenario: Trip layer hidden
- **WHEN** an alternative checkbox is toggled AND the Trip layer is not on the map
- **THEN** the Trip layer is added to the map before the route update is applied

#### Scenario: Alternatives layer hidden
- **WHEN** an alternative checkbox is toggled AND the Alternatives layer is not on the map
- **THEN** the Alternatives layer is added to the map before the route update is applied

#### Scenario: Both layers hidden (e.g. actual route mode)
- **WHEN** an alternative checkbox is toggled AND neither Trip nor Alternatives layers are on the map
- **THEN** both layers are added to the map before the route update is applied

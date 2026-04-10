## ADDED Requirements

### Requirement: Trip card renders from trip data property
The `<trip-card>` custom element SHALL render a trip card when its `.trip` property is set to a trip data object containing `id`, `name`, `dates`, and `image`.

#### Scenario: Card renders with all fields
- **WHEN** `.trip` is set with `id`, `name`, `dates`, and `image`
- **THEN** the card displays the hero image as background, the trip name as a heading, and the dates as a subheading

#### Scenario: Card links to the trip hash route
- **WHEN** the card is rendered
- **THEN** the card contains a link to `#<id>`

### Requirement: Trip card uses shadow DOM for style encapsulation
The `<trip-card>` custom element SHALL use a shadow DOM so that its styles do not leak into or inherit from the outer document.

#### Scenario: Card styles are encapsulated
- **WHEN** `<trip-card>` is rendered on the page
- **THEN** card-specific CSS rules (overlay, title, dates) are scoped to the shadow DOM and do not affect other elements on the page

### Requirement: Trip card provides hover interaction
The `<trip-card>` custom element SHALL provide a visual hover effect consistent with the current design (scale + overlay lightening).

#### Scenario: Hover state is applied
- **WHEN** the user hovers over a trip card
- **THEN** the card scales slightly and the overlay becomes more transparent

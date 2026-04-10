### Requirement: Trip grid fetches and renders trips from trips.json
The `<trip-grid>` custom element SHALL fetch `trips.json` from the project root when connected to the DOM and render one `<trip-card>` per entry.

#### Scenario: Cards rendered on connect
- **WHEN** `<trip-grid>` is connected to the DOM
- **THEN** it fetches `trips.json` and renders a `<trip-card>` for each trip entry in order

#### Scenario: No imperative initialization required
- **WHEN** `<trip-grid>` is present in `index.html`
- **THEN** no external JS call is needed to populate it — it drives itself

### Requirement: Trip grid uses shadow DOM for style encapsulation
The `<trip-grid>` custom element SHALL use a shadow DOM so that its grid layout styles are encapsulated.

#### Scenario: Grid layout is encapsulated
- **WHEN** `<trip-grid>` is rendered
- **THEN** the responsive grid layout CSS is scoped to its shadow DOM

### Requirement: Trip grid handles fetch errors gracefully
The `<trip-grid>` custom element SHALL handle a failed `trips.json` fetch without crashing the page.

#### Scenario: Fetch fails
- **WHEN** `trips.json` cannot be fetched
- **THEN** the grid renders empty and logs an error to the console

### Requirement: trips.json provides trip metadata
The `trips.json` file at the project root SHALL contain an array of trip objects, each with `id`, `name`, `dates`, and `image` fields.

#### Scenario: Valid trips.json structure
- **WHEN** `trips.json` is loaded
- **THEN** each entry has a string `id` (matches the trip folder name), a string `name`, a string `dates`, and a string `image` (root-relative path)

#### Scenario: URL derivable from id
- **WHEN** a trip entry has `id: "repovesi2023"`
- **THEN** the corresponding card links to `#repovesi2023` without a `url` field in the JSON

### Requirement: Trip resolved from URL hash
The system SHALL provide a single `trip.html` entry point at the root. When loaded, it SHALL read `window.location.hash` (stripping the leading `#`) to determine the trip identifier, then fetch `<tripId>/trip_config.yaml` to initialize the trip view.

#### Scenario: Valid hash loads correct trip
- **WHEN** user navigates to `trip.html#muotka2025`
- **THEN** the system fetches `muotka2025/trip_config.yaml` and renders the trip map and details

#### Scenario: Hash matches existing trip directory
- **WHEN** the hash value corresponds to a directory that contains `trip_config.yaml`
- **THEN** all trip components (map, calendar, pack details, leg alternatives) initialize using that config

### Requirement: Missing hash shows error
The system SHALL display a meaningful error when `trip.html` is loaded with no hash or an empty hash, rather than attempting to fetch an invalid config path.

#### Scenario: No hash in URL
- **WHEN** user navigates to `trip.html` with no fragment
- **THEN** the system displays an error message indicating no trip was specified, without making any config fetch request

### Requirement: Invalid or missing config handled gracefully
The system SHALL surface a user-visible error when the config fetch fails (e.g., trip directory does not exist or `trip_config.yaml` is absent), using the existing error toast mechanism.

#### Scenario: Hash points to nonexistent trip
- **WHEN** user navigates to `trip.html#nonexistent`
- **THEN** the system attempts to fetch `nonexistent/trip_config.yaml`, receives a non-OK response, and displays the error toast

### Requirement: Trip listing links use hash-based URLs
The trip listing page (`index.html`) SHALL link to trips using the `trip.html#<tripId>` format, where `<tripId>` matches the trip's directory name.

#### Scenario: Clicking a trip card navigates to hash URL
- **WHEN** user clicks a trip card on the listing page
- **THEN** the browser navigates to `trip.html#<tripId>` (e.g., `trip.html#muotka2025`)

### Requirement: Root-relative asset paths in trip.html
`trip.html` SHALL reference all assets (CSS, JS, components) using root-relative paths so it works correctly from the repository root regardless of which trip is loaded.

#### Scenario: Assets load correctly from root
- **WHEN** `trip.html` is served from the site root
- **THEN** all linked CSS, JavaScript, and web component files load without 404 errors

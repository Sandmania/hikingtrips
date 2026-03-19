## MODIFIED Requirements

### Requirement: Trip resolved from URL hash
The system SHALL use `index.html` as the single entry point. When loaded with a hash, it SHALL read `window.location.hash` (stripping the leading `#`) to determine the trip identifier, then fetch `<tripId>/trip_config.yaml` to initialize the trip view.

#### Scenario: Valid hash loads correct trip
- **WHEN** user navigates to `/#muotka2025`
- **THEN** the system fetches `muotka2025/trip_config.yaml` and renders the trip map and details

#### Scenario: Hash matches existing trip directory
- **WHEN** the hash value corresponds to a directory that contains `trip_config.yaml`
- **THEN** all trip components (map, calendar, pack details, leg alternatives) initialize using that config

### Requirement: Missing hash shows trip listing
The system SHALL display the trip listing (cards grid) when `index.html` is loaded with no hash or an empty hash, rather than showing an error.

#### Scenario: No hash in URL shows listing
- **WHEN** user navigates to `index.html` with no fragment
- **THEN** the system displays the trip cards listing without attempting any config fetch

### Requirement: Invalid or missing config handled gracefully
The system SHALL surface a user-visible error when the config fetch fails (e.g., trip directory does not exist or `trip_config.yaml` is absent), using the existing error toast mechanism.

#### Scenario: Hash points to nonexistent trip
- **WHEN** user navigates to `/#nonexistent`
- **THEN** the system attempts to fetch `nonexistent/trip_config.yaml`, receives a non-OK response, and displays the error toast

### Requirement: Trip listing links use hash-only URLs
The trip listing page SHALL link to trips using the `#<tripId>` format, where `<tripId>` matches the trip's directory name.

#### Scenario: Clicking a trip card navigates to hash URL
- **WHEN** user clicks a trip card on the listing page
- **THEN** the browser navigates to `/#<tripId>` (e.g., `/#muotka2025`) without a full page reload

### Requirement: Root-relative asset paths in index.html
`index.html` SHALL reference all assets (CSS, JS, components) using root-relative paths so it works correctly from the repository root regardless of which trip is loaded.

#### Scenario: Assets load correctly from root
- **WHEN** `index.html` is served from the site root
- **THEN** all linked CSS, JavaScript, and web component files load without 404 errors

## REMOVED Requirements

### Requirement: Trip listing links use hash-based URLs
**Reason**: Replaced by updated requirement using hash-only URLs (`#<tripId>` instead of `trip.html#<tripId>`)
**Migration**: Update all trip card `url` values from `trip.html#<tripId>` to `#<tripId>`

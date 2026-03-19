## ADDED Requirements

### Requirement: Single entry point serves both views
The system SHALL use `index.html` as the sole HTML entry point. It SHALL render the trip listing view when no hash is present, and the trip detail view when a hash is present.

#### Scenario: No hash shows trip listing
- **WHEN** user navigates to the site root with no fragment (e.g., `/hikes/`)
- **THEN** the trip listing (cards grid) is displayed and the trip detail view is hidden

#### Scenario: Hash present shows trip detail
- **WHEN** user navigates to `/#<tripId>` (e.g., `/#muotka2025`)
- **THEN** the trip detail view is displayed and the trip listing is hidden

### Requirement: Hash-based navigation preserves browser history
The system SHALL push history entries when navigating between views so that the browser back and forward buttons work correctly.

#### Scenario: Back from trip returns to listing
- **WHEN** user clicks a trip card (adding a hash to the URL) and then presses the browser back button
- **THEN** the hash is removed, the `hashchange` event fires, and the trip listing is displayed

#### Scenario: Forward after back restores trip view
- **WHEN** user navigates back to the listing and then presses the browser forward button
- **THEN** the hash is restored, the `hashchange` event fires, and the correct trip detail view is displayed

### Requirement: Router module coordinates view switching
The system SHALL provide `assets/js/router.js` as the module script entry point in `index.html`. It SHALL import card-rendering logic from `index.js` and trip initialization from `main.js`, and SHALL delegate to the appropriate function based on `window.location.hash`.

#### Scenario: Router calls card renderer when no hash
- **WHEN** `router.js` runs and `window.location.hash` is empty
- **THEN** it calls the card-rendering function from `index.js` and shows the index view

#### Scenario: Router calls trip init when hash present
- **WHEN** `router.js` runs and `window.location.hash` is non-empty
- **THEN** it calls the trip initialization function from `main.js` and shows the trip view

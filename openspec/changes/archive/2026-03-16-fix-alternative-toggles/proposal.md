## Why

The leg alternatives panel in the trip info component has two UX bugs: the "Alternatives" heading renders even when no alternatives are configured, and the alternative toggles can be interacted with silently when the Trip and Alternatives map layers are hidden — giving the user no visual feedback that anything changed.

## What Changes

- `LegAlternatives` web component renders nothing when the trip has no alternatives configured
- When an alternative checkbox is toggled and either the Trip or Alternatives map layer is not currently visible, both layers are automatically added to the map before applying the selection

## Capabilities

### New Capabilities
- `conditional-alternatives-ui`: `LegAlternatives` only renders when alternatives exist; auto-shows both trip and alternatives map layers when an alternative is toggled while layers are hidden

### Modified Capabilities

## Impact

- `assets/components/legAlternatives/LegAlternatives.js` — render guard added
- `assets/js/map.js` — `alternatives-change` event handler gains auto-show logic for `legFeatureGroup` and `alternativeFeatureGroup`

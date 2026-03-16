## 1. LegAlternatives render guard

- [x] 1.1 In `LegAlternatives.render()`, add an early-return guard that checks `this._trip.some(leg => leg.alternatives?.length > 0)` and sets `shadowRoot.innerHTML = ''` if false

## 2. Auto-show map layers on alternative toggle

- [x] 2.1 In the `alternatives-change` event handler in `map.js`, add `map.hasLayer` checks for both `legFeatureGroup` and `alternativeFeatureGroup` and call `map.addLayer` for each if not present, before calling `updateMapWithAlternatives`

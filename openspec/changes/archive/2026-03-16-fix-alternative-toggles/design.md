## Context

The trip info panel hosts a `<leg-alternatives>` web component that renders checkboxes for selecting alternative route options. This component is purely presentational and has no knowledge of Leaflet map layer state. The map manages two relevant feature groups: `legFeatureGroup` ("Trip" overlay) and `alternativeFeatureGroup` ("Alternatives" overlay), both controlled via Leaflet's layer control.

Currently:
1. `LegAlternatives.render()` always outputs an `<h3>Alternatives</h3>` heading even when no leg has alternatives configured.
2. The `alternatives-change` event handler in `map.js` applies route changes to `legFeatureGroup` without checking whether that layer (or `alternativeFeatureGroup`) is currently visible on the map.

## Goals / Non-Goals

**Goals:**
- Suppress the alternatives UI entirely when no alternatives are configured
- Ensure toggling an alternative always produces a visible map change by auto-showing both Trip and Alternatives layers if either is hidden

**Non-Goals:**
- Adding explicit layer visibility state tracking to the UI components
- Disabling or locking the toggles based on layer state
- Changing how alternatives are selected or applied

## Decisions

**1. Render guard in `LegAlternatives` (no heading issue)**

Check `this._trip.some(leg => leg.alternatives?.length > 0)` at the top of `render()`. If false, set `shadowRoot.innerHTML = ''` and return early.

Alternative considered: hide only the heading element and keep the checkbox list. Rejected — if there are no alternatives, the component has nothing to show and should be invisible.

**2. Auto-show layers in `map.js` `alternatives-change` handler**

Use Leaflet's `map.hasLayer(featureGroup)` to check visibility, then `map.addLayer(featureGroup)` if not present — before calling `updateMapWithAlternatives`. Both `legFeatureGroup` and `alternativeFeatureGroup` are checked and shown.

Alternative considered: dispatching a `trip-layers-visibility-change` event from map.js to the components so they could hide/disable themselves. Rejected — adds ongoing state synchronization complexity for a problem that can be solved simply at the point of action. The auto-show approach is more helpful (user's intent is unambiguous when they check a box) and requires no new event infrastructure.

Alternative considered: showing a toast/warning when toggling while layers are hidden. Rejected — more friction than value; auto-show is the right behavior.

## Risks / Trade-offs

- **Auto-show may surprise users who intentionally hid the layers** → Acceptable trade-off: the alternatives panel is specifically for configuring the visible trip route; using it implies wanting to see the result. The user can re-hide layers after.
- **Actual route mode starts with trip/alternatives layers hidden** → Auto-show handles this correctly; it's exactly the scenario where the behavior is most useful.

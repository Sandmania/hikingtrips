# 0008 — Elevation profile: intermittent TypeError when resize beats the marker import

- **Type**: AFK
- **Status**: ready
- **Blocked by**: none — can start immediately

## Symptom

On roughly one page load in three of a trip with an actual route, an uncaught
exception reaches the console:

```
TypeError: Cannot read properties of undefined (reading 'remove')
    at e._hideMarker      (leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js:1:16174)
    at e._resetDrag       (leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js:1:25750)
    at e._resetView       (leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js:1:25820)
    at e.fire             (leaflet@1.9.4/dist/leaflet.min.js:11:5370)
    at e.invalidateSize   (leaflet@1.9.4/dist/leaflet.min.js:11:32827)
    at                     leaflet-elevation@2.5.1/dist/leaflet-elevation.min.js:1:14838
```

Nothing of ours appears in the stack. It reproduces on a pristine checkout of
`9c085f6` with none of the Weather Timeline work present, at the same rate, so
it predates that feature and is not caused by it. It was found while verifying
issue 0001 and split out rather than fixed there.

## Mechanism

Line numbers below are from the **unminified** build, which is worth reading
alongside the minified one the site loads:
`https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.1/dist/leaflet-elevation.js`

`_hideMarker` guards on the option but never on the object it dereferences:

```js
_hideMarker() {                        // line 930
    if (this.options.autohideMarker) {
        this._marker.remove();         // this._marker may not exist yet
    }
},
```

`this._marker` is assigned inside the `.then()` of an async dynamic import:

```js
this.import([this.__D3, this.__LMARKER])   // line 1024
    .then((m) => {
        this._marker = new (m[1] || Elevation).Marker(this.options, this);
        this.fire("elechart_marker");
    });
```

Meanwhile a *different* promise chain calls `map.invalidateSize()` when the
control finishes integrating with the map (line 828). `invalidateSize()` fires
Leaflet's `resize`, which is bound to `_resetView` (line 983), which reaches
`_hideMarker` by two paths (lines 1517 and 1526).

So the two chains race. Whenever `invalidateSize()` wins against the
`__D3`/`__LMARKER` import, `_marker` is still undefined and `_hideMarker`
throws. Because both sides wait on network fetches, the winner varies per load
— which is exactly the observed intermittency, and why it shows up more on a
cold CDN cache.

Note this is the same async import that ADR-0001 already calls out as racy:
*"`import(this.__D3)` fires asynchronously when the elevation control adds
data, so a visitor who opens the timeline early loses the race."* Same
mechanism, different symptom.

## Consequences

Not merely noise in the console. Leaflet's dispatch loop has no `try`/`catch`
(`leaflet@1.9.4/src/core/Events.js:188-197`), so the throw:

- aborts the remaining `resize` listeners for that fire, and
- skips `this._firingCount--`, leaving the counter permanently incremented,
  which changes how `off()` cleans up listener arrays afterwards.

Whether either is visible to a viewer is **not yet established** — establishing
it is part of this issue. `_resetView`'s own `fitBounds()` call is skipped, but
`_initMapIntegrations` has already fitted bounds by then, so the map does still
frame the route.

## Reproducing

There is no headless runner checked into this repo. The cheapest reproduction
is Playwright driving a static server over `public/`, reloading the trip page
and collecting `pageerror`:

```js
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.stack));
await page.goto(`http://127.0.0.1:${port}/index.html#muotka2025`);
await page.waitForTimeout(6000);
console.log(errors.join('\n'));
```

Run it several times — a single clean run proves nothing. Four runs gave two
failures on the working tree and one on pristine `9c085f6`. Throttling the
network makes it more reliable to hit than repeating at full speed.

## Fix options

Upgrading does not help: `_hideMarker` is byte-identical and still unguarded in
**2.5.2 and 2.6.0**, both checked. (2.6.0 also does not change the pinned
togeojson, per the handoff.)

Ranked, and bearing in mind the standing constraint that third-party libraries
are not to be shimmed or patched underneath — work with what a library
supports, or change our own data:

1. **`autohideMarker: false` in the elevation options.** `_hideMarker` becomes
   a no-op and the race cannot fire. It is a documented public option
   (defaulting to `true`, line 252), so this is using the library as intended
   rather than patching it. The cost is that the position marker no longer
   auto-hides on zoom/drag. We already set `followMarker: false`, so the marker
   only appears on chart hover — confirm visually that leaving it up through a
   zoom looks acceptable before settling on this.
2. **Report upstream.** `_hideMarker` should be `this._marker?.remove()`. Worth
   filing regardless of which workaround lands, so the next upgrade can drop it.
3. **Accept and document.** Only if 1 proves visually unacceptable. Say so in
   an ADR rather than leaving a mystery exception in the console.

Do **not** wrap or replace `_hideMarker` on the prototype.

## Acceptance criteria

- [ ] The exception no longer appears across at least 10 consecutive loads of a
      trip with an actual route
- [ ] The elevation profile still draws, still tracks the cursor, and still
      shows its position marker on hover
- [ ] The map still frames the route on load
- [ ] Whichever option is taken is recorded — an ADR if it is 3, a comment
      citing this issue if it is 1
- [ ] If the marker's zoom behaviour changes visibly, a human has looked at it

## Blocked by

None — can start immediately

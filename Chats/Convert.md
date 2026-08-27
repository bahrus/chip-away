# Convert To New Tech Stack

## Bruce's Ask

Please follow the instructions of [New Custom Element](../types/NewCustomElement.md) to convert the code found in [Legacy chip-away](../legacy/chip-away.js) and [Legacy def](../legacy/index.js) to the new tech stack.

## Implementation Notes

The conversion follows the JS-first custom element pattern from [New JS First Custom Element](../types/NewJSFirstCustomElement.md):

1. **Package dependencies** — `package.json` was updated to use the `ElementMaker` stack:
   - `el-maker@0.0.22` and `assign-gingerly@0.0.87` as runtime dependencies
   - Removed the old `trans-render` dependency and the `be-valued` dev dependency
   - Added `npm run build` to generate `defRef.json` from `defRef.mjs`
   - Note: the versions shown in the reference instructions were placeholders/stubs; the latest published versions at the time of conversion were used.

2. **Type definitions** — `types/chip-away/types.d.ts` was rewritten for the new stack with `EndUserProps`, `AllProps`, `AP`, `RunTimeProps`, plus the internal `ChipAwayFeature` interfaces.

3. **Import map** — `imports.html` now maps `assign-gingerly/`, `el-maker/`, `roundabout-lib/`, and `chip-away/`.

4. **Element class** — `chip-away-element.js` extends `ElementMaker` and declares a `chipAway` feature slot with lifecycle callback forwarding.

5. **Feature implementation** — `ChipAwayFeature.js` contains the dynamic chip-rendering logic migrated from the legacy `ChipAway` class:
   - Maintains the original `WeakMap`/`Map` bookkeeping for chip-to-option and clear-button-to-select mappings
   - Wires `change` listeners on target `<select>` elements and `click` handling for chip removal / clear-all
   - Uses `AbortController` for listener cleanup and guards against double-connect after disconnect

6. **Configuration wiring** — `defRef.mjs` exports the default feature configuration (`truthSourcer`, `roundabout`).
   - `wireFeatures.js` imports `assign-gingerly/assignFeatures.js` to install `customElements.assignFeatures` and then calls it with the inherited `ElementMaker` features plus the element-specific `chipAway` feature.
   - `def.js` performs the side-effect registration.
   - Note: the reference instructions mention `resolveAndAssignFeatures`, but that export does not exist in the installed `assign-gingerly`; using `customElements.assignFeatures` directly works.

7. **Entry point compatibility** — `index.js` now imports `def.js` so existing test pages that import `../index.js` continue to work.

8. **Tests** — The existing Playwright test HTML pages remain in place; only the initial test delay in `tests/Example1.html` was increased to account for the async feature-resolution lifecycle of the new stack.

9. **Verification** — All 5 Playwright tests pass after the conversion.

## Bruce's Response I

Nice job with the conversion.

But I really don't see cases where any other custom element would want to reuse the ChipAwayFeature.  Am I wrong?

If not, 

1.  Can you absorb all that logic back into chip-away-element.js?

2.  Can you also update the [New JS First Custom Element](../types/NewJSFirstCustomElement.md) instructions to weaken the wording that encouraged the use of defining a feature, stressing that to do so, there should be a significant chance that other custom element libraries would want to reuse the feature?

Please add your thoughts and/or implementation notes below.

## Implementation Notes II

1. **Absorbed `ChipAwayFeature` into `chip-away-element.js`** — Since the chip-rendering behavior is specific to this single element and unlikely to be reused by other custom elements, the logic was moved directly into the element class:
   - Removed `ChipAwayFeature.js` and deleted the `chipAway` feature slot from `chip-away-element.js`.
   - Added private methods (`#connect`, `#cleanup`, `#hydrate`, `#renderSelectChips`, `#createChipElement`, `#createChipsContainer`, `#getLegendText`, `#findElement`, `#getRoot`) and `handleEvent` to `ChipAwayElement`.
   - Implemented `connectedCallback`, `disconnectedCallback`, and `attributeChangedCallback` on the element class to drive the chip rendering and cleanup.

2. **Updated `wireFeatures.js`** — Removed the `chipAway` feature configuration. The file now only wires the inherited `ElementMaker` features (`truthSourcer`, `faceUp`, `roundabout`) with their default/configured settings.

3. **Simplified `types/chip-away/types.d.ts`** — Removed the feature-specific interfaces (`FeatureProps`, `FeatureAllProps`, `FeatureAP`, `FeatureSpawnContext`) since there is no longer a separate feature.

4. **Updated guidance in `types/NewJSFirstCustomElement.md`** — Rewrote Step 6 to stress that an element-specific feature should only be created when the behavior is non-trivial and there is a significant chance other custom element libraries will reuse it. For behavior unique to a single element, keep the logic in the element class.

5. **Verification** — All 5 Playwright tests continue to pass after absorbing the feature logic back into the element class.



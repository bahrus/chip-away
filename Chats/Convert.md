# Convert To New Tech Stack

Please follow the instructions of [New Custom Element](../types/NewCustomElement.md) to convert the code found in [Legacy chip-away](../legacy/chip-away.js) and [Legacy def](../legacy/index.js) to the new tech stack.

## Implementation Notes

The conversion follows the JS-first custom element pattern from [New JS First Custom Element](../types/NewJSFirstCustomElement.md):

1. **Package dependencies** — `package.json` was updated to use the `ElementMaker` stack:
   - `el-maker` and `assign-gingerly` as runtime dependencies
   - Removed the old `trans-render` dependency
   - Added `npm run build` to generate `defRef.json` from `defRef.mjs`

2. **Type definitions** — `types/chip-away/types.d.ts` was rewritten for the new stack with `EndUserProps`, `AllProps`, `AP`, `RunTimeProps`, plus the `ChipAwayFeature` interfaces.

3. **Import map** — `imports.html` now maps `assign-gingerly/`, `el-maker/`, `roundabout-lib/`, and `chip-away/`.

4. **Element class** — `chip-away-element.js` extends `ElementMaker` and declares a `chipAway` feature slot with lifecycle callback forwarding.

5. **Feature implementation** — `ChipAwayFeature.js` contains the dynamic chip-rendering logic migrated from the legacy `ChipAway` class:
   - Maintains the original `WeakMap`/`Map` bookkeeping for chip-to-option and clear-button-to-select mappings
   - Wires `change` listeners on target `<select>` elements and `click` handling for chip removal / clear-all
   - Uses `AbortController` for listener cleanup and guards against double-connect after disconnect

6. **Configuration wiring** — `defRef.mjs` exports the default feature configuration (`truthSourcer`, `roundabout`). `wireFeatures.js` resolves and assigns the inherited `ElementMaker` features plus the element-specific `chipAway` feature. `def.js` performs the side-effect registration.

7. **Entry point compatibility** — `index.js` now re-exports/imports `def.js` so existing test pages that import `../index.js` continue to work.

8. **Tests** — The existing Playwright test HTML pages remain in place; only the initial test delay in `tests/Example1.html` was increased to account for the async feature-resolution lifecycle of the new stack.

9. **Build** — `defRef.json` is generated from `defRef.mjs` via `npm run build`.

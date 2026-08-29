#  MaxJoin

## Bruce's Ask

I'm not at all sure what the best name for this property / attribute should be, but can you add something like maxJoin / max-join, of type number?  If defined, then if the number of selection options exceeds that number, just make the text say "[n] Selected".  Only application if join is enabled.

Let me know if more clarification needed below.  If not, please implement and add your implementation notes below.

## Implementation Notes

Added a numeric `maxJoin` property / `max-join` attribute. When `join` is on and the selected-option
count **exceeds** `maxJoin`, the single summary chip's label becomes `"<n> Selected"` (e.g.
`"3 Selected"`) instead of the comma-joined list. No effect unless `join` is enabled — it only
feeds the join-mode label path.

### Wiring (same shape as `join` / `readonly`, plus a kebab attr name)

`defRef.mjs`:
- `withAttrs`: `maxJoin: 'max-join'` (property `maxJoin`, attribute `max-join`) + `_maxJoin:
  { instanceOf: 'Number' }`.
- **No `valIfNull`** — an absent `max-join` attribute leaves `maxJoin` `undefined` (⇒ no limit),
  which is what "only applies if defined" needs. `valIfNull: 0` would have meant "collapse always".
- **No `sourceOfTruth`** — plain config: the attribute seeds the initial value, the property is
  authoritative after.
- `raConfig.compacts`: `when_maxJoin_changes_call_hydrate: 0` — setting `el.maxJoin` at runtime
  re-renders.
- `defRef.json` regenerated.

`types/chip-away/types.d.ts`: `maxJoin?: number` on `EndUserProps`.

The `Number` parser (`el-maker` default for `instanceOf: 'Number'`) throws on a non-numeric
`max-join` value and yields `null` for `max-join=""`; `joinLabel` treats anything that isn't a
finite number as "no limit".

### Rendering

New public (overridable) hook `joinLabel(selectedOptions) -> string`, called by
`renderJoinedChip`:

```js
joinLabel(selectedOptions) {
    const { maxJoin } = /* runtime props */ this;
    if (typeof maxJoin === 'number' && Number.isFinite(maxJoin)
        && selectedOptions.length > maxJoin) {
        return `${selectedOptions.length} Selected`;
    }
    return selectedOptions.map(o => o.textContent).join(', ');
}
```

Added to the README "methods you can override" table.

### Naming

Went with Bruce's suggested `maxJoin` / `max-join`. Alternatives if it should read better:
`joinLimit` / `join-limit`, `collapseAfter` / `collapse-after`. Cheap to change (the `maxJoin`
entries in `defRef.mjs`, `types.d.ts`, and `joinLabel`).

The `"<n> Selected"` wording is hard-coded in `joinLabel`; override that method for i18n / a
different phrasing.

### Tests / demo

- `tests/Example10.html` + `tests/test10.spec.mjs`: `join max-join="2"` with 3 selected →
  `"3 Selected"`; raising `maxJoin` to 5 and to `undefined` → back to the joined list; dropping to
  2 then deselecting one → `"Option 1, Option 2"` (count no longer exceeds the limit).
- `demo/dev.html` got a `max-join` number input.

11 Playwright tests pass.

### Note (unrelated)

The README still has no section documenting the `join` / `readonly` / `max-join` **configuration
attributes** themselves (only `for` is covered, and the override table). Worth a dedicated
"Attributes" section at some point.

## Bruce's Response I

You read my mind.  Please update the README.me documenting all the attributes / configuration properties.

## Claude's Response II

Added a **Configuration** section to `README.md` (after "Legend Text Resolution"): a table covering
`for` / `join` / `readonly` / `max-join` (attribute, property, type, default, effect) plus an
"Attribute vs. property" note spelling out that `join` / `readonly` / `max-join` are seed-only —
the property is authoritative after load — with a short before/after code sample.

While there, fixed two adjacent stale spots:
- The "How It Works" rendered-markup example (was showing `data-clear-select-id` and `✕` text
  content; now matches the real output — empty buttons with `part` / `aria-label`).
- The "Custom Naming" snippet (was `import { ChipAway } from 'chip-away/chip-away.js'`; now
  `ChipAwayElement` from `chip-away-element.js` **plus** the required `wireFeatures(...)` call).
  Verified the corrected snippet actually registers and renders.
# Inline Option

## Bruce's Ask

I'm not sure what the best name for this property / attribute should be, but for the sake of discussion let's call it "inline" / "inline".

If inline is set to true, instead of showing multiple chips, just show one, with the label text showing a comma delimited list of the option text.

If more clarity needed, please articulate the issues below, otherwise, please implement, and add implementation notes below.

## Implementation Notes

### Behavior

With `inline`, each referenced `<select>` collapses to **one** chip whose label is the selected
option texts joined by `', '` (e.g. `Option 1, Option 2, Option 3`). Its ✕ clears every selected
option for that `<select>` — reusing the existing "clear all" path
(`#clearButtonToSelectMap`), so no new event wiring. A `<select>` with nothing selected renders no
chip / no fieldset, same as expanded mode. Multiple selects → one summary chip each, in their own
fieldsets.

### Attribute / property wiring — `inline` → `inlined`

Mirrors the existing `for` → `splitFor` split:

| what | name | type |
| --- | --- | --- |
| public boolean attribute | `inline` | presence = true |
| internal parsed prop that drives rendering | `inlined` | `boolean` |

`defRef.mjs`:
- `withAttrs._inline`: `{ mapsTo: 'inlined', instanceOf: 'Boolean', sourceOfTruth: true, valIfNull: false }`
- `raConfig.compacts`: added `when_inlined_changes_call_hydrate: 0`
- `truthSourcer.observedAttributes`: added `'inline'`
- `defRef.json` regenerated (`npm run build`)

**Why a separate `inlined` prop rather than just using `inline`:** `truthSourcer` two-way-binds
attribute `inline` ↔ the *same-named* property, and on upgrade it coerces the attribute against
`el.inline`'s current value (`undefined`) → lands a string `''` on the property, which then blocks
roundabout's boolean parse ("skip properties already set"). Parsing the attribute into a distinct
`inlined` sidesteps that entirely — `truthSourcer` can have its harmless `el.inline` string,
`inlined` stays a clean boolean.

### Reactivity / limitation

`el.inlined = true/false` at runtime re-renders (via `when_inlined_changes_call_hydrate`). Changing
the `inline` **attribute** after load is *not* honored — this codebase parses source-of-truth
attributes once at spawn (confirmed the `for` attribute behaves identically: live `setAttribute`
changes don't re-derive `splitFor`). `inline` set in the HTML at load works fine. `demo/dev.html`
got an `inline` checkbox that flips `el.inlined` for manual play.

### Rendering refactor (chip-away-element.js)

- `#createChip(labelText)` → `{ chip, button }`: shared MUI chip shell; `#createChipElement`
  (per-option) now builds on it, `#renderInlineChip` (per-select summary) also uses it.
- `#renderSelect(select)`: dispatches on `inlined` → `#renderInlineChip` or `#renderSelectChips`.
  Called from both `hydrate` and the `change` handler, so live `<select>` edits stay in the chosen
  mode.

### Naming

Implemented under Bruce's placeholder `inline`, but I'd rename it — `inline` collides with the CSS
display concept and reads like a layout knob. Candidates: **`summary`**, `collapsed`, `joined`.
Cheap to change: the three `inline`/`inlined` entries in `defRef.mjs`, the two props in
`types/chip-away/types.d.ts`, and the `#renderSelect` destructure.

### Tests

`tests/Example7.html` + `tests/test7.spec.mjs`: `inline` set in HTML → exactly one chip with the
comma-delimited label → its ✕ clears the select. All 8 Playwright tests pass.

## Bruce's Response

First, I would like to understand better why we seemingly can't have the same name for an attribute as a property.  Whatever we rename it to, I would rather not employ any "hacks" and raise an issue and fix the core dependencies to support this.

Second, only "source of truth" attributes are meant to provide two way linkage between attribute and property, and they have to be the same name for that work.  This shouldn't be a source of truth attribute.

Generally, the underlying libraries prefer using attributes only for server rendered configuration, and updating via properties after that, and reflecting via custom state (another feature we should probably add, but not yet).

Let's go with the name "join"

## Claude's Response II

Renamed to `join` and dropped `sourceOfTruth` — no derived prop, no hack. Attribute and
property are both just `join`.

### Why the same name "couldn't" work before — it was `sourceOfTruth`, not a naming rule

There's no rule against an attribute and property sharing a name; that's the normal case (and is
what `join` does now). The conflict was entirely a side effect of `sourceOfTruth: true`, which
opts the attribute into the `TruthSourcer` feature:

1. On upgrade, the browser calls `attributeChangedCallback('join', null, '')`, forwarded to
   `TruthSourcer`.
2. `TruthSourcer.#coerce(newValue, currentValue)` infers the target type from
   **`host.join`'s current value**. But `roundabout` installs the `join` accessor lazily (first
   feature access, ~`connectedCallback`), so at this instant `host.join` is `undefined` →
   `#coerce` falls through to its string branch → sets `host.join = ''`.
3. When `roundabout` later runs its `withAttrs` parse, `assignGingerly` in custom-element mode
   *skips properties already set on the element* — `join` is now `''`, so the parsed boolean
   `true` never lands. `host.join` is stuck at `''`.

For `for` this never bites: `_for` maps to a **different** prop (`splitFor`), and the value is a
string, for which `#coerce`'s fallback is already correct.

So it's a `TruthSourcer` init-order issue specific to a boolean `sourceOfTruth` attribute whose
property is owned by another (lazily-installed) feature — not a same-name limitation. Filing an
upstream issue still seems worthwhile (e.g. `#coerce` could treat `newValue === '' ||
newValue === attrName` as `true` when it can't infer a type, or read the `withAttrs` `instanceOf`
metadata), but nothing here needs it: `join` isn't `sourceOfTruth`.

### Final wiring

- `withAttrs._join`: `{ instanceOf: 'Boolean', valIfNull: false }` — no `mapsTo` (defaults to
  `join`), no `sourceOfTruth`. The attribute seeds the initial value at spawn; after that the
  `join` **property** is authoritative and the attribute is not reflected.
- `raConfig.compacts`: `when_join_changes_call_hydrate: 0`
- `truthSourcer.observedAttributes`: back to `['for']` only
- element: `#renderSelect` reads `this.join`; `#renderJoinedChip` builds the summary chip

### Tests

- `test7` — `join` attribute set in HTML → one comma-joined chip → its ✕ clears the select.
- `test8` — starts expanded, `el.join = true` → one joined chip, `el.join = false` → back to
  three. (Runtime path is the property, per the "attributes for initial config, properties
  after" convention.)

9 Playwright tests pass.
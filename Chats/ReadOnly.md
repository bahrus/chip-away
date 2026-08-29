# ReadOnly mode

## Bruce's Ask

Can you add an attribute, readonly, and a corresponding property, so that no ability to remove options is available?

## Implementation Notes

Added boolean `readonly` — same wiring as `join` (see [InlineOption.md](./InlineOption.md)): plain
config attribute, **not** `sourceOfTruth`, same name for attribute and property. The attribute
seeds the initial value at spawn; the `readonly` property is authoritative afterward.

`defRef.mjs`:
- `withAttrs._readonly`: `{ instanceOf: 'Boolean', valIfNull: false }` (no `mapsTo`, no `sourceOfTruth`)
- `raConfig.compacts`: `when_readonly_changes_call_hydrate: 0`
- `defRef.json` regenerated

`types/chip-away/types.d.ts`: `readonly: boolean` on `EndUserProps`.

### What `readonly` suppresses

Rendering threads a single `removable = !readonly` flag (read once in `#renderSelect`) down to:

| helper | effect when `readonly` |
| --- | --- |
| `#createChip` | builds `.chip` with the `span` label only — no delete `button` |
| `#createChipElement` | (per-option chip) no ✕, nothing added to `#chipToOptionRefs` |
| `#renderJoinedChip` | joined summary chip has no ✕ |
| `#createChipsContainer` | `<legend>` has no `.clear-all-trigger` |

The referenced `<select>` elements are never touched — `readonly` is purely a chip-away display
concern. The `change` listener stays wired, so if the underlying `<select>` is changed by other
means the chips still update. Toggling `readonly` at runtime re-renders via the compact.

No CSS change needed — a buttonless `.chip` is just the `span` with its `0 12px` padding, which
reads as a clean pill.

### Tests

`tests/Example9.html` + `tests/test9.spec.mjs`: `readonly` in HTML → 3 chips, 0 `.chip button`, 0
`.clear-all-trigger`; a chip click is inert; setting `el.readonly = false` brings the 3 ✕ buttons
and the clear-all back. 10 Playwright tests pass.
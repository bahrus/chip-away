# Look and feel

## Bruce's Ask

Can you adjust the css / html structure as needed so the chips look like  [MUI chips](https://mui.com/material-ui/react-chip/)?

Please add clarification needed below or if clear add the implementation notes.

## Implementation Notes

CSS-only change in [default.css](../default.css) — no HTML/JS structural changes, because the tests
(and example pages) depend on the current shape: `.chip` class, a `<button>` inside each chip,
`.clear-all-trigger`, and `<fieldset>` grouping. The existing markup already maps cleanly onto MUI's:
`<span>` → `.MuiChip-label`, `<button>` → `.MuiChip-deleteIcon` (keeping a real `<button>` is better
for a11y than MUI's bare `<svg>`).

Targeted the MUI v5 **filled** Chip, **medium** size:

| token | value |
| --- | --- |
| height | `32px` |
| border-radius | `16px` (fully rounded) |
| background | `rgba(0,0,0,0.08)` |
| text | `rgba(0,0,0,0.87)`, `0.8125rem` (13px), Roboto stack |
| label padding | `0 12px` |
| delete icon | `22px` disc, `margin: 0 5px 0 -6px`, `rgba(0,0,0,0.26)` → `0.4` on hover |

Details:

- **Delete affordance** mimics MUI's `CancelIcon`: a solid grey disc whose *colour* (not size)
  deepens on hover/active, with a `✕` (`\2715`) glyph knockout. Dropped the old `min-width/height:
  32px` tap-target sizing — it fought the compact 32px chip and MUI itself doesn't honor it here.
- Added `:focus-visible` rings (MUI primary blue) on both the delete button and clear-all — the old
  CSS had no keyboard-focus affordance.
- **Fonts:** kept a `'Roboto', 'Helvetica', 'Arial', sans-serif` stack. No web-font `@import` added
  (CSP/offline); on a box without Roboto installed it falls back to Arial — same as MUI would.
- **Grouping** (`<fieldset>` / `<legend>`) isn't a MUI Chip concept. Restyled it to a quiet 1px
  `rgba(0,0,0,0.12)` rounded box with a small uppercase-ish legend label, so the chips stay the
  visual focus. `.clear-all-trigger` was made a small (`18px`) version of the same grey disc.
- No dark-mode block — the file was light-only and the ask didn't mention it.

All 7 Playwright tests still pass. Verified visually against Example4 (3 chips + clear-all) and
Example5 (two groups).
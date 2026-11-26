# The legend text, in JSON

Follows on from gap 5 in [UseTreeInsteadOfChipAwayElement](./UseTreeInsteadOfChipAwayElement.md).

---

## AI Proposal

**Status:** proposal only. Nothing else in either repo has been changed.

### The job

Each `<select>` gets a fieldset, and its `<legend>` names the select. [README.md](../README.md#legend-text-resolution) promises this order:

1. **The select is inside a `<label>`:** the label's text, minus the select's own text.
2. **A `<label for>` names the select:** that label's text.
3. **Otherwise:** the select's `id`.

`getLegendText()` in [chip-away-element.js](../chip-away-element.js) does it with `textContent.replace(select.textContent, '')`. A path can read text, but can't subtract one text from another.

### The example

```html
<label>
    Colors
    <select id=colors multiple>
        <option selected>Red</option>
        <option>Green</option>
    </select>
</label>
<chip-away for=colors></chip-away>
```

The legend should read `Colors`. These are the obvious paths:

| Path | Gives | Why |
|---|---|---|
| `'?.labels?.0?.textContent'` | `Colors RedGreen` (with newlines) | A wrapping label's text includes the options |
| `'?.closest?.label?.querySelector?.:scope > :not(select)?.textContent'` (the first prototype) | nothing | There's no element around `Colors`, only text |

### Recommendation: a ` ?=` chain, with no new code

```JS
['legend', {}, [
    ['span', { 'textContent ?=': [
        '?.closest?.label?.querySelector?.:scope > :not(select)?.textContent',  // <label><span>Colors</span><select>
        '||', '?.closest?.label?.firstChild?.nodeValue?.trim|',                // <label>Colors <select>
        '||', '?.closest?.label?.lastChild?.nodeValue?.trim|',                 // <label><select> Colors</label>
        '||', '?.labels?.0?.textContent?.trim|',                               // <label for=colors>
        '||', '?.id',                                                          // no label
    ] }],
    /* the clear-all button */
]]
// assignOptions: { withMethods: ['querySelectorAll', 'querySelector', 'closest', 'trim'] }
```

Each rung handles one way of writing a label. When a rung gives nothing, or only whitespace (`''` after `trim`), `||` moves to the next. For the example above, the third rung gives `Colors`.

**Why `||` and not `??`:** the first and second rungs often find a whitespace-only text node (the newline before `<span>`), which `trim` turns into `''`. `??` would stop there, with an empty legend.

**Why the fourth rung is safe:** it's only reached when the label doesn't wrap the select (all three earlier rungs found nothing), so the label's text has no options in it.

### How it compares, measured

I ran the class's `getLegendText`, the chain, and the alternatives below against 13 ways of writing a label (Chromium, 0.0.113):

| Markup | Class today | Chain |
|---|---|---|
| `<label><span>Colors</span><select>` (all our examples) | Colors | Colors |
| The same, with newlines between | Colors | Colors |
| `<label>Colors <select>` | Colors | Colors |
| `<label><select> Colors</label>` | Colors | Colors |
| `<label>Colors <select><optgroup>…` | Colors | Colors |
| `<label for=colors>Colors</label>` | Colors | Colors |
| `<label for=colors>  Colors <em>*</em> </label>` | `  Colors * ` (untrimmed) | `Colors *` |
| A `for` label, and a wrapping one too | Also | Also |
| No label | colors (the id) | colors |
| Only `aria-label="Colors"` | colors | colors |
| Only `aria-labelledby` | colors | colors |
| `<label>Pick <b>colors</b>: <select>` | Pick colors: | **colors** |
| `<label><svg><title>i</title>…</svg><span>Colors</span><select>` | iColors | **i** |

**The chain matches the class on 11 of 13,** and on the untrimmed one it's arguably better. It differs on the last two:

- **Text and elements mixed:** the chain takes only the first element.
- **An icon before the text:** the chain takes the icon's text. (The class gives `iColors`, which isn't right either.)

Both of those are outside what the README promises, and outside our examples.

**In the chip-away prototype:** with this chain, its config has **no function pipes left.** Its 10 example pages pass, two chip-aways on one select both update, `change` reaches the select, and the element still comes back after being removed and re-added. The only thing left that isn't JSON is the `dataPipes.js` import (gap 6).

### Possible improvements to the chain

Each one is a single rung, if you want it:

- **`aria-label`:** `'||', '?.ariaLabel'` before `'?.id'`. The class ignores it. Adding it changes the legend for selects that have one, for the better I think.
- **`aria-labelledby`:** `'||', '?.ariaLabelledByElements?.0?.textContent?.trim|'`. Recent browsers only.
- **Icons:** `:scope > :not(select, svg)` in the first rung. That fixes the icon case, but not other non-text elements.

### Alternatives

#### A. A pipe: the label's text without its form controls

```JS
pipes: { labelText: /* clone the label, remove select/input/…, read textContent, tidy the whitespace */ }
'textContent ?=': ['?.labels?.0?.labelText', '||', '?.ariaLabel', '||', '?.id']
```

Measured with a function version: right on all 13 (and it reads `aria-label`). It would only be JSON as a data pipe, for example `{ textWithout: 'select, input, textarea, button' }`.

**Against:**
- Data pipes are about data, and run in o2h's worker, where there's no DOM. This one would only make sense in a page.
- It's a second way to read text, for one component.
- It costs a clone of the label on every render.

I'd only add it if a second component needs it.

#### B. Ask for the text explicitly

For example `<select data-legend="Colors">`, or `aria-label`, read by the first rung. Simple, but it changes chip-away's contract: today it works with plain labels. Possible as an extra rung, not a replacement.

#### C. A cloned label, through merges

Clone the label in one merge, remove its select in the next, and read its text. JSON can say this (`cloneNode`, then `remove|`), but it needs scratch properties per select and a careful order of merges. Too clever for what it buys.

#### D. Leave a function pipe

That keeps the class's exact behavior, but chip-away wouldn't be JSON only.

### What I'd do

Use the chain, with the `aria-label` rung, and update the README's "Legend Text Resolution" to list what's supported, including the two shapes that aren't. No assign-gingerly change is needed.

### Questions

1. Is the chain acceptable, given it differs from the class for labels that mix text and elements?
2. Add the `aria-label` rung (a change in behavior, I think for the better)?
3. Do you want alternative A, given that only chip-away needs it so far?

## Bruce's Response I (from UseTreeInsteadOfChipAwayElement.md)

> Please go with what you recommend.

## AI Implementation Notes I

The chain is in `parts.legendText` in [el-maker.mjs](../el-maker.mjs), with the `aria-label` rung before the `id`. Alternative A (a pipe) wasn't added. The README's new "HTML/JSON-first version" section lists the order, and the mixed-text limitation.

`tests/json-demo.spec.mjs` checks two label shapes through the `cede` demo: a `<span>` in the label, and bare text (`Select 2`).

# Use Tree Instead Of chip-away-element

## Bruce's Ask

Most of the web components in this [root folder](../../) are [HTML First](../types/NewCustomElement.md) web components.

chip-away is a notable exception to that rule.  Perhaps it is still the most viable solution.

But I would like you to please explore making it HTML first / HTML and JSON only by taking advantage of the [tree handler](https://github.com/bahrus/assign-gingerly/blob/baseline/docs/tree.md).  I kind of picture this HTMl configuration going inside the RAConfig section of the configuration.

Please:

1.  See if this is at all feasible.
2.  Identify if there are any gaps in what the tree handler covers that we could close first in the assign-gingerly package / polyfill.

Please add your thoughts below.

## Claude's Response I

### Short answer

**Yes, it's feasible, and close.** I prototyped it as one JSON config with no element class, with the tree inside `raConfig.merges`, as you pictured. It ran in Chromium against the installed assign-gingerly 0.0.109, whose `handlers/tree.js` matches baseline.

| Prototype | Example1–10 |
|---|---|
| Pure JSON | 7 of 10 (7, 8 and 10 fail: all need the `join` label) |
| Same JSON + three one-line function pipes | 10 of 10 |

Removing and re-adding the element also worked, including picking up a selection made while it was detached. (The current class passes all 11 of its Playwright tests.)

The existing tests don't cover everything. **I checked two further behaviors, and the prototype got both wrong** (gaps 1 and 2). So I wouldn't convert yet.

Nothing in the repo was changed except this file. I defined the element with `defineWithFeatures`; I did not test the `be-hive` / `imp-h` / `precede` route.

### How it maps

| Today in `chip-away-element.js` | In JSON |
|---|---|
| `hydrate()` and its compacts | A chain of merges: `splitFor` → `idRefs.searchFor`; `selects` = `idRefs.elements`; `selects` / `join` / `readonly` / `maxJoin` → tree |
| The chip→option and button→select `WeakMap`s | Not needed. A tree event's host **is** the item, so ✕ is `'?.selected': false` and "clear all" is `'?.selectedIndex': -1` |
| Skipping options with an empty value | `of: '?.querySelectorAll?.option:checked:not([value=""])'` |
| Dropping the fieldset when nothing is selected | A switch on `'!!?.querySelector?.option:checked:not([value=""])'` |
| `join`, `readonly` | Switches on `'!!$root?.join'`, `'!!$root?.readonly'` |
| `maxJoin` | ` ?=` with `>` (but see gap 4) |
| Removing all chips and rebuilding | Updated in place, keyed by option |
| Cleanup on disconnect | None in the prototype: chips and listeners stay (see gap 2) |

The heart of it (abridged):

```JS
merges: [
  { ifKeyIn: ['splitFor'], assign: {
      '?.idRefs?.searchFor': '?.splitFor',
      '?. +=': { on: 'id-referencer:resolved', get: { key: 'r' }, '?.rev +=': 1 } } },
  { ifKeyIn: ['splitFor', 'rev'], assign: { selects: '?.idRefs?.elements' } },
  { ifKeyIn: ['selects'], assign: {
      '?.selects?.@each +=': { on: 'change', get: { key: 'chip-away' }, '?.rev +=': 1 } } },
  { ifAllOf: ['selects'], ifKeyIn: ['selects', 'join', 'readonly', 'maxJoin'], assign: {
      '?. =>': { do: 'builtIns.tree', map: {
          selects: ['div', { 'style :=': 'display:contents' }, {
              key: '?.id',
              each: { switch: '!!?.querySelector?.option:checked:not([value=""])', cases: {
                  true: ['fieldset', {}, [ /* legend, then a switch on $root.join */ ]] } } }] } } } },
]
```

Each option's ✕:

```JS
['button', { 'type :=': 'button', ' +=': {
    on: 'click', get: { stopPropagation: true },
    '?.selected': false,                              // the host is the <option>
    dispatch: { type: 'change', bubbles: true } } }]  // but see gap 1
```

The prototype also listens for that `change` on the host itself, to bump `rev`.

### Gaps

#### Must close: correctness

1. **`dispatch` can only fire from the element with the listener.** So the button's `change` never reaches the `<select>`. **Measured:** after clicking a chip's ✕, a `change` listener on the select fired **0** times. Today it fires, and other code on the page may depend on it.
   *Proposal:* `dispatch: { type: 'change', to: '?.closest?.select' }`, resolved against the host when the event fires. For "clear all", `to: '?.'`. The default stays the listening element.

2. **`get.key` is global per element, not per host.** **Measured:** with two `chip-away`s on one select, selecting a second option updated only the newer one; the other stayed at 1 chip. Both used the key `chip-away` on the same select, so the second aborted the first's listener (`keyMap` in `handlers/addEventListener.js` is element → key → controller).
   *Proposal:* an opt-in that scopes the key by host too, e.g. `get: { key, keyScope: 'host' }`. It should be opt-in because Tree's generated keys rely on a new host replacing the old listener.
   *Related:* nothing removes these listeners on disconnect, or when a select drops out of `for`. `get.abortController` would help, but I found no JSON way to create a controller per connection. That part may belong in roundabout.

#### Must close: to be JSON only

3. **Reading one property from each item.** `join` needs `"Option 1, Option 2"` from a list of options. No data pipe or sync op does that: `use: 'join'` leaves a `NodeList` as it is.
   *Proposal:* a data pipe `{ pluck: '?.textContent' }` that takes any iterable and returns an array, chained to `{ use: 'join', args: [', '] }`.

4. **A ` ?=` result can't be computed text.** The label is either the joined texts or `n Selected`. ` ?=` does the comparison, but its results are paths and literals, so `n + ' Selected'` can't be built there.
   *Proposal (either):*
   - let a switch compare, as ` ?=` does: `switch: ['?.length', '>', '$root?.maxJoin']`. This is the more general one;
   - or a text data pipe: `{ template: ['?.', ' Selected'] }`.

5. **The legend text.** Today it's the label's text with the select's own text removed, which no path can say. `'?.closest?.label?.querySelector?.:scope > :not(select)?.textContent'` covers `<label><span>…</span><select>` (all our examples). It doesn't cover `<label>Text <select>`, `<label for>`, or the fallback to `id`.
   *Proposal:* a ` ?=` `'??'` chain of that path, `'?.labels?.0?.textContent'` (for `<label for>`) and `'?.id'` should cover all but the bare-text form, though I haven't tried it, and it needs care: with a wrapping bare-text label, the second path would include the options' text. Otherwise, a pipe.

6. **Data pipes inside merges.** Merges call the sync `assignFrom`, which throws on a descriptor pipe unless `pipes/dataPipes.js` is already loaded. (From reading the code; I didn't run it.)
   *Proposal:* roundabout imports it when `assignOptions.pipes` holds a descriptor. A roundabout change rather than assign-gingerly.

#### Nice to have

7. **A repeat can't stand at the top level of a map, or next to static children.** It always owns its parent, so I added `display:contents` wrapper divs. `default.css` is unaffected, but a consumer's `chip-away > fieldset` or `fieldset > .chip` selector would break.
   *Proposal:* allow a repeat as a map value and among static children, with its own markers.

### What we'd give up

- **Subclassing.** The README's "Extending with Custom Markup" section documents overriding the render methods. Replacing the tree config is the natural alternative, but this is a breaking change for anyone who subclasses.
- **Some readability.** The config is shorter than the class, but denser. `` tree`…` `` in the `.mjs` would help, with JSON still emitted.
- **An HTML file to speak of.** There's little static HTML here, so `root.html` would be nearly empty. This would be "JSON only" more than "HTML first".

### What I'd do

1. Fix 1 and 2 in assign-gingerly. Both are useful well beyond chip-away.
2. Add 3 and 4 there too, and 6 in roundabout.
3. Decide whether losing the subclass hooks is acceptable.
4. Convert, adding tests for page-level `change` listeners and for two chip-aways on one select. Neither is tested today.

**A middle path, if you want it sooner:** keep the class, but have it render with the tree. That removes most of the DOM code, and the class can keep its own event handling, so it doesn't wait on any gap. It isn't HTML first, though. I haven't prototyped it.

### Questions for Bruce

1. Does anyone rely on the subclass hooks?
2. Is partial legend support (gap 5) enough, or should every label shape keep working?
3. For gap 4, would you prefer the comparing switch or the template pipe?

## Bruce's Response I

Let's go in baby steps.

Can you please provide a detailed proposal 

1. **`dispatch` 

in [assign-gingerly chats](../../../beGingerly/assign-gingerly/docs/Chats/)?


## Claude's Response II

The proposal is in [DispatchTo.md](../../../beGingerly/assign-gingerly/docs/Chats/Commands/+=/TODO/DispatchTo.md), beside the earlier DispatchSupport chat. In short: an optional `to` path on `dispatch`, resolved against the host when the event fires. With a patched copy of the handler, the prototype's chip ✕ now fires `change` on the select (gap 1). Nothing in assign-gingerly was changed apart from adding that file.

## Bruce's Response II

Can we do the sme now for:

>  2. **`get.key` 

Please provide a full example and context.  I actually don't remember what get.key is.


## Claude's Response III

The proposal is in [KeyScope.md](../../../beGingerly/assign-gingerly/docs/Chats/Commands/+=/TODO/KeyScope.md). It starts with what `get.key` is, then works through the two-chip-aways example.

In short: `get.key` stops a repeated `assignFrom` call from stacking listeners. It doesn't consider the host, so two chip-aways on one select cancel each other. I propose an opt-in, `get: { key: 'chip-away', keyScope: 'host' }`. With it, both stay up to date in the prototype.

On 0.0.110 with `dispatch.at`, gap 1 is closed in the prototype. While testing I also found two bugs in how keyed listeners attach and abort; they're in the proposal.

## Bruce's Response III

Let's now do the same for:

3. **Reading one property from each item.**

Please add ample examples so I can confirm if it makes sense to add.

## Claude's Response IV

The proposal, with a dozen examples, is in [PluckPipe.md](../../../beGingerly/assign-gingerly/docs/Chats/AssignFrom/TODO/PluckPipe.md).

In short: a data pipe, `{ pluck: '?.textContent' }`, that reads one property from each item of any list and returns an array, ready for `join` or `ListFormat`. To weigh against it: chip-away is the only concrete use I found in this repo's neighbors.

Where the prototype stands, on 0.0.111: gaps 1 and 2 are closed. With `pluck`, two function pipes are left (gaps 4 and 5). Gap 6 is now confirmed by running it.

## Bruce's Response IV

Let's move on now to:

> 4. **A ` ?=` result can't be computed text.**

Again, more context and examples would be helpful.

## Claude's Response V

The proposal, with eleven examples, is in [JoinInTernaryResults.md](../../../beGingerly/assign-gingerly/docs/Chats/AssignFrom/Commands/TODO/JoinInTernaryResults.md).

In short: let a ` ?=` result be `{ join: ['?.n', ' items'] }`, which ` =&` and ` :=` already understand. I prefer this to the two options I listed under gap 4, after prototyping all three.

A correction to what I said there: this gap isn't strictly a blocker. There's a workaround with scratch properties that works today, but it's awkward.

Where the prototype stands, on 0.0.112: `pluck` works in it. With this change, one function pipe is left (gap 5), plus the manual `dataPipes.js` import (gap 6).

## Bruce's Response V

Let's now please do the same for:

> 5. **The legend text.** Today it's the label's text with the select's own text removed, which no path can say. `'?.closest?.label?.querySelector?.:scope > :not(select)?.textContent'` covers `<label><span>…</span><select>` (all our examples). It doesn't cover `<label>Text <select>`, `<label for>`, or the fallback to `id`.
   *Proposal:* a ` ?=` `'??'` chain of that path, `'?.labels?.0?.textContent'` (for `<label for>`) and `'?.id'` should cover all but the bare-text form, though I haven't tried it, and it needs care: with a wrapping bare-text label, the second path would include the options' text. Otherwise, a pipe.

I would definitely benefit from at least one good example to make sure it is the optimal solution.



## Claude's Response VI

The proposal, with an example, is in [LegendTextInJSON.md](./LegendTextInJSON.md). It's here rather than in assign-gingerly, because it needs no assign-gingerly change.

In short: a ` ?=` `||` chain of five paths, one per way of writing a label. I measured it against the class on 13 label shapes: it matches on 11 (and trims where the class doesn't), and differs only where a label mixes text and elements.

With it, the prototype's config is JSON only (its remaining pipes are all data pipes). The one thing left is gap 6: importing `dataPipes.js` by hand.

## Bruce's Response VI

Please create the chat proposal for gap 6 in [roundabout chats](../../../roundabout/Chats/).


## Claude's Response VII

The proposal is in [LoadDataPipes.md](../../../roundabout/Chats/Config/TODO/LoadDataPipes.md), in roundabout's `Chats/Config/TODO`.

In short: roundabout already pre-imports what a config needs before anything runs. It would also import `assign-gingerly/pipes/dataPipes.js` when `assignOptions.pipes` holds a descriptor. That's in `makeRoundaboutReady` (el-maker's path) and in `roundabout()`.

With that patched in, the prototype is JSON only, all in one config, and all its checks pass. That closes the last gap, apart from the "nice to have" wrapper divs (gap 7).

## Bruce's Response VII

I've updated the dependencies so I think we are ready to try out all these enhancements, to see if it is a good fit.

You raised the excellent question of whether switching to an HTML first, really JSON first approach would be more maintainable.  I would definitely want to use DX.tree to make the HTML more readable.  Perhaps we can explore ways of making JSON based configuration easier to "subclass".

Would it be possible to implement the HTML/JSON approach without doing anything to the JS solution, so we could compare side by side, and even support both approaches (for a while)? 

Let me know your thoughts below.

## Claude's Response VIII

### Short answer

**Yes.** The two can live side by side without touching any of the class's files, and the existing tests can check both without being copied.

Before answering, I ran the JSON version against your updated `node_modules` (assign-gingerly 0.0.113, roundabout-lib 0.0.39, el-maker 0.0.29), with **no patches and no function pipes**, and with its tree written in `` tree`…` ``:

| Check | Result |
|---|---|
| Example1–10 | All pass |
| Legends (Example5) | `Select 1:`, `Select 2:` |
| Remove and re-add the element | Picks up a selection made while detached |
| A chip's ✕ | The select gets one `change` (a plain `Event`) |
| Two chip-aways on one select | Both update |

All of this ran in a scratch folder. Nothing in the repo was changed except this document.

### The tree in `` tree`…` ``

This is the whole tree, as it would read in an `el-maker.mjs`. It produces the same JSON as the hand-written prototype.

```JS
const selected = '?.querySelectorAll?.option:checked:not([value=""])';
const removable = (button) => choose('!!$root?.readonly', { false: button });

const removeOption = removable(tree`
    <button type=button part=chip-remove-option-trigger aria-label=Remove
        @click=${{ get: { stopPropagation: true }, '?.selected': false,
                   dispatch: { type: 'change', eventCtr: 'Event', at: '?.closest?.select' } }}></button>`);

const clearAll = (attrs) => removable(tree`
    <button type=button ${attrs}
        @click=${{ get: { stopPropagation: true }, '?.selectedIndex': -1,
                   dispatch: { type: 'change', eventCtr: 'Event', at: '?.' } }}></button>`);

const map = {
    selects: tree`
        <div style="display:contents" ${each('?.', { key: '?.id' })}>
            ${choose('!!?.querySelector?.option:checked:not([value=""])', { true: tree`
                <fieldset>
                    <legend>
                        <span ${{ 'textContent ?=': legendText }}></span>
                        ${clearAll({ 'class :=': 'clear-all-trigger', 'aria-label :=': 'Clear all' })}
                    </legend>
                    ${choose('!!$root?.join', {
                        true: tree`
                            <div style="display:contents">
                                <div class=chip part=chip-remove-option-container>
                                    <span ${{ 'textContent ?=': joinedLabel }}></span>
                                    ${clearAll({ 'part :=': 'chip-remove-option-trigger', 'aria-label :=': 'Remove all' })}
                                </div>
                            </div>`,
                        false: tree`
                            <div style="display:contents" ${each(selected, { key: '?.' })}>
                                <div class=chip part=chip-remove-option-container>
                                    <span>${'?.textContent'}</span>
                                    ${removeOption}
                                </div>
                            </div>`,
                    })}
                </fieldset>` })}
        </div>`,
};
```

`legendText` and `joinedLabel` are the ` ?=` arrays from [LegendTextInJSON.md](./LegendTextInJSON.md) and gap 4. Beside the tree there are four merges, three data pipes and the attribute config, about 25 lines.

| | Size |
|---|---|
| `chip-away-element.js` (with comments) | 13.7 KB |
| `el-maker.mjs` source (tree + merges) | about 4 KB |
| Generated `el-maker.json` (pretty-printed) | 13 KB |

### A layout for side by side

Nothing existing changes, apart from `package.json`, the README, and an optional Playwright project:

| File | Purpose |
|---|---|
| `el-maker.mjs` (new) | Source, with `` tree`…` `` and `paths()` for type checking. `npm run build-el-maker` |
| `el-maker.json` (new, generated) | What the browser loads |
| `json.js` (new) | A small JSON-only entry: `defineWithFeatures('chip-away', 'el-maker', config)`. For tests, and for pages without be-hive |
| `demo/json.html` (new) | The HTML-first way, with no script of chip-away's own: `<script type=cede data-extends=el-maker src="chip-away/el-maker.json">` inside the first `<chip-away>`, as scratch-box does |
| `playwright.config.ts` | A second project, `chromium-json`, that routes `/index.js` to `/json.js`. **All 11 tests run against both versions, unchanged** |

**One tag name, two definitions.** A page loads one or the other, never both. They'd conflict on `customElements.define`. I'd keep the name `chip-away` for both, so consumers switch by changing one import, and say so in the README.

**Dependencies.** `demo/json.html` needs `be-hive` and `mount-observer` for the `cede` script. I'd add them as dev dependencies only, so consumers of the JS version don't get them.

### Differences a side-by-side comparison would show

Things to fix, or to document as differences:

1. **The wrapper divs** (gap 7): `display:contents`, so they're invisible in layout, but they show in the DOM and break `fieldset > .chip` selectors.
2. **The legend** differs for labels that mix text and elements (see LegendTextInJSON.md).
3. **`composed`:** the class's re-fired `change` isn't composed; the JSON's is, by default. Adding `composed: false` to the two `dispatch` configs fixes it.
4. **Disconnecting:** the class removes its chips and listeners; the JSON version leaves both. Chips come back right on reconnect (tested), but the listeners on the selects keep the element alive while they exist. (This is "related item 3" in KeyScope.md: there's no declarative way yet to stop listening on disconnect.)
5. **Subclassing,** below.

### Making the JSON easier to "subclass"

Today's README offers eight overridable methods. Here's how each could map, from simplest to most ambitious.

**1. Build-time composition (works today).** `el-maker.mjs` exports its pieces, and a "subclass" is another `.mjs` that imports them, replaces some, and writes its own JSON:

```JS
// my-chips.mjs
import { parts, build } from 'chip-away/el-maker.mjs';

export default build({
    ...parts,
    legendText: ['?.dataset?.legend', '||', ...parts.legendText],      // like overriding getLegendText
    chip: (label, button) => tree`<span class=tag>${label}${button}</span>`,  // like overriding createChip
});
```

The README's methods map almost one to one onto such parts: `getLegendText` → `legendText`, `joinLabel` → `joinedLabel`, `createChip` → `chip(label, button)`, `createChipsContainer` → `fieldset(legend, chips)`, and so on. This costs nothing at runtime, and the DX gives type checking. **I'd start here.** The catch: customizing needs a build step.

**2. Runtime: a partial config that extends a defined element.** For example `<script type=cede data-extends=chip-away src=my-overrides.json>`, where only the changed parts are given and merged over chip-away's. That's what makes it "subclassing" without a build. I haven't checked whether `defineWithFeatures` / `assignFeatures` merge a subclass's config with the base's today; that would be the first thing to find out. Merging trees is the hard part: specs are arrays, so overriding "the chip" needs a name to address it by.

**3. Named parts in the tree.** For 2 to work, the tree needs names: for example, map keys or snippets for `chip`, `legend` and `removeButton`, which an extension replaces by name. Tree already has named snippets, but they come from JavaScript options by design, so this would need a decision in assign-gingerly.

**And styling needs none of this:** `::part()` and classes already cover most customization, in both versions.

### What I'd do

1. Add the side-by-side files above, with the Playwright project, so both versions run the same 11 tests.
2. Fix differences 3 (one line) and document 1, 2 and 4.
3. Structure `el-maker.mjs` as exported parts plus a `build()` (subclassing approach 1).
4. Use both for a while. Then decide on runtime subclassing (2 and 3), and on whether to retire the class.

### Questions

1. Shall I go ahead with steps 1–3?
2. One tag name for both (as proposed), or a different name for the JSON version during the trial (e.g. `chip-away-json`)? A different name lets both appear on one page, at the cost of a second name to retire later.
3. The legend questions in LegendTextInJSON.md are still open. I'd use the chain with the `aria-label` rung unless you say otherwise.

## Bruce's Response VIII

> 1. Shall I go ahead with steps 1–3?

Yes, please.

> 2. One tag name for both (as proposed)

Yes, please.

>  3. The legend questions in LegendTextInJSON.md are still open. I'd use the chain with the `aria-label` rung unless you say otherwise.

Please go with what you recommend.
## Claude's Implementation Notes VIII

Steps 1–3 are done. **Nothing in the class version changed:** `chip-away-element.js`, `def.js`, `index.js`, `wireFeatures.js`, `defRef.*` are as they were. Nothing is committed.

### New files

| File | What |
|---|---|
| [el-maker.mjs](../el-maker.mjs) | The source, written with `` tree`…` ``. Exports `parts` (one per overridable method of the class), `build(parts)` and `render()`. It writes `el-maker.json` only when run, not when imported |
| [el-maker.json](../el-maker.json) | Generated: `npm run build-el-maker` (watches), or `node el-maker.mjs` |
| [json.js](../json.js) | `import 'chip-away/json.js'`: defines `<chip-away>` from `el-maker.json`. It only loads and defines; there's no chip-away logic in it |
| [demo/json.html](../demo/json.html) | The HTML-first way: a `cede` script in the first `<chip-away>`, and no script of chip-away's own. It also has a second `<chip-away join>` on the same select |
| [tests/fixtures.mjs](../tests/fixtures.mjs) | In projects whose name ends in `-json`, redirects `/index.js` to `/json.js` |
| `tests/shared-select.spec.mjs` | The two behaviors the old tests didn't cover: a chip's ✕ fires one `change` (an `Event`) on its select; two chip-aways on one select both update |
| `tests/json-demo.spec.mjs` | The `cede` demo: legends (span and bare-text labels), `join`, no page errors. Runs in the `-json` project only |

### Changed files

- **`playwright.config.ts`:** a second project, `chromium-json`.
- **`tests/*.spec.mjs`:** each imports `test` from `./fixtures.mjs` rather than `@playwright/test`. Nothing else changed in them.
- **`package.json`:** `be-hive` 0.1.18 and `mount-observer` 0.1.53 as **dev** dependencies (for the `cede` demo; the latest versions, and what the sibling packages use), and the scripts `build-el-maker` and `test-json`.
- **`imports.html`:** `be-hive/`, `mount-observer/`, `nested-regex-groups/`.
- **`README.md`:** an "HTML/JSON-first version (trial)" section: how to use it, the differences from the class, extending it, and the tests.

### Against the plan

- **`composed: false`** is in both `dispatch` configs, so the re-fired `change` matches the class's.
- **The legend** uses the chain with the `aria-label` rung (see [LegendTextInJSON.md](./LegendTextInJSON.md)).
- **"Subclassing"** is build-time, through `parts` and `build()`, with an example in the README. I checked in Node that replacing `legendText` and `chip` changes the output everywhere they're used, that the base is unaffected, and that `render()` with no changes gives exactly `el-maker.json`. The parts that are functions call each other through `parts`, so `build()` swaps the replacements in while it runs, and restores the originals afterwards.

### Test results

`npm test`: **27 passed, 1 skipped** (the `cede` demo test, in the class project), Chromium:

- The 11 existing tests, and the 2 new shared-select tests, pass for **both** versions.
- To make sure the `-json` project really runs the JSON version, I hid `json.js` for a moment: its test1 then failed, and the class's still passed.

### Still open

- **Gap 7** (the wrapper divs) and **cleanup on disconnect** are documented as differences, not fixed.
- **Runtime "subclassing"** (a partial JSON extending `<chip-away>`) isn't explored yet, nor whether `defineWithFeatures` could merge configs.
- **Only Chromium:** the Playwright config has Firefox and WebKit commented out ("requires css modules"), and I left it that way.
- **`el-maker.json` is 23 KB** pretty-printed (4 spaces, as the sibling packages do), about 9 KB without whitespace. The class is 13.7 KB with comments.

## Bruce's Response IX

This chat file s getting quite long.  I will raise separate chats for issues I'm seeing, and possibly for the still open items.

The way you organized el-maker.mjs looks good to me.  In your most unbiased opinion, which seems better?  Or is it a matter of pro's and con's?
## Claude's Response IX

### My opinion

**It's a matter of pros and cons, but I'd lean one way for now: keep the class as the default, and keep the JSON version as the direction.** The JSON version works and is pleasant to read. But for chip-away specifically, consumers would get more cost and more surprises from it today than from the class.

**Why chip-away is a harder case than the siblings.** scratch-box and plus-minus are mostly markup with a little behavior. chip-away is the reverse: little markup, and most of its job is reading *other* elements (selects, options, labels) and reacting to them. That's where JSON is weakest: it works by stringing paths together, where JavaScript can just do it. The legend is the clearest case. Five chained paths approximate what one line of JavaScript does exactly.

### Measured: what a page downloads

Example7 (`join`), unbundled and unminified, as served locally (Chromium):

| | JS + JSON files | Raw | Gzipped (per file) | First chip after |
|---|---|---|---|---|
| Class (`index.js`) | 29 | 261 KB | 64 KB | ~120 ms |
| JSON (`json.js`) | 47 | 466 KB | 122 KB | ~310 ms |
| JSON (`cede` demo, with be-hive) | 67 | 617 KB | 160 KB | ~160 ms |

So the JSON version **roughly doubles what the page loads** for chip-away alone. Most of it is shared library code: Tree, merges, event binding, data pipes, ternaries. A page that already uses those for other components pays much less extra. Timings on localhost are rough, and minifying and bundling would shrink both columns. These are three runs each, not a benchmark.

### Pros and cons

| | Class | JSON |
|---|---|---|
| **Who can maintain it** | Anyone who knows the DOM | Someone fluent in assign-gingerly's operators (` ?=`, ` =&`, ` +=`, `@each`, `keyScope`, pipes) |
| **When something's wrong** | A stack trace into chip-away's code; breakpoints | Usually a silent wrong value, or a console warning from inside a library. Paths are strings, so typos aren't caught (the same-named-pipe and `??`-after-`join` traps we found are examples) |
| **Exactness** | Exact (the legend, for instance) | Close: the legend differs for mixed-text labels |
| **Cleanup on disconnect** | Yes | Not yet |
| **DOM** | Just what's needed | Wrapper divs (`display:contents`) |
| **Updates** | Rebuilds every fieldset on any change | Updates in place, keyed by option. Better in principle (fewer DOM changes, a stable DOM for styling and tests), though I haven't seen it matter here |
| **Extending** | Subclass at runtime, documented | Replace parts at build time; no runtime extension yet |
| **Code to read** | 13.7 KB of JavaScript (with comments) | About 4 KB of `el-maker.mjs` |
| **Download** | Smaller (above) | Larger, unless the libraries are shared with other components |
| **Consistency with siblings** | The exception | Matches the HTML-first family |
| **Maturity of what it depends on** | Plain DOM | Five features added in the last few days (`at`, `keyScope`, `pluck`, `{ join }` results, roundabout's pipe loading) |

**What the exercise gained regardless.** The JSON effort found and fixed real bugs that affect everyone: keyed listeners attaching out of order, `key` disabling `abortController`, self-named pipes, the ternary permission gap, and descriptors breaking roundabout merges. That's worth something whichever version stays.

### What would change my mind

The JSON version would be the better default for chip-away once:

1. it cleans up on disconnect;
2. the wrapper divs are gone (gap 7);
3. its cost is acceptable on the pages that matter. If chip-away mostly appears beside other HTML-first components, the libraries are already there, and the download difference mostly disappears;
4. a mistake in a path gets reported somewhere, for example by a development-mode check for paths that never resolve.

With those, it would be easier to maintain than the class, for people who know the toolkit.

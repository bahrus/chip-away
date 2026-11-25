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

# Find Referenced Elements

## Bruce's Ask

When chip-away-element.js was [implemented with the latest conversion](./Convert.md), almost the entire code was pushed into a feature called ChipAwayFeature.js that didn't seem like a reusable feature.

But what I think there might be some useful, reusable features.  Possible a really simple one, then may a more feature rich that extends the simple one.  

As it is, chip-away-element.js seems like a lot of spaghetti code.

The simple one might look like:

1.  A feature that:
    1.  Takes a list of id's to look for in the same rootNode as the host element. 
    2.  Takes a property name of the host element
    3.  Searches for them.
    4.  If not all found, adds a mutation observer to wait for the missing ones to appear.
    5.  As it finds them, passes them to the provided property name of the host element

Before implementing this, does it seem useful?  How would you modify the approach.  Please add your thoughts below.

## Claude's Thoughts

### Does it seem useful?

Yes — more than the `ChipAwayFeature` did. This is the "resolve an IDREF (or list of them) to live element(s)" pattern, and the platform itself implements it over and over:

- `label[for]` → `HTMLLabelElement.control`, and the reverse `element.labels` (a *live* list)
- `input[list]` → `HTMLInputElement.list`
- `button[popovertarget]` → `HTMLButtonElement.popoverTargetElement`
- `[commandfor]` → `HTMLButtonElement.commandForElement`
- ARIA element reflection now shipping in Chromium: `el.ariaControlsElements`, `el.ariaLabelledByElements`, etc.

Any custom element that points at other elements by id needs exactly this, and the resolution + "wait for it to show up" + "notice when it goes away" logic is fiddly enough that people get it wrong. It clears the reuse bar that [NewJSFirstCustomElement.md](../types/NewJSFirstCustomElement.md) Step 6 sets ("significant chance other custom element libraries would want to reuse it") in a way the chip-rendering logic never did. Good candidate to eventually promote into the `el-maker` catalog alongside `roundabout` / `face-up` / `truth-sourcer`.

### How I'd modify the approach

1. **Make the binding *live*, not "find once."** The spec above stops observing once all ids are found. chip-away actually needs more: if a referenced `<select>` is removed, replaced, or has its `id` reassigned, the element must re-render. So the reconciler should track three kinds of mutation, not one:
   - additions (the listed case),
   - removals of a currently-resolved element,
   - `id` attribute changes on elements entering/leaving the watched set (`attributes: true, attributeFilter: ['id']`).

2. **One feature with a `live` flag, not a simple/rich inheritance pair.** The "simple" version already has to run an observer and a reconciliation loop in order to "pass them as it finds them," so the extra code to also handle removals is small. A `live: false` mode that disconnects the observer after the first fully-resolved batch covers the lightweight case without a second class. An inheritance hierarchy here would be indirection for its own sake — the same mistake as `ChipAwayFeature`.

3. **Stable output shape.** Always write a `Map<string, Element>` (or an array parallel to the id list) to the target property, even when only one id is requested and even when partially resolved. Downstream `hydrate` code should never have to branch on "string vs array vs single element vs null." Offer a single-element convenience mode as an explicit option, not a type-dependent surprise.

4. **Batch, don't thrash.** A single DOM operation can produce many `MutationRecord`s. Coalesce reconciliation into a microtask (`queueMicrotask`) and assign the property once per settled batch, so roundabout's `when_..._changes_call_hydrate` fires once, not N times.

5. **Consume the already-parsed id list; produce a new prop.** Don't have the feature re-parse the `for` attribute — chip-away already turns `for` into `splitFor` via `truthSourcer` + the `splitter` parser. The feature should take `splitFor` (string[]) as input and emit e.g. `forElements` (Map). Then a roundabout compact `when_forElements_changes_call_hydrate` closes the loop. The feature becomes a pure producer feeding the existing reactive graph, and `chip-away-element.js`'s `hydrate` shrinks to "for each resolved select: wire `change`, render chips."

6. **Scope resolution to `getRootNode()`.** Default search root = `host.getRootNode()`, using `getElementById` (works on both `Document` and `ShadowRoot`, which the current code already relies on). Observe that root with `{ childList: true, subtree: true, attributes: true, attributeFilter: ['id'] }`. Allow an override for the unusual case of pointing outside the local root. Disconnect on `disconnectedCallback`, re-arm on reconnect, and guard double-connect with the `#hasDisconnected` pattern from [NewCustomElementFeature.md](../types/NewCustomElementFeature.md).

7. **Optional type guard / predicate.** Let the host say "only accept a match that is an `HTMLSelectElement`" (or an arbitrary predicate), so an unrelated element that happens to share an id is ignored rather than handed back and casted.

8. **Perf note for later, not v1.** With `live: true` and many host elements in one root, each feature instance running its own subtree observer adds up. A shared per-root observer via `WeakMap<Node, Registry>` would fix that, but it's premature until there's a measured problem.

9. **Edge cases to handle explicitly:**
   - empty / all-whitespace id list → clear the target prop (don't leave a stale Map),
   - duplicate ids in the list,
   - the input prop being set before the host is connected → defer resolution to `connectedCallback`,
   - the id list *changing* after an initial resolve → diff old vs new set, keep still-valid entries, don't tear down and rebuild.

### Scope check

Everything select-specific stays in `ChipAwayElement`: the `change` listeners, the fieldset/legend/clear-all rendering, the `chipToOption` / `clearButtonToSelectID` bookkeeping. The feature's entire job is `string[]` → live `Map<string, Element>`. That id→element resolution seam is the only genuinely reusable part, and keeping the feature that small is what makes it worth extracting.

### Suggested name

`find-referenced-elements` is clear. For the feature class something terser in the house style — `ElementRefs`, `RefCorral`, `IdRefs`. If you want `el.forElements` to read straight through to the feature, wire it with `installForwarding` + `static propLinks`.

##  Bruce's Response.

Please call it id-referencer.

I already defined a package with that name.

In fact, I already added some initial thoughts what it [would look like](https://github.com/bahrus/id-referencer).  Also, [a preliminary chat](https://github.com/bahrus/id-referencer/blob/baseline/Chats/TODO/CreateTheFeature.md).  I think IdRefs class name would be fine.  If all goes well, I will move the locally defined feature into that package should this prove out.

Please implement and integrate chip-away-element.js with it, and add your implementation notes below.  

## Implementation Notes (Claude)

### What was added

- **[IdRefs.js](../IdRefs.js)** — local implementation of the `id-referencer` feature (class `IdRefs`, per your preference). Kept in this repo, not the package, until it proves out.
- **[tests/Example6.html](../tests/Example6.html) / [tests/test6.spec.mjs](../tests/test6.spec.mjs)** — a new test for the capability the old code lacked: a `<select>` that is injected *after* `<chip-away>` has connected still gets chips, because `IdRefs` keeps a MutationObserver running until every id resolves.

### `IdRefs` behaviour

Config via `customData` (matches the package README's `searchFor`, plus one addition):

```js
customElements.assignFeatures(MyElement, {
    idRefs: { customData: { searchFor: ['for'], /* eventType?: 'id-referencer:resolved' */ } }
});
```

1. On connect, for each attribute in `searchFor`: reads the host attribute, splits on whitespace, resolves each id with `getElementById` against `host.getRootNode()` (Document or ShadowRoot).
2. A MutationObserver on the **host** (`attributeFilter: searchFor`) re-resolves an attribute when its value changes.
3. While any id is unresolved, a MutationObserver on the **root node** (`childList`/`subtree` + `attributeFilter: ['id']`) re-checks on every DOM change. It disconnects ("rests") once everything is resolved, exactly as the README specifies, and re-arms if the attribute later changes.
4. Read API:
   - `el.idRefs.get('for')` → `Element[]`, resolved and still-connected, in attribute order (what a consumer normally wants).
   - `el.idRefs.for` → `WeakRef<Element>[]` (raw, README parity; `aria-controls` would be exposed as `el.idRefs.ariaControls`).
   - `el.idRefs.complete` → boolean.
5. **Notification (my addition to the README's design):** whenever a resolved set changes, `IdRefs` dispatches `id-referencer:resolved` (`CustomEvent`, `detail: { attr, ids, elements }`) on the host. The README only describes *pull* access via `idReferencer.<attr>`; a host that needs to *react* to a late-arriving element needs a push signal, and an event is the least-coupled option. I'd propose adopting it (name/`eventType` configurable) in the package.

### How `chip-away-element.js` changed

- Declares an `idRefs` feature slot (lazy `fallbackSpawn: () => import('./IdRefs.js')`), forwarding `connectedCallback` / `disconnectedCallback`.
- Deleted `#getRoot()` and `#findElement()` — id → element resolution now belongs entirely to `IdRefs`.
- `#connect()` adds an `id-referencer:resolved` listener (via the existing `AbortController` signal). `handleEvent` routes that event to `hydrate()`.
- `hydrate()` no longer parses `for` / walks ids. It reads `this.idRefs.get('for')`, filters to `HTMLSelectElement`, and renders. It runs on every resolution change, so a `<select>` appearing later triggers a re-render for free.
- `#clearButtonToSelectIDMap` (button → id string) became `#clearButtonToSelectMap` (button → the `HTMLSelectElement`), removing the last id lookup from the element. The clear-all handler no longer re-queries the DOM.
- `#getLegendText()` uses `select.getRootNode()` instead of the deleted `#getRoot()`.

### Roundabout / wiring

- `defRef.mjs`: removed the `when_splitFor_changes_call_hydrate` compact and the `for → splitFor` `withAttrs` splitter. `raConfig` is now empty — roundabout no longer drives chip rendering. (`props` still lists `splitFor` only because the shared `AP` type in the `types` submodule was left untouched; the key is unused.)
- `wireFeatures.js`: added the `idRefs` injection. `truthSourcer` is still wired with `observedAttributes: ['for']` so the `for` *property* stays reflected to the attribute (which `IdRefs` then observes); `IdRefs` itself only needs the attribute.
- Regenerated `defRef.json` via `npm run build`.

### Timing detail worth keeping in mind for the package

`IdRefs` does its first resolution + event dispatch in the forwarded `connectedCallback`, **not** in the constructor. The constructor runs *inside* the host's `idRefs` lazy getter, before the spawned instance is cached; dispatching there would let an event handler that reads `host.idRefs` re-enter the getter and double-spawn. Doing it one step later (in `connectedCallback`) avoids that. The element's own `connectedCallback` runs before feature forwarding, so its listener is already attached when the first event fires.

### Verification

All tests pass, including the new `test6` (deferred `<select>`), which the previous single-shot `hydrate()` implementation would have failed.

### Not done / possible follow-ups

- `IdRefs` rests once all ids are found, so chip-away does **not** currently re-render when a referenced `<select>` is *removed* from the DOM (stale chips remain). Matches the README; a `live: true` option (keep observing, track removals + `id` changes) would close it — see my thoughts above.
- No shared per-root observer yet (one observer per host); fine until measured otherwise.
- `README.md` still has pre-conversion content (`trans-render/froop`, `ChipAway.bootUp()`, `#getLegendText(self, select)` signatures). Out of scope here but worth a pass.
- Feature types are inline `@typedef` in `IdRefs.js` rather than a `types/id-referencer/types.d.ts`, to avoid writing into the `types` submodule for something still local.

## Bruce's Response II

Can you add guidance in [new feature guide](../types/NewCustomElementFeature.md) to define all types in the types directory?

Can you create a folder id-referencer in the types folder and move:


```JS
/**
 * @typedef {Object} IdRefsCustomData
 * @property {string[]} [searchFor]
 *   Attribute names on the host to monitor and resolve as space-delimited id
 *   references. Defaults to `['for']`.
 * @property {string} [eventType]
 *   Event dispatched on the host whenever the resolved set for any monitored
 *   attribute changes. Defaults to `'id-referencer:resolved'`.
 */
```

there?

## Implementation Notes II (Claude)

### Guidance added to `NewCustomElementFeature.md`

- **Step 3 ("Create Type Definitions")** now opens with an explicit rule: *all* feature types live in `types/[project-name]/types.d.ts` and nothing else — no `@typedef {Object} ...` blocks in the `.js`. Called out specifically: the `customData` / injection-config shape, event `detail` payloads, and internal helper types. The `.js` only `@import`s.
- The Step 3 example gained a `CustomData` interface and an event-`detail` interface, plus a `FeatureSpawnContext` re-export (with a fallback showing the local-definition form that `truth-sourcer` / `face-up` use).
- Step 4 "Key patterns" and the closing "Tips" list each got a one-line reinforcement of the same rule.

### `types/id-referencer/types.d.ts` created

- New folder `types/id-referencer/` with `types.d.ts`. The `IdRefsCustomData` typedef moved there verbatim (as an exported interface), joined by `IdRefsResolvedDetail` (the `id-referencer:resolved` event payload) and a `FeatureSpawnContext` re-export from `../assign-gingerly/types`.
- `IdRefs.js`: deleted the inline `@typedef IdRefsCustomData` block; the `@import` now pulls `FeatureSpawnContext` **and** `IdRefsCustomData` from `./types/id-referencer/types`. No runtime change — comments only.
- This writes into the `types` submodule (previously avoided per Implementation Notes follow-up #4); doing so is now the documented expectation.

### Verification

`IdRefs.js` runtime is byte-for-byte equivalent (only JSDoc comments changed), so the existing Playwright suite — including `test6` — is unaffected. Type resolution: `IdRefs.js` → `./types/id-referencer/types` → `../assign-gingerly/types`, both present.

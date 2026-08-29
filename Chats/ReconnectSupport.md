# Reconnect Support

## Bruce's Ask

I added two buttons to @demo/dev.html .  One that removes ("disconnects") the chip-away instance.  The other puts it back.  But after I put it back, it doesn't remember chips anymore.  Can this be fixed? 

Feel free to add console.logs where needed.  I can refresh the page and report what I see.

## Claude's Diagnosis

Reproduced with a Playwright test ([tests/reconnect.spec.mjs](../tests/reconnect.spec.mjs)) driving the
two buttons in [demo/dev.html](../demo/dev.html): 1 chip before **remove**, 0 chips after **add**.

### Why the chips don't come back

`hydrate()` is the only thing that builds chips, and on a reconnect nothing calls it:

1. **`disconnectedCallback` → `#cleanup()`** aborts the `AbortController` (drops the `click` /
   `id-referencer:resolved` listeners) **and removes every `<fieldset>` and clears
   `#selectIDToChipsContainerMap`**. So the chips are genuinely gone, not just detached.
2. **roundabout's `when_splitFor_changes_call_hydrate` compact** fires on a *change* to
   `splitFor`. A disconnect/reconnect leaves the `for` attribute — and therefore `splitFor` —
   untouched, so the compact never re-runs `hydrate` on the way back in.
3. **`IdRefs.connectedCallback()`** does re-resolve (`#resolve(false)`), but:
   - it passes `dispatch = false`, so no `id-referencer:resolved` event, and
   - the referenced `<select>`s never left the DOM, so the resolved set is unchanged — even a
     dispatching pass (`#resolve(true)`) would see `sameElements` and stay silent.

   So `IdRefs` is fine internally, but it has no reason to notify the host, and the host isn't
   asking. `hydrate` never runs → chips stay gone.

### Fix

Rebuild from current truth on every (re)connect, in `#connect()`:

```js
const self = /** @type {AP} */ (/** @type {unknown} */ (this));
if (self.splitFor?.length) this.hydrate(self);
```

The `splitFor?.length` guard means the **first** connect — which may reach `#connect()` before
roundabout has parsed `for` — is still left to the compact (no double render); every later
reconnect, where `splitFor` is already populated, rebuilds immediately. `IdRefs` still holds its
`#ids`/`#refs`, so `idRefs.get()` returns the live `<select>`s and `hydrate` re-renders and
re-wires the `change` listeners.

Console logs added at `connectedCallback` / `disconnectedCallback` / `#connect` / `hydrate` so the
flow is visible on refresh — the reconnect path now logs:

```
[chip-away] connectedCallback
[chip-away] #connect, splitFor = [select1, select2]
[chip-away] hydrate, splitFor = [select1, select2] resolved = [select1, select2]
```

All 7 Playwright tests pass (6 existing + the new reconnect regression test). Say the word and I'll
strip the console logs.

## Bruce's Response I

I've confirmed the fix.  Please remove the logs.

## Claude's Response II

Logs removed from `connectedCallback` / `disconnectedCallback` / `#connect` / `hydrate`. The
reconnect fix and [tests/reconnect.spec.mjs](../tests/reconnect.spec.mjs) stay. All 7 Playwright
tests pass.


// @ts-check
/** @import {FeatureSpawnContext, IdRefsCustomData} from './types/id-referencer/types' */

const DEFAULT_EVENT_TYPE = 'id-referencer:resolved';

/**
 * `IdRefs` — a custom element feature that resolves the id references named in
 * one or more host attributes to live elements, and keeps watching the DOM
 * until every referenced id has been found.
 *
 * Local implementation of https://github.com/bahrus/id-referencer (kept here
 * until it proves out; the class name `IdRefs` matches the intended package
 * export). The feature is deliberately ignorant of what the host does with the
 * elements — its only job is `attribute value` → live `Element[]`.
 *
 * Wiring:
 * ```js
 * customElements.assignFeatures(MyElement, {
 *     idRefs: { spawn: IdRefs, customData: { searchFor: ['for'] } }
 * });
 * ```
 *
 * Consumption:
 * ```js
 * el.idRefs.get('for');   // HTMLElement[] — resolved, still-connected
 * el.idRefs.for;          // WeakRef<Element>[] — raw refs (README parity)
 * el.addEventListener('id-referencer:resolved', e => { ... });
 * ```
 */
export class IdRefs {
    /** @type {WeakRef<HTMLElement>} */
    #hostRef;

    /** @type {string[]} */
    #searchFor;

    /** @type {string} */
    #eventType;

    /** attr name -> current ordered id list @type {Map<string, string[]>} */
    #ids = new Map();

    /** attr name -> resolved refs, index-aligned with the id list @type {Map<string, WeakRef<Element>[]>} */
    #refs = new Map();

    /** @type {MutationObserver | undefined} */
    #hostObserver;

    /** @type {MutationObserver | undefined} */
    #rootObserver;

    /** @type {boolean} */
    #started = false;

    /**
     * @param {HTMLElement} hostElement
     * @param {FeatureSpawnContext} ctx
     * @param {Partial<IdRefsCustomData>} [initVals]
     */
    constructor(hostElement, ctx, initVals) {
        this.#hostRef = new WeakRef(hostElement);
        /** @type {IdRefsCustomData} */
        const customData = ctx?.injection?.customData ?? {};
        this.#searchFor = customData.searchFor ?? ['for'];
        this.#eventType = customData.eventType ?? DEFAULT_EVENT_TYPE;

        // Expose one `WeakRef<Element>[]` getter per monitored attribute, keyed
        // by the camelCased attribute name (`aria-controls` -> `ariaControls`).
        for (const attr of this.#searchFor) {
            const key = attrToProp(attr);
            if (key in this) continue;
            Object.defineProperty(this, key, {
                get: () => this.#refs.get(attr)?.filter(Boolean) ?? [],
                enumerable: true,
            });
        }

        if (initVals) Object.assign(this, initVals);
    }

    // ─── lifecycle (forwarded from the host) ──────────────────────────────────

    connectedCallback() {
        // Done here rather than in the constructor: by now the host's feature
        // getter has cached this instance, so a handler reacting to our event
        // can safely read `host.idRefs` without re-triggering the spawn.
        if (this.#started) return;
        this.#started = true;
        this.#connect();
    }

    disconnectedCallback() {
        this.#started = false;
        this.#disconnect();
    }

    // ─── public read API ─────────────────────────────────────────────────────

    /**
     * The resolved, still-connected elements for a monitored attribute, in the
     * order their ids appear in the attribute value.
     * @param {string} attr
     * @returns {Element[]}
     */
    get(attr) {
        const refs = this.#refs.get(attr);
        if (!refs) return [];
        /** @type {Element[]} */
        const out = [];
        for (const ref of refs) {
            const el = ref?.deref();
            if (el && el.isConnected) out.push(el);
        }
        return out;
    }

    /** True once every id in every monitored attribute has been resolved. */
    get complete() {
        for (const [attr, ids] of this.#ids) {
            if (this.get(attr).length < ids.length) return false;
        }
        return true;
    }

    // ─── internals ───────────────────────────────────────────────────────────

    #connect() {
        const host = this.#hostRef.deref();
        if (!host || this.#searchFor.length === 0) return;

        this.#hostObserver = new MutationObserver(records => {
            const changed = new Set();
            for (const r of records) {
                if (r.attributeName) changed.add(r.attributeName);
            }
            let missing = false;
            for (const attr of changed) {
                if (this.#resolveAttr(attr)) missing = true;
            }
            if (missing) this.#armRootObserver();
            else this.#maybeRest();
        });
        this.#hostObserver.observe(host, {
            attributes: true,
            attributeFilter: this.#searchFor,
        });

        let missing = false;
        for (const attr of this.#searchFor) {
            if (this.#resolveAttr(attr)) missing = true;
        }
        if (missing) this.#armRootObserver();
    }

    #disconnect() {
        this.#hostObserver?.disconnect();
        this.#hostObserver = undefined;
        this.#rootObserver?.disconnect();
        this.#rootObserver = undefined;
    }

    /** @returns {Document | ShadowRoot} */
    #root() {
        const root = this.#hostRef.deref()?.getRootNode();
        return root instanceof ShadowRoot ? root : document;
    }

    /**
     * Re-parse and re-resolve one attribute. Dispatches the change event when
     * the resolved element list actually changed.
     * @param {string} attr
     * @returns {boolean} whether the attribute still has unresolved ids
     */
    #resolveAttr(attr) {
        const host = this.#hostRef.deref();
        if (!host) return false;

        const ids = (host.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean);
        this.#ids.set(attr, ids);

        const root = this.#root();
        /** @type {WeakRef<Element>[]} */
        const refs = [];
        let missing = 0;
        for (const id of ids) {
            const el = root.getElementById(id);
            if (el) refs.push(new WeakRef(el));
            else missing++;
        }

        const before = this.get(attr);
        this.#refs.set(attr, refs);
        const after = this.get(attr);
        if (!sameElements(before, after)) this.#dispatch(attr);

        return missing > 0;
    }

    #armRootObserver() {
        if (this.#rootObserver) return;
        this.#rootObserver = new MutationObserver(() => this.#sweep());
        this.#rootObserver.observe(this.#root(), {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id'],
        });
    }

    /** Re-check every attribute that still has missing ids. */
    #sweep() {
        let stillMissing = false;
        for (const attr of this.#searchFor) {
            const ids = this.#ids.get(attr) ?? [];
            if (this.get(attr).length >= ids.length) continue;
            if (this.#resolveAttr(attr)) stillMissing = true;
        }
        if (!stillMissing) this.#maybeRest();
    }

    /** Stop the root observer once nothing is outstanding (README semantics). */
    #maybeRest() {
        if (this.complete) {
            this.#rootObserver?.disconnect();
            this.#rootObserver = undefined;
        }
    }

    /** @param {string} attr */
    #dispatch(attr) {
        const host = this.#hostRef.deref();
        if (!host) return;
        host.dispatchEvent(new CustomEvent(this.#eventType, {
            detail: { attr, ids: this.#ids.get(attr) ?? [], elements: this.get(attr) },
        }));
    }
}

/**
 * `aria-controls` -> `ariaControls`, `for` -> `for`.
 * @param {string} attr
 */
function attrToProp(attr) {
    return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * @param {readonly Element[]} a
 * @param {readonly Element[]} b
 */
function sameElements(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

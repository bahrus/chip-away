// @ts-check
import { ElementMaker } from 'el-maker/ElementMaker.js';

/** @import {AP, RunTimeProps} from './types/chip-away/types'; */

/**
 * Custom element that renders removable chips for selected options of
 * one or more target <select multiple> elements.
 *
 * The `for` attribute is parsed to `splitFor` (a `string[]` of ids) by
 * roundabout's `splitter` parser; a `when_splitFor_changes_call_hydrate`
 * compact then drives `hydrate()`. `hydrate()` hands `splitFor` to the
 * reusable `idRefs` feature, which resolves the ids to live <select>
 * elements — including waiting, via a MutationObserver, for referenced
 * selects that aren't in the DOM yet. A late-arriving select fires
 * `idRefs`' `id-referencer:resolved` event, which re-runs `hydrate()`.
 *
 * @extends {ElementMaker<AP, AP>}
 */
export class ChipAwayElement extends ElementMaker {
    static supportedFeatures = {
        ...ElementMaker.supportedFeatures,
        idRefs: {
            fallbackSpawn: () => import('./IdRefs.js').then(m => m.IdRefs),
            callbackForwarding: ['connectedCallback', 'disconnectedCallback'],
        },
    };

    /** @type {WeakMap<HTMLElement, HTMLOptionElement>} */
    #chipToOptionRefs = new WeakMap();

    /** @type {Map<string, HTMLFieldSetElement>} */
    #selectIDToChipsContainerMap = new Map();

    /** @type {WeakMap<HTMLButtonElement, HTMLSelectElement>} */
    #clearButtonToSelectMap = new WeakMap();

    /** @type {AbortController | undefined} */
    #abortController;

    connectedCallback() {
        super.connectedCallback?.();
        this.#connect();
        // Deterministic first/re-connect render: roundabout's compact may not
        // have fired yet, and on reconnect any `id-referencer:resolved` from
        // feature forwarding was dispatched before `#connect()` re-listened.
        //this.hydrate();
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        this.#cleanup();
    }

    /**
     * Get legend text for a select element.
     * @param {HTMLSelectElement} select
     * @returns {string}
     */
    #getLegendText(select) {
        let legendText = select.id || '';

        const parentLabel = select.closest('label');
        if (parentLabel) {
            legendText = parentLabel.textContent.replace(select.textContent, '').trim();
        } else if (select.id) {
            const root = /** @type {ParentNode} */ (select.getRootNode());
            const labelWithFor = root.querySelector?.(`label[for="${select.id}"]`);
            if (labelWithFor) {
                legendText = labelWithFor.textContent;
            }
        }

        return legendText;
    }

    /**
     * Create a single chip element.
     * @param {HTMLOptionElement} option
     * @returns {HTMLElement}
     */
    #createChipElement(option) {
        const chip = document.createElement('div');
        chip.classList.add('chip');
        chip.part.add('chip-remove-option-container');

        const button = document.createElement('button');
        button.type = 'button';
        button.part.add('chip-remove-option-trigger');
        button.ariaLabel = 'Remove';
        this.#chipToOptionRefs.set(button, option);

        const span = document.createElement('span');
        span.textContent = option.textContent;

        chip.appendChild(span);
        chip.appendChild(button);

        return chip;
    }

    /**
     * Create the container fieldset for chips of a single select.
     * @param {HTMLSelectElement} select
     * @returns {HTMLFieldSetElement}
     */
    #createChipsContainer(select) {
        const { id } = select;
        let fieldset = this.#selectIDToChipsContainerMap.get(id);
        if (fieldset) return fieldset;

        fieldset = document.createElement('fieldset');
        this.#selectIDToChipsContainerMap.set(id, fieldset);

        const legend = document.createElement('legend');
        legend.textContent = this.#getLegendText(select);
        fieldset.appendChild(legend);

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.classList.add('clear-all-trigger');
        clearButton.ariaLabel = 'Clear all';
        this.#clearButtonToSelectMap.set(clearButton, select);
        legend.appendChild(clearButton);

        return fieldset;
    }

    /**
     * Render all chips for a given select element.
     * @param {HTMLSelectElement} select
     */
    #renderSelectChips(select) {
        const selectedOptions = Array.from(select.selectedOptions)
            .filter(option => option.value !== '');

        if (selectedOptions.length === 0) {
            const { id } = select;
            const existingContainer = this.#selectIDToChipsContainerMap.get(id);
            if (existingContainer) {
                existingContainer.remove();
                this.#selectIDToChipsContainerMap.delete(id);
            }
            return;
        }

        const container = this.#createChipsContainer(select);

        // Clear existing chips (but keep the legend)
        const existingChips = container.querySelectorAll('.chip');
        existingChips.forEach(chip => chip.remove());

        for (const option of selectedOptions) {
            const chip = this.#createChipElement(option);
            container.appendChild(chip);
        }

        if (!this.contains(container)) {
            this.appendChild(container);
        }
    }

    /**
     * Feed the current `splitFor` id list to `idRefs` and (re-)render chips for
     * every currently-resolved <select>. Invoked by roundabout's
     * `when_splitFor_changes_call_hydrate` compact and by the
     * `id-referencer:resolved` event when a referenced select appears later.
     * @param {AP} [self]
     */
    hydrate(self) {
        const rt = /** @type {RunTimeProps} */ (/** @type {unknown} */ (this));
        const idRefs = rt.idRefs;
        idRefs?.search?.(self?.splitFor ?? rt.splitFor ?? []);
        /** @type {Element[]} */
        const resolved = idRefs?.get?.() ?? [];

        // Rebuild all fieldsets from scratch.
        this.#selectIDToChipsContainerMap.forEach(fieldset => fieldset.remove());
        this.#selectIDToChipsContainerMap.clear();

        for (const el of resolved) {
            if (!(el instanceof HTMLSelectElement)) continue;
            el.addEventListener('change', this, { signal: this.#abortController?.signal });
            this.#renderSelectChips(el);
        }
    }

    /**
     * Connect the element: wire up listeners and perform initial render.
     */
    #connect() {
        this.#cleanup();
        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.addEventListener('click', this, { signal });
        this.addEventListener('id-referencer:resolved', this, { signal });
    }

    /**
     * Clean up listeners and DOM state.
     */
    #cleanup() {
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = undefined;
        }
        this.#selectIDToChipsContainerMap.forEach(fieldset => fieldset.remove());
        this.#selectIDToChipsContainerMap.clear();
    }

    /**
     * @param {Event} e
     */
    handleEvent(e) {
        const { type, target } = e;

        if (type === 'id-referencer:resolved') {
            this.hydrate();
            return;
        }

        if (!(target instanceof HTMLElement)) return;

        switch (type) {
            case 'click':
                if (!(target instanceof HTMLButtonElement)) return;
                e.stopPropagation();

                const clearSelect = this.#clearButtonToSelectMap.get(target);
                if (clearSelect) {
                    Array.from(clearSelect.options).forEach(option => option.selected = false);
                    clearSelect.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    const option = this.#chipToOptionRefs.get(target);
                    if (option === undefined) return;
                    option.selected = false;
                    const select = option.closest('select');
                    if (select === null) return;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                break;

            case 'change':
                if (!(target instanceof HTMLSelectElement)) return;
                this.#renderSelectChips(target);
                break;
        }
    }
}

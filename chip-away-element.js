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
 * Two boolean knobs also re-run `hydrate()` via their own compacts:
 * `join` (one comma-joined summary chip per <select> instead of one chip per
 * option) and `readonly` (render for display only — no remove affordances).
 *
 * @extends {ElementMaker}
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
        this.#connect();
    }

    disconnectedCallback() {
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
     * Build the shared chip shell (`.chip` > `span` label, plus a delete
     * `button` unless `removable` is false). Callers own what the button does —
     * see {@linkcode #createChipElement} (per-option) and
     * {@linkcode #renderJoinedChip} (per-select summary).
     * @param {string} labelText
     * @param {boolean} removable
     * @returns {{ chip: HTMLElement, button: HTMLButtonElement | null }}
     */
    #createChip(labelText, removable) {
        const chip = document.createElement('div');
        chip.classList.add('chip');
        chip.part.add('chip-remove-option-container');

        const span = document.createElement('span');
        span.textContent = labelText;
        chip.appendChild(span);

        if (!removable) return { chip, button: null };

        const button = document.createElement('button');
        button.type = 'button';
        button.part.add('chip-remove-option-trigger');
        chip.appendChild(button);

        return { chip, button };
    }

    /**
     * Create a single chip element for one selected option; its ✕ (when present)
     * deselects just that option.
     * @param {HTMLOptionElement} option
     * @param {boolean} removable
     * @returns {HTMLElement}
     */
    #createChipElement(option, removable) {
        const { chip, button } = this.#createChip(option.textContent, removable);
        if (button) {
            button.ariaLabel = 'Remove';
            this.#chipToOptionRefs.set(button, option);
        }
        return chip;
    }

    /**
     * Create the container fieldset for chips of a single select. The "clear
     * all" trigger is omitted when `removable` is false.
     * @param {HTMLSelectElement} select
     * @param {boolean} removable
     * @returns {HTMLFieldSetElement}
     */
    #createChipsContainer(select, removable) {
        const { id } = select;
        let fieldset = this.#selectIDToChipsContainerMap.get(id);
        if (fieldset) return fieldset;

        fieldset = document.createElement('fieldset');
        this.#selectIDToChipsContainerMap.set(id, fieldset);

        const legend = document.createElement('legend');
        legend.textContent = this.#getLegendText(select);
        fieldset.appendChild(legend);

        if (removable) {
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.classList.add('clear-all-trigger');
            clearButton.ariaLabel = 'Clear all';
            this.#clearButtonToSelectMap.set(clearButton, select);
            legend.appendChild(clearButton);
        }

        return fieldset;
    }

    /**
     * Render chips for one `<select>`, honoring `join` (one summary chip vs. one
     * chip per option) and `readonly` (no remove affordances).
     * @param {HTMLSelectElement} select
     */
    #renderSelect(select) {
        const { join, readonly } = /** @type {RunTimeProps} */ (/** @type {unknown} */ (this));
        const removable = !readonly;
        if (join) this.#renderJoinedChip(select, removable);
        else this.#renderSelectChips(select, removable);
    }

    /**
     * `join` mode: collapse every selected option into a single chip whose
     * label is a comma-delimited list. Its ✕ (unless `removable` is false)
     * clears all selected options for this `<select>` (routed through
     * {@linkcode #clearButtonToSelectMap}).
     * @param {HTMLSelectElement} select
     * @param {boolean} removable
     */
    #renderJoinedChip(select, removable) {
        const selectedOptions = Array.from(select.selectedOptions)
            .filter(option => option.value !== '');

        const { id } = select;
        if (selectedOptions.length === 0) {
            const existingContainer = this.#selectIDToChipsContainerMap.get(id);
            if (existingContainer) {
                existingContainer.remove();
                this.#selectIDToChipsContainerMap.delete(id);
            }
            return;
        }

        const container = this.#createChipsContainer(select, removable);
        container.querySelectorAll('.chip').forEach(chip => chip.remove());

        const label = selectedOptions.map(option => option.textContent).join(', ');
        const { chip, button } = this.#createChip(label, removable);
        if (button) {
            button.ariaLabel = 'Remove all';
            this.#clearButtonToSelectMap.set(button, select);
        }
        container.appendChild(chip);

        if (!this.contains(container)) {
            this.appendChild(container);
        }
    }

    /**
     * Render all chips for a given select element.
     * @param {HTMLSelectElement} select
     * @param {boolean} removable
     */
    #renderSelectChips(select, removable) {
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

        const container = this.#createChipsContainer(select, removable);

        // Clear existing chips (but keep the legend)
        const existingChips = container.querySelectorAll('.chip');
        existingChips.forEach(chip => chip.remove());

        for (const option of selectedOptions) {
            const chip = this.#createChipElement(option, removable);
            container.appendChild(chip);
        }

        if (!this.contains(container)) {
            this.appendChild(container);
        }
    }

    /**
     * Feed the current `splitFor` id list to `idRefs` and (re-)render chips for
     * every currently-resolved <select>. Invoked by roundabout's
     * `when_{splitFor,join,readonly}_changes_call_hydrate` compacts and by the
     * `id-referencer:resolved` event when a referenced select appears later.
     * @param {RunTimeProps} self
     */
    hydrate(self) {
        const {idRefs, splitFor} = self;
        idRefs.searchFor = splitFor;
        /** @type {Element[]} */
        const resolved = idRefs.elements;

        // Rebuild all fieldsets from scratch (also flips per-select rendering
        // between chip-per-option and the single joined summary chip).
        this.#selectIDToChipsContainerMap.forEach(fieldset => fieldset.remove());
        this.#selectIDToChipsContainerMap.clear();

        for (const el of resolved) {
            if (!(el instanceof HTMLSelectElement)) continue;
            el.addEventListener('change', this, { signal: this.#abortController?.signal });
            this.#renderSelect(el);
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

        // Rebuild chips from current truth on every (re)connect. roundabout's
        // `when_splitFor_changes_call_hydrate` compact only fires on an actual
        // `splitFor` change, so a disconnect/reconnect cycle — where `splitFor`
        // is unchanged — would otherwise leave the chips (torn down in
        // `#cleanup()`) permanently missing. Guarded on `splitFor` being
        // populated so the very first connect, if it lands here before
        // roundabout has parsed `for`, is left to the compact.
        const self = /** @type {RunTimeProps} */ (/** @type {unknown} */ (this));
        if (self.splitFor?.length) this.hydrate(self);
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
        const self = /** @type {RunTimeProps} */ ( /** @type {any} */(this));
        if (type === 'id-referencer:resolved') {
            this.hydrate(self);
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
                this.#renderSelect(target);
                break;
        }
    }
}

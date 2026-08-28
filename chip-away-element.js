// @ts-check
import { ElementMaker } from 'el-maker/ElementMaker.js';

/** @import {AP, RunTimeProps} from './types/chip-away/types'; */

/**
 * Custom element that renders removable chips for selected options of
 * one or more target <select multiple> elements.
 * @extends {ElementMaker<AP, AP>}
 */
export class ChipAwayElement extends ElementMaker {
    /** @type {WeakMap<HTMLElement, HTMLOptionElement>} */
    #chipToOptionRefs = new WeakMap();

    /** @type {Map<string, HTMLFieldSetElement>} */
    #selectIDToChipsContainerMap = new Map();

    /** @type {WeakMap<HTMLButtonElement, string>} */
    #clearButtonToSelectIDMap = new WeakMap();

    /** @type {AbortController | undefined} */
    #abortController;

    connectedCallback() {
        super.connectedCallback?.();
        this.#connect();
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        this.#cleanup();
    }

    /**
     * @param {string} name
     * @param {string | null} oldValue
     * @param {string | null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        if (name === 'for' && oldValue !== newValue) {
            this.#connect();
        }
    }

    /**
     * Get the root node (Shadow DOM or document) for searching target elements.
     * @returns {ShadowRoot | Document}
     */
    #getRoot() {
        const root = this.getRootNode();
        return root instanceof ShadowRoot ? root : document;
    }

    /**
     * Find an element by ID in the appropriate root.
     * @param {string} id
     * @returns {HTMLElement | null}
     */
    #findElement(id) {
        const root = this.#getRoot();
        if (root instanceof ShadowRoot) {
            return root.getElementById(id);
        }
        return document.getElementById(id);
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
            const root = this.#getRoot();
            const labelWithFor = root.querySelector(`label[for="${select.id}"]`);
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
        this.#clearButtonToSelectIDMap.set(clearButton, id);
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
     * Main render action - called when 'for' property/attribute changes.
     * @param {AP} self
     */
    hydrate(self) {

        const {splitFor} = self;
        if(!splitFor) return;

                // Clear existing fieldsets using the map
        this.#selectIDToChipsContainerMap.forEach(fieldset => fieldset.remove());
        this.#selectIDToChipsContainerMap.clear();

        for (const id of splitFor) {
            const select = /** @type {HTMLSelectElement | null} */ (this.#findElement(id));
            if (!select) continue;
            select.addEventListener('change', this, { signal: this.#abortController?.signal });
            this.#renderSelectChips(select);
        }
    }

    /**
     * Connect the element: wire up listeners and perform initial render.
     */
    #connect() {
        this.#cleanup();
        this.#abortController = new AbortController();
        this.addEventListener('click', this, { signal: this.#abortController.signal });
        //this.#hydrate();
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
        if (!(target instanceof HTMLElement)) return;

        switch (type) {
            case 'click':
                if (!(target instanceof HTMLButtonElement)) return;
                e.stopPropagation();

                const clearSelectId = this.#clearButtonToSelectIDMap.get(target);
                if (clearSelectId) {
                    const root = this.#getRoot();
                    const select = /** @type {HTMLSelectElement | null} */ (
                        root instanceof ShadowRoot
                            ? root.getElementById(clearSelectId)
                            : document.getElementById(clearSelectId)
                    );
                    if (select) {
                        Array.from(select.options).forEach(option => option.selected = false);
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
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

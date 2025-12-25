// @ts-check
import {O} from 'trans-render/froop/O.js';
/** @import {OConfig} from './ts-refs/trans-render/froop/types'; */
/** @import {EndUserProps, AllProps, PAP, ProPAP, Actions} from './ts-refs/chip-away/types'; */


/**
 * @implements {EventListenerObject}
 */
export class ChipAway extends O {

  /** @type {WeakMap<HTMLElement, HTMLOptionElement>} */
  #chipToOptionRefs = new WeakMap();

  /** @type {Map<string, HTMLFieldSetElement>} */
  #selectIDToChipsContainerMap = new Map();

  /** @type {OConfig<AllProps, Actions>} */ 
  static config = {
    propInfo: {
      for: {
        type: 'String',
        attrName: 'for',
        parse: true,
        reflect: true,
      },
    },
    compacts: {
      when_for_changes_call_hydrate: 0,
    },

  };

  /**
   * Get the root node (Shadow DOM or document)
   * @param {HTMLElement} self
   * @returns {ShadowRoot | Document}
   */
  #getRoot(self) {
    const root = self.getRootNode();
    return root instanceof ShadowRoot ? root : document;
  }

  /**
   * Find an element by ID in the appropriate root
   * @param {AllProps & HTMLElement} self
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  #findElement(self, id) {
    const root = this.#getRoot(self);
    if (root instanceof ShadowRoot) {
      return root.getElementById(id);
    }
    return document.getElementById(id);
  }

  /**
   * Get legend text for a select element
   * @param {AllProps & HTMLElement} self
   * @param {HTMLSelectElement} select
   * @returns {string}
   */
  getLegendText(self, select) {
    let legendText = select.id || '';
    
    const parentLabel = select.closest('label');
    if (parentLabel) {
      legendText = parentLabel.textContent.replace(select.textContent, '').trim();
    } else if (select.id) {
      const root = this.#getRoot(self);
      const labelWithFor = root.querySelector(`label[for="${select.id}"]`);
      if (labelWithFor) {
        legendText = labelWithFor.textContent;
      }
    }
    
    return legendText;
  }

  /**
   * Create a single chip element
   * @param {AllProps & HTMLElement} self
   * @param {HTMLSelectElement} select
   * @param {HTMLOptionElement} option
   * @returns {HTMLElement}
   */
  createChipElement(self, select, option) {
    
    const chip = document.createElement('div');
    chip.classList.add('chip');
    chip.part.add('chip-remove-option-container');
    const button = document.createElement('button');
    button.type = 'button';
    button.part.add('chip-remove-option-trigger');
    button.ariaLabel = 'Remove';
    this.#chipToOptionRefs.set(button, option);
    button.addEventListener('click', this);

    const span = document.createElement('span');
    span.textContent = option.textContent;
    
    chip.appendChild(span);
    chip.appendChild(button);
    
    return chip;
  }

  /**
   * Create the container fieldset for chips
   * @param {AllProps & HTMLElement} self
   * @param {HTMLSelectElement} select
   * @returns {HTMLFieldSetElement}
   */
  createChipsContainer(self, select) {
    const { id } = select;
    let fieldset = this.#selectIDToChipsContainerMap.get(id);
    if (fieldset) return fieldset;
    fieldset = document.createElement('fieldset');
    this.#selectIDToChipsContainerMap.set(id, fieldset);
    const legend = document.createElement('legend');
    
    legend.textContent = this.getLegendText(self, select);
    fieldset.appendChild(legend);
    
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.classList.add('clear-all-trigger');
    clearButton.setAttribute('data-clear-select-id', id);
    clearButton.addEventListener('click', this);
    legend.appendChild(clearButton);
    
    return fieldset;
  }

  /**
   * Render all chips for a given select element
   * @param {AllProps & HTMLElement} self
   * @param {HTMLSelectElement} select
   */
  renderSelectChips(self, select) {
    const selectedOptions = Array.from(select.selectedOptions)
      .filter(option => option.value !== '');
    
    if (selectedOptions.length === 0) {
      const {id} = select;
      const existingContainer = this.#selectIDToChipsContainerMap.get(id);
      if(existingContainer){
        existingContainer.remove();
        this.#selectIDToChipsContainerMap.delete(id);
      }
      return;
    }

    const container = this.createChipsContainer(self, select);
    
    // Clear existing chips (but keep the legend)
    const existingChips = container.querySelectorAll('.chip');
    existingChips.forEach(chip => chip.remove());

    for (const option of selectedOptions) {
      const chip = this.createChipElement(self, select, option);
      container.appendChild(chip);
    }

    self.appendChild(container);
  }

  /**
   * Main render action - called when 'for' property changes
   * @param {AllProps & HTMLElement} self
   * @returns {PAP}
   */
  hydrate(self) {
    const { for: forAttr } = self;
    if (!forAttr) return {};

    // Clear existing fieldsets using the map
    this.#selectIDToChipsContainerMap.forEach(fieldset => fieldset.remove());
    this.#selectIDToChipsContainerMap.clear();

    // Attach listeners and render chips for each select
    const selectIds = forAttr.split(/\s+/).filter(Boolean);

    for(const id of selectIds){
      const select = /** @type {HTMLSelectElement} */ (this.#findElement(self, id));
      if(!select) continue;
      select.addEventListener('change', this);
      this.renderSelectChips(self, select);
    }
    

    return {};
  }

  /**
   * 
   * @param {Event} e 
   */
  handleEvent(e){
    const {type, target} = e;
    const self = /** @type {AllProps & HTMLElement} */ (/** @type {any} */(this));
    if(!(target instanceof HTMLElement)) throw 500;
    switch(type){
      case 'click':
        e.stopPropagation();
        const clearSelectId = target.getAttribute('data-clear-select-id');
        if(clearSelectId) {
          // Handle clear all button
          const root = this.#getRoot(self);
          const select = /** @type {HTMLSelectElement} */ (root instanceof ShadowRoot ? root.getElementById(clearSelectId) : document.getElementById(clearSelectId));
          if(select) {
            Array.from(select.options).forEach(option => option.selected = false);
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          // Handle chip delete button
          const option =  this.#chipToOptionRefs.get(target);
          if(option === undefined) throw 500;
          option.selected = false;
          const select = option.closest('select');
          if(select === null) throw 500;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      case 'change':
        if(!(target instanceof HTMLSelectElement)) throw 500;
        this.renderSelectChips(self, target);
        break;
    }
  }
}

ChipAway.bootUp();

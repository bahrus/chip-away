// @ts-check
import {O} from 'trans-render/froop/O.js';
/** @import {OConfig} from './ts-refs/trans-render/froop/types'; */
/** @import {EndUserProps, AllProps, PAP, ProPAP, Actions} from './ts-refs/chip-away/types'; */


export class ChipAway extends O {

  /** @type {WeakMap<HTMLElement, HTMLElement>} */
  #refs = new WeakMap();
  /** @type {OConfig<AllProps, Actions>} */ 
  static config = {
    propInfo: {
      for: {
        type: 'String',
        attrName: 'for',
        parse: true,
      },
    },
    compacts: {
      when_for_changes_call_hydrate: 0,
    },
    // actions: {
    //   render: {
    //     ifKeyIn: ['for'],
    //   },
    // },
    handlers: {
      // Listen for change events on monitored select elements
    },

  };

  /**
   * Get the root node (Shadow DOM or document)
   * @param {ChipAway} self
   * @returns {ShadowRoot | Document}
   */
  #getRoot(self) {
    const root = self.getRootNode();
    return root instanceof ShadowRoot ? root : document;
  }

  /**
   * Find an element by ID in the appropriate root
   * @param {ChipAway} self
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
   * @param {ChipAway} self
   * @param {HTMLSelectElement} select
   * @returns {string}
   */
  #getLegendText(self, select) {
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
   * @param {ChipAway} self
   * @param {string} id
   * @param {HTMLSelectElement} select
   * @param {HTMLOptionElement} option
   * @returns {HTMLElement}
   */
  #createChipElement(self, id, select, option) {
    const label = document.createElement('label');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = '&#10006;';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      option.selected = false;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const span = document.createElement('span');
    span.textContent = option.textContent;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.value = id;
    
    label.appendChild(span);
    label.appendChild(input);
    label.appendChild(button);
    
    return label;
  }

  /**
   * Create the container fieldset for chips
   * @param {ChipAway} self
   * @param {string} id
   * @param {HTMLSelectElement} select
   * @returns {HTMLFieldSetElement}
   */
  #createChipsContainer(self, id, select) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    
    legend.textContent = this.#getLegendText(self, select);
    fieldset.appendChild(legend);
    
    return fieldset;
  }

  /**
   * Render all chips for a given select element
   * @param {ChipAway} self
   * @param {string} id
   * @param {HTMLSelectElement} select
   */
  #renderSelectChips(self, id, select) {
    const selectedOptions = Array.from(select.selectedOptions)
      .filter(option => option.value !== '');
    
    if (selectedOptions.length === 0) return;

    const container = this.#createChipsContainer(self, id, select);

    for (const option of selectedOptions) {
      const chip = this.#createChipElement(self, id, select, option);
      container.appendChild(chip);
    }

    self.appendChild(container);
  }

  /**
   * Main render action - called when 'for' property changes
   * @param {ChipAway} self
   * @returns {PAP}
   */
  hydrate(self) {
    const { for: forAttr } = self;
    if (!forAttr) return {};

    // Clear existing fieldsets
    const existingFieldsets = self.querySelectorAll(':scope > fieldset');
    existingFieldsets.forEach(fs => fs.remove());

    // Attach listeners and render chips for each select
    const selectIds = forAttr.split(/\s+/).filter(Boolean);
    
    selectIds.forEach(id => {
      const select = /** @type {HTMLSelectElement} */ (this.#findElement(self, id));
      if (!select) return;

      // Attach change listener
      const listener = () => this.hydrate(self);
      select.addEventListener('change', listener);

      // Render chips
      this.#renderSelectChips(self, id, select);
    });

    return {};
  }
}

ChipAway.bootUp();

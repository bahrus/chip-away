export class ChipAway extends HTMLElement {
  #selectListeners = new Map();

  connectedCallback() {
    this.#attachListeners();
    this.render();
  }

  disconnectedCallback() {
    this.#detachListeners();
  }

  #getRoot() {
    // Check if this component is in a shadow DOM, otherwise use document
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? root : document;
  }

  #findElement(id) {
    const root = this.#getRoot();
    if (root instanceof ShadowRoot) {
      return root.getElementById(id);
    }
    return document.getElementById(id);
  }

  #attachListeners() {
    const idref = this.getAttribute('idref');
    if (!idref) return;

    const selectIds = idref.split(/\s+/).filter(Boolean);
    
    selectIds.forEach(id => {
      const select = this.#findElement(id);
      if (!select) return;

      const listener = () => this.render();
      select.addEventListener('change', listener);
      this.#selectListeners.set(id, { select, listener });
    });
  }

  #detachListeners() {
    this.#selectListeners.forEach(({ select, listener }) => {
      select.removeEventListener('change', listener);
    });
    this.#selectListeners.clear();
  }

  render() {
    const idref = this.getAttribute('idref');
    if (!idref) return;

    const selectIds = idref.split(/\s+/).filter(Boolean);
    
    // Clear existing fieldsets
    const existingFieldsets = this.querySelectorAll(':scope > fieldset');
    existingFieldsets.forEach(fs => fs.remove());

    selectIds.forEach(id => {
      const select = this.#findElement(id);
      if (!select) return;

      const selectedOptions = Array.from(select.selectedOptions)
        .filter(option => option.value !== '');
      if (selectedOptions.length === 0) return;

      this.createChip(id, select, selectedOptions);
    });
  }

  createChip(id, select, selectedOptions) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const label = select.previousElementSibling?.querySelector('span')?.textContent || 
                  select.id;
    legend.textContent = label;
    fieldset.appendChild(legend);

    selectedOptions.forEach(option => {
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

      label.appendChild(button);
      label.appendChild(span);
      label.appendChild(input);
      fieldset.appendChild(label);
    });

    this.appendChild(fieldset);
  }
}

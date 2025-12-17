export class ChipAway extends HTMLElement {
  connectedCallback() {
    this.addEventListener('change', this.#handleSelectChange);
    this.#render();
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.#handleSelectChange);
  }

  #handleSelectChange = (event) => {
    if (event.target.tagName === 'SELECT') {
      this.#render();
    }
  }

  #render() {
    const idref = this.getAttribute('idref');
    if (!idref) return;

    const selectIds = idref.split(/\s+/).filter(Boolean);
    
    // Clear existing fieldsets
    const existingFieldsets = this.querySelectorAll(':scope > fieldset');
    existingFieldsets.forEach(fs => fs.remove());

    selectIds.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      const selectedOptions = Array.from(select.selectedOptions);
      if (selectedOptions.length === 0) return;

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
    });
  }
}

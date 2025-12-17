# chip-away

*chip-away* is a web component that transforms selected options from HTML `<select>` elements into an interactive, visually-distinct chip interface. It provides users with an intuitive way to review, manage, and remove selected values through a clean, user-friendly UI.

## Features

- **Automatic Chip Generation**: Converts selected options into visual chips
- **Easy Deselection**: Click the × button on any chip to remove it instantly
- **Multi-Select Support**: Monitor multiple select elements simultaneously
- **Light DOM Children**: Renders chips as semantic HTML (fieldsets, labels, buttons)
- **Flexible Naming**: Use the canonical name "chip-away" or customize it

## Installation

```bash
npm install chip-away
```

## Usage

### Basic Example

Import the component in your HTML:

```html
<script type="module" src="node_modules/chip-away/index.js"></script>
```

Create your select elements and add the `<chip-away>` component:

```html
<label>
    <span>Select 1</span>
    <select id="select1" multiple>
        <option selected value="option1">Option 1</option>
        <option value="option2">Option 2</option>
    </select>
</label>

<label>
    <span>Select 2</span>
    <select id="select2">
        <option value="option3">Option 3</option>
    </select>
</label>

<chip-away for="select1 select2"></chip-away>
```

### How It Works

The `chip-away` component monitors the select elements referenced in the `for` attribute (space-separated IDs). When the user selects options, the component dynamically generates a visual representation:

```html
<chip-away for="select1 select2">
    <fieldset>
        <legend>Select 1</legend>
        <label>
            <button>&#10006;</button>
            <span>Option 1</span>
            <input type="hidden" value="select1">
        </label>
        <label>
            <button>&#10006;</button>
            <span>Option 2</span>
            <input type="hidden" value="select1">
        </label>
    </fieldset>
</chip-away>
```

Each selected option appears as a chip with:
- An **× button** to remove the option from the select element
- A **label** displaying the option text
- A **hidden input** storing the select element's ID

Clicking the × button automatically deselects the option and updates the chip display in real-time.

## Custom Naming

The component name is flexible. By default, importing `index.js` registers the component as `<chip-away>`. To use a custom name, import `chip-away.js` directly and register it yourself:

```javascript
import { ChipAway } from './chip-away.js';

customElements.define('my-custom-chips', ChipAway);
```

Then use it as `<my-custom-chips for="select1 select2"></my-custom-chips>`

## Extending with Custom Markup

The component is designed to be subclassed for custom rendering. Override the `createChip()` method to render chips with your own HTML structure:

```javascript
import { ChipAway } from './chip-away.js';

class CustomChipAway extends ChipAway {
  createChip(id, select, selectedOptions) {
    const container = document.createElement('div');
    container.className = 'custom-chip-container';
    
    const title = document.createElement('h3');
    title.textContent = select.previousElementSibling?.querySelector('span')?.textContent || select.id;
    container.appendChild(title);

    selectedOptions.forEach(option => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      
      const text = document.createElement('span');
      text.textContent = option.textContent;
      chip.appendChild(text);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'chip-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        option.selected = false;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      chip.appendChild(closeBtn);
      
      container.appendChild(chip);
    });

    this.appendChild(container);
  }
}

customElements.define('custom-chips', CustomChipAway);
```

### Overridable Methods

- **`render()`** - Called when the component connects or when a select element changes. Clears existing chips and iterates through all selected options, calling `createChip()` for each select element with selections. Override this to customize the overall rendering flow.

- **`createChip(id, select, selectedOptions)`** - Creates the HTML markup for a single select element's chips. Parameters:
  - `id` - The ID of the select element
  - `select` - The select element reference
  - `selectedOptions` - Array of selected option elements
  
  Override this method to customize the chip HTML structure.

## License

MIT



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

The component is designed to be subclassed for custom rendering. Override the methods render, createChipContainer and createChip method to define your own HTML structure.


### Overridable Methods

The `ChipAway` component provides three methods that can be overridden to customize behavior and rendering:

#### `render()`
Called when the component connects or when a select element changes. This method clears existing chips and orchestrates the overall rendering flow by iterating through all selected options.

**Override this to:**
- Customize the overall rendering flow
- Add custom logic before or after chips are rendered
- Control how multiple select elements are processed

#### `createChipsContainer(id, select, selectedOptions)`
Creates the container element (fieldset) that holds all chips for a specific select element.

**Parameters:**
- `id` - The ID of the select element
- `select` - The HTMLSelectElement reference
- `selectedOptions` - Array of selected HTMLOptionElement objects

**Returns:**
- An HTMLElement to serve as the container for chips

**Override this to:**
- Change the container structure (e.g., use a `<div>` instead of `<fieldset>`)
- Customize the legend/title element
- Add additional metadata or styling to the container

#### `createChip(id, select, selectedOptions, option, container)`
Creates the HTML markup for a single chip representing one selected option.

**Parameters:**
- `id` - The ID of the select element
- `select` - The HTMLSelectElement reference
- `selectedOptions` - Array of selected option elements
- `option` - The current HTMLOptionElement being rendered
- `container` - The parent container element to append the chip to

**Override this to:**
- Customize individual chip HTML structure
- Change styling or layout of chips
- Modify button behavior or labels
- Add additional elements or data attributes

#### `createChips(id, select, selectedOptions)`
Orchestrates the creation of all chips for a specific select element. Calls `createChipsContainer()` and then `createChip()` for each selected option.

**Parameters:**
- `id` - The ID of the select element
- `select` - The HTMLSelectElement reference
- `selectedOptions` - Array of selected option elements

**Override this to:**
- Customize how the container and chips are created together
- Add custom processing or filtering of options
- Control the order or grouping of chips

## License

MIT



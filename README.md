# chip-away

*chip-away* is a web component that transforms selected options from HTML `<select>` elements into an interactive, visually-distinct chip interface. It provides users with an intuitive way to review, manage, and remove selected values through a clean, user-friendly UI.

## Features

- **Automatic Chip Generation**: Converts selected options into visual chips
- **Easy Deselection**: Click the × button on any chip to remove it instantly
- **Multi-Select Support**: Monitor multiple select elements simultaneously
- **Light DOM Rendering**: Renders chips as semantic HTML (fieldsets, legends, labels, buttons)
- **Smart Legend Text**: Automatically derives legend text from associated labels or select element ID
- **Shadow DOM Compatible**: Works correctly within Shadow DOM boundaries

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
        <legend>Email</legend>
        <label>
            <span>Option 1</span>
            <button>&#10006;</button>
        </label>
        <label>
            <span>Option 2</span>
            <button>&#10006;</button>
        </label>
    </fieldset>
</chip-away>
```

Each selected option appears as a chip with:
- A **span** displaying the option text
- An **× button** to remove the option from the select element

Clicking the × button automatically deselects the option and updates the chip display in real-time.

### Legend Text Resolution

The component intelligently determines the legend text for each select element using the following priority:

1. **If the select is inside a `<label>` element**: Uses the label's text content (minus the select's own text)
2. **If the select has an `id` and a `<label for="...">` exists**: Uses the label's text content
3. **Fallback**: Uses the select element's `id`

## Custom Naming

The component is distributed as a class and automatically boots up when the module is imported. The canonical name is `<chip-away>`, registered by default.

To use a custom element name, import the class and register it yourself:

```javascript
import { ChipAway } from 'chip-away/chip-away.js';

customElements.define('my-custom-chips', ChipAway);
```

Then use it as `<my-custom-chips for="select1 select2"></my-custom-chips>`

## VS Code Extension: idref

When working with the `for` attribute in your HTML markup, the [idref](https://marketplace.visualstudio.com/items?itemName=andersonbruceb.idref) VS Code extension can make navigating between the `<chip-away>` element and its referenced select elements much easier.

The extension adds "Go to Definition" functionality, allowing you to:
- **Ctrl+Click** (or **Cmd+Click** on Mac) on any ID in the `for` attribute to instantly jump to the corresponding element
- Navigate seamlessly between `<chip-away for="select1 select2">` and the actual `<select>` elements with matching IDs

This is especially helpful when managing multiple select elements across your HTML file.

## Extending with Custom Markup

The component is designed to be subclassed for custom rendering. The implementation uses the `trans-render/froop` pattern, and exposes the following methods:

### Methods You Can Override

#### `#getLegendText(self, select)`
Determines the legend text displayed in the fieldset for a given select element.

**Parameters:**
- `self` - The component instance
- `select` - The HTMLSelectElement reference

**Returns:**
- A string to use as the legend text

**Override this to:**
- Customize how legend text is determined
- Add prefixes, suffixes, or special formatting

#### `#createChipElement(self, select, option)`
Creates the HTML markup for a single chip representing one selected option.

**Parameters:**
- `self` - The component instance
- `select` - The HTMLSelectElement reference
- `option` - The current HTMLOptionElement being rendered

**Returns:**
- An HTMLElement (typically a `<label>`) to serve as the chip

**Override this to:**
- Customize individual chip HTML structure
- Change styling or layout of chips
- Modify button behavior or labels
- Add additional elements or data attributes

#### `#createChipsContainer(self, select)`
Creates the container element (fieldset) that holds all chips for a specific select element.

**Parameters:**
- `self` - The component instance
- `select` - The HTMLSelectElement reference

**Returns:**
- An HTMLFieldSetElement to serve as the container

**Override this to:**
- Change the container structure (e.g., use a `<div>` instead of `<fieldset>`)
- Customize the legend creation
- Add additional metadata or styling to the container

#### `#renderSelectChips(self, select)`
Orchestrates the rendering of all chips for a specific select element.

**Parameters:**
- `self` - The component instance
- `select` - The HTMLSelectElement reference

**Override this to:**
- Customize the overall rendering flow for a single select
- Add custom logic before or after chips are rendered

#### `hydrate(self)`
Main entry point called when the component's `for` attribute changes or is initially set.

**Override this to:**
- Customize the overall rendering flow
- Add custom logic before or after all chips are rendered
- Control how multiple select elements are processed

## License

MIT



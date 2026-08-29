# chip-away

[![Playwright Tests](https://github.com/bahrus/chip-away/actions/workflows/CI.yml/badge.svg?branch=baseline)](https://github.com/bahrus/chip-away/actions/workflows/CI.yml)
[![NPM version](https://badge.fury.io/js/chip-away.png)](http://badge.fury.io/js/chip-away)
[![How big is this package in your project?](https://img.shields.io/bundlephobia/minzip/chip-away?style=for-the-badge)](https://bundlephobia.com/result?p=chip-away)
<img src="http://img.badgesize.io/https://cdn.jsdelivr.net/npm/chip-away?compression=gzip">

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

## Viewing Demos Locally

1. Install git
2. Fork/clone this repo
3. Install node.js
4. Open command window to folder where you cloned this repo
5. > git submodule add https://github.com/bahrus/types.git types
6. > git submodule update --init --recursive
7. > npm install
8. > npm run serve
9. Open http://localhost:8000/demo/ in a modern browser

## Running Tests

```
> npm run test
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
        <legend>
            Select 1
            <button class="clear-all-trigger" data-clear-select-id="select1"></button>
        </legend>
        <div class="chip">
            <span>Option 1</span>
            <button type="button">✕</button>
        </div>
        <div class="chip">
            <span>Option 2</span>
            <button type="button">✕</button>
        </div>
    </fieldset>
</chip-away>
```

Each selected option appears as a chip with:
- A **span** displaying the option text
- An **× button** to remove the option from the select element
- Each fieldset includes a "Clear All" button in the legend to deselect all options at once

Clicking the × button on a chip automatically deselects that option and updates the chip display in real-time. Clicking the "Clear All" button removes all chips for that select element.

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

`ChipAwayElement` is designed to be subclassed for custom rendering. The rendering
pipeline is a set of **plain public methods** — override any of them in a subclass
and it is picked up automatically (every internal call goes through `this`). Call
`super.<method>(...)` to reuse the default output and then adjust it.

```js
import { ChipAwayElement } from 'chip-away/chip-away-element.js';

class MyChips extends ChipAwayElement {
    getLegendText(select) {
        return `Chosen — ${super.getLegendText(select)}`;
    }

    createChipElement(option, removable) {
        const chip = super.createChipElement(option, removable); // keeps the ✕ wiring
        chip.dataset.value = option.value;
        return chip;
    }
}
customElements.define('my-chips', MyChips);
```

> The button → option and button → select associations are held in private
> `WeakMap`s, so a subclass that hand-rolls its own delete button can't hook into
> the built-in remove behavior. Build on `super.createChip(...)` /
> `super.createChipElement(...)` instead, or wire the `<select>` yourself.

### Methods you can override

`removable` below is `!readonly` — pass it straight through to `super` unless you
mean to change the read-only behavior.

| Method | Role |
| --- | --- |
| `getLegendText(select)` → `string` | Legend text for a `<select>`'s fieldset. Default: associated `<label>` text, else the select's `id`. |
| `createChip(labelText, removable)` → `{ chip, button }` | The shared chip shell: `.chip` > `span` label, plus a delete `<button>` (or `button: null` when `!removable`). Used by both paths below. |
| `createChipElement(option, removable)` → `HTMLElement` | One chip for one selected option; its ✕ deselects that option. |
| `createChipsContainer(select, removable)` → `HTMLFieldSetElement` | The `<fieldset>` + `<legend>` wrapper (with the "clear all" trigger unless `!removable`). Cached per select `id`. |
| `renderSelectChips(select, removable)` | Renders one chip per selected option into the container. |
| `renderJoinedChip(select, removable)` | `join` mode: renders a single chip whose label is the selected option texts joined by `', '`. |
| `renderSelect(select)` | Dispatches to `renderJoinedChip` / `renderSelectChips` based on `join`, and derives `removable` from `readonly`. |
| `hydrate(self)` | Entry point from the `when_{splitFor,join,readonly}_changes_call_hydrate` compacts and the `id-referencer:resolved` event. `self` is the runtime props (`splitFor`, `join`, `readonly`, `idRefs`, …). Rebuilds every fieldset, then calls `renderSelect` per resolved `<select>`. |

## License

MIT



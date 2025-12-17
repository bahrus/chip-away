# chip-away

*chip-away* is a web component package that provides an easy way to remove options from multiple select components and/or autocomplete input elements.

The name of the web component is flexible.  The canonical name, "chip-away" is only automatically registered if one references index.js.  To choose your own name, reference chip-away.js, which is where all the logic resides, and take of registering the name in the appropriate registry/registries.

## What chip-away does

```html
<label>
    <span>Select 1</span>
    <select id=select1 multiple>
        <option selected value=option1>Option 1</option>
    </select>
</label>
<label>
    <span>Select 2</span>
    <select id=select2></select>
</label>

<chip-away idref="select1 select2"></chip-away>
```

Is the user selects options from select1 and select2, the chip-away web component adds light children for each selected option:

```html
<chip-away idref="select1 select2">
    <!-- only appears if one or more option is selected fro select1> -->
    <fieldset>
        <legend>Select 1</legend>
        <label>
            <button>&#10006;</button>
            <span>Option 1</span>
            <input type=hidden value=select1>
        </label>
    </fieldset>
</chip-away>
```

Clicking on the button causes that option to no longer be selected.



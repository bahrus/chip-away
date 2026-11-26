// @ts-check
/**
 * chip-away, HTML/JSON first: the source of `el-maker.json`.
 *
 * Run `npm run build-el-maker` (watches this file), or `node el-maker.mjs` once.
 *
 * This is the JSON-only alternative to `chip-away-element.js`. Both define `<chip-away>`, and a page
 * loads one or the other: `index.js` for the class, `json.js` (or a `cede` script, see
 * `demo/json.html`) for this one.
 *
 * "Subclassing": the pieces are exported as `parts`, and `build(parts)` assembles a config from them.
 * Another package can import this module, replace some parts, and write its own JSON:
 *
 *     import { parts, build } from 'chip-away/el-maker.mjs';
 *     const config = build({ ...parts, legendText: ['?.dataset?.legend', '||', ...parts.legendText] });
 *
 * Importing this module doesn't write anything. Only running it does.
 */
import { writeFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { tree, each, choose } from 'assign-gingerly/DX/tree.js';

/** @import {ElMakerConfig} from './types/el-maker/types' */

/** The selected options of a <select> (the host), skipping placeholders (`value=""`). */
const selected = '?.querySelectorAll?.option:checked:not([value=""])';

/**
 * The parts a config is built from. Each one corresponds to an overridable method of
 * `ChipAwayElement` (see the README), noted beside it.
 */
export const parts = {
    /** `getLegendText(select)`: a ` ?=` chain, tried in order until one gives non-empty text. */
    legendText: [
        '?.closest?.label?.querySelector?.:scope > :not(select)?.textContent', // <label><span>Colors</span><select>
        '||', '?.closest?.label?.firstChild?.nodeValue?.trim|',               // <label>Colors <select>
        '||', '?.closest?.label?.lastChild?.nodeValue?.trim|',                // <label><select> Colors</label>
        '||', '?.labels?.0?.textContent?.trim|',                              // <label for=…>
        '||', '?.ariaLabel',                                                  // aria-label on the select
        '||', '?.id',
    ],

    /** `joinLabel(selectedOptions)`: `"<n> Selected"` past `maxJoin`, otherwise the option texts joined. */
    joinedLabel: [
        [`${selected}?.length`, '>', '$root?.maxJoin'],
        { join: [`${selected}?.length`, ' Selected'] },
        `${selected}?.joined`,
    ],

    /**
     * A delete button, rendered unless `readonly`. `attrs` is a pattern for the button; `onClick` is
     * merged into its click binding (its host is the element's value: an <option> or a <select>).
     * @param {Record<string, any>} attrs
     * @param {Record<string, any>} onClick
     */
    removeButton: (attrs, onClick) => choose('!!$root?.readonly', {
        false: tree`<button type=button ${attrs} @click=${{
            get: { stopPropagation: true },
            ...onClick,
        }}></button>`,
    }),

    /**
     * `createChipElement(option, removable)`: its ✕ deselects that option, then fires `change` on its <select>.
     */
    removeOption: () => parts.removeButton(
        { 'part :=': 'chip-remove-option-trigger', 'aria-label :=': 'Remove' },
        { '?.selected': false, dispatch: { type: 'change', eventCtr: 'Event', composed: false, at: '?.closest?.select' } },
    ),

    /**
     * The "clear all" trigger, and the joined chip's ✕: deselects everything in the <select> (the host).
     * @param {Record<string, any>} attrs
     */
    clearSelect: (attrs) => parts.removeButton(
        attrs,
        { '?.selectedIndex': -1, dispatch: { type: 'change', eventCtr: 'Event', composed: false, at: '?.' } },
    ),

    /**
     * `createChip(labelText, removable)`: the chip shell. `label` is the label <span>'s pattern.
     * @param {any} label
     * @param {any} button
     */
    chip: (label, button) => tree`
        <div class=chip part=chip-remove-option-container>
            <span ${label}></span>
            ${button}
        </div>`,

    /** `renderSelectChips(select, removable)`: one chip per selected option. */
    optionChips: () => tree`
        <div style="display:contents" ${each(selected, { key: '?.' })}>
            ${parts.chip({ textContent: '?.textContent' }, parts.removeOption())}
        </div>`,

    /** `renderJoinedChip(select, removable)`: one chip for the whole <select>. */
    joinedChip: () => tree`
        <div style="display:contents">
            ${parts.chip(
                { 'textContent ?=': parts.joinedLabel },
                parts.clearSelect({ 'part :=': 'chip-remove-option-trigger', 'aria-label :=': 'Remove all' }),
            )}
        </div>`,

    /** `createChipsContainer(select, removable)`: the fieldset and its legend. */
    fieldset: () => tree`
        <fieldset>
            <legend>
                <span ${{ 'textContent ?=': parts.legendText }}></span>
                ${parts.clearSelect({ 'class :=': 'clear-all-trigger', 'aria-label :=': 'Clear all' })}
            </legend>
            ${choose('!!$root?.join', { true: parts.joinedChip(), false: parts.optionChips() })}
        </fieldset>`,

    /** `renderSelect(select)`: a fieldset per referenced <select> that has something selected. */
    selects: () => tree`
        <div style="display:contents" ${each('?.', { key: '?.id' })}>
            ${choose(`!!${selected.replace('querySelectorAll', 'querySelector')}`, { true: parts.fieldset() })}
        </div>`,
};

/**
 * Assemble the el-maker config from (possibly replaced) parts.
 *
 * Note: the parts that are functions call each other through the `parts` object *exported here*, so
 * replacing, say, `chip` affects `optionChips` only if you also pass the replacement there. Replacing
 * the data parts (`legendText`, `joinedLabel`) always works.
 * @param {typeof parts} p
 * @returns {ElMakerConfig<any>}
 */
export function build(p = parts) {
    const saved = { ...parts };
    Object.assign(parts, p); // so the parts that call each other pick up replacements
    try {
        return {
            assignFeatures: {
                truthSourcer: {
                    customData: { observedAttributes: ['for'] },
                },
                idRefs: {},
                roundabout: {
                    customData: {
                        raConfig: {
                            assignOptions: {
                                withMethods: ['querySelectorAll', 'querySelector', 'closest', 'trim'],
                                // Data pipes (JSON): roundabout loads assign-gingerly's dataPipes.js for these
                                pipes: {
                                    texts: { pluck: '?.textContent' },
                                    comma: { use: 'join', args: [', '] },
                                    joined: { chain: ['texts', 'comma'] },
                                },
                            },
                            merges: [
                                // `for` (split) → live elements, via the idRefs feature, which also waits for late ones
                                {
                                    ifKeyIn: ['splitFor'],
                                    assign: {
                                        '?.idRefs?.searchFor': '?.splitFor',
                                        '?. +=': { on: 'id-referencer:resolved', get: { key: 'resolved' }, '?.rev +=': 1 },
                                    },
                                },
                                { ifKeyIn: ['splitFor', 'rev'], assign: { selects: '?.idRefs?.elements' } },
                                // Re-render when a referenced <select> changes. keyScope: several chip-aways may share a select
                                {
                                    ifKeyIn: ['selects'],
                                    assign: {
                                        '?.selects?.@each +=': {
                                            on: 'change',
                                            get: { key: 'chip-away', keyScope: 'host' },
                                            '?.rev +=': 1,
                                        },
                                    },
                                },
                                // Render
                                {
                                    ifAllOf: ['selects'],
                                    ifKeyIn: ['selects', 'rev', 'join', 'readonly', 'maxJoin'],
                                    assign: {
                                        '?. =>': { do: 'builtIns.tree', map: { selects: p.selects() } },
                                    },
                                },
                            ],
                            defaultPropVals: { rev: 0 },
                        },
                    },
                    withAttrs: {
                        for: 'for',
                        _for: {
                            mapsTo: 'splitFor',
                            parser: 'splitter',
                            parserOptions: { delimiter: ' ' },
                            sourceOfTruth: true,
                        },
                        join: 'join',
                        _join: { instanceOf: 'Boolean', valIfNull: false },
                        readonly: 'readonly',
                        _readonly: { instanceOf: 'Boolean', valIfNull: false },
                        maxJoin: 'max-join',
                        _maxJoin: { instanceOf: 'Number' },
                    },
                },
            },
        };
    } finally {
        Object.assign(parts, saved);
    }
}

export function render(p = parts) {
    return JSON.stringify(build(p), null, 4);
}

// Write el-maker.json only when run directly, not when imported
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const outputFile = fileURLToPath(import.meta.url).replace(/\.mjs$/, '.json');
    writeFileSync(outputFile, render(), 'utf8');
}

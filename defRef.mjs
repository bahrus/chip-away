// @ts-check

/** @import {RAConfig} from './types/roundabout/types' */
/** @import {AP, Actions} from './types/chip-away/types' */
/** @import {AttrPatterns} from './types/assign-gingerly/types' */

/**
 * @type {{ [K in keyof AP]: K }}
 */
const props = {
    for: 'for',
    splitFor: 'splitFor'
};

/**
 * `for` (space-separated ids) is parsed to `splitFor` (string[]) by the
 * `splitter` parser below; the compact then calls `hydrate`, which hands
 * `splitFor` to the `idRefs` feature for id -> live element resolution.
 * @type {RAConfig<AP, Actions, AP>}
 */
const raConfig = {
    compacts: {
        when_splitFor_changes_call_hydrate: 0,
    },
};

/**
 * @type {AttrPatterns<AP>}
 */
const withAttrs = {
    for: 'for',
    _for: {
        mapsTo: props.splitFor,
        parser: 'splitter',
        parserOptions: {
            delimiter: ' '
        },
        sourceOfTruth: true,
    }
};

export const cef = {
    features: {
        roundabout: {
            customData: {
                raConfig
            },
            withAttrs
        },
        truthSourcer: {
            customData: {
                observedAttributes: ['for']
            }
        }
    }
};

export function render() {
    return JSON.stringify(cef, null, 4);
}

console.log(render());

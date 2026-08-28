// @ts-check

/** @import {RAConfig} from './types/roundabout/types' */
/** @import {AP} from './types/chip-away/types' */
/** @import {AttrPatterns} from './types/assign-gingerly/types' */

/**
 * @type {{ [K in keyof AP]: K }}
 */
const props = {
    for: 'for',
    splitFor: 'splitFor'
};

/**
 * @type {RAConfig<AP, AP, AP>}
 */
const raConfig = {
    propagate: [props.for]
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
        }
    }
};

export const cef = {
    features: {
        truthSourcer: {
            customData: {
                observedAttributes: ['for']
            }
        },
        roundabout: {
            customData: {
                raConfig
            },
            withAttrs
        }
    }
};

export function render() {
    return JSON.stringify(cef, null, 4);
}

console.log(render());

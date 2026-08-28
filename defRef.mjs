// @ts-check

/** @import {RAConfig} from './types/roundabout/types' */
/** @import {AP, Actions} from './types/chip-away/types' */

/**
 * @type {{ [K in keyof AP]: K }}
 */
const props = {
    for: 'for',
    splitFor: 'splitFor'
};

/**
 * Chip rendering is no longer driven by roundabout — the `idRefs` feature
 * resolves the `for` attribute to live <select> elements and fires
 * `id-referencer:resolved`, which the element listens for directly.
 * @type {RAConfig<AP, Actions, AP>}
 */
const raConfig = {};

export const cef = {
    features: {
        roundabout: {
            customData: {
                raConfig
            }
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

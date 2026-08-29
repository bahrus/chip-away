// @ts-check

/** @import {RAConfig} from './types/roundabout/types' */
/** @import {AP, Actions} from './types/chip-away/types' */
/** @import {AttrPatterns} from './types/assign-gingerly/types' */

/**
 * @type {{ [K in keyof AP]: K }}
 */
const props = {
    for: 'for',
    splitFor: 'splitFor',
    join: 'join',
    readonly: 'readonly',
    maxJoin: 'maxJoin'
};

/**
 * `for` (space-separated ids) is parsed to `splitFor` (string[]) by the
 * `splitter` parser below; the boolean `join` / `readonly` and numeric
 * `max-join` attributes are parsed once (at spawn) to their properties. Any of
 * these compacts calls `hydrate`, which hands `splitFor` to the `idRefs`
 * feature for id -> live element resolution and re-renders: `join` picks one
 * comma-joined summary chip vs. one chip per option, `readonly` drops every
 * remove (✕) affordance, and `maxJoin` (join only) switches the summary label
 * to "<n> Selected" once the selected count exceeds it.
 *
 * `join` / `readonly` / `maxJoin` are plain config, not `sourceOfTruth`
 * attributes: the attribute seeds the initial value, and thereafter the
 * property is authoritative.
 * @type {RAConfig<AP, Actions, AP>}
 */
const raConfig = {
    compacts: {
        when_splitFor_changes_call_hydrate: 0,
        when_join_changes_call_hydrate: 0,
        when_readonly_changes_call_hydrate: 0,
        when_maxJoin_changes_call_hydrate: 0,
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
    },
    join: 'join',
    _join: {
        instanceOf: 'Boolean',
        valIfNull: false,
    },
    readonly: 'readonly',
    _readonly: {
        instanceOf: 'Boolean',
        valIfNull: false,
    },
    maxJoin: 'max-join',
    _maxJoin: {
        instanceOf: 'Number',
        // no valIfNull: absent attribute leaves `maxJoin` undefined (no limit)
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

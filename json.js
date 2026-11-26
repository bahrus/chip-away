// @ts-check
/**
 * The JSON-only <chip-away> (from el-maker.json), as a module, for pages without be-hive.
 *
 *     import 'chip-away/json.js';
 *
 * This file only loads the config and defines the element. All of chip-away's own behavior is in
 * el-maker.json (generated from el-maker.mjs). For the class-based <chip-away>, use index.js
 * instead. A page loads one or the other.
 *
 * Without any script of chip-away's own, see demo/json.html: a `cede` script in the first <chip-away>.
 */
import 'el-maker/def.js';
import { defineWithFeatures } from 'assign-gingerly/defineWithFeatures.js';
import config from './el-maker.json' with { type: 'json' };

if (!customElements.get('chip-away')) {
    await defineWithFeatures('chip-away', 'el-maker', config);
}

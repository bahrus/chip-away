// @ts-check
import { ElementMaker } from 'el-maker/ElementMaker.js';
import { ChipAwayFeature } from './ChipAwayFeature.js';

/** @import {AP, RunTimeProps} from './types/chip-away/types'; */

/**
 * @extends {ElementMaker<AP, AP>}
 */
export class ChipAwayElement extends ElementMaker {
    static supportedFeatures = {
        ...ElementMaker.supportedFeatures,
        chipAway: {
            fallbackSpawn: ChipAwayFeature,
            callbackForwarding: ['connectedCallback', 'disconnectedCallback', 'attributeChangedCallback']
        }
    };
}

// @ts-check
import 'assign-gingerly/assignFeatures.js';

/**
 * Resolves the feature spawns for ChipAwayElement and assigns them with
 * the element-specific configuration from defRef.json.
 * @param {typeof import('./chip-away-element.js').ChipAwayElement} ElementClass
 * @param {any} cfg
 */
export async function wireFeatures(ElementClass, cfg) {
    const truthSourcerConfig = cfg.features?.truthSourcer || {};
    const roundaboutConfig = cfg.features?.roundabout || {};

    await customElements.assignFeatures(ElementClass, {
        truthSourcer: {
            customData: truthSourcerConfig.customData,
            callbackForwarding: ['connectedCallback', 'attributeChangedCallback']
        },
        faceUp: {
            callbackForwarding: [
                'connectedCallback',
                'disconnectedCallback',
                'formDisabledCallback',
                'formResetCallback',
                'formStateRestoreCallback'
            ]
        },
        roundabout: {
            customData: roundaboutConfig.customData,
            withAttrs: roundaboutConfig.withAttrs,
            callbackForwarding: ['connectedCallback']
        },
        idRefs: {
            customData: { searchFor: ['for'] },
            callbackForwarding: ['connectedCallback', 'disconnectedCallback']
        }
    });
}

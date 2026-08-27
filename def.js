// @ts-check
import { ChipAwayElement } from './chip-away-element.js';
import { wireFeatures } from './wireFeatures.js';
import defRef from './defRef.json' with { type: 'json' };

await wireFeatures(ChipAwayElement, defRef);
customElements.define('chip-away', ChipAwayElement);

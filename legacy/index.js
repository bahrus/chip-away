import { ChipAway } from './chip-away.js';
import { def } from 'trans-render/lib/def.js';

def('chip-away', ChipAway, async () => {
    const module = await import('../default.css', {
        assert: { type: 'css' },
        with: { type: 'css' }
    });
    return module;
});

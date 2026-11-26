// @ts-check
/**
 * Run every spec against both versions of <chip-away>, unchanged.
 *
 * The test pages import `../index.js` (the class). In a project whose name ends in `-json`
 * (see playwright.config.ts), that request is answered with `json.js` instead, which defines
 * <chip-away> from el-maker.json.
 */
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
    page: async ({ page }, use, testInfo) => {
        if (testInfo.project.name.endsWith('-json')) {
            await page.route(
                url => url.pathname === '/index.js',
                route => route.fulfill({ status: 302, headers: { location: '/json.js' } }),
            );
        }
        await use(page);
    },
});

export { expect };

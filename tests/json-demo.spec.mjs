import { test, expect } from './fixtures.mjs';

// demo/json.html defines <chip-away> from a cede script, with no script of chip-away's own,
// so it's the JSON version in every project. It runs once, in the -json project.
test('cede demo: legends, join, and a shared select', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-json'), 'the cede demo is JSON-only');
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./demo/json.html');
    const first = page.locator('#div chip-away');
    // select2 has nothing selected (its placeholder doesn't count), so one fieldset
    await expect(first.locator('fieldset')).toHaveCount(1);
    await expect(first.locator('legend span')).toHaveText(['Select 1']);
    await expect(page.locator('chip-away[join] .chip span')).toHaveText(['Option 1']);

    // select2's label is bare text, not a <span>
    await page.selectOption('#select2', 'option4');
    await expect(first.locator('legend span')).toHaveText(['Select 1', 'Select 2']);
    expect(errors).toEqual([]);
});

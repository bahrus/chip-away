import { test, expect } from './fixtures.mjs';

// demo/json.html defines <chip-away> from a cede script, with no script of chip-away's own,
// so it's the JSON version in every project. It runs once, in the -json project.
test('cede demo: legends, join, and a shared select', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-json'), 'the cede demo is JSON-only');
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./demo/json.html');
    const first = page.locator('#div chip-away');
    const joined = page.locator('chip-away[join]');

    // Each instance renders its own fieldset once: no duplicates within an instance.
    // select2 has nothing selected (its placeholder doesn't count), so one fieldset each.
    await expect(first.locator('fieldset')).toHaveCount(1);
    await expect(joined.locator('fieldset')).toHaveCount(1);
    await expect(first.locator('legend span')).toHaveText(['Select 1']);
    await expect(joined.locator('.chip span')).toHaveText(['Option 1']);

    // Two options: the first instance shows two chips, the joined one a single chip
    await page.selectOption('#select1', ['option1', 'option2']);
    await expect(first.locator('.chip span')).toHaveText(['Option 1', 'Option 2']);
    await expect(joined.locator('.chip span')).toHaveText(['Option 1, Option 2']);

    // select2's label is bare text, not a <span>
    await page.selectOption('#select2', 'option4');
    await expect(first.locator('legend span')).toHaveText(['Select 1', 'Select 2']);
    await expect(first.locator('fieldset')).toHaveCount(2);
    expect(errors).toEqual([]);
});

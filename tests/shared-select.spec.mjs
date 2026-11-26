import { test, expect } from './fixtures.mjs';

test("a chip's delete button fires change on its select", async ({ page }) => {
    await page.goto('./demo/dev.html');
    await expect(page.locator('chip-away .chip')).toHaveCount(1);
    await page.evaluate(() => {
        window.changes = [];
        document.getElementById('select1').addEventListener('change', e => changes.push(e.constructor.name));
    });
    await page.locator('chip-away .chip button').first().click();
    await expect(page.locator('chip-away .chip')).toHaveCount(0);
    expect(await page.evaluate(() => window.changes)).toEqual(['Event']);
});

test('two chip-aways on one select both update', async ({ page }) => {
    await page.goto('./demo/dev.html');
    await expect(page.locator('#div .chip')).toHaveCount(1);
    await page.evaluate(() => {
        const second = document.createElement('chip-away');
        second.id = 'second';
        second.setAttribute('for', 'select1');
        document.body.append(second);
    });
    await expect(page.locator('#second .chip')).toHaveCount(1);
    await page.evaluate(() => {
        const select1 = document.getElementById('select1');
        for (const option of select1.options) option.selected = !!option.value;
        select1.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#div .chip')).toHaveCount(2);
    await expect(page.locator('#second .chip')).toHaveCount(2);
});

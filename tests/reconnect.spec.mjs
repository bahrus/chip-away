import { test, expect } from '@playwright/test';

test('reconnect - chips come back after remove + re-add', async ({ page }) => {
    await page.goto('./demo/dev.html');
    await page.waitForTimeout(1000);

    // Initial: option1 selected in select1 -> 1 chip, 1 fieldset
    await expect(page.locator('chip-away .chip')).toHaveCount(1);
    await expect(page.locator('chip-away fieldset')).toHaveCount(1);

    await page.getByRole('button', { name: 'remove', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'add', exact: true }).click();
    await page.waitForTimeout(500);

    // After re-add: chips should be back
    await expect(page.locator('chip-away .chip')).toHaveCount(1);
    await expect(page.locator('chip-away fieldset')).toHaveCount(1);
});

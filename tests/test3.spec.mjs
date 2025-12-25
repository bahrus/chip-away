import { test, expect } from '@playwright/test';

test('test3 - Clicking chip button removes the chip', async ({ page }) => {
    await page.goto('./tests/Example3.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

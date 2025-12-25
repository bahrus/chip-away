import { test, expect } from '@playwright/test';

test('test5 - Multiple select elements render separate fieldsets', async ({ page }) => {
    await page.goto('./tests/Example5.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

import { test, expect } from '@playwright/test';

test('test4 - Clear All button removes all chips', async ({ page }) => {
    await page.goto('./tests/Example4.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

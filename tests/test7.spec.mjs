import { test, expect } from '@playwright/test';

test('test7 - join collapses a select to one comma-delimited chip', async ({ page }) => {
    await page.goto('./tests/Example7.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

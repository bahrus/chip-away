import { test, expect } from '@playwright/test';

test('test10 - max-join collapses the join label to "<n> Selected" past the limit', async ({ page }) => {
    await page.goto('./tests/Example10.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

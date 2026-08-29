import { test, expect } from '@playwright/test';

test('test8 - toggling the join property at runtime switches rendering', async ({ page }) => {
    await page.goto('./tests/Example8.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

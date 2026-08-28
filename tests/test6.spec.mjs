import { test, expect } from '@playwright/test';

test('test6 - Referenced select added after connect still renders chips', async ({ page }) => {
    await page.goto('./tests/Example6.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

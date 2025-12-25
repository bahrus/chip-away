import { test, expect } from '@playwright/test';

test('test2 - Multiple selected options render as chips', async ({ page }) => {
    await page.goto('./tests/Example2.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

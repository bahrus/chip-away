import { test, expect } from '@playwright/test';

test('test1 - Basic chip rendering', async ({ page }) => {
    await page.goto('/tests/Example1.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

import { test, expect } from '@playwright/test';

test('test9 - readonly hides remove affordances; clearing it restores them', async ({ page }) => {
    await page.goto('./tests/Example9.html');
    // wait for component to render
    await page.waitForTimeout(2000);
    const target = page.locator('#target');
    await expect(target).toHaveAttribute('mark', 'good');
});

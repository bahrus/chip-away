# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test2.spec.mjs >> test2 - Multiple selected options render as chips
- Location: tests\test2.spec.mjs:3:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('#target')
Expected: "good"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('#target')
    14 × locator resolved to <div id="target"></div>
       - unexpected value "null"

```

```yaml
- text: "Select Multiple:"
- listbox "Select Multiple:":
  - option "Option 1" [selected]
  - option "Option 2" [selected]
  - option "Option 3"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('test2 - Multiple selected options render as chips', async ({ page }) => {
  4  |     await page.goto('./tests/Example2.html');
  5  |     // wait for component to render
  6  |     await page.waitForTimeout(2000);
  7  |     const target = page.locator('#target');
> 8  |     await expect(target).toHaveAttribute('mark', 'good');
     |                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  9  | });
  10 | 
```
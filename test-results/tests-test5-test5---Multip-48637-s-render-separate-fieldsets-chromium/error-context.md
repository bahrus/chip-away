# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\test5.spec.mjs >> test5 - Multiple select elements render separate fieldsets
- Location: tests\test5.spec.mjs:3:1

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
- text: "Select 1:"
- listbox "Select 1:":
  - option "Option 1" [selected]
  - option "Option 2"
- text: "Select 2:"
- listbox "Select 2:":
  - option "Option A" [selected]
  - option "Option B"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('test5 - Multiple select elements render separate fieldsets', async ({ page }) => {
  4  |     await page.goto('./tests/Example5.html');
  5  |     // wait for component to render
  6  |     await page.waitForTimeout(2000);
  7  |     const target = page.locator('#target');
> 8  |     await expect(target).toHaveAttribute('mark', 'good');
     |                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  9  | });
  10 | 
```
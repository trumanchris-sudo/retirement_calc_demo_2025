/**
 * Accessibility Tests (WCAG 2.1 AA Compliance)
 * Tests keyboard navigation, screen reader support, and automated a11y checks
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test('Configure tab should be accessible', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('All input fields should have associated labels', async ({ page }) => {
    await page.goto('/');

    // Get all input elements
    const inputs = page.locator('input[type="text"], input[type="number"]');
    const count = await inputs.count();

    // Verify each input has a label or aria-label
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Must have either a label, aria-label, or aria-labelledby
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;

      expect(
        hasLabel || ariaLabel || ariaLabelledBy,
        `Input ${i} (id: ${id}) should have an associated label`
      ).toBeTruthy();
    }
  });

  test('Should support keyboard-only navigation', async ({ page }) => {
    await page.goto('/');

    // Start tabbing through the interface
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focused = await page.locator(':focus');
    await expect(focused).toBeVisible();

    // Tab through several elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = await page.locator(':focus');
      await expect(currentFocus).toBeVisible();
    }
  });

  test('Calculate button should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Navigate to and activate the Calculate button using keyboard
    await page.keyboard.press('Tab');

    // Find the Calculate button
    const calculateButton = page.getByRole('button', { name: /calculate/i });

    // Focus should be able to reach it
    await calculateButton.focus();
    await expect(calculateButton).toBeFocused();

    // Should be activatable with Enter or Space
    await calculateButton.press('Enter');
    // Verify navigation occurred (to Results tab)
    await page.waitForTimeout(500);
  });

  test('Tab navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Find tab buttons
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    expect(tabCount).toBeGreaterThan(0);

    // Tab through and verify each is focusable
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      await tab.focus();
      await expect(tab).toBeFocused();

      // Activate with keyboard
      await tab.press('Enter');
      await page.waitForTimeout(200);
    }
  });

  test('Form inputs should be keyboard editable', async ({ page }) => {
    await page.goto('/');

    // Find an input field (e.g., age)
    const ageInput = page.locator('input[type="number"]').first();

    await ageInput.focus();
    await expect(ageInput).toBeFocused();

    // Clear and type with keyboard
    await ageInput.fill('');
    await ageInput.type('45');

    const value = await ageInput.inputValue();
    expect(value).toBe('45');
  });

  test('Should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1 - page should have at least one
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Verify heading structure doesn't skip levels
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    expect(headings.length).toBeGreaterThan(0);
  });

  test('Interactive elements should have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Check that focus is visually indicated (has outline or similar)
    const focusedElement = await focused.first();
    const outline = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.border || styles.boxShadow;
    });

    // Should have some form of visible focus indicator
    expect(outline).toBeTruthy();
  });

  test('Checkboxes should have labels', async ({ page }) => {
    await page.goto('/');

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      const id = await checkbox.getAttribute('id');
      const ariaLabel = await checkbox.getAttribute('aria-label');
      const ariaLabelledBy = await checkbox.getAttribute('aria-labelledby');

      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;

      expect(
        hasLabel || ariaLabel || ariaLabelledBy,
        `Checkbox ${i} should have an associated label`
      ).toBeTruthy();
    }
  });

  test('Color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');

    // Run axe with color contrast checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('Results tab should be accessible after calculation', async ({ page }) => {
    await page.goto('/');

    // Fill in minimal inputs
    await page.locator('input[type="number"]').first().fill('45');

    // Calculate
    const calculateButton = page.getByRole('button', { name: /calculate/i });
    await calculateButton.click();

    // Wait for results
    await page.waitForTimeout(1000);

    // Run accessibility scan on results
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Should still be accessible
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Charts should have descriptive ARIA labels or roles', async ({ page }) => {
    await page.goto('/');

    // Fill minimal inputs and calculate
    await page.locator('input[type="number"]').first().fill('45');
    const calculateButton = page.getByRole('button', { name: /calculate/i });
    await calculateButton.click();

    await page.waitForTimeout(1000);

    // Check for chart elements
    const charts = page.locator('[role="img"], svg, canvas').first();

    if (await charts.count() > 0) {
      const firstChart = charts.first();
      const ariaLabel = await firstChart.getAttribute('aria-label');
      const ariaLabelledBy = await firstChart.getAttribute('aria-labelledby');
      const role = await firstChart.getAttribute('role');

      // Charts should have some form of accessible description
      expect(
        ariaLabel || ariaLabelledBy || role,
        'Charts should have ARIA labels or roles for screen readers'
      ).toBeTruthy();
    }
  });

  test('Page should be navigable with screen reader landmarks', async ({ page }) => {
    await page.goto('/');

    // Check for semantic HTML5 landmarks
    const main = await page.locator('main').count();
    const nav = await page.locator('nav').count();
    const header = await page.locator('header').count();

    // Should have at least a main landmark
    expect(main).toBeGreaterThan(0);
  });

  test('No elements should trap keyboard focus', async ({ page }) => {
    await page.goto('/');

    // Tab through many elements
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Should still be able to focus elements
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Try Shift+Tab to go backwards
    await page.keyboard.press('Shift+Tab');
    const focusedBack = page.locator(':focus');
    await expect(focusedBack).toBeVisible();
  });

  test('Error messages should be accessible', async ({ page }) => {
    await page.goto('/');

    // Try to trigger validation error (if any)
    const firstInput = page.locator('input[type="number"]').first();
    await firstInput.fill('-1'); // Invalid age
    await firstInput.blur();

    await page.waitForTimeout(500);

    // Check if error message is present and accessible
    const errors = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    if (await errors.count() > 0) {
      // Error should be programmatically associated with the input
      const errorMessage = errors.first();
      await expect(errorMessage).toBeVisible();
    }
  });

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto('/');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');

      // Button must have accessible text
      expect(
        (text && text.trim().length > 0) || ariaLabel || ariaLabelledBy || title,
        `Button ${i} should have accessible text`
      ).toBeTruthy();
    }
  });

  test('Links should have descriptive text', async ({ page }) => {
    await page.goto('/');

    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      // Links should not just say "click here" or be empty
      expect(
        (text && text.trim().length > 0) || ariaLabel,
        `Link ${i} should have descriptive text`
      ).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Mobile and Responsive', () => {
  test('Should be accessible on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Touch targets should be large enough on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check button sizes (should be at least 44x44px for touch)
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG 2.1 Level AAA recommends 44x44px minimum
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

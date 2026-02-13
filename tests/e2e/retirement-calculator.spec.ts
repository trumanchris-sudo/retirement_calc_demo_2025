import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Retirement Calculator
 *
 * These tests cover the critical user flows identified in QA checklist:
 * 1. Configure → Calculate → Auto-navigate to Results
 * 2. Results tab shows accumulation chart immediately
 * 3. Lifetime Wealth Flow is visible without clicking
 * 4. Stress Tests tab → Run comparison → Chart appears
 * 5. Legacy Planning shows fields immediately (no checkbox)
 * 6. Social Security in Advanced Settings (default ON)
 * 7. Math tab accessible after calculation
 * 8. All-in-One view shows everything correctly
 */

test.describe('Retirement Calculator - Critical User Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the calculator
    await page.goto('/');

    // Wait for the page to be fully loaded
    await expect(page.getByRole('heading', { name: /retirement calculator/i })).toBeVisible();
  });

  test('Flow 1: Configure → Calculate → Auto-navigate to Results', async ({ page }) => {
    // Should start on Configure tab
    const configureTab = page.getByRole('tab', { name: /configure/i });
    await expect(configureTab).toBeVisible();

    // Fill in basic test data
    await page.fill('input[name="age1"], input[placeholder*="Current Age"]', '45');
    await page.fill('input[name="retirementAge"], input[placeholder*="Retirement Age"]', '65');
    await page.fill('input[name="preRetSalary"], input[placeholder*="Pre-Retirement Salary"]', '100000');

    // Enter some savings
    await page.fill('input[name="taxableBalance"], input[placeholder*="Taxable"]', '50000');
    await page.fill('input[name="pretaxBalance"], input[placeholder*="Pre-tax"]', '100000');
    await page.fill('input[name="rothBalance"], input[placeholder*="Post-tax"]', '50000');

    // Click Calculate button
    const calculateButton = page.getByRole('button', { name: /calculate/i });
    await calculateButton.click();

    // Should auto-navigate to Results tab
    await expect(page.getByRole('tab', { name: /results/i })).toHaveAttribute('aria-selected', 'true');

    // Should see results
    await expect(page.getByText(/end of life balance/i)).toBeVisible({ timeout: 10000 });
  });

  test('Flow 2: Results tab shows accumulation chart immediately', async ({ page }) => {
    // First, run a calculation
    await fillBasicInputs(page);
    await page.getByRole('button', { name: /calculate/i }).click();

    // Wait for Results tab
    await expect(page.getByRole('tab', { name: /results/i })).toHaveAttribute('aria-selected', 'true');

    // Check for accumulation chart (should be visible immediately, not in accordion)
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 5000 });

    // Should NOT see comparison chart in Results tab
    const resultsPanel = page.locator('[role="tabpanel"]:visible');
    const chartCount = await resultsPanel.locator('.recharts-wrapper').count();

    // Results tab should have 1 chart (accumulation only)
    expect(chartCount).toBe(1);
  });

  test('Flow 3: Lifetime Wealth Flow is visible without clicking', async ({ page }) => {
    // Run a calculation
    await fillBasicInputs(page);
    await page.getByRole('button', { name: /calculate/i }).click();

    // Should be on Results tab
    await expect(page.getByRole('tab', { name: /results/i })).toHaveAttribute('aria-selected', 'true');

    // Look for Lifetime Wealth Flow section (it might be in an accordion, but should be visible)
    const wealthFlowSection = page.getByText(/lifetime wealth flow/i).first();
    await expect(wealthFlowSection).toBeVisible({ timeout: 5000 });
  });

  test('Flow 4: Stress Tests → Run comparison → Chart appears', async ({ page }) => {
    // Run a calculation first
    await fillBasicInputs(page);
    await page.getByRole('button', { name: /calculate/i }).click();

    // Navigate to Stress Tests tab
    const stressTestsTab = page.getByRole('tab', { name: /stress test/i });
    await stressTestsTab.click();
    await expect(stressTestsTab).toHaveAttribute('aria-selected', 'true');

    // Select a scenario (bear market)
    const bearMarketCheckbox = page.getByLabel(/2008.*bear market/i);
    if (await bearMarketCheckbox.isVisible()) {
      await bearMarketCheckbox.check();
    }

    // Click Refresh Comparison button
    const refreshButton = page.getByRole('button', { name: /refresh comparison/i });
    await refreshButton.click();

    // Wait for comparison chart to appear
    await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 });

    // Chart should show multiple lines (baseline + scenarios)
    const lines = page.locator('.recharts-line');
    const lineCount = await lines.count();
    expect(lineCount).toBeGreaterThan(1); // Should have at least baseline + one scenario
  });

  test('Flow 5: Legacy Planning shows fields immediately (no checkbox)', async ({ page }) => {
    // Navigate to Legacy Planning section in Configure tab
    const legacySection = page.getByText(/legacy planning/i).first();
    await expect(legacySection).toBeVisible();

    // Scroll to Legacy Planning section
    await legacySection.scrollIntoViewIfNeeded();

    // Should see legacy configuration fields immediately (no checkbox to enable)
    const legacyAmountInput = page.locator('input[name*="legacy"], input[placeholder*="Legacy Amount"]').first();
    await expect(legacyAmountInput).toBeVisible();

    // Should NOT see an "Enable Legacy Planning" checkbox
    const legacyEnableCheckbox = page.getByLabel(/enable legacy/i);
    expect(await legacyEnableCheckbox.count()).toBe(0);
  });

  test('Flow 6: Social Security in Advanced Settings (default ON)', async ({ page }) => {
    // Look for Social Security section in Advanced Settings
    const advancedSettings = page.getByText(/advanced settings/i);
    if (await advancedSettings.isVisible()) {
      await advancedSettings.click(); // May be in accordion
    }

    // Social Security checkbox should be visible and checked by default
    const ssCheckbox = page.getByLabel(/include social security/i);
    await expect(ssCheckbox).toBeVisible();
    await expect(ssCheckbox).toBeChecked();
  });

  test('Flow 7: Math tab accessible after calculation', async ({ page }) => {
    // Run a calculation
    await fillBasicInputs(page);
    await page.getByRole('button', { name: /calculate/i }).click();

    // Navigate to Math tab
    const mathTab = page.getByRole('tab', { name: /math/i });
    await mathTab.click();
    await expect(mathTab).toHaveAttribute('aria-selected', 'true');

    // Should see detailed calculations
    await expect(page.getByText(/detailed calculation/i)).toBeVisible({ timeout: 5000 });
  });

  test('Flow 8: All-in-One view shows everything correctly', async ({ page }) => {
    // Run a calculation
    await fillBasicInputs(page);
    await page.getByRole('button', { name: /calculate/i }).click();

    // Navigate to All-in-One tab
    const allInOneTab = page.getByRole('tab', { name: /all.*in.*one/i });
    if (await allInOneTab.isVisible()) {
      await allInOneTab.click();
      await expect(allInOneTab).toHaveAttribute('aria-selected', 'true');

      // Should see all sections:
      // 1. Results section
      await expect(page.getByText(/end of life balance/i)).toBeVisible();

      // 2. Charts (both accumulation and potentially comparison)
      const charts = page.locator('.recharts-wrapper');
      expect(await charts.count()).toBeGreaterThan(0);

      // 3. Math section
      await expect(page.getByText(/detailed calculation/i)).toBeVisible();
    }
  });

  test('Flow 9: Married couple scenario with Social Security', async ({ page }) => {
    // Set marital status to married
    const marriedRadio = page.getByLabel(/married/i);
    if (await marriedRadio.isVisible()) {
      await marriedRadio.check();
    }

    // Fill in data for both spouses
    await page.fill('input[name="age1"]', '45');
    await page.fill('input[name="age2"]', '43');
    await page.fill('input[name="retirementAge"]', '65');
    await page.fill('input[name="preRetSalary"]', '100000');

    // Enter savings
    await page.fill('input[name="taxableBalance"]', '50000');
    await page.fill('input[name="pretaxBalance"]', '100000');
    await page.fill('input[name="rothBalance"]', '50000');

    // Ensure Social Security is enabled
    const ssCheckbox = page.getByLabel(/include social security/i);
    if (await ssCheckbox.isVisible() && !await ssCheckbox.isChecked()) {
      await ssCheckbox.check();
    }

    // Calculate
    await page.getByRole('button', { name: /calculate/i }).click();

    // Should see results for married couple
    await expect(page.getByText(/end of life balance/i)).toBeVisible({ timeout: 10000 });
  });

  test('Flow 10: Different return models (Fixed, Random Walk, Truly Random)', async ({ page }) => {
    // Fill basic inputs
    await fillBasicInputs(page);

    // Test Fixed return model
    const returnModelSelect = page.locator('select[name*="retMode"], button:has-text("Return Model")');
    if (await returnModelSelect.isVisible()) {
      // Click to open dropdown if it's a custom select
      if ((await returnModelSelect.getAttribute('role')) === 'button') {
        await returnModelSelect.click();
        await page.getByText(/fixed/i).first().click();
      } else {
        await returnModelSelect.selectOption('fixed');
      }
    }

    // Calculate with fixed returns
    await page.getByRole('button', { name: /calculate/i }).click();
    await expect(page.getByText(/end of life balance/i)).toBeVisible({ timeout: 10000 });

    // Go back to Configure
    await page.getByRole('tab', { name: /configure/i }).click();

    // Switch to Truly Random
    if (await returnModelSelect.isVisible()) {
      if ((await returnModelSelect.getAttribute('role')) === 'button') {
        await returnModelSelect.click();
        await page.getByText(/truly random/i).first().click();
      } else {
        await returnModelSelect.selectOption('trulyRandom');
      }
    }

    // Calculate with truly random returns
    await page.getByRole('button', { name: /calculate/i }).click();

    // Should see P10/P90 options for truly random
    await expect(page.getByText(/P10|P90|percentile/i)).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Helper function to fill in basic calculator inputs
 */
async function fillBasicInputs(page: any) {
  await page.fill('input[name="age1"], input[placeholder*="Current Age"]', '45');
  await page.fill('input[name="retirementAge"], input[placeholder*="Retirement Age"]', '65');
  await page.fill('input[name="preRetSalary"], input[placeholder*="Pre-Retirement Salary"]', '100000');
  await page.fill('input[name="taxableBalance"], input[placeholder*="Taxable"]', '50000');
  await page.fill('input[name="pretaxBalance"], input[placeholder*="Pre-tax"]', '100000');
  await page.fill('input[name="rothBalance"], input[placeholder*="Post-tax"]', '50000');
}

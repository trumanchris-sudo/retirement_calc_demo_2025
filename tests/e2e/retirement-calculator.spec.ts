import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Retirement Calculator
 * Updated: February 2026 — uses admin1 guided setup for default values
 *
 * Onboarding flow: Guided Setup → type "admin1" → Send → "These Look Right" → Calculator
 *
 * After onboarding completes, the app auto-calculates and navigates to Results.
 * Tab aria-labels follow the pattern: "Label: Description" (e.g. "Results: View your projections").
 */

test.describe('Retirement Calculator - Critical User Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Guided Setup → admin1 → confirm defaults
    await page.getByText(/guided setup/i).click();
    await page.waitForTimeout(2000);

    await page.fill('#ai-response-input', 'admin1');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for confirmation button (aria-label="Confirm and complete onboarding") and click it
    const confirmButton = page.getByRole('button', { name: /confirm.*onboarding/i });
    await expect(confirmButton).toBeVisible({ timeout: 15000 });
    await confirmButton.click();

    // Wait for calculator to load — app auto-calculates and navigates to Results
    await expect(page.getByRole('tab', { name: /^Results/i })).toBeVisible({ timeout: 15000 });
  });

  test('Flow 1: Calculator loads with all tabs visible', async ({ page }) => {
    // Use ^Label to avoid matching descriptions that contain similar words
    await expect(page.getByRole('tab', { name: /^All-in-One/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Plan Setup/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Plan Settings/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Results/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Stress Tests/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Legacy Planning/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Math/i })).toBeVisible();
  });

  test('Flow 2: Auto-calculate navigates to Results after onboarding', async ({ page }) => {
    // After admin1 onboarding, the app auto-calculates and lands on Results
    const resultsTab = page.getByRole('tab', { name: /^Results/i });
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  });

  test('Flow 3: Results tab shows accumulation chart', async ({ page }) => {
    // Results should already be active after auto-calculate
    const resultsTab = page.getByRole('tab', { name: /^Results/i });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
  });

  test('Flow 4: Lifetime Wealth Flow is visible', async ({ page }) => {
    const resultsTab = page.getByRole('tab', { name: /^Results/i });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

    // Target the on-screen Wealth Flow block (print version is hidden)
    const wealthFlowBlock = page.locator('.wealth-flow-block');
    await wealthFlowBlock.scrollIntoViewIfNeeded();
    await expect(wealthFlowBlock).toBeVisible({ timeout: 10000 });
  });

  test('Flow 5: Stress Tests tab → Risk Summary appears', async ({ page }) => {
    const stressTestsTab = page.getByRole('tab', { name: /^Stress Tests/i });
    await stressTestsTab.click();
    await expect(stressTestsTab).toHaveAttribute('aria-selected', 'true');

    // Stress Tests tab shows Risk Summary with Monte Carlo results
    await expect(page.getByText(/risk summary/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/success rate/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Flow 6: Legacy Planning tab accessible', async ({ page }) => {
    const legacyTab = page.getByRole('tab', { name: /^Legacy Planning/i });
    await legacyTab.click();
    await expect(legacyTab).toHaveAttribute('aria-selected', 'true');

    const legacyContent = page.getByText(/legacy|estate|inheritance|bequest/i).first();
    await expect(legacyContent).toBeVisible({ timeout: 5000 });
  });

  test('Flow 7: Social Security defaults to ON', async ({ page }) => {
    await page.getByRole('tab', { name: /^Plan Settings/i }).click();

    const ssCheckbox = page.locator('#ssot-includeSS');
    await expect(ssCheckbox).toBeVisible();
    await expect(ssCheckbox).toBeChecked();
  });

  test('Flow 8: Math tab accessible after calculation', async ({ page }) => {
    // Results already calculated after onboarding — Math tab should be enabled
    const mathTab = page.getByRole('tab', { name: /^Math/i });
    await mathTab.click();
    await expect(mathTab).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByText(/calculation|formula|tax table|constant/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Flow 9: All-in-One view shows charts', async ({ page }) => {
    // Results already calculated — All-in-One should show charts
    const allInOneTab = page.getByRole('tab', { name: /^All-in-One/i });
    await allInOneTab.click();
    await expect(allInOneTab).toHaveAttribute('aria-selected', 'true');

    const charts = page.locator('.recharts-wrapper');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });

  test('Flow 10: Default values populated from admin1', async ({ page }) => {
    // Wait for any post-calculation navigation to settle
    await page.waitForTimeout(1500);

    const planSettingsTab = page.getByRole('tab', { name: /^Plan Settings/i });
    await planSettingsTab.click();
    await expect(planSettingsTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

    // Wait for SSOT tab content to fully render
    const ageInput = page.locator('#ssot-age1');
    const incomeInput = page.locator('#ssot-primaryIncome');
    const pretaxInput = page.locator('#ssot-pretaxBalance');

    await expect(ageInput).toBeVisible({ timeout: 5000 });
    await expect(incomeInput).toBeVisible({ timeout: 5000 });

    // Verify defaults were loaded (not empty)
    await expect(ageInput).not.toHaveValue('');
    await expect(incomeInput).not.toHaveValue('');
    await expect(pretaxInput).not.toHaveValue('');
  });
});

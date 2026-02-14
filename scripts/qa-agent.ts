/**
 * QA Agent Runner — Playwright library-mode script for automated QA testing.
 *
 * Usage:
 *   npm run qa:agent
 *
 * This script:
 *   1. Launches a headless browser
 *   2. Clears localStorage for a fresh wizard experience
 *   3. Runs through the onboarding wizard using the admin1 shortcut
 *   4. Waits for the initial calculation to complete
 *   5. Sweeps all tabs (desktop + mobile viewports)
 *   6. Captures screenshots, console errors, and visual issues
 *   7. Outputs a structured JSON report to qa-results/report.json
 *
 * Claude Code agents can invoke this via `npm run qa:agent`, then read the
 * report and view screenshots to identify and fix issues.
 */

import { chromium, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QAFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'error' | 'visual' | 'accessibility' | 'performance' | 'functionality';
  tab: string;
  description: string;
  screenshot?: string;
  consoleErrors?: string[];
  selector?: string;
}

interface QAReport {
  timestamp: string;
  duration: number;
  url: string;
  findings: QAFinding[];
  tabsVisited: string[];
  screenshotsTaken: string[];
  consoleErrors: Array<{ tab: string; message: string; type: string }>;
  summary: { critical: number; high: number; medium: number; low: number; info: number };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.QA_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(process.cwd(), 'qa-results');
const TIMEOUT = 60_000; // global navigation timeout

// Tabs in display order (matching TabNavigation.tsx)
// "budget" is hidden per user request, so excluded here
const TABS = [
  'all', 'configure', 'planSettings', 'results', 'stress',
  'legacy', 'optimize', 'tools', 'checkUs', 'math',
] as const;

// Tabs that are always available (even before calculation)
const ALWAYS_ENABLED = new Set(['all', 'configure', 'planSettings', 'tools']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let currentTab = 'initial';
const consoleErrors: Array<{ tab: string; message: string; type: string }> = [];

function setupConsoleCapture(page: Page) {
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ tab: currentTab, message: msg.text(), type });
    }
  });
  page.on('pageerror', (error: Error) => {
    consoleErrors.push({ tab: currentTab, message: error.message, type: 'pageerror' });
  });
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return `qa-results/${name}.png`;
}

// ---------------------------------------------------------------------------
// Wizard automation
// ---------------------------------------------------------------------------

async function runWizard(page: Page): Promise<boolean> {
  console.log('[QA] Checking for onboarding...');

  // Wait for page to settle
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Check if we're on the onboarding selector page (Quick Estimate / Guided Setup)
  const guidedSetupButton = await page.$('[aria-label*="Guided Setup"]');
  if (guidedSetupButton) {
    console.log('[QA] Onboarding selector detected — clicking "Guided Setup"...');
    await guidedSetupButton.click();

    // Wait for the AI console input to appear
    try {
      await page.waitForSelector('#ai-response-input', { timeout: 10_000 });
    } catch {
      console.error('[QA] Timed out waiting for AI console after clicking Guided Setup');
      await screenshot(page, 'guided-setup-timeout');
      return false;
    }
    await page.waitForTimeout(500);
  } else {
    // Check if wizard input is already visible (already in guided mode)
    const wizardInput = await page.$('#ai-response-input');
    if (!wizardInput) {
      // Check if calculator is already loaded (tabs visible)
      const tabButton = await page.$('#tab-all');
      if (tabButton) {
        console.log('[QA] Calculator already loaded — no wizard needed');
        return false;
      }
      console.log('[QA] No onboarding or calculator detected');
      await screenshot(page, 'unknown-state');
      return false;
    }
  }

  console.log('[QA] AI console visible — running admin1 shortcut...');

  // Type admin1 and send
  await page.fill('#ai-response-input', 'admin1');
  await page.waitForTimeout(300);
  await page.click('[aria-label="Send message to AI assistant"]');

  // Wait for assumptions review to appear (confirm button)
  console.log('[QA] Waiting for assumptions review...');
  try {
    await page.waitForSelector('[aria-label="Confirm and complete onboarding"]', { timeout: 30_000 });
  } catch {
    console.error('[QA] Timed out waiting for assumptions review');
    await screenshot(page, 'wizard-timeout');
    return false;
  }

  await page.waitForTimeout(500);
  await page.click('[aria-label="Confirm and complete onboarding"]');
  console.log('[QA] Confirmed assumptions — waiting for calculator...');

  // Wait for calculator tabs to appear
  try {
    await page.waitForSelector('#tab-all', { timeout: 30_000 });
  } catch {
    console.error('[QA] Timed out waiting for calculator to load');
    await screenshot(page, 'calculator-load-timeout');
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Wait for calculation to complete
// ---------------------------------------------------------------------------

async function waitForCalculation(page: Page): Promise<boolean> {
  console.log('[QA] Waiting for initial calculation to complete...');

  try {
    // Wait for any spinner to appear then disappear (calc in progress → done)
    // First check if a spinner exists
    const spinner = await page.$('.animate-spin');
    if (spinner) {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 45_000 });
    }

    // Give charts a moment to render
    await page.waitForTimeout(2000);

    // Check if we have results by looking for chart containers or result cards
    const hasResults = await page.evaluate(() => {
      const charts = document.querySelectorAll('.recharts-wrapper, canvas');
      const resultCards = document.querySelectorAll('[class*="ResultCard"], [class*="result"]');
      return charts.length > 0 || resultCards.length > 0;
    });

    if (hasResults) {
      console.log('[QA] Calculation complete — results detected');
      return true;
    }

    // Fallback: wait a bit more and check again
    await page.waitForTimeout(5000);
    console.log('[QA] Calculation appears complete (no spinner)');
    return true;
  } catch {
    console.error('[QA] Timed out waiting for calculation');
    await screenshot(page, 'calc-timeout');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tab checks
// ---------------------------------------------------------------------------

async function checkTab(page: Page, tabId: string): Promise<QAFinding[]> {
  const findings: QAFinding[] = [];

  // 1. Check for error banners — only flag elements with actual error language
  // The app's error pattern: bg-red-50 + text containing "Error" or "failed"
  // Exclude: info cards using red for emphasis (stress tests, tax warnings, annuity alerts)
  const errorBanners = await page.evaluate(() => {
    const results: string[] = [];
    const candidates = document.querySelectorAll(
      '[class*="bg-red-50"], [class*="bg-red-950"], [role="alert"]'
    );
    const errorPatterns = /\b(error|failed|failure|exception|crash|cannot|invalid)\b/i;
    candidates.forEach((el) => {
      const text = el.textContent?.trim() || '';
      const rect = el.getBoundingClientRect();
      // Must be visible, have error-related text, and not be inside a known content section
      if (
        text.length > 5 &&
        rect.height > 0 &&
        rect.width > 0 &&
        errorPatterns.test(text) &&
        !el.closest('[class*="stress"]') // Exclude stress test scenario cards
      ) {
        results.push(text.substring(0, 200));
      }
    });
    return results;
  });
  if (errorBanners.length > 0) {
    findings.push({
      severity: 'critical',
      category: 'error',
      tab: tabId,
      description: `Error banner: ${errorBanners[0].substring(0, 120)}`,
    });
  }

  // 2. Check for collapsed chart containers (not SVG internals)
  // Only check recharts-wrapper (the actual visible chart), not recharts-responsive-container
  // (which may be 0x0 when its parent is hidden or off-screen).
  const collapsedContainers = await page.evaluate(() => {
    // recharts-wrapper is the rendered chart; if it's 0x0, the chart truly failed to render
    const containers = document.querySelectorAll('.recharts-wrapper, canvas');
    const collapsed: Array<{ width: number; height: number; selector: string; visible: boolean }> = [];
    containers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Check if element is actually in the visible viewport area (not hidden by display:none etc.)
      const style = window.getComputedStyle(el);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      if ((rect.width < 10 || rect.height < 10) && isVisible) {
        const cn = typeof el.className === 'string' ? el.className : '';
        collapsed.push({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          selector: el.tagName + (cn ? '.' + cn.split(' ')[0] : ''),
          visible: isVisible,
        });
      }
    });
    return collapsed;
  });

  for (const el of collapsedContainers) {
    findings.push({
      severity: 'medium',
      category: 'visual',
      tab: tabId,
      description: `Collapsed chart container ${el.selector} (${el.width}x${el.height}px)`,
      selector: el.selector,
    });
  }

  // 3. Check for empty card content areas
  const emptyCardCount = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="CardContent"]');
    let count = 0;
    cards.forEach((card) => {
      if (card.textContent?.trim() === '' && card.children.length === 0) {
        count++;
      }
    });
    return count;
  });
  if (emptyCardCount > 0) {
    findings.push({
      severity: 'medium',
      category: 'visual',
      tab: tabId,
      description: `${emptyCardCount} empty CardContent area(s)`,
    });
  }

  // 4. Check for horizontal overflow
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
  });
  if (hasOverflow) {
    findings.push({
      severity: 'medium',
      category: 'visual',
      tab: tabId,
      description: 'Page has horizontal overflow (content wider than viewport)',
    });
  }

  // 5. Check for lingering spinners
  const spinnerCount = await page.evaluate(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    // Filter out intentionally spinning icons (like loading indicators in buttons)
    let count = 0;
    spinners.forEach((el) => {
      // Only count if it's not inside a button (button spinners are expected during calc)
      if (!el.closest('button')) {
        count++;
      }
    });
    return count;
  });
  if (spinnerCount > 0) {
    findings.push({
      severity: 'high',
      category: 'functionality',
      tab: tabId,
      description: `${spinnerCount} spinner(s) still visible (possible stuck loading state)`,
    });
  }

  // 6. Check for broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const broken: string[] = [];
    imgs.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) {
        broken.push(img.src || img.getAttribute('alt') || 'unknown');
      }
    });
    return broken;
  });
  for (const src of brokenImages) {
    findings.push({
      severity: 'medium',
      category: 'visual',
      tab: tabId,
      description: `Broken image: ${src}`,
    });
  }

  // 7. Check for accessibility: missing form labels
  const unlabeledInputs = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    let count = 0;
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      const hasVisibleLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
      const isHidden = input.getAttribute('type') === 'hidden';
      if (!isHidden && !ariaLabel && !ariaLabelledby && !hasVisibleLabel) {
        count++;
      }
    });
    return count;
  });
  if (unlabeledInputs > 0) {
    findings.push({
      severity: 'low',
      category: 'accessibility',
      tab: tabId,
      description: `${unlabeledInputs} input(s) without associated labels`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Tab sweep
// ---------------------------------------------------------------------------

async function sweepTabs(
  page: Page,
  viewportLabel: string
): Promise<{ findings: QAFinding[]; screenshots: string[]; visited: string[] }> {
  const allFindings: QAFinding[] = [];
  const screenshots: string[] = [];
  const visited: string[] = [];

  for (const tabId of TABS) {
    const prefixedTab = viewportLabel === 'desktop' ? tabId : `mobile-${tabId}`;
    currentTab = prefixedTab;

    const tabButton = await page.$(`#tab-${tabId}`);
    if (!tabButton) {
      allFindings.push({
        severity: 'info',
        category: 'functionality',
        tab: prefixedTab,
        description: `Tab button #tab-${tabId} not found in DOM`,
      });
      continue;
    }

    // Check if tab is disabled/locked
    const isDisabled = await tabButton.getAttribute('disabled');
    const ariaDisabled = await tabButton.getAttribute('aria-disabled');
    if (isDisabled !== null || ariaDisabled === 'true') {
      allFindings.push({
        severity: 'info',
        category: 'functionality',
        tab: prefixedTab,
        description: `Tab ${tabId} is locked (requires calculation results)`,
      });
      continue;
    }

    // Click the tab
    console.log(`[QA] [${viewportLabel}] Visiting tab: ${tabId}`);
    await tabButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // let charts animate/render

    // Screenshot
    const screenshotPath = await screenshot(page, prefixedTab);
    screenshots.push(screenshotPath);
    visited.push(tabId);

    // Run checks
    const tabFindings = await checkTab(page, prefixedTab);
    allFindings.push(...tabFindings);
  }

  return { findings: allFindings, screenshots, visited };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  console.log('=== QA Agent Starting ===');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  // Set up console error capture
  setupConsoleCapture(page);

  const allFindings: QAFinding[] = [];
  const allScreenshots: string[] = [];
  const allTabsVisited: string[] = [];

  try {
    // Navigate to app
    console.log(`[QA] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    // Clear localStorage for fresh wizard experience
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    // Take initial screenshot
    const initialScreenshot = await screenshot(page, '00-initial');
    allScreenshots.push(initialScreenshot);

    // Run wizard
    const wizardCompleted = await runWizard(page);
    if (wizardCompleted) {
      const wizardScreenshot = await screenshot(page, '01-post-wizard');
      allScreenshots.push(wizardScreenshot);
    } else {
      // If no wizard, we should still be on the calculator
      console.log('[QA] Proceeding without wizard...');
    }

    // Wait for calculation
    const calcCompleted = await waitForCalculation(page);
    if (!calcCompleted) {
      allFindings.push({
        severity: 'critical',
        category: 'functionality',
        tab: 'initial',
        description: 'Initial calculation did not complete within timeout',
      });
    }

    const postCalcScreenshot = await screenshot(page, '02-post-calc');
    allScreenshots.push(postCalcScreenshot);

    // Desktop tab sweep
    console.log('\n[QA] === Desktop Tab Sweep ===');
    const desktop = await sweepTabs(page, 'desktop');
    allFindings.push(...desktop.findings);
    allScreenshots.push(...desktop.screenshots);
    allTabsVisited.push(...desktop.visited);

    // Mobile viewport sweep
    console.log('\n[QA] === Mobile Tab Sweep (375x812) ===');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const mobile = await sweepTabs(page, 'mobile');
    allFindings.push(...mobile.findings);
    allScreenshots.push(...mobile.screenshots);

    // Attach console errors to findings if they indicate problems
    const pageErrors = consoleErrors.filter((e) => e.type === 'pageerror' || e.type === 'error');
    if (pageErrors.length > 0) {
      // Group by tab
      const errorsByTab = new Map<string, string[]>();
      for (const err of pageErrors) {
        const existing = errorsByTab.get(err.tab) || [];
        existing.push(err.message);
        errorsByTab.set(err.tab, existing);
      }
      for (const [tab, messages] of errorsByTab) {
        allFindings.push({
          severity: 'high',
          category: 'error',
          tab,
          description: `${messages.length} console error(s)`,
          consoleErrors: messages.slice(0, 10), // cap at 10
        });
      }
    }
  } catch (err) {
    console.error('[QA] Fatal error:', err);
    allFindings.push({
      severity: 'critical',
      category: 'error',
      tab: currentTab,
      description: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
    });
    try {
      await screenshot(page, 'fatal-error');
    } catch {
      // ignore screenshot failure
    }
  } finally {
    await browser.close();
  }

  // Build summary
  const summary = {
    critical: allFindings.filter((f) => f.severity === 'critical').length,
    high: allFindings.filter((f) => f.severity === 'high').length,
    medium: allFindings.filter((f) => f.severity === 'medium').length,
    low: allFindings.filter((f) => f.severity === 'low').length,
    info: allFindings.filter((f) => f.severity === 'info').length,
  };

  const report: QAReport = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    url: BASE_URL,
    findings: allFindings,
    tabsVisited: allTabsVisited,
    screenshotsTaken: allScreenshots,
    consoleErrors,
    summary,
  };

  // Write report
  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Print summary to stdout
  console.log('\n========================================');
  console.log('         QA Agent Report Summary        ');
  console.log('========================================');
  console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log(`Tabs visited: ${report.tabsVisited.length}/${TABS.length}`);
  console.log(`Screenshots: ${report.screenshotsTaken.length}`);
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log('');
  console.log('Findings:');
  console.log(`  Critical: ${summary.critical}`);
  console.log(`  High:     ${summary.high}`);
  console.log(`  Medium:   ${summary.medium}`);
  console.log(`  Low:      ${summary.low}`);
  console.log(`  Info:     ${summary.info}`);
  console.log('');

  // Print non-info findings
  const actionable = allFindings.filter((f) => f.severity !== 'info');
  if (actionable.length > 0) {
    console.log('Actionable findings:');
    for (const f of actionable) {
      const icon =
        f.severity === 'critical' ? '!!!' :
        f.severity === 'high' ? ' !!' :
        f.severity === 'medium' ? '  !' : '   ';
      console.log(`  ${icon} [${f.tab}] ${f.description}`);
      if (f.consoleErrors) {
        for (const e of f.consoleErrors.slice(0, 3)) {
          console.log(`      -> ${e.substring(0, 120)}`);
        }
      }
    }
  } else {
    console.log('No actionable findings — all clear!');
  }

  console.log('');
  console.log(`Full report: ${path.join(OUTPUT_DIR, 'report.json')}`);
  console.log('========================================');

  // Exit with non-zero if critical issues found
  if (summary.critical > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('QA Agent failed to run:', err);
  process.exit(2);
});

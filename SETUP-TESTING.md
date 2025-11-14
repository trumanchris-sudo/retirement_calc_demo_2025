# Testing Setup Guide

This guide will help you set up and run automated tests for the Retirement Calculator.

---

## Quick Start

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Install Playwright for E2E testing
npm install -D @playwright/test

# 3. Install Playwright browsers
npx playwright install

# 4. Make health check script executable
chmod +x scripts/qa-health-check.sh

# 5. Run health checks
./scripts/qa-health-check.sh

# 6. Run E2E tests
npx playwright test
```

---

## Add to package.json

Add these scripts to your `package.json` for easier testing:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:report": "playwright show-report",
    "qa": "./scripts/qa-health-check.sh",
    "qa:full": "./scripts/qa-health-check.sh && npm test"
  }
}
```

---

## Testing Workflows

### Before Committing
```bash
npm run lint
npm run qa
```

### Before Pull Request
```bash
npm run qa:full
```

### Before Deployment
```bash
npm run build
npm run test
npm start  # Test in production mode
```

---

## Test Files Created

1. **playwright.config.ts** - Playwright configuration
2. **tests/e2e/retirement-calculator.spec.ts** - E2E test suite
3. **scripts/qa-health-check.sh** - Automated health check script
4. **QA-FINDINGS.md** - Comprehensive QA analysis and recommendations

---

## Running Specific Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test retirement-calculator.spec.ts

# Run specific test by name
npx playwright test -g "Configure → Calculate"

# Run in headed mode (see browser)
npx playwright test --headed

# Run in UI mode (interactive)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Reports are saved in:
- `test-results/` - Test artifacts (screenshots, videos)
- `playwright-report/` - HTML report

---

## Continuous Integration

To set up automated testing in GitHub Actions:

1. Create `.github/workflows/qa.yml`:

```yaml
name: QA Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

2. Commit and push to enable automated testing on PRs

---

## Troubleshooting

### Tests failing with "baseURL not reachable"
Make sure dev server is running:
```bash
npm run dev
```

Or let Playwright start it automatically (configured in playwright.config.ts)

### Browser installation issues
```bash
# Reinstall browsers
npx playwright install --force

# Install system dependencies (Linux)
npx playwright install-deps
```

### Health check script permission denied
```bash
chmod +x scripts/qa-health-check.sh
```

### Port 3000 already in use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

---

## Writing New Tests

Add new test files to `tests/e2e/`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Your Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test code here
  });
});
```

See existing tests in `tests/e2e/retirement-calculator.spec.ts` for examples.

---

## Best Practices

1. **Run tests before committing**
   ```bash
   npm run qa && npm test
   ```

2. **Keep tests fast**
   - Use `test.describe.configure({ mode: 'parallel' })` for independent tests
   - Mock external API calls when possible

3. **Use descriptive test names**
   ```typescript
   test('should show error when age is negative', ...)
   ```

4. **Clean up after tests**
   - Reset state between tests
   - Use `test.beforeEach()` for setup

5. **Take screenshots on failure** (already configured)
   - Screenshots saved to `test-results/`

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

**Need Help?**
- Check `QA-FINDINGS.md` for detailed analysis
- Review existing tests in `tests/e2e/`
- Run `npx playwright --help` for CLI options

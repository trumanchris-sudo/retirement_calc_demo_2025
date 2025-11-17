# Production Monitoring Guide

This document describes the monitoring infrastructure for the Retirement Calculator application.

## 🎯 Overview

The application includes comprehensive monitoring for:
- **Error Tracking** - Catch and report runtime errors
- **Performance Monitoring** - Track Core Web Vitals
- **Accessibility Compliance** - WCAG 2.1 AA testing
- **Test Coverage** - 90%+ coverage on core business logic

---

## 📊 Web Vitals Monitoring

### What We Track

**Core Web Vitals:**
- **LCP (Largest Contentful Paint)**: Time to render largest visible element
  - Target: < 2.5s (good), < 4.0s (needs improvement)
- **FID (First Input Delay)**: Time from user interaction to browser response
  - Target: < 100ms (good), < 300ms (needs improvement)
- **CLS (Cumulative Layout Shift)**: Visual stability score
  - Target: < 0.1 (good), < 0.25 (needs improvement)

**Additional Metrics:**
- **TTFB (Time to First Byte)**: Server response time
- **FCP (First Contentful Paint)**: Time to first render
- **INP (Interaction to Next Paint)**: Responsiveness metric

### Implementation

Web Vitals are automatically collected and sent to `/api/analytics`:

```typescript
// In app/layout.tsx or _app.tsx
import { sendToAnalytics } from '@/lib/monitoring/webVitals';

export function reportWebVitals(metric) {
  sendToAnalytics(metric);
}
```

### Viewing Metrics

In development:
- Metrics are logged to console
- Open DevTools → Console to view

In production:
- Metrics are sent to `/api/analytics` endpoint
- Configure integration with analytics service (Google Analytics, Datadog, etc.)

---

## 🚨 Error Tracking

### Error Boundary

The application uses a React Error Boundary to catch rendering errors:

```tsx
import ErrorBoundary from '@/components/monitoring/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Manual Error Tracking

Track errors programmatically:

```typescript
import { trackError, trackCalculationError } from '@/lib/monitoring/errorTracking';

try {
  // Perform calculation
} catch (error) {
  trackCalculationError(error, inputs);
}
```

### Performance Tracking

Measure slow operations:

```typescript
import { measureAsync } from '@/lib/monitoring/errorTracking';

const result = await measureAsync(
  'monte-carlo-simulation',
  () => runSimulation(inputs),
  { iterations: 1000 }
);
```

### Integration with Sentry (Optional)

To enable Sentry error tracking:

1. Install Sentry:
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```

2. Set environment variable:
   ```bash
   # .env.local
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   ```

3. Sentry will automatically integrate with error tracking utilities

---

## ♿ Accessibility Testing

### Automated Tests

Run accessibility tests:
```bash
npm run test:a11y
```

This runs:
- WCAG 2.1 AA compliance checks
- Keyboard navigation tests
- Screen reader compatibility tests
- Color contrast verification
- ARIA label validation

### Manual Testing Checklist

- [ ] Test with screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
- [ ] Navigate entire app using only keyboard (Tab, Enter, Escape)
- [ ] Test with browser zoom at 200%
- [ ] Test with high contrast mode
- [ ] Test with color blindness simulator
- [ ] Verify all interactive elements have visible focus indicators
- [ ] Check that all images have alt text
- [ ] Ensure form inputs have associated labels

### Accessibility Standards

We target **WCAG 2.1 Level AA** compliance:
- ✅ Keyboard accessible
- ✅ Screen reader compatible
- ✅ 4.5:1 color contrast ratio
- ✅ Descriptive link text
- ✅ Proper heading hierarchy
- ✅ Form labels and error messages
- ✅ Touch targets ≥ 44x44px

---

## 🧪 Testing Infrastructure

### Unit Tests

**Coverage:** 90%+ on core calculation logic

Run unit tests:
```bash
npm run test              # Watch mode
npm run test:coverage     # With coverage report
npm run test:ui           # Interactive UI
```

**What's Tested:**
- Tax calculations (federal, state, LTCG, NIIT)
- Retirement engine (accumulation, withdrawal, RMDs)
- Social Security calculations
- Inflation scenarios
- Portfolio stress tests

### E2E Tests

Run end-to-end tests:
```bash
npm run test:e2e
```

**Coverage:**
- User flows (configure → calculate → results)
- Tab navigation
- Scenario comparisons
- Married vs single calculations
- Social Security integration

### All Tests

Run complete test suite:
```bash
npm run test:all
```

This runs:
1. Unit tests with coverage
2. E2E tests
3. Accessibility tests

---

## 📈 CI/CD Pipeline

### GitHub Actions Workflow

Every commit and PR runs:
1. **TypeScript type check** - Ensure type safety
2. **ESLint** - Code quality and style
3. **Unit tests** - 90%+ coverage requirement
4. **Build** - Verify production build succeeds
5. **E2E tests** - Critical user flows
6. **Accessibility tests** - WCAG compliance
7. **Security audit** - Dependency vulnerabilities
8. **Bundle size check** - Monitor bundle growth

### Quality Gates

PRs must pass:
- ✅ All TypeScript checks
- ✅ All linting rules
- ✅ All unit tests
- ✅ All E2E tests
- ✅ All accessibility tests
- ✅ Production build succeeds
- ✅ No high/critical security vulnerabilities

---

## 🔍 Debugging Production Issues

### Error Reports

When an error occurs in production:

1. **Error Boundary** catches it and displays friendly UI
2. **Error tracking** logs details to console (dev) or Sentry (prod)
3. **Context included**: Component, action, user inputs (sanitized)

### Performance Issues

If calculations are slow:

1. Check Web Vitals in browser DevTools
2. Review performance logs in console
3. Look for operations > 1000ms
4. Consider optimizing calculation algorithm

### Accessibility Issues

If users report accessibility problems:

1. Run `npm run test:a11y` locally
2. Test with actual screen reader
3. Check keyboard navigation flow
4. Verify color contrast ratios
5. Review ARIA labels on interactive elements

---

## 📊 Metrics Dashboard (Future)

To set up a metrics dashboard:

### Option 1: Google Analytics + Data Studio
- Free, good for basic metrics
- Shows Web Vitals over time
- Can track user flows

### Option 2: Datadog / New Relic
- Professional APM solution
- Real-time monitoring
- Advanced alerting

### Option 3: Self-hosted (Grafana + Prometheus)
- Full control over data
- Custom dashboards
- No third-party costs

---

## 🎯 Monitoring Checklist

Before deploying to production:

### Required
- [ ] Error Boundary implemented in app root
- [ ] Web Vitals reporting configured
- [ ] Accessibility tests passing
- [ ] Unit test coverage > 80%
- [ ] E2E tests passing
- [ ] CI/CD pipeline running successfully

### Recommended
- [ ] Sentry or similar error tracking service configured
- [ ] Analytics endpoint connected to real service
- [ ] Performance monitoring dashboard set up
- [ ] Alerts configured for critical errors
- [ ] Regular accessibility audits scheduled

### Optional
- [ ] Session replay tool (LogRocket, FullStory)
- [ ] A/B testing framework
- [ ] Feature flags system
- [ ] User feedback collection

---

## 🚀 Quick Commands

```bash
# Development
npm run dev                 # Start dev server with monitoring

# Testing
npm run test               # Unit tests (watch mode)
npm run test:coverage      # Unit tests with coverage
npm run test:e2e          # End-to-end tests
npm run test:a11y         # Accessibility tests
npm run test:all          # Run all tests

# Production
npm run build             # Build for production
npm start                 # Start production server

# Quality Checks
npm run lint              # ESLint
npx tsc --noEmit         # TypeScript check
```

---

## 📚 Additional Resources

- [Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Playwright Testing](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Last Updated:** 2025-11-14
**Maintained by:** Development Team

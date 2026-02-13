/**
 * Error Tracking Utilities
 * Centralized error tracking and reporting
 *
 * To enable Sentry:
 * 1. npm install @sentry/nextjs
 * 2. npx @sentry/wizard -i nextjs
 * 3. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 */

export interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track an error with context
 */
export function trackError(error: Error, context?: ErrorContext) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracking]', error, context);
  }

  // TODO: Send to error tracking service in production
  // Example for Sentry:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: {
  //       component: context?.component,
  //       action: context?.action,
  //     },
  //     user: context?.userId ? { id: context.userId } : undefined,
  //     extra: context?.metadata,
  //   });
  // }
}

/**
 * Track a calculation error
 */
export function trackCalculationError(
  error: Error,
  inputs?: Record<string, unknown>
): void {
  trackError(error, {
    component: 'RetirementCalculator',
    action: 'calculation',
    metadata: {
      inputs: inputs ? sanitizeInputs(inputs) : undefined,
    },
  });
}

/**
 * Track a rendering error
 */
export function trackRenderError(
  error: Error,
  componentName: string,
  props?: Record<string, unknown>
): void {
  trackError(error, {
    component: componentName,
    action: 'render',
    metadata: {
      props: props ? sanitizeInputs(props) : undefined,
    },
  });
}

/**
 * Sanitize sensitive data from inputs before logging
 */
function sanitizeInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...inputs };

  // Remove or redact sensitive fields
  const sensitiveFields = ['ssn', 'password', 'apiKey', 'token'];

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Performance monitoring - track slow operations
 */
export function trackPerformance(
  operationName: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${operationName}: ${duration}ms`, metadata);
  }

  // TODO: Send to performance monitoring service
  // if (duration > 1000) { // Alert on slow operations
  //   // Send alert
  // }
}

/**
 * Measure and track an async operation
 */
export async function measureAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - start;
    trackPerformance(operationName, duration, metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    trackPerformance(operationName, duration, { ...metadata, error: true });
    throw error;
  }
}

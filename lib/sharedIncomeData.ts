/**
 * Shared Income Data Store
 *
 * @deprecated This module is deprecated. All income and employment data should be
 * read from PlanConfig context (usePlanConfig hook) which is the single source of truth.
 * The save/load functions are no-ops and will be removed in a future cleanup.
 *
 * Migration: Use `usePlanConfig()` to read `primaryIncome`, `spouseIncome`,
 * `employmentType1`, `employmentType2`, `marital` directly from context.
 */

export interface SharedIncomeData {
  maritalStatus: 'single' | 'married';
  state?: string;
  employmentType1: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  primaryIncome: number;
  employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  spouseIncome?: number;
  source: 'ai-onboarding' | 'quick-start' | 'manual';
  timestamp: number;
}

/** @deprecated No-op. Use PlanConfig context instead. */
export function saveSharedIncomeData(_data: SharedIncomeData): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SharedIncomeData] DEPRECATED: saveSharedIncomeData is a no-op. Use PlanConfig context.');
  }
}

/** @deprecated Returns null. Use PlanConfig context instead. */
export function loadSharedIncomeData(): SharedIncomeData | null {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SharedIncomeData] DEPRECATED: loadSharedIncomeData always returns null. Use PlanConfig context.');
  }
  return null;
}

/** @deprecated No-op. Use PlanConfig context instead. */
export function clearSharedIncomeData(): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SharedIncomeData] DEPRECATED: clearSharedIncomeData is a no-op. Use PlanConfig context.');
  }
}

/** @deprecated Always returns false. Use PlanConfig fieldMetadata instead. */
export function hasRecentIncomeData(): boolean {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SharedIncomeData] DEPRECATED: hasRecentIncomeData always returns false. Use PlanConfig fieldMetadata.');
  }
  return false;
}

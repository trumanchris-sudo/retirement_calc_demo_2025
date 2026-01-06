/**
 * Shared Income Data Store
 *
 * Stores income and employment data from AI onboarding for use across calculators
 */

export interface SharedIncomeData {
  // Personal Information
  maritalStatus: 'single' | 'married';
  state?: string;

  // Person 1
  employmentType1: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  annualIncome1: number;

  // Person 2 (if married)
  employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  annualIncome2?: number;

  // Metadata
  source: 'ai-onboarding' | 'manual';
  timestamp: number;
}

const STORAGE_KEY = 'shared_income_data';

/**
 * Save income data to localStorage
 */
export function saveSharedIncomeData(data: SharedIncomeData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[SharedIncomeData] Failed to save:', error);
  }
}

/**
 * Load income data from localStorage
 */
export function loadSharedIncomeData(): SharedIncomeData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as SharedIncomeData;
  } catch (error) {
    console.error('[SharedIncomeData] Failed to load:', error);
    return null;
  }
}

/**
 * Clear income data from localStorage
 */
export function clearSharedIncomeData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[SharedIncomeData] Failed to clear:', error);
  }
}

/**
 * Check if income data exists and is recent (within 24 hours)
 */
export function hasRecentIncomeData(): boolean {
  const data = loadSharedIncomeData();
  if (!data) return false;

  const dayInMs = 24 * 60 * 60 * 1000;
  const isRecent = Date.now() - data.timestamp < dayInMs;

  return isRecent;
}

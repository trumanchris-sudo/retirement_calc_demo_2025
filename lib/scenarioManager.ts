/**
 * Scenario Management
 *
 * Allows users to save, load, and compare different retirement planning scenarios.
 * All scenarios are stored in localStorage and based on PlanConfig.
 */

import type { PlanConfig } from '@/types/plan-config';

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  config: PlanConfig;
  createdAt: number;
  updatedAt: number;
}

const SCENARIOS_STORAGE_KEY = 'retirement_scenarios';

/**
 * Get all saved scenarios
 */
export function getAllScenarios(): SavedScenario[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (!stored) return [];

    const scenarios = JSON.parse(stored);
    return Array.isArray(scenarios) ? scenarios : [];
  } catch (error) {
    console.error('[ScenarioManager] Failed to load scenarios:', error);
    return [];
  }
}

/**
 * Save a scenario
 */
export function saveScenario(
  config: PlanConfig,
  name: string,
  description?: string,
  existingId?: string
): SavedScenario {
  const scenarios = getAllScenarios();
  const timestamp = Date.now();

  const scenario: SavedScenario = {
    id: existingId || `scenario_${timestamp}`,
    name,
    description,
    config: { ...config, updatedAt: timestamp },
    createdAt: existingId
      ? scenarios.find(s => s.id === existingId)?.createdAt || timestamp
      : timestamp,
    updatedAt: timestamp,
  };

  // Update existing or add new
  const updatedScenarios = existingId
    ? scenarios.map(s => s.id === existingId ? scenario : s)
    : [...scenarios, scenario];

  try {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(updatedScenarios));
    console.log('[ScenarioManager] Saved scenario:', scenario.name);
    return scenario;
  } catch (error) {
    console.error('[ScenarioManager] Failed to save scenario:', error);
    throw new Error('Failed to save scenario. Storage may be full.');
  }
}

/**
 * Load a scenario by ID
 */
export function loadScenario(id: string): SavedScenario | null {
  const scenarios = getAllScenarios();
  const scenario = scenarios.find(s => s.id === id);

  if (scenario) {
    console.log('[ScenarioManager] Loaded scenario:', scenario.name);
  }

  return scenario || null;
}

/**
 * Delete a scenario
 */
export function deleteScenario(id: string): boolean {
  const scenarios = getAllScenarios();
  const updatedScenarios = scenarios.filter(s => s.id !== id);

  try {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(updatedScenarios));
    console.log('[ScenarioManager] Deleted scenario:', id);
    return true;
  } catch (error) {
    console.error('[ScenarioManager] Failed to delete scenario:', error);
    return false;
  }
}

/**
 * Duplicate a scenario
 */
export function duplicateScenario(id: string, newName?: string): SavedScenario | null {
  const scenario = loadScenario(id);
  if (!scenario) return null;

  const name = newName || `${scenario.name} (Copy)`;
  return saveScenario(scenario.config, name, scenario.description);
}

/**
 * Export scenarios to JSON file
 */
export function exportScenarios(scenarioIds?: string[]): string {
  const allScenarios = getAllScenarios();
  const scenarios = scenarioIds
    ? allScenarios.filter(s => scenarioIds.includes(s.id))
    : allScenarios;

  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    scenarios,
  }, null, 2);
}

/**
 * Import scenarios from JSON
 */
export function importScenarios(jsonString: string): {
  success: boolean;
  imported: number;
  errors: string[];
} {
  try {
    const data = JSON.parse(jsonString);

    if (!data.scenarios || !Array.isArray(data.scenarios)) {
      return {
        success: false,
        imported: 0,
        errors: ['Invalid import format: missing scenarios array'],
      };
    }

    const existingScenarios = getAllScenarios();
    const errors: string[] = [];
    let imported = 0;

    for (const scenario of data.scenarios) {
      try {
        // Generate new ID to avoid conflicts
        const newId = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        saveScenario(scenario.config, scenario.name, scenario.description, newId);
        imported++;
      } catch (error) {
        errors.push(`Failed to import "${scenario.name}": ${error}`);
      }
    }

    return {
      success: imported > 0,
      imported,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [`Failed to parse import file: ${error}`],
    };
  }
}

/**
 * Get scenario comparison data
 * Useful for side-by-side comparison of key metrics
 */
/** Type for account balance comparison data */
interface AccountBalances {
  taxable: number;
  traditional: number;
  roth: number;
}

/** Type for comparison data structure */
interface ScenarioComparisonData {
  name: string[];
  age1: number[];
  retirementAge: number[];
  primaryIncome: number[];
  currentBalances: AccountBalances[];
  annualContributions: AccountBalances[];
  returnRate: number[];
  withdrawalRate: number[];
}

export function compareScenarios(scenarioIds: string[]): {
  scenarios: SavedScenario[];
  comparison: ScenarioComparisonData;
} {
  const scenarios = scenarioIds
    .map(id => loadScenario(id))
    .filter((s): s is SavedScenario => s !== null);

  if (scenarios.length === 0) {
    return { scenarios: [], comparison: { name: [], age1: [], retirementAge: [], primaryIncome: [], currentBalances: [], annualContributions: [], returnRate: [], withdrawalRate: [] } };
  }

  // Extract key metrics for comparison
  const comparison: ScenarioComparisonData = {
    name: scenarios.map(s => s.name),
    age1: scenarios.map(s => s.config.age1),
    retirementAge: scenarios.map(s => s.config.retirementAge),
    primaryIncome: scenarios.map(s => s.config.primaryIncome),
    currentBalances: scenarios.map(s => ({
      taxable: s.config.taxableBalance || 0,
      traditional: s.config.pretaxBalance || 0,
      roth: s.config.rothBalance || 0,
    })),
    annualContributions: scenarios.map(s => ({
      taxable: s.config.cTax1 || 0,
      traditional: s.config.cPre1 || 0,
      roth: s.config.cPost1 || 0,
    })),
    returnRate: scenarios.map(s => s.config.retRate),
    withdrawalRate: scenarios.map(s => s.config.wdRate),
  };

  return { scenarios, comparison };
}

/**
 * Comprehensive TypeScript type definitions for the retirement calculator
 */

import type { FilingStatus } from "@/lib/calculations/taxCalculations";
import type { ReturnMode, WalkSeries } from "./planner";

// ==================== Input Types ====================

/**
 * Complete set of inputs for retirement calculation
 */
export interface CalculatorInputs {
  // Personal Information
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;

  // Starting Balances
  sTax: number;     // Starting taxable balance
  sPre: number;     // Starting pre-tax (401k/IRA) balance
  sPost: number;    // Starting Roth balance

  // Person 1 Contributions
  cTax1: number;    // Annual taxable contributions
  cPre1: number;    // Annual pre-tax contributions
  cPost1: number;   // Annual Roth contributions
  cMatch1: number;  // Employer match

  // Person 2 Contributions (if married)
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;

  // Rates
  retRate: number;      // Expected return rate
  infRate: number;      // Inflation rate
  stateRate: number;    // State tax rate
  wdRate: number;       // Withdrawal rate in retirement
  incContrib: number;   // Annual contribution increase
  incRate: number;      // Income/contribution increase rate

  // Simulation Settings
  retMode: ReturnMode;
  walkSeries: WalkSeries;
  seed: number;

  // Social Security
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;

  // Scenario Testing
  historicalYear?: number;
  inflationShockRate: number | null;
  inflationShockDuration: number;

  // Generational Wealth
  showGen: boolean;
  hypPerBen: number;
  hypStartBens: number;
  hypBirthMultiple: number;
  hypBirthInterval: number;
  hypDeathAge: number;
  hypMinDistAge: number;
  hypBenAgesStr: string;
}

// ==================== Result Types ====================

/**
 * Account balances at end of life
 */
export interface AccountBalances {
  taxable: number;
  pretax: number;
  roth: number;
}

/**
 * Tax breakdown
 */
export interface TaxBreakdown {
  fedOrd: number;   // Federal ordinary income tax
  fedCap: number;   // Federal capital gains tax
  niit: number;     // Net Investment Income Tax (3.8%)
  state: number;    // State income tax
  tot: number;      // Total tax
}

/**
 * Generational payout simulation result
 */
export interface GenerationalPayout {
  perBenReal: number;
  years: number;
  fundLeftReal: number;
  startBeneficiaries: number;
  lastLivingCount: number;
  birthMultiple: number;
  birthInterval: number;
  deathAge: number;
  p10?: {
    years: number;
    fundLeftReal: number;
    isPerpetual: boolean;
  };
  p50?: {
    years: number;
    fundLeftReal: number;
    isPerpetual: boolean;
  };
  p90?: {
    years: number;
    fundLeftReal: number;
    isPerpetual: boolean;
  };
  probPerpetual?: number;
}

/**
 * RMD vs Spending data point
 */
export interface RMDDataPoint {
  age: number;
  spending: number;
  rmd: number;
}

/**
 * Chart data point for wealth accumulation
 */
export interface ChartDataPoint {
  year: number;
  a1: number;           // Age of person 1
  a2: number | null;    // Age of person 2 (if married)
  bal: number;          // Nominal balance (50th percentile)
  real: number;         // Real (inflation-adjusted) balance (50th percentile)
  p10?: number;         // 10th percentile nominal balance
  p90?: number;         // 90th percentile nominal balance
  baseline?: number;    // Baseline scenario (for comparisons)
  bearMarket?: number;  // Bear market scenario (for comparisons)
  inflation?: number;   // Inflation scenario (for comparisons)
}

/**
 * Complete calculation result
 */
export interface CalculationResult {
  finNom: number;       // Final balance at retirement (nominal)
  finReal: number;      // Final balance at retirement (real)
  totC: number;         // Total contributions
  data: ChartDataPoint[]; // Year-by-year data for charts
  yrsToRet: number;     // Years to retirement
  wd: number;           // Gross withdrawal year 1
  wdAfter: number;      // After-tax withdrawal year 1
  wdReal: number;       // Real withdrawal year 1
  survYrs: number;      // Years portfolio survived
  yrsToSim: number;     // Years simulated in retirement
  eol: number;          // End-of-life wealth (nominal)
  eolReal: number;      // End-of-life wealth (real, inflation-adjusted)
  estateTax: number;    // Federal estate tax
  netEstate: number;    // Net estate after tax
  eolAccounts: AccountBalances; // Account breakdown at EOL
  totalRMDs: number;    // Total RMDs over lifetime
  genPayout: GenerationalPayout | null; // Generational wealth calculation
  probRuin?: number;    // Probability of ruin (Monte Carlo)
  rmdData: RMDDataPoint[]; // RMD vs spending timeline
  tax: TaxBreakdown;    // Tax breakdown
}

/**
 * Formatted result strings for display
 */
export interface FormattedResults {
  finNom: string;
  finReal: string;
  wd: string;
  wdAfter: string;
  wdReal: string;
  eol: string;
  eolReal: string;
  estateTax: string;
  netEstate: string;
  totalRMDs: string;
  fedOrd: string;
  fedCap: string;
  niit: string;
  state: string;
  tot: string;
}

// ==================== Saved Scenario Types ====================

/**
 * Saved scenario for comparison
 */
export interface SavedScenario {
  id: string;
  name: string;
  timestamp: number;
  inputs: Partial<CalculatorInputs>;
  results: {
    finNom: number;
    finReal: number;
    wd: number;
    wdReal: number;
    eol: number;
    eolReal: number;
    estateTax: number;
    netEstate: number;
    probRuin?: number;
  };
}

// ==================== Comparison Types ====================

/**
 * Scenario comparison data
 */
export interface ScenarioData {
  data: ChartDataPoint[];
  visible: boolean;
  label: string;
  year?: number;
  rate?: number;
  duration?: number;
}

/**
 * Complete comparison state
 */
export interface ComparisonData {
  baseline: ScenarioData | null;
  bearMarket: ScenarioData | null;
  inflation: ScenarioData | null;
}

// ==================== Chart Types ====================

/**
 * Chart data splits for different phases
 */
export interface ChartData {
  accumulation: ChartDataPoint[];
  drawdown: ChartDataPoint[];
  full: ChartDataPoint[];
}

/**
 * Net worth comparison data
 */
export interface NetWorthComparison {
  bracket: {
    age: string;
    p25: number;
    p50: number;
    median: number;
    p75: number;
    p90: number;
  };
  percentile: "above" | "below";
  multiple: string;
  difference: string;
}

// ==================== Component Prop Types ====================

/**
 * Props for wealth accumulation chart
 */
export interface WealthChartProps {
  data: ChartDataPoint[];
  showP10: boolean;
  showP90: boolean;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

/**
 * Props for scenario comparison chart
 */
export interface ComparisonChartProps {
  data: ChartDataPoint[];
  comparisonData: ComparisonData;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

// ==================== Utility Types ====================

/**
 * Formatters for numbers
 */
export interface Formatters {
  currency: (val: number) => string;
  percentage: (val: number) => string;
  whole: (val: number) => string;
  decimal: (val: number, places: number) => string;
}

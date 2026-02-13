/**
 * Benchmark System Type Definitions
 *
 * Types for the national comparison and percentile ranking system.
 */

/**
 * User's percentile ranking result
 */
export interface PercentileRanking {
  /** User's exact percentile (0-100) */
  percentile: number;

  /** Formatted string: "top X%" or "bottom X%" */
  label: string;

  /** User's savings amount used for calculation */
  userSavings: number;

  /** User's age used for calculation */
  userAge: number;

  /** Comparison to median */
  vsMedian: {
    /** Dollar difference from median (positive = above median) */
    difference: number;
    /** Multiple of median (e.g., 2.5 = 250% of median) */
    multiple: number;
    /** "above" or "below" */
    position: 'above' | 'below' | 'at';
  };

  /** Which percentile bracket they fall into */
  bracket: 'p10' | 'p25' | 'p50' | 'p75' | 'p90' | 'above90';
}

/**
 * Projected future standing
 */
export interface ProjectedStanding {
  /** Age being projected to */
  targetAge: number;

  /** Projected savings at target age */
  projectedSavings: number;

  /** Expected percentile at target age */
  projectedPercentile: number;

  /** Change from current percentile */
  percentileChange: number;

  /** Whether trajectory is improving */
  isImproving: boolean;
}

/**
 * Savings rate comparison result
 */
export interface SavingsRateComparison {
  /** User's savings rate as a percentage */
  userRate: number;

  /** National average for comparison */
  nationalAverage: number;

  /** Multiple of national average */
  multiple: number;

  /** Percentile ranking for savings rate */
  percentile: number;

  /** Category: "below-average", "average", "above-average", "exceptional" */
  category: 'below-average' | 'average' | 'above-average' | 'exceptional';

  /** User-friendly description */
  description: string;
}

/**
 * Movement impact calculation
 */
export interface MovementImpact {
  /** If everyone saved like user, poverty reduction estimate */
  povertyReductionPercent: number;

  /** Additional years of retirement funded if applied nationally */
  additionalRetirementYears: number;

  /** Inspirational message based on user's position */
  message: string;

  /** Whether user is making above-average contribution */
  isContributor: boolean;
}

/**
 * Anonymous aggregation bucket for future privacy-preserving analytics
 */
export interface AnonymousBucket {
  /** Age bucket (e.g., "30-34", "35-39") */
  ageBucket: string;

  /** Savings bucket (e.g., "$0-10K", "$10K-25K") */
  savingsBucket: string;

  /** Timestamp bucket (rounded to nearest hour for privacy) */
  timestampBucket: number;

  /** Region bucket (optional, state-level) */
  regionBucket?: string;
}

/**
 * Aggregated statistics for real percentile calculations
 */
export interface AggregatedStats {
  /** Total entries in this bucket */
  count: number;

  /** Age bucket */
  ageBucket: string;

  /** Percentile boundaries within this bucket */
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };

  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Props for the BenchmarkPanel component
 */
export interface BenchmarkPanelProps {
  /** User's current age */
  age: number;

  /** Total retirement savings (pre-tax + Roth + taxable) */
  totalSavings: number;

  /** Annual contributions (all sources) */
  annualContributions: number;

  /** User's gross income for savings rate calculation */
  grossIncome?: number;

  /** Expected annual return rate (for projections) */
  returnRate?: number;

  /** Target retirement age */
  retirementAge?: number;

  /** Whether to show expanded/detailed view */
  expanded?: boolean;

  /** Callback when share button is clicked */
  onShare?: () => void;
}

/**
 * Usage counter state (for "X people have used this" display)
 */
export interface UsageCounter {
  /** Total calculations performed */
  totalCalculations: number;

  /** Calculations in last 24 hours */
  last24Hours: number;

  /** Timestamp of last update */
  lastUpdated: number;

  /** Whether this is simulated data */
  isSimulated: boolean;
}

/**
 * Benchmark result combining all analyses
 */
export interface BenchmarkResult {
  /** User's percentile ranking */
  ranking: PercentileRanking;

  /** Projected standing at retirement */
  projectedStanding: ProjectedStanding;

  /** Savings rate comparison */
  savingsRateComparison: SavingsRateComparison | null;

  /** Movement impact metrics */
  movementImpact: MovementImpact;

  /** Usage statistics */
  usageStats: UsageCounter;
}

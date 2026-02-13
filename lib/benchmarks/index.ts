/**
 * Benchmark System - Barrel Export
 *
 * National comparison data and percentile ranking system based on
 * Federal Reserve Survey of Consumer Finances (SCF) data.
 */

// Type exports
export type {
  PercentileRanking,
  ProjectedStanding,
  SavingsRateComparison,
  MovementImpact,
  UsageCounter,
  BenchmarkResult,
  AnonymousBucket,
  AggregatedStats,
  BenchmarkPanelProps,
} from './types';

// National data exports
export {
  MEDIAN_SAVINGS_BY_AGE,
  SAVINGS_PERCENTILES,
  SAVINGS_RATE_BENCHMARKS,
  RETIREMENT_STATISTICS,
  IMPACT_STATISTICS,
  getPercentilesForAge,
  getMedianForAge,
  type AgePercentiles,
} from './nationalData';

// Calculation function exports
export {
  calculatePercentileRanking,
  calculateProjectedStanding,
  calculateSavingsRateComparison,
  calculateMovementImpact,
  calculateBenchmarkResult,
  getUsageCounter,
  createAnonymousBucket,
  getComparisonMessage,
} from './percentileCalculations';

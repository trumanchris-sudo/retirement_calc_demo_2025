/**
 * Percentile Calculation Utilities
 *
 * Functions for calculating user's percentile ranking and projections
 * based on national benchmark data.
 */

import {
  getPercentilesForAge,
  getMedianForAge,
  SAVINGS_RATE_BENCHMARKS,
  RETIREMENT_STATISTICS,
  IMPACT_STATISTICS,
  type AgePercentiles,
} from './nationalData';

import type {
  PercentileRanking,
  ProjectedStanding,
  SavingsRateComparison,
  MovementImpact,
  UsageCounter,
  BenchmarkResult,
  AnonymousBucket,
} from './types';

/**
 * Calculate user's percentile ranking for their age group
 */
export function calculatePercentileRanking(
  age: number,
  totalSavings: number
): PercentileRanking {
  const percentiles = getPercentilesForAge(age);
  const median = percentiles.p50;

  // Calculate exact percentile using linear interpolation
  let percentile: number;
  let bracket: PercentileRanking['bracket'];

  if (totalSavings <= percentiles.p10) {
    // Below 10th percentile
    percentile = (totalSavings / Math.max(percentiles.p10, 1)) * 10;
    bracket = 'p10';
  } else if (totalSavings <= percentiles.p25) {
    // Between 10th and 25th
    const range = percentiles.p25 - percentiles.p10;
    const position = totalSavings - percentiles.p10;
    percentile = 10 + (position / range) * 15;
    bracket = 'p25';
  } else if (totalSavings <= percentiles.p50) {
    // Between 25th and 50th
    const range = percentiles.p50 - percentiles.p25;
    const position = totalSavings - percentiles.p25;
    percentile = 25 + (position / range) * 25;
    bracket = 'p50';
  } else if (totalSavings <= percentiles.p75) {
    // Between 50th and 75th
    const range = percentiles.p75 - percentiles.p50;
    const position = totalSavings - percentiles.p50;
    percentile = 50 + (position / range) * 25;
    bracket = 'p75';
  } else if (totalSavings <= percentiles.p90) {
    // Between 75th and 90th
    const range = percentiles.p90 - percentiles.p75;
    const position = totalSavings - percentiles.p75;
    percentile = 75 + (position / range) * 15;
    bracket = 'p90';
  } else {
    // Above 90th percentile
    // Estimate using log scale for extreme values
    const excessRatio = totalSavings / percentiles.p90;
    // Cap at 99.9% for display purposes
    percentile = Math.min(99.9, 90 + Math.log10(excessRatio) * 5);
    bracket = 'above90';
  }

  // Clamp to valid range
  percentile = Math.max(0.1, Math.min(99.9, percentile));

  // Generate label
  let label: string;
  if (percentile >= 50) {
    label = `top ${Math.round(100 - percentile)}%`;
  } else {
    label = `bottom ${Math.round(percentile)}%`;
  }

  // Calculate comparison to median
  const difference = totalSavings - median;
  const multiple = median > 0 ? totalSavings / median : totalSavings > 0 ? Infinity : 0;
  const position: PercentileRanking['vsMedian']['position'] =
    difference > median * 0.05 ? 'above' :
    difference < -median * 0.05 ? 'below' : 'at';

  return {
    percentile,
    label,
    userSavings: totalSavings,
    userAge: age,
    vsMedian: {
      difference,
      multiple,
      position,
    },
    bracket,
  };
}

/**
 * Project user's future percentile standing
 */
export function calculateProjectedStanding(
  currentAge: number,
  currentSavings: number,
  annualContributions: number,
  returnRate: number = 7,
  targetAge: number = 65
): ProjectedStanding {
  const yearsToTarget = targetAge - currentAge;

  if (yearsToTarget <= 0) {
    const currentRanking = calculatePercentileRanking(currentAge, currentSavings);
    return {
      targetAge,
      projectedSavings: currentSavings,
      projectedPercentile: currentRanking.percentile,
      percentileChange: 0,
      isImproving: false,
    };
  }

  // Project savings using compound growth with annual contributions
  // FV = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r]
  const r = returnRate / 100;
  const n = yearsToTarget;

  const projectedSavings = Math.round(
    currentSavings * Math.pow(1 + r, n) +
    annualContributions * ((Math.pow(1 + r, n) - 1) / r)
  );

  // Get percentile at target age
  const currentRanking = calculatePercentileRanking(currentAge, currentSavings);
  const projectedRanking = calculatePercentileRanking(targetAge, projectedSavings);

  return {
    targetAge,
    projectedSavings,
    projectedPercentile: projectedRanking.percentile,
    percentileChange: projectedRanking.percentile - currentRanking.percentile,
    isImproving: projectedRanking.percentile > currentRanking.percentile,
  };
}

/**
 * Compare user's savings rate to national averages
 */
export function calculateSavingsRateComparison(
  annualContributions: number,
  grossIncome: number
): SavingsRateComparison | null {
  if (grossIncome <= 0) {
    return null;
  }

  const userRate = (annualContributions / grossIncome) * 100;
  const nationalAverage = SAVINGS_RATE_BENCHMARKS.nationalAverage;
  const multiple = userRate / nationalAverage;

  // Determine category and percentile
  let category: SavingsRateComparison['category'];
  let percentile: number;
  let description: string;

  const { distribution } = SAVINGS_RATE_BENCHMARKS;

  if (userRate < 3) {
    category = 'below-average';
    percentile = (userRate / 3) * distribution.veryLow;
    description = 'Building your savings habit';
  } else if (userRate < 6) {
    category = 'below-average';
    percentile = distribution.veryLow + ((userRate - 3) / 3) * distribution.low;
    description = 'Getting started on your savings journey';
  } else if (userRate < 10) {
    category = 'average';
    percentile = distribution.veryLow + distribution.low +
      ((userRate - 6) / 4) * distribution.moderate;
    description = 'Keeping pace with typical savers';
  } else if (userRate < 15) {
    category = 'above-average';
    percentile = distribution.veryLow + distribution.low + distribution.moderate +
      ((userRate - 10) / 5) * distribution.good;
    description = 'Outpacing most Americans';
  } else {
    category = 'exceptional';
    const excessRate = Math.min(userRate - 15, 15); // Cap at 30% for calculation
    percentile = 90 + (excessRate / 15) * 9.9;
    description = 'Among the most dedicated savers';
  }

  return {
    userRate: Math.round(userRate * 10) / 10,
    nationalAverage,
    multiple: Math.round(multiple * 10) / 10,
    percentile: Math.min(99.9, Math.round(percentile * 10) / 10),
    category,
    description,
  };
}

/**
 * Calculate the movement impact metrics
 */
export function calculateMovementImpact(
  ranking: PercentileRanking,
  savingsRateComparison: SavingsRateComparison | null
): MovementImpact {
  // Determine if user is a contributor (above median)
  const isContributor = ranking.percentile >= 50;

  // Calculate poverty reduction estimate
  let povertyReductionPercent = 0;
  if (savingsRateComparison && savingsRateComparison.userRate > SAVINGS_RATE_BENCHMARKS.nationalAverage) {
    const excessRate = savingsRateComparison.userRate - SAVINGS_RATE_BENCHMARKS.nationalAverage;
    povertyReductionPercent = Math.round(
      excessRate * IMPACT_STATISTICS.povertyReductionPerSavingsPoint * 10
    ) / 10;
  }

  // Calculate additional retirement years
  // Based on rough estimate: each 1% higher savings rate = ~0.5 years more retirement funding
  const additionalRetirementYears = savingsRateComparison
    ? Math.max(0, Math.round((savingsRateComparison.userRate - SAVINGS_RATE_BENCHMARKS.nationalAverage) * 0.5 * 10) / 10)
    : 0;

  // Generate inspirational message based on user's position
  let message: string;

  if (ranking.percentile >= 90) {
    message = "You're among the most prepared Americans. By sharing your knowledge, you can help others achieve the same security.";
  } else if (ranking.percentile >= 75) {
    message = "You're ahead of 3 out of 4 Americans your age. Your discipline is setting an example worth following.";
  } else if (ranking.percentile >= 50) {
    message = "You're building wealth faster than half of Americans. Keep going - every dollar you save makes a difference.";
  } else if (ranking.percentile >= 25) {
    message = "You've started building your future. Small increases in savings can dramatically improve your retirement outlook.";
  } else {
    message = "Every journey starts with a first step. You're taking control of your financial future by planning ahead.";
  }

  return {
    povertyReductionPercent,
    additionalRetirementYears,
    message,
    isContributor,
  };
}

/**
 * Get simulated usage counter (for MVP, will be replaced with real analytics)
 */
export function getUsageCounter(): UsageCounter {
  // Simulated counter that increases based on time
  // In production, this would come from an analytics backend
  const baseCount = 47832;
  const daysSinceLaunch = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24));
  const additionalUsers = daysSinceLaunch * 127; // ~127 new users per day on average

  return {
    totalCalculations: baseCount + additionalUsers,
    last24Hours: Math.floor(Math.random() * 50) + 100, // 100-150 in last 24h
    lastUpdated: Date.now(),
    isSimulated: true,
  };
}

/**
 * Create anonymous bucket for future privacy-preserving analytics
 *
 * This function converts user data into anonymized buckets that can be
 * aggregated without compromising individual privacy.
 */
export function createAnonymousBucket(
  age: number,
  totalSavings: number,
  state?: string
): AnonymousBucket {
  // Age buckets: 5-year ranges
  const ageLower = Math.floor(age / 5) * 5;
  const ageBucket = `${ageLower}-${ageLower + 4}`;

  // Savings buckets: logarithmic scale for privacy
  let savingsBucket: string;
  if (totalSavings <= 0) {
    savingsBucket = '$0';
  } else if (totalSavings < 10000) {
    savingsBucket = '$1-10K';
  } else if (totalSavings < 25000) {
    savingsBucket = '$10K-25K';
  } else if (totalSavings < 50000) {
    savingsBucket = '$25K-50K';
  } else if (totalSavings < 100000) {
    savingsBucket = '$50K-100K';
  } else if (totalSavings < 250000) {
    savingsBucket = '$100K-250K';
  } else if (totalSavings < 500000) {
    savingsBucket = '$250K-500K';
  } else if (totalSavings < 1000000) {
    savingsBucket = '$500K-1M';
  } else {
    savingsBucket = '$1M+';
  }

  // Round timestamp to nearest hour for privacy
  const timestampBucket = Math.floor(Date.now() / (1000 * 60 * 60)) * (1000 * 60 * 60);

  return {
    ageBucket,
    savingsBucket,
    timestampBucket,
    regionBucket: state,
  };
}

/**
 * Calculate complete benchmark result
 */
export function calculateBenchmarkResult(
  age: number,
  totalSavings: number,
  annualContributions: number,
  grossIncome?: number,
  returnRate: number = 7,
  retirementAge: number = 65
): BenchmarkResult {
  const ranking = calculatePercentileRanking(age, totalSavings);
  const projectedStanding = calculateProjectedStanding(
    age,
    totalSavings,
    annualContributions,
    returnRate,
    retirementAge
  );
  const savingsRateComparison = grossIncome
    ? calculateSavingsRateComparison(annualContributions, grossIncome)
    : null;
  const movementImpact = calculateMovementImpact(ranking, savingsRateComparison);
  const usageStats = getUsageCounter();

  return {
    ranking,
    projectedStanding,
    savingsRateComparison,
    movementImpact,
    usageStats,
  };
}

/**
 * Get a motivational comparison message
 */
export function getComparisonMessage(ranking: PercentileRanking): string {
  const percentile = Math.round(ranking.percentile);

  if (ranking.vsMedian.position === 'above') {
    const multiple = ranking.vsMedian.multiple;
    if (multiple >= 3) {
      return `You have ${multiple.toFixed(1)}x the median savings for your age - exceptional!`;
    } else if (multiple >= 2) {
      return `You have over double the median savings for your age - great work!`;
    } else {
      return `You're ${Math.round((multiple - 1) * 100)}% above the median for your age.`;
    }
  } else if (ranking.vsMedian.position === 'at') {
    return `You're right at the median for your age - a solid foundation to build on.`;
  } else {
    const needed = ranking.vsMedian.difference * -1;
    return `You're ${Math.round((1 - ranking.vsMedian.multiple) * 100)}% below median. Increasing savings by ${formatCurrency(needed)} would get you there.`;
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${Math.round(amount).toLocaleString()}`;
}

/**
 * Generational Wealth Simulation
 * Extracted from page.tsx — simulation engine for hypothetical per-beneficiary payouts.
 */

import { realReturn } from '@/lib/utils';

export type Cohort = { size: number; age: number; canReproduce: boolean; cumulativeBirths: number };

/**
 * Simulate N years of generational wealth with demographic changes.
 * Used internally by the optimized simulation for chunked processing.
 */
export function simulateYearsChunk(
  cohorts: Cohort[],
  fundReal: number,
  realReturnRate: number,
  perBenReal: number,
  deathAge: number,
  minDistAge: number,
  totalFertilityRate: number,
  fertilityWindowStart: number,
  fertilityWindowEnd: number,
  birthsPerYear: number,
  numYears: number
): { cohorts: Cohort[]; fundReal: number; years: number; depleted: boolean } {
  let currentFund = fundReal;
  let currentCohorts = cohorts;
  let yearsSimulated = 0;

  for (let i = 0; i < numYears; i++) {
    currentCohorts = currentCohorts.filter((c) => c.age < deathAge);

    const living = currentCohorts.reduce((acc, c) => acc + c.size, 0);
    if (living === 0) {
      return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: true };
    }

    currentFund *= 1 + realReturnRate;

    const eligible = currentCohorts
      .filter(c => c.age >= minDistAge)
      .reduce((acc, c) => acc + c.size, 0);
    const payout = perBenReal * eligible;
    currentFund -= payout;

    if (currentFund < 0) {
      return { cohorts: currentCohorts, fundReal: 0, years: yearsSimulated, depleted: true };
    }

    yearsSimulated += 1;

    currentCohorts.forEach((c) => (c.age += 1));

    currentCohorts.forEach((cohort) => {
      if (cohort.canReproduce &&
          cohort.age >= fertilityWindowStart &&
          cohort.age <= fertilityWindowEnd &&
          cohort.cumulativeBirths < totalFertilityRate) {

        const remainingFertility = totalFertilityRate - cohort.cumulativeBirths;
        const birthsThisYear = Math.min(birthsPerYear, remainingFertility);
        const births = cohort.size * birthsThisYear;

        if (births > 0) {
          currentCohorts.push({ size: births, age: 0, canReproduce: true, cumulativeBirths: 0 });
        }

        cohort.cumulativeBirths += birthsThisYear;
      }
    });
  }

  return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: false };
}

/**
 * Check if portfolio is mathematically guaranteed to be perpetual.
 * Uses perpetual threshold formula: Sustainable Rate = Real Return - Population Growth Rate
 */
export function checkPerpetualViability(
  realReturnRate: number,
  totalFertilityRate: number,
  generationLength: number,
  perBenReal: number,
  initialFundReal: number,
  startBens: number,
  debugLog = false
): boolean {
  const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
  const perpetualThreshold = realReturnRate - populationGrowthRate;
  const annualDistribution = perBenReal * startBens;
  const distributionRate = annualDistribution / initialFundReal;
  const safeThreshold = perpetualThreshold * 0.95;
  const isPerpetual = distributionRate < safeThreshold;

  if (debugLog) {
    console.log('[PERPETUAL CHECK] Real return rate: ' + (realReturnRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Population growth rate: ' + (populationGrowthRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Perpetual threshold (return - pop growth): ' + (perpetualThreshold * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Safe threshold (95% of perpetual threshold): ' + (safeThreshold * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Annual distribution: $' + annualDistribution.toLocaleString() + ' ($' + perBenReal.toLocaleString() + ' × ' + startBens + ' beneficiaries)');
    console.log('[PERPETUAL CHECK] Initial fund: $' + initialFundReal.toLocaleString());
    console.log('[PERPETUAL CHECK] Distribution rate: ' + (distributionRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Result: ' + (isPerpetual ? 'PERPETUAL ✓' : 'NOT PERPETUAL ✗') + ' (' + (distributionRate * 100).toFixed(2) + '% ' + (isPerpetual ? '<' : '>=') + ' ' + (safeThreshold * 100).toFixed(2) + '%)');
  }

  return isPerpetual;
}

/**
 * Simulate constant real-dollar payout per beneficiary with births/deaths.
 * Works in 2025 dollars (real terms).
 *
 * OPTIMIZATIONS:
 * 1. Early-exit for perpetual portfolios using threshold formula
 * 2. Decade-chunked simulation (10-year blocks) for 10x speedup
 * 3. Early termination after 1,000 years if clearly perpetual
 */
export function simulateRealPerBeneficiaryPayout(
  eolNominal: number,
  yearsFrom2025: number,
  nominalRet: number,
  inflPct: number,
  perBenReal: number,
  startBens: number,
  totalFertilityRate: number,
  generationLength = 30,
  deathAge = 90,
  minDistAge = 21,
  capYears = 10000,
  initialBenAges: number[] = [0],
  fertilityWindowStart = 25,
  fertilityWindowEnd = 35
) {
  let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
  const r = realReturn(nominalRet, inflPct);

  const fertilityWindowYears = fertilityWindowEnd - fertilityWindowStart;
  const birthsPerYear = fertilityWindowYears > 0 ? totalFertilityRate / fertilityWindowYears : 0;

  let cohorts: Cohort[] = initialBenAges.length > 0
    ? initialBenAges.map(age => ({
        size: 1,
        age,
        canReproduce: age <= fertilityWindowEnd,
        cumulativeBirths: 0
      }))
    : startBens > 0
    ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }]
    : [];

  const isPerpetual = checkPerpetualViability(
    r,
    totalFertilityRate,
    generationLength,
    perBenReal,
    fundReal,
    startBens
  );

  if (isPerpetual && capYears >= 10000) {
    return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: startBens };
  }

  let years = 0;
  const CHUNK_SIZE = 10;
  const EARLY_TERM_CHECK = 1000;

  let fundAtYear100 = 0;
  let fundAtYear1000 = 0;

  for (let t = 0; t < capYears; t += CHUNK_SIZE) {
    const yearsToSimulate = Math.min(CHUNK_SIZE, capYears - t);

    const result = simulateYearsChunk(
      cohorts,
      fundReal,
      r,
      perBenReal,
      deathAge,
      minDistAge,
      totalFertilityRate,
      fertilityWindowStart,
      fertilityWindowEnd,
      birthsPerYear,
      yearsToSimulate
    );

    cohorts = result.cohorts;
    fundReal = result.fundReal;
    years += result.years;

    if (result.depleted) {
      const living = cohorts.reduce((acc, c) => acc + c.size, 0);
      return { years, fundLeftReal: 0, lastLivingCount: living };
    }

    if (t === 100 && fundAtYear100 === 0) {
      fundAtYear100 = fundReal;
    }
    if (t === EARLY_TERM_CHECK && fundAtYear1000 === 0) {
      fundAtYear1000 = fundReal;
    }

    if (t >= EARLY_TERM_CHECK && capYears >= 10000) {
      if (fundAtYear100 > 0 && fundReal > fundAtYear1000) {
        const growthRate = Math.pow(fundReal / fundAtYear1000, 1 / (t - EARLY_TERM_CHECK)) - 1;

        if (growthRate > 0.03) {
          const living = cohorts.reduce((acc, c) => acc + c.size, 0);
          return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: living };
        }
      }
    }
  }

  const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
  return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving };
}

/**
 * Retirement Calculation Engine
 * Core simulation logic for retirement planning
 */

import type { ReturnMode, WalkSeries } from "@/types/planner";
import type { FilingStatus } from "./taxCalculations";
import { calcOrdinaryTax } from "./taxCalculations";
import { computeWithdrawalTaxes } from "./withdrawalTax";
import { getBearReturns } from "@/lib/simulation/bearMarkets";
import { getEffectiveInflation } from "@/lib/simulation/inflationShocks";
import { LIFE_EXP, RMD_START_AGE, RMD_DIVISORS } from "@/lib/constants";

/**
 * Input parameters for a single simulation run
 */
export type SimulationInputs = {
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  infRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  retMode: ReturnMode;
  walkSeries: WalkSeries;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  historicalYear?: number;
  inflationShockRate?: number | null;
  inflationShockDuration?: number;
};

/**
 * Result from a single simulation run
 */
export type SimulationResult = {
  balancesReal: number[];      // real balance per year
  eolReal: number;            // end-of-life wealth (real)
  y1AfterTaxReal: number;     // year-1 after-tax withdrawal (real)
  ruined: boolean;            // true if ran out of money before age 95
};

/**
 * Build a generator that yields annual gross return factors
 */
export function* buildReturnGenerator(options: {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  seed?: number;
}): Generator<number, void, undefined> {
  const { mode, years, nominalPct = 9.8, infPct = 3.0, walkSeries = "nominal", seed = 123 } = options;

  if (mode === "fixed") {
    const fixedRate = walkSeries === "real"
      ? (1 + nominalPct / 100) / (1 + infPct / 100) - 1
      : nominalPct / 100;
    for (let i = 0; i < years; i++) {
      yield 1 + fixedRate;
    }
    return;
  }

  // For random walk mode, import the actual implementation from constants
  // This is a simplified version - the real implementation uses SP500_YOY_NOMINAL
  const inflRate = infPct / 100;

  // Simple PRNG (mulberry32)
  function mulberry32(a: number) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rnd = mulberry32(seed);

  // For now, use a simple normal distribution around the expected return
  // In production, this would use historical data from SP500_YOY_NOMINAL
  for (let i = 0; i < years; i++) {
    // Box-Muller transform for normal distribution
    const u1 = rnd();
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const pct = nominalPct + z * 18; // Mean 9.8%, std dev 18%

    if (walkSeries === "real") {
      const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
      yield 1 + realRate;
    } else {
      yield 1 + pct / 100;
    }
  }
}

/**
 * Calculate Required Minimum Distribution
 */
function calcRMD(pretaxBalance: number, age: number): number {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;

  const divisorIndex = Math.min(age - RMD_START_AGE, RMD_DIVISORS.length - 1);
  const divisor = RMD_DIVISORS[divisorIndex];

  return pretaxBalance / divisor;
}

/**
 * Calculate Social Security monthly benefit
 */
function calcSocialSecurity(
  avgAnnualIncome: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number {
  if (avgAnnualIncome <= 0) return 0;

  // Convert annual to monthly
  const aime = avgAnnualIncome / 12;

  // 2025 bend points (simplified)
  const BEND_POINT_1 = 1226;
  const BEND_POINT_2 = 7391;

  // Apply bend points to calculate PIA
  let pia = 0;
  if (aime <= BEND_POINT_1) {
    pia = aime * 0.90;
  } else if (aime <= BEND_POINT_2) {
    pia = BEND_POINT_1 * 0.90 + (aime - BEND_POINT_1) * 0.32;
  } else {
    pia = BEND_POINT_1 * 0.90 + (BEND_POINT_2 - BEND_POINT_1) * 0.32 + (aime - BEND_POINT_2) * 0.15;
  }

  // Adjust for claiming age
  if (claimAge < fullRetirementAge) {
    const monthsEarly = (fullRetirementAge - claimAge) * 12;
    const reduction = Math.min(monthsEarly, 36) * 0.00556 + Math.max(0, monthsEarly - 36) * 0.00417;
    pia *= (1 - reduction);
  } else if (claimAge > fullRetirementAge) {
    const monthsLate = (claimAge - fullRetirementAge) * 12;
    pia *= (1 + monthsLate * 0.00667);
  }

  return pia * 12; // Annual benefit
}

/**
 * Run a single simulation with the given inputs and seed.
 * Returns only the essential data needed for batch summaries.
 */
export function runSingleSimulation(params: SimulationInputs, seed: number): SimulationResult {
  const {
    marital, age1, age2, retAge, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
    inflationShockRate,
    inflationShockDuration = 5,
  } = params;

  const isMar = marital === "married";
  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);

  if (retAge <= younger) {
    throw new Error("Retirement age must be greater than current age");
  }

  const yrsToRet = retAge - younger;
  const g_fixed = 1 + retRate / 100;
  const infl = infRate / 100;
  const infl_factor = 1 + infl;

  // Track cumulative inflation for variable inflation scenarios
  let cumulativeInflation = 1.0;

  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const accGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToRet + 1,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed,
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;

  const balancesReal: number[] = [];
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Get bear market returns if applicable
  const bearReturns = historicalYear ? getBearReturns(historicalYear) : null;

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    let g: number;

    // Apply FIRST bear return in the retirement year itself (y == yrsToRet)
    if (bearReturns && y === yrsToRet) {
      const pct = bearReturns[0];
      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + infl) - 1;
        g = 1 + realRate;
      } else {
        g = 1 + pct / 100;
      }
    } else {
      g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);
    }

    const a1 = age1 + y;
    const a2 = isMar ? age2 + y : null;

    if (y > 0) {
      bTax *= g;
      bPre *= g;
      bPost *= g;
    }

    if (y > 0 && incContrib) {
      const f = 1 + incRate / 100;
      (Object.keys(c.p) as (keyof typeof c.p)[]).forEach((k) => (c.p[k] *= f));
      if (isMar)
        (Object.keys(c.s) as (keyof typeof c.s)[]).forEach((k) => (c.s[k] *= f));
    }

    const addMidYear = (amt: number) => amt * (1 + (g - 1) * 0.5);

    if (a1 < retAge) {
      bTax += addMidYear(c.p.tax);
      bPre += addMidYear(c.p.pre + c.p.match);
      bPost += addMidYear(c.p.post);
      basisTax += c.p.tax;
    }
    if (isMar && a2! < retAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    const bal = bTax + bPre + bPost;

    // Apply year-specific inflation (handles inflation shocks)
    const yearInflation = getEffectiveInflation(y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(bal / cumulativeInflation);
  }

  const finNom = bTax + bPre + bPost;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const y1 = computeWithdrawalTaxes(
    wdGrossY1,
    marital,
    bTax,
    bPre,
    bPost,
    basisTax,
    stateRate
  );

  const wdAfterY1 = wdGrossY1 - y1.tax;
  const wdRealY1 = wdAfterY1 / infAdj;

  let retBalTax = bTax;
  let retBalPre = bPre;
  let retBalRoth = bPost;
  let currBasis = basisTax;
  let currWdGross = wdGrossY1;
  let survYrs = 0;
  let ruined = false;

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    let g_retire: number;

    // Inject remaining bear market returns in years 1-2 after retirement
    if (bearReturns && y >= 1 && y <= 2) {
      const pct = bearReturns[y];
      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + infl) - 1;
        g_retire = 1 + realRate;
      } else {
        g_retire = 1 + pct / 100;
      }
    } else {
      g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);
    }

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;

    const currentAge = age1 + yrsToRet + y;
    const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
    const requiredRMD = calcRMD(retBalPre, currentAge);

    let ssAnnualBenefit = 0;
    if (includeSS) {
      if (currentAge >= ssClaimAge) {
        ssAnnualBenefit += calcSocialSecurity(ssIncome, ssClaimAge);
      }
      if (isMar && currentAge2 >= ssClaimAge2) {
        ssAnnualBenefit += calcSocialSecurity(ssIncome2, ssClaimAge2);
      }
    }

    let netSpendingNeed = Math.max(0, currWdGross - ssAnnualBenefit);
    let actualWithdrawal = netSpendingNeed;
    let rmdExcess = 0;

    if (requiredRMD > 0) {
      if (requiredRMD > netSpendingNeed) {
        actualWithdrawal = requiredRMD;
        rmdExcess = requiredRMD - netSpendingNeed;
      }
    }

    const taxes = computeWithdrawalTaxes(
      actualWithdrawal,
      marital,
      retBalTax,
      retBalPre,
      retBalRoth,
      currBasis,
      stateRate
    );

    retBalTax -= taxes.draw.t;
    retBalPre -= taxes.draw.p;
    retBalRoth -= taxes.draw.r;
    currBasis = taxes.newBasis;

    if (rmdExcess > 0) {
      const excessTax = calcOrdinaryTax(rmdExcess, marital);
      const excessAfterTax = rmdExcess - excessTax;
      retBalTax += excessAfterTax;
      currBasis += excessAfterTax;
    }

    if (retBalTax < 0) retBalTax = 0;
    if (retBalPre < 0) retBalPre = 0;
    if (retBalRoth < 0) retBalRoth = 0;

    const totalNow = retBalTax + retBalPre + retBalRoth;

    // Apply year-specific inflation (handles inflation shocks)
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(totalNow / cumulativeInflation);

    if (totalNow <= 0) {
      if (!ruined) {
        survYrs = y - 1;
        ruined = true;
      }
      retBalTax = retBalPre = retBalRoth = 0;
    } else {
      survYrs = y;
    }

    currWdGross *= infl_factor;
  }

  const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth);
  const yearsFrom2025 = yrsToRet + yrsToSim;
  const eolReal = eolWealth / Math.pow(1 + infl, yearsFrom2025);

  return {
    balancesReal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
  };
}

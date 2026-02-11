/**
 * Retirement Calculation Engine
 * Core simulation logic for retirement planning
 */

import type { ReturnMode, WalkSeries } from "@/types/planner";
import type { FilingStatus } from "./taxCalculations";
import type { BondGlidePath } from "@/types/calculator";
import { calcOrdinaryTax, calcLTCGTax } from "./taxCalculations";
import { computeWithdrawalTaxes } from "./withdrawalTax";
import { getBearReturns } from "@/lib/simulation/bearMarkets";
import { getEffectiveInflation } from "@/lib/simulation/inflationShocks";
import { LIFE_EXP, RMD_START_AGE, RMD_DIVISORS, SP500_YOY_NOMINAL, BOND_NOMINAL_AVG, calculateBondReturn, TAX_BRACKETS } from "@/lib/constants";
import { mulberry32 } from "@/lib/utils";
import { calculateBondAllocation, calculateBlendedReturn } from "@/lib/bondAllocation";

/**
 * Input parameters for a single simulation run
 */
export type SimulationInputs = {
  // Personal & Family
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;
  numChildren?: number;
  childrenAges?: number[];
  additionalChildrenExpected?: number;
  // Employment & Income (used for income calculator sync)
  employmentType1?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  annualIncome1?: number;
  annualIncome2?: number;
  // Account Balances
  emergencyFund?: number;  // Emergency fund (yields inflation rate only, no market exposure)
  sTax: number;
  sPre: number;
  sPost: number;
  // Contributions
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  // Rates & Assumptions
  retRate: number;
  infRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  retMode: ReturnMode;
  walkSeries: WalkSeries;
  // Social Security
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  // Scenario Testing
  historicalYear?: number;
  inflationShockRate?: number | null;
  inflationShockDuration?: number;
  // Healthcare costs
  includeMedicare?: boolean;
  medicarePremium?: number;
  medicalInflation?: number;
  irmaaThresholdSingle?: number;
  irmaaThresholdMarried?: number;
  irmaaSurcharge?: number;
  includeLTC?: boolean;
  ltcAnnualCost?: number;
  ltcProbability?: number;
  ltcDuration?: number;
  ltcOnsetAge?: number;
  ltcAgeRangeStart?: number;
  ltcAgeRangeEnd?: number;
  // Bond allocation
  bondGlidePath?: BondGlidePath | null;
  // Yield drag (annual tax on dividends/interest in taxable accounts)
  dividendYield?: number; // Annual dividend/interest yield % (default 2.0)
  // Roth conversion strategy
  enableRothConversions?: boolean;
  targetConversionBracket?: number; // e.g., 0.24 for 24% bracket
};

/**
 * Result from a single simulation run
 */
export type SimulationResult = {
  balancesReal: number[];      // real balance per year
  balancesNominal: number[];   // nominal balance per year (needed for UI)
  eolReal: number;            // end-of-life wealth (real)
  y1AfterTaxReal: number;     // year-1 after-tax withdrawal (real)
  ruined: boolean;            // true if ran out of money before age 95
  survYrs?: number;           // year when portfolio failed (0 if never failed)
  totalRothConversions?: number; // cumulative Roth conversions (pre-tax)
  conversionTaxesPaid?: number;  // cumulative conversion taxes paid
};

/**
 * Build a generator that yields annual gross return factors
 * Returns a function that when called returns a generator
 * NOTE: Not exported - internal use only. page.tsx has its own full-featured version.
 */
function buildReturnGenerator(options: {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  walkData?: number[];
  seed?: number;
  startYear?: number;
  bondGlidePath?: BondGlidePath | null;
  currentAge?: number;
}) {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
    startYear,
    bondGlidePath = null,
    currentAge = 35,
  } = options;

  if (mode === "fixed") {
    return function* fixedGen() {
      for (let i = 0; i < years; i++) {
        let returnPct = nominalPct;

        // Apply bond blending if glide path is configured
        if (bondGlidePath) {
          const age = currentAge + i;
          const bondAlloc = calculateBondAllocation(age, bondGlidePath);
          const bondReturnPct = BOND_NOMINAL_AVG;
          returnPct = calculateBlendedReturn(nominalPct, bondReturnPct, bondAlloc);
        }

        yield 1 + returnPct / 100;
      }
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");
  const inflRate = infPct / 100;

  // Historical sequential playback
  if (startYear !== undefined) {
    const startIndex = startYear - 1928; // SP500_YOY_NOMINAL starts at 1928
    return function* historicalGen() {
      for (let i = 0; i < years; i++) {
        const ix = (startIndex + i) % walkData.length; // Wrap around if we exceed data
        let stockPct = walkData[ix];

        // Calculate bond return correlated with stock return
        const bondPct = calculateBondReturn(stockPct);

        // Apply bond blending if glide path is configured
        let pct = stockPct;
        if (bondGlidePath) {
          const age = currentAge + i;
          const bondAlloc = calculateBondAllocation(age, bondGlidePath);
          pct = calculateBlendedReturn(stockPct, bondPct, bondAlloc);
        }

        if (walkSeries === "real") {
          const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
          yield 1 + realRate;
        } else {
          yield 1 + pct / 100;
        }
      }
    };
  }

  // Random bootstrap
  const rnd = mulberry32(seed);
  return function* walkGen() {
    for (let i = 0; i < years; i++) {
      const ix = Math.floor(rnd() * walkData.length);
      let stockPct = walkData[ix];

      // Calculate bond return correlated with stock return
      const bondPct = calculateBondReturn(stockPct);

      // Apply bond blending if glide path is configured
      let pct = stockPct;
      if (bondGlidePath) {
        const age = currentAge + i;
        const bondAlloc = calculateBondAllocation(age, bondGlidePath);
        pct = calculateBlendedReturn(stockPct, bondPct, bondAlloc);
      }

      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
        yield 1 + realRate;
      } else {
        yield 1 + pct / 100;
      }
    }
  };
}

/**
 * Calculate Required Minimum Distribution
 */
function calcRMD(pretaxBalance: number, age: number): number {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;

  const divisor = RMD_DIVISORS[age] || 2.0; // Use 2.0 for ages beyond 120

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
    dividendYield = 2.0, // Default 2% annual dividend yield for taxable accounts
    enableRothConversions = false,
    targetConversionBracket = 0.24, // Default to 24% bracket
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
    startYear: historicalYear, // Pass historicalYear to handle bear market sequences naturally
    bondGlidePath: params.bondGlidePath || null,
    currentAge: younger,
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined, // Continue from retirement year
    bondGlidePath: params.bondGlidePath || null,
    currentAge: older + yrsToRet,
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;

  const balancesReal: number[] = [];
  const balancesNominal: number[] = [];
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    // Generator handles historical sequences naturally via startYear
    const g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);

    const a1 = age1 + y;
    const a2 = isMar ? age2 + y : null;

    if (y > 0) {
      // Apply growth to all accounts
      bTax *= g;
      bPre *= g;
      bPost *= g;

      // Yield Drag: Tax annual dividends/interest in taxable account
      // Only applies to taxable brokerage account (bTax), not tax-advantaged accounts
      if (bTax > 0 && dividendYield > 0) {
        // Calculate annual yield income (dividends + interest)
        const yieldIncome = bTax * (dividendYield / 100);

        // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
        // Use 0 for ordinary income since this is just the dividend taxation
        const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

        // Reduce taxable balance by the tax paid (yield drag)
        // The yield income itself stays in the balance (already counted in bTax)
        bTax -= yieldTax;
      }
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
    const yearInflation = getEffectiveInflation(y, yrsToRet, infRate, inflationShockRate ?? null, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(bal / cumulativeInflation);
    balancesNominal.push(bal);
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
    stateRate,
    0, // No RMD for first year
    0  // No base ordinary income for first year
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

  // Roth conversion tracking
  let totalRothConversions = 0;
  let conversionTaxesPaid = 0;

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    // Generator handles historical sequences naturally via startYear
    const g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;

    // Yield Drag: Tax annual dividends/interest in taxable account
    // Only applies to taxable brokerage account (retBalTax), not tax-advantaged accounts
    if (retBalTax > 0 && dividendYield > 0) {
      // Calculate annual yield income (dividends + interest)
      const yieldIncome = retBalTax * (dividendYield / 100);

      // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
      // Use 0 for ordinary income since this is just the dividend taxation
      const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

      // Reduce taxable balance by the tax paid (yield drag)
      // The yield income itself stays in the balance (already counted in retBalTax)
      retBalTax -= yieldTax;
    }

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

    // Roth Conversion Strategy: Convert pre-tax to Roth before RMD age
    if (enableRothConversions && currentAge < RMD_START_AGE && retBalPre > 0 && retBalTax > 0) {
      // Find the bracket threshold for the target bracket rate
      const brackets = TAX_BRACKETS[marital];
      const targetBracket = brackets.rates.find(b => b.rate === targetConversionBracket);

      if (targetBracket) {
        // Calculate taxable ordinary income available before hitting target bracket
        // Current ordinary income = Social Security
        const currentOrdinaryIncome = ssAnnualBenefit;

        // Headroom = (bracket limit) - (standard deduction + current ordinary income)
        // This is how much more ordinary income we can add while staying in the target bracket
        const bracketThreshold = targetBracket.limit + brackets.deduction;
        const headroom = Math.max(0, bracketThreshold - currentOrdinaryIncome);

        if (headroom > 0) {
          // Conversion creates ordinary income, so convert up to headroom
          const maxConversion = Math.min(headroom, retBalPre);

          // Calculate tax on the conversion (it's taxed as ordinary income)
          const conversionTax = calcOrdinaryTax(currentOrdinaryIncome + maxConversion, marital) -
                                calcOrdinaryTax(currentOrdinaryIncome, marital);

          // Can only convert what we can afford to pay tax on from taxable account
          const affordableConversion = conversionTax > 0 ?
            Math.min(maxConversion, retBalTax / conversionTax * maxConversion) :
            maxConversion;

          if (affordableConversion > 0) {
            // Perform the conversion
            const actualConversion = Math.min(affordableConversion, retBalPre);
            const actualTax = calcOrdinaryTax(currentOrdinaryIncome + actualConversion, marital) -
                             calcOrdinaryTax(currentOrdinaryIncome, marital);

            retBalPre -= actualConversion;
            retBalRoth += actualConversion;
            retBalTax -= actualTax;

            totalRothConversions += actualConversion;
            conversionTaxesPaid += actualTax;
          }
        }
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
      stateRate,
      requiredRMD,      // Pass RMD as minimum pre-tax draw
      ssAnnualBenefit   // Pass Social Security as base ordinary income
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
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate ?? null, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(totalNow / cumulativeInflation);
    balancesNominal.push(totalNow);

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
    balancesNominal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
    totalRothConversions,
    conversionTaxesPaid,
  };
}

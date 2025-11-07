// simulation.worker.ts - Web Worker for Monte Carlo retirement simulations

import type { Inputs, SimResult, BatchSummary, ReturnMode, WalkSeries, FilingStatus } from "@/types/planner";
import {
  LIFE_EXP,
  RMD_START_AGE,
  RMD_DIVISORS,
  SS_BEND_POINTS,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  SP500_YOY_NOMINAL,
} from "@/lib/constants";
import { mulberry32, percentile } from "@/lib/utils";

/** ===============================
 * Tax Calculation Helpers
 * ================================ */

const calcOrdinaryTax = (income: number, status: FilingStatus) => {
  if (income <= 0) return 0;
  const { rates, deduction } = TAX_BRACKETS[status];
  let adj = Math.max(0, income - deduction);
  let tax = 0;
  let prev = 0;
  for (const b of rates) {
    const amount = Math.min(adj, b.limit - prev);
    tax += amount * b.rate;
    adj -= amount;
    prev = b.limit;
    if (adj <= 0) break;
  }
  return tax;
};

const calcLTCGTax = (
  capGain: number,
  status: FilingStatus,
  ordinaryIncome: number
) => {
  if (capGain <= 0) return 0;
  const brackets = LTCG_BRACKETS[status];
  let remainingGain = capGain;
  let tax = 0;
  let used = 0;

  for (const b of brackets) {
    const bracketRoom = Math.max(0, b.limit - used - ordinaryIncome);
    const taxedHere = Math.min(remainingGain, bracketRoom);
    if (taxedHere > 0) {
      tax += taxedHere * b.rate;
      remainingGain -= taxedHere;
    }
    used = b.limit - ordinaryIncome;
    if (remainingGain <= 0) break;
  }

  if (remainingGain > 0) {
    const topRate = brackets[brackets.length - 1].rate;
    tax += remainingGain * topRate;
  }
  return tax;
};

const calcNIIT = (
  investmentIncome: number,
  status: FilingStatus,
  modifiedAGI: number
) => {
  if (investmentIncome <= 0) return 0;
  const threshold = NIIT_THRESHOLD[status];
  const excess = Math.max(0, modifiedAGI - threshold);
  if (excess <= 0) return 0;
  const base = Math.min(investmentIncome, excess);
  return base * 0.038;
};

const calcSocialSecurity = (
  avgAnnualIncome: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number => {
  if (avgAnnualIncome <= 0) return 0;

  const aime = avgAnnualIncome / 12;

  let pia = 0;
  if (aime <= SS_BEND_POINTS.first) {
    pia = aime * 0.90;
  } else if (aime <= SS_BEND_POINTS.second) {
    pia = SS_BEND_POINTS.first * 0.90 + (aime - SS_BEND_POINTS.first) * 0.32;
  } else {
    pia = SS_BEND_POINTS.first * 0.90 +
          (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 +
          (aime - SS_BEND_POINTS.second) * 0.15;
  }

  const monthsFromFRA = (claimAge - fullRetirementAge) * 12;
  let adjustmentFactor = 1.0;

  if (monthsFromFRA < 0) {
    const earlyMonths = Math.abs(monthsFromFRA);
    if (earlyMonths <= 36) {
      adjustmentFactor = 1 - (earlyMonths * 5/9 / 100);
    } else {
      adjustmentFactor = 1 - (36 * 5/9 / 100) - ((earlyMonths - 36) * 5/12 / 100);
    }
  } else if (monthsFromFRA > 0) {
    adjustmentFactor = 1 + (monthsFromFRA * 2/3 / 100);
  }

  return pia * adjustmentFactor * 12;
};

const calcRMD = (pretaxBalance: number, age: number): number => {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;
  const divisor = RMD_DIVISORS[age] || 2.0;
  return pretaxBalance / divisor;
};

const calcEstateTax = (totalEstate: number, status: FilingStatus = "single"): number => {
  const exemption = ESTATE_TAX_EXEMPTION[status];
  if (totalEstate <= exemption) return 0;
  const taxableEstate = totalEstate - exemption;
  return taxableEstate * ESTATE_TAX_RATE;
};

/** ===============================
 * Return Generator
 * ================================ */

function buildReturnGenerator(options: {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  walkData?: number[];
  seed?: number;
}) {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
  } = options;

  if (mode === "fixed") {
    const g = 1 + nominalPct / 100;
    return function* fixedGen() {
      for (let i = 0; i < years; i++) yield g;
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");
  const rnd = mulberry32(seed);
  const inflRate = infPct / 100;

  return function* walkGen() {
    for (let i = 0; i < years; i++) {
      const ix = Math.floor(rnd() * walkData.length);
      let pct = walkData[ix];

      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
        yield 1 + realRate;
      } else {
        yield 1 + pct / 100;
      }
    }
  };
}

/** ===============================
 * Single Simulation
 * ================================ */

function runSingleSimulation(params: Inputs, seed: number): SimResult {
  const {
    marital, age1, age2, retAge, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
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

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    const g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);

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
    balancesReal.push(bal / Math.pow(1 + infl, y));
  }

  const finNom = bTax + bPre + bPost;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const computeWithdrawalTaxes = (
    gross: number,
    status: FilingStatus,
    taxableBal: number,
    pretaxBal: number,
    rothBal: number,
    taxableBasis: number,
    statePct: number
  ) => {
    const totalBal = taxableBal + pretaxBal + rothBal;
    if (totalBal <= 0 || gross <= 0)
      return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

    const shareT = totalBal > 0 ? taxableBal / totalBal : 0;
    const shareP = totalBal > 0 ? pretaxBal / totalBal : 0;
    const shareR = totalBal > 0 ? rothBal / totalBal : 0;

    let drawT = gross * shareT;
    let drawP = gross * shareP;
    let drawR = gross * shareR;

    const fixShortfall = (want: number, have: number) => Math.min(want, have);

    const usedT = fixShortfall(drawT, taxableBal);
    let shortT = drawT - usedT;

    const usedP = fixShortfall(drawP + shortT, pretaxBal);
    let shortP = drawP + shortT - usedP;

    const usedR = fixShortfall(drawR + shortP, rothBal);

    drawT = usedT;
    drawP = usedP;
    drawR = usedR;

    const unrealizedGain = Math.max(0, taxableBal - taxableBasis);
    const gainRatio = taxableBal > 0 ? unrealizedGain / taxableBal : 0;
    const drawT_Gain = drawT * gainRatio;
    const drawT_Basis = drawT - drawT_Gain;

    const ordinaryIncome = drawP;
    const capGains = drawT_Gain;

    const fedOrd = calcOrdinaryTax(ordinaryIncome, status);
    const fedCap = calcLTCGTax(capGains, status, ordinaryIncome);
    const magi = ordinaryIncome + capGains;
    const niit = calcNIIT(capGains, status, magi);
    const stateTax = (ordinaryIncome + capGains) * (statePct / 100);

    const totalTax = fedOrd + fedCap + niit + stateTax;
    const newBasis = Math.max(0, taxableBasis - drawT_Basis);

    return {
      tax: totalTax,
      ordinary: fedOrd,
      capgain: fedCap,
      niit,
      state: stateTax,
      draw: { t: drawT, p: drawP, r: drawR },
      newBasis,
    };
  };

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
    const g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);

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
    balancesReal.push(totalNow / Math.pow(1 + infl, yrsToRet + y));

    if (totalNow <= 0) {
      survYrs = y - 1;
      ruined = true;
      retBalTax = retBalPre = retBalRoth = 0;
      break;
    }
    survYrs = y;

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

/** ===============================
 * 1,000 Simulation Monte Carlo
 * ================================ */

async function run1000Simulations(params: Inputs, baseSeed: number): Promise<BatchSummary> {
  const N = 1000;

  // Generate 1,000 random seeds from the baseSeed
  const rng = mulberry32(baseSeed);
  const seeds: number[] = [];
  for (let i = 0; i < N; i++) {
    seeds.push(Math.floor(rng() * 1000000));
  }

  // Intermediate storage (don't store full SimResult objects to save memory)
  const eolValues: number[] = [];
  const y1Values: number[] = [];
  const ruinedCount = { count: 0 };

  // Store all balancesReal arrays to compute percentiles later
  const allBalancesReal: number[][] = [];

  // Run all 1,000 simulations
  for (let i = 0; i < N; i++) {
    // Yield to event loop periodically (every 50 iterations)
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const result = runSingleSimulation(params, seeds[i]);

    // Store only what we need for percentile calculations
    eolValues.push(result.eolReal);
    y1Values.push(result.y1AfterTaxReal);
    if (result.ruined) ruinedCount.count++;
    allBalancesReal.push(result.balancesReal);
  }

  // Calculate percentiles for end-of-life and year-1 values
  const eolReal_p10 = percentile(eolValues, 10);
  const eolReal_p50 = percentile(eolValues, 50);
  const eolReal_p90 = percentile(eolValues, 90);

  const y1AfterTaxReal_p10 = percentile(y1Values, 10);
  const y1AfterTaxReal_p50 = percentile(y1Values, 50);
  const y1AfterTaxReal_p90 = percentile(y1Values, 90);

  // Calculate time-series percentiles (p10, p50, p90 for each year)
  const T = allBalancesReal[0].length;
  const p10BalancesReal: number[] = [];
  const p50BalancesReal: number[] = [];
  const p90BalancesReal: number[] = [];

  for (let t = 0; t < T; t++) {
    const col = allBalancesReal.map(balances => balances[t]);
    p10BalancesReal.push(percentile(col, 10));
    p50BalancesReal.push(percentile(col, 50));
    p90BalancesReal.push(percentile(col, 90));
  }

  const probRuin = ruinedCount.count / N;

  return {
    p10BalancesReal,
    p50BalancesReal,
    p90BalancesReal,
    eolReal_p10,
    eolReal_p50,
    eolReal_p90,
    y1AfterTaxReal_p10,
    y1AfterTaxReal_p50,
    y1AfterTaxReal_p90,
    probRuin,
    allRuns: [], // Don't return the 1,000 runs to save memory
  };
}

/** ===============================
 * Worker Message Handler
 * ================================ */

self.onmessage = async (event: MessageEvent) => {
  const { params, seed } = event.data;

  try {
    const summary = await run1000Simulations(params, seed);
    self.postMessage(summary);
  } catch (error: any) {
    self.postMessage({ error: error.message || "Simulation failed" });
  }
};

export {};

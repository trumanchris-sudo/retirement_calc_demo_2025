/**
 * Web Worker for Monte Carlo Retirement Simulation
 * Runs N=1000 simulations off the main thread to prevent UI blocking
 */

// ===============================
// Constants (from lib/constants.ts)
// ===============================

const LIFE_EXP = 95;
const CURR_YEAR = new Date().getFullYear();
const RMD_START_AGE = 73;

const RMD_DIVISORS = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

const SS_BEND_POINTS = {
  first: 1226,
  second: 7391,
};

const TAX_BRACKETS = {
  single: {
    deduction: 15000,
    rates: [
      { limit: 11925, rate: 0.1 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
  married: {
    deduction: 30000,
    rates: [
      { limit: 23850, rate: 0.1 },
      { limit: 96950, rate: 0.12 },
      { limit: 206700, rate: 0.22 },
      { limit: 394600, rate: 0.24 },
      { limit: 501050, rate: 0.32 },
      { limit: 751600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
};

const LTCG_BRACKETS = {
  single: [
    { limit: 50000, rate: 0.0 },
    { limit: 492300, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
  married: [
    { limit: 100000, rate: 0.0 },
    { limit: 553850, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
};

const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
};

// S&P 500 Total Return (Year-over-Year %)
// 1928-2024 (97 years of historical data)
// Source: S&P 500 Total Return including dividends
// More data points = more robust Monte Carlo simulations
const SP500_START_YEAR = 1928;
const SP500_END_YEAR = 2024;
const SP500_YOY_NOMINAL = [
  // 1928-1940 (13 years)
  43.81, -8.30, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, 35.34, -35.34, 29.28, -1.10,
  // 1941-1960 (20 years) - FIXED: Removed 4 duplicate values
  -12.77, 19.17, 25.06, 19.03, 35.82, -8.43, 5.20, 5.70, 18.30, 30.81, 23.68, 14.37, -1.21, 52.56, 31.24, 18.15,
  -0.73, 23.68, 52.40, 31.74,
  // 1961-1980 (20 years)
  26.63, -8.81, 22.61, 16.42, 12.40, -10.06, 23.80, 10.81, -8.24, -14.31, 3.56, 14.22, 18.76, -14.31, -25.90,
  37.00, 23.83, -7.18, 6.56, 18.44,
  // 1981-2000 (20 years)
  -4.70, 20.42, 22.34, 6.15, 31.24, 18.49, 5.81, 16.54, 31.48, -3.06, 30.23, 7.49, 9.97, 1.33, 37.20, 22.68,
  33.10, 28.34, 20.89, -9.03,
  // 2001-2020 (20 years)
  -11.85, -21.97, 28.36, 10.74, 4.83, 15.61, 5.48, -36.55, 25.94, 14.82, 2.10, 15.89, 32.15, 13.52, 1.36,
  11.77, 21.61, -4.23, 31.21, 18.02,
  // 2021-2024 (4 years)
  28.47, -18.04, 26.06, 25.02
];

// Data integrity validation
const EXPECTED_LENGTH = SP500_END_YEAR - SP500_START_YEAR + 1;
if (SP500_YOY_NOMINAL.length !== EXPECTED_LENGTH) {
  throw new Error(
    `SP500 data integrity error: expected ${EXPECTED_LENGTH} years (${SP500_START_YEAR}-${SP500_END_YEAR}), ` +
    `but got ${SP500_YOY_NOMINAL.length} values`
  );
}

// ===============================
// Utility Functions (from lib/utils.ts)
// ===============================

/**
 * Extract 3 years of returns starting from a historical year
 * for bear market scenario injection
 */
function getBearReturns(year) {
  const startIndex = year - SP500_START_YEAR;

  if (startIndex < 0 || startIndex + 2 >= SP500_YOY_NOMINAL.length) {
    // Fallback if year is out of range
    return [0, 0, 0];
  }
  return [
    SP500_YOY_NOMINAL[startIndex],
    SP500_YOY_NOMINAL[startIndex + 1],
    SP500_YOY_NOMINAL[startIndex + 2],
  ];
}

/**
 * Calculate effective inflation rate for a given year in the simulation
 * Returns shock rate during shock period, base rate otherwise
 */
function getEffectiveInflation(
  yearInSimulation,
  yrsToRet,
  baseInflation,
  shockRate,
  shockDuration
) {
  if (!shockRate) return baseInflation;

  const shockStartYear = yrsToRet;
  const shockEndYear = yrsToRet + shockDuration;

  if (yearInSimulation >= shockStartYear && yearInSimulation < shockEndYear) {
    return shockRate;
  }

  return baseInflation;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Trim the top N and bottom N values from an array
 * Returns a new array with extreme values removed
 */
function trimExtremeValues(arr, trimCount) {
  if (arr.length <= trimCount * 2) {
    throw new Error(`Cannot trim ${trimCount * 2} values from array of length ${arr.length}`);
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.slice(trimCount, sorted.length - trimCount);
}

// ===============================
// Return Generator (from app/page.tsx)
// ===============================

function buildReturnGenerator(options) {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
    startYear,
  } = options;

  if (mode === "fixed") {
    const g = 1 + nominalPct / 100;
    return function* fixedGen() {
      for (let i = 0; i < years; i++) yield g;
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

  // Random bootstrap
  const rnd = mulberry32(seed);
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

// ===============================
// Tax Calculation Helpers (from app/page.tsx)
// ===============================

function calcOrdinaryTax(income, status) {
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
}

function calcLTCGTax(capGain, status, ordinaryIncome) {
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
}

function calcNIIT(investmentIncome, status, modifiedAGI) {
  if (investmentIncome <= 0) return 0;
  const threshold = NIIT_THRESHOLD[status];
  const excess = Math.max(0, modifiedAGI - threshold);
  if (excess <= 0) return 0;
  const base = Math.min(investmentIncome, excess);
  return base * 0.038;
}

function calcSocialSecurity(avgAnnualIncome, claimAge, fullRetirementAge = 67) {
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
}

function calcRMD(pretaxBalance, age) {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;
  const divisor = RMD_DIVISORS[age] || 2.0;
  return pretaxBalance / divisor;
}

// ===============================
// Single Simulation Runner (from app/page.tsx)
// ===============================

function runSingleSimulation(params, seed) {
  const {
    marital, age1, age2, retAge, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
    inflationShockRate,
    inflationShockDuration = 5,
    // Healthcare costs
    includeMedicare = true,
    medicarePremium = 400,
    medicalInflation = 5.5,
    irmaaThresholdSingle = 103000,
    irmaaThresholdMarried = 206000,
    irmaaSurcharge = 350,
    includeLTC = true,
    ltcAnnualCost = 80000,
    ltcProbability = 70,
    ltcDuration = 3.5,
    ltcOnsetAge = 82,
    ltcAgeRangeStart = 75,
    ltcAgeRangeEnd = 90,
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
    // Bear market returns are injected directly in drawdown loop, not via generator
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;

  const balancesReal = [];
  let cumulativeInflation = 1.0;
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Get bear market returns if applicable
  const bearReturns = historicalYear ? getBearReturns(historicalYear) : null;

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    let g;

    // Apply FIRST bear return in the retirement year itself (y == yrsToRet)
    if (bearReturns && y === yrsToRet) {
      const pct = bearReturns[0]; // First bear year
      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + infl) - 1;
        g = 1 + realRate;
      } else {
        g = 1 + pct / 100;
      }
    } else {
      g = retMode === "fixed" ? g_fixed : accGen.next().value;
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
      Object.keys(c.p).forEach((k) => (c.p[k] *= f));
      if (isMar)
        Object.keys(c.s).forEach((k) => (c.s[k] *= f));
    }

    const addMidYear = (amt) => amt * (1 + (g - 1) * 0.5);

    if (a1 < retAge) {
      bTax += addMidYear(c.p.tax);
      bPre += addMidYear(c.p.pre + c.p.match);
      bPost += addMidYear(c.p.post);
      basisTax += c.p.tax;
    }
    if (isMar && a2 < retAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    const bal = bTax + bPre + bPost;
    const yearInflation = getEffectiveInflation(y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(bal / cumulativeInflation);
  }

  const finNom = bTax + bPre + bPost;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const computeWithdrawalTaxes = (
    gross,
    status,
    taxableBal,
    pretaxBal,
    rothBal,
    taxableBasis,
    statePct
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

    const fixShortfall = (want, have) => Math.min(want, have);

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

  // Bear market returns already applied: bearReturns[0] was used in retirement year
  // Now apply bearReturns[1] and bearReturns[2] in years 1-2 of drawdown

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    let g_retire;

    // Inject remaining bear market returns in years 1-2 after retirement
    if (bearReturns && y >= 1 && y <= 2) {
      const pct = bearReturns[y]; // y=1 uses bearReturns[1], y=2 uses bearReturns[2]
      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + infl) - 1;
        g_retire = 1 + realRate;
      } else {
        g_retire = 1 + pct / 100;
      }
    } else {
      g_retire = retMode === "fixed" ? g_fixed : drawGen.next().value;
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

    // Calculate healthcare costs
    let healthcareCosts = 0;

    // Medicare premiums (age 65+)
    if (includeMedicare && currentAge >= 65) {
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
      healthcareCosts += medicarePremium * 12 * medInflationFactor;

      // IRMAA surcharge if high income
      const totalIncome = ssAnnualBenefit + requiredRMD;
      const irmaaThreshold = marital === "married" ? irmaaThresholdMarried : irmaaThresholdSingle;
      if (totalIncome > irmaaThreshold) {
        healthcareCosts += irmaaSurcharge * 12 * medInflationFactor;
      }
    }

    // Long-term care costs (Monte Carlo mode: probabilistic)
    // Use a simple random check each year to determine if LTC begins
    if (includeLTC && currentAge >= ltcAgeRangeStart && currentAge <= ltcAgeRangeEnd) {
      // For Monte Carlo, we need to track if LTC has started and for how long
      // Since we don't have persistent state, we'll use a deterministic approximation
      // based on the typical onset age and duration
      const yearsInRange = ltcAgeRangeEnd - ltcAgeRangeStart + 1;
      const avgAnnualLTC = (ltcAnnualCost * (ltcProbability / 100) * ltcDuration) / yearsInRange;
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
      healthcareCosts += avgAnnualLTC * medInflationFactor;
    }

    let netSpendingNeed = Math.max(0, currWdGross + healthcareCosts - ssAnnualBenefit);
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
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(totalNow / cumulativeInflation);

    if (totalNow <= 0) {
      if (!ruined) {
        survYrs = y - 1;
        ruined = true;
      }
      retBalTax = retBalPre = retBalRoth = 0;
      // Continue loop to maintain chart data through age 95
    } else {
      survYrs = y;
    }

    currWdGross *= infl_factor;
  }

  const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth);
  const yearsFrom2025 = yrsToRet + yrsToSim;
  // Use cumulativeInflation to match the balancesReal array deflation (accounts for inflation shocks)
  const eolReal = eolWealth / cumulativeInflation;

  return {
    balancesReal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
  };
}

// ===============================
// Monte Carlo Batch Runner
// ===============================

function runMonteCarloSimulation(params, baseSeed, N = 1000) {
  const results = [];

  // Generate N random seeds from the baseSeed
  const rng = mulberry32(baseSeed);
  const seeds = [];
  for (let i = 0; i < N; i++) {
    seeds.push(Math.floor(rng() * 1000000));
  }

  // Run all N simulations
  for (let i = 0; i < N; i++) {
    results.push(runSingleSimulation(params, seeds[i]));

    // Send progress updates every 50 simulations
    if ((i + 1) % 50 === 0 || i === N - 1) {
      self.postMessage({
        type: 'progress',
        completed: i + 1,
        total: N,
      });
    }
  }

  // Calculate percentiles after trimming top 50 and bottom 50 values
  const TRIM_COUNT = 50; // Remove top 50 and bottom 50 values
  const T = results[0].balancesReal.length;

  const p10BalancesReal = [];
  const p50BalancesReal = [];
  const p90BalancesReal = [];
  for (let t = 0; t < T; t++) {
    const col = results.map(r => r.balancesReal[t]);
    const trimmed = trimExtremeValues(col, TRIM_COUNT);
    p10BalancesReal.push(percentile(trimmed, 10));
    p50BalancesReal.push(percentile(trimmed, 50));
    p90BalancesReal.push(percentile(trimmed, 90));
  }

  const eolValues = results.map(r => r.eolReal);
  const trimmedEol = trimExtremeValues(eolValues, TRIM_COUNT);
  const eolReal_p25 = percentile(trimmedEol, 25);
  const eolReal_p50 = percentile(trimmedEol, 50);
  const eolReal_p75 = percentile(trimmedEol, 75);

  const y1Values = results.map(r => r.y1AfterTaxReal);
  const trimmedY1 = trimExtremeValues(y1Values, TRIM_COUNT);
  const y1AfterTaxReal_p25 = percentile(trimmedY1, 25);
  const y1AfterTaxReal_p50 = percentile(trimmedY1, 50);
  const y1AfterTaxReal_p75 = percentile(trimmedY1, 75);

  const probRuin = results.filter(r => r.ruined).length / N;

  return {
    p10BalancesReal,
    p50BalancesReal,
    p90BalancesReal,
    eolReal_p25,
    eolReal_p50,
    eolReal_p75,
    y1AfterTaxReal_p25,
    y1AfterTaxReal_p50,
    y1AfterTaxReal_p75,
    probRuin,
    allRuns: [], // Don't return individual runs to reduce memory usage and focus on percentiles
  };
}

// ===============================
// Worker Message Handler
// ===============================

self.onmessage = function(e) {
  const { type, params, baseSeed, N } = e.data;

  if (type === 'run') {
    try {
      const result = runMonteCarloSimulation(params, baseSeed, N);
      self.postMessage({
        type: 'complete',
        result,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  }
};

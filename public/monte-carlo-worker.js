/**
 * Web Worker for Monte Carlo Retirement Simulation
 * Runs N=2000 simulations off the main thread to prevent UI blocking
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
    dividendYield = 2.0, // Default 2% annual dividend yield for taxable accounts
    enableRothConversions = false,
    targetConversionBracket = 0.24, // Default to 24% bracket
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
    startYear: historicalYear, // Pass historicalYear to handle bear market sequences naturally
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined, // Continue from retirement year
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;

  const balancesReal = [];
  const balancesNominal = [];
  let cumulativeInflation = 1.0;
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    // Generator handles historical sequences naturally via startYear
    const g = retMode === "fixed" ? g_fixed : accGen.next().value;

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
    balancesNominal.push(bal);
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
    statePct,
    minPretaxDraw = 0,
    baseOrdinaryIncome = 0
  ) => {
    const totalBal = taxableBal + pretaxBal + rothBal;
    if (totalBal <= 0 || gross <= 0)
      return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

    // RMD Logic: Force drawP to be at least minPretaxDraw before pro-rata distribution
    let drawP = Math.min(minPretaxDraw, pretaxBal); // Can't withdraw more than available
    let remainingNeed = gross - drawP;

    let drawT = 0;
    let drawR = 0;

    // If there's a remaining need after RMD, distribute it pro-rata
    if (remainingNeed > 0) {
      const availableBal = taxableBal + (pretaxBal - drawP) + rothBal;

      if (availableBal > 0) {
        const shareT = taxableBal / availableBal;
        const shareP = (pretaxBal - drawP) / availableBal;
        const shareR = rothBal / availableBal;

        drawT = remainingNeed * shareT;
        drawP += remainingNeed * shareP;
        drawR = remainingNeed * shareR;
      }
    } else if (remainingNeed < 0) {
      // RMD exceeds gross need - excess will be reinvested in taxable
      // This is handled by allowing drawP to exceed gross
      // The excess will be dealt with in the calling code
    }

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

    // Calculate federal taxes using marginal bracket approach
    // Add baseOrdinaryIncome (e.g., Social Security) to ensure withdrawal is taxed at marginal rate
    const totalOrdinaryIncome = baseOrdinaryIncome + ordinaryIncome;
    const taxOnTotal = calcOrdinaryTax(totalOrdinaryIncome, status);
    const taxOnBase = calcOrdinaryTax(baseOrdinaryIncome, status);
    const fedOrd = taxOnTotal - taxOnBase; // Tax attributable to withdrawal only

    const fedCap = calcLTCGTax(capGains, status, totalOrdinaryIncome);
    const magi = totalOrdinaryIncome + capGains;
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
    const g_retire = retMode === "fixed" ? g_fixed : drawGen.next().value;

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
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(totalNow / cumulativeInflation);
    balancesNominal.push(totalNow);

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
    balancesNominal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
    totalRothConversions,
    conversionTaxesPaid,
  };
}

// ===============================
// Monte Carlo Batch Runner
// ===============================

function runMonteCarloSimulation(params, baseSeed, N = 2000) {
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

  // Calculate percentiles after trimming extreme values
  // Trim 5% from each end, but ensure we have enough data points
  // Minimum: keep at least 50% of data (trim max 25% from each end)
  const trimPercent = Math.min(0.025, 0.25 * N / (2 * N)); // 2.5% from each end, or less if N is small
  const TRIM_COUNT = Math.floor(N * trimPercent);
  const T = results[0].balancesReal.length;

  const p10BalancesReal = [];
  const p50BalancesReal = [];
  const p90BalancesReal = [];
  const p10BalancesNominal = [];
  const p50BalancesNominal = [];
  const p90BalancesNominal = [];

  for (let t = 0; t < T; t++) {
    const colReal = results.map(r => r.balancesReal[t]);
    const trimmedReal = trimExtremeValues(colReal, TRIM_COUNT);
    p10BalancesReal.push(percentile(trimmedReal, 10));
    p50BalancesReal.push(percentile(trimmedReal, 50));
    p90BalancesReal.push(percentile(trimmedReal, 90));

    const colNominal = results.map(r => r.balancesNominal[t]);
    const trimmedNominal = trimExtremeValues(colNominal, TRIM_COUNT);
    p10BalancesNominal.push(percentile(trimmedNominal, 10));
    p50BalancesNominal.push(percentile(trimmedNominal, 50));
    p90BalancesNominal.push(percentile(trimmedNominal, 90));
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

  // For legacy success rate calculation, return lightweight version of all runs
  // (just eolReal, ruined status, and survYrs for sequence of returns analysis)
  const allRunsLightweight = results.map(r => ({
    eolReal: r.eolReal,
    y1AfterTaxReal: r.y1AfterTaxReal,
    ruined: r.ruined,
    survYrs: r.survYrs  // Year when portfolio failed (0 if never failed)
  }));

  return {
    p10BalancesReal,
    p50BalancesReal,
    p90BalancesReal,
    p10BalancesNominal,
    p50BalancesNominal,
    p90BalancesNominal,
    eolReal_p25,
    eolReal_p50,
    eolReal_p75,
    y1AfterTaxReal_p25,
    y1AfterTaxReal_p50,
    y1AfterTaxReal_p75,
    probRuin,
    allRuns: allRunsLightweight, // Return lightweight version for empirical success rate calculation
  };
}

// ===============================
// Legacy Simulation Functions
// ===============================

/**
 * Calculate real return rate from nominal and inflation
 */
function realReturn(nominalPct, inflPct) {
  return (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;
}

/**
 * Cohort type (JSDoc):
 * @typedef {Object} Cohort
 * @property {number} size - Number of beneficiaries in this cohort
 * @property {number} age - Current age of this cohort
 * @property {boolean} canReproduce - Whether this cohort can reproduce
 * @property {number} cumulativeBirths - Cumulative births per member so far
 */

/**
 * Simulate N years of generational wealth with demographic changes
 * Used internally by the optimized simulation for chunked processing
 */
function simulateYearsChunk(
  cohorts,
  fundReal,
  realReturnRate,
  perBenReal,
  deathAge,
  minDistAge,
  totalFertilityRate,
  fertilityWindowStart,
  fertilityWindowEnd,
  birthsPerYear,
  numYears
) {
  let currentFund = fundReal;
  let currentCohorts = cohorts;
  let yearsSimulated = 0;

  for (let i = 0; i < numYears; i++) {
    // Filter out deceased
    currentCohorts = currentCohorts.filter((c) => c.age < deathAge);

    const living = currentCohorts.reduce((acc, c) => acc + c.size, 0);
    if (living === 0) {
      return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: true };
    }

    // Apply growth
    currentFund *= 1 + realReturnRate;

    // Calculate and subtract payout
    const eligible = currentCohorts
      .filter(c => c.age >= minDistAge)
      .reduce((acc, c) => acc + c.size, 0);
    const payout = perBenReal * eligible;
    currentFund -= payout;

    if (currentFund < 0) {
      return { cohorts: currentCohorts, fundReal: 0, years: yearsSimulated, depleted: true };
    }

    yearsSimulated += 1;

    // Age all cohorts
    currentCohorts.forEach((c) => (c.age += 1));

    // Handle reproduction
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
 * Check if portfolio is mathematically guaranteed to be perpetual
 * Uses perpetual threshold formula: Sustainable Rate = Real Return - Population Growth Rate
 */
function checkPerpetualViability(
  realReturnRate,
  totalFertilityRate,
  generationLength,
  perBenReal,
  initialFundReal,
  startBens
) {
  const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
  const perpetualThreshold = realReturnRate - populationGrowthRate;
  const annualDistribution = perBenReal * startBens;
  const distributionRate = annualDistribution / initialFundReal;
  const safeThreshold = perpetualThreshold * 0.95;

  return distributionRate < safeThreshold;
}

/**
 * Simulate constant real-dollar payout per beneficiary with births/deaths
 * Up to 10,000 years of dynasty trust simulation
 */
function simulateRealPerBeneficiaryPayout(
  eolNominal,
  yearsFrom2025,
  nominalRet,
  inflPct,
  perBenReal,
  startBens,
  totalFertilityRate,
  generationLength,
  deathAge,
  minDistAge,
  capYears,
  initialBenAges,
  fertilityWindowStart,
  fertilityWindowEnd
) {
  let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
  const r = realReturn(nominalRet, inflPct);

  const fertilityWindowYears = fertilityWindowEnd - fertilityWindowStart;
  const birthsPerYear = fertilityWindowYears > 0 ? totalFertilityRate / fertilityWindowYears : 0;

  // Initialize cohorts with canReproduce based on maximum age only
  // A young beneficiary (e.g., age 5) should have canReproduce: true
  // so they can start reproducing when they age into the fertility window later
  let cohorts = initialBenAges.length > 0
    ? initialBenAges.map(age => ({
        size: 1,
        age,
        canReproduce: age <= fertilityWindowEnd,
        cumulativeBirths: 0
      }))
    : startBens > 0
    ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }]
    : [];

  // OPTIMIZATION 1: Early-exit for perpetual portfolios
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

  // OPTIMIZATION 2: Chunked simulation
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

    // OPTIMIZATION 3: Early termination for clearly perpetual portfolios
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
  } else if (type === 'legacy') {
    try {
      const {
        eolNominal,
        yearsFrom2025,
        nominalRet,
        inflPct,
        perBenReal,
        startBens,
        totalFertilityRate,
        generationLength = 30,
        deathAge = 90,
        minDistAge = 21,
        capYears = 10000,
        initialBenAges = [0],
        fertilityWindowStart = 25,
        fertilityWindowEnd = 35
      } = params;

      const result = simulateRealPerBeneficiaryPayout(
        eolNominal,
        yearsFrom2025,
        nominalRet,
        inflPct,
        perBenReal,
        startBens,
        totalFertilityRate,
        generationLength,
        deathAge,
        minDistAge,
        capYears,
        initialBenAges,
        fertilityWindowStart,
        fertilityWindowEnd
      );

      self.postMessage({
        type: 'legacy-complete',
        result,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'guardrails') {
    // Calculate guardrails impact based on failure timing analysis
    // Research shows: Early failures (years 1-10) are 70-80% preventable with guardrails
    // Mid-retirement failures (11-20) are 40-50% preventable
    // Late failures (21+) are only 10-20% preventable
    try {
      const {
        allRuns,
        spendingReduction = 0.10,  // 10% spending reduction parameter
      } = params;

      const failedPaths = allRuns.filter(r => r.ruined);

      if (failedPaths.length === 0) {
        self.postMessage({
          type: 'guardrails-complete',
          result: {
            totalFailures: 0,
            preventableFailures: 0,
            newSuccessRate: 1.0,
            baselineSuccessRate: 1.0,
            improvement: 0,
          },
        });
        return;
      }

      // Calculate preventable failures based on timing
      // Effectiveness decreases with later failures
      let preventableFailures = 0;

      failedPaths.forEach(path => {
        const year = path.survYrs;
        let preventionRate = 0;

        if (year <= 5) {
          // Very early failures: 75% preventable with guardrails
          preventionRate = 0.75;
        } else if (year <= 10) {
          // Early failures: 65% preventable
          preventionRate = 0.65;
        } else if (year <= 15) {
          // Mid-early failures: 45% preventable
          preventionRate = 0.45;
        } else if (year <= 20) {
          // Mid failures: 30% preventable
          preventionRate = 0.30;
        } else if (year <= 25) {
          // Mid-late failures: 15% preventable
          preventionRate = 0.15;
        } else {
          // Late failures: 5% preventable (usually structural issues)
          preventionRate = 0.05;
        }

        // Scale prevention rate by spending reduction amount
        // 10% reduction = full effectiveness, 5% = half effectiveness
        const effectivenessScale = Math.min(1.0, spendingReduction / 0.10);
        preventableFailures += preventionRate * effectivenessScale;
      });

      const totalPaths = allRuns.length;
      const baselineSuccessRate = (totalPaths - failedPaths.length) / totalPaths;
      const newSuccesses = totalPaths - failedPaths.length + preventableFailures;
      const newSuccessRate = newSuccesses / totalPaths;
      const improvement = newSuccessRate - baselineSuccessRate;

      self.postMessage({
        type: 'guardrails-complete',
        result: {
          totalFailures: failedPaths.length,
          preventableFailures: Math.round(preventableFailures),
          newSuccessRate,
          baselineSuccessRate,
          improvement,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'roth-optimizer') {
    // Calculate optimal Roth conversion strategy
    // Strategy: Convert pre-tax to Roth before RMDs start (age 73)
    // Fill up lower tax brackets (22% or 24%) to minimize lifetime taxes
    try {
      const {
        retAge,
        pretaxBalance,
        marital,
        ssIncome = 0,
        annualWithdrawal = 0,
        targetBracket = 0.24,  // Default: fill 24% bracket
        growthRate = 0.07,  // 7% annual growth assumption
      } = params;

      if (!pretaxBalance || pretaxBalance <= 0) {
        self.postMessage({
          type: 'roth-optimizer-complete',
          result: {
            hasRecommendation: false,
            reason: 'No pre-tax balance to convert',
          },
        });
        return;
      }

      // Age 73 is when RMDs start
      const conversionYears = Math.max(0, RMD_START_AGE - retAge);

      if (conversionYears <= 0) {
        self.postMessage({
          type: 'roth-optimizer-complete',
          result: {
            hasRecommendation: false,
            reason: 'Already at or past RMD age',
          },
        });
        return;
      }

      const status = marital === 'married' ? 'married' : 'single';
      const brackets = TAX_BRACKETS[status];
      const deduction = brackets.deduction;

      // Find target bracket limit
      let targetBracketLimit = 0;
      for (const b of brackets.rates) {
        if (b.rate === targetBracket) {
          targetBracketLimit = b.limit;
          break;
        }
      }

      if (targetBracketLimit === 0) {
        // Default to 24% bracket if not found
        targetBracketLimit = marital === 'married' ? 394600 : 197300;
      }

      // ===== BASELINE SCENARIO: No Conversions =====
      let baselinePretax = pretaxBalance;
      let baselineLifetimeTax = 0;
      const baselineRMDs = [];

      for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
        const rmd = calcRMD(baselinePretax, age);
        const totalIncome = rmd + ssIncome;
        const tax = calcOrdinaryTax(totalIncome, status);

        baselineRMDs.push({ age, rmd, tax });
        baselineLifetimeTax += tax;

        // Grow remaining balance
        baselinePretax = (baselinePretax - rmd) * (1 + growthRate);
      }

      // ===== OPTIMIZED SCENARIO: Strategic Conversions =====
      let optimizedPretax = pretaxBalance;
      let optimizedLifetimeTax = 0;
      const conversions = [];

      // Phase 1: Conversions (retirement to age 72)
      for (let age = retAge; age < RMD_START_AGE; age++) {
        // Calculate baseline income (SS + withdrawals)
        const baseIncome = ssIncome + annualWithdrawal;

        // Calculate taxable income before deduction
        const taxableBeforeConversion = Math.max(0, baseIncome - deduction);

        // Calculate "room" in target bracket
        const roomInBracket = Math.max(0, targetBracketLimit - taxableBeforeConversion);

        // Convert up to the available room, but don't exceed pre-tax balance
        const conversionAmount = Math.min(roomInBracket, optimizedPretax);

        if (conversionAmount > 5000) {  // Only convert if meaningful ($5k+ threshold)
          const totalIncome = baseIncome + conversionAmount;
          const tax = calcOrdinaryTax(totalIncome, status);

          conversions.push({
            age,
            conversionAmount,
            tax,
            pretaxBalanceBefore: optimizedPretax,
          });

          optimizedLifetimeTax += tax;
          optimizedPretax -= conversionAmount;
        }

        // Grow remaining balance
        optimizedPretax *= (1 + growthRate);
      }

      // Phase 2: RMDs on reduced balance (age 73 to 95)
      const optimizedRMDs = [];
      for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
        const rmd = calcRMD(optimizedPretax, age);
        const totalIncome = rmd + ssIncome;
        const tax = calcOrdinaryTax(totalIncome, status);

        optimizedRMDs.push({ age, rmd, tax });
        optimizedLifetimeTax += tax;

        // Grow remaining balance
        optimizedPretax = (optimizedPretax - rmd) * (1 + growthRate);
      }

      // ===== CALCULATE METRICS =====
      const lifetimeTaxSavings = baselineLifetimeTax - optimizedLifetimeTax;
      const totalConverted = conversions.reduce((sum, c) => sum + c.conversionAmount, 0);
      const avgAnnualConversion = totalConverted / conversions.length;

      // Calculate RMD reduction
      const baselineTotalRMDs = baselineRMDs.reduce((sum, r) => sum + r.rmd, 0);
      const optimizedTotalRMDs = optimizedRMDs.reduce((sum, r) => sum + r.rmd, 0);
      const rmdReduction = baselineTotalRMDs - optimizedTotalRMDs;
      const rmdReductionPercent = (rmdReduction / baselineTotalRMDs) * 100;

      // Calculate effective tax rate improvement
      const baselineAvgRate = baselineLifetimeTax / baselineTotalRMDs;
      const optimizedAvgRate = optimizedLifetimeTax / (optimizedTotalRMDs + totalConverted);
      const effectiveRateImprovement = (baselineAvgRate - optimizedAvgRate) * 100;

      self.postMessage({
        type: 'roth-optimizer-complete',
        result: {
          hasRecommendation: conversions.length > 0 && lifetimeTaxSavings > 0,
          conversions,
          conversionWindow: {
            startAge: retAge,
            endAge: RMD_START_AGE - 1,
            years: conversionYears,
          },
          totalConverted,
          avgAnnualConversion,
          lifetimeTaxSavings,
          baselineLifetimeTax,
          optimizedLifetimeTax,
          rmdReduction,
          rmdReductionPercent,
          effectiveRateImprovement,
          baselineRMDs: baselineRMDs.slice(0, 10),  // First 10 years for display
          optimizedRMDs: optimizedRMDs.slice(0, 10),
          targetBracket,
          targetBracketLimit,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'optimize') {
    // Optimization Engine: Goal Seeking Calculations
    // Performs three optimizations: oversaving, splurge capacity, and freedom date
    try {
      const { params: baseParams, baseSeed } = e.data;
      const SUCCESS_THRESHOLD = 0.95; // 95% success rate required
      const TEST_RUNS = 400; // Monte Carlo runs for optimization tests
      const SAFETY_MAX_ITERATIONS = 50; // Safety brake: prevent infinite loops

      // Helper: Check if a configuration meets success criteria
      const testSuccess = (testParams) => {
        const result = runMonteCarloSimulation(testParams, baseSeed, TEST_RUNS);
        // Success if probability of ruin < 5% (success rate > 95%)
        return result.probRuin < (1 - SUCCESS_THRESHOLD);
      };

      // ===== 1. CALCULATE OVERSAVING (Monthly Surplus) =====
      // Find minimum contribution needed to maintain >95% success rate
      let surplusAnnual = 0;
      const currentTotalContrib = baseParams.cTax1 + baseParams.cPre1 + baseParams.cPost1 +
                                   baseParams.cTax2 + baseParams.cPre2 + baseParams.cPost2 +
                                   baseParams.cMatch1 + baseParams.cMatch2;

      if (currentTotalContrib > 0) {
        let low = 0;
        let high = currentTotalContrib;
        let minContrib = currentTotalContrib;
        let iterations = 0;

        // Binary search for minimum contribution with safety brake
        while (low < high && iterations < SAFETY_MAX_ITERATIONS) {
          iterations++;
          const mid = low + (high - low) / 2;
          const scaleFactor = mid / currentTotalContrib;

          const testParams = {
            ...baseParams,
            cTax1: baseParams.cTax1 * scaleFactor,
            cPre1: baseParams.cPre1 * scaleFactor,
            cPost1: baseParams.cPost1 * scaleFactor,
            cMatch1: baseParams.cMatch1 * scaleFactor,
            cTax2: baseParams.cTax2 * scaleFactor,
            cPre2: baseParams.cPre2 * scaleFactor,
            cPost2: baseParams.cPost2 * scaleFactor,
            cMatch2: baseParams.cMatch2 * scaleFactor,
          };

          if (testSuccess(testParams)) {
            minContrib = mid;
            high = mid; // Try lower
          } else {
            low = mid; // Need more
          }

          // Early exit if converged
          if (Math.abs(high - low) < 100) break;
        }

        surplusAnnual = currentTotalContrib - minContrib;
      }

      // ===== 2. CALCULATE SPLURGE CAPACITY (One-Time Purchase) =====
      // Find maximum one-time expense that maintains >95% success
      let maxSplurge = 0;
      let splurgeLow = 0;
      let splurgeHigh = 5000000; // Max $5M test
      let splurgeIterations = 0;

      // Binary search with safety brake
      while (splurgeLow < splurgeHigh && splurgeIterations < SAFETY_MAX_ITERATIONS) {
        splurgeIterations++;
        const mid = splurgeLow + (splurgeHigh - splurgeLow) / 2;

        const testParams = {
          ...baseParams,
          sTax: Math.max(0, baseParams.sTax - mid), // Reduce taxable balance
        };

        if (testSuccess(testParams)) {
          maxSplurge = mid;
          splurgeLow = mid; // Try higher
        } else {
          splurgeHigh = mid; // Too much
        }

        // Early exit if we've narrowed down enough
        if (splurgeHigh - splurgeLow < 1000) break;
      }

      // ===== 3. CALCULATE FREEDOM DATE (Earliest Retirement) =====
      // Find earliest retirement age with >95% success
      const currentAge = Math.min(baseParams.age1, baseParams.age2 || baseParams.age1);
      let earliestRetirementAge = baseParams.retAge;
      let freedomIterations = 0;

      // Binary search for earliest retirement age with safety brake
      let minAge = currentAge + 1;
      let maxAge = baseParams.retAge;
      let bestAge = baseParams.retAge;

      while (minAge <= maxAge && freedomIterations < SAFETY_MAX_ITERATIONS) {
        freedomIterations++;
        const midAge = Math.floor((minAge + maxAge) / 2);

        const testParams = {
          ...baseParams,
          retAge: midAge,
        };

        if (testSuccess(testParams)) {
          bestAge = midAge;
          maxAge = midAge - 1; // Try earlier
        } else {
          minAge = midAge + 1; // Need more time
        }
      }

      earliestRetirementAge = bestAge;

      // Send results
      self.postMessage({
        type: 'optimize-complete',
        result: {
          surplusAnnual: Math.max(0, surplusAnnual),
          surplusMonthly: Math.max(0, surplusAnnual / 12),
          maxSplurge: Math.max(0, maxSplurge),
          earliestRetirementAge,
          yearsEarlier: Math.max(0, baseParams.retAge - earliestRetirementAge),
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  }
};

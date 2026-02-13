"use strict";
(() => {
  // lib/calculations/shared/constants.ts
  var LIFE_EXP = 95;
  var RMD_START_AGE = 73;
  var RMD_DIVISORS = {
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22,
    79: 21.1,
    80: 20.2,
    81: 19.4,
    82: 18.5,
    83: 17.7,
    84: 16.8,
    85: 16,
    86: 15.2,
    87: 14.4,
    88: 13.7,
    89: 12.9,
    90: 12.2,
    91: 11.5,
    92: 10.8,
    93: 10.1,
    94: 9.5,
    95: 8.9,
    96: 8.4,
    97: 7.8,
    98: 7.3,
    99: 6.8,
    100: 6.4,
    101: 6,
    102: 5.6,
    103: 5.2,
    104: 4.9,
    105: 4.6,
    106: 4.3,
    107: 4.1,
    108: 3.9,
    109: 3.7,
    110: 3.5,
    111: 3.4,
    112: 3.3,
    113: 3.1,
    114: 3,
    115: 2.9,
    116: 2.8,
    117: 2.7,
    118: 2.5,
    119: 2.3,
    120: 2
  };
  var SS_BEND_POINTS = {
    first: 1286,
    // 90% of AIME up to this
    second: 7749
    // 32% of AIME between first and second, 15% above
  };
  var TAX_BRACKETS = {
    single: {
      deduction: 16100,
      // 2026 standard deduction (up from $15,000 in 2025)
      rates: [
        { limit: 12400, rate: 0.1 },
        { limit: 50400, rate: 0.12 },
        { limit: 105700, rate: 0.22 },
        { limit: 201775, rate: 0.24 },
        { limit: 256225, rate: 0.32 },
        { limit: 640600, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ]
    },
    married: {
      deduction: 32200,
      // 2026 standard deduction (up from $30,000 in 2025)
      rates: [
        { limit: 24800, rate: 0.1 },
        { limit: 100800, rate: 0.12 },
        { limit: 211400, rate: 0.22 },
        { limit: 403550, rate: 0.24 },
        { limit: 512450, rate: 0.32 },
        { limit: 768700, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ]
    }
  };
  var LTCG_BRACKETS = {
    single: [
      { limit: 49450, rate: 0 },
      { limit: 545500, rate: 0.15 },
      { limit: Infinity, rate: 0.2 }
    ],
    married: [
      { limit: 98900, rate: 0 },
      { limit: 613700, rate: 0.15 },
      { limit: Infinity, rate: 0.2 }
    ]
  };
  var NIIT_THRESHOLD = {
    single: 2e5,
    married: 25e4
  };
  var IRMAA_BRACKETS_2026 = {
    single: [
      { threshold: 109e3, surcharge: 0 },
      // Standard premium, no surcharge
      { threshold: 137e3, surcharge: 81.2 },
      // Tier 1: $284.10 total premium
      { threshold: 171e3, surcharge: 202.9 },
      // Tier 2: $405.80 total premium
      { threshold: 205e3, surcharge: 324.6 },
      // Tier 3: $527.50 total premium (was 214000)
      { threshold: 5e5, surcharge: 446.3 },
      // Tier 4: $649.20 total premium
      { threshold: Infinity, surcharge: 487 }
      // Tier 5: $689.90 total premium (highest)
    ],
    married: [
      { threshold: 218e3, surcharge: 0 },
      // Standard premium, no surcharge
      { threshold: 274e3, surcharge: 81.2 },
      // Tier 1: $284.10 total premium
      { threshold: 342e3, surcharge: 202.9 },
      // Tier 2: $405.80 total premium
      { threshold: 41e4, surcharge: 324.6 },
      // Tier 3: $527.50 total premium (was 428000)
      { threshold: 75e4, surcharge: 446.3 },
      // Tier 4: $649.20 total premium
      { threshold: Infinity, surcharge: 487 }
      // Tier 5: $689.90 total premium (highest)
    ]
  };
  var SP500_START_YEAR = 1928;
  var SP500_END_YEAR = 2024;
  var MAX_RETURN = 15;
  var MIN_RETURN = -15;
  var SP500_ORIGINAL_RAW = [
    // 1928-1940 (13 years)
    43.81,
    -8.3,
    -25.12,
    -43.84,
    -8.64,
    49.98,
    -1.19,
    46.74,
    31.94,
    35.34,
    -35.34,
    29.28,
    -1.1,
    // 1941-1960 (20 years)
    -12.77,
    19.17,
    25.06,
    19.03,
    35.82,
    -8.43,
    5.2,
    5.7,
    18.3,
    30.81,
    23.68,
    14.37,
    -1.21,
    52.56,
    31.24,
    18.15,
    -0.73,
    23.68,
    52.4,
    31.74,
    // 1961-1980 (20 years)
    26.63,
    -8.81,
    22.61,
    16.42,
    12.4,
    -10.06,
    23.8,
    10.81,
    -8.24,
    -14.31,
    3.56,
    14.22,
    18.76,
    -14.31,
    -25.9,
    37,
    23.83,
    -7.18,
    6.56,
    18.44,
    // 1981-2000 (20 years)
    -4.7,
    20.42,
    22.34,
    6.15,
    31.24,
    18.49,
    5.81,
    16.54,
    31.48,
    -3.06,
    30.23,
    7.49,
    9.97,
    1.33,
    37.2,
    22.68,
    33.1,
    28.34,
    20.89,
    -9.03,
    // 2001-2020 (20 years)
    -11.85,
    -21.97,
    28.36,
    10.74,
    4.83,
    15.61,
    5.48,
    -36.55,
    25.94,
    14.82,
    2.1,
    15.89,
    32.15,
    13.52,
    1.36,
    11.77,
    21.61,
    -4.23,
    31.21,
    18.02,
    // 2021-2024 (4 years)
    28.47,
    -18.04,
    26.06,
    25.02
  ];
  var SP500_ORIGINAL = SP500_ORIGINAL_RAW.map(
    (val) => Math.max(MIN_RETURN, Math.min(MAX_RETURN, val))
  );
  var SP500_HALF_VALUES = SP500_ORIGINAL.map((val) => val / 2);
  var SP500_YOY_NOMINAL = [...SP500_ORIGINAL, ...SP500_HALF_VALUES];
  var EXPECTED_LENGTH = SP500_END_YEAR - SP500_START_YEAR + 1;
  if (SP500_ORIGINAL.length !== EXPECTED_LENGTH) {
    throw new Error(
      `SP500 data integrity error: expected ${EXPECTED_LENGTH} years (${SP500_START_YEAR}-${SP500_END_YEAR}), but got ${SP500_ORIGINAL.length} values`
    );
  }
  var BOND_NOMINAL_AVG = 4.5;
  var EMPLOYMENT_TAX_CONSTANTS = {
    SS_WAGE_BASE: 184500,
    SS_RATE_EMPLOYEE: 0.062,
    SS_RATE_SELF_EMPLOYED: 0.124,
    MEDICARE_RATE_EMPLOYEE: 0.0145,
    MEDICARE_RATE_SELF_EMPLOYED: 0.029,
    ADDITIONAL_MEDICARE_THRESHOLD: 2e5,
    ADDITIONAL_MEDICARE_RATE: 9e-3,
    SELF_EMPLOYMENT_FACTOR: 0.9235
    // 92.35% of net self-employment earnings
  };
  var CHILD_EXPENSE_CONSTANTS = {
    childcareAnnual: 15e3,
    k12Annual: 3e3,
    collegeAnnual: 25e3,
    dependentBaseAnnual: 8e3,
    childcareEndAge: 6,
    k12EndAge: 18,
    collegeEndAge: 22,
    dependentEndAge: 18
  };
  var PRE_MEDICARE_HEALTHCARE_CONSTANTS = {
    // Base annual costs for individual coverage by age bracket
    individual: {
      under30: 4800,
      // ~$400/month - younger workers, lower premiums
      age30to39: 6e3,
      // ~$500/month - early career
      age40to49: 8400,
      // ~$700/month - mid-career, costs rising
      age50to54: 10800,
      // ~$900/month - approaching peak working years
      age55to59: 13200,
      // ~$1,100/month - pre-retirement, higher costs
      age60to64: 15600
      // ~$1,300/month - highest pre-Medicare costs (3:1 age rating)
    },
    // Family coverage multiplier (spouse adds ~60-70% of individual cost)
    familyMultiplier: 2.5,
    // Total family cost is ~2.5x individual
    // Additional cost per dependent child
    perChildAdditional: 3e3,
    // ~$250/month per child
    // Medicare eligibility age
    medicareAge: 65
  };

  // lib/calculations/shared/utils.ts
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function rand() {
      t += 1831565813;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }
  function percentile(arr, p) {
    const len = arr.length;
    if (len === 0) return 0;
    if (p < 0 || p > 100) throw new Error("Percentile must be between 0 and 100");
    if (len < 100) {
      const sorted2 = [...arr].sort((a, b) => a - b);
      const index2 = p / 100 * (len - 1);
      const lower2 = Math.floor(index2);
      const upper2 = Math.ceil(index2);
      const weight2 = index2 - lower2;
      if (lower2 === upper2) return sorted2[lower2];
      return sorted2[lower2] * (1 - weight2) + sorted2[upper2] * weight2;
    }
    const sorted = Float64Array.from(arr).sort();
    const index = p / 100 * (len - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  function trimExtremeValues(arr, trimCount) {
    if (arr.length <= trimCount * 2) {
      throw new Error(`Cannot trim ${trimCount * 2} values from array of length ${arr.length}`);
    }
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted.slice(trimCount, sorted.length - trimCount);
  }
  function realReturn(nominalPct, inflPct) {
    return (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;
  }
  function getEffectiveInflation(yearInSimulation, yrsToRet, baseInflation, shockRate, shockDuration) {
    if (shockRate === null || shockRate === void 0) return baseInflation;
    const shockStartYear = yrsToRet;
    const shockEndYear = yrsToRet + shockDuration;
    if (yearInSimulation >= shockStartYear && yearInSimulation < shockEndYear) {
      return shockRate;
    }
    return baseInflation;
  }

  // lib/calculations/shared/taxCalculations.ts
  function calcOrdinaryTax(income, status) {
    const safeIncome = Number.isFinite(income) ? Math.max(0, income) : 0;
    if (safeIncome <= 0) return 0;
    const brackets = TAX_BRACKETS[status];
    if (!brackets?.rates) return 0;
    const { rates, deduction } = brackets;
    let adj = Math.max(0, safeIncome - deduction);
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
    const safeCapGain = Number.isFinite(capGain) ? Math.max(0, capGain) : 0;
    const safeOrdinaryIncome = Number.isFinite(ordinaryIncome) ? Math.max(0, ordinaryIncome) : 0;
    if (safeCapGain <= 0) return 0;
    const brackets = LTCG_BRACKETS[status];
    if (!brackets) return 0;
    let remainingGain = safeCapGain;
    let tax = 0;
    let cumulativeIncome = safeOrdinaryIncome;
    for (const b of brackets) {
      const bracketRoom = Math.max(0, b.limit - cumulativeIncome);
      const taxedHere = Math.min(remainingGain, bracketRoom);
      if (taxedHere > 0) {
        tax += taxedHere * b.rate;
        remainingGain -= taxedHere;
        cumulativeIncome += taxedHere;
      }
      if (remainingGain <= 0) break;
    }
    if (remainingGain > 0) {
      const topRate = brackets[brackets.length - 1].rate;
      tax += remainingGain * topRate;
    }
    return tax;
  }
  function calcNIIT(investmentIncome, status, modifiedAGI) {
    const safeInvestmentIncome = Number.isFinite(investmentIncome) ? Math.max(0, investmentIncome) : 0;
    const safeModifiedAGI = Number.isFinite(modifiedAGI) ? Math.max(0, modifiedAGI) : 0;
    if (safeInvestmentIncome <= 0) return 0;
    const threshold = NIIT_THRESHOLD[status];
    if (threshold === void 0) return 0;
    const excess = Math.max(0, safeModifiedAGI - threshold);
    if (excess <= 0) return 0;
    const base = Math.min(safeInvestmentIncome, excess);
    return base * 0.038;
  }
  function getIRMAASurcharge(magi, isMarried) {
    const brackets = isMarried ? IRMAA_BRACKETS_2026.married : IRMAA_BRACKETS_2026.single;
    for (const bracket of brackets) {
      if (magi <= bracket.threshold) {
        return bracket.surcharge;
      }
    }
    return brackets[brackets.length - 1].surcharge;
  }
  function calculateSelfEmploymentTax(netEarnings) {
    if (netEarnings <= 0) return 0;
    const {
      SS_WAGE_BASE,
      SS_RATE_SELF_EMPLOYED,
      MEDICARE_RATE_SELF_EMPLOYED,
      ADDITIONAL_MEDICARE_THRESHOLD,
      ADDITIONAL_MEDICARE_RATE,
      SELF_EMPLOYMENT_FACTOR
    } = EMPLOYMENT_TAX_CONSTANTS;
    const selfEmploymentEarnings = netEarnings * SELF_EMPLOYMENT_FACTOR;
    const ssTax = Math.min(selfEmploymentEarnings, SS_WAGE_BASE) * SS_RATE_SELF_EMPLOYED;
    let medicareTax = selfEmploymentEarnings * MEDICARE_RATE_SELF_EMPLOYED;
    if (selfEmploymentEarnings > ADDITIONAL_MEDICARE_THRESHOLD) {
      medicareTax += (selfEmploymentEarnings - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
    }
    return ssTax + medicareTax;
  }
  function calculatePayrollTax(wages) {
    if (wages <= 0) return 0;
    const {
      SS_WAGE_BASE,
      SS_RATE_EMPLOYEE,
      MEDICARE_RATE_EMPLOYEE,
      ADDITIONAL_MEDICARE_THRESHOLD,
      ADDITIONAL_MEDICARE_RATE
    } = EMPLOYMENT_TAX_CONSTANTS;
    const ssTax = Math.min(wages, SS_WAGE_BASE) * SS_RATE_EMPLOYEE;
    let medicareTax = wages * MEDICARE_RATE_EMPLOYEE;
    if (wages > ADDITIONAL_MEDICARE_THRESHOLD) {
      medicareTax += (wages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
    }
    return ssTax + medicareTax;
  }
  function calculateEmploymentTaxes(income, employmentType) {
    if (income <= 0 || employmentType === "retired" || employmentType === "other") {
      return 0;
    }
    if (employmentType === "w2") {
      return calculatePayrollTax(income);
    }
    if (employmentType === "self-employed") {
      return calculateSelfEmploymentTax(income);
    }
    const w2Portion = income * 0.5;
    const selfEmployedPortion = income * 0.5;
    return calculatePayrollTax(w2Portion) + calculateSelfEmploymentTax(selfEmployedPortion);
  }

  // lib/calculations/shared/socialSecurity.ts
  function calcPIA(avgAnnualIncome) {
    if (avgAnnualIncome <= 0) return 0;
    const aime = avgAnnualIncome / 12;
    let pia = 0;
    if (aime <= SS_BEND_POINTS.first) {
      pia = aime * 0.9;
    } else if (aime <= SS_BEND_POINTS.second) {
      pia = SS_BEND_POINTS.first * 0.9 + (aime - SS_BEND_POINTS.first) * 0.32;
    } else {
      pia = SS_BEND_POINTS.first * 0.9 + (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 + (aime - SS_BEND_POINTS.second) * 0.15;
    }
    return pia;
  }
  function adjustSSForClaimAge(monthlyPIA, claimAge, fra = 67) {
    if (monthlyPIA <= 0) return 0;
    const monthsFromFRA = (claimAge - fra) * 12;
    let adjustmentFactor = 1;
    if (monthsFromFRA < 0) {
      const earlyMonths = Math.abs(monthsFromFRA);
      if (earlyMonths <= 36) {
        adjustmentFactor = 1 - earlyMonths * 5 / 9 / 100;
      } else {
        adjustmentFactor = 1 - 36 * 5 / 9 / 100 - (earlyMonths - 36) * 5 / 12 / 100;
      }
    } else if (monthsFromFRA > 0) {
      adjustmentFactor = 1 + monthsFromFRA * 2 / 3 / 100;
    }
    return monthlyPIA * adjustmentFactor;
  }
  function calcSocialSecurity(avgAnnualIncome, claimAge, fullRetirementAge = 67) {
    if (avgAnnualIncome <= 0) return 0;
    const pia = calcPIA(avgAnnualIncome);
    const adjustedMonthly = adjustSSForClaimAge(pia, claimAge, fullRetirementAge);
    return adjustedMonthly * 12;
  }
  function calculateEffectiveSS(ownPIA, spousePIA, ownClaimAge, fra = 67) {
    const ownBenefit = adjustSSForClaimAge(ownPIA, ownClaimAge, fra);
    let spousalBenefit = spousePIA * 0.5;
    if (ownClaimAge < fra) {
      const monthsEarly = (fra - ownClaimAge) * 12;
      if (monthsEarly <= 36) {
        spousalBenefit *= 1 - monthsEarly * (25 / 36) / 100;
      } else {
        spousalBenefit *= 1 - 36 * (25 / 36) / 100 - (monthsEarly - 36) * (5 / 12) / 100;
      }
    }
    return Math.max(ownBenefit, spousalBenefit);
  }

  // lib/calculations/shared/bondAllocation.ts
  function calculateBondReturn(stockReturnPct) {
    const bondReturn = BOND_NOMINAL_AVG + (stockReturnPct - 9.8) * 0.3;
    return bondReturn;
  }
  function calculateBondAllocation(age, glidePath) {
    if (!glidePath) return 0;
    if (glidePath.strategy === "aggressive") {
      return 0;
    }
    if (glidePath.strategy === "ageBased") {
      if (age < 40) {
        return 10;
      } else if (age <= 60) {
        const progress2 = (age - 40) / (60 - 40);
        return 10 + (60 - 10) * progress2;
      } else {
        return 60;
      }
    }
    const { startAge, endAge, startPct, endPct, shape } = glidePath;
    if (age < startAge) {
      return startPct;
    }
    if (age >= endAge) {
      return endPct;
    }
    const progress = (age - startAge) / (endAge - startAge);
    let adjustedProgress;
    switch (shape) {
      case "linear":
        adjustedProgress = progress;
        break;
      case "accelerated":
        adjustedProgress = Math.sqrt(progress);
        break;
      case "decelerated":
        adjustedProgress = Math.pow(progress, 2);
        break;
      default:
        adjustedProgress = progress;
    }
    const bondPct = startPct + (endPct - startPct) * adjustedProgress;
    return bondPct;
  }
  function calculateBlendedReturn(stockReturnPct, bondReturnPct, bondAllocationPct) {
    const bondPct = bondAllocationPct / 100;
    const stockPct = 1 - bondPct;
    return stockPct * stockReturnPct + bondPct * bondReturnPct;
  }

  // lib/calculations/shared/expenses.ts
  function calculateChildExpenses(childrenAges, simulationYear, inflationFactor) {
    if (!childrenAges || childrenAges.length === 0) return 0;
    let totalExpenses = 0;
    for (const startAge of childrenAges) {
      const currentAge = startAge + simulationYear;
      if (currentAge >= CHILD_EXPENSE_CONSTANTS.collegeEndAge) continue;
      let childExpense = 0;
      if (currentAge < CHILD_EXPENSE_CONSTANTS.childcareEndAge) {
        childExpense += CHILD_EXPENSE_CONSTANTS.childcareAnnual;
      } else if (currentAge < CHILD_EXPENSE_CONSTANTS.k12EndAge) {
        childExpense += CHILD_EXPENSE_CONSTANTS.k12Annual;
      } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
        childExpense += CHILD_EXPENSE_CONSTANTS.collegeAnnual;
      }
      if (currentAge < CHILD_EXPENSE_CONSTANTS.dependentEndAge) {
        const ageFactor = currentAge < 6 ? 1 : currentAge < 13 ? 0.85 : 0.7;
        childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * ageFactor;
      } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
        childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * 0.5;
      }
      totalExpenses += childExpense;
    }
    return totalExpenses * inflationFactor;
  }
  function getPreMedicareHealthcareCost(age) {
    if (age >= PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge) {
      return 0;
    }
    const { individual } = PRE_MEDICARE_HEALTHCARE_CONSTANTS;
    if (age < 30) return individual.under30;
    if (age < 40) return individual.age30to39;
    if (age < 50) return individual.age40to49;
    if (age < 55) return individual.age50to54;
    if (age < 60) return individual.age55to59;
    return individual.age60to64;
  }
  function calculatePreMedicareHealthcareCosts(age1, age2, numChildren, medicalInflationFactor) {
    let totalCost = 0;
    const person1Cost = getPreMedicareHealthcareCost(age1);
    totalCost += person1Cost;
    if (age2 !== null) {
      const person2Cost = getPreMedicareHealthcareCost(age2);
      totalCost += person2Cost;
    }
    if (numChildren > 0 && (age1 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge || age2 !== null && age2 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge)) {
      totalCost += numChildren * PRE_MEDICARE_HEALTHCARE_CONSTANTS.perChildAdditional;
    }
    return totalCost * medicalInflationFactor;
  }

  // lib/calculations/shared/rmd.ts
  function calcRMD(pretaxBalance, age) {
    if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;
    const divisor = RMD_DIVISORS[age] || 2;
    return pretaxBalance / divisor;
  }

  // lib/calculations/shared/withdrawalTax.ts
  function computeWithdrawalTaxes(gross, status, taxableBal, pretaxBal, rothBal, taxableBasis, statePct, minPretaxDraw = 0, baseOrdinaryIncome = 0) {
    const safeTaxableBal = Number.isFinite(taxableBal) ? Math.max(0, taxableBal) : 0;
    const safePretaxBal = Number.isFinite(pretaxBal) ? Math.max(0, pretaxBal) : 0;
    const safeRothBal = Number.isFinite(rothBal) ? Math.max(0, rothBal) : 0;
    const safeTaxableBasis = Number.isFinite(taxableBasis) ? Math.max(0, taxableBasis) : 0;
    const safeGross = Number.isFinite(gross) ? Math.max(0, gross) : 0;
    const safeStatePct = Number.isFinite(statePct) ? Math.max(0, Math.min(100, statePct)) : 0;
    const safeMinPretaxDraw = Number.isFinite(minPretaxDraw) ? Math.max(0, minPretaxDraw) : 0;
    const safeBaseOrdinaryIncome = Number.isFinite(baseOrdinaryIncome) ? Math.max(0, baseOrdinaryIncome) : 0;
    const totalBal = safeTaxableBal + safePretaxBal + safeRothBal;
    if (totalBal <= 0 || safeGross <= 0)
      return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: safeTaxableBasis };
    let drawP = Math.min(safeMinPretaxDraw, safePretaxBal);
    let remainingNeed = safeGross - drawP;
    let drawT = 0;
    let drawR = 0;
    if (remainingNeed > 0) {
      const availableBal = safeTaxableBal + (safePretaxBal - drawP) + safeRothBal;
      if (availableBal > 0) {
        const shareT = safeTaxableBal / availableBal;
        const shareP = (safePretaxBal - drawP) / availableBal;
        const shareR = safeRothBal / availableBal;
        drawT = remainingNeed * shareT;
        drawP += remainingNeed * shareP;
        drawR = remainingNeed * shareR;
      }
    } else if (remainingNeed < 0) {
    }
    const fixShortfall = (want, have) => Math.min(want, have);
    const usedT = fixShortfall(drawT, safeTaxableBal);
    let shortT = drawT - usedT;
    const usedP = fixShortfall(drawP + shortT, safePretaxBal);
    let shortP = drawP + shortT - usedP;
    const usedR = fixShortfall(drawR + shortP, safeRothBal);
    drawT = usedT;
    drawP = usedP;
    drawR = usedR;
    const unrealizedGain = Math.max(0, safeTaxableBal - safeTaxableBasis);
    const gainRatio = safeTaxableBal > 0 ? unrealizedGain / safeTaxableBal : 0;
    const drawT_Gain = drawT * gainRatio;
    const drawT_Basis = drawT - drawT_Gain;
    const ordinaryIncome = drawP;
    const capGains = drawT_Gain;
    const totalOrdinaryIncome = safeBaseOrdinaryIncome + ordinaryIncome;
    const taxOnTotal = calcOrdinaryTax(totalOrdinaryIncome, status);
    const taxOnBase = calcOrdinaryTax(safeBaseOrdinaryIncome, status);
    const fedOrd = taxOnTotal - taxOnBase;
    const fedCap = calcLTCGTax(capGains, status, totalOrdinaryIncome);
    const magi = totalOrdinaryIncome + capGains;
    const niit = calcNIIT(capGains, status, magi);
    const stateTax = (ordinaryIncome + capGains) * (safeStatePct / 100);
    const totalTax = fedOrd + fedCap + niit + stateTax;
    const newBasis = Math.max(0, safeTaxableBasis - drawT_Basis);
    return {
      tax: totalTax,
      ordinary: fedOrd,
      capgain: fedCap,
      niit,
      state: stateTax,
      draw: { t: drawT, p: drawP, r: drawR },
      newBasis
    };
  }

  // lib/calculations/shared/returnGenerator.ts
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
      bondGlidePath = null,
      currentAge = 35
    } = options;
    const inflRate = infPct / 100;
    const inflFactor = 1 + inflRate;
    const bondAllocations = bondGlidePath ? Array.from({ length: years }, (_, i) => calculateBondAllocation(currentAge + i, bondGlidePath)) : null;
    if (mode === "fixed") {
      const bondReturnPct = BOND_NOMINAL_AVG;
      return function* fixedGen() {
        for (let i = 0; i < years; i++) {
          let returnPct = nominalPct;
          if (bondAllocations) {
            returnPct = calculateBlendedReturn(nominalPct, bondReturnPct, bondAllocations[i]);
          }
          yield 1 + returnPct / 100;
        }
      };
    }
    if (!walkData.length) throw new Error("walkData is empty");
    if (startYear !== void 0) {
      const startIndex = startYear - 1928;
      const isRealSeries2 = walkSeries === "real";
      const dataLength2 = walkData.length;
      return function* historicalGen() {
        for (let i = 0; i < years; i++) {
          const ix = (startIndex + i) % dataLength2;
          const stockPct = walkData[ix];
          const bondPct = calculateBondReturn(stockPct);
          const pct = bondAllocations ? calculateBlendedReturn(stockPct, bondPct, bondAllocations[i]) : stockPct;
          if (isRealSeries2) {
            yield (1 + pct / 100) / inflFactor;
          } else {
            yield 1 + pct / 100;
          }
        }
      };
    }
    const rnd = mulberry32(seed);
    const isRealSeries = walkSeries === "real";
    const dataLength = walkData.length;
    return function* walkGen() {
      for (let i = 0; i < years; i++) {
        const ix = Math.floor(rnd() * dataLength);
        const stockPct = walkData[ix];
        const bondPct = calculateBondReturn(stockPct);
        const pct = bondAllocations ? calculateBlendedReturn(stockPct, bondPct, bondAllocations[i]) : stockPct;
        if (isRealSeries) {
          yield (1 + pct / 100) / inflFactor;
        } else {
          yield 1 + pct / 100;
        }
      }
    };
  }

  // lib/calculations/worker/monte-carlo-worker.ts
  function runSingleSimulation(params, seed) {
    const {
      marital,
      age1,
      age2,
      retAge,
      sTax,
      sPre,
      sPost,
      cTax1,
      cPre1,
      cPost1,
      cMatch1,
      cTax2,
      cPre2,
      cPost2,
      cMatch2,
      retRate,
      infRate,
      stateRate,
      incContrib,
      incRate,
      wdRate,
      retMode,
      walkSeries,
      includeSS,
      ssIncome,
      ssClaimAge,
      ssIncome2,
      ssClaimAge2,
      historicalYear,
      inflationShockRate,
      inflationShockDuration = 5,
      dividendYield = 2,
      enableRothConversions = false,
      targetConversionBracket = 0.24,
      includeMedicare = false,
      medicarePremium = 400,
      medicalInflation = 5,
      includeLTC = false,
      ltcAnnualCost = 8e4,
      ltcProbability = 50,
      ltcDuration = 2.5,
      ltcOnsetAge = 82,
      emergencyFund = 0,
      numChildren = 0,
      childrenAges = [],
      additionalChildrenExpected = 0,
      annualIncome1 = 0,
      annualIncome2 = 0,
      employmentType1 = "w2",
      employmentType2 = "w2"
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
      seed,
      startYear: historicalYear,
      bondGlidePath: params.bondGlidePath || null,
      currentAge: younger
    })();
    const drawGen = buildReturnGenerator({
      mode: retMode,
      years: yrsToSim,
      nominalPct: retRate,
      infPct: infRate,
      walkSeries,
      seed: seed + 1,
      startYear: historicalYear ? historicalYear + yrsToRet : void 0,
      bondGlidePath: params.bondGlidePath || null,
      currentAge: older + yrsToRet
    })();
    let bTax = sTax;
    let bPre = sPre;
    let bPost = sPost;
    let basisTax = sTax;
    let bEmergency = emergencyFund;
    const totalYears = yrsToRet + yrsToSim + 1;
    const balancesReal = new Array(totalYears);
    const balancesNominal = new Array(totalYears);
    let balanceIndex = 0;
    let cumulativeInflation = 1;
    const c = {
      p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
      s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 }
    };
    for (let y = 0; y <= yrsToRet; y++) {
      const g = retMode === "fixed" ? g_fixed : accGen.next().value;
      const a1 = age1 + y;
      const a2 = isMar ? age2 + y : null;
      if (y > 0) {
        bTax *= g;
        bPre *= g;
        bPost *= g;
        if (bTax > 0 && dividendYield > 0) {
          const yieldIncome = bTax * (dividendYield / 100);
          const yieldTax = calcLTCGTax(yieldIncome, marital, 0);
          bTax -= yieldTax;
        }
      }
      if (y > 0 && incContrib) {
        const f = 1 + incRate / 100;
        Object.keys(c.p).forEach((k) => c.p[k] *= f);
        if (isMar)
          Object.keys(c.s).forEach((k) => c.s[k] *= f);
      }
      const addMidYear = (amt) => amt * (1 + (g - 1) * 0.5);
      if (a1 < retAge) {
        bTax += addMidYear(c.p.tax);
        bPre += addMidYear(c.p.pre + c.p.match);
        bPost += addMidYear(c.p.post);
        basisTax += c.p.tax;
      }
      if (isMar && a2 !== null && a2 < retAge) {
        bTax += addMidYear(c.s.tax);
        bPre += addMidYear(c.s.pre + c.s.match);
        bPost += addMidYear(c.s.post);
        basisTax += c.s.tax;
      }
      if (childrenAges.length > 0 || numChildren > 0) {
        let effectiveChildrenAges = [...childrenAges];
        if (effectiveChildrenAges.length === 0 && numChildren > 0) {
          for (let i = 0; i < numChildren; i++) {
            effectiveChildrenAges.push(5 + i * 3);
          }
        }
        if (additionalChildrenExpected > 0 && y > 0) {
          const yearsToAddChildren = Math.min(additionalChildrenExpected * 2, yrsToRet);
          if (y <= yearsToAddChildren && y % 2 === 0) {
            const childIndex = Math.floor(y / 2) - 1;
            if (childIndex < additionalChildrenExpected) {
              effectiveChildrenAges.push(0 - (y - 2));
            }
          }
        }
        const childExpenses = calculateChildExpenses(
          effectiveChildrenAges,
          y,
          Math.pow(infl_factor, y)
        );
        if (childExpenses > 0 && a1 < retAge) {
          bTax = Math.max(0, bTax - childExpenses);
        }
      }
      if (a1 < retAge && annualIncome1 > 0) {
        if (employmentType1 === "self-employed") {
          const empTax1 = calculateEmploymentTaxes(annualIncome1 * Math.pow(1 + incRate / 100, y), employmentType1);
          const extraTax = empTax1 * 0.5;
          bTax = Math.max(0, bTax - extraTax);
        }
      }
      if (isMar && a2 !== null && a2 < retAge && annualIncome2 > 0) {
        if (employmentType2 === "self-employed") {
          const empTax2 = calculateEmploymentTaxes(annualIncome2 * Math.pow(1 + incRate / 100, y), employmentType2);
          const extraTax = empTax2 * 0.5;
          bTax = Math.max(0, bTax - extraTax);
        }
      }
      if (a1 < retAge) {
        let dependentChildCount = 0;
        if (childrenAges.length > 0) {
          dependentChildCount = childrenAges.filter((startAge) => {
            const childAge = startAge + y;
            return childAge >= 0 && childAge < 26;
          }).length;
        } else if (numChildren > 0) {
          dependentChildCount = numChildren;
        }
        const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
        const preMedicareHealthcareCost = calculatePreMedicareHealthcareCosts(
          a1,
          isMar ? a2 : null,
          dependentChildCount,
          medInflationFactor
        );
        if (preMedicareHealthcareCost > 0) {
          bTax = Math.max(0, bTax - preMedicareHealthcareCost);
        }
      }
      if (y > 0) {
        bEmergency *= infl_factor;
      }
      const bal = bTax + bPre + bPost + bEmergency;
      const yearInflation = getEffectiveInflation(y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
      cumulativeInflation *= 1 + yearInflation / 100;
      balancesReal[balanceIndex] = bal / cumulativeInflation;
      balancesNominal[balanceIndex] = bal;
      balanceIndex++;
    }
    const finNom = bTax + bPre + bPost + bEmergency;
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
      0,
      0
    );
    const wdAfterY1 = wdGrossY1 - y1.tax;
    const wdRealY1 = wdAfterY1 / infAdj;
    let retBalTax = bTax;
    let retBalPre = bPre;
    let retBalRoth = bPost;
    let retBalEmergency = bEmergency;
    let currBasis = basisTax;
    let currWdGross = wdGrossY1;
    let survYrs = 0;
    let ruined = false;
    let totalRothConversions = 0;
    let conversionTaxesPaid = 0;
    for (let y = 1; y <= yrsToSim; y++) {
      const g_retire = retMode === "fixed" ? g_fixed : drawGen.next().value;
      retBalTax *= g_retire;
      retBalPre *= g_retire;
      retBalRoth *= g_retire;
      retBalEmergency *= infl_factor;
      if (retBalTax > 0 && dividendYield > 0) {
        const yieldIncome = retBalTax * (dividendYield / 100);
        const yieldTax = calcLTCGTax(yieldIncome, marital, 0);
        retBalTax -= yieldTax;
      }
      const currentAge = age1 + yrsToRet + y;
      const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
      const requiredRMD = calcRMD(retBalPre, currentAge);
      let ssAnnualBenefit = 0;
      if (includeSS) {
        if (isMar) {
          const spouse1Eligible = currentAge >= ssClaimAge;
          const spouse2Eligible = currentAge2 >= ssClaimAge2;
          const pia1 = calcPIA(ssIncome);
          const pia2 = calcPIA(ssIncome2);
          if (spouse1Eligible && spouse2Eligible) {
            const benefit1 = calculateEffectiveSS(pia1, pia2, ssClaimAge);
            const benefit2 = calculateEffectiveSS(pia2, pia1, ssClaimAge2);
            ssAnnualBenefit = (benefit1 + benefit2) * 12;
          } else if (spouse1Eligible) {
            ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
          } else if (spouse2Eligible) {
            ssAnnualBenefit = calcSocialSecurity(ssIncome2, ssClaimAge2);
          }
        } else {
          if (currentAge >= ssClaimAge) {
            ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
          }
        }
      }
      if (enableRothConversions && currentAge < RMD_START_AGE && retBalPre > 0 && retBalTax > 0) {
        const brackets = TAX_BRACKETS[marital];
        const targetBracket = brackets.rates.find((b) => b.rate === targetConversionBracket);
        if (targetBracket) {
          const currentOrdinaryIncome = ssAnnualBenefit;
          const bracketThreshold = targetBracket.limit + brackets.deduction;
          const headroom = Math.max(0, bracketThreshold - currentOrdinaryIncome);
          if (headroom > 0) {
            const maxConversion = Math.min(headroom, retBalPre);
            const conversionTax = calcOrdinaryTax(currentOrdinaryIncome + maxConversion, marital) - calcOrdinaryTax(currentOrdinaryIncome, marital);
            const affordableConversion = conversionTax > 0 ? Math.min(maxConversion, retBalTax / conversionTax * maxConversion) : maxConversion;
            if (affordableConversion > 0) {
              const actualConversion = Math.min(affordableConversion, retBalPre);
              const actualTax = calcOrdinaryTax(currentOrdinaryIncome + actualConversion, marital) - calcOrdinaryTax(currentOrdinaryIncome, marital);
              retBalPre -= actualConversion;
              retBalRoth += actualConversion;
              retBalTax -= actualTax;
              totalRothConversions += actualConversion;
              conversionTaxesPaid += actualTax;
            }
          }
        }
      }
      let healthcareCosts = 0;
      if (includeMedicare && currentAge >= 65) {
        const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
        healthcareCosts += medicarePremium * 12 * medInflationFactor;
        const estimatedMAGI = currWdGross + ssAnnualBenefit + requiredRMD;
        const isMarried = marital === "married";
        const monthlyIrmaaSurcharge = getIRMAASurcharge(estimatedMAGI, isMarried);
        healthcareCosts += monthlyIrmaaSurcharge * 12 * medInflationFactor;
      }
      if (includeLTC && currentAge >= ltcOnsetAge) {
        const yearsIntoLTC = currentAge - ltcOnsetAge;
        if (yearsIntoLTC < ltcDuration) {
          const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
          healthcareCosts += ltcAnnualCost * (ltcProbability / 100) * medInflationFactor;
        }
      }
      let childExpensesDuringRetirement = 0;
      if (childrenAges.length > 0 || numChildren > 0) {
        let effectiveChildrenAges = [...childrenAges];
        if (effectiveChildrenAges.length === 0 && numChildren > 0) {
          for (let i = 0; i < numChildren; i++) {
            effectiveChildrenAges.push(5 + i * 3);
          }
        }
        childExpensesDuringRetirement = calculateChildExpenses(
          effectiveChildrenAges,
          yrsToRet + y,
          Math.pow(infl_factor, yrsToRet + y)
        );
      }
      let netSpendingNeed = Math.max(0, currWdGross + healthcareCosts + childExpensesDuringRetirement - ssAnnualBenefit);
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
        requiredRMD,
        ssAnnualBenefit
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
      const totalNow = retBalTax + retBalPre + retBalRoth + retBalEmergency;
      const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
      cumulativeInflation *= 1 + yearInflation / 100;
      balancesReal[balanceIndex] = totalNow / cumulativeInflation;
      balancesNominal[balanceIndex] = totalNow;
      balanceIndex++;
      const mainPortfolio = retBalTax + retBalPre + retBalRoth;
      if (mainPortfolio <= 0 && retBalEmergency <= 0) {
        if (!ruined) {
          survYrs = y - 1;
          ruined = true;
        }
        retBalTax = retBalPre = retBalRoth = retBalEmergency = 0;
      } else if (mainPortfolio <= 0 && retBalEmergency > 0) {
        const emergencyDraw = Math.min(currWdGross, retBalEmergency);
        retBalEmergency -= emergencyDraw;
        retBalTax = retBalPre = retBalRoth = 0;
        survYrs = y;
      } else {
        survYrs = y;
      }
      currWdGross *= infl_factor;
    }
    const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth + retBalEmergency);
    const eolReal = eolWealth / cumulativeInflation;
    const trimmedBalancesReal = balancesReal.slice(0, balanceIndex);
    const trimmedBalancesNominal = balancesNominal.slice(0, balanceIndex);
    return {
      balancesReal: trimmedBalancesReal,
      balancesNominal: trimmedBalancesNominal,
      eolReal,
      y1AfterTaxReal: wdRealY1,
      ruined,
      survYrs,
      totalRothConversions,
      conversionTaxesPaid
    };
  }
  function runMonteCarloSimulation(params, baseSeed, N = 2e3) {
    const results = new Array(N);
    const rng = mulberry32(baseSeed);
    const seeds = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      seeds[i] = rng() * 1e6 >>> 0;
    }
    const PROGRESS_INTERVAL = 100;
    for (let i = 0; i < N; i++) {
      results[i] = runSingleSimulation(params, seeds[i]);
      if ((i + 1) % PROGRESS_INTERVAL === 0 || i === N - 1) {
        self.postMessage({
          type: "progress",
          completed: i + 1,
          total: N
        });
      }
    }
    const trimPercent = Math.min(0.025, 0.25 * N / (2 * N));
    const TRIM_COUNT = Math.floor(N * trimPercent);
    const T = results[0].balancesReal.length;
    const p10BalancesReal = new Array(T);
    const p25BalancesReal = new Array(T);
    const p50BalancesReal = new Array(T);
    const p75BalancesReal = new Array(T);
    const p90BalancesReal = new Array(T);
    const p10BalancesNominal = new Array(T);
    const p25BalancesNominal = new Array(T);
    const p50BalancesNominal = new Array(T);
    const p75BalancesNominal = new Array(T);
    const p90BalancesNominal = new Array(T);
    const colReal = new Array(N);
    const colNominal = new Array(N);
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < N; i++) {
        colReal[i] = results[i].balancesReal[t];
      }
      const trimmedReal = trimExtremeValues(colReal, TRIM_COUNT);
      p10BalancesReal[t] = percentile(trimmedReal, 10);
      p25BalancesReal[t] = percentile(trimmedReal, 25);
      p50BalancesReal[t] = percentile(trimmedReal, 50);
      p75BalancesReal[t] = percentile(trimmedReal, 75);
      p90BalancesReal[t] = percentile(trimmedReal, 90);
      for (let i = 0; i < N; i++) {
        colNominal[i] = results[i].balancesNominal[t];
      }
      const trimmedNominal = trimExtremeValues(colNominal, TRIM_COUNT);
      p10BalancesNominal[t] = percentile(trimmedNominal, 10);
      p25BalancesNominal[t] = percentile(trimmedNominal, 25);
      p50BalancesNominal[t] = percentile(trimmedNominal, 50);
      p75BalancesNominal[t] = percentile(trimmedNominal, 75);
      p90BalancesNominal[t] = percentile(trimmedNominal, 90);
    }
    const eolValues = results.map((r) => r.eolReal);
    const trimmedEol = trimExtremeValues(eolValues, TRIM_COUNT);
    const eolReal_p25 = percentile(trimmedEol, 25);
    const eolReal_p50 = percentile(trimmedEol, 50);
    const eolReal_p75 = percentile(trimmedEol, 75);
    const y1Values = results.map((r) => r.y1AfterTaxReal);
    const trimmedY1 = trimExtremeValues(y1Values, TRIM_COUNT);
    const y1AfterTaxReal_p25 = percentile(trimmedY1, 25);
    const y1AfterTaxReal_p50 = percentile(trimmedY1, 50);
    const y1AfterTaxReal_p75 = percentile(trimmedY1, 75);
    const probRuin = results.filter((r) => r.ruined).length / N;
    const allRunsLightweight = results.map((r) => ({
      eolReal: r.eolReal,
      y1AfterTaxReal: r.y1AfterTaxReal,
      ruined: r.ruined,
      survYrs: r.survYrs
    }));
    return {
      p10BalancesReal,
      p25BalancesReal,
      p50BalancesReal,
      p75BalancesReal,
      p90BalancesReal,
      p10BalancesNominal,
      p25BalancesNominal,
      p50BalancesNominal,
      p75BalancesNominal,
      p90BalancesNominal,
      eolReal_p25,
      eolReal_p50,
      eolReal_p75,
      y1AfterTaxReal_p25,
      y1AfterTaxReal_p50,
      y1AfterTaxReal_p75,
      probRuin,
      allRuns: allRunsLightweight
    };
  }
  function simulateYearsChunk(cohorts, fundReal, realReturnRate, perBenReal, deathAge, minDistAge, totalFertilityRate, fertilityWindowStart, fertilityWindowEnd, birthsPerYear, numYears) {
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
      const eligible = currentCohorts.filter((c) => c.age >= minDistAge).reduce((acc, c) => acc + c.size, 0);
      const payout = perBenReal * eligible;
      currentFund -= payout;
      if (currentFund < 0) {
        return { cohorts: currentCohorts, fundReal: 0, years: yearsSimulated, depleted: true };
      }
      yearsSimulated += 1;
      currentCohorts.forEach((c) => c.age += 1);
      currentCohorts.forEach((cohort) => {
        if (cohort.canReproduce && cohort.age >= fertilityWindowStart && cohort.age <= fertilityWindowEnd && cohort.cumulativeBirths < totalFertilityRate) {
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
  function checkPerpetualViability(realReturnRate, totalFertilityRate, generationLength, perBenReal, initialFundReal, startBens) {
    const populationGrowthRate = (totalFertilityRate - 2) / generationLength;
    const perpetualThreshold = realReturnRate - populationGrowthRate;
    const annualDistribution = perBenReal * startBens;
    const distributionRate = annualDistribution / initialFundReal;
    const safeThreshold = perpetualThreshold * 0.95;
    return distributionRate < safeThreshold;
  }
  function simulateRealPerBeneficiaryPayout(eolNominal, yearsFrom2025, nominalRet, inflPct, perBenReal, startBens, totalFertilityRate, generationLength, deathAge, minDistAge, capYears, initialBenAges, fertilityWindowStart, fertilityWindowEnd) {
    let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
    const r = realReturn(nominalRet, inflPct);
    const fertilityWindowYears = fertilityWindowEnd - fertilityWindowStart;
    const birthsPerYear = fertilityWindowYears > 0 ? totalFertilityRate / fertilityWindowYears : 0;
    let cohorts = initialBenAges.length > 0 ? initialBenAges.map((age) => ({
      size: 1,
      age,
      canReproduce: age <= fertilityWindowEnd,
      cumulativeBirths: 0
    })) : startBens > 0 ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }] : [];
    const isPerpetual = checkPerpetualViability(
      r,
      totalFertilityRate,
      generationLength,
      perBenReal,
      fundReal,
      startBens
    );
    if (isPerpetual && capYears >= 1e4) {
      return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: startBens, generationData: [] };
    }
    let years = 0;
    const CHUNK_SIZE = 10;
    const EARLY_TERM_CHECK = 1e3;
    let fundAtYear100 = 0;
    let fundAtYear1000 = 0;
    const generationData = [];
    let nextGenerationCheckpoint = generationLength;
    let generationNumber = 1;
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
        return { years, fundLeftReal: 0, lastLivingCount: living, generationData };
      }
      if (t >= nextGenerationCheckpoint && generationData.length < 10) {
        const estateValueNominal = fundReal * Math.pow(1 + inflPct / 100, yearsFrom2025 + t);
        const exemption = 1361e4;
        const taxableEstate = Math.max(0, estateValueNominal - exemption);
        const estateTax = taxableEstate * 0.4;
        const netToHeirs = estateValueNominal - estateTax;
        generationData.push({
          generation: generationNumber,
          year: t,
          estateValue: estateValueNominal,
          estateTax,
          netToHeirs,
          fundRealValue: fundReal,
          livingBeneficiaries: cohorts.reduce((acc, c) => acc + c.size, 0)
        });
        nextGenerationCheckpoint += generationLength;
        generationNumber++;
      }
      if (t === 100 && fundAtYear100 === 0) {
        fundAtYear100 = fundReal;
      }
      if (t === EARLY_TERM_CHECK && fundAtYear1000 === 0) {
        fundAtYear1000 = fundReal;
      }
      if (t >= EARLY_TERM_CHECK && capYears >= 1e4) {
        if (fundAtYear100 > 0 && fundReal > fundAtYear1000) {
          const growthRate = Math.pow(fundReal / fundAtYear1000, 1 / (t - EARLY_TERM_CHECK)) - 1;
          if (growthRate > 0.03) {
            const living = cohorts.reduce((acc, c) => acc + c.size, 0);
            return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: living, generationData };
          }
        }
      }
    }
    const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
    return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving, generationData };
  }
  self.onmessage = function(e) {
    const { type, params, baseSeed, N, requestId } = e.data;
    if (type === "run") {
      try {
        const result = runMonteCarloSimulation(params, baseSeed, N);
        self.postMessage({
          type: "complete",
          result
        });
      } catch (error) {
        self.postMessage({
          type: "error",
          error: error.message
        });
      }
    } else if (type === "legacy") {
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
          capYears = 1e4,
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
          type: "legacy-complete",
          result,
          requestId
        });
      } catch (error) {
        self.postMessage({
          type: "error",
          error: error.message,
          requestId
        });
      }
    } else if (type === "guardrails") {
      try {
        const {
          allRuns,
          spendingReduction = 0.1
        } = params;
        const failedPaths = allRuns.filter((r) => r.ruined);
        if (failedPaths.length === 0) {
          self.postMessage({
            type: "guardrails-complete",
            result: {
              totalFailures: 0,
              preventableFailures: 0,
              newSuccessRate: 1,
              baselineSuccessRate: 1,
              improvement: 0
            }
          });
          return;
        }
        let preventableFailures = 0;
        failedPaths.forEach((path) => {
          const year = path.survYrs;
          let preventionRate = 0;
          if (year <= 5) {
            preventionRate = 0.75;
          } else if (year <= 10) {
            preventionRate = 0.65;
          } else if (year <= 15) {
            preventionRate = 0.45;
          } else if (year <= 20) {
            preventionRate = 0.3;
          } else if (year <= 25) {
            preventionRate = 0.15;
          } else {
            preventionRate = 0.05;
          }
          const effectivenessScale = Math.min(1, spendingReduction / 0.1);
          preventableFailures += preventionRate * effectivenessScale;
        });
        const totalPaths = allRuns.length;
        const baselineSuccessRate = (totalPaths - failedPaths.length) / totalPaths;
        const newSuccesses = totalPaths - failedPaths.length + preventableFailures;
        const newSuccessRate = newSuccesses / totalPaths;
        const improvement = newSuccessRate - baselineSuccessRate;
        self.postMessage({
          type: "guardrails-complete",
          result: {
            totalFailures: failedPaths.length,
            preventableFailures: Math.round(preventableFailures),
            newSuccessRate,
            baselineSuccessRate,
            improvement
          }
        });
      } catch (error) {
        self.postMessage({
          type: "error",
          error: error.message
        });
      }
    } else if (type === "roth-optimizer") {
      try {
        const {
          retAge,
          pretaxBalance,
          marital,
          ssIncome = 0,
          annualWithdrawal = 0,
          targetBracket = 0.24,
          growthRate = 0.07
        } = params;
        if (!pretaxBalance || pretaxBalance <= 0) {
          self.postMessage({
            type: "roth-optimizer-complete",
            result: {
              hasRecommendation: false,
              reason: "No pre-tax balance to convert"
            }
          });
          return;
        }
        const conversionYears = Math.max(0, RMD_START_AGE - retAge);
        if (conversionYears <= 0) {
          self.postMessage({
            type: "roth-optimizer-complete",
            result: {
              hasRecommendation: false,
              reason: "Already at or past RMD age"
            }
          });
          return;
        }
        const status = marital === "married" ? "married" : "single";
        const brackets = TAX_BRACKETS[status];
        const deduction = brackets.deduction;
        let targetBracketLimit = 0;
        for (const b of brackets.rates) {
          if (b.rate === targetBracket) {
            targetBracketLimit = b.limit;
            break;
          }
        }
        if (targetBracketLimit === 0) {
          targetBracketLimit = marital === "married" ? 394600 : 197300;
        }
        let baselinePretax = pretaxBalance;
        let baselineLifetimeTax = 0;
        const baselineRMDs = [];
        for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
          const rmd = calcRMD(baselinePretax, age);
          const totalIncome = rmd + ssIncome;
          const tax = calcOrdinaryTax(totalIncome, status);
          baselineRMDs.push({ age, rmd, tax });
          baselineLifetimeTax += tax;
          baselinePretax = (baselinePretax - rmd) * (1 + growthRate);
        }
        let optimizedPretax = pretaxBalance;
        let optimizedLifetimeTax = 0;
        const conversions = [];
        for (let age = retAge; age < RMD_START_AGE; age++) {
          const baseIncome = ssIncome + annualWithdrawal;
          const taxableBeforeConversion = Math.max(0, baseIncome - deduction);
          const roomInBracket = Math.max(0, targetBracketLimit - taxableBeforeConversion);
          const conversionAmount = Math.min(roomInBracket, optimizedPretax);
          if (conversionAmount > 5e3) {
            const totalIncome = baseIncome + conversionAmount;
            const tax = calcOrdinaryTax(totalIncome, status);
            conversions.push({
              age,
              conversionAmount,
              tax,
              pretaxBalanceBefore: optimizedPretax
            });
            optimizedLifetimeTax += tax;
            optimizedPretax -= conversionAmount;
          }
          optimizedPretax *= 1 + growthRate;
        }
        const optimizedRMDs = [];
        for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
          const rmd = calcRMD(optimizedPretax, age);
          const totalIncome = rmd + ssIncome;
          const tax = calcOrdinaryTax(totalIncome, status);
          optimizedRMDs.push({ age, rmd, tax });
          optimizedLifetimeTax += tax;
          optimizedPretax = (optimizedPretax - rmd) * (1 + growthRate);
        }
        const lifetimeTaxSavings = baselineLifetimeTax - optimizedLifetimeTax;
        const totalConverted = conversions.reduce((sum, c) => sum + c.conversionAmount, 0);
        const avgAnnualConversion = conversions.length > 0 ? totalConverted / conversions.length : 0;
        const baselineTotalRMDs = baselineRMDs.reduce((sum, r) => sum + r.rmd, 0);
        const optimizedTotalRMDs = optimizedRMDs.reduce((sum, r) => sum + r.rmd, 0);
        const rmdReduction = baselineTotalRMDs - optimizedTotalRMDs;
        const rmdReductionPercent = baselineTotalRMDs > 0 ? rmdReduction / baselineTotalRMDs * 100 : 0;
        const baselineAvgRate = baselineTotalRMDs > 0 ? baselineLifetimeTax / baselineTotalRMDs : 0;
        const optimizedAvgRate = optimizedTotalRMDs + totalConverted > 0 ? optimizedLifetimeTax / (optimizedTotalRMDs + totalConverted) : 0;
        const effectiveRateImprovement = (baselineAvgRate - optimizedAvgRate) * 100;
        self.postMessage({
          type: "roth-optimizer-complete",
          result: {
            hasRecommendation: conversions.length > 0 && lifetimeTaxSavings > 0,
            conversions,
            conversionWindow: {
              startAge: retAge,
              endAge: RMD_START_AGE - 1,
              years: conversionYears
            },
            totalConverted,
            avgAnnualConversion,
            lifetimeTaxSavings,
            baselineLifetimeTax,
            optimizedLifetimeTax,
            rmdReduction,
            rmdReductionPercent,
            effectiveRateImprovement,
            baselineRMDs: baselineRMDs.slice(0, 10),
            optimizedRMDs: optimizedRMDs.slice(0, 10),
            targetBracket,
            targetBracketLimit
          }
        });
      } catch (error) {
        self.postMessage({
          type: "error",
          error: error.message
        });
      }
    } else if (type === "optimize") {
      try {
        const { params: baseParams, baseSeed: baseSeed2 } = e.data;
        const SUCCESS_THRESHOLD = 0.95;
        const TEST_RUNS = 400;
        const SAFETY_MAX_ITERATIONS = 50;
        const testSuccess = (testParams) => {
          const result = runMonteCarloSimulation(testParams, baseSeed2, TEST_RUNS);
          return result.probRuin < 1 - SUCCESS_THRESHOLD;
        };
        let surplusAnnual = 0;
        const currentTotalContrib = baseParams.cTax1 + baseParams.cPre1 + baseParams.cPost1 + baseParams.cTax2 + baseParams.cPre2 + baseParams.cPost2 + baseParams.cMatch1 + baseParams.cMatch2;
        if (currentTotalContrib > 0) {
          let low = 0;
          let high = currentTotalContrib;
          let minContrib = currentTotalContrib;
          let iterations = 0;
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
              cMatch2: baseParams.cMatch2 * scaleFactor
            };
            if (testSuccess(testParams)) {
              minContrib = mid;
              high = mid;
            } else {
              low = mid;
            }
            if (Math.abs(high - low) < 100) break;
          }
          surplusAnnual = currentTotalContrib - minContrib;
        }
        const liquidBalance = baseParams.sTax;
        let maxSplurge = 0;
        let splurgeLow = 0;
        let splurgeHigh = Math.min(5e6, liquidBalance * 0.95);
        let splurgeIterations = 0;
        if (liquidBalance > 0) {
          while (splurgeLow < splurgeHigh && splurgeIterations < SAFETY_MAX_ITERATIONS) {
            splurgeIterations++;
            const mid = splurgeLow + (splurgeHigh - splurgeLow) / 2;
            const testParams = {
              ...baseParams,
              sTax: Math.max(0, baseParams.sTax - mid)
            };
            if (testSuccess(testParams)) {
              maxSplurge = mid;
              splurgeLow = mid;
            } else {
              splurgeHigh = mid;
            }
            if (splurgeHigh - splurgeLow < 1e3) break;
          }
        }
        const currentAge = Math.min(baseParams.age1, baseParams.age2 || baseParams.age1);
        let earliestRetirementAge = baseParams.retAge;
        let freedomIterations = 0;
        let minAge = currentAge + 1;
        let maxAge = baseParams.retAge;
        let bestAge = baseParams.retAge;
        while (minAge <= maxAge && freedomIterations < SAFETY_MAX_ITERATIONS) {
          freedomIterations++;
          const midAge = Math.floor((minAge + maxAge) / 2);
          const testParams = {
            ...baseParams,
            retAge: midAge
          };
          if (testSuccess(testParams)) {
            bestAge = midAge;
            maxAge = midAge - 1;
          } else {
            minAge = midAge + 1;
          }
        }
        earliestRetirementAge = bestAge;
        self.postMessage({
          type: "optimize-complete",
          result: {
            surplusAnnual: Math.max(0, surplusAnnual),
            surplusMonthly: Math.max(0, surplusAnnual / 12),
            maxSplurge: Math.max(0, maxSplurge),
            earliestRetirementAge,
            yearsEarlier: Math.max(0, baseParams.retAge - earliestRetirementAge)
          }
        });
      } catch (error) {
        self.postMessage({
          type: "error",
          error: error.message
        });
      }
    }
  };
})();

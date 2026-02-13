/**
 * Web Worker for Monte Carlo Retirement Simulation
 * Runs N=2000 simulations off the main thread to prevent UI blocking
 *
 * This worker imports shared calculation logic from lib/calculations/shared/
 * to ensure consistency with the main application.
 */

// Import all shared calculation functions and constants
import {
  // Constants
  LIFE_EXP,
  RMD_START_AGE,
  TAX_BRACKETS,
  // Types
  type FilingStatus,
  type BondGlidePath,
  // Utility functions
  mulberry32,
  percentile,
  trimExtremeValues,
  realReturn,
  getEffectiveInflation,
  // Tax calculations
  calcOrdinaryTax,
  calcLTCGTax,
  getIRMAASurcharge,
  calculateEmploymentTaxes,
  type EmploymentType,
  // Social Security
  calcPIA,
  calcSocialSecurity,
  calculateEffectiveSS,
  // Expenses
  calculateChildExpenses,
  calculatePreMedicareHealthcareCosts,
  // RMD
  calcRMD,
  // Withdrawal taxes
  computeWithdrawalTaxes,
  // Return generator
  buildReturnGenerator,
  type ReturnMode,
  type WalkSeries,
} from "../shared";

// ===============================
// Type Definitions
// ===============================

interface SimulationParams {
  marital: FilingStatus;
  age1: number;
  age2: number;
  retirementAge: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  inflationRate: number;
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
  dividendYield?: number;
  enableRothConversions?: boolean;
  targetConversionBracket?: number;
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
  emergencyFund?: number;
  numChildren?: number;
  childrenAges?: number[];
  additionalChildrenExpected?: number;
  primaryIncome?: number;
  spouseIncome?: number;
  employmentType1?: EmploymentType;
  employmentType2?: EmploymentType;
  bondGlidePath?: BondGlidePath | null;
}

interface SimulationResult {
  balancesReal: number[];
  balancesNominal: number[];
  eolReal: number;
  y1AfterTaxReal: number;
  ruined: boolean;
  survYrs: number;
  totalRothConversions: number;
  conversionTaxesPaid: number;
}

interface Cohort {
  size: number;
  age: number;
  canReproduce: boolean;
  cumulativeBirths: number;
}

// ===============================
// Single Simulation Runner
// ===============================

function runSingleSimulation(params: SimulationParams, seed: number): SimulationResult {
  const {
    marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
    inflationShockRate,
    inflationShockDuration = 5,
    dividendYield = 2.0,
    enableRothConversions = false,
    targetConversionBracket = 0.24,
    includeMedicare = false,
    medicarePremium = 400,
    medicalInflation = 5.0,
    includeLTC = false,
    ltcAnnualCost = 80000,
    ltcProbability = 50,
    ltcDuration = 2.5,
    ltcOnsetAge = 82,
    emergencyFund = 0,
    numChildren = 0,
    childrenAges = [],
    additionalChildrenExpected = 0,
    primaryIncome = 0,
    spouseIncome = 0,
    employmentType1 = 'w2' as EmploymentType,
    employmentType2 = 'w2' as EmploymentType,
  } = params;

  const isMar = marital === "married";
  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);

  if (retirementAge <= younger) {
    throw new Error("Retirement age must be greater than current age");
  }

  const yrsToRet = retirementAge - younger;
  const g_fixed = 1 + retRate / 100;
  const infl = inflationRate / 100;
  const infl_factor = 1 + infl;

  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const accGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToRet + 1,
    nominalPct: retRate,
    infPct: inflationRate,
    walkSeries,
    seed: seed,
    startYear: historicalYear,
    bondGlidePath: params.bondGlidePath || null,
    currentAge: younger,
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: inflationRate,
    walkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined,
    bondGlidePath: params.bondGlidePath || null,
    currentAge: older + yrsToRet,
  })();

  let bTax = taxableBalance;
  let bPre = pretaxBalance;
  let bPost = rothBalance;
  let basisTax = taxableBalance;
  let bEmergency = emergencyFund;

  const totalYears = yrsToRet + yrsToSim + 1;
  const balancesReal = new Array<number>(totalYears);
  const balancesNominal = new Array<number>(totalYears);
  let balanceIndex = 0;
  let cumulativeInflation = 1.0;
  const c = {
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

      // Yield Drag: Tax annual dividends/interest in taxable account
      if (bTax > 0 && dividendYield > 0) {
        const yieldIncome = bTax * (dividendYield / 100);
        const yieldTax = calcLTCGTax(yieldIncome, marital, 0);
        bTax -= yieldTax;
      }
    }

    if (y > 0 && incContrib) {
      const f = 1 + incRate / 100;
      Object.keys(c.p).forEach((k) => ((c.p as Record<string, number>)[k] *= f));
      if (isMar)
        Object.keys(c.s).forEach((k) => ((c.s as Record<string, number>)[k] *= f));
    }

    const addMidYear = (amt: number) => amt * (1 + (g - 1) * 0.5);

    if (a1 < retirementAge) {
      bTax += addMidYear(c.p.tax);
      bPre += addMidYear(c.p.pre + c.p.match);
      bPost += addMidYear(c.p.post);
      basisTax += c.p.tax;
    }
    if (isMar && a2 !== null && a2 < retirementAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    // Calculate child-related expenses during accumulation phase
    if (childrenAges.length > 0 || numChildren > 0) {
      const effectiveChildrenAges = [...childrenAges];

      if (effectiveChildrenAges.length === 0 && numChildren > 0) {
        for (let i = 0; i < numChildren; i++) {
          effectiveChildrenAges.push(5 + i * 3);
        }
      }

      if (additionalChildrenExpected > 0 && y > 0) {
        const yearsToAddChildren = Math.min(additionalChildrenExpected * 2, yrsToRet);
        if (y <= yearsToAddChildren && (y % 2 === 0)) {
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

      if (childExpenses > 0 && a1 < retirementAge) {
        bTax = Math.max(0, bTax - childExpenses);
      }
    }

    // Calculate employment taxes during accumulation phase
    if (a1 < retirementAge && primaryIncome > 0) {
      if (employmentType1 === 'self-employed') {
        const empTax1 = calculateEmploymentTaxes(primaryIncome * Math.pow(1 + incRate / 100, y), employmentType1);
        const extraTax = empTax1 * 0.5;
        bTax = Math.max(0, bTax - extraTax);
      }
    }
    if (isMar && a2 !== null && a2 < retirementAge && spouseIncome > 0) {
      if (employmentType2 === 'self-employed') {
        const empTax2 = calculateEmploymentTaxes(spouseIncome * Math.pow(1 + incRate / 100, y), employmentType2);
        const extraTax = empTax2 * 0.5;
        bTax = Math.max(0, bTax - extraTax);
      }
    }

    // Calculate pre-Medicare healthcare costs during accumulation phase
    if (a1 < retirementAge) {
      let dependentChildCount = 0;
      if (childrenAges.length > 0) {
        dependentChildCount = childrenAges.filter(startAge => {
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

    // Emergency fund grows at inflation rate only
    if (y > 0) {
      bEmergency *= infl_factor;
    }

    const bal = bTax + bPre + bPost + bEmergency;
    const yearInflation = getEffectiveInflation(y, yrsToRet, inflationRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
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

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    const g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;
    retBalEmergency *= infl_factor;

    // Yield Drag
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

    // Roth Conversion Strategy
    if (enableRothConversions && currentAge < RMD_START_AGE && retBalPre > 0 && retBalTax > 0) {
      const brackets = TAX_BRACKETS[marital];
      const targetBracket = brackets.rates.find(b => b.rate === targetConversionBracket);

      if (targetBracket) {
        const currentOrdinaryIncome = ssAnnualBenefit;
        const bracketThreshold = targetBracket.limit + brackets.deduction;
        const headroom = Math.max(0, bracketThreshold - currentOrdinaryIncome);

        if (headroom > 0) {
          const maxConversion = Math.min(headroom, retBalPre);
          const conversionTax = calcOrdinaryTax(currentOrdinaryIncome + maxConversion, marital) -
                                calcOrdinaryTax(currentOrdinaryIncome, marital);

          const affordableConversion = conversionTax > 0 ?
            Math.min(maxConversion, retBalTax / conversionTax * maxConversion) :
            maxConversion;

          if (affordableConversion > 0) {
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

    // Calculate child expenses during retirement
    let childExpensesDuringRetirement = 0;
    if (childrenAges.length > 0 || numChildren > 0) {
      const effectiveChildrenAges = [...childrenAges];
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

    const netSpendingNeed = Math.max(0, currWdGross + healthcareCosts + childExpensesDuringRetirement - ssAnnualBenefit);
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
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, inflationRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
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
    conversionTaxesPaid,
  };
}

// ===============================
// Monte Carlo Batch Runner
// ===============================

function runMonteCarloSimulation(params: SimulationParams, baseSeed: number, N: number = 2000) {
  const results = new Array<SimulationResult>(N);

  const rng = mulberry32(baseSeed);
  const seeds = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    seeds[i] = (rng() * 1000000) >>> 0;
  }

  const PROGRESS_INTERVAL = 100;

  for (let i = 0; i < N; i++) {
    results[i] = runSingleSimulation(params, seeds[i]);

    if ((i + 1) % PROGRESS_INTERVAL === 0 || i === N - 1) {
      self.postMessage({
        type: 'progress',
        completed: i + 1,
        total: N,
      });
    }
  }

  const trimPercent = Math.min(0.025, 0.25 * N / (2 * N));
  const TRIM_COUNT = Math.floor(N * trimPercent);
  const T = results[0].balancesReal.length;

  const p10BalancesReal = new Array<number>(T);
  const p25BalancesReal = new Array<number>(T);
  const p50BalancesReal = new Array<number>(T);
  const p75BalancesReal = new Array<number>(T);
  const p90BalancesReal = new Array<number>(T);
  const p10BalancesNominal = new Array<number>(T);
  const p25BalancesNominal = new Array<number>(T);
  const p50BalancesNominal = new Array<number>(T);
  const p75BalancesNominal = new Array<number>(T);
  const p90BalancesNominal = new Array<number>(T);

  const colReal = new Array<number>(N);
  const colNominal = new Array<number>(N);

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

  const allRunsLightweight = results.map(r => ({
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
    allRuns: allRunsLightweight,
  };
}

// ===============================
// Legacy Simulation Functions (Generational Wealth)
// ===============================

function simulateYearsChunk(
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

function checkPerpetualViability(
  realReturnRate: number,
  totalFertilityRate: number,
  generationLength: number,
  perBenReal: number,
  initialFundReal: number,
  startBens: number
): boolean {
  const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
  const perpetualThreshold = realReturnRate - populationGrowthRate;
  const annualDistribution = perBenReal * startBens;
  const distributionRate = annualDistribution / initialFundReal;
  const safeThreshold = perpetualThreshold * 0.95;

  return distributionRate < safeThreshold;
}

interface GenerationDataPoint {
  generation: number;
  year: number;
  estateValue: number;
  estateTax: number;
  netToHeirs: number;
  fundRealValue: number;
  livingBeneficiaries: number;
}

function simulateRealPerBeneficiaryPayout(
  eolNominal: number,
  yearsFrom2025: number,
  nominalRet: number,
  inflPct: number,
  perBenReal: number,
  startBens: number,
  totalFertilityRate: number,
  generationLength: number,
  deathAge: number,
  minDistAge: number,
  capYears: number,
  initialBenAges: number[],
  fertilityWindowStart: number,
  fertilityWindowEnd: number,
  marital: FilingStatus = 'single'
): { years: number; fundLeftReal: number; lastLivingCount: number; generationData: GenerationDataPoint[] } {
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
    return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: startBens, generationData: [] };
  }

  let years = 0;
  const CHUNK_SIZE = 10;
  const EARLY_TERM_CHECK = 1000;

  let fundAtYear100 = 0;
  let fundAtYear1000 = 0;

  const generationData: GenerationDataPoint[] = [];
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
      // Estate tax exemption: base of $13.61M (2026), inflated at 2.6% annually
      // For married couples with portability: $27.22M base
      const baseExemption = marital === 'married' ? 27220000 : 13610000;
      const currentYear = 2026 + yearsFrom2025 + t;
      const yearsAfter2026 = currentYear - 2026;
      const inflatedExemption = yearsAfter2026 > 0
        ? baseExemption * Math.pow(1.026, yearsAfter2026)
        : baseExemption;
      const taxableEstate = Math.max(0, estateValueNominal - inflatedExemption);
      const estateTax = taxableEstate * 0.40;
      const netToHeirs = estateValueNominal - estateTax;

      generationData.push({
        generation: generationNumber,
        year: t,
        estateValue: estateValueNominal,
        estateTax: estateTax,
        netToHeirs: netToHeirs,
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

    if (t >= EARLY_TERM_CHECK && capYears >= 10000) {
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

// ===============================
// Worker Message Handler
// ===============================

self.onmessage = function(e: MessageEvent) {
  const { type, params, baseSeed, N, requestId } = e.data;

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
        error: (error as Error).message,
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
        fertilityWindowEnd = 35,
        marital = 'single',
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
        fertilityWindowEnd,
        marital
      );

      self.postMessage({
        type: 'legacy-complete',
        result,
        requestId,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: (error as Error).message,
        requestId,
      });
    }
  } else if (type === 'guardrails') {
    try {
      const {
        allRuns,
        spendingReduction = 0.10,
      } = params;

      const failedPaths = allRuns.filter((r: { ruined: boolean }) => r.ruined);

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

      let preventableFailures = 0;

      failedPaths.forEach((path: { survYrs: number }) => {
        const year = path.survYrs;
        let preventionRate = 0;

        if (year <= 5) {
          preventionRate = 0.75;
        } else if (year <= 10) {
          preventionRate = 0.65;
        } else if (year <= 15) {
          preventionRate = 0.45;
        } else if (year <= 20) {
          preventionRate = 0.30;
        } else if (year <= 25) {
          preventionRate = 0.15;
        } else {
          preventionRate = 0.05;
        }

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
        error: (error as Error).message,
      });
    }
  } else if (type === 'roth-optimizer') {
    try {
      const {
        retirementAge: retAge,
        pretaxBalance,
        marital,
        ssIncome = 0,
        annualWithdrawal = 0,
        targetBracket = 0.24,
        growthRate = 0.07,
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

      const status: FilingStatus = marital === 'married' ? 'married' : 'single';
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
        targetBracketLimit = marital === 'married' ? 394600 : 197300;
      }

      // Baseline scenario: No conversions
      let baselinePretax = pretaxBalance;
      let baselineLifetimeTax = 0;
      const baselineRMDs: { age: number; rmd: number; tax: number }[] = [];

      for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
        const rmd = calcRMD(baselinePretax, age);
        const totalIncome = rmd + ssIncome;
        const tax = calcOrdinaryTax(totalIncome, status);

        baselineRMDs.push({ age, rmd, tax });
        baselineLifetimeTax += tax;

        baselinePretax = (baselinePretax - rmd) * (1 + growthRate);
      }

      // Optimized scenario: Strategic conversions
      let optimizedPretax = pretaxBalance;
      let optimizedLifetimeTax = 0;
      const conversions: { age: number; conversionAmount: number; tax: number; pretaxBalanceBefore: number }[] = [];

      for (let age = retAge; age < RMD_START_AGE; age++) {
        const baseIncome = ssIncome + annualWithdrawal;
        const taxableBeforeConversion = Math.max(0, baseIncome - deduction);
        const roomInBracket = Math.max(0, targetBracketLimit - taxableBeforeConversion);
        const conversionAmount = Math.min(roomInBracket, optimizedPretax);

        if (conversionAmount > 5000) {
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

        optimizedPretax *= (1 + growthRate);
      }

      const optimizedRMDs: { age: number; rmd: number; tax: number }[] = [];
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
      const rmdReductionPercent = baselineTotalRMDs > 0 ? (rmdReduction / baselineTotalRMDs) * 100 : 0;

      const baselineAvgRate = baselineTotalRMDs > 0 ? baselineLifetimeTax / baselineTotalRMDs : 0;
      const optimizedAvgRate = (optimizedTotalRMDs + totalConverted) > 0
        ? optimizedLifetimeTax / (optimizedTotalRMDs + totalConverted) : 0;
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
          baselineRMDs: baselineRMDs.slice(0, 10),
          optimizedRMDs: optimizedRMDs.slice(0, 10),
          targetBracket,
          targetBracketLimit,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: (error as Error).message,
      });
    }
  } else if (type === 'optimize') {
    try {
      const { params: baseParams, baseSeed } = e.data;
      const SUCCESS_THRESHOLD = 0.95;
      const TEST_RUNS = 400;
      const SAFETY_MAX_ITERATIONS = 50;

      const testSuccess = (testParams: SimulationParams) => {
        const result = runMonteCarloSimulation(testParams, baseSeed, TEST_RUNS);
        return result.probRuin < (1 - SUCCESS_THRESHOLD);
      };

      // 1. Calculate oversaving (monthly surplus)
      let surplusAnnual = 0;
      const currentTotalContrib = baseParams.cTax1 + baseParams.cPre1 + baseParams.cPost1 +
                                   baseParams.cTax2 + baseParams.cPre2 + baseParams.cPost2 +
                                   baseParams.cMatch1 + baseParams.cMatch2;

      if (currentTotalContrib > 0) {
        let low = 0;
        let high = currentTotalContrib;
        let minContrib = currentTotalContrib;
        let iterations = 0;

        while (low < high && iterations < SAFETY_MAX_ITERATIONS) {
          iterations++;
          const mid = low + (high - low) / 2;
          const scaleFactor = mid / currentTotalContrib;

          const testParams: SimulationParams = {
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
            high = mid;
          } else {
            low = mid;
          }

          if (Math.abs(high - low) < 100) break;
        }

        surplusAnnual = currentTotalContrib - minContrib;
      }

      // 2. Calculate splurge capacity
      const liquidBalance = baseParams.taxableBalance;
      let maxSplurge = 0;
      let splurgeLow = 0;
      let splurgeHigh = Math.min(5000000, liquidBalance * 0.95);
      let splurgeIterations = 0;

      if (liquidBalance > 0) {
        while (splurgeLow < splurgeHigh && splurgeIterations < SAFETY_MAX_ITERATIONS) {
          splurgeIterations++;
          const mid = splurgeLow + (splurgeHigh - splurgeLow) / 2;

          const testParams: SimulationParams = {
            ...baseParams,
            taxableBalance: Math.max(0, baseParams.taxableBalance - mid),
          };

          if (testSuccess(testParams)) {
            maxSplurge = mid;
            splurgeLow = mid;
          } else {
            splurgeHigh = mid;
          }

          if (splurgeHigh - splurgeLow < 1000) break;
        }
      }

      // 3. Calculate freedom date
      const currentAge = Math.min(baseParams.age1, baseParams.age2 || baseParams.age1);
      let earliestRetirementAge = baseParams.retirementAge;
      let freedomIterations = 0;

      let minAge = currentAge + 1;
      let maxAge = baseParams.retirementAge;
      let bestAge = baseParams.retirementAge;

      while (minAge <= maxAge && freedomIterations < SAFETY_MAX_ITERATIONS) {
        freedomIterations++;
        const midAge = Math.floor((minAge + maxAge) / 2);

        const testParams: SimulationParams = {
          ...baseParams,
          retirementAge: midAge,
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
        type: 'optimize-complete',
        result: {
          surplusAnnual: Math.max(0, surplusAnnual),
          surplusMonthly: Math.max(0, surplusAnnual / 12),
          maxSplurge: Math.max(0, maxSplurge),
          earliestRetirementAge,
          yearsEarlier: Math.max(0, baseParams.retirementAge - earliestRetirementAge),
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: (error as Error).message,
      });
    }
  }
};

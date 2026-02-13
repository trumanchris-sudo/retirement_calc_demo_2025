/**
 * Healthcare Cost Calculation Engine
 *
 * Comprehensive healthcare cost modeling for retirement planning.
 * Addresses the #1 fear in retirement: healthcare expenses.
 *
 * Key Features:
 * - Pre-Medicare costs (ages 55-64): ACA marketplace, COBRA, alternatives
 * - Medicare costs (65+): Parts A/B/D, IRMAA surcharges, Medigap
 * - Long-term care planning with probability-weighted costs
 * - ACA subsidy optimization
 * - HSA strategy and growth projections
 *
 * Sources:
 * - Fidelity 2024: $315,000 lifetime healthcare for 65-year-old couple
 * - Kaiser Family Foundation: ACA marketplace premiums
 * - CMS Medicare & Medicaid Services: 2024 Medicare premiums
 * - Genworth Cost of Care Survey 2024: Long-term care costs
 */

import { IRMAA_BRACKETS_2026, TAX_BRACKETS, type FilingStatus } from "./shared/constants";
import { getIRMAASurcharge } from "./shared/taxCalculations";

// ===============================
// Constants - 2024/2025 Values
// ===============================

/**
 * Medicare Part B Premium Constants (2024 base year)
 * Standard premium: $174.70/month in 2024
 * This is the baseline before IRMAA surcharges
 */
export const MEDICARE_PART_B = {
  standardPremium2024: 174.70,
  eligibilityAge: 65,
  // Historical growth rate: ~6.5% annually
  projectedGrowthRate: 0.065,
} as const;

/**
 * Medicare Part D (Prescription Drug) Constants
 * Average premium and out-of-pocket estimates
 */
export const MEDICARE_PART_D = {
  averagePremium2024: 55.50, // National average monthly premium
  averageOOP2024: 1800, // Average annual out-of-pocket for prescriptions
  growthRate: 0.07, // Prescription costs growing faster than general medical
} as const;

/**
 * Medigap (Medicare Supplement) Premium Estimates
 * Most popular plans are F, G, and N
 */
export const MEDIGAP_PREMIUMS = {
  planF: { age65Monthly: 200, age75Monthly: 280, age85Monthly: 400 },
  planG: { age65Monthly: 150, age75Monthly: 210, age85Monthly: 300 }, // Most popular
  planN: { age65Monthly: 100, age75Monthly: 140, age85Monthly: 200 },
  growthRate: 0.05,
} as const;

/**
 * Medicare Advantage Average Costs
 * Many have $0 premium but higher out-of-pocket
 */
export const MEDICARE_ADVANTAGE = {
  averagePremium2024: 18.50, // Average monthly premium (many are $0)
  averageOOP2024: 3500, // Higher OOP than traditional Medicare + Medigap
  maxOOPLimit2024: 8850, // 2024 MOOP for in-network
} as const;

/**
 * ACA Marketplace Premium Constants (2024)
 * Second-lowest cost Silver plan benchmarks by age
 * Source: KFF Health Insurance Marketplace Calculator
 */
export const ACA_MARKETPLACE = {
  // Monthly premiums before subsidies (2024 benchmark, national average)
  silverPremiumsByAge: {
    21: 310,
    30: 354,
    40: 398,
    50: 556,
    55: 700,
    60: 900,
    64: 1050,
  },
  // Age rating: ACA allows 3:1 ratio (64-year-old pays up to 3x 21-year-old)
  ageRatingRatio: 3.0,
  // Premium growth rate (has been moderate due to subsidies)
  growthRate: 0.04,
} as const;

/**
 * ACA Subsidy (Premium Tax Credit) Thresholds
 * Based on Federal Poverty Level (FPL)
 * Enhanced subsidies from American Rescue Plan extended through 2025
 */
export const ACA_SUBSIDIES_2024 = {
  // 2024 Federal Poverty Level (48 contiguous states)
  fpl2024Single: 15060,
  fpl2024Family2: 20440,
  fpl2024PerAdditional: 5380,
  // Subsidy eligibility: 100% - 400% FPL (no cliff with ARP extension)
  minFPLPercent: 100,
  maxFPLPercent: 400, // Subsidies available above this, but phase out
  // Maximum premium as % of income (varies by income level)
  premiumCaps: [
    { fplPercent: 150, maxPremiumPct: 0 },      // Up to 150% FPL: $0 premium
    { fplPercent: 200, maxPremiumPct: 2.0 },    // 150-200% FPL: 0-2% of income
    { fplPercent: 250, maxPremiumPct: 4.0 },    // 200-250% FPL: 2-4% of income
    { fplPercent: 300, maxPremiumPct: 6.0 },    // 250-300% FPL: 4-6% of income
    { fplPercent: 400, maxPremiumPct: 8.5 },    // 300-400% FPL: 6-8.5% of income
    { fplPercent: Infinity, maxPremiumPct: 8.5 }, // Above 400%: capped at 8.5%
  ],
} as const;

/**
 * COBRA Coverage Constants
 * Employer-sponsored continuation coverage
 */
export const COBRA = {
  // Duration: 18 months standard, 36 months for disability
  standardDurationMonths: 18,
  extendedDurationMonths: 36,
  // Cost: Full premium + 2% admin fee
  adminFee: 0.02,
  // Average employer plan costs (employee + employer share)
  avgIndividualMonthly2024: 703,
  avgFamilyMonthly2024: 1997,
} as const;

/**
 * Health Sharing Ministry Estimates
 * Alternative to traditional insurance (not ACA-compliant)
 */
export const HEALTH_SHARING = {
  avgMonthlyShare: 450,  // Average monthly "share" amount
  annualUnshareableLimit: 1000, // First $1,000 typically not shared
  maxSharingPerIncident: 1000000,
} as const;

/**
 * Long-Term Care Constants (2024)
 * Source: Genworth Cost of Care Survey 2024
 */
export const LONG_TERM_CARE = {
  // Annual costs (national median 2024)
  nursingHomePrivate: 116800,   // $320/day
  nursingHomeSemiPrivate: 104025, // $285/day
  assistedLiving: 64200,        // $5,350/month
  homeHealthAide: 68640,        // $33/hour x 40hrs x 52weeks
  adultDayCare: 23400,          // $90/day x 5 days x 52 weeks

  // Probability statistics (from various studies)
  probabilityOfNeeding65Plus: 0.70, // 70% will need some LTC
  avgDurationYears: 3.0,            // Average need is ~3 years
  medianDurationYears: 2.0,         // Median is shorter
  probabilityOver5Years: 0.20,      // 20% need >5 years of care

  // LTC Insurance estimates
  ltcInsuranceAvgAnnualPremiumAge55: 2500,
  ltcInsuranceAvgAnnualPremiumAge65: 4500,
  ltcInsuranceGrowthRate: 0.08, // LTC insurance premiums growing fast

  // Cost growth rate (faster than general inflation)
  costGrowthRate: 0.04,

  // Medicaid planning
  medicaidLookbackPeriod: 60, // 5 years look-back for asset transfers
} as const;

/**
 * HSA (Health Savings Account) Constants (2024)
 */
export const HSA_CONSTANTS = {
  // 2024 contribution limits
  individualLimit2024: 4150,
  familyLimit2024: 8300,
  catchUpAge55: 1000, // Additional for 55+
  // Projected growth in limits (~3% annually)
  limitGrowthRate: 0.03,
  // Investment return assumption (conservative)
  investmentReturn: 0.06, // 6% real return on invested HSA funds
} as const;

/**
 * Out-of-Pocket Maximums and Deductibles
 */
export const OOP_LIMITS = {
  // Medicare traditional (no formal OOP max, but estimate)
  medicareTraditionalEstimate: 7500,
  // Medigap typically covers most OOP
  medigapAnnualOOP: 250,
  // Medicare Advantage MOOP
  maMaxOOP2024: 8850,
  // ACA marketplace (2024)
  acaMaxOOP2024: 9450,
  acaMaxOOPFamily2024: 18900,
} as const;

// ===============================
// Type Definitions
// ===============================

export interface HealthcareCostInputs {
  // Personal info
  age1: number;
  age2?: number; // Spouse age (if married)
  maritalStatus: FilingStatus;
  stateOfResidence?: string;

  // Income (for ACA subsidies and IRMAA)
  estimatedMAGI: number;
  retirementIncome?: number;

  // Coverage preferences
  preMedicareCoverage: 'aca' | 'cobra' | 'spouse_employer' | 'health_sharing' | 'custom';
  medicareCoverage: 'traditional_medigap' | 'medicare_advantage' | 'traditional_only';
  medigapPlan?: 'F' | 'G' | 'N';

  // LTC planning
  includeLTC: boolean;
  ltcStrategy?: 'self_insure' | 'ltc_insurance' | 'hybrid' | 'medicaid_planning';
  ltcInsurancePremium?: number; // If they have existing LTC insurance

  // HSA
  hasHSA: boolean;
  currentHSABalance?: number;
  annualHSAContribution?: number;

  // Custom overrides
  customPreMedicareCost?: number;
  customMedicareCost?: number;
}

export interface HealthcareCostResult {
  // Summary
  totalLifetimeHealthcare: number;
  totalPreMedicare: number;
  totalMedicare: number;
  totalLTC: number;

  // Annual breakdown
  annualCostsByAge: AnnualHealthcareCost[];

  // Pre-Medicare analysis
  preMedicareAnalysis: PreMedicareAnalysis;

  // Medicare analysis
  medicareAnalysis: MedicareAnalysis;

  // LTC analysis
  ltcAnalysis: LTCAnalysis;

  // HSA strategy
  hsaStrategy: HSAStrategy;

  // ACA subsidy optimization
  acaSubsidyAnalysis?: ACASubsidyAnalysis;

  // Key warnings
  warnings: string[];
  recommendations: string[];
}

export interface AnnualHealthcareCost {
  age: number;
  year: number;
  premium: number;
  outOfPocket: number;
  ltcReserve: number;
  total: number;
  isPreMedicare: boolean;
  isMedicare: boolean;
  notes: string[];
}

export interface PreMedicareAnalysis {
  yearsBeforeMedicare: number;
  annualCost: number;
  totalCost: number;
  coverageType: string;
  acaSubsidyEligible: boolean;
  estimatedSubsidy: number;
  netCost: number;
  dangerZoneWarning: boolean;
  alternatives: AlternativeCoverage[];
}

export interface AlternativeCoverage {
  name: string;
  annualCost: number;
  pros: string[];
  cons: string[];
}

export interface MedicareAnalysis {
  partBPremium: number;
  partDPremium: number;
  supplementCost: number;
  totalMonthly: number;
  totalAnnual: number;
  irmaaSurcharge: number;
  irmaaTier: string;
  projectedLifetimeCost: number;
  recommendations: string[];
}

export interface LTCAnalysis {
  probabilityOfNeed: number;
  expectedCost: number;
  selfInsureTarget: number;
  insuranceOption: {
    annualPremium: number;
    totalPremiums: number;
    coverage: number;
    breakevenYears: number;
  };
  medicaidConsiderations: string[];
  recommendation: string;
}

export interface HSAStrategy {
  currentBalance: number;
  projectedBalanceAt65: number;
  projectedBalanceAt75: number;
  projectedBalanceAt85: number;
  annualContribution: number;
  totalContributions: number;
  totalGrowth: number;
  taxSavingsEstimate: number;
  recommendations: string[];
}

export interface ACASubsidyAnalysis {
  currentMAGI: number;
  fplPercent: number;
  maxPremiumPercent: number;
  benchmarkPremium: number;
  subsidyAmount: number;
  netPremium: number;
  // Optimization thresholds
  thresholds: SubsidyThreshold[];
  rothConversionImpact: number;
  recommendations: string[];
}

export interface SubsidyThreshold {
  fplPercent: number;
  incomeLimit: number;
  subsidyAtLimit: number;
  description: string;
}

// ===============================
// Core Calculation Functions
// ===============================

/**
 * Calculate Federal Poverty Level for household
 */
export function calculateFPL(
  householdSize: number,
  year: number = 2024
): number {
  // 2024 FPL for 48 contiguous states
  const baseFPL = ACA_SUBSIDIES_2024.fpl2024Single;
  const perAdditional = ACA_SUBSIDIES_2024.fpl2024PerAdditional;

  // Inflation adjust for future years
  const yearsFromBase = Math.max(0, year - 2024);
  const inflationFactor = Math.pow(1.025, yearsFromBase); // ~2.5% FPL growth

  const fpl = baseFPL + (householdSize - 1) * perAdditional;
  return fpl * inflationFactor;
}

/**
 * Calculate ACA premium subsidy based on income and age
 */
export function calculateACASubsidy(
  income: number,
  age: number,
  householdSize: number = 1,
  year: number = 2024
): { subsidyAmount: number; netPremium: number; fplPercent: number; maxPremiumPct: number } {
  const fpl = calculateFPL(householdSize, year);
  const fplPercent = (income / fpl) * 100;

  // Get benchmark premium (second-lowest Silver plan)
  const benchmarkPremium = getACABenchmarkPremium(age, year) * 12;

  // Find maximum premium cap based on income
  let maxPremiumPct = 8.5;
  for (const cap of ACA_SUBSIDIES_2024.premiumCaps) {
    if (fplPercent <= cap.fplPercent) {
      maxPremiumPct = cap.maxPremiumPct;
      break;
    }
  }

  // Calculate max contribution (% of income)
  const maxContribution = income * (maxPremiumPct / 100);

  // Subsidy is benchmark minus max contribution (but not negative)
  const subsidyAmount = Math.max(0, benchmarkPremium - maxContribution);

  // Net premium (could be $0 for low income)
  const netPremium = Math.max(0, benchmarkPremium - subsidyAmount);

  return {
    subsidyAmount,
    netPremium,
    fplPercent,
    maxPremiumPct,
  };
}

/**
 * Get ACA benchmark premium by age
 */
export function getACABenchmarkPremium(age: number, year: number = 2024): number {
  const premiums = ACA_MARKETPLACE.silverPremiumsByAge;
  const yearsFromBase = Math.max(0, year - 2024);
  const inflationFactor = Math.pow(1 + ACA_MARKETPLACE.growthRate, yearsFromBase);

  // Find closest age bracket
  let basePremium: number;
  if (age <= 21) basePremium = premiums[21];
  else if (age <= 30) basePremium = premiums[30];
  else if (age <= 40) basePremium = premiums[40];
  else if (age <= 50) basePremium = premiums[50];
  else if (age <= 55) basePremium = premiums[55];
  else if (age <= 60) basePremium = premiums[60];
  else basePremium = premiums[64];

  return basePremium * inflationFactor;
}

/**
 * Calculate COBRA costs
 */
export function calculateCOBRACost(
  isFamily: boolean,
  year: number = 2024
): { monthly: number; annual: number; with18Months: number } {
  const yearsFromBase = Math.max(0, year - 2024);
  const inflationFactor = Math.pow(1.07, yearsFromBase); // Healthcare inflation ~7%

  const baseCost = isFamily ? COBRA.avgFamilyMonthly2024 : COBRA.avgIndividualMonthly2024;
  const withAdminFee = baseCost * (1 + COBRA.adminFee);
  const monthly = withAdminFee * inflationFactor;

  return {
    monthly,
    annual: monthly * 12,
    with18Months: monthly * COBRA.standardDurationMonths,
  };
}

/**
 * Calculate total Medicare costs (Part B + Part D + Supplement)
 */
export function calculateMedicareCosts(
  age: number,
  income: number,
  maritalStatus: FilingStatus,
  coverageType: 'traditional_medigap' | 'medicare_advantage' | 'traditional_only',
  medigapPlan: 'F' | 'G' | 'N' = 'G',
  year: number = 2024
): MedicareAnalysis {
  if (age < MEDICARE_PART_B.eligibilityAge) {
    return {
      partBPremium: 0,
      partDPremium: 0,
      supplementCost: 0,
      totalMonthly: 0,
      totalAnnual: 0,
      irmaaSurcharge: 0,
      irmaaTier: 'Not eligible',
      projectedLifetimeCost: 0,
      recommendations: ['Medicare eligibility begins at age 65'],
    };
  }

  const yearsFromBase = Math.max(0, year - 2024);
  const medicalInflation = Math.pow(1 + MEDICARE_PART_B.projectedGrowthRate, yearsFromBase);

  // Part B premium with inflation
  let partBPremium = MEDICARE_PART_B.standardPremium2024 * medicalInflation;

  // IRMAA surcharge
  const irmaaSurcharge = getIRMAASurcharge(income, maritalStatus === 'married');
  partBPremium += irmaaSurcharge;

  // Determine IRMAA tier
  const irmaaTier = getIRMAATier(income, maritalStatus);

  // Part D premium
  const partDPremium = MEDICARE_PART_D.averagePremium2024 *
    Math.pow(1 + MEDICARE_PART_D.growthRate, yearsFromBase);

  // Supplement cost based on coverage type
  let supplementCost = 0;
  const recommendations: string[] = [];

  if (coverageType === 'traditional_medigap') {
    const medigapRates = MEDIGAP_PREMIUMS[`plan${medigapPlan}`];
    const medigapInflation = Math.pow(1 + MEDIGAP_PREMIUMS.growthRate, yearsFromBase);

    // Interpolate based on age
    if (age <= 65) {
      supplementCost = medigapRates.age65Monthly * medigapInflation;
    } else if (age <= 75) {
      const factor = (age - 65) / 10;
      supplementCost = (medigapRates.age65Monthly + factor * (medigapRates.age75Monthly - medigapRates.age65Monthly)) * medigapInflation;
    } else {
      const factor = Math.min(1, (age - 75) / 10);
      supplementCost = (medigapRates.age75Monthly + factor * (medigapRates.age85Monthly - medigapRates.age75Monthly)) * medigapInflation;
    }

    recommendations.push(`Medigap Plan ${medigapPlan} provides predictable costs with lower out-of-pocket exposure`);
  } else if (coverageType === 'medicare_advantage') {
    supplementCost = MEDICARE_ADVANTAGE.averagePremium2024 * medicalInflation;
    recommendations.push('Medicare Advantage may have lower premiums but higher out-of-pocket costs');
    recommendations.push('Consider network restrictions and prior authorization requirements');
  } else {
    recommendations.push('Traditional Medicare without supplement exposes you to uncapped out-of-pocket costs');
    recommendations.push('Consider adding Medigap or switching to Medicare Advantage');
  }

  const totalMonthly = partBPremium + partDPremium + supplementCost;
  const totalAnnual = totalMonthly * 12;

  // Estimate remaining lifetime costs (to age 95)
  const yearsRemaining = Math.max(0, 95 - age);
  let projectedLifetimeCost = 0;
  for (let y = 0; y < yearsRemaining; y++) {
    const futureInflation = Math.pow(1 + MEDICARE_PART_B.projectedGrowthRate, y);
    projectedLifetimeCost += totalAnnual * futureInflation;
  }

  if (irmaaSurcharge > 0) {
    recommendations.push(`IRMAA surcharge of $${irmaaSurcharge.toFixed(2)}/month due to income level`);
    recommendations.push('Consider strategies to reduce MAGI (Roth conversions timing, QCDs)');
  }

  return {
    partBPremium,
    partDPremium,
    supplementCost,
    totalMonthly,
    totalAnnual,
    irmaaSurcharge,
    irmaaTier,
    projectedLifetimeCost,
    recommendations,
  };
}

/**
 * Get IRMAA tier description
 */
function getIRMAATier(income: number, status: FilingStatus): string {
  const brackets = IRMAA_BRACKETS_2026[status];
  for (let i = 0; i < brackets.length; i++) {
    if (income <= brackets[i].threshold) {
      if (brackets[i].surcharge === 0) return 'Standard (no surcharge)';
      return `Tier ${i} (+$${brackets[i].surcharge.toFixed(2)}/month)`;
    }
  }
  return 'Tier 5 (highest)';
}

/**
 * Calculate Long-Term Care analysis
 */
export function calculateLTCAnalysis(
  currentAge: number,
  strategy: 'self_insure' | 'ltc_insurance' | 'hybrid' | 'medicaid_planning',
  existingInsurancePremium?: number
): LTCAnalysis {
  const probabilityOfNeed = LONG_TERM_CARE.probabilityOfNeeding65Plus;
  const avgDuration = LONG_TERM_CARE.avgDurationYears;

  // Expected cost (probability-weighted)
  const avgAnnualCost = (LONG_TERM_CARE.nursingHomeSemiPrivate + LONG_TERM_CARE.assistedLiving) / 2;
  const expectedCost = probabilityOfNeed * avgAnnualCost * avgDuration;

  // Self-insure target (enough for 3 years of care)
  const selfInsureTarget = avgAnnualCost * 3;

  // LTC Insurance analysis
  const yearsOfPremiums = Math.max(0, 85 - currentAge);
  const annualPremium = currentAge < 55
    ? LONG_TERM_CARE.ltcInsuranceAvgAnnualPremiumAge55
    : LONG_TERM_CARE.ltcInsuranceAvgAnnualPremiumAge65;

  const totalPremiums = annualPremium * yearsOfPremiums;
  const typicalCoverage = 200000; // Typical LTC policy benefit pool
  const breakevenYears = typicalCoverage / avgAnnualCost;

  const insuranceOption = {
    annualPremium,
    totalPremiums,
    coverage: typicalCoverage,
    breakevenYears,
  };

  // Medicaid considerations
  const medicaidConsiderations = [
    `Medicaid has a ${LONG_TERM_CARE.medicaidLookbackPeriod}-month look-back period for asset transfers`,
    'Asset protection strategies must be implemented years in advance',
    'Medicaid typically covers only semi-private nursing home rooms',
    'Spousal impoverishment rules allow some asset protection for married couples',
  ];

  // Recommendation based on strategy
  let recommendation: string;
  switch (strategy) {
    case 'self_insure':
      recommendation = `Build a dedicated healthcare reserve of $${(selfInsureTarget / 1000).toFixed(0)}k to self-insure LTC risk`;
      break;
    case 'ltc_insurance':
      recommendation = `LTC insurance costs ~$${annualPremium.toLocaleString()}/year but provides ${typicalCoverage.toLocaleString()} in benefits`;
      break;
    case 'hybrid':
      recommendation = 'Hybrid life/LTC policies provide death benefit if LTC is not needed';
      break;
    case 'medicaid_planning':
      recommendation = 'Consult an elder law attorney for Medicaid asset protection strategies';
      break;
    default:
      recommendation = 'Consider a combination of self-insurance and LTC coverage';
  }

  return {
    probabilityOfNeed,
    expectedCost,
    selfInsureTarget,
    insuranceOption,
    medicaidConsiderations,
    recommendation,
  };
}

/**
 * Calculate HSA growth and strategy
 */
export function calculateHSAStrategy(
  currentAge: number,
  currentBalance: number,
  annualContribution: number,
  isFamily: boolean,
  retirementAge: number = 65
): HSAStrategy {
  const maxContribution = isFamily
    ? HSA_CONSTANTS.familyLimit2024 + (currentAge >= 55 ? HSA_CONSTANTS.catchUpAge55 : 0)
    : HSA_CONSTANTS.individualLimit2024 + (currentAge >= 55 ? HSA_CONSTANTS.catchUpAge55 : 0);

  // Can only contribute while on HDHP (typically before Medicare at 65)
  const yearsToContribute = Math.max(0, 65 - currentAge);
  const investmentReturn = HSA_CONSTANTS.investmentReturn;

  let balance = currentBalance;
  let totalContributions = 0;

  // Growth during contribution years
  for (let y = 0; y < yearsToContribute; y++) {
    balance *= (1 + investmentReturn);
    const contribution = Math.min(annualContribution, maxContribution);
    balance += contribution;
    totalContributions += contribution;
  }

  const balanceAt65 = balance;

  // Continue growth to age 75
  for (let y = 0; y < 10; y++) {
    balance *= (1 + investmentReturn);
  }
  const balanceAt75 = balance;

  // Continue growth to age 85
  for (let y = 0; y < 10; y++) {
    balance *= (1 + investmentReturn);
  }
  const balanceAt85 = balance;

  const totalGrowth = balanceAt65 - currentBalance - totalContributions;

  // Tax savings estimate (contributions + growth all tax-free for medical expenses)
  // Assume 25% effective tax rate
  const taxSavingsEstimate = (totalContributions + totalGrowth) * 0.25;

  const recommendations: string[] = [
    'Max out HSA contributions every year you have HDHP coverage',
    'Pay current medical expenses out-of-pocket, save receipts',
    'Invest HSA funds for long-term growth (don\'t leave as cash)',
    'Reimburse yourself tax-free anytime in the future',
    'After 65, HSA funds can be used for any purpose (taxed as income, no penalty)',
  ];

  if (annualContribution < maxContribution) {
    recommendations.unshift(`Increase HSA contribution from $${annualContribution.toLocaleString()} to max of $${maxContribution.toLocaleString()}`);
  }

  return {
    currentBalance,
    projectedBalanceAt65: balanceAt65,
    projectedBalanceAt75: balanceAt75,
    projectedBalanceAt85: balanceAt85,
    annualContribution,
    totalContributions,
    totalGrowth,
    taxSavingsEstimate,
    recommendations,
  };
}

/**
 * Calculate ACA subsidy optimization thresholds
 */
export function calculateACASubsidyOptimization(
  currentMAGI: number,
  age: number,
  householdSize: number = 1,
  year: number = 2024
): ACASubsidyAnalysis {
  const fpl = calculateFPL(householdSize, year);
  const currentSubsidy = calculateACASubsidy(currentMAGI, age, householdSize, year);
  const benchmarkPremium = getACABenchmarkPremium(age, year) * 12;

  // Calculate thresholds at key FPL percentages
  const thresholds: SubsidyThreshold[] = [];
  const keyFPLPercents = [150, 200, 250, 300, 400];

  for (const pct of keyFPLPercents) {
    const incomeLimit = (fpl * pct) / 100;
    const subsidyCalc = calculateACASubsidy(incomeLimit - 1, age, householdSize, year);
    thresholds.push({
      fplPercent: pct,
      incomeLimit,
      subsidyAtLimit: subsidyCalc.subsidyAmount,
      description: getSubsidyDescription(pct),
    });
  }

  // Calculate Roth conversion impact
  // If income increases by $10k, how much subsidy is lost?
  const higherIncome = currentMAGI + 10000;
  const higherSubsidy = calculateACASubsidy(higherIncome, age, householdSize, year);
  const rothConversionImpact = currentSubsidy.subsidyAmount - higherSubsidy.subsidyAmount;

  const recommendations: string[] = [];

  // Find nearest beneficial threshold
  const nearestHigher = thresholds.find(t => t.incomeLimit > currentMAGI);
  if (nearestHigher && currentMAGI < nearestHigher.incomeLimit) {
    const headroom = nearestHigher.incomeLimit - currentMAGI;
    if (headroom < 10000) {
      recommendations.push(`Warning: Income is $${headroom.toLocaleString()} below ${nearestHigher.fplPercent}% FPL threshold`);
    }
  }

  if (currentSubsidy.fplPercent < 150) {
    recommendations.push('You may qualify for Medicaid or $0 premium Silver plans');
  }

  if (rothConversionImpact > 1000) {
    recommendations.push(`Roth conversions could reduce ACA subsidies by ~$${(rothConversionImpact / 10000 * 1000).toFixed(0)} per $10k converted`);
    recommendations.push('Consider timing large Roth conversions when not receiving ACA subsidies');
  }

  recommendations.push('MAGI includes: wages, self-employment, IRA distributions, capital gains, Social Security');
  recommendations.push('Tax-exempt interest counts toward ACA MAGI');

  return {
    currentMAGI,
    fplPercent: currentSubsidy.fplPercent,
    maxPremiumPercent: currentSubsidy.maxPremiumPct,
    benchmarkPremium,
    subsidyAmount: currentSubsidy.subsidyAmount,
    netPremium: currentSubsidy.netPremium,
    thresholds,
    rothConversionImpact,
    recommendations,
  };
}

function getSubsidyDescription(fplPercent: number): string {
  switch (fplPercent) {
    case 150: return 'Maximum subsidy - pays up to 100% of benchmark premium';
    case 200: return 'Premium capped at 2% of income';
    case 250: return 'Premium capped at 4% of income';
    case 300: return 'Premium capped at 6% of income';
    case 400: return 'Premium capped at 8.5% of income (historical cliff, now smoothed)';
    default: return '';
  }
}

/**
 * Generate comprehensive healthcare cost projection
 */
export function calculateHealthcareCosts(inputs: HealthcareCostInputs): HealthcareCostResult {
  const {
    age1,
    age2,
    maritalStatus,
    estimatedMAGI,
    preMedicareCoverage,
    medicareCoverage,
    medigapPlan = 'G',
    includeLTC,
    ltcStrategy = 'self_insure',
    hasHSA,
    currentHSABalance = 0,
    annualHSAContribution = 0,
    customPreMedicareCost,
    customMedicareCost,
  } = inputs;

  const warnings: string[] = [];
  const recommendations: string[] = [];
  const annualCostsByAge: AnnualHealthcareCost[] = [];

  const isMarried = maritalStatus === 'married';
  const householdSize = isMarried ? 2 : 1;
  const currentYear = new Date().getFullYear();

  // Calculate ages for timeline
  const youngerAge = isMarried && age2 ? Math.min(age1, age2) : age1;
  const olderAge = isMarried && age2 ? Math.max(age1, age2) : age1;

  let totalPreMedicare = 0;
  let totalMedicare = 0;
  let totalLTC = 0;

  // Pre-Medicare Analysis
  const yearsBeforeMedicare = Math.max(0, MEDICARE_PART_B.eligibilityAge - youngerAge);

  let preMedicareAnnualCost = 0;
  let preMedicareCoverageType = '';
  let acaSubsidyEligible = false;
  let estimatedSubsidy = 0;

  if (yearsBeforeMedicare > 0) {
    switch (preMedicareCoverage) {
      case 'aca': {
        const subsidyCalc = calculateACASubsidy(estimatedMAGI, youngerAge, householdSize);
        acaSubsidyEligible = subsidyCalc.subsidyAmount > 0;
        estimatedSubsidy = subsidyCalc.subsidyAmount;
        const basePremium = getACABenchmarkPremium(youngerAge) * 12;
        preMedicareAnnualCost = isMarried
          ? basePremium * 1.6 - estimatedSubsidy  // Couple premium
          : basePremium - estimatedSubsidy;
        preMedicareCoverageType = 'ACA Marketplace';
        break;
      }
      case 'cobra': {
        const cobraCost = calculateCOBRACost(isMarried);
        preMedicareAnnualCost = cobraCost.annual;
        preMedicareCoverageType = 'COBRA Continuation';
        warnings.push('COBRA is limited to 18 months - plan for alternative coverage');
        break;
      }
      case 'spouse_employer': {
        preMedicareAnnualCost = isMarried ? 6000 : 3000; // Estimated employer subsidy
        preMedicareCoverageType = 'Spouse Employer Plan';
        break;
      }
      case 'health_sharing': {
        preMedicareAnnualCost = HEALTH_SHARING.avgMonthlyShare * 12;
        preMedicareCoverageType = 'Health Sharing Ministry';
        warnings.push('Health sharing is not insurance - may not cover all conditions');
        break;
      }
      case 'custom': {
        preMedicareAnnualCost = customPreMedicareCost || 15000;
        preMedicareCoverageType = 'Custom Coverage';
        break;
      }
    }

    totalPreMedicare = preMedicareAnnualCost * yearsBeforeMedicare;

    // Generate pre-Medicare annual costs
    for (let y = 0; y < yearsBeforeMedicare; y++) {
      const age = youngerAge + y;
      const year = currentYear + y;
      const inflationFactor = Math.pow(1.06, y);

      annualCostsByAge.push({
        age,
        year,
        premium: preMedicareAnnualCost * inflationFactor * 0.85,
        outOfPocket: preMedicareAnnualCost * inflationFactor * 0.15,
        ltcReserve: 0,
        total: preMedicareAnnualCost * inflationFactor,
        isPreMedicare: true,
        isMedicare: false,
        notes: [`${preMedicareCoverageType} coverage`],
      });
    }
  }

  // Danger zone warning (55-65)
  const dangerZoneWarning = youngerAge >= 55 && youngerAge < 65;
  if (dangerZoneWarning) {
    warnings.push('DANGER ZONE: Ages 55-64 have highest healthcare costs without Medicare');
    recommendations.push('Budget $15,000-25,000/year for healthcare in the early retirement gap');
  }

  // Pre-Medicare alternatives
  const alternatives: AlternativeCoverage[] = [
    {
      name: 'ACA Marketplace',
      annualCost: getACABenchmarkPremium(youngerAge) * 12 * (isMarried ? 1.6 : 1),
      pros: ['Comprehensive coverage', 'Subsidies available', 'Pre-existing conditions covered'],
      cons: ['Income affects subsidy', 'May need specific network'],
    },
    {
      name: 'COBRA',
      annualCost: calculateCOBRACost(isMarried).annual,
      pros: ['Same coverage as employment', 'Immediate start'],
      cons: ['18-month limit', 'Very expensive', 'No subsidies'],
    },
    {
      name: 'Health Sharing Ministry',
      annualCost: HEALTH_SHARING.avgMonthlyShare * 12,
      pros: ['Lower monthly cost', 'Community-based'],
      cons: ['Not insurance', 'May not cover pre-existing', 'No guaranteed coverage'],
    },
  ];

  const preMedicareAnalysis: PreMedicareAnalysis = {
    yearsBeforeMedicare,
    annualCost: preMedicareAnnualCost,
    totalCost: totalPreMedicare,
    coverageType: preMedicareCoverageType,
    acaSubsidyEligible,
    estimatedSubsidy,
    netCost: preMedicareAnnualCost - estimatedSubsidy,
    dangerZoneWarning,
    alternatives,
  };

  // Medicare Analysis (65+)
  const medicareAnalysis = calculateMedicareCosts(
    65,
    estimatedMAGI,
    maritalStatus,
    medicareCoverage,
    medigapPlan as 'F' | 'G' | 'N'
  );

  // Calculate Medicare years (65 to 95)
  const medicareYears = 30;
  for (let y = 0; y < medicareYears; y++) {
    const age = 65 + y;
    const year = currentYear + Math.max(0, 65 - youngerAge) + y;
    const yearsFromNow = age - youngerAge;
    const inflationFactor = Math.pow(1 + MEDICARE_PART_B.projectedGrowthRate, y);

    const annualMedicareCost = customMedicareCost
      ? customMedicareCost * inflationFactor
      : medicareAnalysis.totalAnnual * inflationFactor;

    // Double for married couples until survivor
    const multiplier = isMarried && age2 && age < 85 ? 2 : 1;

    annualCostsByAge.push({
      age,
      year,
      premium: annualMedicareCost * multiplier * 0.7,
      outOfPocket: annualMedicareCost * multiplier * 0.3,
      ltcReserve: 0,
      total: annualMedicareCost * multiplier,
      isPreMedicare: false,
      isMedicare: true,
      notes: [`Medicare + ${medicareCoverage === 'traditional_medigap' ? `Medigap Plan ${medigapPlan}` : 'Advantage'}`],
    });

    totalMedicare += annualMedicareCost * multiplier;
  }

  // LTC Analysis
  const ltcAnalysis = calculateLTCAnalysis(youngerAge, ltcStrategy);
  if (includeLTC) {
    totalLTC = ltcAnalysis.expectedCost * (isMarried ? 1.5 : 1); // Higher for couples
    recommendations.push(ltcAnalysis.recommendation);
  }

  // HSA Strategy
  const hsaStrategy = calculateHSAStrategy(
    youngerAge,
    currentHSABalance,
    annualHSAContribution,
    isMarried,
    65
  );

  if (hasHSA) {
    recommendations.push(...hsaStrategy.recommendations.slice(0, 2));
  } else if (youngerAge < 65) {
    recommendations.push('Consider opening an HSA if eligible for triple tax advantage');
  }

  // ACA Subsidy Analysis (only relevant before Medicare)
  let acaSubsidyAnalysis: ACASubsidyAnalysis | undefined;
  if (yearsBeforeMedicare > 0 && preMedicareCoverage === 'aca') {
    acaSubsidyAnalysis = calculateACASubsidyOptimization(
      estimatedMAGI,
      youngerAge,
      householdSize
    );
  }

  // Total lifetime healthcare cost
  const totalLifetimeHealthcare = totalPreMedicare + totalMedicare + totalLTC;

  // Final recommendations
  if (totalLifetimeHealthcare > 300000) {
    warnings.push(`Projected lifetime healthcare costs: $${(totalLifetimeHealthcare / 1000).toFixed(0)}k - plan accordingly`);
  }

  recommendations.push('Review Medicare options during Annual Enrollment Period (Oct 15 - Dec 7)');
  recommendations.push('Consider working with a Medicare broker for free plan comparison');

  return {
    totalLifetimeHealthcare,
    totalPreMedicare,
    totalMedicare,
    totalLTC,
    annualCostsByAge,
    preMedicareAnalysis,
    medicareAnalysis,
    ltcAnalysis,
    hsaStrategy,
    acaSubsidyAnalysis,
    warnings,
    recommendations,
  };
}

/**
 * Calculate the "early retirement healthcare gap" cost
 * This is the total cost between retirement and Medicare eligibility
 */
export function calculateEarlyRetirementHealthcareGap(
  retirementAge: number,
  currentAge: number,
  estimatedMAGI: number,
  maritalStatus: FilingStatus
): { yearsGap: number; annualCost: number; totalGapCost: number; withSubsidy: boolean } {
  const medicareAge = 65;

  if (retirementAge >= medicareAge) {
    return { yearsGap: 0, annualCost: 0, totalGapCost: 0, withSubsidy: false };
  }

  const yearsGap = medicareAge - retirementAge;
  const isMarried = maritalStatus === 'married';
  const householdSize = isMarried ? 2 : 1;

  // Get ACA costs with subsidy
  const subsidyCalc = calculateACASubsidy(estimatedMAGI, retirementAge, householdSize);
  const basePremium = getACABenchmarkPremium(retirementAge) * 12;
  const annualPremium = isMarried ? basePremium * 1.6 : basePremium;

  const annualCost = annualPremium - subsidyCalc.subsidyAmount;

  // Calculate total with inflation
  let totalGapCost = 0;
  for (let y = 0; y < yearsGap; y++) {
    totalGapCost += annualCost * Math.pow(1.05, y);
  }

  return {
    yearsGap,
    annualCost,
    totalGapCost,
    withSubsidy: subsidyCalc.subsidyAmount > 0,
  };
}

/**
 * Quick estimate of healthcare costs for summary display
 * Based on Fidelity's 2024 estimate of $315,000 for a 65-year-old couple
 */
export function getQuickHealthcareEstimate(
  age: number,
  maritalStatus: FilingStatus,
  includesLTC: boolean = false
): { perPerson: number; total: number; monthly: number } {
  // Fidelity 2024: $157,500 per person (65+ only)
  const basePerPerson = 157500;

  // Adjust for current age (younger = more years of costs)
  const ageAdjustment = Math.max(1, (95 - age) / 30);

  // Add pre-Medicare costs if under 65
  const preMedicareYears = Math.max(0, 65 - age);
  const preMedicarePerPerson = preMedicareYears * 15000;

  // LTC addition
  const ltcReserve = includesLTC ? 80000 : 0;

  const perPerson = (basePerPerson * ageAdjustment) + preMedicarePerPerson + ltcReserve;
  const total = maritalStatus === 'married' ? perPerson * 2 : perPerson;
  const yearsRemaining = 95 - age;
  const monthly = total / (yearsRemaining * 12);

  return { perPerson, total, monthly };
}

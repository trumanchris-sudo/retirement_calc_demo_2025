"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  Shield,
  Users,
  Building2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  Heart,
  Landmark,
} from "lucide-react";

// ===============================
// Types and Interfaces
// ===============================

export type PensionType =
  | "private"
  | "federal_fers"
  | "federal_csrs"
  | "state_local"
  | "military";

export type SurvivorOption =
  | "single_life"
  | "joint_50"
  | "joint_75"
  | "joint_100";

export interface PensionInputs {
  // Basic pension info
  monthlyBenefit: number;
  pensionStartAge: number;
  currentAge: number;
  lifeExpectancy: number;

  // Pension characteristics
  pensionType: PensionType;
  hasCOLA: boolean;
  colaRate: number; // Annual COLA percentage

  // Survivor benefits
  survivorOption: SurvivorOption;
  spouseAge?: number;
  spouseLifeExpectancy?: number;

  // Present value calculation
  discountRate: number;

  // Buyout comparison
  lumpSumOffer?: number;

  // Social Security integration
  hasSSCoverage: boolean; // Did pension job have SS coverage?
  ssMonthlyBenefit?: number; // Expected SS benefit (before WEP/GPO)
  yearsOfSubstantialEarnings?: number; // For WEP calculation
}

export interface PensionValuation {
  // Core valuations
  presentValue: number;
  presentValueWithCOLA: number;
  nominalTotal: number;

  // Annual breakdown
  annualBenefit: number;
  realAnnualBenefitAtRetirement: number;

  // COLA impact
  colaValueAdded: number;
  colaValuePercent: number;

  // Survivor analysis
  survivorReduction: number;
  survivorValueToSpouse: number;

  // Buyout analysis
  buyoutFairValue?: number;
  buyoutDifference?: number;
  buyoutRecommendation?: "accept" | "reject" | "neutral";

  // WEP/GPO impact (for government pensions)
  wepReduction?: number;
  gpoReduction?: number;
  effectiveSSBenefit?: number;

  // Integration metrics
  portfolioEquivalent: number; // What portfolio would generate same income
  withdrawalRateEquivalent: number; // As a withdrawal rate
}

// ===============================
// Calculation Functions
// ===============================

/**
 * Calculate life expectancy adjustment based on pension type
 * Government pensions tend to have healthier populations
 */
function getAdjustedLifeExpectancy(
  baseLifeExp: number,
  pensionType: PensionType
): number {
  const adjustments: Record<PensionType, number> = {
    private: 0,
    federal_fers: 2,
    federal_csrs: 2,
    state_local: 1,
    military: -1, // Earlier mortality for military
  };
  return baseLifeExp + (adjustments[pensionType] || 0);
}

/**
 * Calculate survivor benefit reduction factor
 */
function getSurvivorReductionFactor(option: SurvivorOption): number {
  const reductions: Record<SurvivorOption, number> = {
    single_life: 0,
    joint_50: 0.05, // ~5% reduction for 50% survivor
    joint_75: 0.075, // ~7.5% reduction for 75% survivor
    joint_100: 0.1, // ~10% reduction for 100% survivor
  };
  return reductions[option] || 0;
}

/**
 * Get survivor continuation rate (% of benefit that continues to spouse)
 */
function getSurvivorContinuationRate(option: SurvivorOption): number {
  const rates: Record<SurvivorOption, number> = {
    single_life: 0,
    joint_50: 0.5,
    joint_75: 0.75,
    joint_100: 1.0,
  };
  return rates[option] || 0;
}

/**
 * Calculate Windfall Elimination Provision (WEP) reduction
 * WEP reduces SS benefits for those with pensions from non-SS-covered employment
 */
function calculateWEPReduction(
  ssMonthlyBenefit: number,
  yearsOfSubstantialEarnings: number
): number {
  // WEP eliminates up to 50% of the first bend point in SS calculation
  // Maximum WEP reduction in 2026 is approximately $587/month
  const MAX_WEP_REDUCTION = 587;

  if (yearsOfSubstantialEarnings >= 30) {
    return 0; // No WEP reduction with 30+ years
  }

  // Reduction decreases by 5% for each year over 20
  if (yearsOfSubstantialEarnings >= 20) {
    const reductionFactor = 1 - (yearsOfSubstantialEarnings - 20) * 0.05;
    return Math.min(MAX_WEP_REDUCTION * reductionFactor, ssMonthlyBenefit * 0.5);
  }

  // Full WEP reduction for fewer than 20 years
  return Math.min(MAX_WEP_REDUCTION, ssMonthlyBenefit * 0.5);
}

/**
 * Calculate Government Pension Offset (GPO)
 * GPO reduces spousal/survivor SS benefits by 2/3 of government pension
 */
function calculateGPOReduction(
  pensionMonthlyBenefit: number,
  ssMonthlyBenefit: number
): number {
  const gpoReduction = pensionMonthlyBenefit * (2 / 3);
  return Math.min(gpoReduction, ssMonthlyBenefit);
}

/**
 * Calculate present value of pension with optional COLA
 */
function calculatePresentValue(
  monthlyBenefit: number,
  startAge: number,
  currentAge: number,
  lifeExpectancy: number,
  discountRate: number,
  colaRate: number = 0
): number {
  const yearsToStart = Math.max(0, startAge - currentAge);
  const yearsOfPayment = Math.max(0, lifeExpectancy - startAge);
  const monthlyDiscount = discountRate / 12 / 100;
  const monthlyGrowth = colaRate / 12 / 100;

  let presentValue = 0;
  let currentBenefit = monthlyBenefit;

  // Discount to present value
  for (let year = 0; year < yearsOfPayment; year++) {
    for (let month = 0; month < 12; month++) {
      const totalMonths = (yearsToStart + year) * 12 + month;
      const discountFactor = Math.pow(1 + monthlyDiscount, totalMonths);

      presentValue += currentBenefit / discountFactor;

      // Apply COLA monthly
      currentBenefit *= 1 + monthlyGrowth;
    }
  }

  return presentValue;
}

/**
 * Calculate portfolio equivalent (what portfolio generates same income at given rate)
 */
function calculatePortfolioEquivalent(
  annualBenefit: number,
  withdrawalRate: number
): number {
  if (withdrawalRate <= 0) return 0;
  return annualBenefit / (withdrawalRate / 100);
}

/**
 * Main pension valuation function
 */
export function calculatePensionValuation(
  inputs: PensionInputs
): PensionValuation {
  const {
    monthlyBenefit,
    pensionStartAge,
    currentAge,
    lifeExpectancy,
    pensionType,
    hasCOLA,
    colaRate,
    survivorOption,
    spouseAge,
    spouseLifeExpectancy,
    discountRate,
    lumpSumOffer,
    hasSSCoverage,
    ssMonthlyBenefit,
    yearsOfSubstantialEarnings,
  } = inputs;

  // Adjust life expectancy based on pension type
  const adjustedLifeExp = getAdjustedLifeExpectancy(lifeExpectancy, pensionType);

  // Calculate survivor reduction
  const survivorReductionFactor = getSurvivorReductionFactor(survivorOption);
  const adjustedMonthlyBenefit = monthlyBenefit * (1 - survivorReductionFactor);

  // Calculate present value without COLA
  const presentValueNoCOLA = calculatePresentValue(
    adjustedMonthlyBenefit,
    pensionStartAge,
    currentAge,
    adjustedLifeExp,
    discountRate,
    0
  );

  // Calculate present value with COLA
  const effectiveCOLA = hasCOLA ? colaRate : 0;
  const presentValueWithCOLA = calculatePresentValue(
    adjustedMonthlyBenefit,
    pensionStartAge,
    currentAge,
    adjustedLifeExp,
    discountRate,
    effectiveCOLA
  );

  // Calculate survivor value (additional value from spouse continuing benefits)
  let survivorValueToSpouse = 0;
  if (
    survivorOption !== "single_life" &&
    spouseAge !== undefined &&
    spouseLifeExpectancy !== undefined
  ) {
    const continuationRate = getSurvivorContinuationRate(survivorOption);
    const survivorBenefit = adjustedMonthlyBenefit * continuationRate;

    // Assume spouse survives 3 years on average after primary
    const spouseSurvivalYears = Math.max(
      0,
      spouseLifeExpectancy - adjustedLifeExp + 3
    );

    // Present value of survivor benefits
    if (spouseSurvivalYears > 0) {
      const yearsToSurvivor = adjustedLifeExp - currentAge;
      survivorValueToSpouse = calculatePresentValue(
        survivorBenefit,
        currentAge + yearsToSurvivor,
        currentAge,
        currentAge + yearsToSurvivor + spouseSurvivalYears,
        discountRate,
        effectiveCOLA
      );
    }
  }

  // Calculate nominal total (undiscounted)
  const yearsOfPayment = Math.max(0, adjustedLifeExp - pensionStartAge);
  const nominalTotal = adjustedMonthlyBenefit * 12 * yearsOfPayment;

  // COLA value analysis
  const colaValueAdded = presentValueWithCOLA - presentValueNoCOLA;
  const colaValuePercent =
    presentValueNoCOLA > 0 ? (colaValueAdded / presentValueNoCOLA) * 100 : 0;

  // Buyout analysis
  let buyoutFairValue: number | undefined;
  let buyoutDifference: number | undefined;
  let buyoutRecommendation: "accept" | "reject" | "neutral" | undefined;

  const totalPensionValue = presentValueWithCOLA + survivorValueToSpouse;

  if (lumpSumOffer !== undefined && lumpSumOffer > 0) {
    // Fair value = present value of all future benefits
    buyoutFairValue = totalPensionValue;
    buyoutDifference = lumpSumOffer - buyoutFairValue;

    // Recommendation based on comparison
    const differencePercent = (buyoutDifference / buyoutFairValue) * 100;

    if (differencePercent > 10) {
      buyoutRecommendation = "accept";
    } else if (differencePercent < -10) {
      buyoutRecommendation = "reject";
    } else {
      buyoutRecommendation = "neutral";
    }
  }

  // WEP/GPO calculations for government pensions
  let wepReduction: number | undefined;
  let gpoReduction: number | undefined;
  let effectiveSSBenefit: number | undefined;

  if (
    !hasSSCoverage &&
    ssMonthlyBenefit !== undefined &&
    ssMonthlyBenefit > 0
  ) {
    // Apply WEP if pension job had no SS coverage
    wepReduction = calculateWEPReduction(
      ssMonthlyBenefit,
      yearsOfSubstantialEarnings || 0
    );
    effectiveSSBenefit = Math.max(0, ssMonthlyBenefit - wepReduction);

    // Apply GPO to spousal benefits (simplified - assumes this is spousal benefit)
    // In reality, GPO only applies to spousal/survivor benefits, not own worker benefit
    if (pensionType !== "private" && survivorOption !== "single_life") {
      gpoReduction = calculateGPOReduction(monthlyBenefit, ssMonthlyBenefit);
    }
  }

  // Portfolio equivalent calculations
  const annualBenefit = adjustedMonthlyBenefit * 12;
  const portfolioEquivalent = calculatePortfolioEquivalent(annualBenefit, 4); // 4% rule
  const withdrawalRateEquivalent =
    totalPensionValue > 0 ? (annualBenefit / totalPensionValue) * 100 : 0;

  // Real benefit at retirement (adjusted for inflation to start date)
  const yearsToStart = Math.max(0, pensionStartAge - currentAge);
  const inflationAssumption = 0.025; // 2.5% inflation
  const realAnnualBenefitAtRetirement =
    annualBenefit / Math.pow(1 + inflationAssumption, yearsToStart);

  return {
    presentValue: presentValueNoCOLA,
    presentValueWithCOLA,
    nominalTotal,
    annualBenefit,
    realAnnualBenefitAtRetirement,
    colaValueAdded,
    colaValuePercent,
    survivorReduction: survivorReductionFactor * 100,
    survivorValueToSpouse,
    buyoutFairValue,
    buyoutDifference,
    buyoutRecommendation,
    wepReduction,
    gpoReduction,
    effectiveSSBenefit,
    portfolioEquivalent,
    withdrawalRateEquivalent,
  };
}

// ===============================
// Component Props
// ===============================

interface PensionCalculatorProps {
  initialInputs?: Partial<PensionInputs>;
  onValuationChange?: (valuation: PensionValuation) => void;
}

// ===============================
// Main Component
// ===============================

export const PensionCalculator = React.memo(function PensionCalculator({
  initialInputs,
  onValuationChange,
}: PensionCalculatorProps) {
  // State for pension inputs
  const [inputs, setInputs] = useState<PensionInputs>({
    monthlyBenefit: initialInputs?.monthlyBenefit ?? 3000,
    pensionStartAge: initialInputs?.pensionStartAge ?? 65,
    currentAge: initialInputs?.currentAge ?? 55,
    lifeExpectancy: initialInputs?.lifeExpectancy ?? 90,
    pensionType: initialInputs?.pensionType ?? "private",
    hasCOLA: initialInputs?.hasCOLA ?? false,
    colaRate: initialInputs?.colaRate ?? 2.0,
    survivorOption: initialInputs?.survivorOption ?? "single_life",
    spouseAge: initialInputs?.spouseAge ?? 53,
    spouseLifeExpectancy: initialInputs?.spouseLifeExpectancy ?? 88,
    discountRate: initialInputs?.discountRate ?? 5.0,
    lumpSumOffer: initialInputs?.lumpSumOffer,
    hasSSCoverage: initialInputs?.hasSSCoverage ?? true,
    ssMonthlyBenefit: initialInputs?.ssMonthlyBenefit ?? 2500,
    yearsOfSubstantialEarnings:
      initialInputs?.yearsOfSubstantialEarnings ?? 25,
  });

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    buyout: false,
    survivor: false,
    government: false,
  });

  // Calculate valuation
  const valuation = useMemo(() => {
    const result = calculatePensionValuation(inputs);
    onValuationChange?.(result);
    return result;
  }, [inputs, onValuationChange]);

  // Input handlers
  const updateInput = useCallback(
    <K extends keyof PensionInputs>(field: K, value: PensionInputs[K]) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format large currency (with K/M suffixes)
  const formatLargeCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrency(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Pension Valuation Calculator
        </CardTitle>
        <CardDescription>
          Understand your pension's true value as part of your total net worth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero Valuation Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-900">
          <div className="text-center space-y-2">
            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Your Pension's Lump Sum Value
            </div>
            <div className="text-5xl font-bold text-blue-900 dark:text-blue-100">
              {formatLargeCurrency(
                inputs.hasCOLA
                  ? valuation.presentValueWithCOLA
                  : valuation.presentValue
              )}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Your {formatCurrency(inputs.monthlyBenefit)}/month pension is
              equivalent to{" "}
              <span className="font-semibold">
                {formatLargeCurrency(valuation.portfolioEquivalent)}
              </span>{" "}
              invested at a 4% withdrawal rate
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
            <div className="text-xs text-green-700 dark:text-green-400 mb-1">
              Annual Benefit
            </div>
            <div className="text-xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(valuation.annualBenefit)}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
            <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">
              Nominal Total
            </div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {formatLargeCurrency(valuation.nominalTotal)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              (undiscounted)
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
            <div className="text-xs text-orange-700 dark:text-orange-400 mb-1">
              Equiv. Withdrawal Rate
            </div>
            <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
              {valuation.withdrawalRateEquivalent.toFixed(1)}%
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
              Payment Years
            </div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {Math.max(0, inputs.lifeExpectancy - inputs.pensionStartAge)}
            </div>
          </div>
        </div>

        {/* Input Sections */}
        <div className="space-y-4">
          {/* Basic Pension Information */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Basic Pension Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyBenefit" className="flex items-center gap-1">
                  Monthly Benefit
                  <InfoTooltip content="The monthly pension payment you will receive at retirement." />
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="monthlyBenefit"
                    type="number"
                    value={inputs.monthlyBenefit}
                    onChange={(e) =>
                      updateInput("monthlyBenefit", Number(e.target.value))
                    }
                    className="pl-7"
                    min={0}
                    step={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionType" className="flex items-center gap-1">
                  Pension Type
                  <InfoTooltip content="Different pension types have different characteristics, including Social Security coordination rules." />
                </Label>
                <Select
                  value={inputs.pensionType}
                  onValueChange={(value: PensionType) =>
                    updateInput("pensionType", value)
                  }
                >
                  <SelectTrigger id="pensionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      Private Employer Pension
                    </SelectItem>
                    <SelectItem value="federal_fers">Federal (FERS)</SelectItem>
                    <SelectItem value="federal_csrs">Federal (CSRS)</SelectItem>
                    <SelectItem value="state_local">
                      State/Local Government
                    </SelectItem>
                    <SelectItem value="military">Military</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentAge">Current Age</Label>
                <Input
                  id="currentAge"
                  type="number"
                  value={inputs.currentAge}
                  onChange={(e) =>
                    updateInput("currentAge", Number(e.target.value))
                  }
                  min={18}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionStartAge">Pension Start Age</Label>
                <Input
                  id="pensionStartAge"
                  type="number"
                  value={inputs.pensionStartAge}
                  onChange={(e) =>
                    updateInput("pensionStartAge", Number(e.target.value))
                  }
                  min={inputs.currentAge}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifeExpectancy" className="flex items-center gap-1">
                  Life Expectancy
                  <InfoTooltip content="Estimated age to use for calculations. Most financial planners use 90-95 to be conservative." />
                </Label>
                <Input
                  id="lifeExpectancy"
                  type="number"
                  value={inputs.lifeExpectancy}
                  onChange={(e) =>
                    updateInput("lifeExpectancy", Number(e.target.value))
                  }
                  min={inputs.pensionStartAge}
                  max={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountRate" className="flex items-center gap-1">
                  Discount Rate (%)
                  <InfoTooltip content="Rate used to calculate present value. Higher rates mean lower present value. Use treasury rates (4-5%) for conservative estimates." />
                </Label>
                <Input
                  id="discountRate"
                  type="number"
                  value={inputs.discountRate}
                  onChange={(e) =>
                    updateInput("discountRate", Number(e.target.value))
                  }
                  min={0}
                  max={15}
                  step={0.5}
                />
              </div>
            </div>
          </div>

          {/* COLA Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Cost of Living Adjustment (COLA)
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="hasCOLA"
                  checked={inputs.hasCOLA}
                  onCheckedChange={(checked) => updateInput("hasCOLA", checked)}
                />
                <Label htmlFor="hasCOLA" className="text-sm">
                  Has COLA
                </Label>
              </div>
            </div>

            {inputs.hasCOLA && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="colaRate" className="flex items-center gap-1">
                      Annual COLA Rate (%)
                      <InfoTooltip content="The annual percentage increase applied to your pension. Federal FERS uses CPI-W, some state pensions use fixed rates like 2-3%." />
                    </Label>
                    <Input
                      id="colaRate"
                      type="number"
                      value={inputs.colaRate}
                      onChange={(e) =>
                        updateInput("colaRate", Number(e.target.value))
                      }
                      min={0}
                      max={10}
                      step={0.1}
                    />
                  </div>
                </div>

                {/* COLA Impact Display */}
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        COLA Adds Significant Value
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Your {inputs.colaRate}% annual COLA adds{" "}
                        <strong>
                          {formatLargeCurrency(valuation.colaValueAdded)}
                        </strong>{" "}
                        ({valuation.colaValuePercent.toFixed(0)}% more) to your
                        pension's present value. This protects against inflation
                        eroding your purchasing power over{" "}
                        {Math.max(0, inputs.lifeExpectancy - inputs.pensionStartAge)}{" "}
                        years of retirement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!inputs.hasCOLA && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      No COLA: Value Erodes Over Time
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Without COLA, your{" "}
                      {formatCurrency(inputs.monthlyBenefit)}/month benefit will
                      have the purchasing power of only{" "}
                      <strong>
                        {formatCurrency(
                          inputs.monthlyBenefit *
                            Math.pow(
                              0.975,
                              inputs.lifeExpectancy - inputs.pensionStartAge
                            )
                        )}
                      </strong>{" "}
                      in today's dollars at age {inputs.lifeExpectancy}{" "}
                      (assuming 2.5% inflation).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Survivor Benefits Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => toggleSection("survivor")}
            >
              <div className="flex items-center gap-2 font-medium">
                <Heart className="h-4 w-4 text-muted-foreground" />
                Survivor Benefits
              </div>
              {expandedSections.survivor ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expandedSections.survivor && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="survivorOption"
                      className="flex items-center gap-1"
                    >
                      Survivor Option
                      <InfoTooltip content="Choose how benefits continue to your spouse after your death. Higher survivor percentages mean lower monthly benefits during your lifetime." />
                    </Label>
                    <Select
                      value={inputs.survivorOption}
                      onValueChange={(value: SurvivorOption) =>
                        updateInput("survivorOption", value)
                      }
                    >
                      <SelectTrigger id="survivorOption">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_life">
                          Single Life (no survivor benefit)
                        </SelectItem>
                        <SelectItem value="joint_50">
                          Joint & 50% Survivor
                        </SelectItem>
                        <SelectItem value="joint_75">
                          Joint & 75% Survivor
                        </SelectItem>
                        <SelectItem value="joint_100">
                          Joint & 100% Survivor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inputs.survivorOption !== "single_life" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="spouseAge">Spouse's Current Age</Label>
                        <Input
                          id="spouseAge"
                          type="number"
                          value={inputs.spouseAge}
                          onChange={(e) =>
                            updateInput("spouseAge", Number(e.target.value))
                          }
                          min={18}
                          max={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spouseLifeExpectancy">
                          Spouse's Life Expectancy
                        </Label>
                        <Input
                          id="spouseLifeExpectancy"
                          type="number"
                          value={inputs.spouseLifeExpectancy}
                          onChange={(e) =>
                            updateInput(
                              "spouseLifeExpectancy",
                              Number(e.target.value)
                            )
                          }
                          min={inputs.spouseAge || 50}
                          max={120}
                        />
                      </div>
                    </>
                  )}
                </div>

                {inputs.survivorOption !== "single_life" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
                        <div className="text-xs text-red-700 dark:text-red-400 mb-1">
                          Your Benefit Reduction
                        </div>
                        <div className="text-lg font-bold text-red-900 dark:text-red-100">
                          -{valuation.survivorReduction.toFixed(1)}%
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {formatCurrency(
                            inputs.monthlyBenefit *
                              (valuation.survivorReduction / 100)
                          )}
                          /mo less
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                        <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                          Value to Spouse
                        </div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {formatLargeCurrency(valuation.survivorValueToSpouse)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          present value
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            Pension Maximization Strategy
                          </div>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            Some advisors suggest taking the single-life
                            option and using the extra income to buy life
                            insurance for your spouse. This is{" "}
                            <strong>controversial</strong> because it requires:
                            (1) qualifying for affordable insurance, (2)
                            maintaining premiums for decades, and (3) assumes
                            insurance payout beats survivor benefit. Consult a
                            fee-only fiduciary before considering this
                            strategy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buyout Analysis Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => toggleSection("buyout")}
            >
              <div className="flex items-center gap-2 font-medium">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Pension vs Lump Sum Buyout
              </div>
              {expandedSections.buyout ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expandedSections.buyout && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="lumpSumOffer" className="flex items-center gap-1">
                    Lump Sum Offer (if any)
                    <InfoTooltip content="Enter the lump sum buyout amount your employer has offered to replace your pension." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="lumpSumOffer"
                      type="number"
                      value={inputs.lumpSumOffer || ""}
                      onChange={(e) =>
                        updateInput(
                          "lumpSumOffer",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      className="pl-7"
                      min={0}
                      step={10000}
                      placeholder="Enter lump sum offer"
                    />
                  </div>
                </div>

                {inputs.lumpSumOffer && inputs.lumpSumOffer > 0 && (
                  <div className="space-y-4">
                    {/* Comparison Bars */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        Buyout Comparison
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Pension Value</span>
                          <Badge variant="outline">
                            {formatLargeCurrency(
                              valuation.buyoutFairValue || 0
                            )}
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-500"
                            style={{ width: "100%" }}
                          >
                            {formatLargeCurrency(
                              valuation.buyoutFairValue || 0
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Lump Sum Offer</span>
                          <Badge
                            variant="outline"
                            className={
                              (valuation.buyoutDifference || 0) > 0
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {formatLargeCurrency(inputs.lumpSumOffer)}
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-500 ${
                              (valuation.buyoutDifference || 0) > 0
                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                : "bg-gradient-to-r from-red-400 to-red-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                ((inputs.lumpSumOffer /
                                  (valuation.buyoutFairValue || 1)) *
                                  100)
                              ).toFixed(0)}%`,
                            }}
                          >
                            {formatLargeCurrency(inputs.lumpSumOffer)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div
                      className={`rounded-lg p-4 border ${
                        valuation.buyoutRecommendation === "accept"
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                          : valuation.buyoutRecommendation === "reject"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                          : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {valuation.buyoutRecommendation === "accept" ? (
                          <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : valuation.buyoutRecommendation === "reject" ? (
                          <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Scale className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div
                            className={`font-semibold mb-1 ${
                              valuation.buyoutRecommendation === "accept"
                                ? "text-green-900 dark:text-green-100"
                                : valuation.buyoutRecommendation === "reject"
                                ? "text-red-900 dark:text-red-100"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {valuation.buyoutRecommendation === "accept"
                              ? "Lump Sum May Be Favorable"
                              : valuation.buyoutRecommendation === "reject"
                              ? "Pension May Be More Valuable"
                              : "Close Call - Consider Other Factors"}
                          </div>
                          <p
                            className={`text-sm ${
                              valuation.buyoutRecommendation === "accept"
                                ? "text-green-800 dark:text-green-200"
                                : valuation.buyoutRecommendation === "reject"
                                ? "text-red-800 dark:text-red-200"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            The lump sum is{" "}
                            <strong>
                              {formatLargeCurrency(
                                Math.abs(valuation.buyoutDifference || 0)
                              )}
                            </strong>{" "}
                            {(valuation.buyoutDifference || 0) > 0
                              ? "more"
                              : "less"}{" "}
                            than the pension's present value. Consider: your
                            investment skills, need for guaranteed income,
                            health status, and inflation protection needs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Government Pension / WEP/GPO Section */}
          {(inputs.pensionType === "federal_fers" ||
            inputs.pensionType === "federal_csrs" ||
            inputs.pensionType === "state_local") && (
            <div className="border rounded-lg p-4 space-y-4">
              <button
                type="button"
                className="flex items-center justify-between w-full"
                onClick={() => toggleSection("government")}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  Social Security Integration (WEP/GPO)
                </div>
                {expandedSections.government ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedSections.government && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="hasSSCoverage"
                      checked={inputs.hasSSCoverage}
                      onCheckedChange={(checked) =>
                        updateInput("hasSSCoverage", checked)
                      }
                    />
                    <Label htmlFor="hasSSCoverage" className="text-sm">
                      Pension job had Social Security coverage
                    </Label>
                  </div>

                  {!inputs.hasSSCoverage && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="ssMonthlyBenefit"
                            className="flex items-center gap-1"
                          >
                            Expected SS Benefit (before WEP)
                            <InfoTooltip content="Your Social Security benefit from other covered employment, before WEP reduction." />
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              id="ssMonthlyBenefit"
                              type="number"
                              value={inputs.ssMonthlyBenefit || ""}
                              onChange={(e) =>
                                updateInput(
                                  "ssMonthlyBenefit",
                                  Number(e.target.value)
                                )
                              }
                              className="pl-7"
                              min={0}
                              step={100}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="yearsOfSubstantialEarnings"
                            className="flex items-center gap-1"
                          >
                            Years of Substantial SS Earnings
                            <InfoTooltip content="Years with substantial earnings covered by Social Security (not from this pension job). 30+ years eliminates WEP." />
                          </Label>
                          <Input
                            id="yearsOfSubstantialEarnings"
                            type="number"
                            value={inputs.yearsOfSubstantialEarnings || 0}
                            onChange={(e) =>
                              updateInput(
                                "yearsOfSubstantialEarnings",
                                Number(e.target.value)
                              )
                            }
                            min={0}
                            max={45}
                          />
                        </div>
                      </div>

                      {valuation.wepReduction !== undefined &&
                        valuation.wepReduction > 0 && (
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                                  Windfall Elimination Provision (WEP) Impact
                                </div>
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  Your Social Security benefit will be reduced
                                  by approximately{" "}
                                  <strong>
                                    {formatCurrency(valuation.wepReduction)}
                                    /month
                                  </strong>{" "}
                                  due to WEP. Effective SS benefit:{" "}
                                  <strong>
                                    {formatCurrency(
                                      valuation.effectiveSSBenefit || 0
                                    )}
                                    /month
                                  </strong>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {inputs.yearsOfSubstantialEarnings &&
                        inputs.yearsOfSubstantialEarnings >= 30 && (
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                                  WEP Exempt
                                </div>
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  With 30+ years of substantial SS-covered
                                  earnings, you are exempt from the Windfall
                                  Elimination Provision.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Integration with Retirement Income */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Impact on Portfolio Withdrawals
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your pension provides{" "}
                <strong>{formatCurrency(valuation.annualBenefit)}/year</strong>{" "}
                in guaranteed income. This reduces your portfolio withdrawal
                needs significantly. If your total spending need is $80,000/year,
                your pension covers{" "}
                <strong>
                  {Math.min(100, (valuation.annualBenefit / 80000) * 100).toFixed(
                    0
                  )}
                  %
                </strong>
                , meaning you only need to withdraw{" "}
                <strong>
                  {formatCurrency(Math.max(0, 80000 - valuation.annualBenefit))}
                </strong>{" "}
                from your portfolio annually.
              </p>
            </div>
          </div>
        </div>

        {/* Educational Footer */}
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Understanding Pension Value
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>Present Value:</strong> The lump sum today that would
              provide the same income stream, using your discount rate to
              account for time value of money.
            </li>
            <li>
              <strong>COLA Impact:</strong> Cost-of-living adjustments protect
              against inflation and can add 30-50% to a pension's value over a
              long retirement.
            </li>
            <li>
              <strong>Survivor Benefits:</strong> Joint options reduce your
              monthly benefit but provide insurance for your spouse.
            </li>
            <li>
              <strong>WEP/GPO:</strong> If you have a government pension from
              non-SS-covered work, your Social Security may be reduced.
            </li>
            <li>
              <strong>Portfolio Equivalent:</strong> The 4% rule equivalent
              shows what investment portfolio would generate similar income.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});

PensionCalculator.displayName = "PensionCalculator";

export default PensionCalculator;

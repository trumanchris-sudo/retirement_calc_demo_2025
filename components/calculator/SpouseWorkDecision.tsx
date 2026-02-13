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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SliderInput } from "@/components/form/SliderInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Heart,
  Shield,
  Baby,
  Car,
  Shirt,
  Coffee,
  PiggyBank,
  GraduationCap,
  Scale,
  Info,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { TAX_BRACKETS } from "@/lib/constants";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SpouseWorkInputs {
  primaryIncome: number;
  secondaryIncome: number;
  numberOfChildren: number;
  childcarePerChild: number;
  commuteMonthly: number;
  workWardrobeAnnual: number;
  workMealsMonthly: number;
  otherWorkExpenses: number;
  employer401kMatch: number;
  employerMatchPercent: number;
  hasHealthInsurance: boolean;
  healthInsuranceValue: number;
  partTimePercent: number;
}

interface TaxBreakdown {
  federalTax: number;
  ficaTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

interface AnalysisResult {
  grossSecondaryIncome: number;
  totalTaxOnSecondary: number;
  totalWorkExpenses: number;
  trueNetBenefit: number;
  effectiveTaxRate: number;
  marginalRate: number;
  childcareBreakeven: number;
  recommendation: "strongly-positive" | "positive" | "marginal" | "negative";
  hiddenBenefitsValue: number;
  hiddenCostsValue: number;
}

type WorkScenario = "full-time" | "part-time" | "not-working";

// ============================================================================
// Tax Calculation Utilities
// ============================================================================

/**
 * Calculate federal income tax using 2026 brackets
 */
function calculateFederalTax(taxableIncome: number): TaxBreakdown {
  const brackets = TAX_BRACKETS.married;
  const { rates, deduction } = brackets;

  let adjustedIncome = Math.max(0, taxableIncome - deduction);
  let tax = 0;
  let prev = 0;
  let currentMarginalRate = 0.10;

  for (const b of rates) {
    const amount = Math.min(adjustedIncome, b.limit - prev);
    if (amount > 0) {
      tax += amount * b.rate;
      currentMarginalRate = b.rate;
    }
    adjustedIncome -= amount;
    prev = b.limit;
    if (adjustedIncome <= 0) break;
  }

  return {
    federalTax: tax,
    ficaTax: 0,
    stateTax: 0,
    totalTax: tax,
    effectiveRate: taxableIncome > 0 ? tax / taxableIncome : 0,
    marginalRate: currentMarginalRate,
  };
}

/**
 * Calculate FICA taxes (Social Security + Medicare)
 */
function calculateFICA(income: number): number {
  const socialSecurityWageBase = 176100; // 2026 projected
  const socialSecurityRate = 0.062;
  const medicareRate = 0.0145;
  const additionalMedicareThreshold = 250000; // MFJ
  const additionalMedicareRate = 0.009;

  const socialSecurityTax = Math.min(income, socialSecurityWageBase) * socialSecurityRate;
  const medicareTax = income * medicareRate;
  const additionalMedicare =
    income > additionalMedicareThreshold
      ? (income - additionalMedicareThreshold) * additionalMedicareRate
      : 0;

  return socialSecurityTax + medicareTax + additionalMedicare;
}

/**
 * Calculate marginal tax on second income (stacked on top of primary)
 */
function calculateMarginalTaxOnSecondary(
  primaryIncome: number,
  secondaryIncome: number
): { tax: number; effectiveRate: number; marginalRate: number } {
  const taxWithPrimary = calculateFederalTax(primaryIncome);
  const taxWithBoth = calculateFederalTax(primaryIncome + secondaryIncome);

  const additionalFederal = taxWithBoth.federalTax - taxWithPrimary.federalTax;
  const additionalFICA = calculateFICA(secondaryIncome);
  const stateTax = secondaryIncome * 0.05; // Assume 5% state tax

  const totalTax = additionalFederal + additionalFICA + stateTax;
  const effectiveRate = secondaryIncome > 0 ? totalTax / secondaryIncome : 0;

  return {
    tax: totalTax,
    effectiveRate,
    marginalRate: taxWithBoth.marginalRate,
  };
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Calculate the true net benefit of second income
 */
function analyzeSecondIncome(inputs: SpouseWorkInputs): AnalysisResult {
  const {
    primaryIncome,
    secondaryIncome,
    numberOfChildren,
    childcarePerChild,
    commuteMonthly,
    workWardrobeAnnual,
    workMealsMonthly,
    otherWorkExpenses,
    employer401kMatch,
    employerMatchPercent,
    hasHealthInsurance,
    healthInsuranceValue,
  } = inputs;

  // Calculate tax burden on secondary income
  const taxInfo = calculateMarginalTaxOnSecondary(primaryIncome, secondaryIncome);

  // Calculate total work-related expenses
  const annualChildcare = numberOfChildren * childcarePerChild * 12;
  const annualCommute = commuteMonthly * 12;
  const annualMeals = workMealsMonthly * 12;
  const totalWorkExpenses =
    annualChildcare + annualCommute + workWardrobeAnnual + annualMeals + otherWorkExpenses;

  // Calculate hidden benefits
  const match401kValue = Math.min(
    secondaryIncome * (employerMatchPercent / 100),
    employer401kMatch
  );
  const healthValue = hasHealthInsurance ? healthInsuranceValue : 0;
  const socialSecurityCredits = secondaryIncome * 0.062; // Future SS benefit accrual
  const hiddenBenefitsValue = match401kValue + healthValue + socialSecurityCredits * 0.5; // Discounted SS value

  // Calculate hidden costs of not working
  const careerGapCost = secondaryIncome * 0.05; // 5% annual earning power erosion
  const lostRetirementContributions = Math.min(secondaryIncome * 0.15, 23500); // Max 401k
  const hiddenCostsValue = careerGapCost + lostRetirementContributions * 0.3; // Present value discount

  // True net benefit
  const trueNetBenefit =
    secondaryIncome - taxInfo.tax - totalWorkExpenses + hiddenBenefitsValue;

  // Calculate childcare breakeven point
  const netBeforeChildcare = secondaryIncome - taxInfo.tax - (totalWorkExpenses - annualChildcare);
  const childcareBreakeven =
    numberOfChildren > 0 ? netBeforeChildcare / (numberOfChildren * 12) : 0;

  // Determine recommendation
  let recommendation: AnalysisResult["recommendation"];
  const netRatio = trueNetBenefit / secondaryIncome;

  if (netRatio >= 0.5) {
    recommendation = "strongly-positive";
  } else if (netRatio >= 0.25) {
    recommendation = "positive";
  } else if (netRatio >= 0) {
    recommendation = "marginal";
  } else {
    recommendation = "negative";
  }

  return {
    grossSecondaryIncome: secondaryIncome,
    totalTaxOnSecondary: taxInfo.tax,
    totalWorkExpenses,
    trueNetBenefit,
    effectiveTaxRate: taxInfo.effectiveRate,
    marginalRate: taxInfo.marginalRate,
    childcareBreakeven,
    recommendation,
    hiddenBenefitsValue,
    hiddenCostsValue,
  };
}

/**
 * Analyze part-time scenario
 */
function analyzePartTime(
  inputs: SpouseWorkInputs
): { fullTime: AnalysisResult; partTime: AnalysisResult; optimal: WorkScenario } {
  const fullTimeResult = analyzeSecondIncome(inputs);

  // Part-time adjustments
  const partTimeMultiplier = inputs.partTimePercent / 100;
  const partTimeInputs: SpouseWorkInputs = {
    ...inputs,
    secondaryIncome: inputs.secondaryIncome * partTimeMultiplier,
    childcarePerChild: inputs.childcarePerChild * 0.6, // Reduced childcare needs
    commuteMonthly: inputs.commuteMonthly * partTimeMultiplier,
    workWardrobeAnnual: inputs.workWardrobeAnnual * 0.5,
    workMealsMonthly: inputs.workMealsMonthly * partTimeMultiplier,
    employer401kMatch: inputs.employer401kMatch * partTimeMultiplier,
  };

  const partTimeResult = analyzeSecondIncome(partTimeInputs);

  // Determine optimal scenario
  let optimal: WorkScenario = "full-time";
  const fullTimeNet = fullTimeResult.trueNetBenefit;
  const partTimeNet = partTimeResult.trueNetBenefit;

  // Consider non-financial factors in part-time benefit
  const partTimeLifestyleBonus = inputs.secondaryIncome * 0.1; // Value of flexibility

  if (fullTimeNet < 0 && partTimeNet < 0) {
    optimal = "not-working";
  } else if (partTimeNet + partTimeLifestyleBonus > fullTimeNet) {
    optimal = "part-time";
  }

  return { fullTime: fullTimeResult, partTime: partTimeResult, optimal };
}

// ============================================================================
// Format Utilities
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatFullCurrency = (value: number): string => {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

// ============================================================================
// Sub-Components
// ============================================================================

interface InputSectionProps {
  inputs: SpouseWorkInputs;
  setInputs: React.Dispatch<React.SetStateAction<SpouseWorkInputs>>;
}

const InputSection: React.FC<InputSectionProps> = ({ inputs, setInputs }) => {
  const handleChange = useCallback(
    (field: keyof SpouseWorkInputs, value: number | boolean) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    [setInputs]
  );

  return (
    <div className="space-y-6">
      {/* Income Inputs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Income Details</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryIncome">Primary Spouse Income (Annual)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="primaryIncome"
                type="number"
                value={inputs.primaryIncome}
                onChange={(e) => handleChange("primaryIncome", Number(e.target.value))}
                className="pl-7"
                placeholder="100,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryIncome">Second Spouse Income (Annual)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="secondaryIncome"
                type="number"
                value={inputs.secondaryIncome}
                onChange={(e) => handleChange("secondaryIncome", Number(e.target.value))}
                className="pl-7"
                placeholder="75,000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Childcare */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Baby className="h-4 w-4" />
          <span>Childcare Costs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numberOfChildren">Number of Children Needing Care</Label>
            <Select
              value={String(inputs.numberOfChildren)}
              onValueChange={(v) => handleChange("numberOfChildren", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "child" : "children"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {inputs.numberOfChildren > 0 && (
            <div className="space-y-2">
              <Label htmlFor="childcarePerChild">Monthly Cost Per Child</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="childcarePerChild"
                  type="number"
                  value={inputs.childcarePerChild}
                  onChange={(e) => handleChange("childcarePerChild", Number(e.target.value))}
                  className="pl-7"
                  placeholder="1,500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work Expenses */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          <span>Work-Related Expenses</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commuteMonthly" className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" />
              Monthly Commute Cost
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="commuteMonthly"
                type="number"
                value={inputs.commuteMonthly}
                onChange={(e) => handleChange("commuteMonthly", Number(e.target.value))}
                className="pl-7"
                placeholder="300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workWardrobeAnnual" className="flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5" />
              Annual Work Wardrobe
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="workWardrobeAnnual"
                type="number"
                value={inputs.workWardrobeAnnual}
                onChange={(e) => handleChange("workWardrobeAnnual", Number(e.target.value))}
                className="pl-7"
                placeholder="1,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workMealsMonthly" className="flex items-center gap-1.5">
              <Coffee className="h-3.5 w-3.5" />
              Monthly Work Meals/Coffee
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="workMealsMonthly"
                type="number"
                value={inputs.workMealsMonthly}
                onChange={(e) => handleChange("workMealsMonthly", Number(e.target.value))}
                className="pl-7"
                placeholder="200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherWorkExpenses">Other Annual Work Expenses</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="otherWorkExpenses"
                type="number"
                value={inputs.otherWorkExpenses}
                onChange={(e) => handleChange("otherWorkExpenses", Number(e.target.value))}
                className="pl-7"
                placeholder="500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employer Benefits */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <PiggyBank className="h-4 w-4" />
          <span>Employer Benefits</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SliderInput
            label="401(k) Match Percent"
            value={inputs.employerMatchPercent}
            min={0}
            max={10}
            step={0.5}
            unit="%"
            onChange={(v) => handleChange("employerMatchPercent", v)}
            tip="Percentage of salary your employer matches"
          />

          <div className="space-y-2">
            <Label htmlFor="employer401kMatch">Max Annual Match ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="employer401kMatch"
                type="number"
                value={inputs.employer401kMatch}
                onChange={(e) => handleChange("employer401kMatch", Number(e.target.value))}
                className="pl-7"
                placeholder="6,000"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasHealthInsurance"
              checked={inputs.hasHealthInsurance}
              onChange={(e) => handleChange("hasHealthInsurance", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="hasHealthInsurance">Job provides health insurance</Label>
          </div>

          {inputs.hasHealthInsurance && (
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Value: $
                </span>
                <Input
                  type="number"
                  value={inputs.healthInsuranceValue}
                  onChange={(e) => handleChange("healthInsuranceValue", Number(e.target.value))}
                  className="pl-16"
                  placeholder="15,000"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part-Time Analysis */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Part-Time Scenario</span>
        </div>

        <SliderInput
          label="Part-Time Hours (% of Full-Time)"
          value={inputs.partTimePercent}
          min={20}
          max={80}
          step={5}
          unit="%"
          onChange={(v) => handleChange("partTimePercent", v)}
          description="Model a part-time scenario at this percentage of full-time hours"
        />
      </div>
    </div>
  );
};

// Results Waterfall Chart
interface WaterfallChartProps {
  result: AnalysisResult;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ result }) => {
  const items = [
    {
      label: "Gross Income",
      value: result.grossSecondaryIncome,
      type: "start" as const,
      color: "bg-blue-500",
    },
    {
      label: "Federal + FICA + State Tax",
      value: -result.totalTaxOnSecondary,
      type: "subtract" as const,
      color: "bg-red-500",
    },
    {
      label: "Work Expenses",
      value: -result.totalWorkExpenses,
      type: "subtract" as const,
      color: "bg-orange-500",
    },
    {
      label: "Hidden Benefits Value",
      value: result.hiddenBenefitsValue,
      type: "add" as const,
      color: "bg-green-500",
    },
    {
      label: "True Net Benefit",
      value: result.trueNetBenefit,
      type: "end" as const,
      color: result.trueNetBenefit >= 0 ? "bg-emerald-500" : "bg-red-600",
    },
  ];

  const maxValue = Math.max(
    result.grossSecondaryIncome,
    Math.abs(result.trueNetBenefit)
  );

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const widthPercent = Math.abs(item.value) / maxValue * 100;
        const isNegative = item.value < 0;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={item.type === "end" ? "font-semibold" : ""}>
                {item.label}
              </span>
              <span
                className={`font-mono ${
                  isNegative ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                } ${item.type === "end" ? "font-bold" : ""}`}
              >
                {isNegative ? "-" : ""}
                {formatFullCurrency(Math.abs(item.value))}
              </span>
            </div>
            <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(widthPercent, 5)}%` }}
              >
                <span className="text-xs text-white font-medium">
                  {formatCurrency(Math.abs(item.value))}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Tax Impact Card
interface TaxImpactCardProps {
  primaryIncome: number;
  secondaryIncome: number;
  result: AnalysisResult;
}

const TaxImpactCard: React.FC<TaxImpactCardProps> = ({
  primaryIncome,
  secondaryIncome,
  result,
}) => {
  const primaryTax = calculateFederalTax(primaryIncome);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              The Second Earner Tax Trap
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              The second spouse's income starts at the <strong>top</strong> of the
              first spouse's income. This means their first dollar is taxed at{" "}
              <strong>{formatPercent(primaryTax.marginalRate)}</strong>, not 10%.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Marginal Rate</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatPercent(result.marginalRate)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Federal bracket</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">+ FICA</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            7.65%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Social Security + Medicare</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Effective Rate</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {formatPercent(result.effectiveTaxRate)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">On second income</div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <strong>Total tax on ${formatFullCurrency(secondaryIncome)}:</strong>{" "}
        <span className="text-red-600 dark:text-red-400 font-semibold">
          {formatFullCurrency(result.totalTaxOnSecondary)}
        </span>
      </div>
    </div>
  );
};

// Childcare Breakeven Card
interface ChildcareBreakevenProps {
  result: AnalysisResult;
  numberOfChildren: number;
  currentChildcarePerChild: number;
}

const ChildcareBreakeven: React.FC<ChildcareBreakevenProps> = ({
  result,
  numberOfChildren,
  currentChildcarePerChild,
}) => {
  if (numberOfChildren === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
        <div className="text-muted-foreground">
          No children requiring childcare. This analysis is most relevant for
          families with young children.
        </div>
      </div>
    );
  }

  const isAboveBreakeven = currentChildcarePerChild < result.childcareBreakeven;
  const difference = result.childcareBreakeven - currentChildcarePerChild;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`rounded-lg p-4 text-center ${
            isAboveBreakeven
              ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
          }`}
        >
          <div className="text-sm text-muted-foreground mb-1">
            Breakeven Childcare Cost
          </div>
          <div
            className={`text-3xl font-bold ${
              isAboveBreakeven
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatFullCurrency(result.childcareBreakeven)}/mo
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Per child, to net $0
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Your Cost</div>
          <div className="text-3xl font-bold">
            {formatFullCurrency(currentChildcarePerChild)}/mo
          </div>
          <div className="text-xs text-muted-foreground mt-1">Per child</div>
        </div>
      </div>

      <div
        className={`rounded-lg p-4 ${
          isAboveBreakeven
            ? "bg-green-50 dark:bg-green-950/30"
            : "bg-amber-50 dark:bg-amber-950/30"
        }`}
      >
        {isAboveBreakeven ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100">
                Below Breakeven
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                You have <strong>{formatFullCurrency(difference)}/month</strong>{" "}
                of buffer per child before childcare would eliminate the financial
                benefit of working.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100">
                Above Breakeven
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your childcare costs exceed the financial breakeven by{" "}
                <strong>{formatFullCurrency(Math.abs(difference))}/month</strong>{" "}
                per child. Consider the non-financial benefits before deciding.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground italic">
        <strong>Important:</strong> This is just the financial breakeven. Career
        trajectory, retirement contributions, and professional development have
        long-term value that compounds over time.
      </div>
    </div>
  );
};

// Hidden Benefits Card
const HiddenBenefitsCard: React.FC<{
  inputs: SpouseWorkInputs;
  result: AnalysisResult;
}> = ({ inputs, result }) => {
  const benefits = [
    {
      icon: PiggyBank,
      label: "401(k) Match",
      value: Math.min(
        inputs.secondaryIncome * (inputs.employerMatchPercent / 100),
        inputs.employer401kMatch
      ),
      description: "FREE MONEY - employer contribution",
      color: "text-green-600",
    },
    {
      icon: Shield,
      label: "Health Insurance",
      value: inputs.hasHealthInsurance ? inputs.healthInsuranceValue : 0,
      description: "Coverage value if job provides it",
      color: "text-blue-600",
    },
    {
      icon: Users,
      label: "Social Security Credits",
      value: inputs.secondaryIncome * 0.031, // Rough present value of future benefits
      description: "Future retirement benefit accrual",
      color: "text-purple-600",
    },
    {
      icon: TrendingUp,
      label: "Career Progression",
      value: inputs.secondaryIncome * 0.03, // Estimated annual raise potential
      description: "Salary growth and advancement",
      color: "text-orange-600",
    },
    {
      icon: Heart,
      label: "Financial Independence",
      value: 0,
      description: "Priceless - security and options",
      color: "text-pink-600",
      qualitative: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Beyond the Paycheck
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              The true value of working extends far beyond take-home pay. These
              benefits compound over a career.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {benefits.map((benefit, idx) => {
          const Icon = benefit.icon;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${benefit.color}`} />
                <div>
                  <div className="font-medium text-sm">{benefit.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {benefit.description}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {benefit.qualitative ? (
                  <Badge variant="outline" className="bg-pink-50 text-pink-700">
                    Invaluable
                  </Badge>
                ) : benefit.value > 0 ? (
                  <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                    +{formatFullCurrency(benefit.value)}/yr
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">N/A</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Total quantifiable benefits:</strong>{" "}
            <span className="font-mono font-semibold">
              {formatFullCurrency(result.hiddenBenefitsValue)}/year
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hidden Costs Card
const HiddenCostsCard: React.FC<{
  inputs: SpouseWorkInputs;
  result: AnalysisResult;
}> = ({ inputs }) => {
  const yearsNotWorking = 5; // Assumption for career gap calculations

  const costs = [
    {
      icon: GraduationCap,
      label: "Resume Gap",
      value: inputs.secondaryIncome * 0.15,
      description: `After ${yearsNotWorking} years out, expect 15-20% lower re-entry salary`,
      color: "text-red-600",
    },
    {
      icon: PiggyBank,
      label: "Lost 401(k) Contributions",
      value: Math.min(inputs.secondaryIncome * 0.15, 23500) * yearsNotWorking,
      description: `${yearsNotWorking} years of missed tax-advantaged savings`,
      color: "text-orange-600",
    },
    {
      icon: Users,
      label: "Social Security Impact",
      value: inputs.secondaryIncome * 0.02 * yearsNotWorking,
      description: "Lower lifetime earnings = lower benefits",
      color: "text-purple-600",
    },
    {
      icon: Shield,
      label: "One-Income Risk",
      value: 0,
      description: "Job loss, divorce, disability vulnerability",
      color: "text-amber-600",
      qualitative: true,
    },
    {
      icon: TrendingDown,
      label: "Skill Atrophy",
      value: 0,
      description: "Technology and industry knowledge gaps",
      color: "text-gray-600",
      qualitative: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
              The True Cost of Not Working
            </div>
            <p className="text-sm text-red-800 dark:text-red-200">
              Leaving the workforce has compounding costs that extend far beyond
              the immediate loss of income. Consider a {yearsNotWorking}-year
              career break.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {costs.map((cost, idx) => {
          const Icon = cost.icon;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${cost.color}`} />
                <div>
                  <div className="font-medium text-sm">{cost.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {cost.description}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {cost.qualitative ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    High Risk
                  </Badge>
                ) : cost.value > 0 ? (
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(cost.value)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">N/A</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Part-Time Analysis Card
interface PartTimeAnalysisProps {
  analysis: ReturnType<typeof analyzePartTime>;
  partTimePercent: number;
}

const PartTimeAnalysis: React.FC<PartTimeAnalysisProps> = ({
  analysis,
  partTimePercent,
}) => {
  const { fullTime, partTime, optimal } = analysis;

  const scenarios = [
    {
      label: "Full-Time",
      result: fullTime,
      isOptimal: optimal === "full-time",
    },
    {
      label: `Part-Time (${partTimePercent}%)`,
      result: partTime,
      isOptimal: optimal === "part-time",
    },
    {
      label: "Not Working",
      result: {
        trueNetBenefit: 0,
        grossSecondaryIncome: 0,
        totalTaxOnSecondary: 0,
        totalWorkExpenses: 0,
      } as AnalysisResult,
      isOptimal: optimal === "not-working",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              The Part-Time Sweet Spot
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Sometimes part-time is the optimal choice. Lower childcare needs,
              maintained career trajectory, and better work-life balance can
              maximize net benefit.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((scenario, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-4 border-2 transition-all ${
              scenario.isOptimal
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : "border-transparent bg-gray-50 dark:bg-gray-900/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{scenario.label}</span>
              {scenario.isOptimal && (
                <Badge className="bg-green-600 text-white">Optimal</Badge>
              )}
            </div>
            <div
              className={`text-2xl font-bold ${
                scenario.result.trueNetBenefit >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {scenario.result.trueNetBenefit > 0 ? "+" : ""}
              {formatFullCurrency(scenario.result.trueNetBenefit)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              True net benefit/year
            </div>
          </div>
        ))}
      </div>

      {optimal === "part-time" && (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100">
                Part-Time Recommended
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                Based on your inputs, working part-time at {partTimePercent}%
                provides the best balance of income, reduced expenses, and
                maintained career trajectory.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendation Card
interface RecommendationCardProps {
  result: AnalysisResult;
  inputs: SpouseWorkInputs;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  result,
  inputs,
}) => {
  const recommendations = {
    "strongly-positive": {
      color: "bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-800",
      textColor: "text-green-900 dark:text-green-100",
      icon: CheckCircle2,
      iconColor: "text-green-600",
      title: "Strongly Beneficial",
      message: `Working generates a true net benefit of ${formatFullCurrency(result.trueNetBenefit)}/year. The financial case is clear.`,
    },
    positive: {
      color: "bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800",
      textColor: "text-blue-900 dark:text-blue-100",
      icon: TrendingUp,
      iconColor: "text-blue-600",
      title: "Net Positive",
      message: `Working adds ${formatFullCurrency(result.trueNetBenefit)}/year after all costs. Combined with career benefits, working makes sense.`,
    },
    marginal: {
      color: "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
      textColor: "text-amber-900 dark:text-amber-100",
      icon: Scale,
      iconColor: "text-amber-600",
      title: "Marginal Benefit",
      message: `Net benefit is ${formatFullCurrency(result.trueNetBenefit)}/year. Consider non-financial factors and whether part-time makes more sense.`,
    },
    negative: {
      color: "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800",
      textColor: "text-red-900 dark:text-red-100",
      icon: TrendingDown,
      iconColor: "text-red-600",
      title: "Financial Loss",
      message: `Working costs ${formatFullCurrency(Math.abs(result.trueNetBenefit))}/year more than staying home. But consider career trajectory and long-term implications.`,
    },
  };

  const rec = recommendations[result.recommendation];
  const Icon = rec.icon;

  return (
    <div className={`rounded-lg p-6 border-2 ${rec.color}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full bg-white dark:bg-gray-900 shadow-md`}>
          <Icon className={`h-8 w-8 ${rec.iconColor}`} />
        </div>
        <div className="flex-1">
          <div className={`text-xl font-bold ${rec.textColor} mb-2`}>
            {rec.title}
          </div>
          <p className={`${rec.textColor} opacity-90`}>{rec.message}</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Keep {formatPercent(1 - result.effectiveTaxRate)} of income
              </div>
              <div className="text-lg font-semibold">
                {formatFullCurrency(
                  inputs.secondaryIncome - result.totalTaxOnSecondary
                )}
                /yr after tax
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Hidden benefits add
              </div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                +{formatFullCurrency(result.hiddenBenefitsValue)}/yr
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SpouseWorkDecision: React.FC = () => {
  const [inputs, setInputs] = useState<SpouseWorkInputs>({
    primaryIncome: 100000,
    secondaryIncome: 75000,
    numberOfChildren: 2,
    childcarePerChild: 1500,
    commuteMonthly: 300,
    workWardrobeAnnual: 1000,
    workMealsMonthly: 200,
    otherWorkExpenses: 500,
    employer401kMatch: 6000,
    employerMatchPercent: 4,
    hasHealthInsurance: true,
    healthInsuranceValue: 15000,
    partTimePercent: 50,
  });

  const result = useMemo(() => analyzeSecondIncome(inputs), [inputs]);
  const partTimeAnalysis = useMemo(() => analyzePartTime(inputs), [inputs]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Should the Second Spouse Work?
              <Badge variant="outline" className="ml-2">
                Calculator + Framework
              </Badge>
            </CardTitle>
            <CardDescription>
              The real math behind the two-income decision. It's never just about
              the paycheck.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Recommendation */}
        <RecommendationCard result={result} inputs={inputs} />

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
            <TabsTrigger value="calculator" className="gap-1.5">
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="waterfall" className="gap-1.5">
              <ChevronRight className="h-4 w-4" />
              <span className="hidden md:inline">Breakdown</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span className="hidden md:inline">Tax Impact</span>
            </TabsTrigger>
            <TabsTrigger value="childcare" className="gap-1.5">
              <Baby className="h-4 w-4" />
              <span className="hidden md:inline">Childcare</span>
            </TabsTrigger>
            <TabsTrigger value="benefits" className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden md:inline">Benefits</span>
            </TabsTrigger>
            <TabsTrigger value="parttime" className="gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Part-Time</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="mt-6">
            <InputSection inputs={inputs} setInputs={setInputs} />
          </TabsContent>

          <TabsContent value="waterfall" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">The Real Math</h3>
                <Badge variant="secondary">Income Waterfall</Badge>
              </div>
              <WaterfallChart result={result} />
            </div>
          </TabsContent>

          <TabsContent value="tax" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Tax Impact Analysis</h3>
                <Badge variant="secondary">Second Earner Penalty</Badge>
              </div>
              <TaxImpactCard
                primaryIncome={inputs.primaryIncome}
                secondaryIncome={inputs.secondaryIncome}
                result={result}
              />
            </div>
          </TabsContent>

          <TabsContent value="childcare" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Childcare Breakeven</h3>
                <Badge variant="secondary">At what point is it "not worth it"?</Badge>
              </div>
              <ChildcareBreakeven
                result={result}
                numberOfChildren={inputs.numberOfChildren}
                currentChildcarePerChild={inputs.childcarePerChild}
              />
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Hidden Benefits of Working</h3>
                </div>
                <HiddenBenefitsCard inputs={inputs} result={result} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Hidden Costs of Not Working</h3>
                </div>
                <HiddenCostsCard inputs={inputs} result={result} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parttime" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Part-Time Sweet Spot</h3>
                <Badge variant="secondary">Scenario Comparison</Badge>
              </div>
              <PartTimeAnalysis
                analysis={partTimeAnalysis}
                partTimePercent={inputs.partTimePercent}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Framework Summary */}
        <div className="border-t pt-6 mt-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              The Framework: Questions to Ask
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-purple-700 dark:text-purple-300">
                  Financial Questions:
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500" />
                    What's my true take-home after all costs?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500" />
                    Am I leaving 401k match on the table?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500" />
                    What's childcare costing vs. my net income?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500" />
                    Is part-time actually more efficient?
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  Career & Life Questions:
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500" />
                    What's the 10-year career impact of stopping now?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500" />
                    How does this affect my Social Security?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500" />
                    What's our risk if primary income disappears?
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500" />
                    Will I want to re-enter later? How hard will it be?
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <strong>Bottom line:</strong> The decision is rarely black and
                white. Use this calculator to understand the financial reality,
                but weigh it against career trajectory, personal fulfillment,
                family needs, and risk tolerance. Sometimes "breaking even" is
                still worth it for the long-term benefits.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpouseWorkDecision;

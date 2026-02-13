"use client";

/**
 * Rental Property Analyzer
 *
 * A comprehensive tool for analyzing rental property investments as part of
 * a retirement strategy. Integrates with the retirement calculator to model
 * rental income alongside portfolio withdrawals.
 *
 * Features:
 * 1. Cash Flow Calculator - Monthly and annual projections
 * 2. Cap Rate Calculator - NOI / Property Value
 * 3. Cash-on-Cash Return - Annual cash flow / Cash invested
 * 4. Appreciation Projection - Conservative growth assumptions
 * 5. Tax Benefits - Depreciation, mortgage interest, 1031 exchanges
 * 6. Retirement Integration - Rental income as retirement income source
 * 7. Buy vs Rent Analysis - Compare owning vs renting your primary residence
 * 8. FIRE Consideration - Real estate as path to early retirement
 */

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Home,
  DollarSign,
  TrendingUp,
  Calculator,
  PiggyBank,
  Calendar,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Building,
  Wallet,
  Target,
  Flame,
  ArrowRight,
  Shield,
  BarChart3,
} from "lucide-react";
import { cn, fmt } from "@/lib/utils";

// ==================== Types ====================

interface RentalPropertyInputs {
  // Property Details
  purchasePrice: number;
  downPaymentPercent: number;
  closingCosts: number;
  repairBudget: number;

  // Financing
  mortgageRate: number;
  mortgageTerm: number; // years

  // Income
  monthlyRent: number;
  otherIncome: number; // Laundry, parking, etc.

  // Expenses
  propertyTaxRate: number; // Annual as % of property value
  insuranceAnnual: number;
  maintenancePercent: number; // % of rent (1% rule = 1% of property value/year)
  vacancyRate: number; // % of gross rent
  propertyManagementRate: number; // % of rent
  isSelfManaged: boolean;
  hoaMonthly: number;
  utilitiesMonthly: number; // If owner pays any

  // Assumptions
  appreciationRate: number;
  rentGrowthRate: number;
  holdingPeriod: number; // years
}

interface CashFlowAnalysis {
  // Monthly
  grossMonthlyIncome: number;
  effectiveGrossIncome: number; // After vacancy
  totalMonthlyExpenses: number;
  monthlyMortgage: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  monthlyManagement: number;
  monthlyHOA: number;
  monthlyUtilities: number;
  monthlyCashFlow: number;

  // Annual
  annualCashFlow: number;
  annualNOI: number; // Net Operating Income (before mortgage)

  // Returns
  capRate: number;
  cashOnCashReturn: number;
  totalCashInvested: number;

  // Projections
  yearOneToFive: YearlyProjection[];
  totalAppreciation: number;
  totalEquityBuildup: number;
  totalCashFlow: number;
  totalReturn: number;
  annualizedReturn: number;
}

interface YearlyProjection {
  year: number;
  propertyValue: number;
  monthlyRent: number;
  annualCashFlow: number;
  equity: number;
  loanBalance: number;
  cumulativeCashFlow: number;
}

interface TaxBenefits {
  annualDepreciation: number;
  yearOneMortgageInterest: number;
  taxSavingsEstimate: number;
  depreciationScheduleYears: number;
}

interface BuyVsRentAnalysis {
  monthlyRentEquivalent: number;
  breakEvenYears: number;
  fiveYearAdvantage: number;
  tenYearAdvantage: number;
  recommendation: "buy" | "rent" | "neutral";
  reasoning: string;
}

interface FIREAnalysis {
  propertiesNeededFor50k: number;
  propertiesNeededFor100k: number;
  timeToFirstProperty: number; // years
  fireTimelineImpact: string;
}

// ==================== Constants ====================

const DEFAULT_INPUTS: RentalPropertyInputs = {
  purchasePrice: 300000,
  downPaymentPercent: 20,
  closingCosts: 9000,
  repairBudget: 5000,
  mortgageRate: 7.0,
  mortgageTerm: 30,
  monthlyRent: 2200,
  otherIncome: 0,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1800,
  maintenancePercent: 10, // 10% of rent
  vacancyRate: 8,
  propertyManagementRate: 10,
  isSelfManaged: true,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  appreciationRate: 3,
  rentGrowthRate: 3,
  holdingPeriod: 10,
};

// ==================== Calculation Functions ====================

function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;

  if (monthlyRate === 0) return principal / numPayments;

  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

function calculateLoanBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  yearsElapsed: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;
  const paymentsMade = yearsElapsed * 12;

  if (monthlyRate === 0) {
    return principal - (principal / totalPayments) * paymentsMade;
  }

  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);

  return (
    principal * Math.pow(1 + monthlyRate, paymentsMade) -
    (monthlyPayment * (Math.pow(1 + monthlyRate, paymentsMade) - 1)) / monthlyRate
  );
}

function calculateYearOneMortgageInterest(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  let balance = principal;
  let totalInterest = 0;

  for (let i = 0; i < 12; i++) {
    const interestPayment = balance * monthlyRate;
    totalInterest += interestPayment;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
  }

  return totalInterest;
}

function analyzeCashFlow(inputs: RentalPropertyInputs): CashFlowAnalysis {
  // Calculate cash invested
  const downPayment = inputs.purchasePrice * (inputs.downPaymentPercent / 100);
  const totalCashInvested = downPayment + inputs.closingCosts + inputs.repairBudget;
  const loanAmount = inputs.purchasePrice - downPayment;

  // Monthly income
  const grossMonthlyIncome = inputs.monthlyRent + inputs.otherIncome;
  const effectiveGrossIncome =
    grossMonthlyIncome * (1 - inputs.vacancyRate / 100);

  // Monthly expenses
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm
  );
  const monthlyPropertyTax =
    (inputs.purchasePrice * (inputs.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = inputs.insuranceAnnual / 12;
  const monthlyMaintenance =
    inputs.monthlyRent * (inputs.maintenancePercent / 100);
  const monthlyManagement = inputs.isSelfManaged
    ? 0
    : inputs.monthlyRent * (inputs.propertyManagementRate / 100);

  const totalMonthlyExpenses =
    monthlyMortgage +
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyMaintenance +
    monthlyManagement +
    inputs.hoaMonthly +
    inputs.utilitiesMonthly;

  const monthlyCashFlow = effectiveGrossIncome - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // NOI (Net Operating Income) - excludes mortgage payment
  const annualOperatingExpenses =
    (monthlyPropertyTax +
      monthlyInsurance +
      monthlyMaintenance +
      monthlyManagement +
      inputs.hoaMonthly +
      inputs.utilitiesMonthly) *
    12;
  const annualNOI = effectiveGrossIncome * 12 - annualOperatingExpenses;

  // Returns
  const capRate = (annualNOI / inputs.purchasePrice) * 100;
  const cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;

  // Multi-year projections
  const yearOneToFive: YearlyProjection[] = [];
  let cumulativeCashFlow = 0;

  for (let year = 1; year <= Math.min(5, inputs.holdingPeriod); year++) {
    const propertyValue =
      inputs.purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, year);
    const monthlyRentProjected =
      inputs.monthlyRent * Math.pow(1 + inputs.rentGrowthRate / 100, year);

    // Simplified cash flow projection (doesn't account for expense growth)
    const projectedEffectiveGross =
      monthlyRentProjected * 12 * (1 - inputs.vacancyRate / 100);
    const projectedCashFlow =
      projectedEffectiveGross - totalMonthlyExpenses * 12;

    cumulativeCashFlow += projectedCashFlow;

    const loanBalance = calculateLoanBalance(
      loanAmount,
      inputs.mortgageRate,
      inputs.mortgageTerm,
      year
    );

    yearOneToFive.push({
      year,
      propertyValue,
      monthlyRent: monthlyRentProjected,
      annualCashFlow: projectedCashFlow,
      equity: propertyValue - loanBalance,
      loanBalance,
      cumulativeCashFlow,
    });
  }

  // Total returns over holding period
  const finalPropertyValue =
    inputs.purchasePrice *
    Math.pow(1 + inputs.appreciationRate / 100, inputs.holdingPeriod);
  const finalLoanBalance = calculateLoanBalance(
    loanAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm,
    inputs.holdingPeriod
  );

  const totalAppreciation = finalPropertyValue - inputs.purchasePrice;
  const totalEquityBuildup = loanAmount - finalLoanBalance;
  const totalCashFlow = annualCashFlow * inputs.holdingPeriod; // Simplified

  const totalReturn =
    totalAppreciation + totalEquityBuildup + totalCashFlow - totalCashInvested;
  const annualizedReturn =
    (Math.pow(
      (totalReturn + totalCashInvested) / totalCashInvested,
      1 / inputs.holdingPeriod
    ) -
      1) *
    100;

  return {
    grossMonthlyIncome,
    effectiveGrossIncome,
    totalMonthlyExpenses,
    monthlyMortgage,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyMaintenance,
    monthlyManagement,
    monthlyHOA: inputs.hoaMonthly,
    monthlyUtilities: inputs.utilitiesMonthly,
    monthlyCashFlow,
    annualCashFlow,
    annualNOI,
    capRate,
    cashOnCashReturn,
    totalCashInvested,
    yearOneToFive,
    totalAppreciation,
    totalEquityBuildup,
    totalCashFlow,
    totalReturn,
    annualizedReturn,
  };
}

function calculateTaxBenefits(
  inputs: RentalPropertyInputs,
  marginalTaxRate: number = 0.24
): TaxBenefits {
  // Depreciation: Building value (not land) over 27.5 years
  // Assume 80% building, 20% land
  const buildingValue = inputs.purchasePrice * 0.8;
  const annualDepreciation = buildingValue / 27.5;

  const loanAmount =
    inputs.purchasePrice * (1 - inputs.downPaymentPercent / 100);
  const yearOneMortgageInterest = calculateYearOneMortgageInterest(
    loanAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm
  );

  // Total deductions
  const totalDeductions = annualDepreciation + yearOneMortgageInterest;
  const taxSavingsEstimate = totalDeductions * marginalTaxRate;

  return {
    annualDepreciation,
    yearOneMortgageInterest,
    taxSavingsEstimate,
    depreciationScheduleYears: 27.5,
  };
}

function analyzeBuyVsRent(
  inputs: RentalPropertyInputs,
  monthlyRentAlternative: number
): BuyVsRentAnalysis {
  const analysis = analyzeCashFlow(inputs);

  // Total monthly cost of ownership
  const totalOwnershipCost =
    analysis.monthlyMortgage +
    analysis.monthlyPropertyTax +
    analysis.monthlyInsurance +
    analysis.monthlyMaintenance +
    inputs.hoaMonthly;

  // Break-even calculation (simplified)
  const monthlyAppreciation =
    (inputs.purchasePrice * (inputs.appreciationRate / 100)) / 12;
  const monthlyEquityBuildup =
    analysis.monthlyMortgage -
    (inputs.purchasePrice *
      (1 - inputs.downPaymentPercent / 100) *
      (inputs.mortgageRate / 100)) /
      12;

  const netMonthlyCostOwning =
    totalOwnershipCost - monthlyAppreciation - monthlyEquityBuildup;
  const monthlySavingsOwning = monthlyRentAlternative - netMonthlyCostOwning;

  // Calculate break-even
  const downPayment = inputs.purchasePrice * (inputs.downPaymentPercent / 100);
  const totalInitialCost = downPayment + inputs.closingCosts;

  const breakEvenMonths =
    monthlySavingsOwning > 0 ? totalInitialCost / monthlySavingsOwning : Infinity;
  const breakEvenYears = breakEvenMonths / 12;

  // 5 and 10 year advantages
  const fiveYearOwningCost = totalOwnershipCost * 60;
  const fiveYearRentingCost = monthlyRentAlternative * 60;
  const fiveYearEquity =
    inputs.purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, 5) -
    calculateLoanBalance(
      inputs.purchasePrice * (1 - inputs.downPaymentPercent / 100),
      inputs.mortgageRate,
      inputs.mortgageTerm,
      5
    );
  const fiveYearAdvantage =
    fiveYearEquity - totalInitialCost - (fiveYearOwningCost - fiveYearRentingCost);

  const tenYearOwningCost = totalOwnershipCost * 120;
  const tenYearRentingCost = monthlyRentAlternative * 120;
  const tenYearEquity =
    inputs.purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, 10) -
    calculateLoanBalance(
      inputs.purchasePrice * (1 - inputs.downPaymentPercent / 100),
      inputs.mortgageRate,
      inputs.mortgageTerm,
      10
    );
  const tenYearAdvantage =
    tenYearEquity - totalInitialCost - (tenYearOwningCost - tenYearRentingCost);

  let recommendation: "buy" | "rent" | "neutral";
  let reasoning: string;

  if (breakEvenYears <= 3) {
    recommendation = "buy";
    reasoning = `You could break even in just ${breakEvenYears.toFixed(1)} years. Buying is likely advantageous if you plan to stay long-term.`;
  } else if (breakEvenYears <= 5) {
    recommendation = "neutral";
    reasoning = `Break-even at ${breakEvenYears.toFixed(1)} years. Consider your timeline and job stability before deciding.`;
  } else if (breakEvenYears <= 7) {
    recommendation = "rent";
    reasoning = `At ${breakEvenYears.toFixed(1)} years to break even, renting may be better unless you're certain about staying long-term.`;
  } else {
    recommendation = "rent";
    reasoning = `With a ${breakEvenYears.toFixed(1)}+ year break-even, renting is likely more financially advantageous for now.`;
  }

  return {
    monthlyRentEquivalent: monthlyRentAlternative,
    breakEvenYears,
    fiveYearAdvantage,
    tenYearAdvantage,
    recommendation,
    reasoning,
  };
}

function analyzeFIREPath(
  inputs: RentalPropertyInputs,
  currentSavings: number,
  annualSavingsRate: number
): FIREAnalysis {
  const analysis = analyzeCashFlow(inputs);
  const monthlyNetCashFlow = analysis.monthlyCashFlow;
  const annualCashFlow = monthlyNetCashFlow * 12;

  // Properties needed for income goals
  const propertiesFor50k = annualCashFlow > 0 ? Math.ceil(50000 / annualCashFlow) : Infinity;
  const propertiesFor100k =
    annualCashFlow > 0 ? Math.ceil(100000 / annualCashFlow) : Infinity;

  // Time to first property
  const cashNeeded = analysis.totalCashInvested;
  const yearsToFirstProperty =
    currentSavings >= cashNeeded
      ? 0
      : (cashNeeded - currentSavings) / annualSavingsRate;

  // Timeline impact
  let fireTimelineImpact: string;
  if (annualCashFlow > 0 && propertiesFor50k <= 5) {
    fireTimelineImpact = `Real estate could significantly accelerate your FIRE timeline. With ${propertiesFor50k} properties generating $50K/year in passive income, you could reduce your portfolio withdrawal needs substantially.`;
  } else if (annualCashFlow > 0) {
    fireTimelineImpact = `Each property adds ${fmt(annualCashFlow)}/year to your passive income. This reduces the portfolio size needed for FIRE by approximately ${fmt(annualCashFlow / 0.04)}.`;
  } else {
    fireTimelineImpact =
      "This property has negative cash flow. Consider adjusting terms or finding a property with better cash flow for FIRE planning.";
  }

  return {
    propertiesNeededFor50k: propertiesFor50k,
    propertiesNeededFor100k: propertiesFor100k,
    timeToFirstProperty: yearsToFirstProperty,
    fireTimelineImpact,
  };
}

// ==================== Sub-Components ====================

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  tooltip,
  min = 0,
  step = 1,
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium flex items-center gap-1">
        {label}
        {tooltip && (
          <span title={tooltip}>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </span>
        )}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(
            "text-right",
            prefix && "pl-7",
            suffix && "pr-8"
          )}
          min={min}
          step={step}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = true,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", iconColor)} />
          <span className="font-semibold">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  colorClass?: string;
  bgClass?: string;
  borderClass?: string;
}

function MetricCard({
  label,
  value,
  subtext,
  colorClass = "text-gray-900 dark:text-gray-100",
  bgClass = "bg-gray-50 dark:bg-gray-900/50",
  borderClass = "border-gray-200 dark:border-gray-800",
}: MetricCardProps) {
  return (
    <div className={cn("rounded-lg p-4 border", bgClass, borderClass)}>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      )}
    </div>
  );
}

// ==================== Main Component ====================

interface RentalPropertyAnalyzerProps {
  // Integration with retirement calculator
  retirementAge?: number;
  currentAge?: number;
  annualRetirementIncome?: number;
  portfolioBalance?: number;
  onRentalIncomeChange?: (annualRentalIncome: number) => void;
}

export function RentalPropertyAnalyzer({
  retirementAge = 65,
  currentAge = 35,
  annualRetirementIncome = 80000,
  portfolioBalance = 500000,
  onRentalIncomeChange,
}: RentalPropertyAnalyzerProps) {
  const [inputs, setInputs] = useState<RentalPropertyInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState<
    "cashflow" | "returns" | "tax" | "buyvsrent" | "fire" | "integration"
  >("cashflow");
  const [rentComparison, setRentComparison] = useState(2000);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [annualSavingsRate, setAnnualSavingsRate] = useState(30000);

  // Run calculations
  const analysis = useMemo(() => analyzeCashFlow(inputs), [inputs]);
  const taxBenefits = useMemo(() => calculateTaxBenefits(inputs), [inputs]);
  const buyVsRent = useMemo(
    () => analyzeBuyVsRent(inputs, rentComparison),
    [inputs, rentComparison]
  );
  const fireAnalysis = useMemo(
    () => analyzeFIREPath(inputs, currentSavings, annualSavingsRate),
    [inputs, currentSavings, annualSavingsRate]
  );

  // Notify parent of rental income changes
  React.useEffect(() => {
    if (onRentalIncomeChange && analysis.annualCashFlow > 0) {
      onRentalIncomeChange(analysis.annualCashFlow);
    }
  }, [analysis.annualCashFlow, onRentalIncomeChange]);

  const updateInput = <K extends keyof RentalPropertyInputs>(
    key: K,
    value: RentalPropertyInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: "cashflow", label: "Cash Flow", icon: DollarSign },
    { id: "returns", label: "Returns", icon: TrendingUp },
    { id: "tax", label: "Tax Benefits", icon: Calculator },
    { id: "buyvsrent", label: "Buy vs Rent", icon: Home },
    { id: "fire", label: "FIRE Path", icon: Flame },
    { id: "integration", label: "Retirement", icon: PiggyBank },
  ] as const;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-6 w-6 text-blue-600" />
          Rental Property Analyzer
        </CardTitle>
        <CardDescription>
          Analyze rental property investments and their impact on your retirement plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <CollapsibleSection
          title="Property Details"
          icon={Home}
          iconColor="text-blue-600"
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InputField
              label="Purchase Price"
              value={inputs.purchasePrice}
              onChange={(v) => updateInput("purchasePrice", v)}
              prefix="$"
            />
            <InputField
              label="Down Payment"
              value={inputs.downPaymentPercent}
              onChange={(v) => updateInput("downPaymentPercent", v)}
              suffix="%"
              min={0}
              max={100}
            />
            <InputField
              label="Closing Costs"
              value={inputs.closingCosts}
              onChange={(v) => updateInput("closingCosts", v)}
              prefix="$"
            />
            <InputField
              label="Repair Budget"
              value={inputs.repairBudget}
              onChange={(v) => updateInput("repairBudget", v)}
              prefix="$"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InputField
              label="Monthly Rent"
              value={inputs.monthlyRent}
              onChange={(v) => updateInput("monthlyRent", v)}
              prefix="$"
            />
            <InputField
              label="Mortgage Rate"
              value={inputs.mortgageRate}
              onChange={(v) => updateInput("mortgageRate", v)}
              suffix="%"
              step={0.125}
            />
            <InputField
              label="Loan Term (Years)"
              value={inputs.mortgageTerm}
              onChange={(v) => updateInput("mortgageTerm", v)}
            />
            <InputField
              label="Property Tax Rate"
              value={inputs.propertyTaxRate}
              onChange={(v) => updateInput("propertyTaxRate", v)}
              suffix="%"
              step={0.1}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InputField
              label="Annual Insurance"
              value={inputs.insuranceAnnual}
              onChange={(v) => updateInput("insuranceAnnual", v)}
              prefix="$"
            />
            <InputField
              label="Vacancy Rate"
              value={inputs.vacancyRate}
              onChange={(v) => updateInput("vacancyRate", v)}
              suffix="%"
              tooltip="Typical range: 5-10%"
            />
            <InputField
              label="Maintenance"
              value={inputs.maintenancePercent}
              onChange={(v) => updateInput("maintenancePercent", v)}
              suffix="%"
              tooltip="% of rent for repairs/maintenance"
            />
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="text-sm">Self-Managed</Label>
              <Switch
                checked={inputs.isSelfManaged}
                onCheckedChange={(v) => updateInput("isSelfManaged", v)}
              />
            </div>
          </div>

          {!inputs.isSelfManaged && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InputField
                label="Property Management"
                value={inputs.propertyManagementRate}
                onChange={(v) => updateInput("propertyManagementRate", v)}
                suffix="%"
                tooltip="Typically 8-12% of rent"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Appreciation Rate"
              value={inputs.appreciationRate}
              onChange={(v) => updateInput("appreciationRate", v)}
              suffix="%"
              tooltip="Historical average: 3-4%"
            />
            <InputField
              label="Rent Growth Rate"
              value={inputs.rentGrowthRate}
              onChange={(v) => updateInput("rentGrowthRate", v)}
              suffix="%"
            />
            <InputField
              label="Holding Period (Years)"
              value={inputs.holdingPeriod}
              onChange={(v) => updateInput("holdingPeriod", v)}
            />
          </div>
        </CollapsibleSection>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Cash Flow Tab */}
        {activeTab === "cashflow" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Monthly Cash Flow"
                value={`$${analysis.monthlyCashFlow.toFixed(0)}`}
                subtext="After all expenses"
                colorClass={
                  analysis.monthlyCashFlow >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
                bgClass={
                  analysis.monthlyCashFlow >= 0
                    ? "bg-green-50 dark:bg-green-950/30"
                    : "bg-red-50 dark:bg-red-950/30"
                }
                borderClass={
                  analysis.monthlyCashFlow >= 0
                    ? "border-green-200 dark:border-green-900"
                    : "border-red-200 dark:border-red-900"
                }
              />
              <MetricCard
                label="Annual Cash Flow"
                value={fmt(analysis.annualCashFlow)}
                subtext={`$${(analysis.annualCashFlow / 12).toFixed(0)}/mo`}
              />
              <MetricCard
                label="Cash Invested"
                value={fmt(analysis.totalCashInvested)}
                subtext="Down + closing + repairs"
              />
              <MetricCard
                label="Annual NOI"
                value={fmt(analysis.annualNOI)}
                subtext="Before mortgage"
              />
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Monthly Breakdown
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Gross Rent</span>
                  <span className="font-medium">
                    +${analysis.grossMonthlyIncome.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Vacancy ({inputs.vacancyRate}%)</span>
                  <span>
                    -$
                    {(
                      analysis.grossMonthlyIncome - analysis.effectiveGrossIncome
                    ).toFixed(0)}
                  </span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between text-sm">
                  <span>Effective Gross Income</span>
                  <span className="font-medium">
                    ${analysis.effectiveGrossIncome.toFixed(0)}
                  </span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between text-sm text-red-600">
                  <span>Mortgage (P&I)</span>
                  <span>-${analysis.monthlyMortgage.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Property Tax</span>
                  <span>-${analysis.monthlyPropertyTax.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Insurance</span>
                  <span>-${analysis.monthlyInsurance.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Maintenance ({inputs.maintenancePercent}%)</span>
                  <span>-${analysis.monthlyMaintenance.toFixed(0)}</span>
                </div>
                {!inputs.isSelfManaged && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Property Management</span>
                    <span>-${analysis.monthlyManagement.toFixed(0)}</span>
                  </div>
                )}
                {inputs.hoaMonthly > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>HOA</span>
                    <span>-${analysis.monthlyHOA.toFixed(0)}</span>
                  </div>
                )}
                <div className="border-t my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Net Monthly Cash Flow</span>
                  <span
                    className={
                      analysis.monthlyCashFlow >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    ${analysis.monthlyCashFlow.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Flow Assessment */}
            <div
              className={cn(
                "rounded-lg p-4 border",
                analysis.monthlyCashFlow >= 200
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : analysis.monthlyCashFlow >= 0
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              )}
            >
              <div className="flex items-start gap-3">
                {analysis.monthlyCashFlow >= 200 ? (
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle
                    className={cn(
                      "h-5 w-5 mt-0.5",
                      analysis.monthlyCashFlow >= 0
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  />
                )}
                <div>
                  <div className="font-semibold mb-1">
                    {analysis.monthlyCashFlow >= 200
                      ? "Strong Cash Flow"
                      : analysis.monthlyCashFlow >= 0
                      ? "Marginal Cash Flow"
                      : "Negative Cash Flow"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.monthlyCashFlow >= 200
                      ? "This property has solid positive cash flow with room for unexpected expenses."
                      : analysis.monthlyCashFlow >= 0
                      ? "Positive but thin margins. Unexpected repairs could turn this negative. Consider negotiating a lower price."
                      : "This property loses money monthly. Not suitable for passive income unless you expect significant appreciation."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === "returns" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Cap Rate"
                value={`${analysis.capRate.toFixed(1)}%`}
                subtext="NOI / Purchase Price"
                colorClass={
                  analysis.capRate >= 8
                    ? "text-green-600 dark:text-green-400"
                    : analysis.capRate >= 5
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }
              />
              <MetricCard
                label="Cash-on-Cash"
                value={`${analysis.cashOnCashReturn.toFixed(1)}%`}
                subtext="Annual CF / Cash Invested"
                colorClass={
                  analysis.cashOnCashReturn >= 10
                    ? "text-green-600 dark:text-green-400"
                    : analysis.cashOnCashReturn >= 5
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }
              />
              <MetricCard
                label="Total ROI"
                value={fmt(analysis.totalReturn)}
                subtext={`Over ${inputs.holdingPeriod} years`}
              />
              <MetricCard
                label="Annualized Return"
                value={`${analysis.annualizedReturn.toFixed(1)}%`}
                subtext="IRR approximation"
              />
            </div>

            {/* Return Components */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Return Components ({inputs.holdingPeriod} Years)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Appreciation
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {fmt(analysis.totalAppreciation)}
                  </div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Equity Buildup
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {fmt(analysis.totalEquityBuildup)}
                  </div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Cash Flow
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {fmt(analysis.totalCashFlow)}
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Year Projection */}
            {analysis.yearOneToFive.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Year</th>
                      <th className="text-right py-2 px-3">Property Value</th>
                      <th className="text-right py-2 px-3">Monthly Rent</th>
                      <th className="text-right py-2 px-3">Annual Cash Flow</th>
                      <th className="text-right py-2 px-3">Total Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.yearOneToFive.map((year) => (
                      <tr key={year.year} className="border-b">
                        <td className="py-2 px-3 font-medium">{year.year}</td>
                        <td className="text-right py-2 px-3">
                          {fmt(year.propertyValue)}
                        </td>
                        <td className="text-right py-2 px-3">
                          ${year.monthlyRent.toFixed(0)}
                        </td>
                        <td
                          className={cn(
                            "text-right py-2 px-3",
                            year.annualCashFlow >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {fmt(year.annualCashFlow)}
                        </td>
                        <td className="text-right py-2 px-3">
                          {fmt(year.equity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cap Rate & CoC Explanation */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Understanding the Numbers
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>
                  <strong>Cap Rate:</strong> Net Operating Income / Property
                  Price. A 6-8% cap rate is typical for residential rentals.
                  Higher is better for cash flow.
                </li>
                <li>
                  <strong>Cash-on-Cash Return:</strong> Your actual cash return
                  on the money you invested. Target 8-12%+ for good returns.
                </li>
                <li>
                  <strong>The 1% Rule:</strong> Monthly rent should be at least
                  1% of purchase price. This property:{" "}
                  {((inputs.monthlyRent / inputs.purchasePrice) * 100).toFixed(
                    2
                  )}
                  %
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tax Benefits Tab */}
        {activeTab === "tax" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Annual Depreciation"
                value={fmt(taxBenefits.annualDepreciation)}
                subtext={`Over ${taxBenefits.depreciationScheduleYears} years`}
                bgClass="bg-purple-50 dark:bg-purple-950/30"
                borderClass="border-purple-200 dark:border-purple-900"
              />
              <MetricCard
                label="Year 1 Interest"
                value={fmt(taxBenefits.yearOneMortgageInterest)}
                subtext="Deductible expense"
                bgClass="bg-blue-50 dark:bg-blue-950/30"
                borderClass="border-blue-200 dark:border-blue-900"
              />
              <MetricCard
                label="Est. Tax Savings"
                value={fmt(taxBenefits.taxSavingsEstimate)}
                subtext="At 24% bracket"
                bgClass="bg-green-50 dark:bg-green-950/30"
                borderClass="border-green-200 dark:border-green-900"
              />
            </div>

            {/* Depreciation Explanation */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Depreciation: Your Silent Tax Shield
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                    The IRS allows you to deduct the "wearing out" of your
                    rental property over 27.5 years - even though real estate
                    usually appreciates! This "paper loss" reduces your taxable
                    rental income.
                  </p>
                  <div className="text-sm">
                    <strong>Your property:</strong>
                    <br />
                    Building value (80%): {fmt(inputs.purchasePrice * 0.8)}
                    <br />
                    Annual depreciation:{" "}
                    {fmt(taxBenefits.annualDepreciation)}/year for 27.5 years
                  </div>
                </div>
              </div>
            </div>

            {/* 1031 Exchange */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    1031 Exchange: Defer Taxes Forever
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    When you sell, you can defer ALL capital gains taxes by
                    exchanging into another "like-kind" property within 180
                    days. Many investors use this to:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                    <li>Trade up to larger properties</li>
                    <li>Consolidate multiple properties into one</li>
                    <li>
                      Move from active management to passive (e.g., NNN lease)
                    </li>
                    <li>
                      Defer taxes until death (step-up basis eliminates gains)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Tax Advice Disclaimer
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    These calculations are estimates for educational purposes.
                    Real estate taxation is complex and depends on your
                    individual situation, passive activity rules, and current
                    tax law. Consult a CPA or tax attorney before making
                    decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buy vs Rent Tab */}
        {activeTab === "buyvsrent" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Label>Compare to renting at:</Label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={rentComparison}
                  onChange={(e) =>
                    setRentComparison(parseFloat(e.target.value) || 0)
                  }
                  className="pl-7"
                />
              </div>
              <span className="text-muted-foreground">/month</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Break-Even"
                value={`${buyVsRent.breakEvenYears.toFixed(1)} years`}
                subtext="Time to recover upfront costs"
              />
              <MetricCard
                label="5-Year Advantage"
                value={fmt(buyVsRent.fiveYearAdvantage)}
                subtext={
                  buyVsRent.fiveYearAdvantage > 0 ? "Buying wins" : "Renting wins"
                }
                colorClass={
                  buyVsRent.fiveYearAdvantage > 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              />
              <MetricCard
                label="10-Year Advantage"
                value={fmt(buyVsRent.tenYearAdvantage)}
                subtext={
                  buyVsRent.tenYearAdvantage > 0 ? "Buying wins" : "Renting wins"
                }
                colorClass={
                  buyVsRent.tenYearAdvantage > 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              />
            </div>

            {/* Recommendation */}
            <div
              className={cn(
                "rounded-lg p-4 border",
                buyVsRent.recommendation === "buy"
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : buyVsRent.recommendation === "rent"
                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                  : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
              )}
            >
              <div className="flex items-start gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-0.5",
                    buyVsRent.recommendation === "buy"
                      ? "bg-green-100 text-green-700 border-green-300"
                      : buyVsRent.recommendation === "rent"
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  )}
                >
                  {buyVsRent.recommendation === "buy"
                    ? "Consider Buying"
                    : buyVsRent.recommendation === "rent"
                    ? "Consider Renting"
                    : "Toss-Up"}
                </Badge>
                <div>
                  <p className="text-sm">{buyVsRent.reasoning}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Key Considerations</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Job stability and likelihood of relocation in next 5 years
                </li>
                <li>
                  Local market trends and rental price appreciation
                </li>
                <li>
                  Opportunity cost of down payment (could invest in index funds)
                </li>
                <li>
                  Value of flexibility vs. building equity
                </li>
                <li>
                  Maintenance responsibility and time commitment
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* FIRE Path Tab */}
        {activeTab === "fire" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Current Savings for Real Estate"
                value={currentSavings}
                onChange={setCurrentSavings}
                prefix="$"
              />
              <InputField
                label="Annual Savings Rate"
                value={annualSavingsRate}
                onChange={setAnnualSavingsRate}
                prefix="$"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Properties for $50K/yr"
                value={
                  fireAnalysis.propertiesNeededFor50k === Infinity
                    ? "N/A"
                    : fireAnalysis.propertiesNeededFor50k.toString()
                }
                subtext="Passive rental income"
                bgClass="bg-orange-50 dark:bg-orange-950/30"
                borderClass="border-orange-200 dark:border-orange-900"
              />
              <MetricCard
                label="Properties for $100K/yr"
                value={
                  fireAnalysis.propertiesNeededFor100k === Infinity
                    ? "N/A"
                    : fireAnalysis.propertiesNeededFor100k.toString()
                }
                subtext="Comfortable FIRE"
                bgClass="bg-red-50 dark:bg-red-950/30"
                borderClass="border-red-200 dark:border-red-900"
              />
              <MetricCard
                label="Time to First Property"
                value={
                  fireAnalysis.timeToFirstProperty <= 0
                    ? "Ready!"
                    : `${fireAnalysis.timeToFirstProperty.toFixed(1)} years`
                }
                subtext={`Need ${fmt(analysis.totalCashInvested)}`}
              />
              <MetricCard
                label="Per Property Income"
                value={fmt(analysis.annualCashFlow)}
                subtext="Annual cash flow"
              />
            </div>

            {/* FIRE Impact */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Flame className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    FIRE Timeline Impact
                  </div>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    {fireAnalysis.fireTimelineImpact}
                  </p>
                </div>
              </div>
            </div>

            {/* Real Estate FIRE Strategy */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Real Estate FIRE Strategies
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">House Hacking</div>
                  <p className="text-muted-foreground">
                    Buy a multi-family, live in one unit, rent the others. Often
                    allows you to live for free while building equity.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">BRRRR Method</div>
                  <p className="text-muted-foreground">
                    Buy, Rehab, Rent, Refinance, Repeat. Recycle your capital
                    to acquire properties faster.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Syndications</div>
                  <p className="text-muted-foreground">
                    Invest passively in larger deals. Requires accreditation
                    but offers true passive income.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Short-Term Rentals</div>
                  <p className="text-muted-foreground">
                    Higher income potential but more management. Can
                    accelerate FIRE timeline in right markets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retirement Integration Tab */}
        {activeTab === "integration" && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Rental Income in Retirement
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Rental income provides a unique retirement income stream
                    that can reduce your reliance on portfolio withdrawals.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                label="Annual Rental Income"
                value={fmt(analysis.annualCashFlow)}
                subtext="Net cash flow projection"
                bgClass="bg-green-50 dark:bg-green-950/30"
                borderClass="border-green-200 dark:border-green-900"
              />
              <MetricCard
                label="Portfolio Reduction"
                value={fmt(analysis.annualCashFlow / 0.04)}
                subtext="Equivalent 4% rule portfolio"
                bgClass="bg-purple-50 dark:bg-purple-950/30"
                borderClass="border-purple-200 dark:border-purple-900"
              />
            </div>

            {/* Retirement Income Mix */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-blue-600" />
                Retirement Income Mix Example
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Target Annual Income</span>
                  <span className="font-semibold">
                    {fmt(annualRetirementIncome)}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${Math.min(
                        ((annualRetirementIncome * 0.4) / annualRetirementIncome) *
                          100,
                        40
                      )}%`,
                    }}
                  />
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${Math.min(
                        (analysis.annualCashFlow / annualRetirementIncome) * 100,
                        60
                      )}%`,
                    }}
                  />
                  <div className="bg-purple-500 h-full flex-1" />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span>Social Security (~40%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Rental Income ({fmt(analysis.annualCashFlow)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded" />
                    <span>Portfolio Withdrawals</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-green-600 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Advantages
                </h5>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Inflation hedge (rents rise with inflation)</li>
                  <li>Tangible asset with intrinsic value</li>
                  <li>Tax advantages through depreciation</li>
                  <li>Can be passed to heirs with step-up basis</li>
                  <li>Diversification from stock market</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Considerations
                </h5>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Not as liquid as stocks/bonds</li>
                  <li>Requires management (or costs to outsource)</li>
                  <li>Concentrated risk in single asset</li>
                  <li>Major repairs can disrupt cash flow</li>
                  <li>Vacancy risk during tenant turnover</li>
                </ul>
              </div>
            </div>

            {/* Action CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Plan Your Timeline</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    At {currentAge} years old with {retirementAge - currentAge}{" "}
                    years to retirement, you have time to build a rental
                    portfolio. Consider:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>
                      Paying off mortgages before retirement for maximum cash
                      flow
                    </li>
                    <li>
                      Starting with one property and scaling based on experience
                    </li>
                    <li>
                      Building relationships with property managers for
                      hands-off retirement
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RentalPropertyAnalyzer;

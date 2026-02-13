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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { NumericInput } from "@/components/form/NumericInput";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { cn, fmt, fmtPctRaw } from "@/lib/utils";
import { TYPOGRAPHY, METRIC_COLORS } from "@/lib/designTokens";
import {
  Car,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Fuel,
  Shield,
  Wrench,
  ParkingCircle,
  FileText,
  Calculator,
  Scale,
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Target,
  PiggyBank,
  Clock,
  BarChart3,
} from "lucide-react";

// ==================== TYPES ====================

interface CarOwnershipCosts {
  purchasePrice: number;
  downPayment: number;
  loanTerm: number; // months
  interestRate: number;
  annualInsurance: number;
  monthlyFuel: number;
  annualMaintenance: number;
  annualRegistration: number;
  monthlyParking: number;
}

interface LeaseTerms {
  monthlyPayment: number;
  leaseTerm: number; // months
  downPayment: number;
  annualMileageLimit: number;
  excessMileageRate: number;
}

interface EVComparison {
  gasPrice: number;
  mpg: number;
  electricityRate: number;
  milesPerKwh: number;
  annualMiles: number;
}

type AcquisitionMethod = "buy-new" | "buy-used" | "lease";

// ==================== CONSTANTS ====================

const DEFAULT_EXPECTED_RETURN = 7.0; // Annual return if invested
const YEARS_TO_PROJECT = 20;
const DEPRECIATION_YEAR_1 = 0.20; // New car loses 20% year 1
const DEPRECIATION_YEAR_2_3 = 0.15; // 15% per year for years 2-3
const DEPRECIATION_YEAR_4_PLUS = 0.08; // 8% per year after that

const AFFORDABILITY_RULE = {
  downPaymentPct: 20, // 20% down
  maxLoanTermMonths: 48, // 4 years max
  maxIncomePercent: 10, // <10% of gross monthly income
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate monthly car payment
 */
function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (termMonths === 0) return 0;
  if (annualRate === 0) return principal / termMonths;

  const monthlyRate = annualRate / 100 / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

/**
 * Calculate car depreciation over years
 */
function calculateDepreciation(
  purchasePrice: number,
  yearsOld: number,
  yearsToProject: number
): number[] {
  const values: number[] = [];
  let currentValue = purchasePrice;

  for (let year = 0; year <= yearsToProject; year++) {
    values.push(currentValue);

    const totalAge = yearsOld + year;
    let depreciationRate: number;

    if (totalAge === 0) {
      depreciationRate = DEPRECIATION_YEAR_1;
    } else if (totalAge <= 2) {
      depreciationRate = DEPRECIATION_YEAR_2_3;
    } else {
      depreciationRate = DEPRECIATION_YEAR_4_PLUS;
    }

    currentValue = currentValue * (1 - depreciationRate);
  }

  return values;
}

/**
 * Calculate total cost of ownership over time
 */
function calculateTotalCostOfOwnership(
  costs: CarOwnershipCosts,
  years: number,
  isUsed: boolean = false,
  usedCarAge: number = 3
): {
  totalCost: number;
  monthlyAverage: number;
  breakdown: {
    depreciation: number;
    financing: number;
    insurance: number;
    fuel: number;
    maintenance: number;
    registration: number;
    parking: number;
  };
} {
  const loanAmount = costs.purchasePrice - costs.downPayment;
  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    costs.interestRate,
    costs.loanTerm
  );

  const totalMonths = years * 12;
  const loanMonths = Math.min(costs.loanTerm, totalMonths);

  // Calculate depreciation
  const depreciationCurve = calculateDepreciation(
    costs.purchasePrice,
    isUsed ? usedCarAge : 0,
    years
  );
  const depreciation = costs.purchasePrice - depreciationCurve[years];

  // Calculate financing costs (interest paid)
  const totalLoanPayments = monthlyPayment * loanMonths;
  const financingCost = totalLoanPayments - loanAmount;

  // Operating costs over the period
  const insurance = costs.annualInsurance * years;
  const fuel = costs.monthlyFuel * totalMonths;
  const maintenance = costs.annualMaintenance * years;
  const registration = costs.annualRegistration * years;
  const parking = costs.monthlyParking * totalMonths;

  const totalCost = depreciation + financingCost + insurance + fuel + maintenance + registration + parking;

  return {
    totalCost,
    monthlyAverage: totalCost / totalMonths,
    breakdown: {
      depreciation,
      financing: financingCost,
      insurance,
      fuel,
      maintenance,
      registration,
      parking,
    },
  };
}

/**
 * Calculate lease total cost
 */
function calculateLeaseCost(
  lease: LeaseTerms,
  annualInsurance: number,
  monthlyFuel: number,
  annualMaintenance: number,
  years: number
): number {
  const months = years * 12;
  const leasePayments = lease.monthlyPayment * Math.min(lease.leaseTerm, months);
  const insurance = annualInsurance * years;
  const fuel = monthlyFuel * months;
  const maintenance = annualMaintenance * years * 0.3; // Less maintenance on leased cars

  return lease.downPayment + leasePayments + insurance + fuel + maintenance;
}

/**
 * Calculate opportunity cost of car spending
 */
function calculateOpportunityCost(
  monthlyAmount: number,
  years: number,
  annualReturn: number
): number {
  const monthlyReturn = annualReturn / 100 / 12;
  const months = years * 12;

  // Future value of monthly investments
  let total = 0;
  for (let month = 0; month < months; month++) {
    const periodsRemaining = months - month;
    total += monthlyAmount * Math.pow(1 + monthlyReturn, periodsRemaining);
  }

  return total;
}

/**
 * Calculate max affordable car price based on 20/4/10 rule
 */
function calculateAffordablePrice(grossMonthlyIncome: number): {
  maxPrice: number;
  maxMonthlyPayment: number;
  recommendedDown: number;
} {
  const maxMonthlyPayment = grossMonthlyIncome * (AFFORDABILITY_RULE.maxIncomePercent / 100);
  const maxLoanAmount =
    (maxMonthlyPayment *
      (Math.pow(1 + 0.06 / 12, AFFORDABILITY_RULE.maxLoanTermMonths) - 1)) /
    ((0.06 / 12) * Math.pow(1 + 0.06 / 12, AFFORDABILITY_RULE.maxLoanTermMonths));

  const maxPrice = maxLoanAmount / (1 - AFFORDABILITY_RULE.downPaymentPct / 100);
  const recommendedDown = maxPrice * (AFFORDABILITY_RULE.downPaymentPct / 100);

  return {
    maxPrice,
    maxMonthlyPayment,
    recommendedDown,
  };
}

/**
 * Calculate EV vs Gas total fuel cost
 */
function calculateEvVsGas(
  comparison: EVComparison,
  years: number
): { gasCost: number; evCost: number; savings: number } {
  const totalMiles = comparison.annualMiles * years;

  const gasCost = (totalMiles / comparison.mpg) * comparison.gasPrice;
  const evCost = (totalMiles / comparison.milesPerKwh) * comparison.electricityRate;

  return {
    gasCost,
    evCost,
    savings: gasCost - evCost,
  };
}

// ==================== COMPONENT ====================

export default function AutoExpenseAnalyzer() {
  // ========== STATE ==========

  // Acquisition method
  const [acquisitionMethod, setAcquisitionMethod] = useState<AcquisitionMethod>("buy-new");
  const [usedCarAge, setUsedCarAge] = useState(3);

  // Ownership costs
  const [costs, setCosts] = useState<CarOwnershipCosts>({
    purchasePrice: 35000,
    downPayment: 7000,
    loanTerm: 60,
    interestRate: 6.5,
    annualInsurance: 1800,
    monthlyFuel: 200,
    annualMaintenance: 800,
    annualRegistration: 300,
    monthlyParking: 0,
  });

  // Lease terms
  const [leaseTerms, setLeaseTerms] = useState<LeaseTerms>({
    monthlyPayment: 450,
    leaseTerm: 36,
    downPayment: 2000,
    annualMileageLimit: 12000,
    excessMileageRate: 0.25,
  });

  // Affordability
  const [grossMonthlyIncome, setGrossMonthlyIncome] = useState(7500);

  // Comparison inputs
  const [evComparison, setEvComparison] = useState<EVComparison>({
    gasPrice: 3.50,
    mpg: 28,
    electricityRate: 0.12,
    milesPerKwh: 4,
    annualMiles: 12000,
  });

  // Current car (for downsizing)
  const [currentCarPayment, setCurrentCarPayment] = useState(600);
  const [cheaperCarPayment, setCheaperCarPayment] = useState(300);

  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["true-cost", "affordability"])
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ========== CALCULATIONS ==========

  const totalOwnershipCost = useMemo(
    () =>
      calculateTotalCostOfOwnership(
        costs,
        5,
        acquisitionMethod === "buy-used",
        usedCarAge
      ),
    [costs, acquisitionMethod, usedCarAge]
  );

  const monthlyPayment = useMemo(() => {
    const loanAmount = costs.purchasePrice - costs.downPayment;
    return calculateMonthlyPayment(loanAmount, costs.interestRate, costs.loanTerm);
  }, [costs.purchasePrice, costs.downPayment, costs.interestRate, costs.loanTerm]);

  const totalMonthlyCarCost = useMemo(() => {
    return totalOwnershipCost.monthlyAverage;
  }, [totalOwnershipCost]);

  const affordability = useMemo(
    () => calculateAffordablePrice(grossMonthlyIncome),
    [grossMonthlyIncome]
  );

  const isOverBudget = useMemo(() => {
    return monthlyPayment > affordability.maxMonthlyPayment;
  }, [monthlyPayment, affordability.maxMonthlyPayment]);

  // Buy vs Lease comparison
  const buyVsLease = useMemo(() => {
    const buyTotal = calculateTotalCostOfOwnership(
      costs,
      3,
      acquisitionMethod === "buy-used",
      usedCarAge
    ).totalCost;

    const leaseTotal = calculateLeaseCost(
      leaseTerms,
      costs.annualInsurance,
      costs.monthlyFuel,
      costs.annualMaintenance,
      3
    );

    // For buying, subtract residual value
    const depreciationCurve = calculateDepreciation(
      costs.purchasePrice,
      acquisitionMethod === "buy-used" ? usedCarAge : 0,
      3
    );
    const residualValue = depreciationCurve[3];
    const netBuyCost = buyTotal - residualValue;

    return {
      buyCost: buyTotal,
      leaseCost: leaseTotal,
      netBuyCost,
      winner: netBuyCost < leaseTotal ? "buy" : "lease",
      difference: Math.abs(netBuyCost - leaseTotal),
    };
  }, [costs, leaseTerms, acquisitionMethod, usedCarAge]);

  // New vs Used comparison
  const newVsUsed = useMemo(() => {
    const newCarCost = calculateTotalCostOfOwnership(costs, 5, false, 0);

    // 3-year-old car is typically 40-50% cheaper
    const usedPrice = costs.purchasePrice * 0.55;
    const usedCosts: CarOwnershipCosts = {
      ...costs,
      purchasePrice: usedPrice,
      downPayment: usedPrice * 0.2,
      annualMaintenance: costs.annualMaintenance * 1.3, // Higher maintenance
    };
    const usedCarCost = calculateTotalCostOfOwnership(usedCosts, 5, true, 3);

    return {
      newTotalCost: newCarCost.totalCost,
      usedTotalCost: usedCarCost.totalCost,
      savings: newCarCost.totalCost - usedCarCost.totalCost,
      usedPrice,
    };
  }, [costs]);

  // Opportunity cost
  const opportunityCost = useMemo(() => {
    return calculateOpportunityCost(monthlyPayment, YEARS_TO_PROJECT, DEFAULT_EXPECTED_RETURN);
  }, [monthlyPayment]);

  // Downsizing impact
  const downsizingImpact = useMemo(() => {
    const monthlySavings = currentCarPayment - cheaperCarPayment;
    const tenYearInvested = calculateOpportunityCost(
      monthlySavings,
      10,
      DEFAULT_EXPECTED_RETURN
    );
    return {
      monthlySavings,
      annualSavings: monthlySavings * 12,
      tenYearInvested,
    };
  }, [currentCarPayment, cheaperCarPayment]);

  // EV vs Gas
  const evVsGasResult = useMemo(
    () => calculateEvVsGas(evComparison, 10),
    [evComparison]
  );

  // ========== HANDLERS ==========

  const updateCost = useCallback(
    <K extends keyof CarOwnershipCosts>(key: K, value: CarOwnershipCosts[K]) => {
      setCosts((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateLease = useCallback(
    <K extends keyof LeaseTerms>(key: K, value: LeaseTerms[K]) => {
      setLeaseTerms((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateEv = useCallback(
    <K extends keyof EVComparison>(key: K, value: EVComparison[K]) => {
      setEvComparison((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // ========== RENDER HELPERS ==========

  const SectionHeader = ({
    id,
    icon,
    title,
    subtitle,
    badge,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    badge?: { text: string; variant: "default" | "destructive" | "secondary" };
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div className="text-left">
          <h3 className={TYPOGRAPHY.sectionHeader}>{title}</h3>
          {subtitle && <p className={TYPOGRAPHY.bodyMuted}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        {expandedSections.has(id) ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </button>
  );

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Car className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Auto Expense Analyzer</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your car is the #2 wealth killer after housing. Understand the true cost
          of car ownership and optimize ruthlessly.
        </p>
      </div>

      {/* Key Insight Alert */}
      <Alert className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-lg text-amber-700 dark:text-amber-300">
          Cars Are Wealth Destroyers
        </AlertTitle>
        <AlertDescription className="mt-2 text-amber-700/80 dark:text-amber-300/80">
          <p>
            The average American spends <strong>$12,000+ per year</strong> on car
            ownership. Over 20 years, that same money invested could grow to{" "}
            <strong>$500K+</strong>. Every dollar you save on transportation is a
            dollar building your wealth.
          </p>
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Section 1: True Cost of Ownership */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="true-cost"
            icon={<Calculator className="h-5 w-5" />}
            title="1. True Cost of Car Ownership"
            subtitle="All the costs most people forget"
          />
          {expandedSections.has("true-cost") && (
            <CardContent className="pt-0 space-y-6">
              {/* Input Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="purchase-price">Purchase Price</Label>
                  <NumericInput
                    id="purchase-price"
                    value={costs.purchasePrice}
                    onChange={(v) => updateCost("purchasePrice", v)}
                    prefix="$"
                    min={0}
                    aria-label="Purchase price"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="down-payment">Down Payment</Label>
                  <NumericInput
                    id="down-payment"
                    value={costs.downPayment}
                    onChange={(v) => updateCost("downPayment", v)}
                    prefix="$"
                    min={0}
                    aria-label="Down payment"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="loan-term">Loan Term (months)</Label>
                  <NumericInput
                    id="loan-term"
                    value={costs.loanTerm}
                    onChange={(v) => updateCost("loanTerm", v)}
                    min={12}
                    max={84}
                    aria-label="Loan term in months"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="interest-rate">Interest Rate</Label>
                  <NumericInput
                    id="interest-rate"
                    value={costs.interestRate}
                    onChange={(v) => updateCost("interestRate", v)}
                    suffix="%"
                    min={0}
                    max={30}
                    decimalPlaces={1}
                    aria-label="Interest rate"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="insurance">Annual Insurance</Label>
                  <NumericInput
                    id="insurance"
                    value={costs.annualInsurance}
                    onChange={(v) => updateCost("annualInsurance", v)}
                    prefix="$"
                    min={0}
                    aria-label="Annual insurance"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fuel">Monthly Fuel</Label>
                  <NumericInput
                    id="fuel"
                    value={costs.monthlyFuel}
                    onChange={(v) => updateCost("monthlyFuel", v)}
                    prefix="$"
                    min={0}
                    aria-label="Monthly fuel"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maintenance">Annual Maintenance</Label>
                  <NumericInput
                    id="maintenance"
                    value={costs.annualMaintenance}
                    onChange={(v) => updateCost("annualMaintenance", v)}
                    prefix="$"
                    min={0}
                    aria-label="Annual maintenance"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="registration">Annual Registration/Taxes</Label>
                  <NumericInput
                    id="registration"
                    value={costs.annualRegistration}
                    onChange={(v) => updateCost("annualRegistration", v)}
                    prefix="$"
                    min={0}
                    aria-label="Annual registration"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parking">Monthly Parking</Label>
                  <NumericInput
                    id="parking"
                    value={costs.monthlyParking}
                    onChange={(v) => updateCost("monthlyParking", v)}
                    prefix="$"
                    min={0}
                    aria-label="Monthly parking"
                  />
                </div>
              </div>

              {/* Cost Breakdown Visual */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly Total */}
                <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="text-center">
                    <p className={TYPOGRAPHY.metricLabel}>Total Monthly Cost</p>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {fmt(totalMonthlyCarCost)}
                    </p>
                    <p className={TYPOGRAPHY.helperText}>
                      Including depreciation, financing, and all operating costs
                    </p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                  <p className={TYPOGRAPHY.subSectionHeader}>5-Year Cost Breakdown</p>

                  <CostBreakdownBar
                    label="Depreciation"
                    icon={<TrendingDown className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.depreciation}
                    total={totalOwnershipCost.totalCost}
                    color="bg-red-500"
                  />
                  <CostBreakdownBar
                    label="Financing (Interest)"
                    icon={<DollarSign className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.financing}
                    total={totalOwnershipCost.totalCost}
                    color="bg-orange-500"
                  />
                  <CostBreakdownBar
                    label="Insurance"
                    icon={<Shield className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.insurance}
                    total={totalOwnershipCost.totalCost}
                    color="bg-yellow-500"
                  />
                  <CostBreakdownBar
                    label="Fuel"
                    icon={<Fuel className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.fuel}
                    total={totalOwnershipCost.totalCost}
                    color="bg-green-500"
                  />
                  <CostBreakdownBar
                    label="Maintenance"
                    icon={<Wrench className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.maintenance}
                    total={totalOwnershipCost.totalCost}
                    color="bg-blue-500"
                  />
                  <CostBreakdownBar
                    label="Registration/Taxes"
                    icon={<FileText className="h-4 w-4" />}
                    amount={totalOwnershipCost.breakdown.registration}
                    total={totalOwnershipCost.totalCost}
                    color="bg-purple-500"
                  />
                  {totalOwnershipCost.breakdown.parking > 0 && (
                    <CostBreakdownBar
                      label="Parking"
                      icon={<ParkingCircle className="h-4 w-4" />}
                      amount={totalOwnershipCost.breakdown.parking}
                      total={totalOwnershipCost.totalCost}
                      color="bg-pink-500"
                    />
                  )}

                  <div className="pt-2 border-t flex justify-between font-semibold">
                    <span>5-Year Total</span>
                    <span className="text-red-600">{fmt(totalOwnershipCost.totalCost)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section 2: Buy vs Lease */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="buy-vs-lease"
            icon={<Scale className="h-5 w-5" />}
            title="2. Buy vs Lease Calculator"
            subtitle="Which option costs less over 3 years?"
            badge={{
              text: buyVsLease.winner === "buy" ? "Buying Wins" : "Leasing Wins",
              variant: buyVsLease.winner === "buy" ? "default" : "secondary",
            }}
          />
          {expandedSections.has("buy-vs-lease") && (
            <CardContent className="pt-0 space-y-6">
              {/* Lease Inputs */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className={TYPOGRAPHY.subSectionHeader}>Lease Terms</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Monthly Lease Payment</Label>
                    <NumericInput
                      value={leaseTerms.monthlyPayment}
                      onChange={(v) => updateLease("monthlyPayment", v)}
                      prefix="$"
                      min={0}
                      aria-label="Monthly lease payment"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Lease Term (months)</Label>
                    <NumericInput
                      value={leaseTerms.leaseTerm}
                      onChange={(v) => updateLease("leaseTerm", v)}
                      min={24}
                      max={48}
                      aria-label="Lease term"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Due at Signing</Label>
                    <NumericInput
                      value={leaseTerms.downPayment}
                      onChange={(v) => updateLease("downPayment", v)}
                      prefix="$"
                      min={0}
                      aria-label="Due at signing"
                    />
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Buy Column */}
                <div
                  className={cn(
                    "p-6 rounded-xl border-2",
                    buyVsLease.winner === "buy"
                      ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                      : "border-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Buy
                    </h4>
                    {buyVsLease.winner === "buy" && (
                      <Badge className="bg-green-500">Better Option</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>3-Year Total Cost</span>
                      <span className={TYPOGRAPHY.metricSmall}>{fmt(buyVsLease.buyCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>Minus Residual Value</span>
                      <span className="text-green-600">
                        -{fmt(buyVsLease.buyCost - buyVsLease.netBuyCost)}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Net Cost</span>
                      <span>{fmt(buyVsLease.netBuyCost)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      You own the car and can sell it
                    </p>
                  </div>
                </div>

                {/* Lease Column */}
                <div
                  className={cn(
                    "p-6 rounded-xl border-2",
                    buyVsLease.winner === "lease"
                      ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                      : "border-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lease
                    </h4>
                    {buyVsLease.winner === "lease" && (
                      <Badge className="bg-green-500">Better Option</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>3-Year Total Cost</span>
                      <span className={TYPOGRAPHY.metricSmall}>{fmt(buyVsLease.leaseCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>Residual Value</span>
                      <span className="text-muted-foreground">$0 (no ownership)</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Net Cost</span>
                      <span>{fmt(buyVsLease.leaseCost)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <XCircle className="h-4 w-4 inline mr-1" />
                      Lower payment but you never build equity
                    </p>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {buyVsLease.winner === "buy" ? "Buying" : "Leasing"} saves you{" "}
                      {fmt(buyVsLease.difference)} over 3 years
                    </p>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Leasing is usually more expensive long-term because you never
                      own the depreciating asset. However, leasing can make sense if
                      you need a new car every 2-3 years for business or want to
                      avoid maintenance costs.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section 3: New vs Used */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="new-vs-used"
            icon={<BarChart3 className="h-5 w-5" />}
            title="3. New vs Used"
            subtitle="The depreciation curve is brutal"
            badge={{
              text: `Save ${fmt(newVsUsed.savings)}`,
              variant: "secondary",
            }}
          />
          {expandedSections.has("new-vs-used") && (
            <CardContent className="pt-0 space-y-6">
              {/* Depreciation Curve Visualization */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className={`${TYPOGRAPHY.subSectionHeader} mb-4`}>
                  Depreciation Curve: {fmt(costs.purchasePrice)} New Car
                </h4>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5].map((year) => {
                    const values = calculateDepreciation(costs.purchasePrice, 0, 5);
                    const value = values[year];
                    const lossFromNew = costs.purchasePrice - value;
                    const pct = (value / costs.purchasePrice) * 100;

                    return (
                      <div key={year} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Year {year}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">{fmt(value)}</span>
                            {year > 0 && (
                              <span className="text-red-500 text-xs">
                                (-{fmt(lossFromNew)})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              year <= 1
                                ? "bg-red-500"
                                : year <= 3
                                ? "bg-orange-500"
                                : "bg-yellow-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparison Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-3">
                    Buy New
                  </h4>
                  <p className={TYPOGRAPHY.metricMedium}>{fmt(costs.purchasePrice)}</p>
                  <p className={TYPOGRAPHY.bodyMuted}>
                    5-Year Total Cost: {fmt(newVsUsed.newTotalCost)}
                  </p>
                  <p className="text-sm text-red-600 mt-2">
                    Loses {fmtPctRaw(DEPRECIATION_YEAR_1 * 100, 0)} the moment you drive off the lot
                  </p>
                </div>

                <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3">
                    Buy 3-Year-Old
                  </h4>
                  <p className={TYPOGRAPHY.metricMedium}>{fmt(newVsUsed.usedPrice)}</p>
                  <p className={TYPOGRAPHY.bodyMuted}>
                    5-Year Total Cost: {fmt(newVsUsed.usedTotalCost)}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    Someone else ate the depreciation!
                  </p>
                </div>
              </div>

              <Alert className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Buy 3-Year-Old, Save {fmt(newVsUsed.savings)}</AlertTitle>
                <AlertDescription>
                  Over 5 years of ownership, buying a 3-year-old car saves you{" "}
                  <strong>{fmt(newVsUsed.savings)}</strong>. Consider Certified Pre-Owned
                  (CPO) for added warranty protection.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Section 4: Affordability */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="affordability"
            icon={<Target className="h-5 w-5" />}
            title="4. How Much Car Can You Afford?"
            subtitle="The 20/4/10 rule"
            badge={
              isOverBudget
                ? { text: "Over Budget", variant: "destructive" as const }
                : { text: "Within Budget", variant: "default" as const }
            }
          />
          {expandedSections.has("affordability") && (
            <CardContent className="pt-0 space-y-6">
              {/* Income Input */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <Label>Gross Monthly Income</Label>
                    <NumericInput
                      value={grossMonthlyIncome}
                      onChange={setGrossMonthlyIncome}
                      prefix="$"
                      min={0}
                      aria-label="Gross monthly income"
                    />
                  </div>
                </div>
              </div>

              {/* 20/4/10 Rule Explanation */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-3xl font-bold text-blue-600">20%</div>
                  <p className={TYPOGRAPHY.bodyMuted}>Down Payment</p>
                  <p className="text-sm font-semibold mt-2">
                    {fmt(affordability.recommendedDown)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                  <div className="text-3xl font-bold text-purple-600">4</div>
                  <p className={TYPOGRAPHY.bodyMuted}>Years Max Loan</p>
                  <p className="text-sm font-semibold mt-2">48 months</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                  <div className="text-3xl font-bold text-green-600">&lt;10%</div>
                  <p className={TYPOGRAPHY.bodyMuted}>Of Gross Income</p>
                  <p className="text-sm font-semibold mt-2">
                    {fmt(affordability.maxMonthlyPayment)}/mo max
                  </p>
                </div>
              </div>

              {/* Your Situation */}
              <div
                className={cn(
                  "p-6 rounded-xl border-2",
                  isOverBudget
                    ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                    : "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                )}
              >
                <h4 className={`${TYPOGRAPHY.sectionHeader} mb-4`}>Your Situation</h4>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Max Affordable Price</span>
                      <span className="font-semibold">{fmt(affordability.maxPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Car Price</span>
                      <span
                        className={cn(
                          "font-semibold",
                          costs.purchasePrice > affordability.maxPrice
                            ? "text-red-600"
                            : "text-green-600"
                        )}
                      >
                        {fmt(costs.purchasePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Monthly Payment</span>
                      <span className="font-semibold">{fmt(affordability.maxMonthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Your Monthly Payment</span>
                      <span
                        className={cn(
                          "font-semibold",
                          isOverBudget ? "text-red-600" : "text-green-600"
                        )}
                      >
                        {fmt(monthlyPayment)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    {isOverBudget ? (
                      <div className="text-center">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                        <p className="font-semibold text-red-600">Too Much Car!</p>
                        <p className={TYPOGRAPHY.bodyMuted}>
                          You are {fmt(monthlyPayment - affordability.maxMonthlyPayment)}/mo
                          over budget
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                        <p className="font-semibold text-green-600">Within Budget!</p>
                        <p className={TYPOGRAPHY.bodyMuted}>
                          You have {fmt(affordability.maxMonthlyPayment - monthlyPayment)}/mo
                          headroom
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Most People Buy Too Much Car</AlertTitle>
                <AlertDescription>
                  The average new car payment is $700+/month with 72-month loans.
                  This violates both the 10% rule and the 4-year rule. Just because
                  you qualify for financing does not mean you can afford it.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Section 5: Opportunity Cost */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="opportunity-cost"
            icon={<TrendingUp className="h-5 w-5" />}
            title="5. Opportunity Cost Calculator"
            subtitle="What could that car payment become?"
          />
          {expandedSections.has("opportunity-cost") && (
            <CardContent className="pt-0 space-y-6">
              <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-900/20 rounded-xl">
                <p className={TYPOGRAPHY.bodyMuted}>
                  That <span className="font-semibold">{fmt(monthlyPayment)}/month</span>{" "}
                  car payment...
                </p>
                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 my-4">
                  {fmt(opportunityCost)}
                </p>
                <p className={TYPOGRAPHY.body}>
                  ...if invested for {YEARS_TO_PROJECT} years at {DEFAULT_EXPECTED_RETURN}% return
                </p>
              </div>

              {/* Timeline Visualization */}
              <div className="space-y-4">
                <h4 className={TYPOGRAPHY.subSectionHeader}>Wealth Building Timeline</h4>
                <div className="space-y-2">
                  {[5, 10, 15, 20].map((years) => {
                    const futureValue = calculateOpportunityCost(
                      monthlyPayment,
                      years,
                      DEFAULT_EXPECTED_RETURN
                    );
                    return (
                      <div key={years} className="flex items-center gap-4">
                        <span className="w-20 text-sm text-muted-foreground">
                          {years} years
                        </span>
                        <div className="flex-1">
                          <Progress
                            value={(futureValue / opportunityCost) * 100}
                            className="h-6"
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-green-600">
                          {fmt(futureValue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Alert className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                <PiggyBank className="h-4 w-4 text-purple-600" />
                <AlertTitle>The Wealth Gap</AlertTitle>
                <AlertDescription>
                  <p>
                    Two people both earn $75K/year. One drives a $35K car with $600/mo
                    payments. The other drives a $15K car with $250/mo payments and
                    invests the $350 difference.
                  </p>
                  <p className="mt-2 font-semibold text-purple-700 dark:text-purple-300">
                    After 20 years, the second person has{" "}
                    {fmt(calculateOpportunityCost(350, 20, DEFAULT_EXPECTED_RETURN))} more.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Section 6: Downsizing Impact */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="downsizing"
            icon={<TrendingDown className="h-5 w-5" />}
            title="6. Downsizing Impact"
            subtitle="What if you drove a cheaper car?"
          />
          {expandedSections.has("downsizing") && (
            <CardContent className="pt-0 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Current Car Payment</Label>
                    <NumericInput
                      value={currentCarPayment}
                      onChange={setCurrentCarPayment}
                      prefix="$"
                      min={0}
                      aria-label="Current car payment"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cheaper Alternative Payment</Label>
                    <NumericInput
                      value={cheaperCarPayment}
                      onChange={setCheaperCarPayment}
                      prefix="$"
                      min={0}
                      aria-label="Cheaper car payment"
                    />
                  </div>
                </div>

                <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-4">
                    Invest the Difference
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Monthly Savings</span>
                      <span className="font-semibold text-green-600">
                        {fmt(downsizingImpact.monthlySavings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Annual Savings</span>
                      <span className="font-semibold text-green-600">
                        {fmt(downsizingImpact.annualSavings)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="font-semibold">10-Year Value</span>
                        <span className="text-2xl font-bold text-green-600">
                          {fmt(downsizingImpact.tenYearInvested)}
                        </span>
                      </div>
                      <p className={TYPOGRAPHY.helperText}>
                        If invested at {DEFAULT_EXPECTED_RETURN}% annual return
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section 7: When to Sell/Trade */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="when-to-sell"
            icon={<Clock className="h-5 w-5" />}
            title="7. When to Sell or Trade"
            subtitle="Timing matters for your wallet"
          />
          {expandedSections.has("when-to-sell") && (
            <CardContent className="pt-0 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                      <Wrench className="h-5 w-5 text-red-600" />
                    </div>
                    <h4 className="font-semibold">Before Major Repairs</h4>
                  </div>
                  <p className={TYPOGRAPHY.bodyMuted}>
                    If repairs exceed 50% of the car&apos;s value, it&apos;s time to sell.
                    A $3,000 repair on a $5,000 car is a bad deal.
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold">Life Changes</h4>
                  </div>
                  <p className={TYPOGRAPHY.bodyMuted}>
                    New baby needs more space. Remote work means less driving. Sell
                    when your needs change, not just because you want something new.
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold">Drive It Forever</h4>
                  </div>
                  <p className={TYPOGRAPHY.bodyMuted}>
                    The cheapest car is the one you already own. After the loan is
                    paid off, every payment-free month is pure savings.
                  </p>
                </div>
              </div>

              <Alert className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <AlertTitle>Drive It Until The Wheels Fall Off</AlertTitle>
                <AlertDescription>
                  <p>
                    A well-maintained car can easily last 200,000+ miles. Trading in
                    every 3-5 years means you&apos;re always in the steepest part of the
                    depreciation curve.
                  </p>
                  <p className="mt-2">
                    <strong>The sweet spot:</strong> Buy a 2-3 year old car and drive
                    it for 10+ years. You skip the worst depreciation and maximize
                    your ownership value.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Section 8: EV vs Gas */}
        <Card className="overflow-hidden">
          <SectionHeader
            id="ev-vs-gas"
            icon={<Zap className="h-5 w-5" />}
            title="8. EV vs Gas Comparison"
            subtitle="Total cost of ownership showdown"
          />
          {expandedSections.has("ev-vs-gas") && (
            <CardContent className="pt-0 space-y-6">
              {/* Inputs */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gas Car */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-600" />
                    Gas Vehicle
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Gas Price ($/gal)</Label>
                      <NumericInput
                        value={evComparison.gasPrice}
                        onChange={(v) => updateEv("gasPrice", v)}
                        prefix="$"
                        min={0}
                        decimalPlaces={2}
                        aria-label="Gas price"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MPG</Label>
                      <NumericInput
                        value={evComparison.mpg}
                        onChange={(v) => updateEv("mpg", v)}
                        min={1}
                        max={100}
                        aria-label="Miles per gallon"
                      />
                    </div>
                  </div>
                </div>

                {/* EV */}
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    Electric Vehicle
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Electricity ($/kWh)</Label>
                      <NumericInput
                        value={evComparison.electricityRate}
                        onChange={(v) => updateEv("electricityRate", v)}
                        prefix="$"
                        min={0}
                        decimalPlaces={2}
                        aria-label="Electricity rate"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Miles/kWh</Label>
                      <NumericInput
                        value={evComparison.milesPerKwh}
                        onChange={(v) => updateEv("milesPerKwh", v)}
                        min={1}
                        max={10}
                        decimalPlaces={1}
                        aria-label="Miles per kWh"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Annual Miles */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <Label>Annual Miles Driven</Label>
                    <NumericInput
                      value={evComparison.annualMiles}
                      onChange={(v) => updateEv("annualMiles", v)}
                      min={0}
                      aria-label="Annual miles"
                    />
                  </div>
                </div>
              </div>

              {/* Comparison Results */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-center">
                  <p className={TYPOGRAPHY.metricLabel}>10-Year Gas Cost</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {fmt(evVsGasResult.gasCost)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                  <p className={TYPOGRAPHY.metricLabel}>10-Year EV Cost</p>
                  <p className="text-2xl font-bold text-green-600">
                    {fmt(evVsGasResult.evCost)}
                  </p>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-lg text-center",
                    evVsGasResult.savings > 0
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                  )}
                >
                  <p className={TYPOGRAPHY.metricLabel}>10-Year Savings</p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      evVsGasResult.savings > 0 ? "text-green-600" : "text-amber-600"
                    )}
                  >
                    {evVsGasResult.savings > 0 ? "+" : ""}
                    {fmt(evVsGasResult.savings)}
                  </p>
                  <p className={TYPOGRAPHY.helperText}>
                    {evVsGasResult.savings > 0 ? "EV wins on fuel" : "Gas wins on fuel"}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Consider Total Cost of Ownership</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>
                      EVs have higher upfront costs but lower fuel and maintenance
                    </li>
                    <li>
                      Battery replacement ($5K-$15K) may be needed after 8-10 years
                    </li>
                    <li>
                      Home charging infrastructure adds $500-$2,000 upfront
                    </li>
                    <li>
                      Tax credits can offset $3,750-$7,500 of EV purchase price
                    </li>
                    <li>
                      Charging infrastructure availability varies by location
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Bottom Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className={TYPOGRAPHY.sectionHeader}>The Bottom Line</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className={TYPOGRAPHY.metricLabel}>Your Monthly Car Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  {fmt(totalMonthlyCarCost)}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className={TYPOGRAPHY.metricLabel}>Annual Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  {fmt(totalMonthlyCarCost * 12)}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className={TYPOGRAPHY.metricLabel}>20-Year Opportunity Cost</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(opportunityCost)}</p>
              </div>
            </div>
            <p className={`${TYPOGRAPHY.bodyMuted} max-w-2xl mx-auto`}>
              Cars are the #2 expense after housing. Every dollar you save on
              transportation is a dollar building your wealth. Buy used, keep it
              longer, and invest the difference.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function CostBreakdownBar({
  label,
  icon,
  amount,
  total,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span className="font-mono">{fmt(amount)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Named export
export { AutoExpenseAnalyzer };

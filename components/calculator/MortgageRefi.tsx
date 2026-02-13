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
import { Progress } from "@/components/ui/progress";
import { NumericInput } from "@/components/form/NumericInput";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, fmt, fmtFull, fmtPctRaw } from "@/lib/utils";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Scale,
  Home,
  DollarSign,
  Calculator,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  Wallet,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  CreditCard,
  PiggyBank,
  Banknote,
  Calendar,
  RefreshCw,
} from "lucide-react";

// ==================== TYPES ====================

interface CurrentMortgage {
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  yearsRemaining: number;
}

interface NewMortgageOptions {
  newRate: number;
  newTerm: 15 | 20 | 30;
  closingCosts: number;
}

interface CashOutOptions {
  enabled: boolean;
  amount: number;
  debtRate: number; // Rate of debt being consolidated
}

interface PointsOptions {
  enabled: boolean;
  pointsCost: number; // Cost of points (typically 1% of loan = 1 point)
  rateReduction: number; // Rate reduction from points (typically 0.25% per point)
}

interface ExtraPaymentOptions {
  enabled: boolean;
  monthlyExtra: number;
}

interface BreakevenAnalysis {
  monthlySavings: number;
  breakevenMonths: number;
  breakevenYears: number;
  totalClosingCosts: number;
}

interface InterestComparison {
  currentTotalInterest: number;
  refiTotalInterest: number;
  interestSavings: number;
  newMonthlyPayment: number;
}

interface TermAnalysis {
  type: "shorter" | "same" | "longer";
  paymentChange: number;
  interestSavings: number;
  timeChange: number; // in months
  recommendation: string;
}

// ==================== CONSTANTS ====================

const TERM_OPTIONS: (15 | 20 | 30)[] = [15, 20, 30];

const DEFAULT_CURRENT_MORTGAGE: CurrentMortgage = {
  balance: 300000,
  interestRate: 6.5,
  monthlyPayment: 1896,
  yearsRemaining: 25,
};

const DEFAULT_NEW_OPTIONS: NewMortgageOptions = {
  newRate: 5.5,
  newTerm: 30,
  closingCosts: 6000,
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate monthly mortgage payment
 */
function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;

  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

/**
 * Calculate total interest paid over loan term
 */
function calculateTotalInterest(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  return monthlyPayment * termMonths - principal;
}

/**
 * Calculate remaining interest on current mortgage
 */
function calculateRemainingInterest(
  balance: number,
  monthlyPayment: number,
  monthsRemaining: number
): number {
  return monthlyPayment * monthsRemaining - balance;
}

/**
 * Calculate breakeven analysis
 */
function calculateBreakeven(
  currentPayment: number,
  newPayment: number,
  closingCosts: number,
  pointsCost: number = 0
): BreakevenAnalysis {
  const monthlySavings = currentPayment - newPayment;
  const totalCosts = closingCosts + pointsCost;

  if (monthlySavings <= 0) {
    return {
      monthlySavings: monthlySavings,
      breakevenMonths: Infinity,
      breakevenYears: Infinity,
      totalClosingCosts: totalCosts,
    };
  }

  const breakevenMonths = Math.ceil(totalCosts / monthlySavings);
  const breakevenYears = breakevenMonths / 12;

  return {
    monthlySavings,
    breakevenMonths,
    breakevenYears,
    totalClosingCosts: totalCosts,
  };
}

/**
 * Calculate months to payoff with extra payments
 */
function calculatePayoffWithExtra(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  extraPayment: number
): number {
  if (balance <= 0) return 0;
  if (monthlyPayment + extraPayment <= 0) return Infinity;

  const monthlyRate = annualRate / 100 / 12;
  let remaining = balance;
  let months = 0;

  while (remaining > 0 && months < 360) {
    const interest = remaining * monthlyRate;
    const principal = monthlyPayment + extraPayment - interest;
    remaining -= principal;
    months++;
  }

  return months;
}

/**
 * Calculate interest saved with extra payments
 */
function calculateExtraPaymentSavings(
  balance: number,
  annualRate: number,
  originalMonthlyPayment: number,
  termYears: number,
  extraMonthly: number
): { monthsSaved: number; interestSaved: number; newPayoffMonths: number } {
  const originalMonths = termYears * 12;
  const originalInterest = calculateTotalInterest(
    balance,
    originalMonthlyPayment,
    originalMonths
  );

  const newPayoffMonths = calculatePayoffWithExtra(
    balance,
    annualRate,
    originalMonthlyPayment,
    extraMonthly
  );

  // Calculate actual interest paid with extra payments
  const monthlyRate = annualRate / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  let months = 0;

  while (remaining > 0 && months < 360) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    const principal = originalMonthlyPayment + extraMonthly - interest;
    remaining -= principal;
    months++;
  }

  return {
    monthsSaved: originalMonths - newPayoffMonths,
    interestSaved: originalInterest - totalInterest,
    newPayoffMonths,
  };
}

// ==================== SUBCOMPONENTS ====================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          {badge}
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

interface InputRowProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}

function InputRow({ label, tooltip, children }: InputRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-1 sm:w-48 flex-shrink-0">
        <Label className="text-sm">{label}</Label>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function MortgageRefi() {
  // Current Mortgage State
  const [currentMortgage, setCurrentMortgage] = useState<CurrentMortgage>(
    DEFAULT_CURRENT_MORTGAGE
  );

  // New Mortgage Options State
  const [newOptions, setNewOptions] = useState<NewMortgageOptions>(
    DEFAULT_NEW_OPTIONS
  );

  // Cash-Out Refi State
  const [cashOut, setCashOut] = useState<CashOutOptions>({
    enabled: false,
    amount: 50000,
    debtRate: 18,
  });

  // Points State
  const [points, setPoints] = useState<PointsOptions>({
    enabled: false,
    pointsCost: 3000,
    rateReduction: 0.25,
  });

  // Extra Payments State
  const [extraPayments, setExtraPayments] = useState<ExtraPaymentOptions>({
    enabled: false,
    monthlyExtra: 200,
  });

  // ==================== CALCULATIONS ====================

  const calculations = useMemo(() => {
    // Effective new rate (accounting for points if enabled)
    const effectiveNewRate = points.enabled
      ? Math.max(0, newOptions.newRate - points.rateReduction)
      : newOptions.newRate;

    // New loan balance (accounting for cash-out if enabled)
    const newLoanBalance = cashOut.enabled
      ? currentMortgage.balance + cashOut.amount
      : currentMortgage.balance;

    // New monthly payment
    const newMonthlyPayment = calculateMonthlyPayment(
      newLoanBalance,
      effectiveNewRate,
      newOptions.newTerm
    );

    // Current remaining interest
    const currentRemainingInterest = calculateRemainingInterest(
      currentMortgage.balance,
      currentMortgage.monthlyPayment,
      currentMortgage.yearsRemaining * 12
    );

    // New total interest
    const newTotalInterest = calculateTotalInterest(
      newLoanBalance,
      newMonthlyPayment,
      newOptions.newTerm * 12
    );

    // Interest comparison
    const interestComparison: InterestComparison = {
      currentTotalInterest: currentRemainingInterest,
      refiTotalInterest: newTotalInterest,
      interestSavings: currentRemainingInterest - newTotalInterest,
      newMonthlyPayment,
    };

    // Breakeven analysis
    const totalPointsCost = points.enabled ? points.pointsCost : 0;
    const breakeven = calculateBreakeven(
      currentMortgage.monthlyPayment,
      newMonthlyPayment,
      newOptions.closingCosts,
      totalPointsCost
    );

    // Term analysis
    const currentTermMonths = currentMortgage.yearsRemaining * 12;
    const newTermMonths = newOptions.newTerm * 12;
    const termDifferenceMonths = newTermMonths - currentTermMonths;

    let termType: "shorter" | "same" | "longer";
    let termRecommendation: string;

    if (termDifferenceMonths < -12) {
      termType = "shorter";
      termRecommendation =
        "Higher payment but significant interest savings. Great if you can afford it!";
    } else if (termDifferenceMonths > 12) {
      termType = "longer";
      termRecommendation =
        "Lower payment but extends your timeline. Usually not recommended unless you need cash flow relief.";
    } else {
      termType = "same";
      termRecommendation =
        "Similar timeline with lower payment. Good balance of savings and cash flow.";
    }

    const termAnalysis: TermAnalysis = {
      type: termType,
      paymentChange: newMonthlyPayment - currentMortgage.monthlyPayment,
      interestSavings: interestComparison.interestSavings,
      timeChange: termDifferenceMonths,
      recommendation: termRecommendation,
    };

    // Extra payments analysis (alternative to refi)
    const extraPaymentAnalysis = extraPayments.enabled
      ? calculateExtraPaymentSavings(
          currentMortgage.balance,
          currentMortgage.interestRate,
          currentMortgage.monthlyPayment,
          currentMortgage.yearsRemaining,
          extraPayments.monthlyExtra
        )
      : null;

    // Cash-out benefit analysis
    let cashOutBenefit = 0;
    if (cashOut.enabled && cashOut.amount > 0) {
      // Calculate savings from consolidating high-rate debt
      const currentDebtInterestPerYear = cashOut.amount * (cashOut.debtRate / 100);
      const newDebtInterestPerYear = cashOut.amount * (effectiveNewRate / 100);
      cashOutBenefit = (currentDebtInterestPerYear - newDebtInterestPerYear) * 10; // 10 year savings
    }

    // Points breakeven
    const pointsBreakeven = points.enabled
      ? {
          monthlySavings:
            calculateMonthlyPayment(
              newLoanBalance,
              newOptions.newRate,
              newOptions.newTerm
            ) - newMonthlyPayment,
          breakevenMonths:
            points.pointsCost /
            (calculateMonthlyPayment(
              newLoanBalance,
              newOptions.newRate,
              newOptions.newTerm
            ) - newMonthlyPayment),
        }
      : null;

    // Overall recommendation
    let shouldRefi = true;
    let refiReason = "";

    if (breakeven.breakevenMonths === Infinity) {
      shouldRefi = false;
      refiReason = "The new payment is higher than your current payment.";
    } else if (breakeven.breakevenMonths > 60) {
      shouldRefi = false;
      refiReason = `It takes ${Math.ceil(breakeven.breakevenYears)} years to break even. Consider if you'll stay that long.`;
    } else if (interestComparison.interestSavings < 0 && termType !== "shorter") {
      shouldRefi = false;
      refiReason = "You'll pay more total interest with this refinance.";
    } else if (
      newOptions.newRate >= currentMortgage.interestRate - 0.5 &&
      !cashOut.enabled
    ) {
      shouldRefi = false;
      refiReason =
        "Rate reduction is less than 0.5%. May not be worth the hassle.";
    }

    if (shouldRefi) {
      if (breakeven.breakevenMonths <= 24) {
        refiReason = `Quick payback in ${breakeven.breakevenMonths} months. Strong candidate for refinancing!`;
      } else {
        refiReason = `Break even in ${Math.ceil(breakeven.breakevenYears)} years. Good option if you plan to stay.`;
      }
    }

    return {
      effectiveNewRate,
      newLoanBalance,
      newMonthlyPayment,
      interestComparison,
      breakeven,
      termAnalysis,
      extraPaymentAnalysis,
      cashOutBenefit,
      pointsBreakeven,
      shouldRefi,
      refiReason,
    };
  }, [currentMortgage, newOptions, cashOut, points, extraPayments]);

  // ==================== HANDLERS ====================

  const updateCurrentMortgage = useCallback(
    (field: keyof CurrentMortgage, value: number) => {
      setCurrentMortgage((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateNewOptions = useCallback(
    (field: keyof NewMortgageOptions, value: number | 15 | 20 | 30) => {
      setNewOptions((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ==================== RENDER ====================

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-6 w-6 text-blue-600" />
          Mortgage Refinance Calculator
        </CardTitle>
        <CardDescription>
          Analyze whether refinancing makes sense for your situation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Verdict */}
        <Alert
          className={cn(
            calculations.shouldRefi
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
          )}
        >
          <div className="flex items-start gap-3">
            {calculations.shouldRefi ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <AlertTitle
                className={cn(
                  calculations.shouldRefi
                    ? "text-green-900 dark:text-green-100"
                    : "text-amber-900 dark:text-amber-100"
                )}
              >
                {calculations.shouldRefi
                  ? "Refinancing Could Make Sense"
                  : "Refinancing May Not Be Worth It"}
              </AlertTitle>
              <AlertDescription
                className={cn(
                  calculations.shouldRefi
                    ? "text-green-800 dark:text-green-200"
                    : "text-amber-800 dark:text-amber-200"
                )}
              >
                {calculations.refiReason}
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {/* Current Mortgage Input */}
        <CollapsibleSection
          title="Current Mortgage"
          icon={<Home className="h-4 w-4 text-blue-600" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <InputRow
              label="Current Balance"
              tooltip="The remaining principal on your mortgage"
            >
              <NumericInput
                value={currentMortgage.balance}
                onChange={(v) => updateCurrentMortgage("balance", v)}
                prefix="$"
                min={0}
                max={5000000}
              />
            </InputRow>

            <InputRow
              label="Current Rate"
              tooltip="Your current annual interest rate"
            >
              <NumericInput
                value={currentMortgage.interestRate}
                onChange={(v) => updateCurrentMortgage("interestRate", v)}
                suffix="%"
                min={0}
                max={20}
                decimalPlaces={2}
              />
            </InputRow>

            <InputRow
              label="Monthly Payment"
              tooltip="Your current monthly principal and interest payment"
            >
              <NumericInput
                value={currentMortgage.monthlyPayment}
                onChange={(v) => updateCurrentMortgage("monthlyPayment", v)}
                prefix="$"
                min={0}
                max={50000}
              />
            </InputRow>

            <InputRow
              label="Years Remaining"
              tooltip="How many years left on your current mortgage"
            >
              <NumericInput
                value={currentMortgage.yearsRemaining}
                onChange={(v) => updateCurrentMortgage("yearsRemaining", v)}
                min={1}
                max={30}
              />
            </InputRow>
          </div>
        </CollapsibleSection>

        {/* New Mortgage Options */}
        <CollapsibleSection
          title="New Mortgage Options"
          icon={<RefreshCw className="h-4 w-4 text-purple-600" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <InputRow
              label="New Rate"
              tooltip="The interest rate you've been quoted for refinancing"
            >
              <NumericInput
                value={newOptions.newRate}
                onChange={(v) => updateNewOptions("newRate", v)}
                suffix="%"
                min={0}
                max={20}
                decimalPlaces={2}
              />
            </InputRow>

            <InputRow
              label="New Term"
              tooltip="The length of your new mortgage"
            >
              <Select
                value={newOptions.newTerm.toString()}
                onValueChange={(v) =>
                  updateNewOptions("newTerm", parseInt(v) as 15 | 20 | 30)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map((term) => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InputRow>

            <InputRow
              label="Closing Costs"
              tooltip="Total closing costs including lender fees, appraisal, title insurance, etc."
            >
              <NumericInput
                value={newOptions.closingCosts}
                onChange={(v) => updateNewOptions("closingCosts", v)}
                prefix="$"
                min={0}
                max={50000}
              />
            </InputRow>
          </div>
        </CollapsibleSection>

        {/* Breakeven Analysis */}
        <CollapsibleSection
          title="Breakeven Analysis"
          icon={<Scale className="h-4 w-4 text-emerald-600" />}
          defaultOpen={true}
          badge={
            calculations.breakeven.breakevenMonths !== Infinity && (
              <Badge
                variant="outline"
                className={cn(
                  calculations.breakeven.breakevenMonths <= 24
                    ? "bg-green-100 text-green-800 border-green-300"
                    : calculations.breakeven.breakevenMonths <= 48
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-100 text-red-800 border-red-300"
                )}
              >
                {calculations.breakeven.breakevenMonths} months
              </Badge>
            )
          }
        >
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">
                  Monthly Savings
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    calculations.breakeven.monthlySavings > 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {calculations.breakeven.monthlySavings > 0 ? "+" : ""}
                  {fmtFull(calculations.breakeven.monthlySavings)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">per month</div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 text-center">
                <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">
                  Total Costs
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {fmtFull(calculations.breakeven.totalClosingCosts)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  closing + points
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center">
                <div className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">
                  Breakeven Point
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {calculations.breakeven.breakevenMonths === Infinity
                    ? "Never"
                    : `${calculations.breakeven.breakevenMonths} mo`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {calculations.breakeven.breakevenMonths !== Infinity
                    ? `${calculations.breakeven.breakevenYears.toFixed(1)} years`
                    : "payment increases"}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center">
                <div className="text-sm text-amber-700 dark:text-amber-400 mb-1">
                  New Payment
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {fmtFull(calculations.newMonthlyPayment)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">per month</div>
              </div>
            </div>

            {/* Decision Guidance */}
            {calculations.breakeven.breakevenMonths !== Infinity && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>If you move before {calculations.breakeven.breakevenMonths} months ({(calculations.breakeven.breakevenYears).toFixed(1)} years)</strong>, you won&apos;t recoup
                      your closing costs. Only refinance if you plan to stay at
                      least that long.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Total Interest Comparison */}
        <CollapsibleSection
          title="Total Interest Comparison"
          icon={<TrendingDown className="h-4 w-4 text-green-600" />}
          defaultOpen={true}
          badge={
            <Badge
              variant="outline"
              className={cn(
                calculations.interestComparison.interestSavings > 0
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-red-100 text-red-800 border-red-300"
              )}
            >
              {calculations.interestComparison.interestSavings > 0 ? "Save " : ""}
              {fmt(Math.abs(calculations.interestComparison.interestSavings))}
            </Badge>
          }
        >
          <div className="space-y-4">
            {/* Comparison Bars */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Current Path (Stay the Course)</span>
                  <Badge variant="outline">
                    {fmt(calculations.interestComparison.currentTotalInterest)}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                    style={{ width: "100%" }}
                  >
                    {fmt(calculations.interestComparison.currentTotalInterest)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total interest remaining on current mortgage over{" "}
                  {currentMortgage.yearsRemaining} years
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Refinance Path</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      calculations.interestComparison.interestSavings > 0
                        ? "bg-green-50 text-green-700 border-green-200"
                        : ""
                    )}
                  >
                    {fmt(calculations.interestComparison.refiTotalInterest)}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                  <div
                    className={cn(
                      "h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500",
                      calculations.interestComparison.interestSavings > 0
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-red-400 to-red-500"
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(10, (calculations.interestComparison.refiTotalInterest / calculations.interestComparison.currentTotalInterest) * 100))}%`,
                    }}
                  >
                    {fmt(calculations.interestComparison.refiTotalInterest)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total interest on new {newOptions.newTerm}-year mortgage at{" "}
                  {calculations.effectiveNewRate.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Savings/Loss Callout */}
            <div
              className={cn(
                "rounded-lg p-4 border",
                calculations.interestComparison.interestSavings > 0
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              )}
            >
              <div className="flex items-center gap-3">
                {calculations.interestComparison.interestSavings > 0 ? (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <span
                    className={cn(
                      "font-semibold",
                      calculations.interestComparison.interestSavings > 0
                        ? "text-green-900 dark:text-green-100"
                        : "text-red-900 dark:text-red-100"
                    )}
                  >
                    {calculations.interestComparison.interestSavings > 0
                      ? `You'd save ${fmt(calculations.interestComparison.interestSavings)} in total interest`
                      : `You'd pay ${fmt(Math.abs(calculations.interestComparison.interestSavings))} more in total interest`}
                  </span>
                  {calculations.interestComparison.interestSavings < 0 && (
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      This often happens when extending your term. Consider a
                      shorter term or extra payments.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Term Change Consideration */}
        <CollapsibleSection
          title="Term Change Analysis"
          icon={<Calendar className="h-4 w-4 text-indigo-600" />}
          defaultOpen={false}
          badge={
            <Badge
              variant="outline"
              className={cn(
                calculations.termAnalysis.type === "shorter"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : calculations.termAnalysis.type === "longer"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
              )}
            >
              {calculations.termAnalysis.type === "shorter"
                ? "Shorter Term"
                : calculations.termAnalysis.type === "longer"
                  ? "Longer Term"
                  : "Similar Term"}
            </Badge>
          }
        >
          <div className="space-y-4">
            {/* Term comparison cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div
                className={cn(
                  "rounded-lg p-4 border-2 transition-all",
                  calculations.termAnalysis.type === "shorter"
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Shorter Term</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Huge interest savings
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Build equity faster
                  </li>
                  <li className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Higher monthly payment
                  </li>
                </ul>
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 border-2 transition-all",
                  calculations.termAnalysis.type === "same"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Same Term</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Lower payment
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Similar payoff date
                  </li>
                  <li className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-blue-500" />
                    Moderate savings
                  </li>
                </ul>
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 border-2 transition-all",
                  calculations.termAnalysis.type === "longer"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm">Longer Term</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Lowest payment
                  </li>
                  <li className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    More total interest
                  </li>
                  <li className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Extends payoff date
                  </li>
                </ul>
              </div>
            </div>

            {/* Current Selection Impact */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Your Selection</p>
                  <p className="text-sm text-muted-foreground">
                    {calculations.termAnalysis.recommendation}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span>
                      Payment change:{" "}
                      <strong
                        className={cn(
                          calculations.termAnalysis.paymentChange < 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {calculations.termAnalysis.paymentChange < 0 ? "-" : "+"}
                        {fmtFull(Math.abs(calculations.termAnalysis.paymentChange))}
                        /mo
                      </strong>
                    </span>
                    <span>
                      Time change:{" "}
                      <strong>
                        {calculations.termAnalysis.timeChange > 0 ? "+" : ""}
                        {Math.round(calculations.termAnalysis.timeChange / 12)} years
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Cash-Out Refi */}
        <CollapsibleSection
          title="Cash-Out Refinance"
          icon={<Wallet className="h-4 w-4 text-teal-600" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Consider Cash-Out Refi</Label>
                <p className="text-xs text-muted-foreground">
                  Pull equity to consolidate high-rate debt
                </p>
              </div>
              <Switch
                checked={cashOut.enabled}
                onCheckedChange={(checked) =>
                  setCashOut((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {cashOut.enabled && (
              <>
                <InputRow
                  label="Cash-Out Amount"
                  tooltip="Amount of equity to pull from your home"
                >
                  <NumericInput
                    value={cashOut.amount}
                    onChange={(v) =>
                      setCashOut((prev) => ({ ...prev, amount: v }))
                    }
                    prefix="$"
                    min={0}
                    max={500000}
                  />
                </InputRow>

                <InputRow
                  label="Current Debt Rate"
                  tooltip="Interest rate on debt you're consolidating (e.g., credit cards)"
                >
                  <NumericInput
                    value={cashOut.debtRate}
                    onChange={(v) =>
                      setCashOut((prev) => ({ ...prev, debtRate: v }))
                    }
                    suffix="%"
                    min={0}
                    max={30}
                    decimalPlaces={1}
                  />
                </InputRow>

                {/* Cash-Out Analysis */}
                <div className="space-y-3">
                  <div
                    className={cn(
                      "rounded-lg p-4 border",
                      calculations.cashOutBenefit > 0
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {calculations.cashOutBenefit > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {calculations.cashOutBenefit > 0
                            ? `Potential 10-year savings: ${fmt(calculations.cashOutBenefit)}`
                            : "Consider carefully before pulling equity"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {calculations.cashOutBenefit > 0
                            ? `Moving ${fmtFull(cashOut.amount)} from ${cashOut.debtRate}% to ${calculations.effectiveNewRate.toFixed(2)}% saves money`
                            : "Make sure the rate difference justifies it"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* When it makes sense */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm text-green-900 dark:text-green-100">
                          Makes Sense
                        </span>
                      </div>
                      <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                        <li>Consolidating high-rate debt (15%+ credit cards)</li>
                        <li>Home improvements that add value</li>
                        <li>Emergency fund if you have none</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-sm text-red-900 dark:text-red-100">
                          Avoid
                        </span>
                      </div>
                      <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                        <li>Vacations or discretionary spending</li>
                        <li>Investing in risky assets</li>
                        <li>Lifestyle inflation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Points Analysis */}
        <CollapsibleSection
          title="Points Analysis"
          icon={<Percent className="h-4 w-4 text-orange-600" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pay Points for Lower Rate</Label>
                <p className="text-xs text-muted-foreground">
                  1 point = 1% of loan amount, typically lowers rate by 0.25%
                </p>
              </div>
              <Switch
                checked={points.enabled}
                onCheckedChange={(checked) =>
                  setPoints((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {points.enabled && (
              <>
                <InputRow
                  label="Points Cost"
                  tooltip="Total cost of points (1 point = 1% of loan)"
                >
                  <NumericInput
                    value={points.pointsCost}
                    onChange={(v) =>
                      setPoints((prev) => ({ ...prev, pointsCost: v }))
                    }
                    prefix="$"
                    min={0}
                    max={50000}
                  />
                </InputRow>

                <InputRow
                  label="Rate Reduction"
                  tooltip="How much the rate is reduced by paying points"
                >
                  <NumericInput
                    value={points.rateReduction}
                    onChange={(v) =>
                      setPoints((prev) => ({ ...prev, rateReduction: v }))
                    }
                    suffix="%"
                    min={0}
                    max={2}
                    decimalPlaces={2}
                  />
                </InputRow>

                {/* Points Breakeven */}
                {calculations.pointsBreakeven && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Calculator className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm mb-1">Points Breakeven</p>
                        <p className="text-sm text-muted-foreground">
                          Points save you{" "}
                          <strong>
                            {fmtFull(calculations.pointsBreakeven.monthlySavings)}/mo
                          </strong>
                          . You&apos;ll break even on points in{" "}
                          <strong>
                            {Math.ceil(calculations.pointsBreakeven.breakevenMonths)}{" "}
                            months
                          </strong>{" "}
                          ({(calculations.pointsBreakeven.breakevenMonths / 12).toFixed(1)}{" "}
                          years).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Points Recommendation */}
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Points Are Usually Not Worth It</AlertTitle>
                  <AlertDescription>
                    Most people don&apos;t stay in their home long enough to recoup
                    the cost of points. Unless you&apos;re certain you&apos;ll stay 7+ years,
                    skip the points and keep the cash.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Alternative: Extra Payments */}
        <CollapsibleSection
          title="Alternative: Extra Payments"
          icon={<PiggyBank className="h-4 w-4 text-pink-600" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compare Extra Payments Instead</Label>
                <p className="text-xs text-muted-foreground">
                  Same effect as a shorter term, no closing costs
                </p>
              </div>
              <Switch
                checked={extraPayments.enabled}
                onCheckedChange={(checked) =>
                  setExtraPayments((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {extraPayments.enabled && (
              <>
                <InputRow
                  label="Extra Monthly Payment"
                  tooltip="Additional amount toward principal each month"
                >
                  <NumericInput
                    value={extraPayments.monthlyExtra}
                    onChange={(v) =>
                      setExtraPayments((prev) => ({ ...prev, monthlyExtra: v }))
                    }
                    prefix="$"
                    min={0}
                    max={10000}
                  />
                </InputRow>

                {calculations.extraPaymentAnalysis && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-4 text-center">
                        <div className="text-sm text-pink-700 dark:text-pink-400 mb-1">
                          Time Saved
                        </div>
                        <div className="text-2xl font-bold text-pink-900 dark:text-pink-100">
                          {Math.floor(
                            calculations.extraPaymentAnalysis.monthsSaved / 12
                          )}{" "}
                          yr
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {calculations.extraPaymentAnalysis.monthsSaved} months
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center">
                        <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                          Interest Saved
                        </div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {fmt(calculations.extraPaymentAnalysis.interestSaved)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          total savings
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                        <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">
                          New Payoff
                        </div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {Math.ceil(
                            calculations.extraPaymentAnalysis.newPayoffMonths / 12
                          )}{" "}
                          yr
                        </div>
                        <div className="text-xs text-muted-foreground">
                          instead of {currentMortgage.yearsRemaining} yr
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-green-900 dark:text-green-100">
                            Benefits of Extra Payments vs. Refinancing
                          </p>
                          <ul className="text-xs text-green-800 dark:text-green-200 mt-2 space-y-1">
                            <li>No closing costs (save {fmtFull(newOptions.closingCosts)})</li>
                            <li>Flexibility - stop anytime if cash gets tight</li>
                            <li>No credit check or paperwork</li>
                            <li>
                              Savings start immediately (no breakeven period)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Rate Shopping Tips */}
        <CollapsibleSection
          title="Rate Shopping Tips"
          icon={<Target className="h-4 w-4 text-cyan-600" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-lg p-4 border border-cyan-200">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-cyan-600" />
                  <span className="font-medium text-sm">Credit Impact</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                    <span>
                      Multiple mortgage inquiries within 14-45 days count as ONE
                      credit hit
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5" />
                    <span>
                      Shop aggressively within a 2-week window for best
                      protection
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Negotiate Costs</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                    <span>
                      Get at least 3 quotes and show lenders competing offers
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                    <span>
                      Ask each lender to beat the lowest Loan Estimate
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Pro Tip: Compare Loan Estimates</AlertTitle>
              <AlertDescription>
                Request a Loan Estimate (LE) from each lender. This standardized
                form makes it easy to compare true costs. Focus on Section A
                (Origination Charges) - that&apos;s where the negotiation happens.
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">Checklist: Before You Apply</div>
              <div className="grid gap-2 md:grid-cols-2 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Check your credit score (aim for 740+)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Gather W-2s, tax returns, pay stubs
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Get 3+ quotes on the same day
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Compare APR, not just rate
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Calculate your personal breakeven
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Consider how long you&apos;ll stay
                </label>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Educational Summary */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                The Smart Refi Decision
              </div>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>
                  <strong>Calculate your breakeven</strong> - Only refi if you&apos;ll
                  stay past that point
                </li>
                <li>
                  <strong>Compare total interest</strong> - Not just monthly
                  payment
                </li>
                <li>
                  <strong>Consider extra payments</strong> - Often better than
                  refinancing
                </li>
                <li>
                  <strong>Shop aggressively</strong> - Get 3+ quotes on the same
                  day
                </li>
                <li>
                  <strong>Skip the points</strong> - Unless you&apos;re staying 7+
                  years
                </li>
                <li>
                  <strong>Avoid extending term</strong> - Unless you really need
                  cash flow
                </li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MortgageRefi;

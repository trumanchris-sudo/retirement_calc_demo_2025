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
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Scale,
  Heart,
  DollarSign,
  PiggyBank,
  Banknote,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Shield,
  Sparkles,
  Gift,
  Calculator,
} from "lucide-react";

// ==================== TYPES ====================

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  isDeductible: boolean; // e.g., mortgage interest
}

interface TimelineDataPoint {
  year: number;
  debtPath: {
    totalDebt: number;
    investmentBalance: number;
    netWorth: number;
  };
  investPath: {
    totalDebt: number;
    investmentBalance: number;
    netWorth: number;
  };
}

type PayoffStrategy = "avalanche" | "snowball";

// ==================== CONSTANTS ====================

const TIMELINE_YEARS = 10;
const DEFAULT_INFLATION_RATE = 2.5;
const LONG_TERM_CAP_GAINS_RATE = 15; // 15% federal for most filers
const INVESTMENT_TURNOVER_DRAG = 1; // ~1% annual tax drag from turnover

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate the after-tax return on investments
 * Accounts for dividend taxes, capital gains on turnover, and tax drag
 */
function calculateAfterTaxInvestmentReturn(
  nominalReturn: number,
  marginalTaxRate: number
): number {
  // Assume 40% of return is from dividends (taxed as income) and 60% from appreciation
  const dividendPortion = 0.4;
  const appreciationPortion = 0.6;

  // Dividend portion taxed at marginal rate
  const afterTaxDividends = nominalReturn * dividendPortion * (1 - marginalTaxRate / 100);

  // Appreciation has tax drag from fund turnover (typically 1% per year taxed at cap gains)
  const afterTaxAppreciation = nominalReturn * appreciationPortion - INVESTMENT_TURNOVER_DRAG * (LONG_TERM_CAP_GAINS_RATE / 100);

  return afterTaxDividends + afterTaxAppreciation;
}

/**
 * Calculate the effective interest rate after tax deduction
 */
function calculateAfterTaxDebtRate(
  nominalRate: number,
  isDeductible: boolean,
  marginalTaxRate: number
): number {
  if (!isDeductible) return nominalRate;
  // Tax deduction effectively reduces the cost of the debt
  return nominalRate * (1 - marginalTaxRate / 100);
}

/**
 * Sort debts by payoff strategy
 */
function sortDebtsByStrategy(debts: Debt[], strategy: PayoffStrategy): Debt[] {
  const sorted = [...debts];
  if (strategy === "avalanche") {
    // Pay highest interest rate first (mathematically optimal)
    sorted.sort((a, b) => b.interestRate - a.interestRate);
  } else {
    // Pay smallest balance first (psychologically motivating)
    sorted.sort((a, b) => a.balance - b.balance);
  }
  return sorted;
}

/**
 * Calculate months to pay off debt with extra payment
 */
function calculateDebtPayoffMonths(
  balance: number,
  interestRate: number,
  monthlyPayment: number
): number {
  if (monthlyPayment <= 0 || balance <= 0) return 0;
  const monthlyRate = interestRate / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);

  // If payment is less than interest, it will never be paid off
  const monthlyInterest = balance * monthlyRate;
  if (monthlyPayment <= monthlyInterest) return Infinity;

  // Standard loan payoff formula: n = -log(1 - r*P/M) / log(1+r)
  const months = -Math.log(1 - (monthlyRate * balance) / monthlyPayment) / Math.log(1 + monthlyRate);
  return Math.ceil(months);
}

/**
 * Simulate both paths over time
 */
function simulateTimelines(
  debts: Debt[],
  monthlyContribution: number,
  expectedReturn: number,
  marginalTaxRate: number,
  strategy: PayoffStrategy
): TimelineDataPoint[] {
  const timeline: TimelineDataPoint[] = [];
  const afterTaxReturn = calculateAfterTaxInvestmentReturn(expectedReturn, marginalTaxRate);

  // Path 1: Focus on debt payoff
  let debtPathDebts = debts.map(d => ({ ...d }));
  let debtPathInvestment = 0;

  // Path 2: Focus on investing (minimum payments on debt)
  let investPathDebts = debts.map(d => ({ ...d }));
  let investPathInvestment = 0;

  // Calculate total minimum payments
  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const extraPayment = Math.max(0, monthlyContribution - totalMinPayments);

  for (let year = 0; year <= TIMELINE_YEARS; year++) {
    // Record state at start of year
    const debtPathTotalDebt = debtPathDebts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
    const investPathTotalDebt = investPathDebts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);

    timeline.push({
      year,
      debtPath: {
        totalDebt: debtPathTotalDebt,
        investmentBalance: debtPathInvestment,
        netWorth: debtPathInvestment - debtPathTotalDebt,
      },
      investPath: {
        totalDebt: investPathTotalDebt,
        investmentBalance: investPathInvestment,
        netWorth: investPathInvestment - investPathTotalDebt,
      },
    });

    if (year === TIMELINE_YEARS) break;

    // Simulate one year (12 months)
    for (let month = 0; month < 12; month++) {
      // PATH 1: DEBT FOCUS
      // Sort remaining debts by strategy
      const sortedDebtPath = sortDebtsByStrategy(
        debtPathDebts.filter(d => d.balance > 0),
        strategy
      );

      // Apply minimum payments and accrue interest
      let remainingExtra = extraPayment;
      for (const debt of debtPathDebts) {
        if (debt.balance <= 0) continue;

        // Accrue interest
        const monthlyRate = debt.interestRate / 100 / 12;
        debt.balance *= (1 + monthlyRate);

        // Apply minimum payment
        debt.balance = Math.max(0, debt.balance - debt.minimumPayment);
      }

      // Apply extra payment to target debt
      if (sortedDebtPath.length > 0 && remainingExtra > 0) {
        const targetDebt = debtPathDebts.find(d => d.id === sortedDebtPath[0].id);
        if (targetDebt && targetDebt.balance > 0) {
          const payment = Math.min(remainingExtra, targetDebt.balance);
          targetDebt.balance -= payment;
          remainingExtra -= payment;
        }
      }

      // Any remaining extra goes to investment
      if (remainingExtra > 0 || debtPathDebts.every(d => d.balance <= 0)) {
        const contribution = debtPathDebts.every(d => d.balance <= 0)
          ? monthlyContribution
          : remainingExtra;
        debtPathInvestment += contribution;
      }

      // Apply monthly investment growth (after-tax return)
      const monthlyGrowth = afterTaxReturn / 100 / 12;
      debtPathInvestment *= (1 + monthlyGrowth);

      // PATH 2: INVEST FOCUS
      // Make only minimum payments on debts
      for (const debt of investPathDebts) {
        if (debt.balance <= 0) continue;

        // Accrue interest
        const monthlyRate = debt.interestRate / 100 / 12;
        debt.balance *= (1 + monthlyRate);

        // Apply minimum payment
        debt.balance = Math.max(0, debt.balance - debt.minimumPayment);
      }

      // Put all extra into investments
      investPathInvestment += extraPayment;
      investPathInvestment *= (1 + monthlyGrowth);
    }
  }

  return timeline;
}

// ==================== COMPONENT ====================

export default function DebtVsInvest() {
  // ========== STATE ==========

  // Emergency fund state
  const [hasEmergencyFund, setHasEmergencyFund] = useState(true);

  // 401k match state
  const [has401kMatch, setHas401kMatch] = useState(true);
  const [matchPercentage, setMatchPercentage] = useState(100);
  const [annualMatchAmount, setAnnualMatchAmount] = useState(3000);

  // Investment parameters
  const [expectedReturn, setExpectedReturn] = useState(7.0);
  const [marginalTaxRate, setMarginalTaxRate] = useState(22);

  // Monthly contribution
  const [monthlyContribution, setMonthlyContribution] = useState(1000);

  // Psychological factor
  const [valuePeaceOfMind, setValuePeaceOfMind] = useState(false);

  // Debt payoff strategy
  const [payoffStrategy, setPayoffStrategy] = useState<PayoffStrategy>("avalanche");

  // Debts list
  const [debts, setDebts] = useState<Debt[]>([
    {
      id: "1",
      name: "Credit Card",
      balance: 8000,
      interestRate: 19.99,
      minimumPayment: 200,
      isDeductible: false,
    },
    {
      id: "2",
      name: "Auto Loan",
      balance: 15000,
      interestRate: 6.5,
      minimumPayment: 350,
      isDeductible: false,
    },
    {
      id: "3",
      name: "Student Loan",
      balance: 25000,
      interestRate: 5.5,
      minimumPayment: 280,
      isDeductible: false, // Student loan interest deduction phased out for high earners
    },
  ]);

  // UI state
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // ========== CALCULATIONS ==========

  const totalDebt = useMemo(() =>
    debts.reduce((sum, d) => sum + d.balance, 0),
    [debts]
  );

  const totalMinimumPayments = useMemo(() =>
    debts.reduce((sum, d) => sum + d.minimumPayment, 0),
    [debts]
  );

  const weightedAverageRate = useMemo(() => {
    if (totalDebt === 0) return 0;
    return debts.reduce((sum, d) => sum + (d.balance / totalDebt) * d.interestRate, 0);
  }, [debts, totalDebt]);

  const afterTaxInvestmentReturn = useMemo(() =>
    calculateAfterTaxInvestmentReturn(expectedReturn, marginalTaxRate),
    [expectedReturn, marginalTaxRate]
  );

  const afterTaxDebtRates = useMemo(() =>
    debts.map(d => ({
      ...d,
      effectiveRate: calculateAfterTaxDebtRate(d.interestRate, d.isDeductible, marginalTaxRate),
    })),
    [debts, marginalTaxRate]
  );

  const timeline = useMemo(() =>
    simulateTimelines(debts, monthlyContribution, expectedReturn, marginalTaxRate, payoffStrategy),
    [debts, monthlyContribution, expectedReturn, marginalTaxRate, payoffStrategy]
  );

  // Determine recommendation
  const recommendation = useMemo(() => {
    // Check for high-interest debt (credit cards, etc.)
    const highInterestDebts = afterTaxDebtRates.filter(d => d.effectiveRate > afterTaxInvestmentReturn);

    // Calculate the net benefit of paying debt vs investing
    const netRateDifference = weightedAverageRate - afterTaxInvestmentReturn;

    // Timeline comparison at year 10
    const finalYear = timeline[timeline.length - 1];
    const debtPathNetWorth = finalYear?.debtPath.netWorth || 0;
    const investPathNetWorth = finalYear?.investPath.netWorth || 0;
    const netWorthDifference = debtPathNetWorth - investPathNetWorth;

    let action: "pay_debt" | "invest" | "hybrid" = "hybrid";
    let primaryReason = "";
    let confidence = 50;

    // Automatic rules
    if (highInterestDebts.some(d => d.interestRate > 15)) {
      action = "pay_debt";
      primaryReason = "You have high-interest debt (>15%) that is costing you more than typical investment returns.";
      confidence = 95;
    } else if (valuePeaceOfMind) {
      action = "pay_debt";
      primaryReason = "Debt freedom provides peace of mind, which has real psychological value.";
      confidence = 75;
    } else if (netRateDifference > 2) {
      action = "pay_debt";
      primaryReason = `Your debt costs ${fmtPctRaw(weightedAverageRate, 1)} while investments return ~${fmtPctRaw(afterTaxInvestmentReturn, 1)} after tax.`;
      confidence = 85;
    } else if (netRateDifference < -2) {
      action = "invest";
      primaryReason = `Your investment returns (~${fmtPctRaw(afterTaxInvestmentReturn, 1)} after tax) exceed your debt cost (${fmtPctRaw(weightedAverageRate, 1)}).`;
      confidence = 80;
    } else {
      action = "hybrid";
      primaryReason = "The math is close either way. Consider a balanced approach.";
      confidence = 50;
    }

    return {
      action,
      primaryReason,
      confidence,
      highInterestDebts,
      netWorthDifference,
    };
  }, [afterTaxDebtRates, afterTaxInvestmentReturn, weightedAverageRate, valuePeaceOfMind, timeline]);

  // ========== HANDLERS ==========

  const addDebt = useCallback(() => {
    const newId = Date.now().toString();
    setDebts(prev => [...prev, {
      id: newId,
      name: "New Debt",
      balance: 0,
      interestRate: 5.0,
      minimumPayment: 0,
      isDeductible: false,
    }]);
    setExpandedDebtId(newId);
  }, []);

  const removeDebt = useCallback((id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    if (expandedDebtId === id) setExpandedDebtId(null);
  }, [expandedDebtId]);

  const updateDebt = useCallback((id: string, updates: Partial<Debt>) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Debt vs. Invest Calculator</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Should you pay off debt or invest? The answer depends on after-tax returns,
          your risk tolerance, and psychological factors.
        </p>
      </div>

      {/* Warning: No Emergency Fund */}
      {!hasEmergencyFund && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg">Emergency Fund First!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Before paying extra on debt or investing, build an emergency fund of 3-6 months of expenses.</p>
            <p className="mt-2 font-medium">Without a safety net, any financial setback could force you into more high-interest debt.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Priority: 401k Match */}
      {has401kMatch && (
        <Alert className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <Gift className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-lg text-green-700 dark:text-green-300">
            Always Get the 401(k) Match First!
          </AlertTitle>
          <AlertDescription className="mt-2 text-green-700/80 dark:text-green-300/80">
            <p>
              Your employer match is a <strong>{matchPercentage}% instant return</strong> ({fmt(annualMatchAmount)}/year).
            </p>
            <p className="mt-1">
              This beats paying off any debt. Contribute enough to get the full match before extra debt payments.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          {/* Quick Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Financial Safety
              </CardTitle>
              <CardDescription>Important prerequisites before making this decision</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emergency-fund">Emergency Fund (3-6 months)</Label>
                  <p className="text-xs text-muted-foreground">Do you have one?</p>
                </div>
                <Switch
                  id="emergency-fund"
                  checked={hasEmergencyFund}
                  onCheckedChange={setHasEmergencyFund}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="401k-match">Employer 401(k) Match</Label>
                  <p className="text-xs text-muted-foreground">Does your employer offer a match?</p>
                </div>
                <Switch
                  id="401k-match"
                  checked={has401kMatch}
                  onCheckedChange={setHas401kMatch}
                />
              </div>

              {has401kMatch && (
                <div className="pl-4 border-l-2 border-green-300 space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="match-percent">Match Rate</Label>
                      <NumericInput
                        id="match-percent"
                        value={matchPercentage}
                        onChange={setMatchPercentage}
                        suffix="%"
                        min={0}
                        max={200}
                        aria-label="Match percentage"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="match-amount">Annual Match</Label>
                      <NumericInput
                        id="match-amount"
                        value={annualMatchAmount}
                        onChange={setAnnualMatchAmount}
                        prefix="$"
                        min={0}
                        aria-label="Annual match amount"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Investment Parameters
              </CardTitle>
              <CardDescription>Set your expected returns and tax situation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="expected-return">Expected Return</Label>
                    <InfoTooltip content="Historical S&P 500 average is ~10% nominal, ~7% after inflation. Conservative estimates use 5-7%." />
                  </div>
                  <NumericInput
                    id="expected-return"
                    value={expectedReturn}
                    onChange={setExpectedReturn}
                    suffix="%"
                    min={0}
                    max={20}
                    decimalPlaces={1}
                    aria-label="Expected investment return"
                  />
                  <p className="text-xs text-muted-foreground">
                    After-tax: ~{fmtPctRaw(afterTaxInvestmentReturn, 1)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="tax-rate">Marginal Tax Rate</Label>
                    <InfoTooltip content="Your highest federal tax bracket. Used to calculate tax drag on investments and value of deductions." />
                  </div>
                  <NumericInput
                    id="tax-rate"
                    value={marginalTaxRate}
                    onChange={setMarginalTaxRate}
                    suffix="%"
                    min={0}
                    max={50}
                    aria-label="Marginal tax rate"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="monthly-contribution">Monthly Amount Available</Label>
                <NumericInput
                  id="monthly-contribution"
                  value={monthlyContribution}
                  onChange={setMonthlyContribution}
                  prefix="$"
                  min={0}
                  aria-label="Monthly contribution"
                />
                <p className="text-xs text-muted-foreground">
                  Amount you can put toward debt payoff OR investing
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Debts List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Your Debts
                  </CardTitle>
                  <CardDescription>Add all debts to compare strategies</CardDescription>
                </div>
                <button
                  onClick={addDebt}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Debt
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {debts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No debts added. Click "Add Debt" to get started.
                </p>
              ) : (
                debts.map((debt, index) => (
                  <div
                    key={debt.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all",
                      expandedDebtId === debt.id && "ring-2 ring-primary"
                    )}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedDebtId(expandedDebtId === debt.id ? null : debt.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                          debt.interestRate > 15 ? "bg-red-500" :
                          debt.interestRate > 8 ? "bg-orange-500" :
                          debt.interestRate > 5 ? "bg-yellow-500" : "bg-green-500"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{debt.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmt(debt.balance)} at {fmtPctRaw(debt.interestRate, 2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {debt.isDeductible && (
                          <Badge variant="secondary" className="text-xs">Tax Deductible</Badge>
                        )}
                        {expandedDebtId === debt.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expandedDebtId === debt.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Name</Label>
                            <input
                              type="text"
                              value={debt.name}
                              onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Balance</Label>
                            <NumericInput
                              value={debt.balance}
                              onChange={(v) => updateDebt(debt.id, { balance: v })}
                              prefix="$"
                              min={0}
                              aria-label="Debt balance"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Interest Rate</Label>
                            <NumericInput
                              value={debt.interestRate}
                              onChange={(v) => updateDebt(debt.id, { interestRate: v })}
                              suffix="%"
                              min={0}
                              max={50}
                              decimalPlaces={2}
                              aria-label="Interest rate"
                            />
                            {debt.isDeductible && (
                              <p className="text-xs text-green-600">
                                Effective: {fmtPctRaw(calculateAfterTaxDebtRate(debt.interestRate, true, marginalTaxRate), 2)}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label>Minimum Payment</Label>
                            <NumericInput
                              value={debt.minimumPayment}
                              onChange={(v) => updateDebt(debt.id, { minimumPayment: v })}
                              prefix="$"
                              min={0}
                              aria-label="Minimum payment"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`deductible-${debt.id}`}
                              checked={debt.isDeductible}
                              onCheckedChange={(v) => updateDebt(debt.id, { isDeductible: v })}
                            />
                            <Label htmlFor={`deductible-${debt.id}`} className="text-sm">
                              Tax-deductible interest (e.g., mortgage)
                            </Label>
                          </div>
                          <button
                            onClick={() => removeDebt(debt.id)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {debts.length > 0 && (
                <div className="pt-4 border-t flex justify-between text-sm">
                  <span className="font-medium">Total Debt:</span>
                  <span className="font-bold">{fmt(totalDebt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payoff Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Debt Payoff Strategy
              </CardTitle>
              <CardDescription>Choose how to prioritize debt payoff</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={payoffStrategy}
                onValueChange={(v) => setPayoffStrategy(v as PayoffStrategy)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="avalanche" id="avalanche" className="mt-1" />
                  <div>
                    <Label htmlFor="avalanche" className="font-medium cursor-pointer">
                      Debt Avalanche
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pay highest interest rate first. <strong>Mathematically optimal</strong> - saves the most money.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="snowball" id="snowball" className="mt-1" />
                  <div>
                    <Label htmlFor="snowball" className="font-medium cursor-pointer">
                      Debt Snowball
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pay smallest balance first. <strong>Psychologically motivating</strong> - quick wins build momentum.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Peace of Mind Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Psychological Factors
              </CardTitle>
              <CardDescription>The numbers don't tell the whole story</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="peace-of-mind" className="font-medium">
                    "I value peace of mind"
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Being debt-free has emotional value beyond the math
                  </p>
                </div>
                <Switch
                  id="peace-of-mind"
                  checked={valuePeaceOfMind}
                  onCheckedChange={setValuePeaceOfMind}
                />
              </div>

              {valuePeaceOfMind && (
                <div className="mt-4 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-900">
                  <p className="text-sm text-pink-700 dark:text-pink-300">
                    <strong>Valid choice!</strong> Studies show debt causes stress and anxiety.
                    The psychological benefit of being debt-free is real and measurable.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {/* Recommendation Card */}
          <Card className={cn(
            "border-2",
            recommendation.action === "pay_debt" && "border-red-200 bg-red-50/50 dark:bg-red-950/20",
            recommendation.action === "invest" && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
            recommendation.action === "hybrid" && "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {recommendation.action === "pay_debt" && <TrendingDown className="h-6 w-6 text-red-600" />}
                  {recommendation.action === "invest" && <TrendingUp className="h-6 w-6 text-green-600" />}
                  {recommendation.action === "hybrid" && <Scale className="h-6 w-6 text-yellow-600" />}
                  Recommendation
                </CardTitle>
                <Badge variant={
                  recommendation.confidence >= 80 ? "default" :
                  recommendation.confidence >= 60 ? "secondary" : "outline"
                }>
                  {recommendation.confidence}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold">
                  {recommendation.action === "pay_debt" && "Pay Off Debt First"}
                  {recommendation.action === "invest" && "Invest First"}
                  {recommendation.action === "hybrid" && "Do Both"}
                </p>
              </div>

              <p className="text-center text-muted-foreground">
                {recommendation.primaryReason}
              </p>

              {/* Key Insight */}
              <div className="p-4 bg-background/50 rounded-lg border">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Key Insight
                </h4>
                <p className="text-sm text-muted-foreground">
                  <strong>7% debt vs 7% investment return are NOT equal.</strong> After accounting for
                  taxes on investment gains (~{fmtPctRaw(INVESTMENT_TURNOVER_DRAG + (LONG_TERM_CAP_GAINS_RATE * 0.4), 1)} drag),
                  your {fmtPctRaw(expectedReturn, 1)} expected return becomes ~{fmtPctRaw(afterTaxInvestmentReturn, 1)} after-tax.
                </p>
              </div>

              {/* High Interest Warning */}
              {recommendation.highInterestDebts.length > 0 && recommendation.highInterestDebts.some(d => d.interestRate > 15) && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
                  <h4 className="font-semibold flex items-center gap-2 mb-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    High-Interest Debt Alert
                  </h4>
                  <p className="text-sm text-red-700/80 dark:text-red-300/80">
                    You have debt at {fmtPctRaw(Math.max(...debts.map(d => d.interestRate)), 1)} interest.
                    No investment reliably beats this guaranteed "return" from paying it off.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rate Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                After-Tax Rate Comparison
              </CardTitle>
              <CardDescription>The true cost/benefit after taxes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Investment Return */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Investment Return (after-tax)</span>
                    <span className="font-mono font-medium text-green-600">
                      {fmtPctRaw(afterTaxInvestmentReturn, 2)}
                    </span>
                  </div>
                  <Progress value={(afterTaxInvestmentReturn / 20) * 100} className="h-3" />
                </div>

                {/* Debt Rates */}
                {afterTaxDebtRates.map((debt) => (
                  <div key={debt.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{debt.name} {debt.isDeductible && "(after deduction)"}</span>
                      <span className={cn(
                        "font-mono font-medium",
                        debt.effectiveRate > afterTaxInvestmentReturn ? "text-red-600" : "text-green-600"
                      )}>
                        {fmtPctRaw(debt.effectiveRate, 2)}
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full transition-all",
                          debt.effectiveRate > afterTaxInvestmentReturn ? "bg-red-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min((debt.effectiveRate / 20) * 100, 100)}%` }}
                      />
                      {/* Reference line for investment return */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary"
                        style={{ left: `${(afterTaxInvestmentReturn / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>The vertical line shows your after-tax investment return. Debts with rates above this line should be prioritized.</p>
              </div>
            </CardContent>
          </Card>

          {/* 10-Year Timeline Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                10-Year Timeline Comparison
              </CardTitle>
              <CardDescription>Net worth trajectory: debt focus vs. invest focus</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Visual Timeline */}
              <div className="space-y-6">
                {/* Legend */}
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Debt Focus Path</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Invest Focus Path</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative h-64 border rounded-lg p-4">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-muted-foreground py-2">
                    {(() => {
                      const allValues = timeline.flatMap(t => [
                        t.debtPath.netWorth,
                        t.investPath.netWorth
                      ]);
                      const maxVal = Math.max(...allValues);
                      const minVal = Math.min(...allValues);
                      const range = maxVal - minVal || 1;
                      return [maxVal, (maxVal + minVal) / 2, minVal].map((v, i) => (
                        <span key={i} className="text-right pr-2">{fmt(v)}</span>
                      ));
                    })()}
                  </div>

                  {/* Chart area */}
                  <div className="ml-16 h-full relative">
                    {/* Zero line if applicable */}
                    {(() => {
                      const allValues = timeline.flatMap(t => [t.debtPath.netWorth, t.investPath.netWorth]);
                      const maxVal = Math.max(...allValues);
                      const minVal = Math.min(...allValues);
                      const range = maxVal - minVal || 1;

                      if (minVal < 0 && maxVal > 0) {
                        const zeroY = ((maxVal - 0) / range) * 100;
                        return (
                          <div
                            className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/50"
                            style={{ top: `${zeroY}%` }}
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* SVG paths */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      {(() => {
                        const allValues = timeline.flatMap(t => [t.debtPath.netWorth, t.investPath.netWorth]);
                        const maxVal = Math.max(...allValues);
                        const minVal = Math.min(...allValues);
                        const range = maxVal - minVal || 1;

                        const getY = (val: number) => ((maxVal - val) / range) * 100;
                        const getX = (year: number) => (year / TIMELINE_YEARS) * 100;

                        const debtPoints = timeline.map((t, i) =>
                          `${getX(t.year)},${getY(t.debtPath.netWorth)}`
                        ).join(' ');

                        const investPoints = timeline.map((t, i) =>
                          `${getX(t.year)},${getY(t.investPath.netWorth)}`
                        ).join(' ');

                        return (
                          <>
                            <polyline
                              points={debtPoints}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                            <polyline
                              points={investPoints}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          </>
                        );
                      })()}
                    </svg>

                    {/* Data points */}
                    {timeline.filter((_, i) => i % 2 === 0 || i === timeline.length - 1).map((point) => {
                      const allValues = timeline.flatMap(t => [t.debtPath.netWorth, t.investPath.netWorth]);
                      const maxVal = Math.max(...allValues);
                      const minVal = Math.min(...allValues);
                      const range = maxVal - minVal || 1;

                      const getY = (val: number) => ((maxVal - val) / range) * 100;
                      const getX = (year: number) => (year / TIMELINE_YEARS) * 100;

                      return (
                        <React.Fragment key={point.year}>
                          <div
                            className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${getX(point.year)}%`,
                              top: `${getY(point.debtPath.netWorth)}%`,
                            }}
                            title={`Year ${point.year}: ${fmt(point.debtPath.netWorth)}`}
                          />
                          <div
                            className="absolute w-3 h-3 rounded-full bg-green-500 border-2 border-white -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${getX(point.year)}%`,
                              top: `${getY(point.investPath.netWorth)}%`,
                            }}
                            title={`Year ${point.year}: ${fmt(point.investPath.netWorth)}`}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between text-xs text-muted-foreground ml-16">
                  {[0, 2, 4, 6, 8, 10].map(year => (
                    <span key={year}>Year {year}</span>
                  ))}
                </div>

                {/* Final comparison */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Debt Focus (Year 10)</p>
                    <p className="text-2xl font-bold text-red-600">
                      {fmt(timeline[timeline.length - 1]?.debtPath.netWorth || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Invest Focus (Year 10)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {fmt(timeline[timeline.length - 1]?.investPath.netWorth || 0)}
                    </p>
                  </div>
                </div>

                {/* Difference callout */}
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {recommendation.netWorthDifference > 0 ? (
                      <>Debt focus wins by <strong className="text-red-600">{fmt(recommendation.netWorthDifference)}</strong> over 10 years</>
                    ) : recommendation.netWorthDifference < 0 ? (
                      <>Invest focus wins by <strong className="text-green-600">{fmt(Math.abs(recommendation.netWorthDifference))}</strong> over 10 years</>
                    ) : (
                      <>Both paths result in similar outcomes</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debt Payoff Order Preview */}
          {debts.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" />
                  {payoffStrategy === "avalanche" ? "Avalanche" : "Snowball"} Order
                </CardTitle>
                <CardDescription>
                  {payoffStrategy === "avalanche"
                    ? "Targeting highest interest rate first"
                    : "Targeting smallest balance first"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortDebtsByStrategy(debts, payoffStrategy).map((debt, index) => (
                    <div key={debt.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{debt.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmt(debt.balance)} at {fmtPctRaw(debt.interestRate, 2)}
                        </p>
                      </div>
                      {index === 0 && (
                        <Badge className="bg-primary">Target</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg max-w-3xl mx-auto">
        <p>
          <strong>Remember:</strong> These calculations assume consistent returns and payments.
          Real-world results vary. Investment returns are not guaranteed, while debt interest is.
          When in doubt, paying off high-interest debt is the lower-risk choice.
        </p>
      </div>
    </div>
  );
}

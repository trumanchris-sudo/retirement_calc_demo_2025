"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  DollarSign,
  TrendingUp,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  PiggyBank,
  Building2,
  Calendar,
  Scale,
  Briefcase,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface Loan {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  loanType: "federal" | "private";
  subsidizedType: "subsidized" | "unsubsidized" | "na";
}

interface RepaymentPlan {
  name: string;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  payoffMonths: number;
  forgivenessAmount?: number;
  forgivenessYear?: number;
}

interface PSLFProjection {
  eligiblePaymentsMade: number;
  paymentsRemaining: number;
  projectedForgivenessDate: Date;
  amountForgiven: number;
  amountPaid: number;
  totalSavings: number;
}

interface RefinanceAnalysis {
  currentMonthlyPayment: number;
  currentTotalPaid: number;
  newMonthlyPayment: number;
  newTotalPaid: number;
  monthlySavings: number;
  totalSavings: number;
  breakEvenMonths: number;
  shouldRefinance: boolean;
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEDERAL_POVERTY_LINE_2024 = 15060; // Single person
const POVERTY_LINE_FAMILY_INCREMENT = 5380;

const IDR_PLANS = {
  IBR: { name: "Income-Based Repayment (IBR)", discretionaryPercent: 0.15, forgivenessYears: 25, newBorrowerPercent: 0.10, newBorrowerYears: 20 },
  PAYE: { name: "Pay As You Earn (PAYE)", discretionaryPercent: 0.10, forgivenessYears: 20 },
  SAVE: { name: "SAVE Plan", discretionaryPercent: 0.10, forgivenessYears: 20, undergrad: 0.05, undergradThreshold: 12000 },
  ICR: { name: "Income-Contingent Repayment (ICR)", discretionaryPercent: 0.20, forgivenessYears: 25 },
};

const SECURE_2_TAX_FREE_LIMIT = 5250; // Annual employer repayment tax-free limit

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Calculate monthly payment for a loan
const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  months: number
): number => {
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
};

// Calculate total paid over loan life
const calculateTotalPaid = (
  principal: number,
  annualRate: number,
  monthlyPayment: number
): { totalPaid: number; months: number; totalInterest: number } => {
  let balance = principal;
  let totalPaid = 0;
  let months = 0;
  const monthlyRate = annualRate / 100 / 12;
  const maxMonths = 360; // 30 year cap

  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    const payment = Math.min(monthlyPayment, balance + interest);
    balance = balance + interest - payment;
    totalPaid += payment;
    months++;
    if (balance < 0.01) balance = 0;
  }

  return {
    totalPaid,
    months,
    totalInterest: totalPaid - principal,
  };
};

// Calculate discretionary income for IDR plans
const calculateDiscretionaryIncome = (
  grossIncome: number,
  familySize: number
): number => {
  const povertyLine = FEDERAL_POVERTY_LINE_2024 + (familySize - 1) * POVERTY_LINE_FAMILY_INCREMENT;
  const threshold = povertyLine * 1.5; // 150% of poverty line
  return Math.max(0, grossIncome - threshold);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface LoanInputCardProps {
  loan: Loan;
  onUpdate: (loan: Loan) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const LoanInputCard: React.FC<LoanInputCardProps> = ({
  loan,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Input
          value={loan.name}
          onChange={(e) => onUpdate({ ...loan, name: e.target.value })}
          placeholder="Loan name (e.g., Federal Direct)"
          className="max-w-[200px] text-sm font-medium"
        />
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(loan.id)}
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Balance</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={loan.balance || ""}
              onChange={(e) =>
                onUpdate({ ...loan, balance: parseFloat(e.target.value) || 0 })
              }
              placeholder="30000"
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Interest Rate (%)</label>
          <Input
            type="number"
            step="0.1"
            value={loan.interestRate || ""}
            onChange={(e) =>
              onUpdate({
                ...loan,
                interestRate: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="6.5"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Min. Payment</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={loan.minimumPayment || ""}
              onChange={(e) =>
                onUpdate({
                  ...loan,
                  minimumPayment: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="300"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Loan Type</label>
          <Select
            value={loan.loanType}
            onValueChange={(value: "federal" | "private") =>
              onUpdate({ ...loan, loanType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="federal">Federal</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loan.loanType === "federal" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Subsidy Type</label>
            <Select
              value={loan.subsidizedType}
              onValueChange={(value: "subsidized" | "unsubsidized" | "na") =>
                onUpdate({ ...loan, subsidizedType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subsidy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subsidized">Subsidized</SelectItem>
                <SelectItem value="unsubsidized">Unsubsidized</SelectItem>
                <SelectItem value="na">N/A (PLUS, Grad)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StudentLoanOptimizer() {
  // State for loans
  const [loans, setLoans] = useState<Loan[]>([
    {
      id: generateId(),
      name: "Federal Direct Loan",
      balance: 35000,
      interestRate: 6.5,
      minimumPayment: 350,
      loanType: "federal",
      subsidizedType: "unsubsidized",
    },
  ]);

  // State for user profile
  const [annualIncome, setAnnualIncome] = useState(55000);
  const [familySize, setFamilySize] = useState(1);
  const [extraPayment, setExtraPayment] = useState(0);

  // PSLF state
  const [isEligibleEmployer, setIsEligibleEmployer] = useState(false);
  const [paymentsMade, setPaymentsMade] = useState(0);

  // Refinance state
  const [refinanceRate, setRefinanceRate] = useState(5.0);
  const [refinanceTerm, setRefinanceTerm] = useState(10);

  // Employer benefit state
  const [employerContribution, setEmployerContribution] = useState(0);

  // Retirement state
  const [hasEmployerMatch, setHasEmployerMatch] = useState(true);
  const [matchPercent, setMatchPercent] = useState(4);
  const [currentRetirementContribution, setCurrentRetirementContribution] = useState(6);

  // Derived values
  const totalBalance = useMemo(
    () => loans.reduce((sum, loan) => sum + loan.balance, 0),
    [loans]
  );

  const totalMinPayment = useMemo(
    () => loans.reduce((sum, loan) => sum + loan.minimumPayment, 0),
    [loans]
  );

  const weightedAvgRate = useMemo(() => {
    if (totalBalance === 0) return 0;
    return loans.reduce(
      (sum, loan) => sum + (loan.balance / totalBalance) * loan.interestRate,
      0
    );
  }, [loans, totalBalance]);

  const federalLoans = useMemo(
    () => loans.filter((loan) => loan.loanType === "federal"),
    [loans]
  );

  const federalBalance = useMemo(
    () => federalLoans.reduce((sum, loan) => sum + loan.balance, 0),
    [federalLoans]
  );

  // Handlers
  const addLoan = useCallback(() => {
    setLoans((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `Loan ${prev.length + 1}`,
        balance: 0,
        interestRate: 6.0,
        minimumPayment: 0,
        loanType: "federal",
        subsidizedType: "unsubsidized",
      },
    ]);
  }, []);

  const updateLoan = useCallback((updatedLoan: Loan) => {
    setLoans((prev) =>
      prev.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan))
    );
  }, []);

  const removeLoan = useCallback((id: string) => {
    setLoans((prev) => prev.filter((loan) => loan.id !== id));
  }, []);

  // Calculate repayment plans
  const repaymentPlans = useMemo((): RepaymentPlan[] => {
    if (totalBalance === 0) return [];

    const plans: RepaymentPlan[] = [];

    // Standard 10-year
    const standard10Payment = calculateMonthlyPayment(totalBalance, weightedAvgRate, 120);
    const standard10 = calculateTotalPaid(totalBalance, weightedAvgRate, standard10Payment);
    plans.push({
      name: "Standard (10-year)",
      monthlyPayment: standard10Payment,
      totalPaid: standard10.totalPaid,
      totalInterest: standard10.totalInterest,
      payoffMonths: standard10.months,
    });

    // Extended 25-year
    const extended25Payment = calculateMonthlyPayment(totalBalance, weightedAvgRate, 300);
    const extended25 = calculateTotalPaid(totalBalance, weightedAvgRate, extended25Payment);
    plans.push({
      name: "Extended (25-year)",
      monthlyPayment: extended25Payment,
      totalPaid: extended25.totalPaid,
      totalInterest: extended25.totalInterest,
      payoffMonths: extended25.months,
    });

    // Graduated (starts low, increases every 2 years)
    // Approximation: average is ~110% of standard payment
    const graduatedAvgPayment = standard10Payment * 0.6; // starts lower
    const graduated = calculateTotalPaid(totalBalance, weightedAvgRate, graduatedAvgPayment);
    plans.push({
      name: "Graduated (10-year)",
      monthlyPayment: graduatedAvgPayment,
      totalPaid: graduated.totalPaid * 1.15, // Graduated typically costs 10-15% more
      totalInterest: graduated.totalInterest * 1.15,
      payoffMonths: 120, // Fixed 10 years
    });

    // Income-Driven Plans (only for federal loans)
    if (federalBalance > 0) {
      const discretionaryIncome = calculateDiscretionaryIncome(annualIncome, familySize);

      Object.entries(IDR_PLANS).forEach(([key, plan]) => {
        let monthlyPayment: number;
        let forgivenessYears = plan.forgivenessYears;

        if (key === "SAVE" && federalBalance <= plan.undergradThreshold!) {
          // SAVE has 5% for undergrad loans
          monthlyPayment = (discretionaryIncome * (plan.undergrad || 0.10)) / 12;
        } else {
          monthlyPayment = (discretionaryIncome * plan.discretionaryPercent) / 12;
        }

        // Calculate what happens over forgiveness period
        let balance = federalBalance;
        let totalPaid = 0;
        const monthlyRate = weightedAvgRate / 100 / 12;

        for (let month = 0; month < forgivenessYears * 12; month++) {
          if (balance <= 0) break;
          const interest = balance * monthlyRate;
          const payment = Math.min(monthlyPayment, balance + interest);
          balance = balance + interest - payment;
          totalPaid += payment;
        }

        const forgiveness = Math.max(0, balance);

        plans.push({
          name: plan.name,
          monthlyPayment,
          totalPaid,
          totalInterest: totalPaid - federalBalance + forgiveness,
          payoffMonths: forgivenessYears * 12,
          forgivenessAmount: forgiveness,
          forgivenessYear: forgivenessYears,
        });
      });
    }

    return plans.sort((a, b) => a.totalPaid - b.totalPaid);
  }, [totalBalance, weightedAvgRate, federalBalance, annualIncome, familySize]);

  // PSLF calculations
  const pslfProjection = useMemo((): PSLFProjection | null => {
    if (!isEligibleEmployer || federalBalance === 0) return null;

    const paymentsRemaining = Math.max(0, 120 - paymentsMade);
    const monthsToForgiveness = paymentsRemaining;

    // Use SAVE/IDR payment amount
    const discretionaryIncome = calculateDiscretionaryIncome(annualIncome, familySize);
    const monthlyPayment = (discretionaryIncome * 0.10) / 12;

    // Calculate balance at forgiveness
    let balance = federalBalance;
    let totalPaid = monthlyPayment * paymentsMade; // Already paid
    const monthlyRate = weightedAvgRate / 100 / 12;

    for (let month = 0; month < paymentsRemaining; month++) {
      const interest = balance * monthlyRate;
      const payment = Math.min(monthlyPayment, balance + interest);
      balance = balance + interest - payment;
      totalPaid += payment;
    }

    const forgivenessDate = new Date();
    forgivenessDate.setMonth(forgivenessDate.getMonth() + paymentsRemaining);

    // Compare to standard 10-year
    const standardPayment = calculateMonthlyPayment(federalBalance, weightedAvgRate, 120);
    const standardTotal = standardPayment * 120;

    return {
      eligiblePaymentsMade: paymentsMade,
      paymentsRemaining,
      projectedForgivenessDate: forgivenessDate,
      amountForgiven: Math.max(0, balance),
      amountPaid: totalPaid,
      totalSavings: standardTotal - totalPaid,
    };
  }, [isEligibleEmployer, federalBalance, paymentsMade, annualIncome, familySize, weightedAvgRate]);

  // Refinance analysis
  const refinanceAnalysis = useMemo((): RefinanceAnalysis | null => {
    if (totalBalance === 0) return null;

    const currentPayment = totalMinPayment + extraPayment;
    const currentResult = calculateTotalPaid(totalBalance, weightedAvgRate, currentPayment);

    const newPayment = calculateMonthlyPayment(totalBalance, refinanceRate, refinanceTerm * 12);
    const newResult = calculateTotalPaid(totalBalance, refinanceRate, newPayment);

    const warnings: string[] = [];

    // Check for federal loan warnings
    if (federalBalance > 0) {
      warnings.push("Refinancing federal loans makes them PRIVATE - you lose IDR options, PSLF eligibility, and federal protections");
      if (isEligibleEmployer) {
        warnings.push("You are pursuing PSLF! Do NOT refinance federal loans");
      }
    }

    const shouldRefinance =
      refinanceRate < weightedAvgRate - 0.5 &&
      federalBalance === 0 && // Only recommend for private loans
      newResult.totalPaid < currentResult.totalPaid;

    return {
      currentMonthlyPayment: currentPayment,
      currentTotalPaid: currentResult.totalPaid,
      newMonthlyPayment: newPayment,
      newTotalPaid: newResult.totalPaid,
      monthlySavings: currentPayment - newPayment,
      totalSavings: currentResult.totalPaid - newResult.totalPaid,
      breakEvenMonths: Math.ceil(currentResult.months / 2), // Approximate
      shouldRefinance,
      warnings,
    };
  }, [totalBalance, totalMinPayment, extraPayment, weightedAvgRate, refinanceRate, refinanceTerm, federalBalance, isEligibleEmployer]);

  // Payoff vs Invest analysis
  const payoffVsInvest = useMemo(() => {
    const avgMarketReturn = 7; // Historical average
    const highInterestThreshold = 6;

    const highRateLoans = loans.filter((l) => l.interestRate >= highInterestThreshold);
    const lowRateLoans = loans.filter((l) => l.interestRate < highInterestThreshold);

    const highRateBalance = highRateLoans.reduce((sum, l) => sum + l.balance, 0);
    const lowRateBalance = lowRateLoans.reduce((sum, l) => sum + l.balance, 0);

    return {
      highRateLoans,
      lowRateLoans,
      highRateBalance,
      lowRateBalance,
      recommendation:
        highRateBalance > 0
          ? "Pay off high-interest loans first"
          : "Consider investing extra cash instead of aggressive loan payoff",
      avgMarketReturn,
      highInterestThreshold,
    };
  }, [loans]);

  // Retirement integration
  const retirementAnalysis = useMemo(() => {
    const monthlyIncome = annualIncome / 12;
    const matchValue = hasEmployerMatch
      ? Math.min(currentRetirementContribution, matchPercent) * monthlyIncome / 100
      : 0;

    const annualMatchValue = matchValue * 12;
    const freeMoneyLost = hasEmployerMatch && currentRetirementContribution < matchPercent
      ? (matchPercent - currentRetirementContribution) * annualIncome / 100
      : 0;

    return {
      monthlyMatchValue: matchValue,
      annualMatchValue,
      freeMoneyLost,
      recommendation:
        freeMoneyLost > 0
          ? `Increase 401k contribution to ${matchPercent}% to capture ${formatCurrency(freeMoneyLost)}/year in free money`
          : "You are capturing the full employer match - great!",
      effectiveReturnOnMatch: hasEmployerMatch ? 100 : 0, // 100% instant return
    };
  }, [annualIncome, hasEmployerMatch, matchPercent, currentRetirementContribution]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            Student Loan Optimizer
          </CardTitle>
          <CardDescription>
            Analyze repayment strategies, compare plans, and optimize your path to debt freedom
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <div className="text-sm text-blue-700 dark:text-blue-400">Total Balance</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(totalBalance)}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
              <div className="text-sm text-orange-700 dark:text-orange-400">Avg Interest Rate</div>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {weightedAvgRate.toFixed(2)}%
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <div className="text-sm text-green-700 dark:text-green-400">Min. Payment</div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalMinPayment)}/mo
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
              <div className="text-sm text-purple-700 dark:text-purple-400">Federal Loans</div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(federalBalance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="loans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="repayment">Repayment</TabsTrigger>
          <TabsTrigger value="pslf">PSLF</TabsTrigger>
          <TabsTrigger value="idr">IDR Plans</TabsTrigger>
          <TabsTrigger value="refinance">Refinance</TabsTrigger>
          <TabsTrigger value="payoff">Payoff vs Invest</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
        </TabsList>

        {/* ============================================= */}
        {/* TAB 1: LOANS INPUT */}
        {/* ============================================= */}
        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Your Student Loans
              </CardTitle>
              <CardDescription>
                Enter all your student loans for comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loans.map((loan) => (
                <LoanInputCard
                  key={loan.id}
                  loan={loan}
                  onUpdate={updateLoan}
                  onRemove={removeLoan}
                  canRemove={loans.length > 1}
                />
              ))}

              <Button
                variant="outline"
                onClick={addLoan}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Loan
              </Button>

              {/* Income Input */}
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-4">Your Income (for IDR calculations)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Annual Gross Income</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Family Size</label>
                    <Select
                      value={familySize.toString()}
                      onValueChange={(value) => setFamilySize(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} {size === 1 ? "person" : "people"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 2: REPAYMENT STRATEGY COMPARISON */}
        {/* ============================================= */}
        <TabsContent value="repayment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Repayment Strategy Comparison
              </CardTitle>
              <CardDescription>
                Compare all repayment options to find the best fit for your situation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {repaymentPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter your loan details to see repayment comparisons
                </div>
              ) : (
                <div className="space-y-3">
                  {repaymentPlans.map((plan, index) => {
                    const isBest = index === 0;
                    const isIDR = plan.forgivenessAmount !== undefined && plan.forgivenessAmount > 0;

                    return (
                      <div
                        key={plan.name}
                        className={cn(
                          "rounded-lg p-4 border transition-all",
                          isBest
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                        )}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {isBest && (
                              <Badge className="bg-green-600">Lowest Cost</Badge>
                            )}
                            <span className="font-semibold">{plan.name}</span>
                            {isIDR && (
                              <Badge variant="outline" className="text-purple-600 border-purple-300">
                                Forgiveness
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Monthly</div>
                              <div className="font-semibold">{formatCurrency(plan.monthlyPayment)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Total Paid</div>
                              <div className="font-semibold">{formatCurrency(plan.totalPaid)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Interest</div>
                              <div className="font-semibold text-red-600">
                                {formatCurrency(plan.totalInterest)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Payoff</div>
                              <div className="font-semibold">
                                {Math.ceil(plan.payoffMonths / 12)} years
                              </div>
                            </div>
                          </div>
                        </div>
                        {isIDR && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              <Info className="h-4 w-4 text-purple-600" />
                              <span>
                                <strong>{formatCurrency(plan.forgivenessAmount!)}</strong> forgiven after{" "}
                                {plan.forgivenessYear} years
                              </span>
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Taxable Income
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra Payment Simulator */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold mb-3">Extra Payment Impact</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">Extra/month:</span>
                    <Slider
                      value={[extraPayment]}
                      onValueChange={([value]) => setExtraPayment(value)}
                      min={0}
                      max={1000}
                      step={50}
                      className="flex-1"
                    />
                    <span className="font-semibold w-20 text-right">
                      {formatCurrency(extraPayment)}
                    </span>
                  </div>
                  {extraPayment > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm">
                            Paying an extra <strong>{formatCurrency(extraPayment)}/month</strong> will save you{" "}
                            <strong>
                              {formatCurrency(
                                calculateTotalPaid(totalBalance, weightedAvgRate, totalMinPayment).totalInterest -
                                calculateTotalPaid(totalBalance, weightedAvgRate, totalMinPayment + extraPayment).totalInterest
                              )}
                            </strong>{" "}
                            in interest and pay off your loans{" "}
                            <strong>
                              {Math.round(
                                (calculateTotalPaid(totalBalance, weightedAvgRate, totalMinPayment).months -
                                  calculateTotalPaid(totalBalance, weightedAvgRate, totalMinPayment + extraPayment).months) /
                                12
                              )}
                            </strong>{" "}
                            years earlier.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 3: PSLF CALCULATOR */}
        {/* ============================================= */}
        <TabsContent value="pslf">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Public Service Loan Forgiveness (PSLF)
              </CardTitle>
              <CardDescription>
                Track your progress toward tax-free loan forgiveness after 120 qualifying payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {federalBalance === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                        No Federal Loans Detected
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        PSLF only applies to federal student loans. Add your federal loans to see PSLF projections.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Eligibility Check */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Do you work for a qualifying employer?</span>
                      <div className="flex gap-2">
                        <Button
                          variant={isEligibleEmployer ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsEligibleEmployer(true)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Yes
                        </Button>
                        <Button
                          variant={!isEligibleEmployer ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsEligibleEmployer(false)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          No
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                      <h5 className="font-medium mb-2">Qualifying Employers Include:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Government organizations (federal, state, local, tribal)</li>
                        <li>501(c)(3) non-profit organizations</li>
                        <li>Other non-profits providing qualifying public services</li>
                        <li>AmeriCorps or Peace Corps (full-time)</li>
                      </ul>
                    </div>

                    {isEligibleEmployer && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Qualifying Payments Made (out of 120)
                        </label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[paymentsMade]}
                            onValueChange={([value]) => setPaymentsMade(value)}
                            min={0}
                            max={120}
                            step={1}
                            className="flex-1"
                          />
                          <span className="font-semibold w-16 text-right">{paymentsMade}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all"
                            style={{ width: `${(paymentsMade / 120) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{paymentsMade} payments made</span>
                          <span>{120 - paymentsMade} remaining</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PSLF Projection */}
                  {pslfProjection && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                          <div className="text-sm text-green-700 dark:text-green-400">Amount Forgiven</div>
                          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {formatCurrency(pslfProjection.amountForgiven)}
                          </div>
                          <div className="text-xs text-green-600">Tax-free!</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                          <div className="text-sm text-blue-700 dark:text-blue-400">Total Savings</div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {formatCurrency(pslfProjection.totalSavings)}
                          </div>
                          <div className="text-xs text-blue-600">vs standard repayment</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                          <div className="text-sm text-purple-700 dark:text-purple-400">Forgiveness Date</div>
                          <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {pslfProjection.projectedForgivenessDate.toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-purple-600">
                            {Math.ceil(pslfProjection.paymentsRemaining / 12)} years away
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                          <div className="text-sm text-orange-700 dark:text-orange-400">You Will Pay</div>
                          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                            {formatCurrency(pslfProjection.amountPaid)}
                          </div>
                          <div className="text-xs text-orange-600">total over 10 years</div>
                        </div>
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                              PSLF Key Benefits
                            </p>
                            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-disc list-inside">
                              <li>Forgiveness is completely TAX-FREE (unlike IDR forgiveness)</li>
                              <li>Only 120 payments required (10 years) vs 20-25 years for IDR</li>
                              <li>Can use any IDR plan - SAVE gives lowest payments</li>
                              <li>Submit PSLF form annually to track progress</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEligibleEmployer && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Consider switching to a qualifying employer to benefit from PSLF. Even if you have
                        been repaying for years, those payments don't count toward PSLF unless made while
                        working for a qualifying employer.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 4: INCOME-DRIVEN REPAYMENT */}
        {/* ============================================= */}
        <TabsContent value="idr">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                Income-Driven Repayment (IDR) Plans
              </CardTitle>
              <CardDescription>
                Pay based on your income with forgiveness after 20-25 years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {federalBalance === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  IDR plans only apply to federal loans. Add your federal loans to see IDR options.
                </div>
              ) : (
                <>
                  {/* IDR Plan Details */}
                  <div className="space-y-4">
                    {Object.entries(IDR_PLANS).map(([key, plan]) => {
                      const discretionaryIncome = calculateDiscretionaryIncome(annualIncome, familySize);
                      const monthlyPayment = (discretionaryIncome * plan.discretionaryPercent) / 12;

                      return (
                        <div
                          key={key}
                          className="bg-gray-50 dark:bg-gray-900/50 border rounded-lg p-4"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h4 className="font-semibold">{plan.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {(plan.discretionaryPercent * 100).toFixed(0)}% of discretionary income
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Est. Monthly</div>
                                <div className="text-xl font-bold">{formatCurrency(monthlyPayment)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Forgiveness</div>
                                <div className="font-semibold">{plan.forgivenessYears} years</div>
                              </div>
                            </div>
                          </div>
                          {key === "SAVE" && (
                            <div className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
                              Lowest payment option - only 5% for undergrad loans under $12k
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tax Bomb Warning */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          Tax Bomb Warning
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                          When your loans are forgiven under IDR (20-25 years), the forgiven amount is
                          treated as <strong>taxable income</strong>. This can result in a significant
                          tax bill.
                        </p>
                        <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-3 mt-2">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Example: If $50,000 is forgiven and you're in the 22% tax bracket:
                          </p>
                          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                            Tax bill: ~{formatCurrency(50000 * 0.22)}
                          </p>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                          Note: PSLF forgiveness is NOT taxable. Consider starting a sinking fund
                          to save for the tax bill if pursuing IDR forgiveness.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Discretionary Income Breakdown */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">How Your Payment is Calculated</h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Your Annual Income:</span>
                        <span className="font-semibold">{formatCurrency(annualIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>150% of Poverty Line (family of {familySize}):</span>
                        <span className="font-semibold">
                          {formatCurrency((FEDERAL_POVERTY_LINE_2024 + (familySize - 1) * POVERTY_LINE_FAMILY_INCREMENT) * 1.5)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-medium">Discretionary Income:</span>
                        <span className="font-bold text-indigo-600">
                          {formatCurrency(calculateDiscretionaryIncome(annualIncome, familySize))}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 5: REFINANCING ANALYSIS */}
        {/* ============================================= */}
        <TabsContent value="refinance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-teal-600" />
                Refinancing Analysis
              </CardTitle>
              <CardDescription>
                Should you refinance? Compare rates and understand the trade-offs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Federal Loan Warning */}
              {federalBalance > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Warning: You Have Federal Loans
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                        Refinancing federal loans with a private lender means you will <strong>permanently lose</strong>:
                      </p>
                      <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                        <li>Income-driven repayment options</li>
                        <li>PSLF eligibility (tax-free forgiveness)</li>
                        <li>IDR forgiveness after 20-25 years</li>
                        <li>Federal forbearance and deferment options</li>
                        <li>Potential future loan forgiveness programs</li>
                      </ul>
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100 mt-3">
                        Only refinance federal loans if you are 100% certain you will never need these benefits
                        AND you can get a significantly lower rate.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refinance Calculator */}
              <div className="space-y-4">
                <h4 className="font-semibold">Refinancing Scenario</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">New Interest Rate (%)</label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[refinanceRate]}
                        onValueChange={([value]) => setRefinanceRate(value)}
                        min={2}
                        max={12}
                        step={0.25}
                        className="flex-1"
                      />
                      <span className="font-semibold w-16 text-right">{refinanceRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">New Loan Term</label>
                    <Select
                      value={refinanceTerm.toString()}
                      onValueChange={(value) => setRefinanceTerm(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 years</SelectItem>
                        <SelectItem value="7">7 years</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Comparison Results */}
              {refinanceAnalysis && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                      <h5 className="font-semibold mb-3">Current Situation</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Interest Rate:</span>
                          <span className="font-semibold">{weightedAvgRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Payment:</span>
                          <span className="font-semibold">
                            {formatCurrency(refinanceAnalysis.currentMonthlyPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Repayment:</span>
                          <span className="font-semibold">
                            {formatCurrency(refinanceAnalysis.currentTotalPaid)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "rounded-lg p-4 border",
                        refinanceAnalysis.shouldRefinance
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-gray-50 dark:bg-gray-900/50"
                      )}
                    >
                      <h5 className="font-semibold mb-3">After Refinancing</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Interest Rate:</span>
                          <span className="font-semibold">{refinanceRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Payment:</span>
                          <span className="font-semibold">
                            {formatCurrency(refinanceAnalysis.newMonthlyPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Repayment:</span>
                          <span className="font-semibold">
                            {formatCurrency(refinanceAnalysis.newTotalPaid)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Savings Summary */}
                  <div
                    className={cn(
                      "rounded-lg p-4 border",
                      refinanceAnalysis.totalSavings > 0
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {refinanceAnalysis.totalSavings > 0 ? "Total Savings" : "Additional Cost"}
                        </p>
                        <p className="text-3xl font-bold">
                          {formatCurrency(Math.abs(refinanceAnalysis.totalSavings))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Monthly Difference</p>
                        <p className="text-xl font-semibold">
                          {refinanceAnalysis.monthlySavings >= 0 ? "Save " : "Pay "}
                          {formatCurrency(Math.abs(refinanceAnalysis.monthlySavings))}/mo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div
                    className={cn(
                      "rounded-lg p-4 border",
                      refinanceAnalysis.shouldRefinance
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {refinanceAnalysis.shouldRefinance ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      )}
                      <div>
                        <p
                          className={cn(
                            "font-semibold mb-1",
                            refinanceAnalysis.shouldRefinance
                              ? "text-green-900 dark:text-green-100"
                              : "text-amber-900 dark:text-amber-100"
                          )}
                        >
                          {refinanceAnalysis.shouldRefinance
                            ? "Refinancing May Be Beneficial"
                            : "Refinancing Not Recommended"}
                        </p>
                        <p
                          className={cn(
                            "text-sm",
                            refinanceAnalysis.shouldRefinance
                              ? "text-green-800 dark:text-green-200"
                              : "text-amber-800 dark:text-amber-200"
                          )}
                        >
                          {refinanceAnalysis.shouldRefinance
                            ? `You could save ${formatCurrency(refinanceAnalysis.totalSavings)} over the life of the loan.`
                            : federalBalance > 0
                            ? "Keep your federal loans to maintain access to IDR and forgiveness programs."
                            : "The new rate doesn't provide significant savings."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* When to Refinance Guide */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">When Refinancing Makes Sense</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <h5 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Good Candidates
                    </h5>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                      <li>Private loans only (no federal benefits to lose)</li>
                      <li>Excellent credit score (760+)</li>
                      <li>Stable, high income</li>
                      <li>Can get rate 1%+ lower than current</li>
                      <li>Don't need forbearance flexibility</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <h5 className="font-medium text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Avoid Refinancing If
                    </h5>
                    <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                      <li>You work in public service (PSLF!)</li>
                      <li>Planning to use IDR/forgiveness</li>
                      <li>Unstable employment</li>
                      <li>Large federal loan balance</li>
                      <li>May need forbearance in future</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 6: PAYOFF VS INVEST */}
        {/* ============================================= */}
        <TabsContent value="payoff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Pay Off Loans vs. Invest Extra Cash
              </CardTitle>
              <CardDescription>
                Should you aggressively pay down debt or invest the difference?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interest Rate Analysis */}
              <div className="space-y-4">
                <h4 className="font-semibold">Your Loans by Interest Rate</h4>

                {payoffVsInvest.highRateLoans.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <h5 className="font-medium text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      High Interest ({">"}={payoffVsInvest.highInterestThreshold}%) - Pay These First!
                    </h5>
                    <div className="space-y-2">
                      {payoffVsInvest.highRateLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="flex justify-between text-sm bg-red-100 dark:bg-red-900/30 rounded p-2"
                        >
                          <span>{loan.name}</span>
                          <span className="font-semibold">
                            {loan.interestRate}% - {formatCurrency(loan.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                      Total: <strong>{formatCurrency(payoffVsInvest.highRateBalance)}</strong>
                    </p>
                  </div>
                )}

                {payoffVsInvest.lowRateLoans.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <h5 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Lower Interest ({"<"}{payoffVsInvest.highInterestThreshold}%) - Consider Investing Instead
                    </h5>
                    <div className="space-y-2">
                      {payoffVsInvest.lowRateLoans.map((loan) => (
                        <div
                          key={loan.id}
                          className="flex justify-between text-sm bg-green-100 dark:bg-green-900/30 rounded p-2"
                        >
                          <span>{loan.name}</span>
                          <span className="font-semibold">
                            {loan.interestRate}% - {formatCurrency(loan.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                      Total: <strong>{formatCurrency(payoffVsInvest.lowRateBalance)}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* The Math */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">The Math</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 mb-2">
                      <strong>Paying off a 6% loan</strong> is like earning a guaranteed 6% return on your money.
                    </p>
                    <p className="text-blue-800 dark:text-blue-200">
                      <strong>Investing in stocks</strong> has historically returned ~7% annually (after inflation).
                    </p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-3">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">The Rule of Thumb:</p>
                    <ul className="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li><strong>{">"} 6-7%:</strong> Pay off the loan first</li>
                      <li><strong>4-6%:</strong> It's a toss-up - either is fine</li>
                      <li><strong>{"<"} 4%:</strong> Consider investing instead</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Psychological Factor */}
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      The Psychological Factor
                    </p>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      Math aside, there's huge value in being <strong>debt-free</strong>. Studies show that
                      eliminating debt reduces stress and improves decision-making. If carrying debt bothers you,
                      paying it off faster - even "low interest" debt - might be worth the potential opportunity cost.
                    </p>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mt-2">
                      <strong>The best plan is one you'll actually follow.</strong> If aggressively paying off loans
                      keeps you motivated, that's worth something.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">Our Recommendation</h4>
                <p className="text-sm text-muted-foreground">{payoffVsInvest.recommendation}</p>
                {payoffVsInvest.highRateBalance > 0 && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-900/30 rounded">
                    <p className="text-sm font-medium">Suggested Order:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside mt-1">
                      <li>Get employer 401k match (free money!)</li>
                      <li>Build small emergency fund ($1,000)</li>
                      <li>Pay off high-interest debt ({">"}6%)</li>
                      <li>Build full emergency fund (3-6 months)</li>
                      <li>Max out retirement accounts OR pay low-interest debt</li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================= */}
        {/* TAB 7: RETIREMENT INTEGRATION */}
        {/* ============================================= */}
        <TabsContent value="retirement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-amber-600" />
                Balancing Loans + Retirement
              </CardTitle>
              <CardDescription>
                Don't let student loans derail your retirement - here's how to balance both
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employer Match */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  401(k) Employer Match
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Does your employer offer a match?</label>
                    <div className="flex gap-2">
                      <Button
                        variant={hasEmployerMatch ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHasEmployerMatch(true)}
                      >
                        Yes
                      </Button>
                      <Button
                        variant={!hasEmployerMatch ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHasEmployerMatch(false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>

                  {hasEmployerMatch && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Match up to (% of salary)</label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[matchPercent]}
                            onValueChange={([value]) => setMatchPercent(value)}
                            min={1}
                            max={10}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="font-semibold w-12 text-right">{matchPercent}%</span>
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm text-muted-foreground">
                          Your current contribution (% of salary)
                        </label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[currentRetirementContribution]}
                            onValueChange={([value]) => setCurrentRetirementContribution(value)}
                            min={0}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <span className="font-semibold w-12 text-right">
                            {currentRetirementContribution}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Match Analysis */}
                {hasEmployerMatch && (
                  <div
                    className={cn(
                      "rounded-lg p-4 border",
                      retirementAnalysis.freeMoneyLost > 0
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                        : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {retirementAnalysis.freeMoneyLost > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      )}
                      <div>
                        <p
                          className={cn(
                            "font-semibold mb-1",
                            retirementAnalysis.freeMoneyLost > 0
                              ? "text-red-900 dark:text-red-100"
                              : "text-green-900 dark:text-green-100"
                          )}
                        >
                          {retirementAnalysis.freeMoneyLost > 0
                            ? `You're Leaving ${formatCurrency(retirementAnalysis.freeMoneyLost)}/year on the Table!`
                            : "You're Capturing the Full Match!"}
                        </p>
                        <p
                          className={cn(
                            "text-sm",
                            retirementAnalysis.freeMoneyLost > 0
                              ? "text-red-800 dark:text-red-200"
                              : "text-green-800 dark:text-green-200"
                          )}
                        >
                          {retirementAnalysis.recommendation}
                        </p>
                        {retirementAnalysis.freeMoneyLost > 0 && (
                          <p className="text-sm mt-2 font-medium text-red-900 dark:text-red-100">
                            The employer match is a 100% instant return on your money - no loan has an interest
                            rate that high! Always get the match before extra loan payments.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Employer Repayment Benefit */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Employer Student Loan Repayment (SECURE 2.0)
                </h4>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Tax-Free Student Loan Assistance
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        Under SECURE 2.0, employers can contribute up to <strong>{formatCurrency(SECURE_2_TAX_FREE_LIMIT)}/year</strong>{" "}
                        toward your student loans tax-free. This benefit was extended through 2025.
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Ask your HR department if this benefit is available!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Annual employer contribution to your loans
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[employerContribution]}
                      onValueChange={([value]) => setEmployerContribution(value)}
                      min={0}
                      max={5250}
                      step={250}
                      className="flex-1"
                    />
                    <span className="font-semibold w-20 text-right">
                      {formatCurrency(employerContribution)}
                    </span>
                  </div>
                </div>

                {employerContribution > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      That's <strong>{formatCurrency(employerContribution)}/year</strong> or{" "}
                      <strong>{formatCurrency(employerContribution / 12)}/month</strong> extra toward your loans -
                      tax-free! Over the life of your loans, this could save you thousands in interest.
                    </p>
                  </div>
                )}
              </div>

              {/* Priority Order */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">The Right Priority Order</h4>
                <div className="space-y-3">
                  {[
                    {
                      step: 1,
                      title: "Get the full 401(k) match",
                      description: "100% instant return beats any loan interest rate",
                      highlight: hasEmployerMatch && currentRetirementContribution < matchPercent,
                    },
                    {
                      step: 2,
                      title: "Build mini emergency fund",
                      description: "$1,000-2,000 to avoid new debt for emergencies",
                      highlight: false,
                    },
                    {
                      step: 3,
                      title: "Pay high-interest debt (>6%)",
                      description: "Guaranteed return equal to the interest rate",
                      highlight: payoffVsInvest.highRateBalance > 0,
                    },
                    {
                      step: 4,
                      title: "Build full emergency fund",
                      description: "3-6 months of expenses",
                      highlight: false,
                    },
                    {
                      step: 5,
                      title: "Max retirement OR pay low-rate debt",
                      description: "Your choice based on goals and psychology",
                      highlight: false,
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        item.highlight
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                          : "bg-gray-50 dark:bg-gray-900/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                          item.highlight
                            ? "bg-amber-600 text-white"
                            : "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {item.step}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      {item.highlight && (
                        <Badge className="ml-auto bg-amber-600">Focus Here</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* When Loans Delay Retirement */}
              <div className="bg-gray-50 dark:bg-gray-900/50 border rounded-lg p-4">
                <h4 className="font-semibold mb-2">When Student Loans Delay Retirement</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Student loans can delay retirement if they prevent you from saving adequately. Here's the impact:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Your current monthly loan payment:</span>
                    <span className="font-semibold">{formatCurrency(totalMinPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>If invested over 30 years at 7%:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(totalMinPayment * 12 * ((Math.pow(1.07, 30) - 1) / 0.07))}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  This is why getting rid of loans faster (when mathematically sensible) or choosing an
                  efficient repayment strategy matters so much for your long-term wealth.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Strategy Summary Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Your Personalized Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-blue-900 dark:text-blue-100">Quick Wins:</h5>
              <ul className="text-sm space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                {hasEmployerMatch && currentRetirementContribution < matchPercent && (
                  <li>Increase 401k to {matchPercent}% to get full match</li>
                )}
                {employerContribution === 0 && (
                  <li>Ask HR about student loan repayment benefit</li>
                )}
                {payoffVsInvest.highRateBalance > 0 && (
                  <li>Focus extra payments on high-interest loans</li>
                )}
                {federalBalance > 0 && !isEligibleEmployer && (
                  <li>Consider public service for PSLF eligibility</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-blue-900 dark:text-blue-100">Key Numbers:</h5>
              <div className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                <p>Total debt: <strong>{formatCurrency(totalBalance)}</strong></p>
                <p>Weighted rate: <strong>{weightedAvgRate.toFixed(2)}%</strong></p>
                <p>Monthly minimum: <strong>{formatCurrency(totalMinPayment)}</strong></p>
                {repaymentPlans.length > 0 && (
                  <p>
                    Best strategy: <strong>{repaymentPlans[0].name}</strong> ({formatCurrency(repaymentPlans[0].totalPaid)} total)
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

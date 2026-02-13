"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericInput } from "@/components/form/NumericInput";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Baby,
  Home,
  Heart,
  Gift,
  Target,
  Calculator,
  Users,
  Info,
  Briefcase,
  Calendar,
} from "lucide-react";
import {
  TAX_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  type FilingStatus,
  type PayFrequency,
  getPeriodsPerYear,
  getMarginalRate,
  SE_TAX_2026,
} from "@/lib/constants/tax2026";

// =============================================================================
// TYPES
// =============================================================================

interface PayStubInfo {
  grossPay: number;
  federalWithholding: number;
  payFrequency: PayFrequency;
  ytdGross: number;
  ytdFederalWithholding: number;
  payPeriodsRemaining: number;
}

interface IncomeInfo {
  annualWages: number;
  spouseWages: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  expectedBonuses: number;
}

interface DeductionInfo {
  useStandardDeduction: boolean;
  itemizedDeductions: number;
  traditional401k: number;
  traditionalIRA: number;
  hsaContributions: number;
  studentLoanInterest: number;
}

interface CreditInfo {
  childrenUnder17: number;
  childrenOther: number;
  childCareExpenses: number;
  educationCredits: number;
  otherCredits: number;
}

interface LifeEvent {
  type: "marriage" | "baby" | "homePurchase" | "bonus" | "jobChange" | "retirement";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  withholdingImpact: "increase" | "decrease" | "varies";
  adjustmentTip: string;
}

interface W4Recommendation {
  extraWithholding: number;
  additionalIncome: number;
  deductions: number;
  dependentCredits: number;
  explanation: string;
  confidence: "high" | "medium" | "low";
}

interface TwoEarnerAnalysis {
  combinedIncome: number;
  combinedWithholding: number;
  estimatedTaxLiability: number;
  underwithholding: number;
  higherEarnerAdjustment: number;
  explanation: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPPLEMENTAL_WITHHOLDING_RATE = 0.22; // 22% flat rate for bonuses

const LIFE_EVENTS: LifeEvent[] = [
  {
    type: "marriage",
    description: "Getting Married",
    icon: Heart,
    withholdingImpact: "varies",
    adjustmentTip:
      "Marriage can change your tax bracket significantly. If both spouses work, you may need to increase withholding to avoid underwithholding due to the 'marriage penalty' on dual incomes.",
  },
  {
    type: "baby",
    description: "Having a Baby",
    icon: Baby,
    withholdingImpact: "decrease",
    adjustmentTip:
      "Each child under 17 qualifies for up to $2,000 Child Tax Credit. Update your W-4 to claim dependents and reduce withholding.",
  },
  {
    type: "homePurchase",
    description: "Buying a Home",
    icon: Home,
    withholdingImpact: "decrease",
    adjustmentTip:
      "Mortgage interest and property taxes may push you into itemizing. If your itemized deductions exceed the standard deduction, update W-4 Step 4(b).",
  },
  {
    type: "bonus",
    description: "Receiving a Bonus",
    icon: Gift,
    withholdingImpact: "varies",
    adjustmentTip:
      "Bonuses are withheld at 22% flat rate, which may be too much or too little depending on your marginal bracket. Adjust if your bracket differs significantly from 22%.",
  },
  {
    type: "jobChange",
    description: "Changing Jobs",
    icon: Briefcase,
    withholdingImpact: "varies",
    adjustmentTip:
      "Starting fresh at a new job? Your new employer starts withholding at the annual rate. If you switch mid-year, you may need to increase withholding to make up for the reset.",
  },
  {
    type: "retirement",
    description: "Retiring",
    icon: TrendingUp,
    withholdingImpact: "decrease",
    adjustmentTip:
      "Lower income in retirement typically means lower tax bracket. Adjust pension/IRA withholding using Form W-4P.",
  },
];

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate federal income tax using 2026 brackets
 */
function calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus): number {
  if (taxableIncome <= 0) return 0;

  const brackets = TAX_BRACKETS_2026[filingStatus];
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - previousLimit;
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }
    previousLimit = bracket.max;
    if (taxableIncome <= bracket.max) break;
  }

  return tax;
}

/**
 * Calculate self-employment tax
 */
function calculateSelfEmploymentTax(netEarnings: number): number {
  if (netEarnings <= 0) return 0;

  const seBase = netEarnings * SE_TAX_2026.SE_TAX_BASE_MULTIPLIER;
  const ssTax = Math.min(seBase, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE) * SE_TAX_2026.SOCIAL_SECURITY_RATE;
  const medicareTax = seBase * SE_TAX_2026.MEDICARE_RATE;

  return ssTax + medicareTax;
}

/**
 * Calculate Child Tax Credit
 */
function calculateChildTaxCredit(
  childrenUnder17: number,
  agi: number,
  filingStatus: FilingStatus
): number {
  const creditPerChild = 2000;
  const baseCredit = childrenUnder17 * creditPerChild;

  // Phase-out thresholds
  const threshold = filingStatus === "mfj" ? 400000 : 200000;
  const phaseOutRate = 0.05; // $50 per $1,000 over threshold

  if (agi <= threshold) return baseCredit;

  const excessIncome = agi - threshold;
  const phaseOutAmount = Math.ceil(excessIncome / 1000) * 50;
  return Math.max(0, baseCredit - phaseOutAmount);
}

/**
 * Calculate Child and Dependent Care Credit
 */
function calculateDependentCareCredit(
  expenses: number,
  childrenCount: number,
  agi: number
): number {
  const maxExpenses = childrenCount >= 2 ? 6000 : 3000;
  const qualifyingExpenses = Math.min(expenses, maxExpenses);

  // Credit percentage based on AGI (20-35%)
  let creditPct: number;
  if (agi <= 15000) {
    creditPct = 0.35;
  } else if (agi <= 43000) {
    creditPct = 0.35 - ((agi - 15000) / 2000) * 0.01;
  } else {
    creditPct = 0.20;
  }

  return qualifyingExpenses * creditPct;
}

/**
 * Estimate annual withholding from pay stub
 */
function estimateAnnualWithholding(payStub: PayStubInfo): number {
  const periodsPerYear = getPeriodsPerYear(payStub.payFrequency);
  const periodsElapsed = periodsPerYear - payStub.payPeriodsRemaining;

  if (periodsElapsed > 0) {
    // Use actual YTD data to project
    const avgWithholdingPerPeriod = payStub.ytdFederalWithholding / periodsElapsed;
    return payStub.ytdFederalWithholding + avgWithholdingPerPeriod * payStub.payPeriodsRemaining;
  }

  // If at start of year, use current pay stub
  return payStub.federalWithholding * periodsPerYear;
}

/**
 * Calculate bonus withholding comparison
 */
function analyzeBonusWithholding(
  bonusAmount: number,
  marginalRate: number
): { flatWithholding: number; marginalWithholding: number; difference: number; recommendation: string } {
  const flatWithholding = bonusAmount * SUPPLEMENTAL_WITHHOLDING_RATE;
  const marginalWithholding = bonusAmount * marginalRate;
  const difference = flatWithholding - marginalWithholding;

  let recommendation: string;
  if (Math.abs(difference) < 100) {
    recommendation = "The 22% flat rate is close to your marginal rate. No adjustment needed.";
  } else if (difference > 0) {
    recommendation = `You're overwithheld by ~$${Math.round(difference).toLocaleString()}. Consider requesting the aggregate method or reducing other withholding.`;
  } else {
    recommendation = `You're underwithheld by ~$${Math.round(Math.abs(difference)).toLocaleString()}. Consider adding extra withholding on your W-4.`;
  }

  return { flatWithholding, marginalWithholding, difference, recommendation };
}

/**
 * Generate W-4 recommendations
 */
function generateW4Recommendation(
  estimatedTax: number,
  projectedWithholding: number,
  income: IncomeInfo,
  deductions: DeductionInfo,
  filingStatus: FilingStatus
): W4Recommendation {
  const difference = projectedWithholding - estimatedTax;
  const totalIncome = income.annualWages + income.spouseWages + income.selfEmploymentIncome + income.otherIncome;
  const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus];

  // Calculate deductions amount for W-4 Step 4(b)
  let deductionsAmount = 0;
  if (!deductions.useStandardDeduction && deductions.itemizedDeductions > standardDeduction) {
    deductionsAmount = deductions.itemizedDeductions - standardDeduction;
  }

  // Add above-the-line deductions
  deductionsAmount += deductions.traditional401k + deductions.traditionalIRA + deductions.hsaContributions;
  deductionsAmount += Math.min(deductions.studentLoanInterest, 2500);

  let extraWithholding = 0;
  let additionalIncome = 0;
  let explanation: string;
  let confidence: "high" | "medium" | "low";

  if (difference > 500) {
    // Overwithheld - getting a big refund
    extraWithholding = 0;
    explanation = `You're on track for a ~$${Math.round(difference).toLocaleString()} refund. Consider reducing withholding to keep more in each paycheck. That's ${Math.round(difference / 12).toLocaleString()}/month you could invest or use today.`;
    confidence = "high";
  } else if (difference < -500) {
    // Underwithheld - will owe
    extraWithholding = Math.ceil(Math.abs(difference) / 12); // Monthly extra
    explanation = `You're projected to owe ~$${Math.round(Math.abs(difference)).toLocaleString()}. Add $${extraWithholding} extra withholding per pay period to avoid a tax bill.`;
    confidence = "high";
  } else {
    // Close to zero
    extraWithholding = 0;
    explanation = "You're on track for minimal refund/owed. Your withholding is well-optimized.";
    confidence = "high";
  }

  // Check for complexity that reduces confidence
  if (income.selfEmploymentIncome > 0) {
    confidence = "medium";
    explanation += " Note: Self-employment income requires quarterly estimated payments.";
  }
  if (income.otherIncome > totalIncome * 0.2) {
    confidence = "medium";
    explanation += " Significant other income may require additional adjustments.";
  }

  return {
    extraWithholding: Math.max(0, extraWithholding),
    additionalIncome: income.otherIncome + income.selfEmploymentIncome,
    deductions: deductionsAmount,
    dependentCredits: 0, // Calculated separately
    explanation,
    confidence,
  };
}

/**
 * Analyze two-earner household
 */
function analyzeTwoEarners(
  wages1: number,
  withholding1: number,
  wages2: number,
  withholding2: number,
  filingStatus: "mfj"
): TwoEarnerAnalysis {
  const combinedIncome = wages1 + wages2;
  const combinedWithholding = withholding1 + withholding2;

  // Calculate what each would owe if single
  const tax1AsSingle = calculateFederalTax(wages1 - STANDARD_DEDUCTION_2026.single, "single");
  const tax2AsSingle = calculateFederalTax(wages2 - STANDARD_DEDUCTION_2026.single, "single");
  const sumAsSingles = tax1AsSingle + tax2AsSingle;

  // Calculate actual MFJ tax
  const mfjTax = calculateFederalTax(combinedIncome - STANDARD_DEDUCTION_2026.mfj, "mfj");

  // Marriage penalty/bonus
  const marriageEffect = mfjTax - sumAsSingles;

  // Withholding gap
  const underwithholding = mfjTax - combinedWithholding;

  // Higher earner should adjust
  const higherWages = Math.max(wages1, wages2);
  const higherEarnerAdjustment = underwithholding > 0 ? Math.ceil(underwithholding / 24) : 0; // Assuming 24 pay periods

  let explanation: string;
  if (underwithholding > 1000) {
    explanation = `Two-earner households often underwithhold by combining single-style withholding. You may owe ~$${Math.round(underwithholding).toLocaleString()}. The higher earner should add ~$${higherEarnerAdjustment}/paycheck extra withholding, or use the IRS Two-Earners Worksheet.`;
  } else if (underwithholding < -1000) {
    explanation = `You're overwithheld by ~$${Math.round(Math.abs(underwithholding)).toLocaleString()}. Consider the Two-Earners/Multiple Jobs Worksheet in W-4 instructions to optimize.`;
  } else {
    explanation = "Your combined withholding is close to your expected tax liability. Good job!";
  }

  if (marriageEffect > 1000) {
    explanation += ` Note: You face a 'marriage penalty' of ~$${Math.round(marriageEffect).toLocaleString()} due to combined income pushing into higher brackets.`;
  } else if (marriageEffect < -1000) {
    explanation += ` Note: You receive a 'marriage bonus' of ~$${Math.round(Math.abs(marriageEffect)).toLocaleString()} compared to filing as singles.`;
  }

  return {
    combinedIncome,
    combinedWithholding,
    estimatedTaxLiability: mfjTax,
    underwithholding,
    higherEarnerAdjustment,
    explanation,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function W4Optimizer() {
  // Filing status
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");

  // Pay stub info
  const [payStub, setPayStub] = useState<PayStubInfo>({
    grossPay: 4000,
    federalWithholding: 400,
    payFrequency: "biweekly",
    ytdGross: 48000,
    ytdFederalWithholding: 4800,
    payPeriodsRemaining: 14,
  });

  // Income info
  const [income, setIncome] = useState<IncomeInfo>({
    annualWages: 75000,
    spouseWages: 0,
    selfEmploymentIncome: 0,
    otherIncome: 0,
    expectedBonuses: 0,
  });

  // Deductions
  const [deductions, setDeductions] = useState<DeductionInfo>({
    useStandardDeduction: true,
    itemizedDeductions: 0,
    traditional401k: 6000,
    traditionalIRA: 0,
    hsaContributions: 0,
    studentLoanInterest: 0,
  });

  // Credits
  const [credits, setCredits] = useState<CreditInfo>({
    childrenUnder17: 0,
    childrenOther: 0,
    childCareExpenses: 0,
    educationCredits: 0,
    otherCredits: 0,
  });

  // Spouse info for two-earner worksheet
  const [spouseWithholding, setSpouseWithholding] = useState<number>(0);

  // Active life events
  const [activeLifeEvents, setActiveLifeEvents] = useState<Set<string>>(new Set());

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  const calculations = useMemo(() => {
    // Total income
    const totalIncome =
      income.annualWages +
      income.spouseWages +
      income.selfEmploymentIncome +
      income.otherIncome +
      income.expectedBonuses;

    // Above-the-line deductions
    const aboveTheLine =
      deductions.traditional401k +
      deductions.traditionalIRA +
      deductions.hsaContributions +
      Math.min(deductions.studentLoanInterest, 2500) +
      (income.selfEmploymentIncome > 0 ? calculateSelfEmploymentTax(income.selfEmploymentIncome) * 0.5 : 0);

    // AGI
    const agi = totalIncome - aboveTheLine;

    // Deduction amount
    const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus];
    const deductionAmount = deductions.useStandardDeduction
      ? standardDeduction
      : Math.max(standardDeduction, deductions.itemizedDeductions);

    // Taxable income
    const taxableIncome = Math.max(0, agi - deductionAmount);

    // Federal income tax
    const federalTax = calculateFederalTax(taxableIncome, filingStatus);

    // Self-employment tax
    const seTax = calculateSelfEmploymentTax(income.selfEmploymentIncome);

    // Credits
    const childTaxCredit = calculateChildTaxCredit(credits.childrenUnder17, agi, filingStatus);
    const childCareCredit = calculateDependentCareCredit(
      credits.childCareExpenses,
      credits.childrenUnder17 + credits.childrenOther,
      agi
    );
    const totalCredits = childTaxCredit + childCareCredit + credits.educationCredits + credits.otherCredits;

    // Total tax liability
    const totalTax = Math.max(0, federalTax + seTax - totalCredits);

    // Projected withholding
    const annualWithholding = estimateAnnualWithholding(payStub);

    // Withholding gap
    const withholdingGap = annualWithholding - totalTax;

    // Marginal rate
    const marginalRate = getMarginalRate(taxableIncome, filingStatus);

    // Bonus analysis
    const bonusAnalysis = income.expectedBonuses > 0
      ? analyzeBonusWithholding(income.expectedBonuses, marginalRate)
      : null;

    // W-4 recommendation
    const recommendation = generateW4Recommendation(
      totalTax,
      annualWithholding,
      income,
      deductions,
      filingStatus
    );

    // Two-earner analysis (if married with spouse income)
    const twoEarnerAnalysis =
      filingStatus === "mfj" && income.spouseWages > 0
        ? analyzeTwoEarners(
            income.annualWages,
            annualWithholding,
            income.spouseWages,
            spouseWithholding,
            "mfj"
          )
        : null;

    return {
      totalIncome,
      agi,
      taxableIncome,
      federalTax,
      seTax,
      totalCredits,
      totalTax,
      annualWithholding,
      withholdingGap,
      marginalRate,
      bonusAnalysis,
      recommendation,
      twoEarnerAnalysis,
    };
  }, [filingStatus, payStub, income, deductions, credits, spouseWithholding]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const toggleLifeEvent = useCallback((eventType: string) => {
    setActiveLifeEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }, []);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatPercent = useCallback((value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const getWithholdingStatus = () => {
    const gap = calculations.withholdingGap;
    if (gap > 1000) {
      return {
        status: "overwithholding",
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: TrendingUp,
        message: "Overwithheld - Getting a refund",
      };
    } else if (gap < -500) {
      return {
        status: "underwithholding",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        icon: TrendingDown,
        message: "Underwithheld - Will owe taxes",
      };
    } else {
      return {
        status: "optimal",
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        icon: Target,
        message: "On target - Minimal refund/owed",
      };
    }
  };

  const withholdingStatus = getWithholdingStatus();
  const StatusIcon = withholdingStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">W-4 Withholding Optimizer</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stop giving the government an interest-free loan. Optimize your W-4 to owe $0 and get $0 back.
        </p>
      </div>

      {/* Main Status Card */}
      <Card className={`border-2 ${withholdingStatus.borderColor} ${withholdingStatus.bgColor}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-6 w-6 ${withholdingStatus.color}`} />
            <CardTitle className="text-2xl">{withholdingStatus.message}</CardTitle>
          </div>
          <CardDescription>Based on your current withholding vs. estimated tax liability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Projected Withholding</p>
              <p className="text-3xl font-bold">{formatCurrency(calculations.annualWithholding)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Estimated Tax Liability</p>
              <p className="text-3xl font-bold">{formatCurrency(calculations.totalTax)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {calculations.withholdingGap >= 0 ? "Expected Refund" : "Expected Owed"}
              </p>
              <p className={`text-3xl font-bold ${withholdingStatus.color}`}>
                {formatCurrency(Math.abs(calculations.withholdingGap))}
              </p>
            </div>
          </div>

          {/* Optimal Zone Visualization */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Underwithholding</span>
              <span className="font-medium">$0 Zone</span>
              <span>Overwithholding</span>
            </div>
            <div className="relative h-4 bg-gradient-to-r from-red-500 via-green-500 to-amber-500 rounded-full">
              {/* Marker showing current position */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow-lg"
                style={{
                  left: `${Math.min(100, Math.max(0, 50 + (calculations.withholdingGap / calculations.totalTax) * 50))}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Owe at tax time</span>
              <span>Interest-free loan to IRS</span>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 p-4 bg-background/50 rounded-lg border">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Recommendation</p>
                <p className="text-sm text-muted-foreground">{calculations.recommendation.explanation}</p>
                <div className="mt-2 flex gap-2">
                  <Badge
                    variant={
                      calculations.recommendation.confidence === "high"
                        ? "default"
                        : calculations.recommendation.confidence === "medium"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {calculations.recommendation.confidence === "high"
                      ? "High Confidence"
                      : calculations.recommendation.confidence === "medium"
                      ? "Medium Confidence"
                      : "Low Confidence"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Tabs */}
      <Tabs defaultValue="paystub" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="paystub">Pay Stub</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="lifeevents">Life Events</TabsTrigger>
        </TabsList>

        {/* Pay Stub Tab */}
        <TabsContent value="paystub" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Withholding Analysis
              </CardTitle>
              <CardDescription>
                Enter information from your most recent pay stub to estimate annual withholding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filingStatus">Filing Status</Label>
                  <Select
                    value={filingStatus}
                    onValueChange={(v) => setFilingStatus(v as FilingStatus)}
                  >
                    <SelectTrigger id="filingStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="mfj">Married Filing Jointly</SelectItem>
                      <SelectItem value="mfs">Married Filing Separately</SelectItem>
                      <SelectItem value="hoh">Head of Household</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payFrequency">Pay Frequency</Label>
                  <Select
                    value={payStub.payFrequency}
                    onValueChange={(v) =>
                      setPayStub((p) => ({ ...p, payFrequency: v as PayFrequency }))
                    }
                  >
                    <SelectTrigger id="payFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly (52/year)</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly (26/year)</SelectItem>
                      <SelectItem value="semimonthly">Semi-monthly (24/year)</SelectItem>
                      <SelectItem value="monthly">Monthly (12/year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grossPay">Gross Pay (this period)</Label>
                  <NumericInput
                    id="grossPay"
                    value={payStub.grossPay}
                    onChange={(v) => setPayStub((p) => ({ ...p, grossPay: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Gross pay this period"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="federalWithholding">Federal Withholding (this period)</Label>
                  <NumericInput
                    id="federalWithholding"
                    value={payStub.federalWithholding}
                    onChange={(v) => setPayStub((p) => ({ ...p, federalWithholding: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Federal withholding this period"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ytdGross">YTD Gross Income</Label>
                  <NumericInput
                    id="ytdGross"
                    value={payStub.ytdGross}
                    onChange={(v) => setPayStub((p) => ({ ...p, ytdGross: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Year to date gross income"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ytdWithholding">YTD Federal Withholding</Label>
                  <NumericInput
                    id="ytdWithholding"
                    value={payStub.ytdFederalWithholding}
                    onChange={(v) => setPayStub((p) => ({ ...p, ytdFederalWithholding: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Year to date federal withholding"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="periodsRemaining">Pay Periods Remaining This Year</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="periodsRemaining"
                      value={[payStub.payPeriodsRemaining]}
                      onValueChange={([v]) =>
                        setPayStub((p) => ({ ...p, payPeriodsRemaining: v }))
                      }
                      min={0}
                      max={getPeriodsPerYear(payStub.payFrequency)}
                      step={1}
                      className="flex-1"
                      thumbLabel="Pay periods remaining"
                    />
                    <span className="w-12 text-center font-medium">
                      {payStub.payPeriodsRemaining}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Income Sources
              </CardTitle>
              <CardDescription>
                Include all income sources for accurate tax estimation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualWages">Your Annual Wages (W-2)</Label>
                  <NumericInput
                    id="annualWages"
                    value={income.annualWages}
                    onChange={(v) => setIncome((p) => ({ ...p, annualWages: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Your annual wages"
                  />
                </div>

                {filingStatus === "mfj" && (
                  <div className="space-y-2">
                    <Label htmlFor="spouseWages">Spouse Annual Wages (W-2)</Label>
                    <NumericInput
                      id="spouseWages"
                      value={income.spouseWages}
                      onChange={(v) => setIncome((p) => ({ ...p, spouseWages: v }))}
                      prefix="$"
                      min={0}
                      aria-label="Spouse annual wages"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="selfEmployment">Self-Employment Income</Label>
                  <NumericInput
                    id="selfEmployment"
                    value={income.selfEmploymentIncome}
                    onChange={(v) => setIncome((p) => ({ ...p, selfEmploymentIncome: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Self-employment income"
                  />
                  {income.selfEmploymentIncome > 0 && (
                    <p className="text-xs text-amber-600">
                      SE Tax: {formatCurrency(calculations.seTax)} - Pay via quarterly estimates
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherIncome">Other Income (Interest, Dividends, etc.)</Label>
                  <NumericInput
                    id="otherIncome"
                    value={income.otherIncome}
                    onChange={(v) => setIncome((p) => ({ ...p, otherIncome: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Other income"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="expectedBonuses">Expected Bonuses This Year</Label>
                  <NumericInput
                    id="expectedBonuses"
                    value={income.expectedBonuses}
                    onChange={(v) => setIncome((p) => ({ ...p, expectedBonuses: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Expected bonuses"
                  />
                </div>
              </div>

              {/* Bonus Withholding Analysis */}
              {calculations.bonusAnalysis && (
                <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="h-5 w-5 text-purple-600" />
                      Bonus Withholding Gotcha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Flat 22% Withholding</p>
                        <p className="font-semibold">
                          {formatCurrency(calculations.bonusAnalysis.flatWithholding)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Your Marginal Rate ({formatPercent(calculations.marginalRate)})
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(calculations.bonusAnalysis.marginalWithholding)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-background/50 rounded-lg">
                      <AlertTriangle
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          Math.abs(calculations.bonusAnalysis.difference) > 100
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      />
                      <p className="text-sm">{calculations.bonusAnalysis.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Two-Earner Worksheet */}
              {filingStatus === "mfj" && income.spouseWages > 0 && (
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Two-Earner Worksheet
                    </CardTitle>
                    <CardDescription>
                      Dual-income households often underwithhold. Let's check.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="spouseWithholding">Spouse's Projected Annual Withholding</Label>
                      <NumericInput
                        id="spouseWithholding"
                        value={spouseWithholding}
                        onChange={setSpouseWithholding}
                        prefix="$"
                        min={0}
                        aria-label="Spouse annual withholding"
                      />
                    </div>

                    {calculations.twoEarnerAnalysis && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Combined Income</p>
                            <p className="font-semibold">
                              {formatCurrency(calculations.twoEarnerAnalysis.combinedIncome)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Combined Withholding</p>
                            <p className="font-semibold">
                              {formatCurrency(calculations.twoEarnerAnalysis.combinedWithholding)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tax Liability</p>
                            <p className="font-semibold">
                              {formatCurrency(calculations.twoEarnerAnalysis.estimatedTaxLiability)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              {calculations.twoEarnerAnalysis.underwithholding >= 0
                                ? "Underwithholding"
                                : "Overwithholding"}
                            </p>
                            <p
                              className={`font-semibold ${
                                calculations.twoEarnerAnalysis.underwithholding > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatCurrency(Math.abs(calculations.twoEarnerAnalysis.underwithholding))}
                            </p>
                          </div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg">
                          <p className="text-sm">{calculations.twoEarnerAnalysis.explanation}</p>
                        </div>
                        {calculations.twoEarnerAnalysis.higherEarnerAdjustment > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Higher earner should add ~
                              {formatCurrency(calculations.twoEarnerAnalysis.higherEarnerAdjustment)} per
                              paycheck on W-4 Step 4(c)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions Tab */}
        <TabsContent value="deductions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Deductions
              </CardTitle>
              <CardDescription>
                Above-the-line deductions and itemized/standard deduction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="401k">401(k) Contributions</Label>
                  <NumericInput
                    id="401k"
                    value={deductions.traditional401k}
                    onChange={(v) => setDeductions((p) => ({ ...p, traditional401k: v }))}
                    prefix="$"
                    min={0}
                    max={23000}
                    aria-label="401k contributions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ira">Traditional IRA Contributions</Label>
                  <NumericInput
                    id="ira"
                    value={deductions.traditionalIRA}
                    onChange={(v) => setDeductions((p) => ({ ...p, traditionalIRA: v }))}
                    prefix="$"
                    min={0}
                    max={7000}
                    aria-label="Traditional IRA contributions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hsa">HSA Contributions</Label>
                  <NumericInput
                    id="hsa"
                    value={deductions.hsaContributions}
                    onChange={(v) => setDeductions((p) => ({ ...p, hsaContributions: v }))}
                    prefix="$"
                    min={0}
                    max={8300}
                    aria-label="HSA contributions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentLoan">Student Loan Interest</Label>
                  <NumericInput
                    id="studentLoan"
                    value={deductions.studentLoanInterest}
                    onChange={(v) => setDeductions((p) => ({ ...p, studentLoanInterest: v }))}
                    prefix="$"
                    min={0}
                    max={2500}
                    aria-label="Student loan interest"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant={deductions.useStandardDeduction ? "default" : "outline"}
                    onClick={() => setDeductions((p) => ({ ...p, useStandardDeduction: true }))}
                    className="flex-1"
                  >
                    Standard Deduction ({formatCurrency(STANDARD_DEDUCTION_2026[filingStatus])})
                  </Button>
                  <Button
                    variant={!deductions.useStandardDeduction ? "default" : "outline"}
                    onClick={() => setDeductions((p) => ({ ...p, useStandardDeduction: false }))}
                    className="flex-1"
                  >
                    Itemize
                  </Button>
                </div>

                {!deductions.useStandardDeduction && (
                  <div className="space-y-2">
                    <Label htmlFor="itemized">Total Itemized Deductions</Label>
                    <NumericInput
                      id="itemized"
                      value={deductions.itemizedDeductions}
                      onChange={(v) => setDeductions((p) => ({ ...p, itemizedDeductions: v }))}
                      prefix="$"
                      min={0}
                      aria-label="Total itemized deductions"
                    />
                    {deductions.itemizedDeductions <= STANDARD_DEDUCTION_2026[filingStatus] && (
                      <p className="text-xs text-amber-600">
                        Your itemized deductions are less than the standard deduction. Consider using
                        standard.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Tax Credits
              </CardTitle>
              <CardDescription>
                Credits reduce your tax dollar-for-dollar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="childrenUnder17">Children Under 17</Label>
                  <NumericInput
                    id="childrenUnder17"
                    value={credits.childrenUnder17}
                    onChange={(v) => setCredits((p) => ({ ...p, childrenUnder17: v }))}
                    min={0}
                    max={10}
                    aria-label="Number of children under 17"
                  />
                  {credits.childrenUnder17 > 0 && (
                    <p className="text-xs text-green-600">
                      Child Tax Credit: ~{formatCurrency(credits.childrenUnder17 * 2000)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childrenOther">Other Dependents</Label>
                  <NumericInput
                    id="childrenOther"
                    value={credits.childrenOther}
                    onChange={(v) => setCredits((p) => ({ ...p, childrenOther: v }))}
                    min={0}
                    max={10}
                    aria-label="Number of other dependents"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childCare">Child Care Expenses</Label>
                  <NumericInput
                    id="childCare"
                    value={credits.childCareExpenses}
                    onChange={(v) => setCredits((p) => ({ ...p, childCareExpenses: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Annual child care expenses"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education Credits</Label>
                  <NumericInput
                    id="education"
                    value={credits.educationCredits}
                    onChange={(v) => setCredits((p) => ({ ...p, educationCredits: v }))}
                    prefix="$"
                    min={0}
                    max={2500}
                    aria-label="Education credits"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="otherCredits">Other Credits</Label>
                  <NumericInput
                    id="otherCredits"
                    value={credits.otherCredits}
                    onChange={(v) => setCredits((p) => ({ ...p, otherCredits: v }))}
                    prefix="$"
                    min={0}
                    aria-label="Other tax credits"
                  />
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Total Estimated Credits: {formatCurrency(calculations.totalCredits)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  This reduces your tax liability dollar-for-dollar
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Life Events Tab */}
        <TabsContent value="lifeevents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Life Event Adjustments
              </CardTitle>
              <CardDescription>
                Select any life changes to see how they affect your withholding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LIFE_EVENTS.map((event) => {
                  const Icon = event.icon;
                  const isActive = activeLifeEvents.has(event.type);
                  return (
                    <Card
                      key={event.type}
                      className={`cursor-pointer transition-all ${
                        isActive
                          ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "hover:border-gray-400"
                      }`}
                      onClick={() => toggleLifeEvent(event.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              isActive ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isActive ? "text-blue-600" : "text-gray-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{event.description}</p>
                              <Badge
                                variant={
                                  event.withholdingImpact === "increase"
                                    ? "destructive"
                                    : event.withholdingImpact === "decrease"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {event.withholdingImpact === "increase"
                                  ? "May increase"
                                  : event.withholdingImpact === "decrease"
                                  ? "May decrease"
                                  : "Varies"}
                              </Badge>
                            </div>
                            {isActive && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {event.adjustmentTip}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* W-4 Form Guidance */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">Your W-4 Adjustments</CardTitle>
          </div>
          <CardDescription>
            Use these values on your W-4 form to optimize withholding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Step 3: Claim Dependents</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(credits.childrenUnder17 * 2000 + credits.childrenOther * 500)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ($2,000 per child under 17, $500 per other dependent)
                </p>
              </div>

              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Step 4(a): Other Income</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculations.recommendation.additionalIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Income not from jobs that's not already withheld
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Step 4(b): Deductions</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculations.recommendation.deductions)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deductions beyond standard deduction
                </p>
              </div>

              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Step 4(c): Extra Withholding</p>
                <p
                  className={`text-2xl font-bold ${
                    calculations.recommendation.extraWithholding > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(calculations.recommendation.extraWithholding)}/pay period
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {calculations.recommendation.extraWithholding > 0
                    ? "Add this to avoid owing at tax time"
                    : "No extra withholding needed"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Target className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  Goal: Owe $0, Get $0
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  A big refund means you gave the government an interest-free loan. Keep that money
                  working for you throughout the year by optimizing your withholding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Calculation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Income</p>
              <p className="font-semibold">{formatCurrency(calculations.totalIncome)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">AGI</p>
              <p className="font-semibold">{formatCurrency(calculations.agi)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Taxable Income</p>
              <p className="font-semibold">{formatCurrency(calculations.taxableIncome)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Marginal Rate</p>
              <p className="font-semibold">{formatPercent(calculations.marginalRate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Federal Tax</p>
              <p className="font-semibold">{formatCurrency(calculations.federalTax)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">SE Tax</p>
              <p className="font-semibold">{formatCurrency(calculations.seTax)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Credits</p>
              <p className="font-semibold text-green-600">
                -{formatCurrency(calculations.totalCredits)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Tax Liability</p>
              <p className="font-semibold text-lg">{formatCurrency(calculations.totalTax)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

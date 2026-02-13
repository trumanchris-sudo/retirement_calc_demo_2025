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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/calculator/InputHelpers";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  Shield,
  TrendingUp,
  Info,
  Calculator,
  AlertOctagon,
  ArrowRight,
  HelpCircle,
  Scale,
  Banknote,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ==================== Types ====================

type AnnuityType = "immediate" | "deferred" | "variable" | "fixed_index" | "spia";

interface AnnuityInputs {
  // SPIA Calculator inputs
  lumpSum: number;
  currentAge: number;
  gender: "male" | "female";
  jointLife: boolean;
  spouseAge: number;

  // For comparison
  currentPortfolio: number;
  annualSpending: number;
  hasPension: boolean;
  pensionAmount: number;
  expectedSSBenefit: number;
  ssStartAge: number;

  // Red flag checker
  proposedAnnuityAmount: number;
  surrenderPeriodYears: number;
  annualFees: number;
  commissionPercent: number;
  isInIRA: boolean;
}

interface SPIAQuote {
  monthlyIncome: number;
  annualIncome: number;
  payoutRate: number;
  breakEvenYears: number;
  breakEvenAge: number;
  lifetimeValueAt85: number;
  lifetimeValueAt90: number;
  lifetimeValueAt95: number;
}

interface WithdrawalComparison {
  withdrawalRate: number;
  monthlyIncome: number;
  annualIncome: number;
  yearsUntilDepletion: number | null;
  portfolioAt85: number;
  portfolioAt90: number;
  portfolioAt95: number;
}

interface RedFlagResult {
  flag: string;
  severity: "critical" | "warning" | "info";
  description: string;
}

// ==================== Constants ====================

// Approximate SPIA payout rates by age (single life, 2026 estimates)
// These are rough averages - actual rates vary by insurer
const SPIA_PAYOUT_RATES: Record<string, Record<string, number>> = {
  male: {
    "60": 0.058,
    "62": 0.061,
    "65": 0.067,
    "67": 0.071,
    "70": 0.078,
    "72": 0.083,
    "75": 0.092,
    "80": 0.108,
  },
  female: {
    "60": 0.054,
    "62": 0.056,
    "65": 0.061,
    "67": 0.065,
    "70": 0.071,
    "72": 0.076,
    "75": 0.084,
    "80": 0.098,
  },
};

// Joint life reduction factor (approximate)
const JOINT_LIFE_REDUCTION = 0.15;

// ==================== Helper Functions ====================

function getSPIAPayoutRate(age: number, gender: "male" | "female", isJoint: boolean): number {
  const rates = SPIA_PAYOUT_RATES[gender];
  const ages = Object.keys(rates).map(Number).sort((a, b) => a - b);

  // Find closest age
  let closestAge = ages[0];
  let minDiff = Math.abs(age - closestAge);

  for (const a of ages) {
    const diff = Math.abs(age - a);
    if (diff < minDiff) {
      minDiff = diff;
      closestAge = a;
    }
  }

  let rate = rates[closestAge.toString()];

  // Apply joint life reduction
  if (isJoint) {
    rate *= (1 - JOINT_LIFE_REDUCTION);
  }

  return rate;
}

function calculateSPIAQuote(
  lumpSum: number,
  age: number,
  gender: "male" | "female",
  isJoint: boolean
): SPIAQuote {
  const payoutRate = getSPIAPayoutRate(age, gender, isJoint);
  const annualIncome = lumpSum * payoutRate;
  const monthlyIncome = annualIncome / 12;

  // Break-even calculation (years to get principal back)
  const breakEvenYears = lumpSum / annualIncome;
  const breakEvenAge = age + breakEvenYears;

  // Lifetime values at different ages
  const yearsTo85 = Math.max(0, 85 - age);
  const yearsTo90 = Math.max(0, 90 - age);
  const yearsTo95 = Math.max(0, 95 - age);

  return {
    monthlyIncome,
    annualIncome,
    payoutRate,
    breakEvenYears,
    breakEvenAge,
    lifetimeValueAt85: annualIncome * yearsTo85,
    lifetimeValueAt90: annualIncome * yearsTo90,
    lifetimeValueAt95: annualIncome * yearsTo95,
  };
}

function calculateWithdrawalComparison(
  principal: number,
  withdrawalRate: number,
  currentAge: number,
  expectedReturn: number = 0.05
): WithdrawalComparison {
  const annualWithdrawal = principal * (withdrawalRate / 100);
  const monthlyIncome = annualWithdrawal / 12;

  // Simulate portfolio with withdrawals
  let portfolio = principal;
  let year = 0;
  let yearsUntilDepletion: number | null = null;
  let portfolioAt85 = 0;
  let portfolioAt90 = 0;
  let portfolioAt95 = 0;

  while (year < 50 && portfolio > 0) {
    portfolio = portfolio * (1 + expectedReturn) - annualWithdrawal;
    year++;

    const currentAgeAtYear = currentAge + year;

    if (portfolio <= 0 && yearsUntilDepletion === null) {
      yearsUntilDepletion = year;
      portfolio = 0;
    }

    if (currentAgeAtYear === 85) portfolioAt85 = Math.max(0, portfolio);
    if (currentAgeAtYear === 90) portfolioAt90 = Math.max(0, portfolio);
    if (currentAgeAtYear === 95) portfolioAt95 = Math.max(0, portfolio);
  }

  return {
    withdrawalRate,
    monthlyIncome,
    annualIncome: annualWithdrawal,
    yearsUntilDepletion,
    portfolioAt85,
    portfolioAt90,
    portfolioAt95,
  };
}

function checkRedFlags(inputs: AnnuityInputs): RedFlagResult[] {
  const flags: RedFlagResult[] = [];

  // Check commission
  if (inputs.commissionPercent >= 7) {
    flags.push({
      flag: "High Commission",
      severity: "critical",
      description: `${inputs.commissionPercent}% commission is extremely high. This creates strong incentive for salespeople to push products that may not be in your best interest.`,
    });
  } else if (inputs.commissionPercent >= 5) {
    flags.push({
      flag: "Elevated Commission",
      severity: "warning",
      description: `${inputs.commissionPercent}% commission is higher than typical. Compare with other options.`,
    });
  }

  // Check surrender period
  if (inputs.surrenderPeriodYears > 7) {
    flags.push({
      flag: "Long Surrender Period",
      severity: "critical",
      description: `${inputs.surrenderPeriodYears}-year surrender period locks your money for far too long. You may pay heavy penalties if you need access.`,
    });
  } else if (inputs.surrenderPeriodYears > 5) {
    flags.push({
      flag: "Extended Surrender Period",
      severity: "warning",
      description: `${inputs.surrenderPeriodYears}-year surrender period is longer than recommended. Consider if you can commit this long.`,
    });
  }

  // Check if annuity in IRA
  if (inputs.isInIRA) {
    flags.push({
      flag: "Annuity in IRA - Tax Inefficient",
      severity: "critical",
      description: "An annuity inside an IRA provides NO additional tax benefit! IRAs are already tax-advantaged. This is a common deceptive sales tactic.",
    });
  }

  // Check annual fees
  if (inputs.annualFees >= 3) {
    flags.push({
      flag: "Excessive Annual Fees",
      severity: "critical",
      description: `${inputs.annualFees}% annual fees will devastate your returns. Low-cost index funds charge 0.03-0.20%.`,
    });
  } else if (inputs.annualFees >= 2) {
    flags.push({
      flag: "High Annual Fees",
      severity: "warning",
      description: `${inputs.annualFees}% annual fees are well above average and will significantly reduce your returns.`,
    });
  }

  // Check if too much in annuity
  const percentOfPortfolio = (inputs.proposedAnnuityAmount / inputs.currentPortfolio) * 100;
  if (percentOfPortfolio > 50) {
    flags.push({
      flag: "Over-Concentration",
      severity: "critical",
      description: `Putting ${percentOfPortfolio.toFixed(0)}% of your portfolio in one annuity is too risky. Consider diversifying.`,
    });
  } else if (percentOfPortfolio > 30) {
    flags.push({
      flag: "High Concentration",
      severity: "warning",
      description: `${percentOfPortfolio.toFixed(0)}% of portfolio in one product may be excessive.`,
    });
  }

  return flags;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==================== Sub-Components ====================

const AnnuityTypeCard: React.FC<{
  type: string;
  name: string;
  description: string;
  verdict: string;
  verdictType: "good" | "bad" | "caution" | "neutral";
  expanded: boolean;
  onToggle: () => void;
  details: string[];
  pros: string[];
  cons: string[];
}> = ({ name, description, verdict, verdictType, expanded, onToggle, details, pros, cons }) => {
  const verdictColors = {
    good: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800",
    bad: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800",
    caution: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-800",
    neutral: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700",
  };

  const verdictIcons = {
    good: <CheckCircle className="h-4 w-4" />,
    bad: <XCircle className="h-4 w-4" />,
    caution: <AlertTriangle className="h-4 w-4" />,
    neutral: <HelpCircle className="h-4 w-4" />,
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold">{name}</span>
          <Badge className={verdictColors[verdictType]}>
            <span className="flex items-center gap-1">
              {verdictIcons[verdictType]}
              {verdict}
            </span>
          </Badge>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          {details.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">How It Works:</div>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                {details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pros.length > 0 && (
              <div>
                <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Potential Benefits
                </div>
                <ul className="text-sm space-y-1">
                  {pros.map((pro, i) => (
                    <li key={i} className="text-muted-foreground">{pro}</li>
                  ))}
                </ul>
              </div>
            )}
            {cons.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Drawbacks
                </div>
                <ul className="text-sm space-y-1">
                  {cons.map((con, i) => (
                    <li key={i} className="text-muted-foreground">{con}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main Component ====================

interface AnnuityAnalyzerProps {
  initialAge?: number;
  initialPortfolio?: number;
  hasPension?: boolean;
  pensionAmount?: number;
  expectedSSBenefit?: number;
}

export function AnnuityAnalyzer({
  initialAge = 65,
  initialPortfolio = 500000,
  hasPension = false,
  pensionAmount = 0,
  expectedSSBenefit = 2500,
}: AnnuityAnalyzerProps) {
  const [activeTab, setActiveTab] = useState("education");
  const [expandedType, setExpandedType] = useState<AnnuityType | null>(null);

  const [inputs, setInputs] = useState<AnnuityInputs>({
    lumpSum: 200000,
    currentAge: initialAge,
    gender: "male",
    jointLife: false,
    spouseAge: initialAge - 2,
    currentPortfolio: initialPortfolio,
    annualSpending: 50000,
    hasPension: hasPension,
    pensionAmount: pensionAmount,
    expectedSSBenefit: expectedSSBenefit,
    ssStartAge: 67,
    proposedAnnuityAmount: 200000,
    surrenderPeriodYears: 7,
    annualFees: 2.5,
    commissionPercent: 7,
    isInIRA: false,
  });

  // Calculate SPIA quote
  const spiaQuote = useMemo(
    () => calculateSPIAQuote(inputs.lumpSum, inputs.currentAge, inputs.gender, inputs.jointLife),
    [inputs.lumpSum, inputs.currentAge, inputs.gender, inputs.jointLife]
  );

  // Calculate 4% withdrawal comparison
  const withdrawalComparison = useMemo(
    () => calculateWithdrawalComparison(inputs.lumpSum, 4, inputs.currentAge),
    [inputs.lumpSum, inputs.currentAge]
  );

  // Check red flags
  const redFlags = useMemo(() => checkRedFlags(inputs), [inputs]);

  // Input updater
  const updateInput = useCallback(
    <K extends keyof AnnuityInputs>(field: K, value: AnnuityInputs[K]) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Annuity type data
  const annuityTypes = useMemo(() => [
    {
      type: "spia" as AnnuityType,
      name: "SPIA (Single Premium Immediate Annuity)",
      description: "Give insurance company a lump sum, receive guaranteed monthly payments starting immediately.",
      verdict: "Sometimes Useful",
      verdictType: "caution" as const,
      details: [
        "One-time payment converts to lifetime income stream",
        "Payments can be for single life or joint life with spouse",
        "No access to principal once purchased",
        "Payments stop at death (single life) unless period-certain rider",
      ],
      pros: [
        "Simple and easy to understand",
        "Guaranteed income for life - longevity insurance",
        "No investment decisions needed",
        "Can provide peace of mind",
      ],
      cons: [
        "Lose access to principal forever",
        "No inflation adjustment (typically)",
        "If you die early, insurance company keeps the money",
        "Low interest rates mean lower payouts",
      ],
    },
    {
      type: "immediate" as AnnuityType,
      name: "Immediate Annuity (Non-SPIA)",
      description: "Similar to SPIA but may have additional features or complexity.",
      verdict: "Compare Carefully",
      verdictType: "neutral" as const,
      details: [
        "Payments begin within a year of purchase",
        "May have riders or guarantees that add cost",
        "Various payout options available",
      ],
      pros: [
        "Income starts quickly",
        "Can include period-certain guarantees",
        "May have inflation riders (at extra cost)",
      ],
      cons: [
        "Added features increase complexity and cost",
        "May not be better than simple SPIA",
        "Harder to compare across products",
      ],
    },
    {
      type: "deferred" as AnnuityType,
      name: "Deferred Annuity",
      description: "Give money now, payments start later (often years or decades later).",
      verdict: "Usually Avoid",
      verdictType: "bad" as const,
      details: [
        "Accumulation phase: money grows tax-deferred",
        "Distribution phase: convert to income stream",
        "Surrender charges if you withdraw early",
        "Gains taxed as ordinary income, not capital gains",
      ],
      pros: [
        "Tax-deferred growth",
        "Can delay income to when you need it",
        "Death benefit may be available",
      ],
      cons: [
        "High fees eat into tax benefits",
        "Surrender charges lock up your money",
        "Growth taxed as ordinary income (worse than LTCG)",
        "Complexity makes comparison difficult",
      ],
    },
    {
      type: "variable" as AnnuityType,
      name: "Variable Annuity",
      description: "Value fluctuates based on underlying investments. Often heavily promoted by salespeople.",
      verdict: "Almost Always Avoid",
      verdictType: "bad" as const,
      details: [
        "Money invested in subaccounts (like mutual funds)",
        "Value goes up and down with market",
        "Usually includes death benefit and living benefit riders",
        "Extremely complex fee structures",
      ],
      pros: [
        "Potential for market growth",
        "Tax-deferred accumulation",
        "Some downside protection with riders",
      ],
      cons: [
        "Very high fees (often 3%+ annually)",
        "Complexity hides true costs",
        "Agents earn 5-7%+ commissions",
        "Surrender charges typically 7+ years",
        "Can do same thing cheaper with index funds",
      ],
    },
    {
      type: "fixed_index" as AnnuityType,
      name: "Fixed Index Annuity (FIA)",
      description: "Returns linked to market index (like S&P 500) with caps and floors. Very complex.",
      verdict: "Avoid - Too Complex",
      verdictType: "bad" as const,
      details: [
        "Returns based on index performance, but capped",
        "Principal protection from market losses",
        "Participation rates, caps, and spreads limit upside",
        "Multi-year surrender charges common",
      ],
      pros: [
        "No direct market losses",
        "Some upside potential",
        "Principal protection",
      ],
      cons: [
        "Caps limit your gains significantly",
        "Complex formulas obscure true returns",
        "Long surrender periods",
        "If you don't understand it, don't buy it",
        "Salespeople push hard due to high commissions",
      ],
    },
  ], []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Annuity Analyzer
        </CardTitle>
        <CardDescription>
          Protect yourself from bad annuity sales. Usually bad, sometimes useful - learn the difference.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
            <TabsTrigger value="education" className="gap-1">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Education</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-1">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">SPIA Calc</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">vs 4% Rule</span>
            </TabsTrigger>
            <TabsTrigger value="redflags" className="gap-1">
              <AlertOctagon className="h-4 w-4" />
              <span className="hidden sm:inline">Red Flags</span>
            </TabsTrigger>
            <TabsTrigger value="alternatives" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Better Options</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== Education Tab ==================== */}
          <TabsContent value="education" className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                    The Golden Rule of Annuities
                  </div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    &quot;If you don&apos;t understand it, don&apos;t buy it.&quot;
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                    Annuities are among the most aggressively sold and least understood financial products.
                    Salespeople earn 5-10% commissions, creating enormous incentive to push products that
                    may not be in your best interest.
                  </p>
                </div>
              </div>
            </div>

            {/* The Problem with Annuities */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-600" />
                Why Most Annuities Are Bad Deals
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-200">High Commissions</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Salespeople earn 5-10%+ commissions. On a $200,000 annuity, that&apos;s $10,000-$20,000
                    going to the salesperson instead of your retirement.
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-200">Surrender Charges</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your money is locked up for 7-10 years. Need to access it early? You&apos;ll pay
                    steep penalties, often 7% or more.
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-200">High Ongoing Fees</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Variable annuities often charge 2-3%+ annually. Over 20 years, this can consume
                    40-50% of your potential returns.
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-200">Complexity</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Participation rates, caps, spreads, riders, sub-accounts... This complexity
                    hides true costs and makes comparison nearly impossible.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Types of Annuities */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Types of Annuities Explained</h3>
              <div className="space-y-2">
                {annuityTypes.map((annuity) => (
                  <AnnuityTypeCard
                    key={annuity.type}
                    type={annuity.type}
                    name={annuity.name}
                    description={annuity.description}
                    verdict={annuity.verdict}
                    verdictType={annuity.verdictType}
                    expanded={expandedType === annuity.type}
                    onToggle={() => setExpandedType(expandedType === annuity.type ? null : annuity.type)}
                    details={annuity.details}
                    pros={annuity.pros}
                    cons={annuity.cons}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* When Annuities MIGHT Make Sense */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                When a SPIA Might Make Sense
              </h3>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                  The only annuity worth considering for most people is a <strong>simple SPIA</strong>.
                  Even then, it&apos;s only appropriate in specific situations:
                </p>
                <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You have <strong>no pension</strong> and need guaranteed income</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You&apos;ve <strong>maxed out</strong> Social Security by waiting until 70</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You&apos;re worried about <strong>outliving your money</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You want to cover <strong>basic expenses</strong> with guaranteed income</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You&apos;re using <strong>no more than 25-30%</strong> of your portfolio</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* ==================== SPIA Calculator Tab ==================== */}
          <TabsContent value="calculator" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    SPIA Estimator
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This provides rough estimates. Actual quotes vary by insurance company, health status,
                    and current interest rates. Always get multiple quotes before deciding.
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Lump Sum to Annuitize"
                value={inputs.lumpSum}
                setter={(v) => updateInput("lumpSum", v)}
                step={10000}
                prefix="$"
                tip="Amount you would convert to guaranteed income"
              />
              <Input
                label="Your Current Age"
                value={inputs.currentAge}
                setter={(v) => updateInput("currentAge", v)}
                min={55}
                max={85}
              />
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex items-center gap-4 h-11">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={inputs.gender === "male"}
                      onChange={() => updateInput("gender", "male")}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={inputs.gender === "female"}
                      onChange={() => updateInput("gender", "female")}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Female</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Joint Life with Spouse?</Label>
                <div className="flex items-center gap-4 h-11">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jointLife"
                      checked={!inputs.jointLife}
                      onChange={() => updateInput("jointLife", false)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Single Life</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jointLife"
                      checked={inputs.jointLife}
                      onChange={() => updateInput("jointLife", true)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Joint Life</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="text-center mb-6">
                <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                  Estimated Monthly Income
                </div>
                <div className="text-5xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrencyFull(spiaQuote.monthlyIncome)}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrencyFull(spiaQuote.annualIncome)}/year ({(spiaQuote.payoutRate * 100).toFixed(1)}% payout rate)
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Break-even Age</div>
                  <div className="text-xl font-bold">{spiaQuote.breakEvenAge.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">
                    {spiaQuote.breakEvenYears.toFixed(1)} years
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Total by Age 85</div>
                  <div className="text-xl font-bold">{formatCurrency(spiaQuote.lifetimeValueAt85)}</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Total by Age 90</div>
                  <div className="text-xl font-bold">{formatCurrency(spiaQuote.lifetimeValueAt90)}</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Total by Age 95</div>
                  <div className="text-xl font-bold">{formatCurrency(spiaQuote.lifetimeValueAt95)}</div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Break-even warning:</strong> If you die before age {spiaQuote.breakEvenAge.toFixed(0)},
                    you would have been better off keeping the money invested. The insurance company keeps the remainder.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {inputs.jointLife
                      ? "Joint life: Payments continue to surviving spouse but are ~15% lower than single life."
                      : "Single life: Higher payments, but they stop completely when you die. No inheritance."
                    }
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Comparison Tab ==================== */}
          <TabsContent value="comparison" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    SPIA vs. 4% Withdrawal Rule
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Compare guaranteed annuity income to withdrawing 4% annually from the same amount
                    invested in a diversified portfolio.
                  </p>
                </div>
              </div>
            </div>

            {/* Side by Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SPIA Column */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-800 dark:text-purple-200">SPIA (Annuity)</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Monthly Income</div>
                    <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {formatCurrencyFull(spiaQuote.monthlyIncome)}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Annual Income</span>
                      <span className="font-medium">{formatCurrencyFull(spiaQuote.annualIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Payout Rate</span>
                      <span className="font-medium">{(spiaQuote.payoutRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700 dark:text-purple-300">Remaining at 90</span>
                      <span className="font-medium">$0 (no inheritance)</span>
                    </div>
                  </div>

                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-3 text-sm">
                    <div className="font-medium text-purple-800 dark:text-purple-200 mb-1">Key Point:</div>
                    <p className="text-purple-700 dark:text-purple-300">
                      Guaranteed for life - no matter how long you live. But nothing left for heirs.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4% Rule Column */}
              <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800 dark:text-green-200">4% Withdrawal Rule</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-green-700 dark:text-green-300">Monthly Income</div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrencyFull(withdrawalComparison.monthlyIncome)}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Annual Withdrawal</span>
                      <span className="font-medium">{formatCurrencyFull(withdrawalComparison.annualIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Withdrawal Rate</span>
                      <span className="font-medium">4.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Portfolio at 90</span>
                      <span className="font-medium">{formatCurrency(withdrawalComparison.portfolioAt90)}</span>
                    </div>
                  </div>

                  <div className="bg-green-100 dark:bg-green-900/30 rounded p-3 text-sm">
                    <div className="font-medium text-green-800 dark:text-green-200 mb-1">Key Point:</div>
                    <p className="text-green-700 dark:text-green-300">
                      {withdrawalComparison.yearsUntilDepletion
                        ? `Money runs out after ${withdrawalComparison.yearsUntilDepletion} years. Consider if this is a risk.`
                        : "Historically sustainable for 30+ years. Remaining balance goes to heirs."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className={`rounded-lg p-4 border ${
              spiaQuote.monthlyIncome > withdrawalComparison.monthlyIncome
                ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
            }`}>
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Analysis</div>
                  <p className="text-sm">
                    The SPIA provides <strong>{formatCurrencyFull(spiaQuote.monthlyIncome - withdrawalComparison.monthlyIncome)}</strong> {spiaQuote.monthlyIncome > withdrawalComparison.monthlyIncome ? "more" : "less"} per month
                    than the 4% rule ({(((spiaQuote.monthlyIncome / withdrawalComparison.monthlyIncome) - 1) * 100).toFixed(0)}% {spiaQuote.monthlyIncome > withdrawalComparison.monthlyIncome ? "higher" : "lower"}).
                    {spiaQuote.monthlyIncome > withdrawalComparison.monthlyIncome
                      ? " However, with the 4% rule, you maintain control and potential for inheritance."
                      : " The 4% rule also maintains your principal and potential for growth."
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* The Real Comparison */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    The Real Question: Delaying Social Security
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Before buying any annuity, have you maximized the <strong>best annuity you already own</strong>?
                    Delaying Social Security from 62 to 70 increases your benefit by 77% - that&apos;s an 8% annual
                    &quot;return&quot; guaranteed by the government, with inflation protection. No commercial annuity comes close.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Red Flags Tab ==================== */}
          <TabsContent value="redflags" className="space-y-6">
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-red-900 dark:text-red-100 mb-2">
                    Annuity Red Flag Checker
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Enter details about an annuity someone is trying to sell you. We&apos;ll identify warning signs.
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs for Red Flag Checker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Proposed Annuity Amount"
                value={inputs.proposedAnnuityAmount}
                setter={(v) => updateInput("proposedAnnuityAmount", v)}
                step={10000}
                prefix="$"
              />
              <Input
                label="Your Total Portfolio"
                value={inputs.currentPortfolio}
                setter={(v) => updateInput("currentPortfolio", v)}
                step={10000}
                prefix="$"
              />
              <Input
                label="Surrender Period (Years)"
                value={inputs.surrenderPeriodYears}
                setter={(v) => updateInput("surrenderPeriodYears", v)}
                min={0}
                max={15}
                tip="How long before you can access money penalty-free"
              />
              <Input
                label="Annual Fees (%)"
                value={inputs.annualFees}
                setter={(v) => updateInput("annualFees", v)}
                min={0}
                max={5}
                step={0.1}
                suffix="%"
                tip="Total annual fees including M&E, admin, rider fees"
              />
              <Input
                label="Commission (%)"
                value={inputs.commissionPercent}
                setter={(v) => updateInput("commissionPercent", v)}
                min={0}
                max={12}
                step={0.5}
                suffix="%"
                tip="What the salesperson earns (often hidden)"
              />
              <div className="space-y-2">
                <Label>Is this annuity inside an IRA?</Label>
                <div className="flex items-center gap-4 h-11">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isInIRA"
                      checked={!inputs.isInIRA}
                      onChange={() => updateInput("isInIRA", false)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isInIRA"
                      checked={inputs.isInIRA}
                      onChange={() => updateInput("isInIRA", true)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Red Flags Results */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Red Flag Analysis
              </h3>

              {redFlags.length === 0 ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      No major red flags detected with these inputs.
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    However, always ask: Do I actually need this product? Have I maxed Social Security delay?
                    Have I considered simpler alternatives?
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redFlags.map((flag, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-4 border ${
                        flag.severity === "critical"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                          : flag.severity === "warning"
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                          : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {flag.severity === "critical" ? (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : flag.severity === "warning" ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div className={`font-semibold mb-1 ${
                            flag.severity === "critical"
                              ? "text-red-900 dark:text-red-100"
                              : flag.severity === "warning"
                              ? "text-amber-900 dark:text-amber-100"
                              : "text-blue-900 dark:text-blue-100"
                          }`}>
                            {flag.flag}
                          </div>
                          <p className={`text-sm ${
                            flag.severity === "critical"
                              ? "text-red-800 dark:text-red-200"
                              : flag.severity === "warning"
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-blue-800 dark:text-blue-200"
                          }`}>
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Escape Routes */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-600" />
                Escape Routes (If You Already Own a Bad Annuity)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Free Look Period</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Most states require 10-30 day &quot;free look&quot; period. You can cancel for full refund
                    within this window. Check your contract!
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="h-5 w-5 text-green-600" />
                    <span className="font-medium">1035 Exchange</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tax-free exchange to a better annuity product. Move to a simpler, lower-cost option
                    without triggering taxes.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Wait It Out</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If surrender charges are high, it may be better to wait until the surrender period
                    ends, then move to a better option.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Better Alternatives Tab ==================== */}
          <TabsContent value="alternatives" className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-green-900 dark:text-green-100 mb-2">
                    DIY Pension Alternatives
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Before buying any annuity, consider these simpler, cheaper, and often better alternatives.
                  </p>
                </div>
              </div>
            </div>

            {/* Best Annuity: Social Security */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                The Best Annuity: Social Security Delay
              </h3>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                      Delaying SS from 62 to 70 increases benefit by
                    </div>
                    <div className="text-5xl font-bold text-blue-900 dark:text-blue-100">
                      77%
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                      That&apos;s an 8% guaranteed annual &quot;return&quot; for waiting
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200">Inflation-adjusted (COLA)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200">Backed by US Government</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200">Survivor benefits for spouse</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200">No commissions or fees</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <strong>Strategy:</strong> Use portfolio withdrawals from 62-70 to cover expenses while
                  delaying Social Security. This is almost always better than buying a commercial annuity.
                </p>
              </div>
            </div>

            <Separator />

            {/* TIPS Ladder */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                TIPS Ladder for Known Income
              </h3>

              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Treasury Inflation-Protected Securities (TIPS) provide guaranteed, inflation-adjusted income
                  without the fees and complexity of annuities.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Advantages
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Government guaranteed</li>
                      <li>Inflation protected</li>
                      <li>No fees or commissions</li>
                      <li>Completely liquid</li>
                      <li>You keep the principal</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">How It Works</div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Buy TIPS maturing each year</li>
                      <li>Each year, one bond matures</li>
                      <li>Provides known income stream</li>
                      <li>Can be held in IRA or taxable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Simple Portfolio */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Simple Index Fund Portfolio + 4% Rule
              </h3>

              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                  A simple 60/40 stock/bond index fund portfolio with 4% annual withdrawals has historically
                  been sustainable for 30+ years in almost all market conditions.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">Annual Fees</div>
                    <div className="text-xl font-bold text-green-600">0.03-0.10%</div>
                    <div className="text-xs text-muted-foreground">(vs 2-3% annuity)</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">Liquidity</div>
                    <div className="text-xl font-bold text-green-600">100%</div>
                    <div className="text-xs text-muted-foreground">access anytime</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">Inheritance</div>
                    <div className="text-xl font-bold text-green-600">Yes</div>
                    <div className="text-xs text-muted-foreground">remaining balance</div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">Surrender Charge</div>
                    <div className="text-xl font-bold text-green-600">$0</div>
                    <div className="text-xs text-muted-foreground">none ever</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Recommendation */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-300 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                    Bottom Line
                  </div>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                    <li><strong>First:</strong> Delay Social Security to 70 if possible (best annuity)</li>
                    <li><strong>Second:</strong> Use a simple, low-cost index fund portfolio</li>
                    <li><strong>Third:</strong> If you still want guaranteed income, consider a simple SPIA with NO riders, NO complexity, from a highly-rated insurer</li>
                    <li><strong>Never:</strong> Buy variable annuities, fixed index annuities, or any product you don&apos;t fully understand</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AnnuityAnalyzer;

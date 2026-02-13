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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Gift,
  Heart,
  TrendingUp,
  Wallet,
  Building2,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Calculator,
  DollarSign,
  Info,
  Sparkles,
  Target,
  Zap,
  ClipboardCheck,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { IRS_LIMITS_2026 } from "@/types/onboarding";
import {
  HSA_LIMITS_2026,
  RETIREMENT_LIMITS_2026,
} from "@/lib/constants/tax2026";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface EmployerBenefits {
  has401k: boolean;
  hasRoth401k: boolean;
  hasAfterTax401k: boolean; // For mega backdoor Roth
  hasInPlanConversion: boolean; // Can convert after-tax to Roth
  matchPercent: number; // e.g., 100 = 100% match
  matchLimit: number; // e.g., 6 = matches up to 6% of salary
  vestingYears: number;
}

interface UserSituation {
  age: number;
  income: number;
  spouseIncome: number;
  isMarried: boolean;
  hasHDHP: boolean; // High Deductible Health Plan (HSA eligible)
  employerBenefits: EmployerBenefits;
}

interface CurrentContributions {
  traditional401k: number;
  roth401k: number;
  afterTax401k: number;
  rothIRA: number;
  hsa: number;
  taxable: number;
}

interface ContributionOrderProps {
  /** User's current age */
  age?: number;
  /** User's annual income */
  income?: number;
  /** Spouse's annual income (if married) */
  spouseIncome?: number;
  /** Whether user is married */
  isMarried?: boolean;
  /** Current pre-tax 401k contribution (annual) */
  cPre1?: number;
  /** Current Roth/post-tax contribution (annual) */
  cPost1?: number;
  /** Current taxable contribution (annual) */
  cTax1?: number;
  /** Current employer match (annual) */
  cMatch1?: number;
  /** Callback when contributions are optimized */
  onOptimize?: (optimized: OptimizedAllocation) => void;
}

interface AccountPriority {
  id: string;
  name: string;
  shortName: string;
  description: string;
  taxAdvantage: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  currentContribution: number;
  limit: number;
  leftOnTable: number;
  priority: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

interface OptimizationInsight {
  type: "warning" | "opportunity" | "info";
  title: string;
  description: string;
  impact?: number;
  impactTimeframe?: string;
}

interface OptimizedAllocation {
  traditional401k: number;
  roth401k: number;
  afterTax401k: number;
  rothIRA: number;
  hsa: number;
  taxable: number;
  total: number;
}

interface ActionItem {
  account: string;
  action: string;
  specific: string;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const IRA_LIMIT_2026 = 7500;
const IRA_CATCHUP_2026 = 1100;

// Expected annual growth rates for comparison
const EXPECTED_RETURN = 0.07; // 7% real return
const YEARS_TO_RETIREMENT = 30;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the future value of contributions over time
 */
function calculateFutureValue(
  annualContribution: number,
  years: number,
  rate: number = EXPECTED_RETURN
): number {
  if (rate === 0) return annualContribution * years;
  return (
    annualContribution * ((Math.pow(1 + rate, years) - 1) / rate) * (1 + rate)
  );
}

/**
 * Get the maximum HSA contribution based on coverage and age
 */
function getMaxHSA(isFamily: boolean, age: number): number {
  const base = isFamily ? HSA_LIMITS_2026.FAMILY : HSA_LIMITS_2026.SELF_ONLY;
  const catchUp = age >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0;
  return base + catchUp;
}

/**
 * Get the maximum 401k contribution based on age
 */
function getMax401k(age: number): number {
  if (age >= 60 && age <= 63) {
    return (
      RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT +
      RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63
    );
  } else if (age >= 50) {
    return (
      RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT +
      RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS
    );
  }
  return RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT;
}

/**
 * Get maximum IRA contribution based on age
 */
function getMaxIRA(age: number): number {
  return age >= 50 ? IRA_LIMIT_2026 + IRA_CATCHUP_2026 : IRA_LIMIT_2026;
}

/**
 * Calculate employer match amount
 */
function calculateEmployerMatch(
  salary: number,
  contribution: number,
  matchPercent: number,
  matchLimit: number
): number {
  const maxMatchableSalary = salary * (matchLimit / 100);
  const matchableContribution = Math.min(contribution, maxMatchableSalary);
  return matchableContribution * (matchPercent / 100);
}

/**
 * Format currency
 */
function formatCurrency(value: number, compact: boolean = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ContributionOrder = React.memo(function ContributionOrder({
  age = 35,
  income = 100000,
  spouseIncome = 0,
  isMarried = false,
  cPre1 = 0,
  cPost1 = 0,
  cTax1 = 0,
  cMatch1 = 0,
  onOptimize,
}: ContributionOrderProps) {
  // ============================================================================
  // STATE - Employer-Specific Questions
  // ============================================================================

  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [has401k, setHas401k] = useState(true);
  const [hasRoth401k, setHasRoth401k] = useState(true);
  const [hasAfterTax401k, setHasAfterTax401k] = useState(false);
  const [hasInPlanConversion, setHasInPlanConversion] = useState(false);
  const [matchPercent, setMatchPercent] = useState(100);
  const [matchLimit, setMatchLimit] = useState(6);
  const [hasHDHP, setHasHDHP] = useState(false);

  // Budget allocator state
  const [monthlyBudget, setMonthlyBudget] = useState(
    Math.round((cPre1 + cPost1 + cTax1 + cMatch1) / 12) || 2000
  );
  const [showAllocator, setShowAllocator] = useState(false);
  const [customAllocations, setCustomAllocations] = useState<
    Record<string, number>
  >({});

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const max401k = useMemo(() => getMax401k(age), [age]);
  const maxIRA = useMemo(() => getMaxIRA(age), [age]);
  const maxHSA = useMemo(() => getMaxHSA(isMarried, age), [isMarried, age]);
  const yearsToRetirement = useMemo(
    () => Math.max(65 - age, 10),
    [age]
  );

  // Calculate current total savings
  const currentTotalSavings = useMemo(
    () => cPre1 + cPost1 + cTax1,
    [cPre1, cPost1, cTax1]
  );

  // Calculate maximum possible employer match
  const maxPossibleMatch = useMemo(() => {
    return calculateEmployerMatch(income, income, matchPercent, matchLimit);
  }, [income, matchPercent, matchLimit]);

  // Calculate match being captured
  const currentMatch = useMemo(() => {
    return calculateEmployerMatch(income, cPre1, matchPercent, matchLimit);
  }, [income, cPre1, matchPercent, matchLimit]);

  const matchLeftOnTable = useMemo(() => {
    return Math.max(0, maxPossibleMatch - currentMatch);
  }, [maxPossibleMatch, currentMatch]);

  // ============================================================================
  // PRIORITY STACK - The Optimal Order
  // ============================================================================

  const priorityStack = useMemo((): AccountPriority[] => {
    const stack: AccountPriority[] = [];

    // 1. 401k up to employer match (FREE MONEY)
    const matchContributionNeeded = income * (matchLimit / 100);
    const currentTowardsMatch = Math.min(cPre1, matchContributionNeeded);

    if (has401k && maxPossibleMatch > 0) {
      stack.push({
        id: "401k-match",
        name: "401(k) up to Employer Match",
        shortName: "401k Match",
        description: `Get the full ${matchPercent}% match on ${matchLimit}% of salary`,
        taxAdvantage: "FREE MONEY - 100% instant return",
        icon: <Gift className="h-5 w-5" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        currentContribution: currentTowardsMatch,
        limit: matchContributionNeeded,
        leftOnTable: Math.max(0, matchContributionNeeded - currentTowardsMatch),
        priority: 1,
        isAvailable: true,
      });
    }

    // 2. HSA (if HDHP eligible) - Triple tax advantage
    if (hasHDHP) {
      // Estimate current HSA contribution (not tracked separately, assume 0)
      const currentHSA = 0;
      stack.push({
        id: "hsa",
        name: "Health Savings Account (HSA)",
        shortName: "HSA",
        description: "Triple tax advantage: deductible, grows tax-free, tax-free withdrawals for healthcare",
        taxAdvantage: "Triple tax-free (better than Roth!)",
        icon: <Heart className="h-5 w-5" />,
        color: "text-rose-600",
        bgColor: "bg-rose-50 dark:bg-rose-950/30",
        borderColor: "border-rose-200 dark:border-rose-800",
        currentContribution: currentHSA,
        limit: maxHSA,
        leftOnTable: maxHSA - currentHSA,
        priority: 2,
        isAvailable: true,
      });
    } else {
      stack.push({
        id: "hsa",
        name: "Health Savings Account (HSA)",
        shortName: "HSA",
        description: "Triple tax advantage - requires High Deductible Health Plan",
        taxAdvantage: "Triple tax-free (better than Roth!)",
        icon: <Heart className="h-5 w-5" />,
        color: "text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-900/30",
        borderColor: "border-gray-200 dark:border-gray-800",
        currentContribution: 0,
        limit: maxHSA,
        leftOnTable: 0,
        priority: 2,
        isAvailable: false,
        unavailableReason: "Requires HDHP enrollment",
      });
    }

    // 3. Roth IRA / Backdoor Roth
    const rothIRAContribution = Math.min(cPost1, maxIRA);
    const incomeLimit = isMarried ? 240000 : 161000; // 2026 estimates
    const needsBackdoor = income > incomeLimit;

    stack.push({
      id: "roth-ira",
      name: needsBackdoor ? "Backdoor Roth IRA" : "Roth IRA",
      shortName: "Roth IRA",
      description: needsBackdoor
        ? "Contribute to Traditional IRA, then convert to Roth (legal tax strategy)"
        : "Tax-free growth and withdrawals in retirement",
      taxAdvantage: "Tax-free growth & withdrawals forever",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      currentContribution: rothIRAContribution,
      limit: maxIRA,
      leftOnTable: Math.max(0, maxIRA - rothIRAContribution),
      priority: 3,
      isAvailable: true,
    });

    // 4. Max out 401k (beyond match)
    if (has401k) {
      const contributionBeyondMatch = Math.max(
        0,
        cPre1 - matchContributionNeeded
      );
      const remainingLimit = max401k - matchContributionNeeded;

      stack.push({
        id: "401k-max",
        name: "Max Out 401(k)",
        shortName: "401k Max",
        description: hasRoth401k
          ? "Choose Traditional or Roth 401(k) based on tax situation"
          : "Traditional 401(k) only - reduces taxable income now",
        taxAdvantage: "Tax-deferred growth, high contribution limits",
        icon: <Building2 className="h-5 w-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        currentContribution: contributionBeyondMatch,
        limit: remainingLimit,
        leftOnTable: Math.max(0, remainingLimit - contributionBeyondMatch),
        priority: 4,
        isAvailable: true,
      });
    }

    // 5. Mega Backdoor Roth (if available)
    if (hasAfterTax401k && hasInPlanConversion) {
      const afterTaxLimit = RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_UNDER_50 - max401k - maxPossibleMatch;
      stack.push({
        id: "mega-backdoor",
        name: "Mega Backdoor Roth",
        shortName: "Mega Backdoor",
        description:
          "After-tax 401(k) contributions converted to Roth - advanced strategy",
        taxAdvantage: "Additional $30k+ Roth space per year",
        icon: <Sparkles className="h-5 w-5" />,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        currentContribution: 0,
        limit: Math.max(0, afterTaxLimit),
        leftOnTable: Math.max(0, afterTaxLimit),
        priority: 5,
        isAvailable: true,
      });
    } else if (has401k) {
      stack.push({
        id: "mega-backdoor",
        name: "Mega Backdoor Roth",
        shortName: "Mega Backdoor",
        description: "After-tax 401(k) with in-plan Roth conversion",
        taxAdvantage: "Additional $30k+ Roth space per year",
        icon: <Sparkles className="h-5 w-5" />,
        color: "text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-900/30",
        borderColor: "border-gray-200 dark:border-gray-800",
        currentContribution: 0,
        limit: 0,
        leftOnTable: 0,
        priority: 5,
        isAvailable: false,
        unavailableReason: hasAfterTax401k
          ? "Requires in-plan Roth conversion"
          : "Requires after-tax 401(k) option",
      });
    }

    // 6. Taxable Brokerage (last resort)
    stack.push({
      id: "taxable",
      name: "Taxable Brokerage",
      shortName: "Taxable",
      description:
        "Flexible access but less tax-efficient - use after maxing tax-advantaged accounts",
      taxAdvantage: "No special tax benefits, but unlimited contributions",
      icon: <Wallet className="h-5 w-5" />,
      color: "text-slate-600",
      bgColor: "bg-slate-50 dark:bg-slate-900/30",
      borderColor: "border-slate-200 dark:border-slate-800",
      currentContribution: cTax1,
      limit: Infinity,
      leftOnTable: 0,
      priority: 6,
      isAvailable: true,
    });

    return stack;
  }, [
    has401k,
    hasRoth401k,
    hasAfterTax401k,
    hasInPlanConversion,
    hasHDHP,
    income,
    isMarried,
    age,
    cPre1,
    cPost1,
    cTax1,
    matchPercent,
    matchLimit,
    max401k,
    maxIRA,
    maxHSA,
    maxPossibleMatch,
  ]);

  // ============================================================================
  // SMART DETECTION - Find Suboptimal Patterns
  // ============================================================================

  const insights = useMemo((): OptimizationInsight[] => {
    const results: OptimizationInsight[] = [];

    // Check if leaving match on table
    if (matchLeftOnTable > 0) {
      const futureValue = calculateFutureValue(
        matchLeftOnTable,
        yearsToRetirement
      );
      results.push({
        type: "warning",
        title: "You're Leaving FREE Money on the Table!",
        description: `You're missing ${formatCurrency(matchLeftOnTable)}/year in employer match. That's ${formatCurrency(futureValue, true)} by retirement!`,
        impact: futureValue,
        impactTimeframe: `${yearsToRetirement} years`,
      });
    }

    // Check if putting money in taxable before maxing tax-advantaged
    if (cTax1 > 0) {
      const totalTaxAdvantaged = cPre1 + cPost1;
      const maxTaxAdvantaged = max401k + maxIRA + (hasHDHP ? maxHSA : 0);

      if (totalTaxAdvantaged < maxTaxAdvantaged) {
        const suboptimalAmount = Math.min(
          cTax1,
          maxTaxAdvantaged - totalTaxAdvantaged
        );
        // Estimate tax drag on taxable account (roughly 1% per year from dividends/gains)
        const taxDrag = 0.01;
        const optimalFV = calculateFutureValue(
          suboptimalAmount,
          yearsToRetirement,
          EXPECTED_RETURN
        );
        const suboptimalFV = calculateFutureValue(
          suboptimalAmount,
          yearsToRetirement,
          EXPECTED_RETURN - taxDrag
        );
        const costOfTaxDrag = optimalFV - suboptimalFV;

        results.push({
          type: "warning",
          title: "Taxable Before Tax-Advantaged",
          description: `You're putting ${formatCurrency(suboptimalAmount)}/year in taxable when you have room in tax-advantaged accounts. This costs ~${formatCurrency(costOfTaxDrag, true)} over ${yearsToRetirement} years.`,
          impact: costOfTaxDrag,
          impactTimeframe: `${yearsToRetirement} years`,
        });
      }
    }

    // Check if HSA-eligible but not using HSA
    if (hasHDHP) {
      const currentHSA = 0; // Not tracked separately
      if (currentHSA < maxHSA) {
        const missedHSA = maxHSA - currentHSA;
        // HSA has triple tax advantage - roughly 30% better than taxable
        const hsaBonus = calculateFutureValue(missedHSA, yearsToRetirement) * 0.3;
        results.push({
          type: "opportunity",
          title: "HSA: The Ultimate Tax Shelter",
          description: `You're eligible for HSA but not maxing it. The triple tax advantage could be worth ${formatCurrency(hsaBonus, true)} extra over ${yearsToRetirement} years.`,
          impact: hsaBonus,
          impactTimeframe: `${yearsToRetirement} years`,
        });
      }
    }

    // Check if Roth IRA not maxed
    const rothIRAContribution = Math.min(cPost1, maxIRA);
    if (rothIRAContribution < maxIRA) {
      const missedRoth = maxIRA - rothIRAContribution;
      results.push({
        type: "opportunity",
        title: "Roth IRA Space Available",
        description: `You can contribute ${formatCurrency(missedRoth)} more to Roth IRA this year. Tax-free growth forever!`,
        impact: calculateFutureValue(missedRoth, yearsToRetirement),
        impactTimeframe: `${yearsToRetirement} years`,
      });
    }

    // Mega backdoor opportunity
    if (hasAfterTax401k && hasInPlanConversion) {
      const afterTaxLimit =
        RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_UNDER_50 -
        max401k -
        maxPossibleMatch;
      if (afterTaxLimit > 0) {
        results.push({
          type: "opportunity",
          title: "Mega Backdoor Roth Available!",
          description: `Your plan allows ${formatCurrency(afterTaxLimit)} additional Roth contributions through the mega backdoor strategy.`,
          impact: calculateFutureValue(afterTaxLimit, yearsToRetirement),
          impactTimeframe: `${yearsToRetirement} years`,
        });
      }
    }

    return results;
  }, [
    matchLeftOnTable,
    cPre1,
    cPost1,
    cTax1,
    max401k,
    maxIRA,
    maxHSA,
    hasHDHP,
    hasAfterTax401k,
    hasInPlanConversion,
    yearsToRetirement,
    maxPossibleMatch,
  ]);

  // ============================================================================
  // OPTIMAL ALLOCATION CALCULATOR
  // ============================================================================

  const calculateOptimalAllocation = useCallback(
    (budget: number): OptimizedAllocation => {
      let remaining = budget * 12; // Convert monthly to annual
      const allocation: OptimizedAllocation = {
        traditional401k: 0,
        roth401k: 0,
        afterTax401k: 0,
        rothIRA: 0,
        hsa: 0,
        taxable: 0,
        total: 0,
      };

      // 1. Employer match first
      if (has401k) {
        const matchContributionNeeded = income * (matchLimit / 100);
        const toMatch = Math.min(remaining, matchContributionNeeded);
        allocation.traditional401k = toMatch;
        remaining -= toMatch;
      }

      // 2. HSA (if available)
      if (hasHDHP && remaining > 0) {
        const toHSA = Math.min(remaining, maxHSA);
        allocation.hsa = toHSA;
        remaining -= toHSA;
      }

      // 3. Roth IRA
      if (remaining > 0) {
        const toRoth = Math.min(remaining, maxIRA);
        allocation.rothIRA = toRoth;
        remaining -= toRoth;
      }

      // 4. Max 401k
      if (has401k && remaining > 0) {
        const remainingLimit = max401k - allocation.traditional401k;
        const to401k = Math.min(remaining, remainingLimit);
        if (hasRoth401k) {
          allocation.roth401k = to401k;
        } else {
          allocation.traditional401k += to401k;
        }
        remaining -= to401k;
      }

      // 5. Mega backdoor
      if (hasAfterTax401k && hasInPlanConversion && remaining > 0) {
        const afterTaxLimit =
          RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_UNDER_50 -
          max401k -
          maxPossibleMatch;
        const toAfterTax = Math.min(remaining, afterTaxLimit);
        allocation.afterTax401k = toAfterTax;
        remaining -= toAfterTax;
      }

      // 6. Taxable (remainder)
      if (remaining > 0) {
        allocation.taxable = remaining;
      }

      allocation.total =
        allocation.traditional401k +
        allocation.roth401k +
        allocation.afterTax401k +
        allocation.rothIRA +
        allocation.hsa +
        allocation.taxable;

      return allocation;
    },
    [
      has401k,
      hasRoth401k,
      hasAfterTax401k,
      hasInPlanConversion,
      hasHDHP,
      income,
      matchLimit,
      max401k,
      maxIRA,
      maxHSA,
      maxPossibleMatch,
    ]
  );

  const optimalAllocation = useMemo(
    () => calculateOptimalAllocation(monthlyBudget),
    [calculateOptimalAllocation, monthlyBudget]
  );

  // ============================================================================
  // IMPACT CALCULATION
  // ============================================================================

  const impactComparison = useMemo(() => {
    // Current allocation (suboptimal)
    const currentFV = {
      pretax: calculateFutureValue(cPre1, yearsToRetirement),
      roth: calculateFutureValue(cPost1, yearsToRetirement),
      taxable: calculateFutureValue(cTax1, yearsToRetirement, EXPECTED_RETURN - 0.01), // Tax drag
      total: 0,
    };
    currentFV.total = currentFV.pretax + currentFV.roth + currentFV.taxable;

    // Optimal allocation
    const optimalFV = {
      pretax: calculateFutureValue(
        optimalAllocation.traditional401k,
        yearsToRetirement
      ),
      roth: calculateFutureValue(
        optimalAllocation.roth401k + optimalAllocation.rothIRA + optimalAllocation.afterTax401k,
        yearsToRetirement
      ),
      hsa: calculateFutureValue(
        optimalAllocation.hsa,
        yearsToRetirement,
        EXPECTED_RETURN * 1.1 // HSA bonus from triple tax
      ),
      taxable: calculateFutureValue(
        optimalAllocation.taxable,
        yearsToRetirement,
        EXPECTED_RETURN - 0.01
      ),
      match: calculateFutureValue(
        Math.min(optimalAllocation.traditional401k, income * (matchLimit / 100)) *
          (matchPercent / 100),
        yearsToRetirement
      ),
      total: 0,
    };
    optimalFV.total =
      optimalFV.pretax +
      optimalFV.roth +
      optimalFV.hsa +
      optimalFV.taxable +
      optimalFV.match;

    return {
      current: currentFV,
      optimal: optimalFV,
      improvement: optimalFV.total - currentFV.total,
      improvementPercent:
        currentFV.total > 0
          ? ((optimalFV.total - currentFV.total) / currentFV.total) * 100
          : 0,
    };
  }, [
    cPre1,
    cPost1,
    cTax1,
    optimalAllocation,
    yearsToRetirement,
    income,
    matchLimit,
    matchPercent,
  ]);

  // ============================================================================
  // ACTION ITEMS
  // ============================================================================

  const actionItems = useMemo((): ActionItem[] => {
    const items: ActionItem[] = [];

    // 401k percentage
    if (optimalAllocation.traditional401k > 0 || optimalAllocation.roth401k > 0) {
      const total401k = optimalAllocation.traditional401k + optimalAllocation.roth401k;
      const percentOfSalary = Math.round((total401k / income) * 100);

      items.push({
        account: "401(k)",
        action: "Set contribution percentage",
        specific: `Change your 401(k) contribution to ${percentOfSalary}% of salary (${formatCurrency(total401k / 12)}/month)`,
        priority: matchLeftOnTable > 0 ? "high" : "medium",
      });
    }

    // Roth IRA
    if (optimalAllocation.rothIRA > 0) {
      const monthly = Math.round(optimalAllocation.rothIRA / 12);
      items.push({
        account: "Roth IRA",
        action: "Set up automatic contribution",
        specific: `Set up automatic monthly transfer of ${formatCurrency(monthly)} to Roth IRA (or ${formatCurrency(optimalAllocation.rothIRA)} annually)`,
        priority: "high",
      });
    }

    // HSA
    if (optimalAllocation.hsa > 0) {
      const monthly = Math.round(optimalAllocation.hsa / 12);
      items.push({
        account: "HSA",
        action: "Maximize HSA contributions",
        specific: `Contribute ${formatCurrency(monthly)}/month to HSA through payroll deduction`,
        priority: "high",
      });
    }

    // Mega backdoor
    if (optimalAllocation.afterTax401k > 0) {
      items.push({
        account: "After-tax 401(k)",
        action: "Enable mega backdoor Roth",
        specific: `Contact HR to set up after-tax contributions of ${formatCurrency(optimalAllocation.afterTax401k)}/year with automatic in-plan Roth conversion`,
        priority: "medium",
      });
    }

    return items;
  }, [optimalAllocation, income, matchLeftOnTable]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Contribution Order Optimizer
                </CardTitle>
                <CardDescription className="text-base">
                  Save money in the right order to maximize your retirement
                </CardDescription>
              </div>
            </div>
            {insights.filter((i) => i.type === "warning").length > 0 && (
              <Badge
                variant="destructive"
                className="text-sm px-3 py-1 flex items-center gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                {insights.filter((i) => i.type === "warning").length} Issue
                {insights.filter((i) => i.type === "warning").length > 1
                  ? "s"
                  : ""}{" "}
                Found
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Employer-Specific Questions */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowQuestionnaire(!showQuestionnaire)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Your Employer Benefits</CardTitle>
            </div>
            {showQuestionnaire ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <CardDescription>
            Answer a few questions to customize recommendations for your
            situation
          </CardDescription>
        </CardHeader>
        {showQuestionnaire && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 401k Options */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  401(k) Options
                </h4>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Has 401(k)</p>
                    <p className="text-xs text-muted-foreground">
                      Employer offers 401(k) plan
                    </p>
                  </div>
                  <Switch checked={has401k} onCheckedChange={setHas401k} />
                </div>

                {has401k && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Roth 401(k) Option</p>
                        <p className="text-xs text-muted-foreground">
                          Can contribute after-tax to Roth 401(k)
                        </p>
                      </div>
                      <Switch
                        checked={hasRoth401k}
                        onCheckedChange={setHasRoth401k}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">After-Tax Contributions</p>
                        <p className="text-xs text-muted-foreground">
                          Beyond regular 401(k) limit
                        </p>
                      </div>
                      <Switch
                        checked={hasAfterTax401k}
                        onCheckedChange={setHasAfterTax401k}
                      />
                    </div>

                    {hasAfterTax401k && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">In-Plan Roth Conversion</p>
                          <p className="text-xs text-muted-foreground">
                            Required for mega backdoor Roth
                          </p>
                        </div>
                        <Switch
                          checked={hasInPlanConversion}
                          onCheckedChange={setHasInPlanConversion}
                        />
                      </div>
                    )}

                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          Employer Match: {matchPercent}% up to {matchLimit}% of
                          salary
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Match Rate
                          </p>
                          <Slider
                            value={[matchPercent]}
                            onValueChange={(v) => setMatchPercent(v[0])}
                            min={0}
                            max={100}
                            step={25}
                            gradient={false}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Up To % of Salary
                          </p>
                          <Slider
                            value={[matchLimit]}
                            onValueChange={(v) => setMatchLimit(v[0])}
                            min={0}
                            max={10}
                            step={1}
                            gradient={false}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Health & Other */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Health Plan
                </h4>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">High Deductible Health Plan</p>
                    <p className="text-xs text-muted-foreground">
                      Enables HSA contributions (triple tax benefit!)
                    </p>
                  </div>
                  <Switch checked={hasHDHP} onCheckedChange={setHasHDHP} />
                </div>

                {hasHDHP && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                        HSA Eligible!
                      </p>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Max contribution:{" "}
                      {formatCurrency(maxHSA)}/year
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Smart Detection - Warnings & Opportunities */}
      {insights.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Smart Detection</CardTitle>
            </div>
            <CardDescription>
              Issues and opportunities we found in your current savings strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  insight.type === "warning"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    : insight.type === "opportunity"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        insight.type === "warning"
                          ? "text-red-700 dark:text-red-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {insight.title}
                    </p>
                    <p
                      className={`text-sm ${
                        insight.type === "warning"
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {insight.description}
                    </p>
                  </div>
                  {insight.impact && (
                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          insight.type === "warning"
                            ? "text-red-700 dark:text-red-300"
                            : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {insight.type === "warning" ? "-" : "+"}
                        {formatCurrency(insight.impact, true)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        over {insight.impactTimeframe}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Visual Priority Stack */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">The Optimal Saving Order</CardTitle>
          </div>
          <CardDescription>
            Fill each bucket from top to bottom before moving to the next
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorityStack.map((account, idx) => (
            <div
              key={account.id}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                account.isAvailable
                  ? `${account.bgColor} ${account.borderColor}`
                  : "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Priority Number */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    account.isAvailable
                      ? account.id === "401k-match"
                        ? "bg-emerald-600"
                        : account.id === "hsa"
                          ? "bg-rose-600"
                          : account.id === "roth-ira"
                            ? "bg-purple-600"
                            : account.id === "401k-max"
                              ? "bg-blue-600"
                              : account.id === "mega-backdoor"
                                ? "bg-amber-600"
                                : "bg-slate-600"
                      : "bg-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={account.color}>{account.icon}</span>
                    <h4 className="font-semibold">{account.name}</h4>
                    {!account.isAvailable && (
                      <Badge variant="outline" className="text-xs">
                        Not Available
                      </Badge>
                    )}
                    {account.id === "401k-match" && (
                      <Badge className="bg-emerald-600 text-xs">FREE MONEY</Badge>
                    )}
                    {account.id === "hsa" && account.isAvailable && (
                      <Badge className="bg-rose-600 text-xs">TRIPLE TAX FREE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {account.description}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {account.taxAdvantage}
                  </p>

                  {/* Progress bar (if available and has limit) */}
                  {account.isAvailable && account.limit !== Infinity && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          {formatCurrency(account.currentContribution)} of{" "}
                          {formatCurrency(account.limit)}
                        </span>
                        <span className={account.leftOnTable > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                          {account.leftOnTable > 0
                            ? `${formatCurrency(account.leftOnTable)} room left`
                            : "Maxed!"}
                        </span>
                      </div>
                      <Progress
                        value={
                          (account.currentContribution / account.limit) * 100
                        }
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Unavailable reason */}
                  {!account.isAvailable && account.unavailableReason && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {account.unavailableReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Impact Calculator */}
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Impact Calculator</CardTitle>
          </div>
          <CardDescription>
            See how optimizing your contribution order affects your retirement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Before/After Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Strategy */}
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-700 dark:text-red-300">
                  Current Strategy
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pre-tax 401(k)</span>
                  <span>{formatCurrency(cPre1)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span>Roth</span>
                  <span>{formatCurrency(cPost1)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable</span>
                  <span>{formatCurrency(cTax1)}/yr</span>
                </div>
                <div className="pt-2 border-t border-red-200 dark:border-red-800">
                  <div className="flex justify-between font-semibold">
                    <span>Projected Value ({yearsToRetirement}yr)</span>
                    <span>{formatCurrency(impactComparison.current.total, true)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimized Strategy */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-700 dark:text-green-300">
                  Optimized Strategy
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pre-tax 401(k)</span>
                  <span>{formatCurrency(optimalAllocation.traditional401k)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span>Roth (401k + IRA)</span>
                  <span>
                    {formatCurrency(
                      optimalAllocation.roth401k + optimalAllocation.rothIRA
                    )}
                    /yr
                  </span>
                </div>
                {optimalAllocation.hsa > 0 && (
                  <div className="flex justify-between">
                    <span>HSA</span>
                    <span>{formatCurrency(optimalAllocation.hsa)}/yr</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable</span>
                  <span>{formatCurrency(optimalAllocation.taxable)}/yr</span>
                </div>
                <div className="pt-2 border-t border-green-200 dark:border-green-800">
                  <div className="flex justify-between font-semibold">
                    <span>Projected Value ({yearsToRetirement}yr)</span>
                    <span>{formatCurrency(impactComparison.optimal.total, true)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Improvement */}
          {impactComparison.improvement > 0 && (
            <div className="p-6 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 rounded-xl text-center">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">
                Reordering your contributions adds
              </p>
              <p className="text-4xl font-bold text-green-700 dark:text-green-300">
                +{formatCurrency(impactComparison.improvement, true)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                over {yearsToRetirement} years (
                {impactComparison.improvementPercent.toFixed(0)}% more)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Budget Allocator */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowAllocator(!showAllocator)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Monthly Budget Allocator</CardTitle>
            </div>
            {showAllocator ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <CardDescription>
            "I have ${monthlyBudget.toLocaleString()}/month to save - show me
            the optimal distribution"
          </CardDescription>
        </CardHeader>
        {showAllocator && (
          <CardContent className="space-y-6">
            {/* Budget Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium">Monthly Savings Budget</label>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(monthlyBudget)}
                </span>
              </div>
              <Slider
                value={[monthlyBudget]}
                onValueChange={(v) => setMonthlyBudget(v[0])}
                min={500}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$500</span>
                <span>$10,000</span>
              </div>
            </div>

            {/* Visual Allocation */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Optimal Distribution</h4>

              {/* Stacked bar visualization */}
              <div className="h-12 w-full rounded-lg overflow-hidden flex">
                {optimalAllocation.traditional401k > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.traditional401k / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.traditional401k / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
                {optimalAllocation.hsa > 0 && (
                  <div
                    className="bg-rose-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.hsa / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.hsa / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
                {optimalAllocation.rothIRA > 0 && (
                  <div
                    className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.rothIRA / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.rothIRA / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
                {optimalAllocation.roth401k > 0 && (
                  <div
                    className="bg-indigo-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.roth401k / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.roth401k / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
                {optimalAllocation.afterTax401k > 0 && (
                  <div
                    className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.afterTax401k / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.afterTax401k / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
                {optimalAllocation.taxable > 0 && (
                  <div
                    className="bg-slate-400 flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${(optimalAllocation.taxable / optimalAllocation.total) * 100}%`,
                    }}
                  >
                    {((optimalAllocation.taxable / optimalAllocation.total) * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {optimalAllocation.traditional401k > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>
                      401(k): {formatCurrency(optimalAllocation.traditional401k / 12)}
                      /mo
                    </span>
                  </div>
                )}
                {optimalAllocation.hsa > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span>
                      HSA: {formatCurrency(optimalAllocation.hsa / 12)}/mo
                    </span>
                  </div>
                )}
                {optimalAllocation.rothIRA > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-500" />
                    <span>
                      Roth IRA: {formatCurrency(optimalAllocation.rothIRA / 12)}
                      /mo
                    </span>
                  </div>
                )}
                {optimalAllocation.roth401k > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-500" />
                    <span>
                      Roth 401(k): {formatCurrency(optimalAllocation.roth401k / 12)}
                      /mo
                    </span>
                  </div>
                )}
                {optimalAllocation.afterTax401k > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span>
                      Mega Backdoor:{" "}
                      {formatCurrency(optimalAllocation.afterTax401k / 12)}/mo
                    </span>
                  </div>
                )}
                {optimalAllocation.taxable > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-400" />
                    <span>
                      Taxable: {formatCurrency(optimalAllocation.taxable / 12)}
                      /mo
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Paycheck Integration - Action Items */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Action Items</CardTitle>
          </div>
          <CardDescription>
            Specific changes to make to optimize your contributions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                item.priority === "high"
                  ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                  : item.priority === "medium"
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    item.priority === "high"
                      ? "bg-red-500"
                      : item.priority === "medium"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={
                        item.priority === "high"
                          ? "border-red-300 text-red-700"
                          : item.priority === "medium"
                            ? "border-amber-300 text-amber-700"
                            : "border-blue-300 text-blue-700"
                      }
                    >
                      {item.account}
                    </Badge>
                    <span className="font-semibold">{item.action}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.specific}</p>
                </div>
              </div>
            </div>
          ))}

          {actionItems.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">You're Optimized!</p>
              <p className="text-muted-foreground">
                Your current contribution order follows best practices.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Educational Footer */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Why Order Matters
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Most people save in the wrong order because no one teaches this.
                The order above is optimized for:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  <strong>Free money first</strong> - Never leave employer match
                  on the table
                </li>
                <li>
                  <strong>Triple tax advantages</strong> - HSA is better than
                  Roth for healthcare
                </li>
                <li>
                  <strong>Tax-free growth</strong> - Roth accounts grow
                  tax-free forever
                </li>
                <li>
                  <strong>Tax diversification</strong> - Mix of pre-tax and
                  post-tax for flexibility
                </li>
                <li>
                  <strong>Taxable last</strong> - Use tax-advantaged space
                  before taxable
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Button */}
      {onOptimize && (
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => onOptimize(optimalAllocation)}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Apply Optimized Allocation
          </Button>
        </div>
      )}
    </div>
  );
});

ContributionOrder.displayName = "ContributionOrder";

export default ContributionOrder;

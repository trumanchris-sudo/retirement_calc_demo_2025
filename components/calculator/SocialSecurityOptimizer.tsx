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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Info,
  AlertTriangle,
  CheckCircle2,
  Users,
  Heart,
  Wallet,
  Calculator,
  ChevronDown,
  ChevronUp,
  Target,
  Scale,
  Shield,
  Clock,
} from "lucide-react";
import {
  optimizeSocialSecurity,
  formatCurrency,
  getKeyInsights,
  FULL_RETIREMENT_AGE,
  type SSOptimizerInputs,
  type SSOptimizationResult,
  type ClaimingAgeAnalysis,
  type SpousalStrategy,
} from "@/lib/calculations/ssOptimizer";
import type { FilingStatus } from "@/types/calculator";

// ============================================================================
// TYPES
// ============================================================================

interface SocialSecurityOptimizerProps {
  // Required inputs from parent
  currentAge: number;
  ssIncome: number; // Average career earnings for SS calculation
  portfolioValue?: number;
  annualSpending?: number;
  expectedReturnRate?: number;
  filingStatus?: FilingStatus;
  otherRetirementIncome?: number;
  stateIncomeTaxRate?: number;

  // Spouse info (if married)
  isMarried?: boolean;
  spouseAge?: number;
  spouseSsIncome?: number;

  // Optional callbacks
  onRecommendationChange?: (claimAge: number, spouseClaimAge?: number) => void;

  // Display options
  isCalculating?: boolean;
  showDetailedAnalysis?: boolean;
}

type HealthStatus = "excellent" | "good" | "fair" | "poor";
type Gender = "male" | "female";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Benefit comparison bar chart for claiming ages
 */
const ClaimingAgeChart: React.FC<{
  claimingAges: ClaimingAgeAnalysis[];
  selectedAge: number;
  onSelectAge: (age: number) => void;
}> = ({ claimingAges, selectedAge, onSelectAge }) => {
  const maxBenefit = Math.max(...claimingAges.map((c) => c.monthlyBenefit));

  return (
    <div className="space-y-2">
      {claimingAges.map((ca) => {
        const width = (ca.monthlyBenefit / maxBenefit) * 100;
        const isSelected = ca.age === selectedAge;
        const isFRA = ca.age === FULL_RETIREMENT_AGE;
        const isEarly = ca.age < FULL_RETIREMENT_AGE;

        return (
          <button
            key={ca.age}
            onClick={() => onSelectAge(ca.age)}
            className={`w-full text-left p-2 rounded-lg border transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Age {ca.age}</span>
                {isFRA && (
                  <Badge variant="outline" className="text-xs">
                    FRA
                  </Badge>
                )}
                {ca.age === 70 && (
                  <Badge className="text-xs bg-green-500">Maximum</Badge>
                )}
                {ca.age === 62 && (
                  <Badge variant="secondary" className="text-xs">
                    Earliest
                  </Badge>
                )}
              </div>
              <span className="font-bold text-sm">
                {formatCurrency(ca.monthlyBenefit)}/mo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isEarly
                      ? "bg-gradient-to-r from-orange-400 to-orange-500"
                      : ca.age === 67
                      ? "bg-gradient-to-r from-blue-400 to-blue-500"
                      : "bg-gradient-to-r from-green-400 to-green-500"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium w-16 text-right ${
                  ca.reductionOrIncrease < 0
                    ? "text-orange-600"
                    : ca.reductionOrIncrease > 0
                    ? "text-green-600"
                    : "text-blue-600"
                }`}
              >
                {ca.reductionOrIncrease > 0 ? "+" : ""}
                {ca.reductionOrIncrease.toFixed(0)}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Break-even analysis visualization
 */
const BreakEvenSection: React.FC<{
  result: SSOptimizationResult;
  lifeExpectancy: number;
  onLifeExpectancyChange: (value: number) => void;
}> = ({ result, lifeExpectancy, onLifeExpectancyChange }) => {
  const breakEven62vs70 = result.breakEvenAnalysis.find(
    (b) => b.claimAge1 === 62 && b.claimAge2 === 70
  );

  const breakEven62vs67 = result.breakEvenAnalysis.find(
    (b) => b.claimAge1 === 62 && b.claimAge2 === 67
  );

  const breakEven67vs70 = result.breakEvenAnalysis.find(
    (b) => b.claimAge1 === 67 && b.claimAge2 === 70
  );

  const lifetimeAt62 = result.lifetimeBenefits.find((l) => l.claimAge === 62)!;
  const lifetimeAt70 = result.lifetimeBenefits.find((l) => l.claimAge === 70)!;

  const willReachBreakEven =
    breakEven62vs70 && lifeExpectancy > breakEven62vs70.breakEvenAge;
  const probReachBreakEven = lifetimeAt70.probabilityOfLivingToBreakEven;

  return (
    <div className="space-y-4">
      {/* Life Expectancy Slider */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Your Life Expectancy</Label>
          <span className="text-lg font-bold">{lifeExpectancy} years</span>
        </div>
        <Slider
          value={[lifeExpectancy]}
          onValueChange={(v) => onLifeExpectancyChange(v[0])}
          min={70}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>70 yrs</span>
          <span>85 yrs (avg)</span>
          <span>100 yrs</span>
        </div>
      </div>

      {/* Break-even Result */}
      {breakEven62vs70 && (
        <div
          className={`rounded-lg p-4 border ${
            willReachBreakEven
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {willReachBreakEven ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            )}
            <div>
              <div
                className={`font-semibold mb-1 ${
                  willReachBreakEven
                    ? "text-green-900 dark:text-green-100"
                    : "text-orange-900 dark:text-orange-100"
                }`}
              >
                {willReachBreakEven
                  ? "Waiting Until 70 Pays Off!"
                  : "Claiming Early May Be Better"}
              </div>
              <p
                className={`text-sm ${
                  willReachBreakEven
                    ? "text-green-800 dark:text-green-200"
                    : "text-orange-800 dark:text-orange-200"
                }`}
              >
                Break-even age is{" "}
                <strong>{breakEven62vs70.breakEvenAge.toFixed(1)}</strong>.
                {willReachBreakEven
                  ? ` At your expected lifespan of ${lifeExpectancy}, waiting until 70 results in ${formatCurrency(
                      lifetimeAt70.lifetimeBenefit - lifetimeAt62.lifetimeBenefit
                    )} MORE in lifetime benefits.`
                  : ` With a life expectancy of ${lifeExpectancy}, claiming earlier may maximize your total benefits.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Probability Section */}
      <div className="grid grid-cols-3 gap-3">
        {breakEven62vs67 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="text-xs text-muted-foreground mb-1">
              62 vs 67 Break-even
            </div>
            <div className="text-lg font-bold">
              Age {breakEven62vs67.breakEvenAge.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {breakEven62vs67.breakEvenYears.toFixed(1)} years to recover
            </div>
          </div>
        )}
        {breakEven62vs70 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="text-xs text-muted-foreground mb-1">
              62 vs 70 Break-even
            </div>
            <div className="text-lg font-bold">
              Age {breakEven62vs70.breakEvenAge.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {breakEven62vs70.breakEvenYears.toFixed(1)} years to recover
            </div>
          </div>
        )}
        {breakEven67vs70 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
            <div className="text-xs text-muted-foreground mb-1">
              FRA vs 70 Break-even
            </div>
            <div className="text-lg font-bold">
              Age {breakEven67vs70.breakEvenAge.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {breakEven67vs70.breakEvenYears.toFixed(1)} years to recover
            </div>
          </div>
        )}
      </div>

      {/* Actuarial Probability */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Actuarial Probability
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Based on SSA life tables, there is a{" "}
              <strong>{(probReachBreakEven * 100).toFixed(0)}%</strong>{" "}
              probability of living past the break-even age of{" "}
              {breakEven62vs70?.breakEvenAge.toFixed(0)}. This is one of the
              most important factors in your decision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lifetime benefits comparison with expected value
 */
const LifetimeBenefitsSection: React.FC<{
  result: SSOptimizationResult;
  lifeExpectancy: number;
}> = ({ result, lifeExpectancy }) => {
  const maxExpectedValue = Math.max(
    ...result.lifetimeBenefits.map((l) => l.expectedValueAdjusted)
  );

  // Recalculate lifetime benefits based on user's life expectancy
  const adjustedBenefits = result.lifetimeBenefits.map((lb) => {
    const yearsOfBenefits = Math.max(0, lifeExpectancy - lb.claimAge);
    const lifetimeBenefit = lb.monthlyBenefit * 12 * yearsOfBenefits;
    return {
      ...lb,
      adjustedLifetimeBenefit: lifetimeBenefit,
    };
  });

  const maxAdjusted = Math.max(
    ...adjustedBenefits.map((l) => l.adjustedLifetimeBenefit)
  );
  const optimalAge = adjustedBenefits.find(
    (l) => l.adjustedLifetimeBenefit === maxAdjusted
  )?.claimAge;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Total lifetime benefits by claiming age (based on life expectancy of{" "}
        {lifeExpectancy})
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        {adjustedBenefits
          .filter((lb) => [62, 65, 67, 70].includes(lb.claimAge))
          .map((lb) => {
            const width = (lb.adjustedLifetimeBenefit / maxAdjusted) * 100;
            const isOptimal = lb.claimAge === optimalAge;

            return (
              <div key={lb.claimAge} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Claim at {lb.claimAge}</span>
                    {isOptimal && (
                      <Badge className="bg-green-500 text-xs">Optimal</Badge>
                    )}
                  </div>
                  <span className="font-bold">
                    {formatCurrency(lb.adjustedLifetimeBenefit)}
                  </span>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                      isOptimal
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : "bg-gradient-to-r from-blue-400 to-blue-500"
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-white text-xs font-medium">
                      {formatCurrency(lb.adjustedLifetimeBenefit / 1000)}k
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Expected Value Section */}
      <div className="border-t pt-4 mt-4">
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Expected Value (Mortality-Adjusted)
        </div>
        <div className="grid grid-cols-3 gap-3">
          {result.lifetimeBenefits
            .filter((lb) => [62, 67, 70].includes(lb.claimAge))
            .map((lb) => {
              const isMax = lb.expectedValueAdjusted === maxExpectedValue;
              return (
                <div
                  key={lb.claimAge}
                  className={`rounded-lg p-3 border ${
                    isMax
                      ? "bg-green-50 dark:bg-green-950/20 border-green-300"
                      : "bg-white dark:bg-gray-900"
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    Claim at {lb.claimAge}
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(lb.expectedValueAdjusted)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(lb.probabilityOfLivingToBreakEven * 100).toFixed(0)}% to
                    break-even
                  </div>
                </div>
              );
            })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Expected value accounts for the probability of dying before each age,
          giving a more realistic comparison.
        </p>
      </div>
    </div>
  );
};

/**
 * Spousal strategy comparison
 */
const SpousalStrategySection: React.FC<{
  strategies: SpousalStrategy[];
  optimalStrategy?: SpousalStrategy;
}> = ({ strategies, optimalStrategy }) => {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(
    optimalStrategy?.strategy || null
  );

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-purple-600 mt-0.5" />
          <div>
            <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Critical for Married Couples
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              When one spouse dies, the survivor keeps the{" "}
              <strong>HIGHER</strong> of the two benefits. The higher earner
              delaying to 70 protects the surviving spouse from a massive income
              drop.
            </p>
          </div>
        </div>
      </div>

      {strategies.map((strategy) => {
        const isOptimal = strategy.strategy === optimalStrategy?.strategy;
        const isExpanded = expandedStrategy === strategy.strategy;

        return (
          <div
            key={strategy.strategy}
            className={`rounded-lg border transition-all ${
              isOptimal
                ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <button
              onClick={() =>
                setExpandedStrategy(isExpanded ? null : strategy.strategy)
              }
              className="w-full text-left p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOptimal && (
                    <Badge className="bg-green-500">Recommended</Badge>
                  )}
                  <span className="font-semibold">{strategy.strategy}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">
                    {formatCurrency(strategy.combinedMonthlyBenefit)}/mo
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {strategy.description}
              </p>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">
                      Person 1 Claims
                    </div>
                    <div className="text-lg font-bold">
                      Age {strategy.person1ClaimAge}
                    </div>
                    <div className="text-sm">
                      {formatCurrency(strategy.person1MonthlyBenefit)}/mo
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground">
                      Person 2 Claims
                    </div>
                    <div className="text-lg font-bold">
                      Age {strategy.person2ClaimAge}
                    </div>
                    <div className="text-sm">
                      {formatCurrency(strategy.person2MonthlyBenefit)}/mo
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-purple-600">
                      Survivor Benefit
                    </div>
                    <div className="text-lg font-bold text-purple-700">
                      {formatCurrency(strategy.survivorBenefit)}/mo
                    </div>
                    <div className="text-xs text-muted-foreground">
                      If one spouse passes
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Pros
                    </div>
                    <ul className="text-sm space-y-1">
                      {strategy.pros.map((pro, i) => (
                        <li key={i} className="text-muted-foreground">
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Cons
                    </div>
                    <ul className="text-sm space-y-1">
                      {strategy.cons.map((con, i) => (
                        <li key={i} className="text-muted-foreground">
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Portfolio coordination section
 */
const PortfolioCoordinationSection: React.FC<{
  result: SSOptimizationResult;
  portfolioValue: number;
  annualSpending: number;
}> = ({ result, annualSpending }) => {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Portfolio Bridge Strategy
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              If you delay Social Security, you need to draw MORE from your
              portfolio early. But delaying SS means less portfolio drawdown
              later, often resulting in higher ending wealth.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {result.portfolioImpact
          .filter((p) => [62, 67, 70].includes(p.claimAge))
          .map((impact) => {
            const yearsLabel = impact.yearsOfDrawdown === 0
              ? "No wait"
              : `${impact.yearsOfDrawdown} years`;

            return (
              <div
                key={impact.claimAge}
                className="bg-white dark:bg-gray-900 rounded-lg p-4 border"
              >
                <div className="text-sm text-muted-foreground mb-1">
                  Claim at {impact.claimAge}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Portfolio Draw Before SS
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(impact.portfolioDrawdownBeforeSS)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {yearsLabel} @ {formatCurrency(annualSpending)}/yr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Portfolio at Age 95
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(impact.portfolioAtAge95)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="text-sm text-muted-foreground">
        <strong>Key insight:</strong> Delaying SS often means a{" "}
        <em>higher</em> portfolio balance at age 95, because the larger SS
        check reduces ongoing withdrawals.
      </div>
    </div>
  );
};

/**
 * Tax implications section
 */
const TaxImplicationsSection: React.FC<{
  result: SSOptimizationResult;
}> = ({ result }) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              How Social Security is Taxed
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Up to 85% of your Social Security can be taxable, depending on
              your combined income. Higher SS benefits mean more taxable income,
              but after-tax you are still better off with the larger benefit.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Claim Age</th>
              <th className="text-right py-2">Annual Benefit</th>
              <th className="text-right py-2">% Taxable</th>
              <th className="text-right py-2">Fed Tax on SS</th>
              <th className="text-right py-2">After-Tax</th>
            </tr>
          </thead>
          <tbody>
            {result.taxImplications
              .filter((t) => [62, 65, 67, 70].includes(t.claimAge))
              .map((tax) => (
                <tr key={tax.claimAge} className="border-b">
                  <td className="py-2 font-medium">{tax.claimAge}</td>
                  <td className="text-right py-2">
                    {formatCurrency(tax.annualBenefit)}
                  </td>
                  <td className="text-right py-2">
                    {tax.taxablePortionPercent.toFixed(0)}%
                  </td>
                  <td className="text-right py-2 text-red-600">
                    {formatCurrency(tax.federalTaxOnSS)}
                  </td>
                  <td className="text-right py-2 font-bold text-green-600">
                    {formatCurrency(tax.afterTaxBenefit)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Even though a larger benefit has higher taxes, the after-tax
        amount is still higher. Do not let tax concerns drive you to claim
        early.
      </p>
    </div>
  );
};

/**
 * Final recommendation card
 */
const RecommendationCard: React.FC<{
  result: SSOptimizationResult;
  insights: string[];
}> = ({ result }) => {
  const { recommendation } = result;
  const benefit = result.claimingAges.find(
    (c) => c.age === recommendation.claimAge
  )!;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-6 w-6" />
        <h3 className="text-xl font-bold">Our Recommendation</h3>
        <Badge
          className={`ml-auto ${
            recommendation.confidence === "high"
              ? "bg-green-500"
              : recommendation.confidence === "medium"
              ? "bg-yellow-500"
              : "bg-orange-500"
          }`}
        >
          {recommendation.confidence} confidence
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm opacity-80 mb-1">Claim Social Security at</div>
          <div className="text-5xl font-bold mb-2">
            Age {recommendation.claimAge}
          </div>
          <div className="text-xl">
            {formatCurrency(benefit.monthlyBenefit)}/month
          </div>
          {recommendation.spouseClaimAge && (
            <div className="mt-3 text-sm opacity-80">
              Spouse should claim at age{" "}
              <strong>{recommendation.spouseClaimAge}</strong>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium opacity-80">Why this timing:</div>
          <ul className="space-y-2">
            {recommendation.reasoning.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {recommendation.lifetimeValueDifference > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-sm opacity-80">
            Compared to claiming at 62, this recommendation provides an
            estimated{" "}
            <strong>
              {formatCurrency(recommendation.lifetimeValueDifference)}
            </strong>{" "}
            more in expected lifetime benefits.
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SocialSecurityOptimizer = React.memo(
  function SocialSecurityOptimizer({
    currentAge,
    ssIncome,
    portfolioValue = 500000,
    annualSpending = 50000,
    expectedReturnRate = 0.06,
    filingStatus = "single",
    otherRetirementIncome = 0,
    stateIncomeTaxRate = 0,
    isMarried = false,
    spouseAge,
    spouseSsIncome = 0,
    onRecommendationChange,
    isCalculating = false,
    showDetailedAnalysis = true,
  }: SocialSecurityOptimizerProps) {
    // Local state for interactive controls
    const [gender, setGender] = useState<Gender>("male");
    const [healthStatus, setHealthStatus] = useState<HealthStatus>("good");
    const [lifeExpectancy, setLifeExpectancy] = useState(85);
    const [selectedClaimAge, setSelectedClaimAge] = useState(67);
    const [spouseGender, setSpouseGender] = useState<Gender>("female");
    const [spouseHealthStatus, setSpouseHealthStatus] =
      useState<HealthStatus>("good");

    // Collapsible sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set(["claiming", "recommendation"])
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

    // Run optimization
    const optimizationResult = useMemo((): SSOptimizationResult | null => {
      if (currentAge < 50 || ssIncome <= 0) return null;

      const inputs: SSOptimizerInputs = {
        currentAge,
        gender,
        averageCareerEarnings: ssIncome,
        healthStatus,
        lifeExpectancy,
        isMarried,
        spouseAge: isMarried ? spouseAge : undefined,
        spouseGender: isMarried ? spouseGender : undefined,
        spouseAverageCareerEarnings: isMarried ? spouseSsIncome : undefined,
        spouseHealthStatus: isMarried ? spouseHealthStatus : undefined,
        currentPortfolioValue: portfolioValue,
        annualRetirementSpending: annualSpending,
        expectedReturnRate,
        filingStatus,
        otherRetirementIncome,
        stateIncomeTaxRate,
      };

      return optimizeSocialSecurity(inputs);
    }, [
      currentAge,
      ssIncome,
      gender,
      healthStatus,
      lifeExpectancy,
      isMarried,
      spouseAge,
      spouseGender,
      spouseSsIncome,
      spouseHealthStatus,
      portfolioValue,
      annualSpending,
      expectedReturnRate,
      filingStatus,
      otherRetirementIncome,
      stateIncomeTaxRate,
    ]);

    // Key insights
    const insights = useMemo(() => {
      if (!optimizationResult) return [];
      return getKeyInsights(optimizationResult);
    }, [optimizationResult]);

    // Notify parent of recommendation changes
    React.useEffect(() => {
      if (optimizationResult && onRecommendationChange) {
        onRecommendationChange(
          optimizationResult.recommendation.claimAge,
          optimizationResult.recommendation.spouseClaimAge
        );
      }
    }, [optimizationResult, onRecommendationChange]);

    // Loading state
    if (isCalculating) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
              Social Security Claiming Optimizer
            </CardTitle>
            <CardDescription>
              Analyzing optimal claiming strategies...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-pulse text-muted-foreground">
                Calculating break-even ages and lifetime benefits...
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // No data state
    if (!optimizationResult) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
              Social Security Claiming Optimizer
            </CardTitle>
            <CardDescription>
              Enter your Social Security income to see optimization analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Waiting for Data
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {currentAge < 50
                      ? "Social Security optimization is most relevant for those age 50+. Come back when you're closer to retirement!"
                      : "Please enter your average career earnings (Social Security income) to see claiming optimization analysis."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Social Security Claiming Optimizer
          </CardTitle>
          <CardDescription>
            The most important financial decision of your retirement: WHEN to
            claim. Claiming at 62 vs 70 can mean $200,000+ difference.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Key Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-900">
              <div className="text-xs text-orange-600 mb-1">At 62 (Early)</div>
              <div className="text-xl font-bold text-orange-700">
                {formatCurrency(
                  optimizationResult.claimingAges.find((c) => c.age === 62)!
                    .monthlyBenefit
                )}
              </div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
              <div className="text-xs text-blue-600 mb-1">At 67 (FRA)</div>
              <div className="text-xl font-bold text-blue-700">
                {formatCurrency(
                  optimizationResult.claimingAges.find((c) => c.age === 67)!
                    .monthlyBenefit
                )}
              </div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
              <div className="text-xs text-green-600 mb-1">At 70 (Max)</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(
                  optimizationResult.claimingAges.find((c) => c.age === 70)!
                    .monthlyBenefit
                )}
              </div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-900">
              <div className="text-xs text-purple-600 mb-1">62 to 70 Boost</div>
              <div className="text-xl font-bold text-purple-700">+77%</div>
              <div className="text-xs text-muted-foreground">more per month</div>
            </div>
          </div>

          {/* User Settings */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
            <div className="text-sm font-medium mb-3">Your Information</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={(v: Gender) => setGender(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Health Status</Label>
                <Select
                  value={healthStatus}
                  onValueChange={(v: HealthStatus) => setHealthStatus(v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (+3 yrs)</SelectItem>
                    <SelectItem value="good">Good (avg)</SelectItem>
                    <SelectItem value="fair">Fair (-3 yrs)</SelectItem>
                    <SelectItem value="poor">Poor (-7 yrs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isMarried && (
                <>
                  <div>
                    <Label className="text-xs">Spouse Gender</Label>
                    <Select
                      value={spouseGender}
                      onValueChange={(v: Gender) => setSpouseGender(v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Spouse Health</Label>
                    <Select
                      value={spouseHealthStatus}
                      onValueChange={(v: HealthStatus) => setSpouseHealthStatus(v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recommendation Card */}
          <RecommendationCard result={optimizationResult} insights={insights} />

          {showDetailedAnalysis && (
            <>
              {/* Section: Claiming Age Comparison */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("claiming")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">
                      Claiming Age Comparison
                    </span>
                  </div>
                  {expandedSections.has("claiming") ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSections.has("claiming") && (
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong>Each year you wait adds ~8% to your benefit</strong>{" "}
                      (after FRA). Claiming at 62 means a{" "}
                      <strong>30% permanent reduction</strong> vs FRA.
                    </p>
                    <ClaimingAgeChart
                      claimingAges={optimizationResult.claimingAges}
                      selectedAge={selectedClaimAge}
                      onSelectAge={setSelectedClaimAge}
                    />
                  </div>
                )}
              </div>

              {/* Section: Break-Even Analysis */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("breakeven")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Break-Even Analysis</span>
                  </div>
                  {expandedSections.has("breakeven") ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSections.has("breakeven") && (
                  <div className="p-4">
                    <BreakEvenSection
                      result={optimizationResult}
                      lifeExpectancy={lifeExpectancy}
                      onLifeExpectancyChange={setLifeExpectancy}
                    />
                  </div>
                )}
              </div>

              {/* Section: Lifetime Benefits */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("lifetime")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">
                      Lifetime Benefits Comparison
                    </span>
                  </div>
                  {expandedSections.has("lifetime") ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSections.has("lifetime") && (
                  <div className="p-4">
                    <LifetimeBenefitsSection
                      result={optimizationResult}
                      lifeExpectancy={lifeExpectancy}
                    />
                  </div>
                )}
              </div>

              {/* Section: Spousal Strategies (if married) */}
              {isMarried && optimizationResult.spousalStrategies && (
                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection("spousal")}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-pink-600" />
                      <span className="font-semibold">
                        Spousal Strategy Optimizer
                      </span>
                    </div>
                    {expandedSections.has("spousal") ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  {expandedSections.has("spousal") && (
                    <div className="p-4">
                      <SpousalStrategySection
                        strategies={optimizationResult.spousalStrategies}
                        optimalStrategy={optimizationResult.optimalSpousalStrategy}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Section: Portfolio Coordination */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("portfolio")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold">
                      Coordination with Portfolio
                    </span>
                  </div>
                  {expandedSections.has("portfolio") ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSections.has("portfolio") && (
                  <div className="p-4">
                    <PortfolioCoordinationSection
                      result={optimizationResult}
                      portfolioValue={portfolioValue}
                      annualSpending={annualSpending}
                    />
                  </div>
                )}
              </div>

              {/* Section: Tax Implications */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("tax")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <span className="font-semibold">Tax Implications</span>
                  </div>
                  {expandedSections.has("tax") ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSections.has("tax") && (
                  <div className="p-4">
                    <TaxImplicationsSection result={optimizationResult} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Key Insights */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Key Insights</span>
            </div>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Important Disclaimer */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Important Considerations
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This analysis is based on general actuarial data and your
                  inputs. Individual circumstances vary. Consider consulting
                  with a financial advisor for personalized advice. Health
                  changes, family history, and other income sources can
                  significantly affect the optimal claiming strategy.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

SocialSecurityOptimizer.displayName = "SocialSecurityOptimizer";

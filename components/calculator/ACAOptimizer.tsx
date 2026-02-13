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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  DollarSign,
  AlertTriangle,
  Info,
  TrendingDown,
  Calendar,
  ExternalLink,
  Lightbulb,
  Target,
  ArrowRight,
  CheckCircle2,
  Zap,
  PiggyBank,
} from "lucide-react";

// ===============================
// Constants - ACA 2024/2025
// ===============================

/**
 * Federal Poverty Level (FPL) for 2024
 * These are the base amounts for the 48 contiguous states + DC
 * Alaska and Hawaii have higher amounts
 */
const FPL_2024 = {
  base: 15060, // Individual
  perAdditional: 5380, // Per additional family member
  // Commonly referenced household sizes
  sizes: {
    1: 15060,
    2: 20440,
    3: 25820,
    4: 31200,
    5: 36580,
    6: 41960,
    7: 47340,
    8: 52720,
  } as Record<number, number>,
} as const;

/**
 * ACA Premium Tax Credit (PTC) - Income Caps
 * Post-ARP (American Rescue Plan): No hard cliff at 400% FPL
 * Premium caps continue above 400% FPL at 8.5% of income
 */
const ACA_PREMIUM_CAPS_2024 = [
  { fplPercent: 150, maxPremiumPct: 0, description: "Free Silver plans available" },
  { fplPercent: 200, maxPremiumPct: 2.0, description: "Pay up to 2% of income" },
  { fplPercent: 250, maxPremiumPct: 4.0, description: "Pay up to 4% of income" },
  { fplPercent: 300, maxPremiumPct: 6.0, description: "Pay up to 6% of income" },
  { fplPercent: 400, maxPremiumPct: 8.5, description: "Pay up to 8.5% of income" },
  { fplPercent: Infinity, maxPremiumPct: 8.5, description: "Capped at 8.5% (no cliff)" },
] as const;

/**
 * Silver plan benchmark premiums by age (2024, national average)
 * These are monthly premiums for the second-lowest-cost Silver plan
 * Used to calculate the Premium Tax Credit
 */
const SILVER_BENCHMARK_MONTHLY_2024: Record<number, number> = {
  21: 310,
  25: 330,
  30: 354,
  35: 376,
  40: 398,
  45: 477,
  50: 556,
  55: 700,
  60: 900,
  64: 1050,
};

/**
 * State Health Insurance Exchanges
 * Some states run their own exchanges with different enrollment periods/rules
 */
const STATE_EXCHANGES: Record<string, { name: string; url: string; isStateBased: boolean }> = {
  CA: { name: "Covered California", url: "https://www.coveredca.com", isStateBased: true },
  CO: { name: "Connect for Health Colorado", url: "https://connectforhealthco.com", isStateBased: true },
  CT: { name: "Access Health CT", url: "https://www.accesshealthct.com", isStateBased: true },
  DC: { name: "DC Health Link", url: "https://dchealthlink.com", isStateBased: true },
  ID: { name: "Your Health Idaho", url: "https://www.yourhealthidaho.org", isStateBased: true },
  KY: { name: "Kynect", url: "https://kynect.ky.gov", isStateBased: true },
  MD: { name: "Maryland Health Connection", url: "https://www.marylandhealthconnection.gov", isStateBased: true },
  MA: { name: "Massachusetts Health Connector", url: "https://www.mahealthconnector.org", isStateBased: true },
  MN: { name: "MNsure", url: "https://www.mnsure.org", isStateBased: true },
  NV: { name: "Nevada Health Link", url: "https://www.nevadahealthlink.com", isStateBased: true },
  NJ: { name: "Get Covered NJ", url: "https://nj.gov/getcoverednj", isStateBased: true },
  NM: { name: "beWellnm", url: "https://www.bewellnm.com", isStateBased: true },
  NY: { name: "NY State of Health", url: "https://nystateofhealth.ny.gov", isStateBased: true },
  PA: { name: "Pennie", url: "https://pennie.com", isStateBased: true },
  RI: { name: "HealthSource RI", url: "https://healthsourceri.com", isStateBased: true },
  VT: { name: "Vermont Health Connect", url: "https://portal.healthconnect.vermont.gov", isStateBased: true },
  WA: { name: "Washington Healthplanfinder", url: "https://www.wahealthplanfinder.org", isStateBased: true },
  // All other states use Healthcare.gov
  DEFAULT: { name: "Healthcare.gov", url: "https://www.healthcare.gov", isStateBased: false },
};

// ===============================
// Types
// ===============================

interface ACAOptimizerProps {
  currentAge?: number;
  spouseAge?: number;
  retirementAge?: number;
  householdSize?: number;
  estimatedMAGI?: number;
  state?: string;
  rothBalance?: number;
  pretaxBalance?: number;
  taxableBalance?: number;
}

interface IncomeSource {
  name: string;
  amount: number;
  countsTowardMAGI: boolean;
  isEditable: boolean;
  description: string;
}

interface SubsidyResult {
  fplPercent: number;
  fpl: number;
  benchmarkPremium: number;
  maxContribution: number;
  subsidyAmount: number;
  netPremium: number;
  premiumCapPercent: number;
  tier: string;
}

interface OptimizationThreshold {
  targetFPL: number;
  targetIncome: number;
  currentSubsidy: number;
  potentialSubsidy: number;
  incomeReduction: number;
  savings: number;
  description: string;
}

// ===============================
// Helper Functions
// ===============================

function getFPL(householdSize: number, year: number = 2024): number {
  const yearsFromBase = Math.max(0, year - 2024);
  const inflationFactor = Math.pow(1.025, yearsFromBase);

  if (householdSize <= 8) {
    return (FPL_2024.sizes[householdSize] || FPL_2024.base) * inflationFactor;
  }

  return (FPL_2024.sizes[8] + (householdSize - 8) * FPL_2024.perAdditional) * inflationFactor;
}

function getBenchmarkPremium(age: number, householdSize: number = 1): number {
  // Find closest age bracket
  const ages = Object.keys(SILVER_BENCHMARK_MONTHLY_2024).map(Number).sort((a, b) => a - b);
  let premium = SILVER_BENCHMARK_MONTHLY_2024[64]; // Default to max

  for (let i = 0; i < ages.length; i++) {
    if (age <= ages[i]) {
      premium = SILVER_BENCHMARK_MONTHLY_2024[ages[i]];
      break;
    }
  }

  // Adjust for household (simplified - actual calculation is more complex)
  const multiplier = householdSize === 1 ? 1 : householdSize === 2 ? 1.8 : 1.8 + (householdSize - 2) * 0.3;

  return premium * 12 * multiplier;
}

function calculateSubsidy(
  magi: number,
  age: number,
  householdSize: number
): SubsidyResult {
  const fpl = getFPL(householdSize);
  const fplPercent = (magi / fpl) * 100;
  const benchmarkPremium = getBenchmarkPremium(age, householdSize);

  // Find applicable premium cap
  let premiumCapPercent = 8.5;
  let tier = "Above 400% FPL";

  for (const cap of ACA_PREMIUM_CAPS_2024) {
    if (fplPercent <= cap.fplPercent) {
      premiumCapPercent = cap.maxPremiumPct;
      tier = cap.description;
      break;
    }
  }

  // Maximum contribution (what you pay)
  const maxContribution = magi * (premiumCapPercent / 100);

  // Subsidy is the difference (but not negative)
  const subsidyAmount = Math.max(0, benchmarkPremium - maxContribution);

  // Net premium (what you actually pay)
  const netPremium = Math.max(0, benchmarkPremium - subsidyAmount);

  return {
    fplPercent,
    fpl,
    benchmarkPremium,
    maxContribution,
    subsidyAmount,
    netPremium,
    premiumCapPercent,
    tier,
  };
}

function findOptimizationThresholds(
  currentMAGI: number,
  age: number,
  householdSize: number
): OptimizationThreshold[] {
  const fpl = getFPL(householdSize);
  const currentSubsidy = calculateSubsidy(currentMAGI, age, householdSize);
  const thresholds: OptimizationThreshold[] = [];

  // Key FPL percentages to check
  const fplTargets = [150, 200, 250, 300, 400];

  for (const targetFPL of fplTargets) {
    const targetIncome = (fpl * targetFPL) / 100;

    // Only show if it would require reducing income
    if (targetIncome < currentMAGI) {
      const potentialResult = calculateSubsidy(targetIncome - 100, age, householdSize);
      const incomeReduction = currentMAGI - targetIncome;
      const additionalSubsidy = potentialResult.subsidyAmount - currentSubsidy.subsidyAmount;

      if (additionalSubsidy > 0) {
        thresholds.push({
          targetFPL,
          targetIncome,
          currentSubsidy: currentSubsidy.subsidyAmount,
          potentialSubsidy: potentialResult.subsidyAmount,
          incomeReduction,
          savings: additionalSubsidy,
          description: getThresholdDescription(targetFPL),
        });
      }
    }
  }

  return thresholds.sort((a, b) => b.savings - a.savings);
}

function getThresholdDescription(fplPercent: number): string {
  switch (fplPercent) {
    case 150:
      return "Maximum subsidy - $0 premium Silver plans";
    case 200:
      return "Premium capped at 2% of income";
    case 250:
      return "Premium capped at 4% of income";
    case 300:
      return "Premium capped at 6% of income";
    case 400:
      return "Historical cliff - now capped at 8.5%";
    default:
      return "";
  }
}

function getStateExchange(stateCode: string): { name: string; url: string; isStateBased: boolean } {
  return STATE_EXCHANGES[stateCode.toUpperCase()] || STATE_EXCHANGES.DEFAULT;
}

// ===============================
// Sub-Components
// ===============================

interface SubsidyMeterProps {
  result: SubsidyResult;
}

function SubsidyMeter({ result }: SubsidyMeterProps) {
  const subsidyPercent = (result.subsidyAmount / result.benchmarkPremium) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Benchmark Premium</span>
        <span className="font-medium">${result.benchmarkPremium.toLocaleString()}/year</span>
      </div>

      <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        {/* You Pay section */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-end pr-2 text-white text-xs font-medium"
          style={{ width: `${Math.min(100, 100 - subsidyPercent)}%` }}
        >
          {result.netPremium > 500 && `$${Math.round(result.netPremium).toLocaleString()}`}
        </div>

        {/* Subsidy section */}
        <div
          className="absolute right-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-start pl-2 text-white text-xs font-medium"
          style={{ width: `${Math.min(100, subsidyPercent)}%` }}
        >
          {result.subsidyAmount > 500 && `$${Math.round(result.subsidyAmount).toLocaleString()} subsidy`}
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <div className="text-red-600 dark:text-red-400">
          <span className="font-semibold">You Pay: </span>
          ${Math.round(result.netPremium).toLocaleString()}/year
          <span className="text-xs ml-1">
            (${Math.round(result.netPremium / 12).toLocaleString()}/mo)
          </span>
        </div>
        <div className="text-green-600 dark:text-green-400">
          <span className="font-semibold">Subsidy: </span>
          ${Math.round(result.subsidyAmount).toLocaleString()}/year
        </div>
      </div>
    </div>
  );
}

interface MAGIBreakdownProps {
  incomeSources: IncomeSource[];
  onUpdate: (name: string, amount: number) => void;
}

function MAGIBreakdown({ incomeSources, onUpdate }: MAGIBreakdownProps) {
  const totalMAGI = incomeSources
    .filter((s) => s.countsTowardMAGI)
    .reduce((sum, s) => sum + s.amount, 0);

  const nonMAGI = incomeSources.filter((s) => !s.countsTowardMAGI);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-blue-600" />
        MAGI Components (What Counts)
      </div>

      <div className="space-y-3">
        {incomeSources
          .filter((s) => s.countsTowardMAGI)
          .map((source) => (
            <div
              key={source.name}
              className="flex items-center justify-between gap-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{source.name}</div>
                <div className="text-xs text-muted-foreground">{source.description}</div>
              </div>
              {source.isEditable ? (
                <Input
                  type="number"
                  value={source.amount}
                  onChange={(e) => onUpdate(source.name, Number(e.target.value))}
                  className="w-28 text-right"
                />
              ) : (
                <span className="font-semibold">${source.amount.toLocaleString()}</span>
              )}
            </div>
          ))}
      </div>

      <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-800">
        <span className="font-semibold text-red-900 dark:text-red-100">Total MAGI</span>
        <span className="text-xl font-bold text-red-600 dark:text-red-400">
          ${totalMAGI.toLocaleString()}
        </span>
      </div>

      {nonMAGI.length > 0 && (
        <>
          <div className="text-sm font-medium flex items-center gap-2 mt-6">
            <PiggyBank className="h-4 w-4 text-green-600" />
            Tax-Free Income (Does NOT Count)
          </div>

          <div className="space-y-2">
            {nonMAGI.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between gap-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {source.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{source.description}</div>
                </div>
                {source.isEditable ? (
                  <Input
                    type="number"
                    value={source.amount}
                    onChange={(e) => onUpdate(source.name, Number(e.target.value))}
                    className="w-28 text-right"
                  />
                ) : (
                  <span className="font-semibold text-green-600">${source.amount.toLocaleString()}</span>
                )}
              </div>
            ))}
          </div>

          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100 text-sm">
                  Why Roth Withdrawals Are GOLD in Early Retirement
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  Roth IRA and Roth 401(k) withdrawals do NOT count toward MAGI. You can withdraw
                  $100k from Roth and still qualify for maximum ACA subsidies. This is the #1
                  reason to build Roth assets before retiring early.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface RothConversionImpactProps {
  currentSubsidy: SubsidyResult;
  age: number;
  householdSize: number;
  currentMAGI: number;
}

function RothConversionImpact({
  currentSubsidy,
  age,
  householdSize,
  currentMAGI,
}: RothConversionImpactProps) {
  const conversionAmounts = [10000, 25000, 50000, 100000];

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium flex items-center gap-2">
        <Target className="h-4 w-4 text-purple-600" />
        Roth Conversion Impact on Subsidies
      </div>

      <p className="text-sm text-muted-foreground">
        Roth conversions count as income and reduce ACA subsidies. Here&apos;s the trade-off:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3">Conversion</th>
              <th className="text-right py-2 px-3">New MAGI</th>
              <th className="text-right py-2 px-3">New Subsidy</th>
              <th className="text-right py-2 px-3">Subsidy Lost</th>
              <th className="text-right py-2 px-3">Net Cost</th>
            </tr>
          </thead>
          <tbody>
            {conversionAmounts.map((amount) => {
              const newMAGI = currentMAGI + amount;
              const newResult = calculateSubsidy(newMAGI, age, householdSize);
              const subsidyLost = currentSubsidy.subsidyAmount - newResult.subsidyAmount;
              // Assuming ~22% federal tax bracket for the conversion
              const conversionTax = amount * 0.22;
              const netCost = conversionTax + subsidyLost;

              return (
                <tr key={amount} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 font-medium">${amount.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">${newMAGI.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">${Math.round(newResult.subsidyAmount).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">
                    -${Math.round(subsidyLost).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-red-700 dark:text-red-300">
                    ${Math.round(netCost).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
              Roth Conversion Sweet Spot
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
              Convert just enough to stay under the next subsidy threshold, or if you expect higher
              IRMAA (Medicare) costs later, it may be worth converting more now despite losing ACA
              subsidies. Run both scenarios to find your optimal strategy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ACATimelineProps {
  currentAge: number;
  retirementAge: number;
  spouseAge?: number;
}

function ACATimeline({ currentAge, retirementAge, spouseAge }: ACATimelineProps) {
  const medicareAge = 65;
  const acaYearsP1 = Math.max(0, medicareAge - Math.max(currentAge, retirementAge));
  const acaYearsP2 = spouseAge ? Math.max(0, medicareAge - Math.max(spouseAge, retirementAge)) : 0;

  const totalACAYears = acaYearsP1 + acaYearsP2;

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        Your ACA Coverage Timeline
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
          <div className="text-xs text-blue-700 dark:text-blue-400">Person 1</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{acaYearsP1} years</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">
            Age {Math.max(currentAge, retirementAge)} to 65
          </div>
        </div>

        {spouseAge && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="text-xs text-blue-700 dark:text-blue-400">Person 2</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{acaYearsP2} years</div>
            <div className="text-xs text-blue-700 dark:text-blue-400">
              Age {Math.max(spouseAge, retirementAge)} to 65
            </div>
          </div>
        )}
      </div>

      {totalACAYears > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                {totalACAYears} Years of ACA Coverage Needed
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                At an average savings of $8,000-15,000/year through ACA subsidy optimization, this
                represents <strong>${(totalACAYears * 10000).toLocaleString()} to ${(totalACAYears * 15000).toLocaleString()}</strong> in
                potential savings over your early retirement period.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StateExchangeInfoProps {
  state: string;
}

function StateExchangeInfo({ state }: StateExchangeInfoProps) {
  const exchange = getStateExchange(state);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-blue-600" />
        Your Health Insurance Exchange
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg">{exchange.name}</div>
            <div className="text-sm text-muted-foreground">
              {exchange.isStateBased ? "State-based exchange" : "Federal exchange"}
            </div>
          </div>
          <a
            href={exchange.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Visit Site
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="font-semibold mb-2">Open Enrollment</div>
          <p className="text-muted-foreground">
            November 1 - January 15 (dates vary by state). Coverage begins January 1 if enrolled by
            December 15.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="font-semibold mb-2">Special Enrollment</div>
          <p className="text-muted-foreground">
            Qualifying life events (job loss, marriage, birth) allow enrollment outside open
            enrollment. 60-day window after the event.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===============================
// Main Component
// ===============================

export function ACAOptimizer({
  currentAge = 55,
  spouseAge,
  retirementAge = 60,
  householdSize = 1,
  estimatedMAGI = 50000,
  state = "DEFAULT",
  rothBalance = 0,
  pretaxBalance = 0,
  taxableBalance = 0,
}: ACAOptimizerProps) {
  // State for inputs
  const [age, setAge] = useState(Math.max(currentAge, retirementAge));
  const [household, setHousehold] = useState(householdSize);
  const [selectedState, setSelectedState] = useState(state);

  // Income sources state
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    {
      name: "Capital Gains",
      amount: 15000,
      countsTowardMAGI: true,
      isEditable: true,
      description: "Long-term capital gains from selling investments",
    },
    {
      name: "Dividends",
      amount: 8000,
      countsTowardMAGI: true,
      isEditable: true,
      description: "Qualified and ordinary dividends",
    },
    {
      name: "Traditional IRA/401k Withdrawals",
      amount: 20000,
      countsTowardMAGI: true,
      isEditable: true,
      description: "Pre-tax retirement account distributions",
    },
    {
      name: "Social Security (85%)",
      amount: 0,
      countsTowardMAGI: true,
      isEditable: true,
      description: "Up to 85% of SS benefits count toward MAGI",
    },
    {
      name: "Part-time/Consulting Income",
      amount: 0,
      countsTowardMAGI: true,
      isEditable: true,
      description: "Any W-2 or self-employment income",
    },
    {
      name: "Roth IRA Withdrawals",
      amount: rothBalance > 0 ? 30000 : 0,
      countsTowardMAGI: false,
      isEditable: true,
      description: "Qualified Roth withdrawals are TAX-FREE",
    },
    {
      name: "HSA Withdrawals (Medical)",
      amount: 5000,
      countsTowardMAGI: false,
      isEditable: true,
      description: "HSA used for qualified medical expenses",
    },
  ]);

  // Calculate total MAGI from income sources
  const totalMAGI = useMemo(() => {
    return incomeSources
      .filter((s) => s.countsTowardMAGI)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [incomeSources]);

  // Calculate subsidy result
  const subsidyResult = useMemo(() => {
    return calculateSubsidy(totalMAGI, age, household);
  }, [totalMAGI, age, household]);

  // Find optimization thresholds
  const optimizationThresholds = useMemo(() => {
    return findOptimizationThresholds(totalMAGI, age, household);
  }, [totalMAGI, age, household]);

  // Update income source handler
  const handleIncomeUpdate = useCallback((name: string, amount: number) => {
    setIncomeSources((prev) =>
      prev.map((source) => (source.name === name ? { ...source, amount: Math.max(0, amount) } : source))
    );
  }, []);

  // Check if eligible for ACA (pre-65)
  const isEligibleForACA = age < 65;

  // Format FPL display
  const fplDisplay = subsidyResult.fplPercent.toFixed(0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          ACA Subsidy Optimizer
        </CardTitle>
        <CardDescription>
          Critical for early retirees (pre-65): Optimize your income to maximize ACA subsidies. This
          single optimization can be worth $10,000-20,000/year.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Medicare warning if 65+ */}
        {!isEligibleForACA && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  Medicare Eligible
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  At age {age}, you qualify for Medicare. ACA marketplace plans are primarily for
                  those under 65. Focus on IRMAA optimization instead.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Age (in retirement)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[age]}
                min={50}
                max={70}
                step={1}
                onValueChange={([val]) => setAge(val)}
                className="flex-1"
              />
              <Badge variant="outline" className="w-12 justify-center">
                {age}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Household Size</Label>
            <Select value={household.toString()} onValueChange={(val) => setHousehold(Number(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (Individual)</SelectItem>
                <SelectItem value="2">2 (Couple)</SelectItem>
                <SelectItem value="3">3 (Family)</SelectItem>
                <SelectItem value="4">4 (Family)</SelectItem>
                <SelectItem value="5">5+ (Large Family)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Other (Healthcare.gov)</SelectItem>
                {Object.entries(STATE_EXCHANGES)
                  .filter(([code]) => code !== "DEFAULT")
                  .map(([code, exchange]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {exchange.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="text-xs text-blue-700 dark:text-blue-400">Your MAGI</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              ${totalMAGI.toLocaleString()}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
            <div className="text-xs text-purple-700 dark:text-purple-400">% of FPL</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{fplDisplay}%</div>
            <div className="text-xs text-purple-700 dark:text-purple-400">
              FPL: ${subsidyResult.fpl.toLocaleString()}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
            <div className="text-xs text-green-700 dark:text-green-400">Annual Subsidy</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${Math.round(subsidyResult.subsidyAmount).toLocaleString()}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
            <div className="text-xs text-red-700 dark:text-red-400">You Pay</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              ${Math.round(subsidyResult.netPremium).toLocaleString()}
            </div>
            <div className="text-xs text-red-700 dark:text-red-400">
              ${Math.round(subsidyResult.netPremium / 12).toLocaleString()}/month
            </div>
          </div>
        </div>

        {/* Subsidy Tier Badge */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <Badge
            variant="outline"
            className={`px-3 py-1 ${
              subsidyResult.fplPercent <= 150
                ? "bg-green-100 text-green-700 border-green-300"
                : subsidyResult.fplPercent <= 250
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : subsidyResult.fplPercent <= 400
                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                : "bg-gray-100 text-gray-700 border-gray-300"
            }`}
          >
            {subsidyResult.tier}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Premium capped at {subsidyResult.premiumCapPercent}% of income
          </span>
        </div>

        {/* Subsidy Meter Visualization */}
        <SubsidyMeter result={subsidyResult} />

        {/* MAGI Breakdown */}
        <div className="border-t pt-6">
          <MAGIBreakdown incomeSources={incomeSources} onUpdate={handleIncomeUpdate} />
        </div>

        {/* Optimization Opportunities */}
        {optimizationThresholds.length > 0 && (
          <div className="border-t pt-6 space-y-4">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              Optimization Opportunities
            </div>

            <p className="text-sm text-muted-foreground">
              Reduce your MAGI to reach these thresholds and increase your subsidy:
            </p>

            <div className="space-y-3">
              {optimizationThresholds.slice(0, 3).map((threshold, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          Reduce MAGI to ${threshold.targetIncome.toLocaleString()} ({threshold.targetFPL}% FPL)
                        </div>
                        <Badge className="bg-green-600 text-white">
                          +${Math.round(threshold.savings).toLocaleString()}/year
                        </Badge>
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        {threshold.description}. Reduce income by ${threshold.incomeReduction.toLocaleString()} to
                        unlock additional annual subsidy.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roth Conversion Analysis */}
        <div className="border-t pt-6">
          <RothConversionImpact
            currentSubsidy={subsidyResult}
            age={age}
            householdSize={household}
            currentMAGI={totalMAGI}
          />
        </div>

        {/* ACA Timeline */}
        <div className="border-t pt-6">
          <ACATimeline currentAge={currentAge} retirementAge={retirementAge} spouseAge={spouseAge} />
        </div>

        {/* State Exchange Info */}
        <div className="border-t pt-6">
          <StateExchangeInfo state={selectedState} />
        </div>

        {/* ARP Cliff Explanation */}
        <div className="border-t pt-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  The Cliff (or Not): ARP Changes
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    <strong>Pre-2021:</strong> Hard cliff at 400% FPL. Go $1 over and lose ALL
                    subsidies instantly. This created a &quot;tax bomb&quot; for early retirees.
                  </p>
                  <p>
                    <strong>Post-ARP (2021+):</strong> No cliff! Subsidies continue above 400% FPL,
                    just capped at 8.5% of income. The American Rescue Plan removed the cliff and
                    enhanced subsidies through 2025 (likely to be extended).
                  </p>
                  <p>
                    <strong>Important:</strong> The enhanced subsidies are set to expire. Monitor
                    legislation annually and adjust your income strategy accordingly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Strategies */}
        <div className="border-t pt-6 space-y-4">
          <div className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Key ACA Optimization Strategies
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                Maximize Roth Usage
              </div>
              <p className="text-sm text-muted-foreground">
                Withdraw from Roth accounts first in early retirement. These don&apos;t count toward
                MAGI and preserve your subsidy eligibility.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                Harvest Capital Gains Strategically
              </div>
              <p className="text-sm text-muted-foreground">
                Take capital gains only when needed, and consider tax-loss harvesting to offset gains.
                Gains add directly to MAGI.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                Delay Social Security
              </div>
              <p className="text-sm text-muted-foreground">
                SS benefits (up to 85%) count toward MAGI. Delaying to 70 not only increases
                benefits but keeps MAGI low during the ACA years.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500" />
                Use HSA for Medical Expenses
              </div>
              <p className="text-sm text-muted-foreground">
                HSA withdrawals for qualified medical expenses are tax-free and don&apos;t count toward
                MAGI. Pay premiums with HSA if possible.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t">
          ACA subsidy calculations are estimates based on 2024 federal guidelines. Actual subsidies
          depend on your local benchmark plan costs, household composition, and current legislation.
          Consult with a health insurance navigator or broker for personalized guidance.
        </div>
      </CardContent>
    </Card>
  );
}

export default ACAOptimizer;

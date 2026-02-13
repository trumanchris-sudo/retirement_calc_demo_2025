"use client"

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Gift, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { fmt } from "@/lib/utils";
import type { CalculatorInputs, FilingStatus } from "@/types/calculator";
import { runSingleSimulation, calcOrdinaryTax } from "@/lib/calculations/retirementEngine";
import { LIFE_EXP } from "@/lib/constants";

// ==================== Types ====================

interface RothComparisonProps {
  inputs: CalculatorInputs;
  isDarkMode: boolean;
}

interface ScenarioResult {
  label: string;
  portfolioAtRetirement: number;
  portfolioAt85: number;
  totalTaxesPaidLifetime: number;
  inheritanceGross: number;
  inheritanceTaxOnKids: number;  // Tax kids pay when inheriting
  inheritanceNet: number;        // What kids actually receive
  grandkidsInheritance: number;  // After another generation
  taxDrag: number;               // Cumulative tax drag over lifetime
  yearlyData: YearDataPoint[];
  taxAdjustedBalances: number[]; // After-tax equivalent value per year
  rothBalance: number;
  pretaxBalance: number;
  taxableBalance: number;
}

interface YearDataPoint {
  age: number;
  year: number;
  currentPath: number;
  rothFirst: number;
  difference: number;
}

// ==================== Constants ====================

// Maximum Roth contribution limits for 2026
const ROTH_401K_LIMIT = 23500;  // 401(k) employee contribution limit 2026
const ROTH_IRA_LIMIT = 7000;    // IRA contribution limit 2026
const CATCH_UP_401K = 7500;     // Catch-up for 50+
const CATCH_UP_IRA = 1000;      // Catch-up for 50+

// Tax rate kids pay on inherited Traditional IRA (assume high earner)
const INHERITED_IRA_TAX_RATE = 0.32;  // 32% bracket for high-earning beneficiary

// ==================== Helper Functions ====================

/**
 * Calculate the Roth-First scenario by redirecting pre-tax contributions to Roth
 * and calculating the after-tax cost difference
 */
function calculateRothFirstInputs(inputs: CalculatorInputs): CalculatorInputs {
  const age1 = inputs.age1;
  const age2 = inputs.age2;
  const isMar = inputs.marital === "married";

  // Calculate max Roth contributions based on age
  const person1Max = age1 >= 50
    ? ROTH_401K_LIMIT + CATCH_UP_401K + ROTH_IRA_LIMIT + CATCH_UP_IRA
    : ROTH_401K_LIMIT + ROTH_IRA_LIMIT;

  const person2Max = isMar && age2
    ? (age2 >= 50
        ? ROTH_401K_LIMIT + CATCH_UP_401K + ROTH_IRA_LIMIT + CATCH_UP_IRA
        : ROTH_401K_LIMIT + ROTH_IRA_LIMIT)
    : 0;

  // Convert pre-tax contributions to Roth (after-tax equivalent)
  // When you contribute $X pre-tax, you'd need to contribute $X*(1-tax_rate) from after-tax dollars
  // to end up with the same take-home pay. But for Roth, we want to maximize, so we contribute the full amount
  // and pay taxes now instead of later.

  // Person 1: Move all pre-tax to Roth
  const newPost1 = Math.min(inputs.cPre1 + inputs.cPost1, person1Max);
  const newPre1 = 0;

  // Person 2: Move all pre-tax to Roth
  const newPost2 = isMar ? Math.min(inputs.cPre2 + inputs.cPost2, person2Max) : 0;
  const newPre2 = 0;

  // Employer match still goes to pre-tax (can't be Roth)
  return {
    ...inputs,
    cPre1: newPre1,
    cPost1: newPost1,
    cPre2: newPre2,
    cPost2: newPost2,
    // Keep employer matches - they go to traditional by law
    cMatch1: inputs.cMatch1,
    cMatch2: inputs.cMatch2,
  };
}

/**
 * Run simulation and extract key metrics
 */
function runScenario(
  inputs: CalculatorInputs,
  label: string,
  seed: number = 42
): ScenarioResult {
  const simInputs = {
    marital: inputs.marital as FilingStatus,
    age1: inputs.age1,
    age2: inputs.age2,
    retirementAge: inputs.retirementAge,
    taxableBalance: inputs.taxableBalance,
    pretaxBalance: inputs.pretaxBalance,
    rothBalance: inputs.rothBalance,
    cTax1: inputs.cTax1,
    cPre1: inputs.cPre1,
    cPost1: inputs.cPost1,
    cMatch1: inputs.cMatch1,
    cTax2: inputs.cTax2,
    cPre2: inputs.cPre2,
    cPost2: inputs.cPost2,
    cMatch2: inputs.cMatch2,
    retRate: inputs.retRate,
    inflationRate: inputs.inflationRate,
    stateRate: inputs.stateRate,
    incContrib: inputs.incContrib,
    incRate: inputs.incRate,
    wdRate: inputs.wdRate,
    returnMode: inputs.returnMode,
    randomWalkSeries: inputs.randomWalkSeries,
    includeSS: inputs.includeSS,
    ssIncome: inputs.ssIncome,
    ssClaimAge: inputs.ssClaimAge,
    ssIncome2: inputs.ssIncome2,
    ssClaimAge2: inputs.ssClaimAge2,
    dividendYield: inputs.dividendYield || 2.0,
    enableRothConversions: false, // Disable for fair comparison
    bondGlidePath: null,
  };

  const result = runSingleSimulation(simInputs, seed);

  const yrsToRet = inputs.retirementAge - inputs.age1;
  const retirementIndex = yrsToRet;
  const age85Index = Math.min(85 - inputs.age1, result.balancesNominal.length - 1);
  const eolIndex = result.balancesNominal.length - 1;

  const portfolioAtRetirement = result.balancesNominal[retirementIndex] || 0;
  const portfolioAt85 = result.balancesNominal[age85Index] || 0;
  const inheritanceGross = result.balancesNominal[eolIndex] || 0;

  // Estimate account breakdown at EOL based on contribution patterns
  // This is a simplification - actual breakdown would require tracking through simulation
  const totalContrib = (inputs.cPre1 + inputs.cPost1 + inputs.cTax1 + inputs.cMatch1 +
                       (inputs.marital === "married" ? inputs.cPre2 + inputs.cPost2 + inputs.cTax2 + inputs.cMatch2 : 0));

  const rothRatio = totalContrib > 0 ? (inputs.cPost1 + inputs.cPost2) / totalContrib : 0.33;
  const pretaxRatio = totalContrib > 0 ? (inputs.cPre1 + inputs.cPre2 + inputs.cMatch1 + inputs.cMatch2) / totalContrib : 0.34;
  const taxableRatio = 1 - rothRatio - pretaxRatio;

  const rothBalance = inheritanceGross * rothRatio + inputs.rothBalance;
  const pretaxBalance = inheritanceGross * pretaxRatio + inputs.pretaxBalance;
  const taxableBalance = Math.max(0, inheritanceGross - rothBalance - pretaxBalance);

  // Calculate inheritance tax kids pay on Traditional IRA (SECURE Act 10-year rule)
  // Kids must withdraw entire inherited IRA within 10 years, all taxed as ordinary income
  const inheritanceTaxOnKids = pretaxBalance * INHERITED_IRA_TAX_RATE;
  const inheritanceNet = inheritanceGross - inheritanceTaxOnKids;

  // Grandkids inheritance (assumes kids invest and grow for 30 years at 6% real)
  const grandkidsGrowthFactor = Math.pow(1.06, 30);
  const grandkidsInheritance = inheritanceNet * grandkidsGrowthFactor * 0.8; // 80% passes on

  // Estimate lifetime tax drag
  // For traditional: RMDs force withdrawals taxed at ordinary rates
  // For Roth: No RMDs, no tax on withdrawals
  const yearsInRetirement = LIFE_EXP - inputs.retirementAge;
  const avgWithdrawal = portfolioAtRetirement * (inputs.wdRate / 100);
  const estimatedLifetimeTax = pretaxBalance > rothBalance
    ? avgWithdrawal * INHERITED_IRA_TAX_RATE * yearsInRetirement * 0.5 // Rough estimate
    : 0;

  // Build yearly data for chart and compute tax-adjusted balances.
  // The tax-adjusted balance subtracts the embedded tax liability on
  // pre-tax dollars so the two scenarios visually diverge.
  const yearlyData: YearDataPoint[] = [];
  const taxAdjustedBalances: number[] = [];

  // Track estimated account breakdown over time based on contribution ratios.
  // Starting balances seed the initial split; annual contributions shift the mix.
  const isMar = inputs.marital === "married";
  const annualPre = inputs.cPre1 + inputs.cMatch1 + (isMar ? inputs.cPre2 + inputs.cMatch2 : 0);
  const annualPost = inputs.cPost1 + (isMar ? inputs.cPost2 : 0);
  const annualTax = inputs.cTax1 + (isMar ? inputs.cTax2 : 0);

  for (let i = 0; i <= eolIndex; i++) {
    const age = inputs.age1 + i;
    const nominalBalance = result.balancesNominal[i] || 0;

    // Estimate the pre-tax share of the portfolio at year i.
    // We track cumulative contributions by account type and use ratios.
    const cumPre = inputs.pretaxBalance + annualPre * i;
    const cumPost = inputs.rothBalance + annualPost * i;
    const cumTax = inputs.taxableBalance + annualTax * i;
    const cumTotal = cumPre + cumPost + cumTax;
    const pretaxShare = cumTotal > 0 ? cumPre / cumTotal : 0;

    // Tax-adjusted value: subtract embedded tax liability on the pre-tax portion
    const embeddedTax = nominalBalance * pretaxShare * INHERITED_IRA_TAX_RATE;
    const taxAdjusted = nominalBalance - embeddedTax;

    taxAdjustedBalances.push(taxAdjusted);
    yearlyData.push({
      age,
      year: new Date().getFullYear() + i,
      currentPath: taxAdjusted,
      rothFirst: taxAdjusted, // Will be overwritten during merge
      difference: 0,
    });
  }

  return {
    label,
    portfolioAtRetirement,
    portfolioAt85,
    totalTaxesPaidLifetime: estimatedLifetimeTax,
    inheritanceGross,
    inheritanceTaxOnKids,
    inheritanceNet,
    grandkidsInheritance,
    taxDrag: inheritanceTaxOnKids + estimatedLifetimeTax,
    yearlyData,
    taxAdjustedBalances,
    rothBalance,
    pretaxBalance,
    taxableBalance,
  };
}

// ==================== Sub-Components ====================

interface ComparisonCardProps {
  title: string;
  subtitle: string;
  currentValue: number;
  rothValue: number;
  isGain: boolean;
  icon: React.ReactNode;
  showTaxSavings?: boolean;
}

function ComparisonCard({
  title,
  subtitle,
  currentValue,
  rothValue,
  isGain,
  icon,
  showTaxSavings = false
}: ComparisonCardProps) {
  const difference = rothValue - currentValue;
  const percentChange = currentValue > 0 ? (difference / currentValue) * 100 : 0;
  const isPositive = difference > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current Path */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Current</p>
          <p className="text-lg font-semibold">{fmt(currentValue)}</p>
        </div>

        {/* Roth-First */}
        <div className="space-y-1">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Roth-First</p>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{fmt(rothValue)}</p>
        </div>
      </div>

      {/* Difference */}
      {difference !== 0 && (
        <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between`}>
          <span className="text-xs text-muted-foreground">Difference</span>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="font-medium text-sm">
              {isPositive ? '+' : ''}{fmt(difference)}
            </span>
            <span className="text-xs">
              ({isPositive ? '+' : ''}{percentChange.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {showTaxSavings && difference > 0 && (
        <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs text-emerald-700 dark:text-emerald-300">
          Tax savings passed to heirs
        </div>
      )}
    </div>
  );
}

interface TaxDragVisualizerProps {
  currentTaxDrag: number;
  rothTaxDrag: number;
}

function TaxDragVisualizer({ currentTaxDrag, rothTaxDrag }: TaxDragVisualizerProps) {
  const maxDrag = Math.max(currentTaxDrag, rothTaxDrag, 1);
  const currentWidth = (currentTaxDrag / maxDrag) * 100;
  const rothWidth = (rothTaxDrag / maxDrag) * 100;
  const savings = currentTaxDrag - rothTaxDrag;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Tax Drag Comparison</span>
        <Badge variant="outline" className="text-emerald-600 border-emerald-600">
          {fmt(savings)} saved
        </Badge>
      </div>

      {/* Current Path Tax Drag */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Current Path</span>
          <span className="text-red-500 font-medium">{fmt(currentTaxDrag)} lost to taxes</span>
        </div>
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-700"
            style={{ width: `${currentWidth}%` }}
          >
            {currentWidth > 20 && <span>{fmt(currentTaxDrag)}</span>}
          </div>
        </div>
      </div>

      {/* Roth-First Tax Drag */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Roth-First Strategy</span>
          <span className="text-emerald-600 font-medium">{fmt(rothTaxDrag)} lost to taxes</span>
        </div>
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-700"
            style={{ width: `${Math.max(rothWidth, 5)}%` }}
          >
            {rothWidth > 20 && <span>{fmt(rothTaxDrag)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export const RothComparison = React.memo(function RothComparison({
  inputs,
  isDarkMode
}: RothComparisonProps) {

  const { currentScenario, rothScenario, timelineData } = useMemo(() => {
    // Run current path scenario
    const current = runScenario(inputs, "Current Path");

    // Run Roth-first scenario
    const rothInputs = calculateRothFirstInputs(inputs);
    const roth = runScenario(rothInputs, "Roth-First");

    // Merge timeline data
    const timeline: YearDataPoint[] = [];
    const maxLen = Math.max(current.yearlyData.length, roth.yearlyData.length);

    for (let i = 0; i < maxLen; i++) {
      const currentVal = current.yearlyData[i]?.currentPath || 0;
      const rothVal = roth.yearlyData[i]?.currentPath || 0;

      timeline.push({
        age: inputs.age1 + i,
        year: new Date().getFullYear() + i,
        currentPath: currentVal,
        rothFirst: rothVal,
        difference: rothVal - currentVal,
      });
    }

    return {
      currentScenario: current,
      rothScenario: roth,
      timelineData: timeline,
    };
  }, [inputs]);

  const retirementAge = inputs.retirementAge;
  const inheritanceAdvantage = rothScenario.inheritanceNet - currentScenario.inheritanceNet;
  const grandkidsAdvantage = rothScenario.grandkidsInheritance - currentScenario.grandkidsInheritance;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Roth-First Strategy: Your Two Futures
              </CardTitle>
              <CardDescription>
                See the dramatic difference tax-free growth makes for you and your family
              </CardDescription>
            </div>
          </div>
          {inheritanceAdvantage > 0 && (
            <Badge className="bg-emerald-600 text-white">
              +{fmt(inheritanceAdvantage)} to heirs
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Side-by-Side Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Current Path */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <h3 className="font-semibold text-lg">Your Current Path</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Portfolio at Retirement (Age {retirementAge})</p>
                <p className="text-2xl font-bold">{fmt(currentScenario.portfolioAtRetirement)}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Portfolio at Age 85</p>
                <p className="text-2xl font-bold">{fmt(currentScenario.portfolioAt85)}</p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Kids Pay Inheritance Tax
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -{fmt(currentScenario.inheritanceTaxOnKids)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Traditional IRA taxed at {(INHERITED_IRA_TAX_RATE * 100).toFixed(0)}% over 10 years
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Net to Kids (After Tax)
                </p>
                <p className="text-2xl font-bold">{fmt(currentScenario.inheritanceNet)}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Grandkids (30 yrs later)
                </p>
                <p className="text-xl font-bold">{fmt(currentScenario.grandkidsInheritance)}</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Roth-First Strategy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 dark:border-emerald-700">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h3 className="font-semibold text-lg text-emerald-700 dark:text-emerald-400">Roth-First Strategy</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Portfolio at Retirement (Age {retirementAge})</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(rothScenario.portfolioAtRetirement)}</p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Portfolio at Age 85</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(rothScenario.portfolioAt85)}</p>
              </div>

              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-300 dark:border-emerald-700">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Kids Pay NO Tax on Roth
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  $0 tax
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">
                  Inherited Roth IRA: 10-year rule, but 100% tax-free!
                </p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Net to Kids (Tax-Free!)
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(rothScenario.inheritanceNet)}</p>
                {inheritanceAdvantage > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    +{fmt(inheritanceAdvantage)} more than current path
                  </p>
                )}
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Grandkids (30 yrs later)
                </p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(rothScenario.grandkidsInheritance)}</p>
                {grandkidsAdvantage > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    +{fmt(grandkidsAdvantage)} generational wealth
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tax Drag Visualizer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <TaxDragVisualizer
            currentTaxDrag={currentScenario.taxDrag}
            rothTaxDrag={rothScenario.taxDrag}
          />
        </div>

        {/* Timeline Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Wealth Growth Timeline: Two Paths Diverge</h4>
              <p className="text-xs text-muted-foreground mt-0.5">After-tax equivalent value (pre-tax balances reduced by embedded tax liability)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-muted-foreground">Current Path</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-emerald-600 dark:text-emerald-400">Roth-First</span>
              </div>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="age"
                  label={{ value: 'Age', position: 'bottom', offset: -5 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v as number)}
                  tick={{ fontSize: 12 }}
                />
                <RTooltip
                  formatter={(v: number, name: string) => [fmt(v), name === 'currentPath' ? 'Current Path' : 'Roth-First']}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderRadius: "8px",
                    border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  formatter={(value) => value === 'currentPath' ? 'Current Path' : 'Roth-First Strategy'}
                />
                <ReferenceLine
                  x={retirementAge}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: 'Retirement', position: 'top', fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="currentPath"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  fill="url(#colorCurrent)"
                  name="currentPath"
                />
                <Area
                  type="monotone"
                  dataKey="rothFirst"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorRoth)"
                  name="rothFirst"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Insight Box */}
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex-shrink-0">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">
                The Roth Advantage is COMPOUNDING
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">For You:</p>
                  <p className="text-emerald-600 dark:text-emerald-400">
                    No RMDs ever. Withdraw tax-free. More control in retirement.
                  </p>
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">For Your Kids:</p>
                  <p className="text-emerald-600 dark:text-emerald-400">
                    Inherit tax-free. 10-year rule with $0 tax bill. Keep every dollar.
                  </p>
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">For Grandkids:</p>
                  <p className="text-emerald-600 dark:text-emerald-400">
                    Tax-free growth continues. Multi-generational wealth building.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h5 className="font-medium mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-emerald-500" />
              Next Steps
            </h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Max out Roth 401(k) contributions if available</li>
              <li>2. Consider backdoor Roth IRA if income is too high</li>
              <li>3. Evaluate Roth conversions in low-income years</li>
              <li>4. Review with your financial advisor</li>
            </ul>
          </div>

          <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <h5 className="font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Important Considerations
            </h5>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>- Current tax bracket affects optimal strategy</li>
              <li>- Roth conversions trigger taxable income</li>
              <li>- 5-year rule applies to Roth conversions</li>
              <li>- Projections assume current tax law</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

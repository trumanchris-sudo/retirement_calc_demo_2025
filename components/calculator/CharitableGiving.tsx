"use client"

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Heart,
  Gift,
  TrendingUp,
  Calculator,
  DollarSign,
  Info,
  AlertCircle,
  CheckCircle2,
  Building2,
  Landmark,
  PiggyBank,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Input, Tip } from "./InputHelpers";
import { calcOrdinaryTax, calcLTCGTax } from "@/lib/calculations/shared/taxCalculations";
import { TAX_BRACKETS, RMD_DIVISORS, RMD_START_AGE } from "@/lib/calculations/shared/constants";
import type { FilingStatus } from "@/types/planner";

// ==================== Types ====================

interface CharitableGivingProps {
  age: number;
  filingStatus: FilingStatus;
  iraBalance: number;
  annualGivingGoal?: number;
  stockValue?: number;
  stockCostBasis?: number;
  ordinaryIncome?: number;
  stateRate?: number;
  onStrategyChange?: (strategy: CharitableStrategy) => void;
}

interface CharitableStrategy {
  qcdAmount: number;
  dafContribution: number;
  stockDonation: number;
  cashDonation: number;
  totalTaxSavings: number;
  yearsOfBunching: number;
}

interface QCDAnalysis {
  eligible: boolean;
  maxQCD: number;
  rmdAmount: number;
  taxSavings: number;
  effectiveSavingsRate: number;
}

interface DAFAnalysis {
  bunchingYears: number;
  standardDeductionSavings: number;
  itemizedDeductionValue: number;
  netBenefit: number;
  breakEvenAmount: number;
}

interface StockDonationAnalysis {
  capitalGainsAvoided: number;
  taxOnGains: number;
  deductionValue: number;
  totalBenefit: number;
  benefitVsCash: number;
}

// ==================== Constants ====================

const QCD_LIMIT_2024 = 105000;
const QCD_ELIGIBLE_AGE = 70.5;
const STANDARD_DEDUCTION_SINGLE_2024 = 14600;
const STANDARD_DEDUCTION_MARRIED_2024 = 29200;
const CHARITABLE_DEDUCTION_LIMIT_AGI = 0.60; // 60% of AGI for cash donations

// ==================== Helper Functions ====================

function calculateRMD(iraBalance: number, age: number): number {
  if (age < RMD_START_AGE) return 0;
  const divisor = RMD_DIVISORS[age] ?? RMD_DIVISORS[120];
  return iraBalance / divisor;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ==================== Sub-Components ====================

const StrategyCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  savings: number;
  isRecommended?: boolean;
  children: React.ReactNode;
}> = ({ title, description, icon, savings, isRecommended, children }) => (
  <div className={`
    rounded-lg border p-4 space-y-4 transition-all
    ${isRecommended
      ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800 ring-2 ring-green-500/20"
      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
    }
  `}>
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isRecommended
            ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }
        `}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
            {isRecommended && (
              <Badge className="bg-green-600 text-white text-xs">Best for You</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      {savings > 0 && (
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Tax Savings</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(savings)}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

const ImpactComparison: React.FC<{
  label: string;
  cashAmount: number;
  optimizedAmount: number;
  savings: number;
}> = ({ label, cashAmount, optimizedAmount, savings }) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">Cash Donation</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(cashAmount)}
        </div>
        <div className="text-xs text-gray-500">Net cost to you</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-green-600 dark:text-green-400">Optimized Strategy</div>
        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(optimizedAmount)}
        </div>
        <div className="text-xs text-green-600 dark:text-green-400">
          Save {formatCurrency(savings)}
        </div>
      </div>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-green-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, (savings / cashAmount) * 100)}%` }}
      />
    </div>
  </div>
);

// ==================== Main Component ====================

export const CharitableGiving = React.memo(function CharitableGiving({
  age,
  filingStatus,
  iraBalance,
  annualGivingGoal = 10000,
  stockValue = 50000,
  stockCostBasis = 20000,
  ordinaryIncome = 80000,
  stateRate = 0.05,
  onStrategyChange,
}: CharitableGivingProps) {
  // Local state for interactive inputs
  const [givingAmount, setGivingAmount] = useState(annualGivingGoal);
  const [localStockValue, setLocalStockValue] = useState(stockValue);
  const [localCostBasis, setLocalCostBasis] = useState(stockCostBasis);
  const [bunchingYears, setBunchingYears] = useState(3);
  const [useQCD, setUseQCD] = useState(true);
  const [useDAF, setUseDAF] = useState(false);
  const [useSockDonation, setUseStockDonation] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const standardDeduction = filingStatus === "married"
    ? STANDARD_DEDUCTION_MARRIED_2024
    : STANDARD_DEDUCTION_SINGLE_2024;

  // QCD Analysis
  const qcdAnalysis = useMemo((): QCDAnalysis => {
    const eligible = age >= QCD_ELIGIBLE_AGE;
    const rmdAmount = calculateRMD(iraBalance, Math.ceil(age));
    const maxQCD = Math.min(QCD_LIMIT_2024, rmdAmount > 0 ? Math.max(rmdAmount, givingAmount) : givingAmount);

    // Tax savings = marginal rate on amount that would otherwise be taxed
    const marginalRate = age >= RMD_START_AGE ? 0.24 : 0.22; // Estimate
    const taxSavings = eligible ? Math.min(givingAmount, maxQCD) * (marginalRate + stateRate) : 0;

    return {
      eligible,
      maxQCD,
      rmdAmount,
      taxSavings,
      effectiveSavingsRate: eligible ? marginalRate + stateRate : 0,
    };
  }, [age, iraBalance, givingAmount, stateRate]);

  // DAF Bunching Analysis
  const dafAnalysis = useMemo((): DAFAnalysis => {
    const totalBunchedAmount = givingAmount * bunchingYears;

    // In bunch year: itemize with large charitable deduction
    // Other years: take standard deduction
    const itemizedValue = totalBunchedAmount * 0.24; // Marginal rate benefit
    const standardValue = standardDeduction * 0.22 * bunchingYears; // What you'd get anyway

    // Break-even: bunch when itemized > standard in bunch year
    const breakEvenAmount = standardDeduction;

    return {
      bunchingYears,
      standardDeductionSavings: standardValue,
      itemizedDeductionValue: itemizedValue,
      netBenefit: Math.max(0, itemizedValue - standardValue),
      breakEvenAmount,
    };
  }, [givingAmount, bunchingYears, standardDeduction]);

  // Stock Donation Analysis
  const stockDonationAnalysis = useMemo((): StockDonationAnalysis => {
    const capitalGain = Math.max(0, localStockValue - localCostBasis);
    const ltcgRate = 0.15; // Assuming 15% bracket
    const niitRate = ordinaryIncome > 200000 ? 0.038 : 0;
    const taxOnGains = capitalGain * (ltcgRate + niitRate + stateRate);

    // Deduction value at marginal rate
    const deductionValue = localStockValue * 0.24;

    const totalBenefit = taxOnGains + deductionValue;
    const cashEquivalent = localStockValue * 0.24; // Just the deduction

    return {
      capitalGainsAvoided: capitalGain,
      taxOnGains,
      deductionValue,
      totalBenefit,
      benefitVsCash: taxOnGains, // Extra benefit vs cash
    };
  }, [localStockValue, localCostBasis, ordinaryIncome, stateRate]);

  // Combined strategy optimization
  const optimizedStrategy = useMemo((): CharitableStrategy => {
    let qcdAmount = 0;
    let dafContribution = 0;
    let stockDonation = 0;
    let cashDonation = 0;
    let totalTaxSavings = 0;

    let remainingGiving = givingAmount;

    // Priority 1: QCD (if eligible and have RMDs)
    if (useQCD && qcdAnalysis.eligible && qcdAnalysis.rmdAmount > 0) {
      qcdAmount = Math.min(remainingGiving, qcdAnalysis.maxQCD, qcdAnalysis.rmdAmount);
      remainingGiving -= qcdAmount;
      totalTaxSavings += qcdAmount * qcdAnalysis.effectiveSavingsRate;
    }

    // Priority 2: Appreciated stock
    if (useSockDonation && remainingGiving > 0) {
      stockDonation = Math.min(remainingGiving, localStockValue);
      remainingGiving -= stockDonation;
      const gainRatio = (localStockValue - localCostBasis) / localStockValue;
      totalTaxSavings += stockDonation * gainRatio * 0.15 + stockDonation * 0.24;
    }

    // Priority 3: DAF bunching
    if (useDAF) {
      dafContribution = givingAmount * bunchingYears;
      totalTaxSavings += dafAnalysis.netBenefit;
    }

    // Remainder as cash
    cashDonation = remainingGiving;
    if (cashDonation > 0) {
      totalTaxSavings += cashDonation * 0.22; // Basic deduction value
    }

    return {
      qcdAmount,
      dafContribution,
      stockDonation,
      cashDonation,
      totalTaxSavings,
      yearsOfBunching: useDAF ? bunchingYears : 1,
    };
  }, [
    givingAmount,
    useQCD,
    useDAF,
    useSockDonation,
    qcdAnalysis,
    dafAnalysis,
    localStockValue,
    localCostBasis,
    bunchingYears
  ]);

  // Notify parent of strategy changes
  React.useEffect(() => {
    onStrategyChange?.(optimizedStrategy);
  }, [optimizedStrategy, onStrategyChange]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Charitable Giving Optimizer
        </CardTitle>
        <CardDescription>
          Tax-smart strategies to maximize the impact of your generosity
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Setup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Input
            label="Annual Giving Goal"
            value={givingAmount}
            setter={setGivingAmount}
            min={0}
            max={1000000}
            step={1000}
            prefix="$"
            tip="How much you want to give to charity each year"
          />
          <Input
            label="Appreciated Stock Value"
            value={localStockValue}
            setter={setLocalStockValue}
            min={0}
            max={10000000}
            step={1000}
            prefix="$"
            tip="Current market value of stocks you could donate"
          />
          <Input
            label="Stock Cost Basis"
            value={localCostBasis}
            setter={setLocalCostBasis}
            min={0}
            max={localStockValue}
            step={1000}
            prefix="$"
            tip="What you originally paid for the stock"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4 border border-pink-200 dark:border-pink-900">
            <div className="text-sm text-pink-700 dark:text-pink-400 mb-1">Your Giving</div>
            <div className="text-2xl font-bold text-pink-900 dark:text-pink-100">
              {formatCurrency(givingAmount)}
            </div>
            <div className="text-xs text-pink-600 dark:text-pink-400">/year</div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
            <div className="text-sm text-green-700 dark:text-green-400 mb-1">Tax Savings</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(optimizedStrategy.totalTaxSavings)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">with optimization</div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Net Cost</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(givingAmount - optimizedStrategy.totalTaxSavings)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">after tax benefit</div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
            <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">Unrealized Gains</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(localStockValue - localCostBasis)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">in stock</div>
          </div>
        </div>

        {/* Strategy Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="qcd">QCD</TabsTrigger>
            <TabsTrigger value="daf">DAF Bunching</TabsTrigger>
            <TabsTrigger value="stock">Stock Gifts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* QCD Strategy */}
            {qcdAnalysis.eligible && (
              <StrategyCard
                title="Qualified Charitable Distribution (QCD)"
                description="Give directly from IRA - counts toward RMD but NOT as income"
                icon={<Landmark className="h-5 w-5" />}
                savings={qcdAnalysis.taxSavings}
                isRecommended={age >= RMD_START_AGE && iraBalance > 100000}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useQCD}
                      onCheckedChange={setUseQCD}
                      id="use-qcd"
                    />
                    <Label htmlFor="use-qcd" className="text-sm">Use QCD Strategy</Label>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    Age {age.toFixed(1)} - Eligible
                  </Badge>
                </div>

                {qcdAnalysis.rmdAmount > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>RMD Alert:</strong> You have a required minimum distribution of{" "}
                        <strong>{formatCurrency(qcdAnalysis.rmdAmount)}</strong> this year.
                        A QCD can satisfy this RMD without adding to your taxable income!
                      </div>
                    </div>
                  </div>
                )}
              </StrategyCard>
            )}

            {/* Stock Donation Strategy */}
            <StrategyCard
              title="Appreciated Stock Donations"
              description="Donate stock instead of cash - avoid capital gains AND get deduction"
              icon={<TrendingUp className="h-5 w-5" />}
              savings={stockDonationAnalysis.benefitVsCash}
              isRecommended={localStockValue - localCostBasis > 10000}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useSockDonation}
                    onCheckedChange={setUseStockDonation}
                    id="use-stock"
                  />
                  <Label htmlFor="use-stock" className="text-sm">Donate Appreciated Stock</Label>
                </div>
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  {formatPercent((localStockValue - localCostBasis) / localStockValue)} gain
                </Badge>
              </div>

              {useSockDonation && (
                <ImpactComparison
                  label={`Donating ${formatCurrency(Math.min(givingAmount, localStockValue))} to charity`}
                  cashAmount={Math.min(givingAmount, localStockValue)}
                  optimizedAmount={Math.min(givingAmount, localStockValue) - stockDonationAnalysis.taxOnGains}
                  savings={stockDonationAnalysis.taxOnGains}
                />
              )}
            </StrategyCard>

            {/* DAF Bunching Strategy */}
            <StrategyCard
              title="Donor Advised Fund (DAF) Bunching"
              description="Bunch multiple years of giving to itemize deductions"
              icon={<PiggyBank className="h-5 w-5" />}
              savings={dafAnalysis.netBenefit}
              isRecommended={givingAmount * 3 > standardDeduction}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useDAF}
                    onCheckedChange={setUseDAF}
                    id="use-daf"
                  />
                  <Label htmlFor="use-daf" className="text-sm">Use DAF Bunching</Label>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  {bunchingYears} year bundle
                </Badge>
              </div>

              {useDAF && (
                <div className="space-y-3 mt-3">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm whitespace-nowrap">Bundle Years:</Label>
                    <Slider
                      value={[bunchingYears]}
                      onValueChange={(v) => setBunchingYears(v[0])}
                      min={2}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8">{bunchingYears}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Contribute <strong>{formatCurrency(givingAmount * bunchingYears)}</strong> to DAF this year,
                    then grant {formatCurrency(givingAmount)}/year for {bunchingYears} years
                  </div>
                </div>
              )}
            </StrategyCard>

            {/* Charitable Remainder Trust Mention */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Charitable Remainder Trust (Advanced)
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    For larger estates, a CRT provides income to you during your lifetime,
                    with the remainder going to charity. This can provide income tax deductions,
                    avoid capital gains, and reduce estate taxes. Consult an estate planning attorney.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* QCD Deep Dive Tab */}
          <TabsContent value="qcd" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    Qualified Charitable Distribution (QCD)
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    A QCD is a direct transfer from your IRA to a qualified charity.
                    Unlike regular IRA distributions, QCDs are NOT included in your taxable income.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Eligibility */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Eligibility Requirements
                </h4>
                <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    {age >= QCD_ELIGIBLE_AGE ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    Age 70.5 or older (You: {age.toFixed(1)})
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    From Traditional IRA (not 401k)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Direct transfer to 501(c)(3)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Up to {formatCurrency(QCD_LIMIT_2024)}/year (2024)
                  </li>
                </ul>
              </div>

              {/* Benefits */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Why QCDs Are Powerful
                </h4>
                <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Satisfies RMD without increasing AGI
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    May lower Medicare premiums (IRMAA)
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    May reduce Social Security taxation
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Works even if you take standard deduction
                  </li>
                </ul>
              </div>
            </div>

            {/* QCD Calculator */}
            {qcdAnalysis.eligible && (
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Your QCD Impact</h4>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-sm text-gray-500 mb-1">Your RMD</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(qcdAnalysis.rmdAmount)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-sm text-gray-500 mb-1">QCD Amount</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(Math.min(givingAmount, qcdAnalysis.maxQCD))}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-sm text-green-600 mb-1">Tax Saved</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(qcdAnalysis.taxSavings)}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Example:</strong> If you must take a {formatCurrency(qcdAnalysis.rmdAmount)} RMD
                    and you're in the {formatPercent(qcdAnalysis.effectiveSavingsRate)} combined bracket,
                    a QCD saves you {formatCurrency(Math.min(givingAmount, qcdAnalysis.rmdAmount) * qcdAnalysis.effectiveSavingsRate)} in taxes
                    vs. taking the RMD and donating cash.
                  </div>
                </div>
              </div>
            )}

            {!qcdAnalysis.eligible && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">🎂</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  QCD Available at Age 70.5
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  You'll be eligible in {(QCD_ELIGIBLE_AGE - age).toFixed(1)} years
                </div>
              </div>
            )}
          </TabsContent>

          {/* DAF Tab */}
          <TabsContent value="daf" className="space-y-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-900 dark:text-purple-100">
                    Donor Advised Fund (DAF) Bunching
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                    Contribute multiple years of charitable giving to a DAF in one year to exceed the
                    standard deduction threshold, then make grants to charities over time.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">How DAF Bunching Works</h4>

              <div className="relative">
                {/* Timeline visualization */}
                <div className="flex items-center justify-between">
                  {Array.from({ length: bunchingYears }, (_, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div className={`
                        mx-auto w-12 h-12 rounded-full flex items-center justify-center
                        ${i === 0
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }
                      `}>
                        {i === 0 ? (
                          <DollarSign className="h-6 w-6" />
                        ) : (
                          <Gift className="h-5 w-5" />
                        )}
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        Year {i + 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        {i === 0
                          ? `Contribute ${formatCurrency(givingAmount * bunchingYears)}`
                          : `Grant ${formatCurrency(givingAmount)}`
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connecting line */}
                <div className="absolute top-6 left-12 right-12 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-red-600">Without Bunching</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Annual giving:</span>
                    <span className="font-medium">{formatCurrency(givingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard deduction:</span>
                    <span className="font-medium">{formatCurrency(standardDeduction)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Charitable tax benefit:</span>
                    <span className="font-medium text-red-600">$0</span>
                  </div>
                  <div className="text-xs italic">
                    Donation doesn't exceed standard deduction, so no extra tax benefit
                  </div>
                </div>
              </div>

              <div className="border border-green-300 dark:border-green-800 rounded-lg p-4 space-y-3 bg-green-50 dark:bg-green-950/20">
                <h4 className="font-semibold text-green-600">With DAF Bunching</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Bunch year contribution:</span>
                    <span className="font-medium">{formatCurrency(givingAmount * bunchingYears)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other deductions (est.):</span>
                    <span className="font-medium">{formatCurrency(10000)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Extra deduction value:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(Math.max(0, givingAmount * bunchingYears + 10000 - standardDeduction))}
                    </span>
                  </div>
                  <div className="text-xs italic">
                    {formatCurrency(givingAmount * bunchingYears + 10000)} itemized vs {formatCurrency(standardDeduction)} standard
                  </div>
                </div>
              </div>
            </div>

            {/* Bunching Calculator */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Calculate Your Optimal Bundle</h4>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Years:</Label>
                  <Slider
                    value={[bunchingYears]}
                    onValueChange={(v) => setBunchingYears(v[0])}
                    min={2}
                    max={5}
                    step={1}
                    className="w-32"
                  />
                  <span className="text-sm font-bold w-6">{bunchingYears}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Total Bundle</div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(givingAmount * bunchingYears)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Above Standard</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(Math.max(0, givingAmount * bunchingYears - standardDeduction))}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-sm text-green-600 mb-1">Tax Benefit</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(dafAnalysis.netBenefit)}
                  </div>
                </div>
              </div>
            </div>

            {/* DAF Benefits */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Additional DAF Benefits
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Contribute appreciated securities for additional tax savings</li>
                <li>Assets grow tax-free inside the DAF</li>
                <li>No minimum grant amounts at many providers</li>
                <li>Create a family giving legacy</li>
                <li>Take your time deciding which charities to support</li>
              </ul>
            </div>
          </TabsContent>

          {/* Stock Donations Tab */}
          <TabsContent value="stock" className="space-y-4 mt-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    Appreciated Stock Donations
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Donate stock that has increased in value. You avoid paying capital gains tax
                    AND receive a deduction for the full fair market value.
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Calculator */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">Your Stock Donation Analysis</h4>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Stock Value (FMV)"
                  value={localStockValue}
                  setter={setLocalStockValue}
                  min={0}
                  max={10000000}
                  step={1000}
                  prefix="$"
                />
                <Input
                  label="Cost Basis"
                  value={localCostBasis}
                  setter={setLocalCostBasis}
                  min={0}
                  max={localStockValue}
                  step={1000}
                  prefix="$"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Unrealized Gain</div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(stockDonationAnalysis.capitalGainsAvoided)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Tax on Gain</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(stockDonationAnalysis.taxOnGains)}
                    </div>
                    <div className="text-xs text-gray-400">Avoided!</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Deduction Value</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(stockDonationAnalysis.deductionValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-green-600 mb-1">Total Benefit</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(stockDonationAnalysis.totalBenefit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash vs Stock Comparison */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">Cash vs. Stock: Side-by-Side Comparison</h4>

              <div className="grid grid-cols-2 gap-4">
                {/* Cash Donation */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h5 className="font-medium text-gray-600 dark:text-gray-400">Donate Cash</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gift amount:</span>
                      <span>{formatCurrency(localStockValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax deduction (24%):</span>
                      <span className="text-green-600">-{formatCurrency(localStockValue * 0.24)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capital gains tax:</span>
                      <span className="text-red-600">
                        +{formatCurrency(stockDonationAnalysis.taxOnGains)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Net cost to you:</span>
                      <span>
                        {formatCurrency(localStockValue - localStockValue * 0.24 + stockDonationAnalysis.taxOnGains)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 italic">
                    * Must sell stock, pay cap gains, then donate
                  </div>
                </div>

                {/* Stock Donation */}
                <div className="border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-3">
                  <h5 className="font-medium text-green-600">Donate Stock</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gift amount:</span>
                      <span>{formatCurrency(localStockValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax deduction (24%):</span>
                      <span className="text-green-600">-{formatCurrency(localStockValue * 0.24)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capital gains tax:</span>
                      <span className="text-green-600">$0 (avoided!)</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Net cost to you:</span>
                      <span className="text-green-600">
                        {formatCurrency(localStockValue - localStockValue * 0.24)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    Save {formatCurrency(stockDonationAnalysis.taxOnGains)} vs. cash!
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-100">
                    Stock Donation Requirements
                  </div>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 space-y-1 list-disc list-inside">
                    <li>Must be held more than 1 year (long-term)</li>
                    <li>Deduction limited to 30% of AGI for stock gifts</li>
                    <li>Charity must be a 501(c)(3) organization</li>
                    <li>Consider donating highest-gain lots first</li>
                    <li>Works for individual stocks, ETFs, and mutual funds</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Optimized Strategy Summary */}
        <div className="border-t pt-6">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-pink-200 dark:border-pink-900">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-pink-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-pink-900 dark:text-pink-100 mb-2">
                  Your Optimized Giving Strategy
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {optimizedStrategy.qcdAmount > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <div className="text-xs text-gray-500">QCD</div>
                      <div className="font-semibold">{formatCurrency(optimizedStrategy.qcdAmount)}</div>
                    </div>
                  )}
                  {optimizedStrategy.stockDonation > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <div className="text-xs text-gray-500">Stock</div>
                      <div className="font-semibold">{formatCurrency(optimizedStrategy.stockDonation)}</div>
                    </div>
                  )}
                  {optimizedStrategy.dafContribution > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <div className="text-xs text-gray-500">DAF (bunched)</div>
                      <div className="font-semibold">{formatCurrency(optimizedStrategy.dafContribution)}</div>
                    </div>
                  )}
                  {optimizedStrategy.cashDonation > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <div className="text-xs text-gray-500">Cash</div>
                      <div className="font-semibold">{formatCurrency(optimizedStrategy.cashDonation)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-pink-800 dark:text-pink-200">
                    Total tax savings with optimization:
                  </span>
                  <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                    {formatCurrency(optimizedStrategy.totalTaxSavings)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Note */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Tax Planning Integration
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                These charitable giving strategies are factored into your lifetime tax dashboard and estate planning projections.
                QCDs reduce your RMD income, stock donations avoid capital gains, and DAF bunching optimizes your deductions.
                Work with a tax professional to implement these strategies for your specific situation.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CharitableGiving.displayName = 'CharitableGiving';

export default CharitableGiving;

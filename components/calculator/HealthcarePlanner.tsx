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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Heart,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Calendar,
  Shield,
  Wallet,
  Info,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Stethoscope,
  Building2,
  PiggyBank,
  Clock,
  AlertCircle,
} from "lucide-react";

import {
  calculateHealthcareCosts,
  calculateEarlyRetirementHealthcareGap,
  calculateACASubsidyOptimization,
  calculateHSAStrategy,
  getQuickHealthcareEstimate,
  type HealthcareCostInputs,
  type HealthcareCostResult,
  MEDICARE_PART_B,
  ACA_SUBSIDIES_2024,
  LONG_TERM_CARE,
  HSA_CONSTANTS,
} from "@/lib/calculations/healthcareEngine";
import type { FilingStatus } from "@/lib/calculations/shared";

// ===============================
// Types
// ===============================

interface HealthcarePlannerProps {
  age: number;
  spouseAge?: number;
  maritalStatus: FilingStatus;
  retirementAge: number;
  estimatedRetirementIncome: number;
  currentHSABalance?: number;
  onHealthcareCostChange?: (annualCost: number, totalLifetime: number) => void;
}

// ===============================
// Helper Components
// ===============================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyK = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}k`;
};

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "red" | "purple" | "orange";
  trend?: "up" | "down" | "neutral";
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    yellow: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  };

  const textClasses = {
    blue: "text-blue-900 dark:text-blue-100",
    green: "text-green-900 dark:text-green-100",
    yellow: "text-yellow-900 dark:text-yellow-100",
    red: "text-red-900 dark:text-red-100",
    purple: "text-purple-900 dark:text-purple-100",
    orange: "text-orange-900 dark:text-orange-100",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${textClasses[color]}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

// ===============================
// Main Component
// ===============================

export const HealthcarePlanner: React.FC<HealthcarePlannerProps> = ({
  age,
  spouseAge,
  maritalStatus,
  retirementAge,
  estimatedRetirementIncome,
  currentHSABalance = 0,
  onHealthcareCostChange,
}) => {
  // State for user inputs
  const [preMedicareCoverage, setPreMedicareCoverage] = useState<
    "aca" | "cobra" | "spouse_employer" | "health_sharing" | "custom"
  >("aca");
  const [medicareCoverage, setMedicareCoverage] = useState<
    "traditional_medigap" | "medicare_advantage" | "traditional_only"
  >("traditional_medigap");
  const [medigapPlan, setMedigapPlan] = useState<"F" | "G" | "N">("G");
  const [includeLTC, setIncludeLTC] = useState(true);
  const [ltcStrategy, setLtcStrategy] = useState<
    "self_insure" | "ltc_insurance" | "hybrid" | "medicaid_planning"
  >("self_insure");
  const [hasHSA, setHasHSA] = useState(currentHSABalance > 0);
  const [hsaBalance, setHsaBalance] = useState(currentHSABalance);
  const [annualHSAContribution, setAnnualHSAContribution] = useState(
    maritalStatus === "married" ? 8300 : 4150
  );
  const [estimatedMAGI, setEstimatedMAGI] = useState(estimatedRetirementIncome);

  // Calculate healthcare costs
  const healthcareResult = useMemo<HealthcareCostResult>(() => {
    const inputs: HealthcareCostInputs = {
      age1: age,
      age2: spouseAge,
      maritalStatus,
      estimatedMAGI,
      retirementIncome: estimatedRetirementIncome,
      preMedicareCoverage,
      medicareCoverage,
      medigapPlan,
      includeLTC,
      ltcStrategy,
      hasHSA,
      currentHSABalance: hsaBalance,
      annualHSAContribution,
    };

    return calculateHealthcareCosts(inputs);
  }, [
    age,
    spouseAge,
    maritalStatus,
    estimatedMAGI,
    estimatedRetirementIncome,
    preMedicareCoverage,
    medicareCoverage,
    medigapPlan,
    includeLTC,
    ltcStrategy,
    hasHSA,
    hsaBalance,
    annualHSAContribution,
  ]);

  // Calculate early retirement gap
  const earlyRetirementGap = useMemo(() => {
    return calculateEarlyRetirementHealthcareGap(
      retirementAge,
      age,
      estimatedMAGI,
      maritalStatus
    );
  }, [retirementAge, age, estimatedMAGI, maritalStatus]);

  // Quick estimate for header display
  const quickEstimate = useMemo(() => {
    return getQuickHealthcareEstimate(age, maritalStatus, includeLTC);
  }, [age, maritalStatus, includeLTC]);

  // Notify parent of cost changes
  React.useEffect(() => {
    if (onHealthcareCostChange) {
      const avgAnnual =
        healthcareResult.totalLifetimeHealthcare / Math.max(1, 95 - age);
      onHealthcareCostChange(avgAnnual, healthcareResult.totalLifetimeHealthcare);
    }
  }, [healthcareResult, age, onHealthcareCostChange]);

  // Determine if in "danger zone" (55-64)
  const inDangerZone = age >= 55 && age < 65;
  const yearsUntilMedicare = Math.max(0, 65 - age);

  return (
    <div className="space-y-6">
      {/* Header with Key Stats */}
      <Card className="border-2 border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-xl">
                <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Healthcare Cost Planner</CardTitle>
                <CardDescription>
                  Healthcare is the #1 fear in retirement. Let's make it manageable.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300"
            >
              Fidelity 2024: $315k/couple
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Lifetime Healthcare"
              value={formatCurrencyK(healthcareResult.totalLifetimeHealthcare)}
              subtitle={`${95 - age} years to age 95`}
              icon={<DollarSign className="h-5 w-5 text-red-600" />}
              color="red"
            />
            <StatCard
              title="Pre-Medicare Costs"
              value={formatCurrencyK(healthcareResult.totalPreMedicare)}
              subtitle={`${yearsUntilMedicare} years until Medicare`}
              icon={<Clock className="h-5 w-5 text-orange-600" />}
              color="orange"
            />
            <StatCard
              title="Medicare Costs"
              value={formatCurrencyK(healthcareResult.totalMedicare)}
              subtitle="Ages 65-95"
              icon={<Stethoscope className="h-5 w-5 text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="LTC Reserve"
              value={formatCurrencyK(healthcareResult.totalLTC)}
              subtitle={`${LONG_TERM_CARE.probabilityOfNeeding65Plus * 100}% will need care`}
              icon={<Shield className="h-5 w-5 text-purple-600" />}
              color="purple"
            />
          </div>

          {/* Danger Zone Warning */}
          {inDangerZone && (
            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    DANGER ZONE: Ages 55-64
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This is the most expensive period for healthcare - high costs, no Medicare.
                    Budget{" "}
                    <strong>
                      {formatCurrency(healthcareResult.preMedicareAnalysis.annualCost)}/year
                    </strong>{" "}
                    for coverage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Early Retirement Gap Warning */}
          {earlyRetirementGap.yearsGap > 0 && (
            <div className="mt-4 p-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Early Retirement Healthcare Gap: {formatCurrency(earlyRetirementGap.totalGapCost)}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Retiring at {retirementAge} means {earlyRetirementGap.yearsGap} years without Medicare.
                    {earlyRetirementGap.withSubsidy
                      ? " ACA subsidies will help."
                      : " Consider strategies to qualify for ACA subsidies."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="pre-medicare" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="pre-medicare" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pre-Medicare</span>
            <span className="sm:hidden">Pre-65</span>
          </TabsTrigger>
          <TabsTrigger value="medicare" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Medicare 65+</span>
            <span className="sm:hidden">65+</span>
          </TabsTrigger>
          <TabsTrigger value="ltc" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Long-Term Care</span>
            <span className="sm:hidden">LTC</span>
          </TabsTrigger>
          <TabsTrigger value="aca" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">ACA Subsidies</span>
            <span className="sm:hidden">ACA</span>
          </TabsTrigger>
          <TabsTrigger value="hsa" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            <span className="hidden sm:inline">HSA Strategy</span>
            <span className="sm:hidden">HSA</span>
          </TabsTrigger>
        </TabsList>

        {/* Pre-Medicare Tab */}
        <TabsContent value="pre-medicare">
          <PreMedicareSection
            analysis={healthcareResult.preMedicareAnalysis}
            age={age}
            maritalStatus={maritalStatus}
            coverage={preMedicareCoverage}
            setCoverage={setPreMedicareCoverage}
            estimatedMAGI={estimatedMAGI}
            setEstimatedMAGI={setEstimatedMAGI}
          />
        </TabsContent>

        {/* Medicare Tab */}
        <TabsContent value="medicare">
          <MedicareSection
            analysis={healthcareResult.medicareAnalysis}
            coverage={medicareCoverage}
            setCoverage={setMedicareCoverage}
            medigapPlan={medigapPlan}
            setMedigapPlan={setMedigapPlan}
            estimatedMAGI={estimatedMAGI}
          />
        </TabsContent>

        {/* Long-Term Care Tab */}
        <TabsContent value="ltc">
          <LTCSection
            analysis={healthcareResult.ltcAnalysis}
            includeLTC={includeLTC}
            setIncludeLTC={setIncludeLTC}
            strategy={ltcStrategy}
            setStrategy={setLtcStrategy}
            age={age}
          />
        </TabsContent>

        {/* ACA Subsidies Tab */}
        <TabsContent value="aca">
          <ACASubsidySection
            analysis={healthcareResult.acaSubsidyAnalysis}
            age={age}
            maritalStatus={maritalStatus}
            estimatedMAGI={estimatedMAGI}
            setEstimatedMAGI={setEstimatedMAGI}
          />
        </TabsContent>

        {/* HSA Strategy Tab */}
        <TabsContent value="hsa">
          <HSASection
            strategy={healthcareResult.hsaStrategy}
            hasHSA={hasHSA}
            setHasHSA={setHasHSA}
            balance={hsaBalance}
            setBalance={setHsaBalance}
            contribution={annualHSAContribution}
            setContribution={setAnnualHSAContribution}
            age={age}
            maritalStatus={maritalStatus}
          />
        </TabsContent>
      </Tabs>

      {/* Timeline View */}
      <HealthcareTimeline
        annualCosts={healthcareResult.annualCostsByAge}
        currentAge={age}
        retirementAge={retirementAge}
      />

      {/* Recommendations */}
      <RecommendationsCard
        warnings={healthcareResult.warnings}
        recommendations={healthcareResult.recommendations}
      />
    </div>
  );
};

// ===============================
// Section Components
// ===============================

const PreMedicareSection: React.FC<{
  analysis: HealthcareCostResult["preMedicareAnalysis"];
  age: number;
  maritalStatus: FilingStatus;
  coverage: "aca" | "cobra" | "spouse_employer" | "health_sharing" | "custom";
  setCoverage: (v: "aca" | "cobra" | "spouse_employer" | "health_sharing" | "custom") => void;
  estimatedMAGI: number;
  setEstimatedMAGI: (v: number) => void;
}> = ({ analysis, age, maritalStatus, coverage, setCoverage, estimatedMAGI, setEstimatedMAGI }) => {
  if (age >= 65) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-lg font-semibold">You're Medicare-eligible!</p>
          <p className="text-muted-foreground">
            No pre-Medicare planning needed. See the Medicare tab for your costs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Coverage Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-600" />
            Pre-Medicare Coverage (Before 65)
          </CardTitle>
          <CardDescription>
            {analysis.yearsBeforeMedicare} years until Medicare eligibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Coverage Type</Label>
            <Select value={coverage} onValueChange={(v) => setCoverage(v as typeof coverage)}>
              <SelectTrigger>
                <SelectValue placeholder="Select coverage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aca">ACA Marketplace</SelectItem>
                <SelectItem value="cobra">COBRA (from employer)</SelectItem>
                <SelectItem value="spouse_employer">Spouse's Employer Plan</SelectItem>
                <SelectItem value="health_sharing">Health Sharing Ministry</SelectItem>
                <SelectItem value="custom">Custom/Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Estimated Annual Income (MAGI)
              <InfoTooltip content="Modified Adjusted Gross Income affects ACA subsidies and IRMAA surcharges" />
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[estimatedMAGI]}
                onValueChange={([v]) => setEstimatedMAGI(v)}
                min={0}
                max={500000}
                step={5000}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {formatCurrency(estimatedMAGI)}
              </span>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex justify-between items-center">
              <span className="font-medium">Annual Cost:</span>
              <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(analysis.annualCost)}
              </span>
            </div>
            {analysis.acaSubsidyEligible && (
              <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                ACA subsidy: -{formatCurrency(analysis.estimatedSubsidy)}/year
              </div>
            )}
            <div className="mt-2 text-sm text-muted-foreground">
              Total before Medicare: {formatCurrency(analysis.totalCost)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Alternatives</CardTitle>
          <CardDescription>Compare your options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.alternatives.map((alt, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                alt.name === analysis.coverageType
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">{alt.name}</span>
                <Badge variant="outline">{formatCurrency(alt.annualCost)}/yr</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400 mb-1">Pros:</p>
                  <ul className="space-y-1">
                    {alt.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400 mb-1">Cons:</p>
                  <ul className="space-y-1">
                    {alt.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <XCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const MedicareSection: React.FC<{
  analysis: HealthcareCostResult["medicareAnalysis"];
  coverage: "traditional_medigap" | "medicare_advantage" | "traditional_only";
  setCoverage: (v: "traditional_medigap" | "medicare_advantage" | "traditional_only") => void;
  medigapPlan: "F" | "G" | "N";
  setMedigapPlan: (v: "F" | "G" | "N") => void;
  estimatedMAGI: number;
}> = ({ analysis, coverage, setCoverage, medigapPlan, setMedigapPlan, estimatedMAGI }) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Medicare Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Medicare Coverage (65+)
          </CardTitle>
          <CardDescription>
            Medicare Part B standard premium: ${MEDICARE_PART_B.standardPremium2024}/month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Medicare Coverage Type</Label>
            <Select value={coverage} onValueChange={(v) => setCoverage(v as typeof coverage)}>
              <SelectTrigger>
                <SelectValue placeholder="Select coverage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="traditional_medigap">Traditional Medicare + Medigap</SelectItem>
                <SelectItem value="medicare_advantage">Medicare Advantage (Part C)</SelectItem>
                <SelectItem value="traditional_only">Traditional Medicare Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {coverage === "traditional_medigap" && (
            <div className="space-y-2">
              <Label>
                Medigap Plan
                <InfoTooltip content="Plan G is most popular. Plan F is no longer available to new enrollees." />
              </Label>
              <Select value={medigapPlan} onValueChange={(v) => setMedigapPlan(v as typeof medigapPlan)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Medigap plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G">Plan G (Most Popular)</SelectItem>
                  <SelectItem value="N">Plan N (Lower Premium)</SelectItem>
                  <SelectItem value="F">Plan F (Existing Enrollees Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monthly Cost Breakdown */}
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-sm">Monthly Cost Breakdown:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Part B Premium</span>
                <span>{formatCurrency(analysis.partBPremium)}</span>
              </div>
              {analysis.irmaaSurcharge > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>IRMAA Surcharge</span>
                  <span>+{formatCurrency(analysis.irmaaSurcharge)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Part D (Rx)</span>
                <span>{formatCurrency(analysis.partDPremium)}</span>
              </div>
              {analysis.supplementCost > 0 && (
                <div className="flex justify-between">
                  <span>
                    {coverage === "traditional_medigap"
                      ? `Medigap Plan ${medigapPlan}`
                      : "Medicare Advantage"}
                  </span>
                  <span>{formatCurrency(analysis.supplementCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-blue-300 dark:border-blue-700">
                <span>Total Monthly</span>
                <span className="text-blue-700 dark:text-blue-300">
                  {formatCurrency(analysis.totalMonthly)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Annual</span>
                <span>{formatCurrency(analysis.totalAnnual)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IRMAA Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            IRMAA Surcharges
          </CardTitle>
          <CardDescription>
            Income-Related Monthly Adjustment Amount based on MAGI from 2 years prior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`p-4 rounded-lg border ${
              analysis.irmaaSurcharge > 0
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Your IRMAA Status:</span>
              <Badge variant={analysis.irmaaSurcharge > 0 ? "destructive" : "default"}>
                {analysis.irmaaTier}
              </Badge>
            </div>
            {analysis.irmaaSurcharge > 0 && (
              <p className="text-sm text-red-700 dark:text-red-300">
                Your income of {formatCurrency(estimatedMAGI)} adds{" "}
                {formatCurrency(analysis.irmaaSurcharge)}/month to Part B and Part D premiums.
              </p>
            )}
          </div>

          {/* IRMAA Brackets Table */}
          <div className="text-sm">
            <p className="font-semibold mb-2">2026 IRMAA Brackets (Single):</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span>$0 - $109,000</span>
                <span className="text-green-600">No surcharge</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>$109,000 - $137,000</span>
                <span>+$81.20/mo</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>$137,000 - $171,000</span>
                <span>+$202.90/mo</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>$171,000 - $205,000</span>
                <span>+$324.60/mo</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>$205,000 - $500,000</span>
                <span>+$446.30/mo</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Above $500,000</span>
                <span className="text-red-600">+$487.00/mo</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Recommendations:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const LTCSection: React.FC<{
  analysis: HealthcareCostResult["ltcAnalysis"];
  includeLTC: boolean;
  setIncludeLTC: (v: boolean) => void;
  strategy: "self_insure" | "ltc_insurance" | "hybrid" | "medicaid_planning";
  setStrategy: (v: "self_insure" | "ltc_insurance" | "hybrid" | "medicaid_planning") => void;
  age: number;
}> = ({ analysis, includeLTC, setIncludeLTC, strategy, setStrategy, age }) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LTC Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Long-Term Care Planning
          </CardTitle>
          <CardDescription>
            {(analysis.probabilityOfNeed * 100).toFixed(0)}% of people 65+ will need some long-term
            care
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="include-ltc">Include LTC in Plan</Label>
              <InfoTooltip content="Include long-term care cost reserves in your healthcare budget" />
            </div>
            <Switch
              id="include-ltc"
              checked={includeLTC}
              onCheckedChange={setIncludeLTC}
            />
          </div>

          <div className="space-y-2">
            <Label>LTC Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as typeof strategy)}>
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self_insure">Self-Insure (Save to Cover)</SelectItem>
                <SelectItem value="ltc_insurance">Traditional LTC Insurance</SelectItem>
                <SelectItem value="hybrid">Hybrid Life/LTC Policy</SelectItem>
                <SelectItem value="medicaid_planning">Medicaid Planning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current Costs */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <p className="text-muted-foreground">Nursing Home (Private)</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(LONG_TERM_CARE.nursingHomePrivate)}/yr
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <p className="text-muted-foreground">Assisted Living</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(LONG_TERM_CARE.assistedLiving)}/yr
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <p className="text-muted-foreground">Home Health Aide</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(LONG_TERM_CARE.homeHealthAide)}/yr
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <p className="text-muted-foreground">Average Duration</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {LONG_TERM_CARE.avgDurationYears} years
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Analysis</CardTitle>
          <CardDescription>Comparing your options for LTC coverage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Self-Insure Option */}
          <div
            className={`p-4 rounded-lg border ${
              strategy === "self_insure"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">Self-Insure</span>
              <Badge variant="outline">Target: {formatCurrencyK(analysis.selfInsureTarget)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Build a dedicated reserve to cover 3 years of care. No premiums, full control of funds.
            </p>
          </div>

          {/* Insurance Option */}
          <div
            className={`p-4 rounded-lg border ${
              strategy === "ltc_insurance"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">LTC Insurance</span>
              <Badge variant="outline">{formatCurrency(analysis.insuranceOption.annualPremium)}/yr</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Total premiums: {formatCurrencyK(analysis.insuranceOption.totalPremiums)} for{" "}
              {formatCurrencyK(analysis.insuranceOption.coverage)} coverage. Breakeven at{" "}
              {analysis.insuranceOption.breakevenYears.toFixed(1)} years of care.
            </p>
          </div>

          {/* Medicaid Considerations */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              Medicaid Planning Considerations:
            </p>
            <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
              {analysis.medicaidConsiderations.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendation */}
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="font-semibold text-sm text-green-800 dark:text-green-200 mb-1">
              Recommendation:
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">{analysis.recommendation}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ACASubsidySection: React.FC<{
  analysis: HealthcareCostResult["acaSubsidyAnalysis"] | undefined;
  age: number;
  maritalStatus: FilingStatus;
  estimatedMAGI: number;
  setEstimatedMAGI: (v: number) => void;
}> = ({ analysis, age, maritalStatus, estimatedMAGI, setEstimatedMAGI }) => {
  // Recalculate if no analysis provided
  const subsidyAnalysis = useMemo(() => {
    if (analysis) return analysis;
    return calculateACASubsidyOptimization(
      estimatedMAGI,
      age,
      maritalStatus === "married" ? 2 : 1
    );
  }, [analysis, estimatedMAGI, age, maritalStatus]);

  if (age >= 65) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-lg font-semibold">Medicare replaces ACA at 65</p>
          <p className="text-muted-foreground">
            ACA subsidies are only relevant before Medicare eligibility.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Subsidy Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            ACA Subsidy Calculator
          </CardTitle>
          <CardDescription>
            Optimize your income to maximize premium tax credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>
              Modified AGI (MAGI)
              <InfoTooltip content="Includes wages, self-employment, IRA distributions, capital gains, Social Security, and tax-exempt interest" />
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[estimatedMAGI]}
                onValueChange={([v]) => setEstimatedMAGI(v)}
                min={0}
                max={500000}
                step={5000}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {formatCurrency(estimatedMAGI)}
              </span>
            </div>
          </div>

          {/* Subsidy Summary */}
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
            <div className="flex justify-between">
              <span>Your FPL Percentage:</span>
              <span className="font-bold">{subsidyAnalysis.fplPercent.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Max Premium (% of income):</span>
              <span className="font-bold">{subsidyAnalysis.maxPremiumPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span>Benchmark Premium:</span>
              <span>{formatCurrency(subsidyAnalysis.benchmarkPremium)}/yr</span>
            </div>
            <div className="flex justify-between text-green-700 dark:text-green-300 font-bold pt-2 border-t">
              <span>Your ACA Subsidy:</span>
              <span>{formatCurrency(subsidyAnalysis.subsidyAmount)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span>Net Premium:</span>
              <span className="font-bold">{formatCurrency(subsidyAnalysis.netPremium)}/yr</span>
            </div>
          </div>

          {subsidyAnalysis.rothConversionImpact > 1000 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Roth Conversion Impact:</strong> Converting $10k from traditional IRA would
                reduce your ACA subsidy by ~{formatCurrency(subsidyAnalysis.rothConversionImpact / 10 * 100)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subsidy Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Key Income Thresholds</CardTitle>
          <CardDescription>
            Keep income below these levels to maximize subsidies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subsidyAnalysis.thresholds.map((threshold, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                estimatedMAGI <= threshold.incomeLimit
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold">{threshold.fplPercent}% FPL</span>
                <span className="text-sm">{formatCurrency(threshold.incomeLimit)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{threshold.description}</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Subsidy at limit: {formatCurrency(threshold.subsidyAtLimit)}/yr
              </p>
            </div>
          ))}

          {/* Recommendations */}
          {subsidyAnalysis.recommendations.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <p className="font-semibold text-sm">Optimization Tips:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {subsidyAnalysis.recommendations.slice(0, 4).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const HSASection: React.FC<{
  strategy: HealthcareCostResult["hsaStrategy"];
  hasHSA: boolean;
  setHasHSA: (v: boolean) => void;
  balance: number;
  setBalance: (v: number) => void;
  contribution: number;
  setContribution: (v: number) => void;
  age: number;
  maritalStatus: FilingStatus;
}> = ({
  strategy,
  hasHSA,
  setHasHSA,
  balance,
  setBalance,
  contribution,
  setContribution,
  age,
  maritalStatus,
}) => {
  const maxContribution =
    (maritalStatus === "married" ? HSA_CONSTANTS.familyLimit2024 : HSA_CONSTANTS.individualLimit2024) +
    (age >= 55 ? HSA_CONSTANTS.catchUpAge55 : 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* HSA Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-green-600" />
            HSA Strategy
          </CardTitle>
          <CardDescription>
            Triple tax advantage: tax-free contributions, growth, and withdrawals for medical
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="has-hsa">Have HSA-Eligible Plan?</Label>
              <InfoTooltip content="Must have High Deductible Health Plan (HDHP) to contribute" />
            </div>
            <Switch id="has-hsa" checked={hasHSA} onCheckedChange={setHasHSA} />
          </div>

          {hasHSA && (
            <>
              <div className="space-y-2">
                <Label>Current HSA Balance</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[balance]}
                    onValueChange={([v]) => setBalance(v)}
                    min={0}
                    max={200000}
                    step={1000}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-20 text-right">
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Annual Contribution
                  <InfoTooltip
                    content={`2024 max: ${formatCurrency(maxContribution)} (includes catch-up if 55+)`}
                  />
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[contribution]}
                    onValueChange={([v]) => setContribution(v)}
                    min={0}
                    max={maxContribution}
                    step={100}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-20 text-right">
                    {formatCurrency(contribution)}
                  </span>
                </div>
                {contribution < maxContribution && (
                  <p className="text-xs text-yellow-600">
                    Consider maxing out at {formatCurrency(maxContribution)}/year
                  </p>
                )}
              </div>
            </>
          )}

          {/* Triple Tax Advantage */}
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="font-semibold text-sm text-green-800 dark:text-green-200 mb-2">
              HSA Triple Tax Advantage:
            </p>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tax-deductible contributions (pre-tax)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tax-free investment growth</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tax-free withdrawals for medical expenses</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HSA Projections */}
      <Card>
        <CardHeader>
          <CardTitle>HSA Growth Projections</CardTitle>
          <CardDescription>
            Assuming {(HSA_CONSTANTS.investmentReturn * 100).toFixed(0)}% annual return on
            investments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Projected Balances */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">At Age 65</p>
                <p className="text-xs text-muted-foreground">
                  (Last year of contributions)
                </p>
              </div>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrencyK(strategy.projectedBalanceAt65)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">At Age 75</p>
                <p className="text-xs text-muted-foreground">10 years of growth</p>
              </div>
              <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrencyK(strategy.projectedBalanceAt75)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">At Age 85</p>
                <p className="text-xs text-muted-foreground">20 years of growth</p>
              </div>
              <span className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatCurrencyK(strategy.projectedBalanceAt85)}
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-muted-foreground">Total Contributions</p>
              <p className="font-bold">{formatCurrencyK(strategy.totalContributions)}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-muted-foreground">Investment Growth</p>
              <p className="font-bold text-green-700 dark:text-green-400">
                +{formatCurrencyK(strategy.totalGrowth)}
              </p>
            </div>
          </div>

          {/* Tax Savings */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex justify-between items-center">
              <span className="font-medium">Estimated Tax Savings:</span>
              <span className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                {formatCurrencyK(strategy.taxSavingsEstimate)}
              </span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Assuming 25% effective tax rate on contributions and growth
            </p>
          </div>

          {/* Top Recommendations */}
          {strategy.recommendations.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <p className="font-semibold text-sm">HSA Best Practices:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {strategy.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const HealthcareTimeline: React.FC<{
  annualCosts: HealthcareCostResult["annualCostsByAge"];
  currentAge: number;
  retirementAge: number;
}> = ({ annualCosts, currentAge, retirementAge }) => {
  // Show subset of years (every 5 years for readability)
  const keyYears = annualCosts.filter(
    (_, idx) => idx % 5 === 0 || annualCosts[idx].age === 65 || annualCosts[idx].age === retirementAge
  );

  const maxCost = Math.max(...keyYears.map((y) => y.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Healthcare Cost Timeline
        </CardTitle>
        <CardDescription>
          Projected annual healthcare costs from age {currentAge} to 95
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {keyYears.map((year, idx) => {
            const widthPercent = (year.total / maxCost) * 100;
            const isPreMedicare = year.age < 65;
            const isRetirement = year.age === retirementAge;
            const isMedicare = year.age === 65;

            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-16 text-right">
                  <span
                    className={`text-sm font-medium ${
                      isRetirement
                        ? "text-green-600"
                        : isMedicare
                          ? "text-blue-600"
                          : ""
                    }`}
                  >
                    Age {year.age}
                  </span>
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white transition-all duration-500 ${
                      isPreMedicare
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500"
                    }`}
                    style={{ width: `${Math.max(20, widthPercent)}%` }}
                  >
                    {formatCurrencyK(year.total)}
                  </div>
                </div>
                <div className="w-24 text-xs text-muted-foreground">
                  {isRetirement && <Badge variant="outline" className="text-xs">Retire</Badge>}
                  {isMedicare && <Badge variant="outline" className="text-xs bg-blue-100">Medicare</Badge>}
                  {isPreMedicare && year.age >= 55 && !isRetirement && (
                    <Badge variant="outline" className="text-xs bg-red-100">Danger Zone</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-4 pt-4 border-t justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-orange-500 to-red-500" />
            <span>Pre-Medicare (before 65)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span>Medicare (65+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RecommendationsCard: React.FC<{
  warnings: string[];
  recommendations: string[];
}> = ({ warnings, recommendations }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          Key Insights & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-red-700 dark:text-red-400">Important Warnings:</p>
            <ul className="space-y-2">
              {warnings.map((warning, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800 dark:text-red-200">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-green-700 dark:text-green-400">Recommendations:</p>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-800 dark:text-green-200">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthcarePlanner;

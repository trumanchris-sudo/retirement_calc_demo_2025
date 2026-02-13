"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  DollarSign,
  TrendingUp,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle2,
  PiggyBank,
  Gift,
  ArrowRightLeft,
  Shield,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";
import { Input, Tip } from "@/components/calculator/InputHelpers";
import { usePlanConfig } from "@/lib/plan-config-context";
import { usePersonalInfo } from "@/hooks/usePlanConfigSelectors";

// ==================== Types ====================

interface Child {
  id: string;
  name: string;
  age: number;
  schoolType: SchoolType;
  current529Balance: number;
}

type SchoolType = "public-in-state" | "public-out-of-state" | "private";

interface CollegeCostProjection {
  currentAnnualCost: number;
  inflatedAnnualCost: number;
  totalCost4Years: number;
  yearsUntilCollege: number;
}

interface SavingsTarget {
  totalNeeded: number;
  currentBalance: number;
  gap: number;
  monthlyContributionNeeded: number;
  onTrack: boolean;
  percentFunded: number;
}

interface StateTaxBenefit {
  state: string;
  deductionLimit: number | null;
  deductionType: "deduction" | "credit" | "none";
  notes: string;
}

// ==================== Constants ====================

const COLLEGE_COSTS_2024: Record<SchoolType, number> = {
  "public-in-state": 25000,
  "public-out-of-state": 45000,
  "private": 60000,
};

const COLLEGE_INFLATION_RATE = 0.055; // 5.5% average college cost inflation
const INVESTMENT_RETURN_RATE = 0.07; // 7% average return for 529 plans
const COLLEGE_START_AGE = 18;
const COLLEGE_YEARS = 4;

// 529 to Roth IRA rollover limits (SECURE 2.0)
const ROTH_ROLLOVER_LIFETIME_LIMIT = 35000;
const ROTH_ROLLOVER_ANNUAL_LIMIT = 7000; // Limited to annual Roth IRA contribution limit
const ROTH_ROLLOVER_ACCOUNT_AGE_REQUIREMENT = 15; // Years the 529 must be open

// Gift tax limits for 2024/2025
const ANNUAL_GIFT_TAX_EXCLUSION = 18000;
const SUPERFUNDING_YEARS = 5;

// State tax benefits (simplified - top states)
const STATE_TAX_BENEFITS: Record<string, StateTaxBenefit> = {
  NY: { state: "New York", deductionLimit: 10000, deductionType: "deduction", notes: "Per taxpayer ($20k married filing jointly)" },
  CA: { state: "California", deductionLimit: null, deductionType: "none", notes: "No state income tax deduction" },
  TX: { state: "Texas", deductionLimit: null, deductionType: "none", notes: "No state income tax" },
  PA: { state: "Pennsylvania", deductionLimit: 17000, deductionType: "deduction", notes: "Per beneficiary" },
  IL: { state: "Illinois", deductionLimit: 10000, deductionType: "deduction", notes: "Per contributor ($20k married)" },
  VA: { state: "Virginia", deductionLimit: 4000, deductionType: "deduction", notes: "Per account, unlimited for 70+" },
  CO: { state: "Colorado", deductionLimit: null, deductionType: "deduction", notes: "Full deduction, no limit" },
  IN: { state: "Indiana", deductionLimit: 7500, deductionType: "credit", notes: "20% credit up to $1,500" },
  OH: { state: "Ohio", deductionLimit: 4000, deductionType: "deduction", notes: "Per beneficiary per year" },
  AZ: { state: "Arizona", deductionLimit: 2000, deductionType: "deduction", notes: "Single filer ($4k married)" },
  DEFAULT: { state: "Other", deductionLimit: null, deductionType: "none", notes: "Check your state's specific benefits" },
};

const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  "public-in-state": "Public In-State",
  "public-out-of-state": "Public Out-of-State",
  "private": "Private University",
};

// ==================== Utility Functions ====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateCollegeCost(
  schoolType: SchoolType,
  yearsUntilCollege: number,
  inflationRate: number = COLLEGE_INFLATION_RATE
): CollegeCostProjection {
  const currentAnnualCost = COLLEGE_COSTS_2024[schoolType];
  const inflatedAnnualCost = currentAnnualCost * Math.pow(1 + inflationRate, yearsUntilCollege);

  // Calculate total 4-year cost with inflation during college
  let totalCost4Years = 0;
  for (let year = 0; year < COLLEGE_YEARS; year++) {
    totalCost4Years += currentAnnualCost * Math.pow(1 + inflationRate, yearsUntilCollege + year);
  }

  return {
    currentAnnualCost,
    inflatedAnnualCost,
    totalCost4Years,
    yearsUntilCollege,
  };
}

function calculateSavingsTarget(
  totalNeeded: number,
  currentBalance: number,
  yearsUntilCollege: number,
  returnRate: number = INVESTMENT_RETURN_RATE
): SavingsTarget {
  // Calculate future value of current balance
  const futureValueOfCurrentBalance = currentBalance * Math.pow(1 + returnRate, yearsUntilCollege);

  // Calculate remaining amount needed
  const remainingNeeded = Math.max(0, totalNeeded - futureValueOfCurrentBalance);

  // Calculate monthly contribution needed using future value of annuity formula
  // FV = PMT * [((1 + r)^n - 1) / r]
  // PMT = FV / [((1 + r)^n - 1) / r]
  const monthlyRate = returnRate / 12;
  const months = yearsUntilCollege * 12;

  let monthlyContributionNeeded = 0;
  if (months > 0 && remainingNeeded > 0) {
    const fvFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    monthlyContributionNeeded = remainingNeeded / fvFactor;
  }

  const percentFunded = totalNeeded > 0 ? Math.min(100, (futureValueOfCurrentBalance / totalNeeded) * 100) : 0;

  return {
    totalNeeded,
    currentBalance,
    gap: Math.max(0, totalNeeded - futureValueOfCurrentBalance),
    monthlyContributionNeeded,
    onTrack: futureValueOfCurrentBalance >= totalNeeded,
    percentFunded,
  };
}

function calculateSuperfunding(annualExclusion: number = ANNUAL_GIFT_TAX_EXCLUSION): {
  maxContribution: number;
  perYear: number;
  totalWithSpouse: number;
} {
  const maxContribution = annualExclusion * SUPERFUNDING_YEARS;
  return {
    maxContribution,
    perYear: annualExclusion,
    totalWithSpouse: maxContribution * 2, // Both spouses can superfund
  };
}

// ==================== Sub-Components ====================

interface ChildCardProps {
  child: Child;
  onUpdate: (child: Child) => void;
  onRemove: () => void;
  stateCode: string;
}

const ChildCard: React.FC<ChildCardProps> = ({ child, onUpdate, onRemove, stateCode }) => {
  const yearsUntilCollege = Math.max(0, COLLEGE_START_AGE - child.age);
  const costProjection = calculateCollegeCost(child.schoolType, yearsUntilCollege);
  const savingsTarget = calculateSavingsTarget(
    costProjection.totalCost4Years,
    child.current529Balance,
    yearsUntilCollege
  );

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">{child.name || `Child (Age ${child.age})`}</span>
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors text-sm"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Child's Name</Label>
          <input
            type="text"
            value={child.name}
            onChange={(e) => onUpdate({ ...child, name: e.target.value })}
            placeholder="Enter name"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Current Age</Label>
          <input
            type="number"
            value={child.age}
            onChange={(e) => onUpdate({ ...child, age: Math.max(0, Math.min(18, parseInt(e.target.value) || 0)) })}
            min={0}
            max={18}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Expected School Type</Label>
          <Select
            value={child.schoolType}
            onValueChange={(value: SchoolType) => onUpdate({ ...child, schoolType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public-in-state">Public In-State (~$25k/yr)</SelectItem>
              <SelectItem value="public-out-of-state">Public Out-of-State (~$45k/yr)</SelectItem>
              <SelectItem value="private">Private University (~$60k/yr)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          label="Current 529 Balance"
          value={child.current529Balance}
          setter={(v) => onUpdate({ ...child, current529Balance: v })}
          min={0}
          max={1000000}
          prefix="$"
          tip="Current balance in 529 plan for this child"
        />
      </div>

      {/* Cost Projection Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Years until college:</span>
          <span className="font-medium">{yearsUntilCollege} years</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Projected 4-year cost:</span>
          <span className="font-medium">{formatCurrency(costProjection.totalCost4Years)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monthly savings needed:</span>
          <span className={`font-medium ${savingsTarget.onTrack ? "text-green-600" : "text-orange-600"}`}>
            {formatCurrency(savingsTarget.monthlyContributionNeeded)}/mo
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Funding Progress</span>
            <span>{savingsTarget.percentFunded.toFixed(0)}%</span>
          </div>
          <Progress value={savingsTarget.percentFunded} className="h-2" />
        </div>

        {savingsTarget.onTrack ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>On track to fully fund college!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Gap: {formatCurrency(savingsTarget.gap)} needed</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Main Component ====================

export const CollegePlanner = React.memo(function CollegePlanner() {
  const { config, updateConfig } = usePlanConfig();
  const { childrenAges, numChildren } = usePersonalInfo();

  // Local state
  const [activeTab, setActiveTab] = useState("overview");
  const [stateCode, setStateCode] = useState("NY");
  const [children, setChildren] = useState<Child[]>(() => {
    // Initialize from existing children ages
    if (childrenAges && childrenAges.length > 0) {
      return childrenAges.map((age, index) => ({
        id: `child-${index}`,
        name: `Child ${index + 1}`,
        age,
        schoolType: "public-in-state" as SchoolType,
        current529Balance: 0,
      }));
    }
    return [];
  });

  const [collegeInflationRate, setCollegeInflationRate] = useState(5.5);
  const [expectedReturnRate, setExpectedReturnRate] = useState(7.0);
  const [showRothRollover, setShowRothRollover] = useState(false);
  const [show529ToRothDetails, setShow529ToRothDetails] = useState(false);

  // Derived calculations
  const stateBenefit = STATE_TAX_BENEFITS[stateCode] || STATE_TAX_BENEFITS.DEFAULT;
  const superfunding = calculateSuperfunding();

  const totalProjectedCosts = useMemo(() => {
    return children.reduce((sum, child) => {
      const yearsUntilCollege = Math.max(0, COLLEGE_START_AGE - child.age);
      const projection = calculateCollegeCost(child.schoolType, yearsUntilCollege, collegeInflationRate / 100);
      return sum + projection.totalCost4Years;
    }, 0);
  }, [children, collegeInflationRate]);

  const totalCurrent529Balance = useMemo(() => {
    return children.reduce((sum, child) => sum + child.current529Balance, 0);
  }, [children]);

  const totalMonthlyNeeded = useMemo(() => {
    return children.reduce((sum, child) => {
      const yearsUntilCollege = Math.max(0, COLLEGE_START_AGE - child.age);
      const projection = calculateCollegeCost(child.schoolType, yearsUntilCollege, collegeInflationRate / 100);
      const target = calculateSavingsTarget(
        projection.totalCost4Years,
        child.current529Balance,
        yearsUntilCollege,
        expectedReturnRate / 100
      );
      return sum + target.monthlyContributionNeeded;
    }, 0);
  }, [children, collegeInflationRate, expectedReturnRate]);

  // Handlers
  const addChild = useCallback(() => {
    setChildren((prev) => [
      ...prev,
      {
        id: `child-${Date.now()}`,
        name: `Child ${prev.length + 1}`,
        age: 5,
        schoolType: "public-in-state" as SchoolType,
        current529Balance: 0,
      },
    ]);
  }, []);

  const updateChild = useCallback((id: string, updates: Partial<Child>) => {
    setChildren((prev) =>
      prev.map((child) => (child.id === id ? { ...child, ...updates } : child))
    );
  }, []);

  const removeChild = useCallback((id: string) => {
    setChildren((prev) => prev.filter((child) => child.id !== id));
  }, []);

  // Calculate retirement impact
  const retirementImpact = useMemo(() => {
    // Compare monthly 529 contributions to retirement contributions
    const monthlyRetirementContributions = (
      (config.cPre1 || 0) +
      (config.cPost1 || 0) +
      (config.cPre2 || 0) +
      (config.cPost2 || 0)
    ) / 12;

    const collegeVsRetirementRatio = monthlyRetirementContributions > 0
      ? (totalMonthlyNeeded / monthlyRetirementContributions) * 100
      : 0;

    return {
      monthlyRetirementContributions,
      collegeVsRetirementRatio,
      isBalanced: collegeVsRetirementRatio < 50, // Rule of thumb: college savings < 50% of retirement
    };
  }, [config, totalMonthlyNeeded]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          529 College Savings Planner
        </CardTitle>
        <CardDescription>
          Plan for education costs while protecting your retirement
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="children" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1 hidden sm:inline" />
              Children
            </TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs sm:text-sm">
              <Gift className="h-4 w-4 mr-1 hidden sm:inline" />
              Tax Benefits
            </TabsTrigger>
            <TabsTrigger value="strategies" className="text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 mr-1 hidden sm:inline" />
              Strategies
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total Projected Cost</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(totalProjectedCosts)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {children.length} {children.length === 1 ? "child" : "children"} x 4 years
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                <div className="text-sm text-green-700 dark:text-green-400 mb-1">Current 529 Balance</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(totalCurrent529Balance)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {totalProjectedCosts > 0
                    ? `${((totalCurrent529Balance / totalProjectedCosts) * 100).toFixed(0)}% funded`
                    : "Add children to see progress"}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">Monthly Savings Needed</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(totalMonthlyNeeded)}/mo
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  To fully fund all children
                </div>
              </div>
            </div>

            {/* College Cost Reference */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                2024-25 College Cost Reference
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(COLLEGE_COSTS_2024) as SchoolType[]).map((type) => (
                  <div key={type} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                    <div className="text-sm font-medium">{SCHOOL_TYPE_LABELS[type]}</div>
                    <div className="text-lg font-bold">{formatCurrency(COLLEGE_COSTS_2024[type])}/yr</div>
                    <div className="text-xs text-muted-foreground">Tuition, room & board</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * Costs include tuition, fees, room & board. College costs typically inflate at 5-6% annually.
              </p>
            </div>

            {/* Settings */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Projection Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    College Inflation Rate
                    <Tip text="Historical average is 5-6% per year, higher than general inflation" />
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[collegeInflationRate]}
                      onValueChange={([v]) => setCollegeInflationRate(v)}
                      min={3}
                      max={8}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12">{collegeInflationRate}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Expected 529 Return
                    <Tip text="Long-term average for diversified 529 portfolios" />
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[expectedReturnRate]}
                      onValueChange={([v]) => setExpectedReturnRate(v)}
                      min={4}
                      max={10}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12">{expectedReturnRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Retirement Balance Check */}
            <div className={`border rounded-lg p-4 ${
              retirementImpact.isBalanced
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
            }`}>
              <div className="flex items-start gap-3">
                {retirementImpact.isBalanced ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className={`font-semibold mb-1 ${
                    retirementImpact.isBalanced ? "text-green-900 dark:text-green-100" : "text-amber-900 dark:text-amber-100"
                  }`}>
                    {retirementImpact.isBalanced
                      ? "Retirement-College Balance: Healthy"
                      : "Consider Your Retirement First"}
                  </div>
                  <p className={`text-sm ${
                    retirementImpact.isBalanced ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"
                  }`}>
                    {retirementImpact.isBalanced ? (
                      <>
                        Your college savings ({formatCurrency(totalMonthlyNeeded)}/mo) are {retirementImpact.collegeVsRetirementRatio.toFixed(0)}%
                        of your retirement contributions ({formatCurrency(retirementImpact.monthlyRetirementContributions)}/mo).
                        This is a healthy balance.
                      </>
                    ) : (
                      <>
                        <strong>Don't sacrifice retirement for college.</strong> College savings ({formatCurrency(totalMonthlyNeeded)}/mo)
                        are {retirementImpact.collegeVsRetirementRatio.toFixed(0)}% of retirement contributions.
                        Your child can get loans or scholarships - you can't borrow for retirement.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Children Tab */}
          <TabsContent value="children" className="space-y-6">
            {children.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Children Added</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add your children to project their college costs and savings needs.
                </p>
                <button
                  onClick={addChild}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Add Child
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {children.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      onUpdate={(updated) => updateChild(child.id, updated)}
                      onRemove={() => removeChild(child.id)}
                      stateCode={stateCode}
                    />
                  ))}
                </div>

                <button
                  onClick={addChild}
                  className="w-full py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Add Another Child
                </button>
              </>
            )}
          </TabsContent>

          {/* Tax Benefits Tab */}
          <TabsContent value="benefits" className="space-y-6">
            {/* State Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your State</Label>
                <Select value={stateCode} onValueChange={setStateCode}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="PA">Pennsylvania</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="VA">Virginia</SelectItem>
                    <SelectItem value="CO">Colorado</SelectItem>
                    <SelectItem value="IN">Indiana</SelectItem>
                    <SelectItem value="OH">Ohio</SelectItem>
                    <SelectItem value="AZ">Arizona</SelectItem>
                    <SelectItem value="DEFAULT">Other State</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* State Benefit Card */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">{stateBenefit.state} 529 Tax Benefits</h3>
                </div>

                {stateBenefit.deductionType === "none" ? (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <p className="text-muted-foreground">
                      {stateBenefit.notes}. However, you still benefit from:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Federal tax-free growth
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Tax-free withdrawals for qualified education expenses
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-400">Benefit Type</div>
                        <div className="font-semibold text-green-900 dark:text-green-100 capitalize">
                          {stateBenefit.deductionType === "credit" ? "Tax Credit" : "Tax Deduction"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-400">Annual Limit</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {stateBenefit.deductionLimit
                            ? formatCurrency(stateBenefit.deductionLimit)
                            : "Unlimited"}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {stateBenefit.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Universal 529 Benefits */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Universal 529 Tax Benefits
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Tax-Free Growth</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    All investment gains grow completely tax-free at federal level, regardless of your state.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Tax-Free Withdrawals</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Withdrawals for qualified education expenses (tuition, room, board, books) are tax-free.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">K-12 Tuition</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Up to $10,000/year can be used for K-12 private school tuition (check state rules).
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Minimal FAFSA Impact</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Parent-owned 529s are assessed at only 5.64% for financial aid (vs 20% for student assets).
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-6">
            {/* Superfunding Strategy */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Superfunding (5-Year Gift Tax Election)</h3>
                <Badge variant="outline" className="ml-auto">Advanced</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                The IRS allows you to front-load 5 years of gift tax exclusion into a single 529 contribution,
                enabling accelerated tax-free growth.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                  <div className="text-sm text-purple-700 dark:text-purple-400">Max Single Contributor</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatCurrency(superfunding.maxContribution)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {formatCurrency(superfunding.perYear)} x 5 years
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                  <div className="text-sm text-purple-700 dark:text-purple-400">Married Couple Max</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatCurrency(superfunding.totalWithSpouse)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Both spouses can superfund
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                  <div className="text-sm text-purple-700 dark:text-purple-400">Annual Exclusion (2024)</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatCurrency(ANNUAL_GIFT_TAX_EXCLUSION)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Per recipient per year
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Important Considerations
                    </div>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                      <li>Must file IRS Form 709 to elect 5-year averaging</li>
                      <li>No additional gifts to that beneficiary for 5 years</li>
                      <li>If donor dies during 5-year period, portion may be included in estate</li>
                      <li>Great for grandparents looking to reduce estate tax exposure</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 529 to Roth IRA Rollover (SECURE 2.0) */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">529 to Roth IRA Rollover</h3>
                <Badge className="bg-green-100 text-green-700 border-green-200 ml-auto">
                  SECURE 2.0 - New!
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Starting in 2024, unused 529 funds can be rolled over to a Roth IRA for the beneficiary,
                eliminating concerns about overfunding.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                  <div className="text-sm text-green-700 dark:text-green-400">Lifetime Limit</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(ROTH_ROLLOVER_LIFETIME_LIMIT)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Per beneficiary
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                  <div className="text-sm text-green-700 dark:text-green-400">Annual Limit</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(ROTH_ROLLOVER_ANNUAL_LIMIT)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Subject to Roth IRA limit
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                  <div className="text-sm text-green-700 dark:text-green-400">Account Age Required</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {ROTH_ROLLOVER_ACCOUNT_AGE_REQUIREMENT} years
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    529 must be open this long
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShow529ToRothDetails(!show529ToRothDetails)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Info className="h-4 w-4" />
                {show529ToRothDetails ? "Hide" : "Show"} detailed requirements
              </button>

              {show529ToRothDetails && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">529-to-Roth IRA Rollover Requirements:</h4>
                  <ul className="text-sm space-y-2 list-disc list-inside">
                    <li>The 529 account must have been open for at least <strong>15 years</strong></li>
                    <li>Contributions made in the last 5 years (and their earnings) are <strong>not eligible</strong></li>
                    <li>Rollovers count against the beneficiary's <strong>annual Roth IRA contribution limit</strong></li>
                    <li>The beneficiary must have <strong>earned income</strong> equal to or greater than the rollover amount</li>
                    <li><strong>Lifetime cap of $35,000</strong> per beneficiary (not indexed for inflation)</li>
                    <li>Rollover must be done as a <strong>trustee-to-trustee transfer</strong></li>
                  </ul>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Pro Tip:</strong> Open a 529 account when your child is born (even with $50)
                        to start the 15-year clock early. This gives maximum flexibility for 529-to-Roth rollovers later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Aid Impact */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Financial Aid Impact (FAFSA)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Parent-Owned 529 (Best)
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Assessed at only <strong>5.64%</strong> of the account value for EFC calculation.
                    This is the same rate as other parental assets.
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Student-Owned 529
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Assessed at <strong>20%</strong> of the account value. Student assets have a higher
                    impact on financial aid eligibility.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Grandparent-Owned 529s (Updated Rules)
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      As of the 2024-25 FAFSA, grandparent-owned 529 distributions are <strong>no longer counted
                      as student income</strong>. This is a major improvement - grandparents can now help
                      without hurting financial aid eligibility.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Retirement Integration Warning */}
            <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Don't Sacrifice Retirement for College
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    This is the #1 financial mistake parents make. Your children can:
                  </p>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>Get scholarships and grants (free money)</li>
                    <li>Work part-time during school</li>
                    <li>Take out student loans at favorable rates</li>
                    <li>Choose more affordable schools</li>
                    <li>Start at community college then transfer</li>
                  </ul>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-3 font-medium">
                    You cannot borrow for retirement. Prioritize your 401(k) and IRA contributions first,
                    especially if you get an employer match.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

CollegePlanner.displayName = "CollegePlanner";

export default CollegePlanner;

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Users,
  User,
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Calendar,
  DollarSign,
  Scale,
  HeartHandshake,
  UserMinus,
  Clock,
  Briefcase,
  Home,
  PiggyBank,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = "his" | "hers" | "ours" | "combined";

export type EmploymentStatus =
  | "working-full-time"
  | "working-part-time"
  | "self-employed"
  | "homemaker"
  | "retired"
  | "disabled";

export interface PartnerProfile {
  name: string;
  age: number;
  retirementAge: number;
  lifeExpectancy: number;
  employmentStatus: EmploymentStatus;
  income: number;
  socialSecurityBenefit: number;
  ssClaimAge: number;
  pensionBenefit?: number;
  pensionStartAge?: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  annualContributions: number;
  employerMatch: number;
}

export interface CouplesData {
  partner1: PartnerProfile;
  partner2: PartnerProfile;
  jointAssets: {
    taxableBalance: number;
    realEstateEquity: number;
    otherAssets: number;
    jointDebts: number;
  };
  plannedExpenses: {
    housing: number;
    healthcare: number;
    travel: number;
    other: number;
  };
  assumptions: {
    inflationRate: number;
    returnRate: number;
    stateRate: number;
    survivorExpenseReduction: number; // % reduction when one spouse passes
  };
}

export interface SurvivorScenario {
  survivingPartner: "partner1" | "partner2";
  survivorAge: number;
  yearsAlone: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  portfolioAtSurvivorAge: number;
  successProbability: number;
  shortfallRisk: number;
  recommendations: string[];
}

export interface DivorceScenario {
  partner: "partner1" | "partner2";
  assetSplit: number; // percentage
  retirementReadiness: number;
  yearsToRetirement: number;
  monthlyShortfall: number;
  recommendations: string[];
}

export interface AgeGapAnalysis {
  ageGap: number;
  youngerPartner: "partner1" | "partner2";
  yearsOfOverlap: number;
  bridgeYears: number;
  bridgeIncome: number;
  recommendations: string[];
}

export interface BeneficiaryOptimization {
  accountType: string;
  currentBeneficiary: string;
  recommendedBeneficiary: string;
  taxImplications: string;
  recommendation: string;
}

interface PartnerModeProps {
  data?: CouplesData;
  onDataChange?: (data: CouplesData) => void;
  className?: string;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const defaultCouplesData: CouplesData = {
  partner1: {
    name: "Partner 1",
    age: 55,
    retirementAge: 65,
    lifeExpectancy: 87,
    employmentStatus: "working-full-time",
    income: 120000,
    socialSecurityBenefit: 2800,
    ssClaimAge: 67,
    taxableBalance: 200000,
    pretaxBalance: 500000,
    rothBalance: 100000,
    annualContributions: 23000,
    employerMatch: 6900,
  },
  partner2: {
    name: "Partner 2",
    age: 52,
    retirementAge: 65,
    lifeExpectancy: 90,
    employmentStatus: "working-part-time",
    income: 45000,
    socialSecurityBenefit: 1600,
    ssClaimAge: 67,
    taxableBalance: 50000,
    pretaxBalance: 150000,
    rothBalance: 50000,
    annualContributions: 10000,
    employerMatch: 2250,
  },
  jointAssets: {
    taxableBalance: 100000,
    realEstateEquity: 350000,
    otherAssets: 50000,
    jointDebts: 180000,
  },
  plannedExpenses: {
    housing: 2500,
    healthcare: 1200,
    travel: 800,
    other: 2000,
  },
  assumptions: {
    inflationRate: 0.025,
    returnRate: 0.06,
    stateRate: 0.05,
    survivorExpenseReduction: 0.25,
  },
};

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

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

function calculateTotalAssets(data: CouplesData, view: ViewMode): number {
  const p1Total =
    data.partner1.taxableBalance +
    data.partner1.pretaxBalance +
    data.partner1.rothBalance;
  const p2Total =
    data.partner2.taxableBalance +
    data.partner2.pretaxBalance +
    data.partner2.rothBalance;
  const jointTotal =
    data.jointAssets.taxableBalance +
    data.jointAssets.realEstateEquity +
    data.jointAssets.otherAssets -
    data.jointAssets.jointDebts;

  switch (view) {
    case "his":
      return p1Total + jointTotal / 2;
    case "hers":
      return p2Total + jointTotal / 2;
    case "ours":
      return jointTotal;
    case "combined":
    default:
      return p1Total + p2Total + jointTotal;
  }
}

function calculateMonthlyIncome(data: CouplesData, view: ViewMode): number {
  const p1Income = data.partner1.income / 12;
  const p2Income = data.partner2.income / 12;

  switch (view) {
    case "his":
      return p1Income;
    case "hers":
      return p2Income;
    case "ours":
      return 0; // Joint assets don't generate "income" in this context
    case "combined":
    default:
      return p1Income + p2Income;
  }
}

function calculateRetirementIncome(
  data: CouplesData,
  view: ViewMode
): number {
  const p1SS = data.partner1.socialSecurityBenefit;
  const p1Pension = data.partner1.pensionBenefit || 0;
  const p2SS = data.partner2.socialSecurityBenefit;
  const p2Pension = data.partner2.pensionBenefit || 0;

  switch (view) {
    case "his":
      return p1SS + p1Pension;
    case "hers":
      return p2SS + p2Pension;
    case "ours":
      return 0;
    case "combined":
    default:
      return p1SS + p1Pension + p2SS + p2Pension;
  }
}

function calculateSurvivorScenarios(data: CouplesData): SurvivorScenario[] {
  const scenarios: SurvivorScenario[] = [];
  const monthlyExpenses =
    data.plannedExpenses.housing +
    data.plannedExpenses.healthcare +
    data.plannedExpenses.travel +
    data.plannedExpenses.other;

  // Partner 1 survives (Partner 2 passes at their life expectancy)
  const p2PassAge = data.partner2.lifeExpectancy;
  const p1AgeAtP2Pass = data.partner1.age + (p2PassAge - data.partner2.age);
  const p1YearsAlone = Math.max(0, data.partner1.lifeExpectancy - p1AgeAtP2Pass);

  // Survivor benefits: higher of own or 100% of deceased spouse's
  const p1SurvivorSS = Math.max(
    data.partner1.socialSecurityBenefit,
    data.partner2.socialSecurityBenefit
  );
  const p1SurvivorPension = data.partner1.pensionBenefit || 0;
  const survivorExpenses =
    monthlyExpenses * (1 - data.assumptions.survivorExpenseReduction);

  // Estimate portfolio at survivor age (simplified)
  const yearsToSurvivor = p1AgeAtP2Pass - data.partner1.age;
  const totalAssets = calculateTotalAssets(data, "combined");
  const annualContributions =
    data.partner1.annualContributions +
    data.partner1.employerMatch +
    data.partner2.annualContributions +
    data.partner2.employerMatch;

  let portfolioAtSurvivor = totalAssets;
  for (let i = 0; i < yearsToSurvivor; i++) {
    portfolioAtSurvivor =
      portfolioAtSurvivor * (1 + data.assumptions.returnRate) +
      annualContributions;
  }

  const p1MonthlyIncome = p1SurvivorSS + p1SurvivorPension;
  const p1MonthlyGap = survivorExpenses - p1MonthlyIncome;
  const p1AnnualWithdrawal = Math.max(0, p1MonthlyGap * 12);
  const p1SuccessProbability =
    portfolioAtSurvivor / 25 >= p1AnnualWithdrawal ? 0.95 : 0.7;

  scenarios.push({
    survivingPartner: "partner1",
    survivorAge: p1AgeAtP2Pass,
    yearsAlone: p1YearsAlone,
    monthlyIncome: p1MonthlyIncome,
    monthlyExpenses: survivorExpenses,
    portfolioAtSurvivorAge: portfolioAtSurvivor,
    successProbability: p1SuccessProbability,
    shortfallRisk: p1MonthlyGap > 0 ? p1MonthlyGap : 0,
    recommendations:
      p1MonthlyGap > 0
        ? [
            "Consider life insurance on Partner 2",
            "Review survivor benefit elections on pensions",
            "Evaluate delaying Social Security claiming",
          ]
        : ["Current plan provides adequate survivor protection"],
  });

  // Partner 2 survives (Partner 1 passes at their life expectancy)
  const p1PassAge = data.partner1.lifeExpectancy;
  const p2AgeAtP1Pass = data.partner2.age + (p1PassAge - data.partner1.age);
  const p2YearsAlone = Math.max(0, data.partner2.lifeExpectancy - p2AgeAtP1Pass);

  const p2SurvivorSS = Math.max(
    data.partner2.socialSecurityBenefit,
    data.partner1.socialSecurityBenefit
  );
  const p2SurvivorPension = data.partner2.pensionBenefit || 0;

  const p2MonthlyIncome = p2SurvivorSS + p2SurvivorPension;
  const p2MonthlyGap = survivorExpenses - p2MonthlyIncome;
  const p2SuccessProbability =
    portfolioAtSurvivor / 25 >= Math.max(0, p2MonthlyGap * 12) ? 0.95 : 0.7;

  scenarios.push({
    survivingPartner: "partner2",
    survivorAge: p2AgeAtP1Pass,
    yearsAlone: p2YearsAlone,
    monthlyIncome: p2MonthlyIncome,
    monthlyExpenses: survivorExpenses,
    portfolioAtSurvivorAge: portfolioAtSurvivor,
    successProbability: p2SuccessProbability,
    shortfallRisk: p2MonthlyGap > 0 ? p2MonthlyGap : 0,
    recommendations:
      p2MonthlyGap > 0
        ? [
            "Consider life insurance on Partner 1",
            "Maximize Social Security benefits",
            "Build individual emergency fund for Partner 2",
          ]
        : ["Current plan provides adequate survivor protection"],
  });

  return scenarios;
}

function calculateDivorceScenarios(data: CouplesData): DivorceScenario[] {
  const totalAssets = calculateTotalAssets(data, "combined");
  const scenarios: DivorceScenario[] = [];

  // Partner 1 divorce scenario (50/50 split)
  const p1Assets =
    data.partner1.taxableBalance +
    data.partner1.pretaxBalance +
    data.partner1.rothBalance;
  const p1Share = p1Assets + (totalAssets - p1Assets - calculateTotalAssets(data, "hers")) / 2;
  const p1RetirementNeed =
    (data.partner1.retirementAge - data.partner1.age) *
    data.partner1.annualContributions;
  const p1Readiness = Math.min(100, (p1Share / (p1RetirementNeed * 25)) * 100);

  scenarios.push({
    partner: "partner1",
    assetSplit: 50,
    retirementReadiness: p1Readiness,
    yearsToRetirement: data.partner1.retirementAge - data.partner1.age,
    monthlyShortfall:
      p1Readiness < 80
        ? (((80 - p1Readiness) / 100) * p1RetirementNeed * 25) / 12 / 10
        : 0,
    recommendations:
      p1Readiness < 80
        ? [
            "Increase retirement contributions",
            "Consider delaying retirement",
            "Review post-divorce budget carefully",
          ]
        : ["Financial position remains strong after divorce"],
  });

  // Partner 2 divorce scenario
  const p2Assets =
    data.partner2.taxableBalance +
    data.partner2.pretaxBalance +
    data.partner2.rothBalance;
  const p2Share = p2Assets + (totalAssets - p2Assets - p1Assets) / 2;
  const p2RetirementNeed =
    (data.partner2.retirementAge - data.partner2.age) *
    data.partner2.annualContributions;
  const p2Readiness = Math.min(100, (p2Share / (p2RetirementNeed * 25)) * 100);

  scenarios.push({
    partner: "partner2",
    assetSplit: 50,
    retirementReadiness: p2Readiness,
    yearsToRetirement: data.partner2.retirementAge - data.partner2.age,
    monthlyShortfall:
      p2Readiness < 80
        ? (((80 - p2Readiness) / 100) * p2RetirementNeed * 25) / 12 / 10
        : 0,
    recommendations:
      p2Readiness < 80
        ? [
            "Consider returning to full-time work",
            "Maximize catch-up contributions",
            "Explore spousal IRA contributions now",
          ]
        : ["Financial position adequate after divorce"],
  });

  return scenarios;
}

function calculateAgeGapAnalysis(data: CouplesData): AgeGapAnalysis {
  const ageGap = Math.abs(data.partner1.age - data.partner2.age);
  const youngerPartner =
    data.partner1.age < data.partner2.age ? "partner1" : "partner2";
  const olderPartner = youngerPartner === "partner1" ? "partner2" : "partner1";

  const olderData = data[olderPartner];
  const youngerData = data[youngerPartner];

  // Years of overlapping retirement
  const olderRetirementStart = olderData.retirementAge;
  const youngerRetirementStart = youngerData.retirementAge;
  const olderLifeEnd = olderData.lifeExpectancy;

  const yearsOfOverlap = Math.max(
    0,
    Math.min(olderLifeEnd, youngerData.lifeExpectancy) -
      Math.max(olderRetirementStart, youngerRetirementStart)
  );

  // Bridge years: when older partner retires but younger is still working
  const bridgeYears = Math.max(
    0,
    youngerRetirementStart - olderRetirementStart - ageGap
  );

  // Bridge income: younger partner's income during bridge years
  const bridgeIncome = bridgeYears > 0 ? youngerData.income : 0;

  const recommendations: string[] = [];

  if (ageGap > 5) {
    recommendations.push(
      "Consider health insurance coverage gap when older partner reaches Medicare"
    );
    recommendations.push(
      "Plan for potentially longer survivor period for younger partner"
    );
  }

  if (bridgeYears > 0) {
    recommendations.push(
      `Plan for ${bridgeYears} years when one partner is retired and one is working`
    );
    recommendations.push("Consider healthcare coverage during bridge period");
  }

  if (yearsOfOverlap < 15) {
    recommendations.push(
      "Limited joint retirement years - prioritize shared experiences"
    );
  }

  if (youngerPartner === "partner2" && youngerData.income < olderData.income * 0.5) {
    recommendations.push(
      "Consider maximizing spousal Social Security benefits"
    );
  }

  return {
    ageGap,
    youngerPartner,
    yearsOfOverlap,
    bridgeYears,
    bridgeIncome,
    recommendations,
  };
}

function calculateBeneficiaryOptimizations(
  data: CouplesData
): BeneficiaryOptimization[] {
  const optimizations: BeneficiaryOptimization[] = [];

  // Pre-tax accounts (401k, Traditional IRA)
  optimizations.push({
    accountType: "Pre-tax Retirement Accounts (401k/IRA)",
    currentBeneficiary: "Spouse",
    recommendedBeneficiary: "Spouse",
    taxImplications:
      "Spouse can roll over to own IRA, take RMDs based on their own age",
    recommendation:
      "Keep spouse as primary beneficiary for maximum flexibility and tax efficiency",
  });

  // Roth accounts
  optimizations.push({
    accountType: "Roth IRA Accounts",
    currentBeneficiary: "Spouse",
    recommendedBeneficiary:
      data.partner1.rothBalance + data.partner2.rothBalance > 500000
        ? "Consider trust structure"
        : "Spouse",
    taxImplications:
      "Spouse inherits tax-free growth; can treat as own Roth IRA",
    recommendation:
      data.partner1.rothBalance + data.partner2.rothBalance > 500000
        ? "Large Roth balance may benefit from trust for multi-generational planning"
        : "Standard spousal beneficiary is optimal for tax-free inheritance",
  });

  // Taxable accounts
  optimizations.push({
    accountType: "Taxable Brokerage Accounts",
    currentBeneficiary: "Spouse (joint ownership)",
    recommendedBeneficiary: "Spouse (TOD registration)",
    taxImplications:
      "Step-up in cost basis at death; no estate tax under exemption",
    recommendation:
      "Ensure accounts have TOD (Transfer on Death) registration to avoid probate",
  });

  // Life insurance
  optimizations.push({
    accountType: "Life Insurance Policies",
    currentBeneficiary: "Spouse",
    recommendedBeneficiary:
      calculateTotalAssets(data, "combined") > 10000000
        ? "Irrevocable Life Insurance Trust (ILIT)"
        : "Spouse",
    taxImplications:
      "Death benefit is income tax-free; may be included in estate for estate tax",
    recommendation:
      calculateTotalAssets(data, "combined") > 10000000
        ? "Consider ILIT to remove from taxable estate"
        : "Standard spousal beneficiary is appropriate",
  });

  // Real estate
  if (data.jointAssets.realEstateEquity > 0) {
    optimizations.push({
      accountType: "Real Estate",
      currentBeneficiary: "Joint ownership",
      recommendedBeneficiary: "Joint tenancy with right of survivorship",
      taxImplications:
        "Automatic transfer to survivor; step-up on deceased's share",
      recommendation:
        "Verify title is held as joint tenants with right of survivorship",
    });
  }

  return optimizations;
}

function getWorkingSpouseAnalysis(
  data: CouplesData
): {
  workingPartner: "partner1" | "partner2" | "both";
  nonWorkingPartner: "partner1" | "partner2" | null;
  spousalIRAEligibility: boolean;
  spousalSSBenefits: boolean;
  recommendations: string[];
} {
  const p1Working =
    data.partner1.employmentStatus === "working-full-time" ||
    data.partner1.employmentStatus === "working-part-time" ||
    data.partner1.employmentStatus === "self-employed";
  const p2Working =
    data.partner2.employmentStatus === "working-full-time" ||
    data.partner2.employmentStatus === "working-part-time" ||
    data.partner2.employmentStatus === "self-employed";

  const workingPartner = p1Working && p2Working ? "both" : p1Working ? "partner1" : "partner2";
  const nonWorkingPartner =
    workingPartner === "both" ? null : workingPartner === "partner1" ? "partner2" : "partner1";

  const recommendations: string[] = [];

  if (nonWorkingPartner) {
    recommendations.push(
      `Contribute to a Spousal IRA for ${data[nonWorkingPartner].name}`
    );
    recommendations.push("Maximize Social Security credits for the non-working spouse");
    recommendations.push(
      "Consider the non-working spouse returning to part-time work to boost SS benefits"
    );
  }

  // Spousal SS benefits if one spouse earned significantly less
  const higherEarner =
    data.partner1.socialSecurityBenefit > data.partner2.socialSecurityBenefit
      ? data.partner1
      : data.partner2;
  const lowerEarner =
    higherEarner === data.partner1 ? data.partner2 : data.partner1;

  const spousalBenefitAmount = higherEarner.socialSecurityBenefit * 0.5;
  const spousalSSBenefits =
    spousalBenefitAmount > lowerEarner.socialSecurityBenefit;

  if (spousalSSBenefits) {
    recommendations.push(
      `${lowerEarner.name} may qualify for spousal benefits of ${formatCurrency(spousalBenefitAmount)}/mo`
    );
  }

  return {
    workingPartner,
    nonWorkingPartner,
    spousalIRAEligibility: nonWorkingPartner !== null,
    spousalSSBenefits,
    recommendations,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PartnerMode({
  data = defaultCouplesData,
  onDataChange: _onDataChange,
  className,
}: PartnerModeProps) {
  // Note: _onDataChange is available for future use when editing partner data
  void _onDataChange;
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const [showCombinedProjection, setShowCombinedProjection] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"])
  );

  // Memoized calculations
  const totalAssets = useMemo(
    () => calculateTotalAssets(data, viewMode),
    [data, viewMode]
  );
  const monthlyIncome = useMemo(
    () => calculateMonthlyIncome(data, viewMode),
    [data, viewMode]
  );
  const retirementIncome = useMemo(
    () => calculateRetirementIncome(data, viewMode),
    [data, viewMode]
  );
  const survivorScenarios = useMemo(
    () => calculateSurvivorScenarios(data),
    [data]
  );
  const divorceScenarios = useMemo(
    () => calculateDivorceScenarios(data),
    [data]
  );
  const ageGapAnalysis = useMemo(() => calculateAgeGapAnalysis(data), [data]);
  const beneficiaryOptimizations = useMemo(
    () => calculateBeneficiaryOptimizations(data),
    [data]
  );
  const workingSpouseAnalysis = useMemo(
    () => getWorkingSpouseAnalysis(data),
    [data]
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

  const viewModeColors = {
    his: "blue",
    hers: "pink",
    ours: "purple",
    combined: "green",
  };

  // viewModeColors available for future dynamic styling
  void viewModeColors;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with View Toggle */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-8 w-8 text-purple-600" />
              <div>
                <CardTitle className="text-2xl">Couples Planning Mode</CardTitle>
                <CardDescription>
                  Plan your retirement together effectively
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-sm px-3 py-1 border-purple-300"
            >
              <Users className="h-4 w-4 mr-1" />
              Married Filing Jointly
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* View Mode Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">View Perspective:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("his")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "his"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border"
                  )}
                >
                  <User className="h-4 w-4 inline mr-1" />
                  {data.partner1.name}
                </button>
                <button
                  onClick={() => setViewMode("hers")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "hers"
                      ? "bg-pink-600 text-white shadow-md"
                      : "bg-white dark:bg-neutral-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 border"
                  )}
                >
                  <User className="h-4 w-4 inline mr-1" />
                  {data.partner2.name}
                </button>
                <button
                  onClick={() => setViewMode("ours")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "ours"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white dark:bg-neutral-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border"
                  )}
                >
                  <Heart className="h-4 w-4 inline mr-1" />
                  Joint Only
                </button>
                <button
                  onClick={() => setViewMode("combined")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "combined"
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-white dark:bg-neutral-800 hover:bg-green-50 dark:hover:bg-green-900/20 border"
                  )}
                >
                  <Users className="h-4 w-4 inline mr-1" />
                  Combined
                </button>
              </div>
            </div>

            {/* Combined vs Separate Toggle */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 rounded-lg border">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Show Combined Projections</span>
              </div>
              <Switch
                checked={showCombinedProjection}
                onCheckedChange={setShowCombinedProjection}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={cn(
            "border-2",
            viewMode === "his" && "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",
            viewMode === "hers" && "border-pink-200 bg-pink-50/50 dark:bg-pink-950/20",
            viewMode === "ours" && "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20",
            viewMode === "combined" && "border-green-200 bg-green-50/50 dark:bg-green-950/20"
          )}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Assets ({viewMode === "combined" ? "Combined" : viewMode})
              </span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Monthly Income
              </span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(monthlyIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Est. Retirement Income
              </span>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(retirementIncome)}/mo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Age Gap Planning */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("ageGap")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-600" />
              <div>
                <CardTitle>Age Gap Planning</CardTitle>
                <CardDescription>
                  {ageGapAnalysis.ageGap} year age difference
                </CardDescription>
              </div>
            </div>
            {expandedSections.has("ageGap") ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("ageGap") && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                <p className="text-sm text-muted-foreground">
                  Joint Retirement Years
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  {ageGapAnalysis.yearsOfOverlap} years
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <p className="text-sm text-muted-foreground">Bridge Period</p>
                <p className="text-2xl font-bold text-blue-700">
                  {ageGapAnalysis.bridgeYears} years
                </p>
                <p className="text-xs text-muted-foreground">
                  One retired, one working
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <p className="text-sm text-muted-foreground">
                  Bridge Income Available
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(ageGapAnalysis.bridgeIncome)}/yr
                </p>
              </div>
            </div>

            {ageGapAnalysis.recommendations.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {ageGapAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600">-</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Working vs Non-Working Spouse */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("workingSpouse")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Working vs Non-Working Spouse</CardTitle>
                <CardDescription>
                  {workingSpouseAnalysis.workingPartner === "both"
                    ? "Both partners are working"
                    : `${data[workingSpouseAnalysis.workingPartner].name} is the primary earner`}
                </CardDescription>
              </div>
            </div>
            {expandedSections.has("workingSpouse") ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("workingSpouse") && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Partner 1 Status */}
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  data.partner1.employmentStatus.includes("working")
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                    : "bg-gray-50 dark:bg-gray-950/20 border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{data.partner1.name}</span>
                  <Badge
                    variant={
                      data.partner1.employmentStatus.includes("working")
                        ? "default"
                        : "secondary"
                    }
                  >
                    {data.partner1.employmentStatus.replace("-", " ")}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.partner1.income)}/yr
                </p>
                <p className="text-sm text-muted-foreground">
                  SS Benefit: {formatCurrency(data.partner1.socialSecurityBenefit)}/mo
                </p>
              </div>

              {/* Partner 2 Status */}
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  data.partner2.employmentStatus.includes("working")
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                    : "bg-gray-50 dark:bg-gray-950/20 border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{data.partner2.name}</span>
                  <Badge
                    variant={
                      data.partner2.employmentStatus.includes("working")
                        ? "default"
                        : "secondary"
                    }
                  >
                    {data.partner2.employmentStatus.replace("-", " ")}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.partner2.income)}/yr
                </p>
                <p className="text-sm text-muted-foreground">
                  SS Benefit: {formatCurrency(data.partner2.socialSecurityBenefit)}/mo
                </p>
              </div>
            </div>

            {/* Spousal Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  workingSpouseAnalysis.spousalIRAEligibility
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Spousal IRA Eligibility</span>
                </div>
                <p className="text-sm">
                  {workingSpouseAnalysis.spousalIRAEligibility
                    ? "Eligible - Non-working spouse can contribute up to $7,000/yr ($8,000 if 50+)"
                    : "Not applicable - both spouses are working"}
                </p>
              </div>

              <div
                className={cn(
                  "p-4 rounded-lg border",
                  workingSpouseAnalysis.spousalSSBenefits
                    ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Spousal SS Benefits</span>
                </div>
                <p className="text-sm">
                  {workingSpouseAnalysis.spousalSSBenefits
                    ? "Lower-earning spouse may claim up to 50% of higher earner's benefit"
                    : "Individual benefits exceed spousal benefit amount"}
                </p>
              </div>
            </div>

            {workingSpouseAnalysis.recommendations.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {workingSpouseAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-blue-600">-</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Survivor Scenarios */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("survivor")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-600" />
              <div>
                <CardTitle>Survivor Scenarios</CardTitle>
                <CardDescription>
                  What happens if one partner passes?
                </CardDescription>
              </div>
            </div>
            {expandedSections.has("survivor") ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("survivor") && (
          <CardContent className="space-y-6">
            {survivorScenarios.map((scenario, idx) => {
              const partner =
                scenario.survivingPartner === "partner1"
                  ? data.partner1
                  : data.partner2;

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border",
                    scenario.successProbability >= 0.9
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                      : scenario.successProbability >= 0.75
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">
                      If {partner.name} Survives
                    </h4>
                    <Badge
                      variant={
                        scenario.successProbability >= 0.9
                          ? "default"
                          : scenario.successProbability >= 0.75
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {formatPercent(scenario.successProbability)} Success Rate
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Survivor Age
                      </p>
                      <p className="font-medium">{scenario.survivorAge}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Years Alone
                      </p>
                      <p className="font-medium">{scenario.yearsAlone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Monthly Income
                      </p>
                      <p className="font-medium">
                        {formatCurrency(scenario.monthlyIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Monthly Expenses
                      </p>
                      <p className="font-medium">
                        {formatCurrency(scenario.monthlyExpenses)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Income Coverage</span>
                      <span>
                        {formatPercent(
                          scenario.monthlyIncome / scenario.monthlyExpenses
                        )}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (scenario.monthlyIncome / scenario.monthlyExpenses) * 100
                      )}
                      className="h-2"
                    />
                  </div>

                  {scenario.shortfallRisk > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm mb-4">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>
                        Monthly shortfall of{" "}
                        {formatCurrency(scenario.shortfallRisk)} would need to
                        come from portfolio
                      </span>
                    </div>
                  )}

                  <div className="text-sm space-y-1">
                    {scenario.recommendations.map((rec, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600">-</span>
                        {rec}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Beneficiary Optimization */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("beneficiary")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-600" />
              <div>
                <CardTitle>Beneficiary Optimization</CardTitle>
                <CardDescription>
                  Maximize tax efficiency for your heirs
                </CardDescription>
              </div>
            </div>
            {expandedSections.has("beneficiary") ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("beneficiary") && (
          <CardContent className="space-y-4">
            {beneficiaryOptimizations.map((opt, idx) => (
              <div
                key={idx}
                className="p-4 bg-muted/30 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{opt.accountType}</h4>
                  <Badge
                    variant={
                      opt.currentBeneficiary === opt.recommendedBeneficiary
                        ? "default"
                        : "outline"
                    }
                  >
                    {opt.currentBeneficiary === opt.recommendedBeneficiary
                      ? "Optimal"
                      : "Review Needed"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Beneficiary</p>
                    <p className="font-medium">{opt.currentBeneficiary}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Recommended Beneficiary
                    </p>
                    <p className="font-medium">{opt.recommendedBeneficiary}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Tax Implications</p>
                  <p>{opt.taxImplications}</p>
                </div>

                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded text-sm">
                  <span className="font-medium">Recommendation:</span>{" "}
                  {opt.recommendation}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Divorce Scenario Planning */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("divorce")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserMinus className="h-6 w-6 text-gray-600" />
              <div>
                <CardTitle>Divorce Scenario Planning</CardTitle>
                <CardDescription>
                  What-if analysis for financial independence
                </CardDescription>
              </div>
            </div>
            {expandedSections.has("divorce") ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.has("divorce") && (
          <CardContent className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                This analysis is for planning purposes only. Actual divorce
                settlements depend on many factors including state laws, length
                of marriage, and legal representation.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {divorceScenarios.map((scenario, idx) => {
                const partner =
                  scenario.partner === "partner1"
                    ? data.partner1
                    : data.partner2;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-lg border",
                      scenario.retirementReadiness >= 80
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                        : scenario.retirementReadiness >= 60
                        ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200"
                    )}
                  >
                    <h4 className="font-semibold mb-3">{partner.name}</h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Retirement Readiness</span>
                          <span
                            className={cn(
                              "font-medium",
                              scenario.retirementReadiness >= 80
                                ? "text-green-600"
                                : scenario.retirementReadiness >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            )}
                          >
                            {scenario.retirementReadiness.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={scenario.retirementReadiness}
                          className="h-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Asset Split</p>
                          <p className="font-medium">{scenario.assetSplit}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Years to Retirement
                          </p>
                          <p className="font-medium">
                            {scenario.yearsToRetirement}
                          </p>
                        </div>
                      </div>

                      {scenario.monthlyShortfall > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span>
                            Additional {formatCurrency(scenario.monthlyShortfall)}
                            /mo savings needed
                          </span>
                        </div>
                      )}

                      <div className="text-sm space-y-1">
                        {scenario.recommendations.slice(0, 2).map((rec, i) => (
                          <p key={i} className="flex items-start gap-2">
                            <span className="text-gray-600">-</span>
                            {rec}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Combined vs Separate Projections */}
      {showCombinedProjection && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle>Combined Retirement Projection</CardTitle>
                <CardDescription>
                  Joint financial trajectory over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Timeline Overview */}
              <div className="relative">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full"
                    style={{
                      width: `${
                        ((Math.min(
                          data.partner1.retirementAge,
                          data.partner2.retirementAge
                        ) -
                          Math.max(data.partner1.age, data.partner2.age)) /
                          (95 - Math.max(data.partner1.age, data.partner2.age))) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Today</span>
                  <span>First Retirement</span>
                  <span>Both Retired</span>
                  <span>Age 95</span>
                </div>
              </div>

              {/* Key Milestones */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs text-muted-foreground">
                    {data.partner1.name} Retires
                  </p>
                  <p className="font-bold">Age {data.partner1.retirementAge}</p>
                </div>
                <div className="p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-pink-600" />
                  <p className="text-xs text-muted-foreground">
                    {data.partner2.name} Retires
                  </p>
                  <p className="font-bold">Age {data.partner2.retirementAge}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-xs text-muted-foreground">Combined SS</p>
                  <p className="font-bold">
                    {formatCurrency(
                      data.partner1.socialSecurityBenefit +
                        data.partner2.socialSecurityBenefit
                    )}
                    /mo
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 text-center">
                  <Home className="h-5 w-5 mx-auto mb-1 text-green-600" />
                  <p className="text-xs text-muted-foreground">
                    Monthly Expenses
                  </p>
                  <p className="font-bold">
                    {formatCurrency(
                      data.plannedExpenses.housing +
                        data.plannedExpenses.healthcare +
                        data.plannedExpenses.travel +
                        data.plannedExpenses.other
                    )}
                  </p>
                </div>
              </div>

              {/* Account Type Breakdown */}
              <div>
                <h4 className="font-semibold mb-3">Combined Portfolio Breakdown</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taxable Accounts</span>
                      <span>
                        {formatCurrency(
                          data.partner1.taxableBalance +
                            data.partner2.taxableBalance +
                            data.jointAssets.taxableBalance
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            ((data.partner1.taxableBalance +
                              data.partner2.taxableBalance +
                              data.jointAssets.taxableBalance) /
                              totalAssets) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Pre-Tax (401k/IRA)</span>
                      <span>
                        {formatCurrency(
                          data.partner1.pretaxBalance + data.partner2.pretaxBalance
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${
                            ((data.partner1.pretaxBalance +
                              data.partner2.pretaxBalance) /
                              totalAssets) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Roth Accounts</span>
                      <span>
                        {formatCurrency(
                          data.partner1.rothBalance + data.partner2.rothBalance
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${
                            ((data.partner1.rothBalance +
                              data.partner2.rothBalance) /
                              totalAssets) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Real Estate Equity</span>
                      <span>
                        {formatCurrency(data.jointAssets.realEstateEquity)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${
                            (data.jointAssets.realEstateEquity / totalAssets) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Note */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        <p>
          All projections are estimates based on the information provided. Actual
          results will vary based on market performance, tax law changes, and
          personal circumstances. Consider consulting with a financial advisor for
          personalized advice.
        </p>
      </div>
    </div>
  );
}

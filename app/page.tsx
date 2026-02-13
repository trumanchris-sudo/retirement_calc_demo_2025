"use client"

import React, { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
// Static imports for lightweight recharts components used everywhere
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Pie,
  Cell,
  Rectangle,
} from "recharts";

// Lazy load heavy chart components
const LineChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.LineChart })),
  { ssr: false }
);
const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ComposedChart })),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.PieChart })),
  { ssr: false }
);
const Sankey = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.Sankey })),
  { ssr: false }
);
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FlippingCard } from "@/components/FlippingCard";
import { GenerationalResultCard } from "@/components/GenerationalResultCard";
import { LegacyResultCard } from "@/components/LegacyResultCard";
// Lazy load DynastyTimeline - only needed in generational wealth section
const DynastyTimeline = dynamic(
  () => import("@/components/calculator/DynastyTimeline").then((mod) => ({ default: mod.DynastyTimeline })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
  }
);
import AddToWalletButton from "@/components/AddToWalletButton";
import DownloadCardButton from "@/components/DownloadCardButton";
import DownloadPDFButton from "@/components/DownloadPDFButton";
import { LegacyResult } from "@/lib/walletPass";
import UserInputsPrintSummary from "@/components/UserInputsPrintSummary";
import { TopBanner } from "@/components/layout/TopBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SliderInput } from "@/components/form/SliderInput";
import { BrandLoader } from "@/components/BrandLoader";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";
import { Input, Spinner, Tip, TrendingUpIcon } from "@/components/calculator/InputHelpers";
import { TabNavigation, type MainTabId, isMainTabId } from "@/components/calculator/TabNavigation";
import { TabPanel } from "@/components/calculator/TabPanel";
import { LastCalculatedBadge } from "@/components/calculator/LastCalculatedBadge";
import { RecalculateButton } from "@/components/calculator/RecalculateButton";
import { RiskSummaryCard } from "@/components/calculator/RiskSummaryCard";
import { TimelineView } from "@/components/calculator/TimelineView";
import { PlanSummaryCard } from "@/components/calculator/PlanSummaryCard";
import { NextStepsCard } from "@/components/calculator/NextStepsCard";
// Lazy load MonteCarloVisualizer - only needed in results section
const MonteCarloVisualizer = dynamic(
  () => import("@/components/calculator/MonteCarloVisualizerWrapper").then((mod) => ({ default: mod.MonteCarloVisualizer })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
  }
);
import CyberpunkSplash, { type CyberpunkSplashHandle } from "@/components/calculator/CyberpunkSplash";
import { CheckUsTab } from "@/components/calculator/CheckUsTab";
import OptimizationTab from "@/components/calculator/OptimizationTab";
import { PrintReport } from "@/components/calculator/PrintReport";
// Extracted tab components for cleaner organization
import {
  ConfigureTab,
  LegacyTab,
  ScenariosTab,
  ResultsTab,
  MathTab,
} from "@/components/calculator/tabs";
import { SequenceRiskChart } from "@/components/calculator/SequenceRiskChart";
import { SpendingFlexibilityChart } from "@/components/calculator/SpendingFlexibilityChart";
// Lazy load RothConversionOptimizer - only needed in advanced section
const RothConversionOptimizer = dynamic(
  () => import("@/components/calculator/RothConversionOptimizer").then((mod) => ({ default: mod.RothConversionOptimizer })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
  }
);
// Lazy load Planning Tools - only needed in tools tab
const StudentLoanOptimizer = dynamic(
  () => import("@/components/calculator/StudentLoanOptimizer"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const AnnuityAnalyzer = dynamic(
  () => import("@/components/calculator/AnnuityAnalyzer"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const SemiRetirement = dynamic(
  () => import("@/components/calculator/SemiRetirement"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const PlaidConnect = dynamic(
  () => import("@/components/integrations/PlaidConnect"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
);
import { SSOTTab } from "@/components/calculator/SSOTTab";
import type { AdjustmentDeltas } from "@/components/layout/PageHeader";
import { useBudget } from "@/lib/budget-context";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import { OnboardingSelector } from "@/components/onboarding/OnboardingSelector";
import { AIReviewPanel } from "@/components/AIReviewPanel";
import { useOnboarding } from "@/hooks/useOnboarding";

// Import types
import type { CalculationResult, ChartDataPoint, SavedScenario, ComparisonData, GenerationalPayout, CalculationProgress, BondGlidePath } from "@/types/calculator";

// Import from new modules
import {
  MAX_GENS,
  YEARS_PER_GEN,
  LIFE_EXP,
  getCurrYear,
  RMD_START_AGE,
  SS_BEND_POINTS,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  NET_WORTH_DATA,
  getNetWorthBracket,
  COLOR,
  type ColorKey,
} from "@/lib/constants";

import {
  clampNum,
  toNumber,
  fmt,
  median,
  percentile,
  realReturn,
} from "@/lib/utils";

import {
  calculateBondAllocation,
  calculateBlendedReturn,
  GLIDE_PATH_PRESETS,
} from "@/lib/bondAllocation";

import { MONTE_CARLO_PATHS } from "@/lib/constants";

import type { ReturnMode, WalkSeries, BatchSummary, GuardrailsResult, RothConversionResult } from "@/types/planner";

// Import calculation modules
import {
  type FilingStatus,
} from "@/lib/calculations/taxCalculations";

// Import retirement engine
import {
  runSingleSimulation,
  buildReturnGenerator,
  calcSocialSecurity,
  calcRMD,
  calcEstateTax,
  type SimulationInputs,
  type SimulationResult,
} from "@/lib/calculations/retirementEngine";

// Import simulation modules
import {
  getBearReturns,
  BEAR_MARKET_SCENARIOS,
  type BearMarketScenario,
} from "@/lib/simulation/bearMarkets";

import {
  getEffectiveInflation,
  INFLATION_SHOCK_SCENARIOS,
  type InflationShockScenario,
} from "@/lib/simulation/inflationShocks";

// Import validation utilities
import { validateCalculatorInputs } from "@/lib/validation";
import {
  validateAge,
  validateRetirementAge,
  validateBalance,
  validate401kContribution,
  validateIRAContribution,
  validateRate,
  validateWithdrawalRate
} from "@/lib/fieldValidation";

// Re-export types for compatibility
export type { ReturnMode, WalkSeries, BatchSummary };

// buildReturnGenerator is now imported from @/lib/calculations/retirementEngine


// calcSocialSecurity, calcRMD, calcEstateTax are now imported from @/lib/calculations/retirementEngine

/** ===============================
 * Small UI bits - Custom SVG Icons
 * ================================ */

const InfoIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const DollarSignIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string; size?: number }> = ({ className = "", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const HourglassIcon: React.FC<{ size?: number }> = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    <path d="M7 22v-4.172a2 2 0 0 1 .586-1.414L12 12 7.586 7.586A2 2 0 0 1 7 6.172V2" />
  </svg>
);

const SparkleIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 ${className}`}
  >
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    <path d="M5 2L6 5" />
    <path d="M19 2L18 5" />
    <path d="M5 22L6 19" />
    <path d="M19 22L18 19" />
  </svg>
);

// Loading fallback for lazy-loaded chart components
const ChartLoadingFallback: React.FC<{ height?: string }> = ({ height = "h-64" }) => (
  <div className={`${height} animate-pulse bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center`}>
    <div className="text-gray-400 dark:text-gray-500 text-sm">Loading chart...</div>
  </div>
);

// Helper function to convert text to title case (moved outside component to prevent re-render issues)
const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format the insight text to have bolded headers (moved outside component to prevent re-render issues)
const formatInsight = (text: string) => {
  // Split by lines and format headers
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Check if line is a header (starts with ## or is followed by a colon and is short)
    const isMarkdownHeader = line.startsWith('##') || line.startsWith('#');
    const isColonHeader = line.includes(':') && line.length < 80 && !line.includes('$') && index > 0 && lines[index - 1] === '';

    if (isMarkdownHeader) {
      // Remove markdown symbols, convert to title case, and bold
      const headerText = line.replace(/^#+\s*/, '');
      const titleCaseHeader = toTitleCase(headerText);
      return <h4 key={index} className="font-bold text-base mt-4 mb-2 first:mt-0">{titleCaseHeader}</h4>;
    } else if (isColonHeader) {
      const titleCaseHeader = toTitleCase(line);
      return <h5 key={index} className="font-semibold text-sm mt-3 mb-1">{titleCaseHeader}</h5>;
    } else if (line.trim() === '') {
      return <br key={index} />;
    } else {
      return <p key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{line}</p>;
    }
  });
};

// PERFORMANCE OPTIMIZATION: Memoize AiInsightBox to prevent re-renders when parent state changes
const AiInsightBox = React.memo<{ insight: string; error?: string | null, isLoading: boolean }>(function AiInsightBox({ insight, error, isLoading }) {
  if (isLoading) {
     return (
      <div className="p-6 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="animate-spin">
            <SparkleIcon className="text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Analyzing Your Plan...</h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Please wait a moment while we generate your personalized insights.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <SparkleIcon className="text-red-600 dark:text-red-400" />
          <h4 className="text-lg font-semibold text-red-900 dark:text-red-100">Analysis Error</h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-6 rounded-xl bg-card border shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          Click "Calculate Retirement Plan" to see your personalized analysis
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-card border shadow-sm">
      <div className="space-y-1">
        {formatInsight(insight)}
      </div>
    </div>
  );
});

/** Props for icon components used in stat cards */
type IconComponentProps = { className?: string };

// PERFORMANCE OPTIMIZATION: Memoize StatCard to prevent unnecessary re-renders
const StatCard = React.memo<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<IconComponentProps>;
  explanation?: string;
}>(function StatCard({ title, value, sub, color = "blue", icon: Icon, explanation }) {
  const c = COLOR[color] ?? COLOR.blue;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card
      className={`overflow-hidden border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
        explanation ? 'cursor-pointer' : ''
      }`}
      onClick={() => explanation && setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="secondary" className={`${c.bg} ${c.badge} border-0`}>
            {title}
          </Badge>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
            )}
            {explanation && (
              <InfoIcon className={`w-4 h-4 ${c.icon} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>
        <div className={`text-3xl font-bold ${c.text} mb-1`}>{value}</div>
        {sub && <p className={`text-sm ${c.sub}`}>{sub}</p>}
        {explanation && isExpanded && (
          <div className={`mt-4 pt-4 border-t ${c.border} animate-in slide-in-from-top-2 duration-200`}>
            <p className={`text-sm ${c.sub} leading-relaxed`}>{explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// PERFORMANCE OPTIMIZATION: Memoize FlippingStatCard
const FlippingStatCard = React.memo<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<IconComponentProps>;
  backContent?: React.ReactNode;
}>(function FlippingStatCard({ title, value, sub, color = "blue", icon: Icon, backContent }) {
  const c = COLOR[color] ?? COLOR.blue;

  const frontContent = (
    <>
      <div className="flip-card-header">
        <Badge variant="secondary" className={`border-0 bg-transparent ${c.badge}`}>
          {title}
        </Badge>
        <span className="flip-card-icon text-xs opacity-50 print-hide flip-hint">Click to flip ↻</span>
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className={`text-3xl font-bold mb-1 ${c.text}`}>{value}</div>
        {Icon && (
          <div className="p-2 rounded-lg">
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
      {sub && <p className={`text-sm ${c.sub}`}>{sub}</p>}
    </>
  );

  const defaultBackContent = (
    <>
      <div className="flip-card-header">
        <span className="flip-card-title">{title} - Details</span>
        <span className="flip-card-icon text-xs">Click to flip back ↻</span>
      </div>
      <div className="flip-card-body-details">
        <p>No additional details provided.</p>
      </div>
    </>
  );

  return (
    <FlippingCard
      frontContent={frontContent}
      backContent={backContent || defaultBackContent}
    />
  );
});

const CollapsibleSection: React.FC<{
  title: string;
  icon?: React.ComponentType<IconComponentProps>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition-colors rounded-md"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-600" />}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-6 px-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

/** ===============================
 * Generational Wealth Visual
 * ================================ */
const GenerationalWealthVisual: React.FC<{ genPayout: GenerationalPayout }> = ({ genPayout }) => {
  if (!genPayout) return null;

  const isSurviving = genPayout.fundLeftReal > 0;

  if (isSurviving) {
    return (
      <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center" title="Survives indefinitely">
        <span className="relative flex h-12 w-12 text-green-600 dark:text-green-400">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 dark:bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-12 w-12 bg-green-500 dark:bg-green-600 p-2">
            <UsersIcon className="m-auto text-white" size={32} />
          </span>
        </span>
      </div>
    );
  } else {
    return (
      <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center" title={`Exhausts after ${genPayout.years} years`}>
        <span className="relative flex h-12 w-12 text-muted-foreground">
           <HourglassIcon size={48} />
        </span>
      </div>
    );
  }
};


/** ===============================
 * Hypothetical per-beneficiary payout model (real terms)
 * ================================ */

type Cohort = { size: number; age: number; canReproduce: boolean; cumulativeBirths: number };

/**
 * Helper function: Simulate N years of generational wealth with demographic changes
 * Used internally by the optimized simulation for chunked processing
 */
function simulateYearsChunk(
  cohorts: Cohort[],
  fundReal: number,
  realReturnRate: number,
  perBenReal: number,
  deathAge: number,
  minDistAge: number,
  totalFertilityRate: number,
  fertilityWindowStart: number,
  fertilityWindowEnd: number,
  birthsPerYear: number,
  numYears: number
): { cohorts: Cohort[]; fundReal: number; years: number; depleted: boolean } {
  let currentFund = fundReal;
  let currentCohorts = cohorts;
  let yearsSimulated = 0;

  for (let i = 0; i < numYears; i++) {
    // Filter out deceased
    currentCohorts = currentCohorts.filter((c) => c.age < deathAge);

    const living = currentCohorts.reduce((acc, c) => acc + c.size, 0);
    if (living === 0) {
      return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: true };
    }

    // Apply growth
    currentFund *= 1 + realReturnRate;

    // Calculate and subtract payout
    const eligible = currentCohorts
      .filter(c => c.age >= minDistAge)
      .reduce((acc, c) => acc + c.size, 0);
    const payout = perBenReal * eligible;
    currentFund -= payout;

    if (currentFund < 0) {
      return { cohorts: currentCohorts, fundReal: 0, years: yearsSimulated, depleted: true };
    }

    yearsSimulated += 1;

    // Age all cohorts
    currentCohorts.forEach((c) => (c.age += 1));

    // Handle reproduction
    currentCohorts.forEach((cohort) => {
      if (cohort.canReproduce &&
          cohort.age >= fertilityWindowStart &&
          cohort.age <= fertilityWindowEnd &&
          cohort.cumulativeBirths < totalFertilityRate) {

        const remainingFertility = totalFertilityRate - cohort.cumulativeBirths;
        const birthsThisYear = Math.min(birthsPerYear, remainingFertility);
        const births = cohort.size * birthsThisYear;

        if (births > 0) {
          currentCohorts.push({ size: births, age: 0, canReproduce: true, cumulativeBirths: 0 });
        }

        cohort.cumulativeBirths += birthsThisYear;
      }
    });
  }

  return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: false };
}

/**
 * Check if portfolio is mathematically guaranteed to be perpetual
 * Uses perpetual threshold formula: Sustainable Rate = Real Return - Population Growth Rate
 */
function checkPerpetualViability(
  realReturnRate: number,
  totalFertilityRate: number,
  generationLength: number,
  perBenReal: number,
  initialFundReal: number,
  startBens: number,
  debugLog = false
): boolean {
  // Calculate population growth rate from fertility
  // Population growth rate ≈ (TFR - 2) / generationLength
  // At TFR = 2.0 (replacement), growth = 0
  // At TFR = 2.1, growth ≈ 0.1 / 30 ≈ 0.33% per year
  // At TFR = 3.0, growth ≈ 1.0 / 30 ≈ 3.33% per year
  const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;

  // Perpetual threshold: maximum sustainable distribution rate
  const perpetualThreshold = realReturnRate - populationGrowthRate;

  // Calculate current distribution rate
  // Initially, all startBens are eligible (or will be soon)
  const annualDistribution = perBenReal * startBens;
  const distributionRate = annualDistribution / initialFundReal;

  // Apply 95% safety margin (5% buffer for model uncertainties)
  const safeThreshold = perpetualThreshold * 0.95;

  const isPerpetual = distributionRate < safeThreshold;

  if (debugLog) {
    console.log('[PERPETUAL CHECK] Real return rate: ' + (realReturnRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Population growth rate: ' + (populationGrowthRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Perpetual threshold (return - pop growth): ' + (perpetualThreshold * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Safe threshold (95% of perpetual threshold): ' + (safeThreshold * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Annual distribution: $' + annualDistribution.toLocaleString() + ' ($' + perBenReal.toLocaleString() + ' × ' + startBens + ' beneficiaries)');
    console.log('[PERPETUAL CHECK] Initial fund: $' + initialFundReal.toLocaleString());
    console.log('[PERPETUAL CHECK] Distribution rate: ' + (distributionRate * 100).toFixed(2) + '%');
    console.log('[PERPETUAL CHECK] Result: ' + (isPerpetual ? 'PERPETUAL ✓' : 'NOT PERPETUAL ✗') + ' (' + (distributionRate * 100).toFixed(2) + '% ' + (isPerpetual ? '<' : '>=') + ' ' + (safeThreshold * 100).toFixed(2) + '%)');
  }

  return isPerpetual;
}

/**
 * Simulate constant real-dollar payout per beneficiary with births/deaths.
 * - Works in 2025 dollars (real terms).
 * - fund starts as EOL deflated to 2025 dollars.
 * - Real growth at r = realReturn(nominal, inflation).
 * - Each year, pay (perBenReal * eligible), where eligible = beneficiaries >= minDistAge.
 * - Beneficiaries reproduce gradually across fertility window (e.g., ages 25-35).
 * - Total fertility rate (e.g., 2.1) distributed evenly across fertile years.
 * - Only beneficiaries within fertility window at death (and their descendants) can reproduce.
 * - Death at deathAge.
 *
 * OPTIMIZATIONS:
 * 1. Early-exit for perpetual portfolios using threshold formula
 * 2. Decade-chunked simulation (10-year blocks) for 10x speedup
 * 3. Early termination after 1,000 years if clearly perpetual
 */
function simulateRealPerBeneficiaryPayout(
  eolNominal: number,
  yearsFrom2025: number,
  nominalRet: number,
  inflPct: number,
  perBenReal: number,
  startBens: number,
  totalFertilityRate: number,
  generationLength = 30,
  deathAge = 90,
  minDistAge = 21,
  capYears = 10000,
  initialBenAges: number[] = [0],
  fertilityWindowStart = 25,
  fertilityWindowEnd = 35
) {
  let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
  const r = realReturn(nominalRet, inflPct);

  // Calculate births per year during fertility window
  const fertilityWindowYears = fertilityWindowEnd - fertilityWindowStart;
  const birthsPerYear = fertilityWindowYears > 0 ? totalFertilityRate / fertilityWindowYears : 0;

  // Initialize cohorts with specified ages
  // Beneficiaries can reproduce if they are young enough to eventually reach the fertility window
  // Fix: Don't sterilize young children (e.g., age 5) who aren't fertile YET but will be later
  let cohorts: Cohort[] = initialBenAges.length > 0
    ? initialBenAges.map(age => ({
        size: 1,
        age,
        canReproduce: age <= fertilityWindowEnd, // Can reproduce if young enough to reach window
        cumulativeBirths: 0
      }))
    : startBens > 0
    ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }]
    : [];

  // OPTIMIZATION 1: Early-exit for perpetual portfolios
  // Check if portfolio is mathematically guaranteed to be perpetual
  const isPerpetual = checkPerpetualViability(
    r,
    totalFertilityRate,
    generationLength,
    perBenReal,
    fundReal,
    startBens
  );

  if (isPerpetual && capYears >= 10000) {
    // Portfolio is perpetual - return infinity
    return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: startBens };
  }

  let years = 0;
  const CHUNK_SIZE = 10; // Simulate in 10-year chunks
  const EARLY_TERM_CHECK = 1000; // Check for perpetual after 1,000 years

  // Track fund growth for early termination detection
  let fundAtYear100 = 0;
  let fundAtYear1000 = 0;

  // OPTIMIZATION 2: Chunked simulation
  // Simulate in CHUNK_SIZE-year blocks for 10x speedup
  for (let t = 0; t < capYears; t += CHUNK_SIZE) {
    const yearsToSimulate = Math.min(CHUNK_SIZE, capYears - t);

    const result = simulateYearsChunk(
      cohorts,
      fundReal,
      r,
      perBenReal,
      deathAge,
      minDistAge,
      totalFertilityRate,
      fertilityWindowStart,
      fertilityWindowEnd,
      birthsPerYear,
      yearsToSimulate
    );

    cohorts = result.cohorts;
    fundReal = result.fundReal;
    years += result.years;

    // Check if depleted
    if (result.depleted) {
      // ZOOM IN: Fund depleted during this chunk - need exact year
      // Go back and simulate year-by-year for this chunk
      const startYear = t;
      const chunkYears = result.years;

      // Reset to beginning of chunk (need to track state, so re-simulate from last checkpoint)
      // For simplicity, we already have the result - depletion happened within this chunk
      // The year count is accurate enough (within 10 years)
      const living = cohorts.reduce((acc, c) => acc + c.size, 0);
      return { years, fundLeftReal: 0, lastLivingCount: living };
    }

    // Track fund growth for early termination
    if (t === 100 && fundAtYear100 === 0) {
      fundAtYear100 = fundReal;
    }
    if (t === EARLY_TERM_CHECK && fundAtYear1000 === 0) {
      fundAtYear1000 = fundReal;
    }

    // OPTIMIZATION 3: Early termination for clearly perpetual portfolios
    // After 1,000 years, if fund is still growing strongly, it's perpetual
    if (t >= EARLY_TERM_CHECK && capYears >= 10000) {
      // Calculate average annual growth rate over the last 900 years
      if (fundAtYear100 > 0 && fundReal > fundAtYear1000) {
        const growthRate = Math.pow(fundReal / fundAtYear1000, 1 / (t - EARLY_TERM_CHECK)) - 1;

        // If portfolio is growing at >3% annually after 1,000 years, it's clearly perpetual
        if (growthRate > 0.03) {
          const living = cohorts.reduce((acc, c) => acc + c.size, 0);
          return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: living };
        }
      }
    }
  }

  const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
  return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving };
}

/** ===============================
 * Batch Simulation for Truly Random Mode
 * ================================ */

/** All inputs needed to run a single simulation */
export type Inputs = SimulationInputs;

/** ===============================
 * Memoized Chart Components
 * ================================ */

interface WealthChartProps {
  data: ChartDataPoint[];
  showP10: boolean;
  showP90: boolean;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

// Memoized wealth accumulation chart for default mode
const WealthAccumulationChart = React.memo<WealthChartProps>(({ data, showP10, showP90, isDarkMode, fmt }) => (
  <ResponsiveContainer width="100%" height={400}>
    <ComposedChart data={data}>
      <defs>
        <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="year" className="text-sm" />
      <YAxis tickFormatter={(v) => fmt(v as number)} className="text-sm" />
      <RTooltip
        formatter={(v) => fmt(v as number)}
        labelFormatter={(l) => `Year ${l}`}
        contentStyle={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderRadius: "8px",
          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          color: isDarkMode ? '#f3f4f6' : '#1f2937'
        }}
        labelStyle={{
          color: isDarkMode ? '#f3f4f6' : '#1f2937',
          fontWeight: 'bold'
        }}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="bal"
        stroke="#3b82f6"
        strokeWidth={3}
        dot={false}
        name="Nominal (50th Percentile)"
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="real"
        stroke="#10b981"
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
        name="Real (50th Percentile)"
        isAnimationActive={false}
      />
      {showP10 && (
        <Line
          type="monotone"
          dataKey="p10"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
          name="10th Percentile (Nominal)"
        />
      )}
      {showP90 && (
        <Line
          type="monotone"
          dataKey="p90"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
          name="90th Percentile (Nominal)"
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>
));

WealthAccumulationChart.displayName = 'WealthAccumulationChart';

interface ComparisonChartProps {
  data: ChartDataPoint[];
  comparisonData: ComparisonData;
  isDarkMode: boolean;
  fmt: (n: number) => string;
}

// Memoized comparison chart for scenario analysis
const ScenarioComparisonChart = React.memo<ComparisonChartProps>(({ data, comparisonData, isDarkMode, fmt }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  // TRUE SIDE EFFECT: Window resize event subscription
  // Subscribes to browser resize events to adjust chart layout responsively.
  // Window dimensions are external to React and require event listeners.
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
  <ResponsiveContainer width="100%" height={400}>
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="year" className="text-sm" />
      <YAxis
        tickFormatter={(v) => fmt(v as number)}
        className="text-sm"
        label={isMobile ? undefined : { value: 'Portfolio Value (Real)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
      />
      <RTooltip
        formatter={(v) => fmt(v as number)}
        labelFormatter={(l) => `Year ${l}`}
        contentStyle={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderRadius: "8px",
          border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          color: isDarkMode ? '#f3f4f6' : '#1f2937'
        }}
        labelStyle={{
          color: isDarkMode ? '#f3f4f6' : '#1f2937',
          fontWeight: 'bold'
        }}
      />
      <Legend />
      {comparisonData.baseline?.visible && (
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={false}
          name="Baseline"
        />
      )}
      {comparisonData.bearMarket?.visible && (
        <Line
          type="monotone"
          dataKey="bearMarket"
          stroke="#ef4444"
          strokeWidth={3}
          dot={false}
          name={comparisonData.bearMarket.label}
        />
      )}
      {comparisonData.inflation?.visible && (
        <Line
          type="monotone"
          dataKey="inflation"
          stroke="#f59e0b"
          strokeWidth={3}
          dot={false}
          name={comparisonData.inflation.label}
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>
  );
});

ScenarioComparisonChart.displayName = 'ScenarioComparisonChart';

/** ===============================
 * URL Tab Sync Component
 * Handles useSearchParams which requires Suspense boundary in Next.js 15
 * ================================ */

function URLTabSync({ onTabChange }: { onTabChange: (tab: MainTabId) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && isMainTabId(tab)) {
      onTabChange(tab);
    }
  }, [searchParams, onTabChange]);

  return null; // This component only syncs state, no UI
}

/** ===============================
 * App
 * ================================ */

export default function App() {
  const { setImplied } = useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig, isDirty: configIsDirty } = usePlanConfig();

  // Canonical defaults — used as ?? fallbacks to ensure page.tsx never diverges
  // from createDefaultPlanConfig(). This eliminates the bug where hardcoded fallback
  // values (e.g., cTax2 ?? 8000) differed from the actual defaults (cTax2: 0).
  const DEFAULTS = useMemo(() => createDefaultPlanConfig(), []);

  // Onboarding wizard state - validate both flag AND config data
  const {
    shouldShowWizard,
    markOnboardingComplete,
    resetOnboarding,
  } = useOnboarding(planConfig);

  // AI Documentation Mode - Secret feature (Ctrl+Shift+D)
  const [isAIDocMode, setIsAIDocMode] = useState(false);
  // TRUE SIDE EFFECT: DOM event listener subscription
  // This useEffect manages a keyboard shortcut listener and must remain a side effect
  // because it interacts with the browser's event system outside React's control.
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsAIDocMode(prev => !prev);
        console.log('[AI Doc Mode]', !isAIDocMode ? 'ACTIVATED ⚡' : 'DEACTIVATED');
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isAIDocMode]);

  // Read core fields directly from PlanConfig (single source of truth)
  // Fallbacks use DEFAULTS from createDefaultPlanConfig() to guarantee consistency.
  // Using ?? (nullish coalescing) instead of || to preserve legitimate 0 values.
  const marital = planConfig.marital ?? DEFAULTS.marital;
  const age1 = planConfig.age1 ?? DEFAULTS.age1;
  const age2 = planConfig.age2 ?? DEFAULTS.age2;
  const retirementAge = planConfig.retirementAge ?? DEFAULTS.retirementAge;

  // Employment & Income
  const employmentType1 = planConfig.employmentType1 ?? DEFAULTS.employmentType1;
  const employmentType2 = planConfig.employmentType2;
  const primaryIncome = planConfig.primaryIncome ?? DEFAULTS.primaryIncome;
  const spouseIncome = planConfig.spouseIncome ?? DEFAULTS.spouseIncome;

  // Current Account Balances
  const emergencyFund = planConfig.emergencyFund ?? DEFAULTS.emergencyFund;
  const taxableBalance = planConfig.taxableBalance ?? DEFAULTS.taxableBalance;
  const pretaxBalance = planConfig.pretaxBalance ?? DEFAULTS.pretaxBalance;
  const rothBalance = planConfig.rothBalance ?? DEFAULTS.rothBalance;

  // Annual Contributions
  const cTax1 = planConfig.cTax1 ?? DEFAULTS.cTax1;
  const cPre1 = planConfig.cPre1 ?? DEFAULTS.cPre1;
  const cPost1 = planConfig.cPost1 ?? DEFAULTS.cPost1;
  const cMatch1 = planConfig.cMatch1 ?? DEFAULTS.cMatch1;
  const cTax2 = planConfig.cTax2 ?? DEFAULTS.cTax2;
  const cPre2 = planConfig.cPre2 ?? DEFAULTS.cPre2;
  const cPost2 = planConfig.cPost2 ?? DEFAULTS.cPost2;
  const cMatch2 = planConfig.cMatch2 ?? DEFAULTS.cMatch2;

  // Return and Withdrawal Assumptions
  const retRate = planConfig.retRate ?? DEFAULTS.retRate;
  const inflationRate = planConfig.inflationRate ?? DEFAULTS.inflationRate;
  const stateRate = planConfig.stateRate ?? DEFAULTS.stateRate;
  const incContrib = planConfig.incContrib ?? DEFAULTS.incContrib;
  const incRate = planConfig.incRate ?? DEFAULTS.incRate;
  const wdRate = planConfig.wdRate ?? DEFAULTS.wdRate;
  const dividendYield = planConfig.dividendYield ?? DEFAULTS.dividendYield;

  // Social Security Benefits
  const includeSS = planConfig.includeSS ?? DEFAULTS.includeSS;
  const ssIncome = planConfig.ssIncome ?? DEFAULTS.ssIncome;
  const ssClaimAge = planConfig.ssClaimAge ?? DEFAULTS.ssClaimAge;
  const ssIncome2 = planConfig.ssIncome2 ?? DEFAULTS.ssIncome2;
  const ssClaimAge2 = planConfig.ssClaimAge2 ?? DEFAULTS.ssClaimAge2;

  // Family & Children - read from context (synced with wizard)
  const numChildren = planConfig.numChildren ?? 0;
  const childrenAges = planConfig.childrenAges ?? [];

  // Helper setter functions - now using updatePlanConfig
  // Note: markDirty should always mark dirty regardless of whether results exist
  const markDirty = () => setIsDirty(true);

  const setMarital = (value: FilingStatus) => { updatePlanConfig({ marital: value }, 'user-entered'); markDirty(); };
  // setAge1 atomically updates bondStartAge when it follows age1 (not explicitly overridden)
  // This eliminates the useEffect cascade that was syncing bondStartAge with age1
  const setAge1 = (value: number) => {
    const currentBondStartAge = planConfig.bondStartAge;
    const currentAge1 = planConfig.age1 ?? DEFAULTS.age1;
    // If bondStartAge was tracking age1 (not user-overridden), keep it in sync atomically
    const bondStartAgeFollowsAge = currentBondStartAge === undefined || currentBondStartAge === currentAge1;
    const updates: Partial<typeof planConfig> = { age1: value };
    if (bondStartAgeFollowsAge) {
      updates.bondStartAge = value;
    }
    updatePlanConfig(updates, 'user-entered');
    markDirty();
  };
  const setAge2 = (value: number) => { updatePlanConfig({ age2: value }, 'user-entered'); markDirty(); };
  const setRetirementAge = (value: number) => { updatePlanConfig({ retirementAge: value }, 'user-entered'); markDirty(); };

  const setEmploymentType1 = (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other') => { updatePlanConfig({ employmentType1: value }, 'user-entered'); markDirty(); };
  const setEmploymentType2 = (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other' | undefined) => { updatePlanConfig({ employmentType2: value }, 'user-entered'); markDirty(); };
  const setPrimaryIncome = (value: number) => { updatePlanConfig({ primaryIncome: value }, 'user-entered'); markDirty(); };
  const setSpouseIncome = (value: number) => { updatePlanConfig({ spouseIncome: value }, 'user-entered'); markDirty(); };

  const setEmergencyFund = (value: number) => { updatePlanConfig({ emergencyFund: value }, 'user-entered'); markDirty(); };
  const setTaxableBalance = (value: number) => { updatePlanConfig({ taxableBalance: value }, 'user-entered'); markDirty(); };
  const setPretaxBalance = (value: number) => { updatePlanConfig({ pretaxBalance: value }, 'user-entered'); markDirty(); };
  const setRothBalance = (value: number) => { updatePlanConfig({ rothBalance: value }, 'user-entered'); markDirty(); };

  const setCTax1 = (value: number) => { updatePlanConfig({ cTax1: value }, 'user-entered'); markDirty(); };
  const setCPre1 = (value: number) => { updatePlanConfig({ cPre1: value }, 'user-entered'); markDirty(); };
  const setCPost1 = (value: number) => { updatePlanConfig({ cPost1: value }, 'user-entered'); markDirty(); };
  const setCMatch1 = (value: number) => { updatePlanConfig({ cMatch1: value }, 'user-entered'); markDirty(); };
  const setCTax2 = (value: number) => { updatePlanConfig({ cTax2: value }, 'user-entered'); markDirty(); };
  const setCPre2 = (value: number) => { updatePlanConfig({ cPre2: value }, 'user-entered'); markDirty(); };
  const setCPost2 = (value: number) => { updatePlanConfig({ cPost2: value }, 'user-entered'); markDirty(); };
  const setCMatch2 = (value: number) => { updatePlanConfig({ cMatch2: value }, 'user-entered'); markDirty(); };

  const setRetRate = (value: number) => { updatePlanConfig({ retRate: value }, 'user-entered'); markDirty(); };
  const setInflationRate = (value: number) => { updatePlanConfig({ inflationRate: value }, 'user-entered'); markDirty(); };
  const setStateRate = (value: number) => { updatePlanConfig({ stateRate: value }, 'user-entered'); markDirty(); };
  const setIncContrib = (value: boolean) => { updatePlanConfig({ incContrib: value }, 'user-entered'); markDirty(); };
  const setIncRate = (value: number) => { updatePlanConfig({ incRate: value }, 'user-entered'); markDirty(); };
  const setWdRate = (value: number) => { updatePlanConfig({ wdRate: value }, 'user-entered'); markDirty(); };
  const setDividendYield = (value: number) => { updatePlanConfig({ dividendYield: value }, 'user-entered'); markDirty(); };

  const setIncludeSS = (value: boolean) => { updatePlanConfig({ includeSS: value }, 'user-entered'); markDirty(); };
  const setSSIncome = (value: number) => { updatePlanConfig({ ssIncome: value }, 'user-entered'); markDirty(); };
  const setSSClaimAge = (value: number) => { updatePlanConfig({ ssClaimAge: value }, 'user-entered'); markDirty(); };
  const setSSIncome2 = (value: number) => { updatePlanConfig({ ssIncome2: value }, 'user-entered'); markDirty(); };
  const setSSClaimAge2 = (value: number) => { updatePlanConfig({ ssClaimAge2: value }, 'user-entered'); markDirty(); };

  // Healthcare costs (post-retirement) - now synced to context
  const includeMedicare = planConfig.includeMedicare ?? true;
  const medicarePremium = planConfig.medicarePremium ?? 400;
  const medicalInflation = planConfig.medicalInflation ?? 5.0;
  const irmaaThresholdSingle = planConfig.irmaaThresholdSingle ?? 109000;
  const irmaaThresholdMarried = planConfig.irmaaThresholdMarried ?? 218000;
  const irmaaSurcharge = planConfig.irmaaSurcharge ?? 230;

  const setIncludeMedicare = (value: boolean) => { updatePlanConfig({ includeMedicare: value }, 'user-entered'); markDirty(); };
  const setMedicarePremium = (value: number) => { updatePlanConfig({ medicarePremium: value }, 'user-entered'); markDirty(); };
  const setMedicalInflation = (value: number) => { updatePlanConfig({ medicalInflation: value }, 'user-entered'); markDirty(); };
  const setIrmaaThresholdSingle = (value: number) => { updatePlanConfig({ irmaaThresholdSingle: value }, 'user-entered'); markDirty(); };
  const setIrmaaThresholdMarried = (value: number) => { updatePlanConfig({ irmaaThresholdMarried: value }, 'user-entered'); markDirty(); };
  const setIrmaaSurcharge = (value: number) => { updatePlanConfig({ irmaaSurcharge: value }, 'user-entered'); markDirty(); };

  // Long-Term Care - now synced to context
  const includeLTC = planConfig.includeLTC ?? false;
  const ltcAnnualCost = planConfig.ltcAnnualCost ?? 80000;
  const ltcProbability = planConfig.ltcProbability ?? 50;
  const ltcDuration = planConfig.ltcDuration ?? 2.5;
  const ltcOnsetAge = planConfig.ltcOnsetAge ?? 82;
  const ltcAgeRangeStart = planConfig.ltcAgeRangeStart ?? 75;
  const ltcAgeRangeEnd = planConfig.ltcAgeRangeEnd ?? 90;

  const setIncludeLTC = (value: boolean) => { updatePlanConfig({ includeLTC: value }, 'user-entered'); markDirty(); };
  const setLtcAnnualCost = (value: number) => { updatePlanConfig({ ltcAnnualCost: value }, 'user-entered'); markDirty(); };
  const setLtcProbability = (value: number) => { updatePlanConfig({ ltcProbability: value }, 'user-entered'); markDirty(); };
  const setLtcDuration = (value: number) => { updatePlanConfig({ ltcDuration: value }, 'user-entered'); markDirty(); };
  const setLtcOnsetAge = (value: number) => { updatePlanConfig({ ltcOnsetAge: value }, 'user-entered'); markDirty(); };
  const setLtcAgeRangeStart = (value: number) => { updatePlanConfig({ ltcAgeRangeStart: value }, 'user-entered'); markDirty(); };
  const setLtcAgeRangeEnd = (value: number) => { updatePlanConfig({ ltcAgeRangeEnd: value }, 'user-entered'); markDirty(); };

  // Roth Conversion Strategy - now synced to context
  const enableRothConversions = planConfig.enableRothConversions ?? false;
  const targetConversionBracket = planConfig.targetConversionBracket ?? 0.24;

  const setEnableRothConversions = (value: boolean) => { updatePlanConfig({ enableRothConversions: value }, 'user-entered'); markDirty(); };
  const setTargetConversionBracket = (value: number) => { updatePlanConfig({ targetConversionBracket: value }, 'user-entered'); markDirty(); };

  // Generational Wealth - read from planConfig context
  const showGen = planConfig.showGen ?? false;
  const setShowGen = (value: boolean) => { updatePlanConfig({ showGen: value }, 'user-entered'); markDirty(); };

  // Generational wealth parameters (improved demographic model)
  const hypPerBen = planConfig.hypPerBen ?? 30000;
  const setHypPerBen = (value: number) => { updatePlanConfig({ hypPerBen: value }, 'user-entered'); markDirty(); };
  const numberOfBeneficiaries = planConfig.numberOfBeneficiaries ?? 2;
  const setNumberOfBeneficiaries = (value: number) => { updatePlanConfig({ numberOfBeneficiaries: value }, 'user-entered'); markDirty(); };

  // Beneficiary inputs - DERIVED from planConfig (no useEffect sync needed)
  // childrenCurrentAges and numberOfChildren are now computed directly from planConfig
  // This eliminates the infinite loop bug that occurred with useEffect-based syncing
  const additionalChildrenExpected = planConfig.additionalChildrenExpected ?? 0;
  const setAdditionalChildrenExpected = (value: number) => {
    updatePlanConfig({ additionalChildrenExpected: value }, 'user-entered');
    markDirty();
  };

  // DERIVED STATE: Compute children display values directly from planConfig
  // This replaces the useEffect that was syncing state and causing cascade updates
  const derivedChildrenState = useMemo(() => {
    const wasExplicitlySet = planConfig.fieldMetadata?.numChildren ||
                             planConfig.fieldMetadata?.childrenAges;
    const numChildrenFromConfig = planConfig.numChildren ?? 0;
    const childAgesFromConfig = planConfig.childrenAges ?? [];

    if (!wasExplicitlySet) {
      // Children info is just the default - use legacy planning defaults (2 kids, ages "5, 3")
      return {
        childrenCurrentAges: "5, 3",
        numberOfChildren: 2,
        numberOfBeneficiaries: planConfig.numberOfBeneficiaries ?? 2, // Keep existing numberOfBeneficiaries or default
      };
    }

    if (numChildrenFromConfig === 0 && childAgesFromConfig.length === 0) {
      // User explicitly said 0 children
      return {
        childrenCurrentAges: "",
        numberOfChildren: 0,
        numberOfBeneficiaries: 0,
      };
    } else if (childAgesFromConfig.length > 0) {
      // Use actual children ages from wizard
      return {
        childrenCurrentAges: childAgesFromConfig.join(", "),
        numberOfChildren: childAgesFromConfig.length,
        numberOfBeneficiaries: childAgesFromConfig.length,
      };
    } else if (numChildrenFromConfig > 0) {
      // User specified number of children but no ages
      return {
        childrenCurrentAges: "5, 3", // Keep default display
        numberOfChildren: numChildrenFromConfig,
        numberOfBeneficiaries: numChildrenFromConfig,
      };
    }

    // Fallback to defaults
    return {
      childrenCurrentAges: "5, 3",
      numberOfChildren: 2,
      numberOfBeneficiaries: planConfig.numberOfBeneficiaries ?? 2,
    };
  }, [planConfig.fieldMetadata?.numChildren, planConfig.fieldMetadata?.childrenAges,
      planConfig.numChildren, planConfig.childrenAges, planConfig.numberOfBeneficiaries]);

  // Extract derived values for use throughout the component
  const childrenCurrentAges = derivedChildrenState.childrenCurrentAges;
  const numberOfChildren = derivedChildrenState.numberOfChildren;
  // Note: numberOfBeneficiaries is still controlled via planConfig, but we ensure it stays in sync
  // by updating it atomically when children are modified (see consolidated update below)

  // Legacy inputs (kept for backward compatibility with presets)
  // parentAgeAtFirstChild and childSpacingYears are only used for preset calculations
  const [parentAgeAtFirstChild, setParentAgeAtFirstChild] = useState(30);
  const [childSpacingYears, setChildSpacingYears] = useState(3);

  // Consolidated update function for children-related state
  // This replaces the useEffect cascade with atomic updates
  const updateChildrenConfig = useCallback((updates: {
    numChildren?: number;
    childrenAges?: number[];
  }) => {
    const newNumChildren = updates.numChildren ?? planConfig.numChildren ?? 0;
    const newChildAges = updates.childrenAges ?? planConfig.childrenAges ?? [];

    // Calculate numberOfBeneficiaries atomically with the children update
    let newHypStartBens = planConfig.numberOfBeneficiaries ?? 2;
    if (newChildAges.length > 0) {
      newHypStartBens = newChildAges.length;
    } else if (newNumChildren > 0) {
      newHypStartBens = newNumChildren;
    } else if (newNumChildren === 0 && newChildAges.length === 0) {
      newHypStartBens = 0;
    }

    // Single atomic update to planConfig - no cascade needed
    updatePlanConfig({
      numChildren: newNumChildren,
      childrenAges: newChildAges,
      numberOfBeneficiaries: newHypStartBens,
    }, 'user-entered');
    markDirty();
  }, [planConfig.numChildren, planConfig.childrenAges, planConfig.numberOfBeneficiaries, updatePlanConfig]);

  // Generational wealth demographic parameters - read from planConfig context
  const totalFertilityRate = planConfig.totalFertilityRate ?? 2.1; // Children per person (lifetime)
  const setTotalFertilityRate = (value: number) => { updatePlanConfig({ totalFertilityRate: value }, 'user-entered'); markDirty(); };
  const generationLength = planConfig.generationLength ?? 30; // Average age when having children
  const setGenerationLength = (value: number) => { updatePlanConfig({ generationLength: value }, 'user-entered'); markDirty(); };
  const fertilityWindowStart = planConfig.fertilityWindowStart ?? 20;
  const setFertilityWindowStart = (value: number) => { updatePlanConfig({ fertilityWindowStart: value }, 'user-entered'); markDirty(); };
  const fertilityWindowEnd = planConfig.fertilityWindowEnd ?? 45;
  const setFertilityWindowEnd = (value: number) => { updatePlanConfig({ fertilityWindowEnd: value }, 'user-entered'); markDirty(); };
  const hypDeathAge = planConfig.hypDeathAge ?? 90;
  const setHypDeathAge = (value: number) => { updatePlanConfig({ hypDeathAge: value }, 'user-entered'); markDirty(); };
  const hypMinDistAge = planConfig.hypMinDistAge ?? 18; // Minimum age to receive distributions
  const setHypMinDistAge = (value: number) => { updatePlanConfig({ hypMinDistAge: value }, 'user-entered'); markDirty(); };

  // Legacy state variables for backward compatibility with old simulation
  const [hypBirthMultiple, setHypBirthMultiple] = useState(1);
  const [hypBirthInterval, setHypBirthInterval] = useState(30);

  // Simulation Settings - synced to context
  const returnMode = planConfig.returnMode ?? 'randomWalk';
  const seed = planConfig.seed ?? 42;
  const randomWalkSeries = planConfig.randomWalkSeries ?? 'trulyRandom';

  const setReturnMode = (value: "fixed" | "randomWalk") => { updatePlanConfig({ returnMode: value }, 'user-entered'); markDirty(); };
  const setSeed = (value: number) => { updatePlanConfig({ seed: value }, 'user-entered'); markDirty(); };
  const setRandomWalkSeries = (value: "nominal" | "real" | "trulyRandom") => { updatePlanConfig({ randomWalkSeries: value }, 'user-entered'); markDirty(); };

  // Bond Glide Path Configuration - synced to context
  const allocationStrategy = planConfig.allocationStrategy ?? 'aggressive';
  const bondStartPct = planConfig.bondStartPct ?? 10;
  const bondEndPct = planConfig.bondEndPct ?? 60;
  const bondStartAge = planConfig.bondStartAge ?? age1;
  const bondEndAge = planConfig.bondEndAge ?? 75;
  const glidePathShape = planConfig.glidePathShape ?? 'linear';

  const setAllocationStrategy = (value: 'aggressive' | 'ageBased' | 'custom') => { updatePlanConfig({ allocationStrategy: value }, 'user-entered'); markDirty(); };
  const setBondStartPct = (value: number) => { updatePlanConfig({ bondStartPct: value }, 'user-entered'); markDirty(); };
  const setBondEndPct = (value: number) => { updatePlanConfig({ bondEndPct: value }, 'user-entered'); markDirty(); };
  const setBondStartAge = (value: number) => { updatePlanConfig({ bondStartAge: value }, 'user-entered'); markDirty(); };
  const setBondEndAge = (value: number) => { updatePlanConfig({ bondEndAge: value }, 'user-entered'); markDirty(); };
  const setGlidePathShape = (value: 'linear' | 'accelerated' | 'decelerated') => { updatePlanConfig({ glidePathShape: value }, 'user-entered'); markDirty(); };

  // NOTE: bondStartAge sync with age1 is now handled atomically in setAge1()
  // This eliminates the useEffect cascade that was causing unnecessary re-renders

  const [res, setRes] = useState<CalculationResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Track if inputs changed after calculation
  const [legacyResult, setLegacyResult] = useState<LegacyResult | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [guardrailsResult, setGuardrailsResult] = useState<GuardrailsResult | null>(null);
  const [rothResult, setRothResult] = useState<RothConversionResult | null>(null);

  // Refs for legacy card image download
  const legacyCardRefAllInOne = useRef<HTMLDivElement>(null!);
  const legacyCardRefLegacy = useRef<HTMLDivElement>(null!);

  // Build bond glide path configuration object
  const bondGlidePath: BondGlidePath | null = useMemo(() => {
    if (allocationStrategy === 'aggressive') {
      // 100% stocks, no bonds
      return null;
    }

    return {
      strategy: allocationStrategy,
      startAge: bondStartAge,
      endAge: bondEndAge,
      startPct: bondStartPct,
      endPct: bondEndPct,
      shape: glidePathShape,
    };
  }, [allocationStrategy, bondStartAge, bondEndAge, bondStartPct, bondEndPct, glidePathShape]);

  // Auto-calculate beneficiary ages based on user's age and family structure
  const hypBenAgesStr = useMemo(() => {
    const olderAge = Math.max(age1, age2);
    const yearsUntilDeath = hypDeathAge - olderAge;

    // Parse current children ages from comma-separated string
    const currentAges = childrenCurrentAges
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 0);

    // Calculate current children at time of death
    const currentChildrenAtDeath = currentAges.map(age => age + yearsUntilDeath);

    // Calculate additional children (assume 2-year birth intervals)
    const additionalChildrenAtDeath: number[] = [];
    for (let i = 0; i < additionalChildrenExpected; i++) {
      const birthYear = (i + 1) * 2; // Born in 2, 4, 6 years, etc.
      const ageAtDeath = yearsUntilDeath - birthYear;
      if (ageAtDeath > 0 && ageAtDeath < hypDeathAge) {
        additionalChildrenAtDeath.push(ageAtDeath);
      }
    }

    // Combine all children ages at death
    const allChildrenAges = [...currentChildrenAtDeath, ...additionalChildrenAtDeath]
      .filter(age => age > 0 && age < hypDeathAge);

    return allChildrenAges.length > 0 ? allChildrenAges.join(', ') : '';
  }, [childrenCurrentAges, additionalChildrenExpected, hypDeathAge, age1, age2]);

  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [olderAgeForAnalysis, setOlderAgeForAnalysis] = useState<number>(0);

  /** Type for sensitivity analysis variation data point */
  interface SensitivityVariation {
    label: string;
    high: number;
    low: number;
    range: number;
  }
  /** Type for complete sensitivity analysis result */
  interface SensitivityAnalysisData {
    baseline: number;
    variations: SensitivityVariation[];
  }
  // Sensitivity analysis and scenario comparison
  const [sensitivityData, setSensitivityData] = useState<SensitivityAnalysisData | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showBearMarket, setShowBearMarket] = useState(false);
  // Scenario Testing - synced to context
  const historicalYear = planConfig.historicalYear ?? null;
  const inflationShockRate = planConfig.inflationShockRate ?? 0; // elevated inflation % - default 0 means no shock
  const inflationShockDuration = planConfig.inflationShockDuration ?? 5; // years

  const setHistoricalYear = (value: number | null) => { updatePlanConfig({ historicalYear: value ?? undefined }, 'user-entered'); markDirty(); };
  const setInflationShockRate = (value: number) => { updatePlanConfig({ inflationShockRate: value }, 'user-entered'); markDirty(); };
  const setInflationShockDuration = (value: number) => { updatePlanConfig({ inflationShockDuration: value }, 'user-entered'); markDirty(); };

  const [scenarioName, setScenarioName] = useState<string>("");
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Inflation shock scenarios UI state (not persisted)
  const [showInflationShock, setShowInflationShock] = useState(false);

  // Estate tax sunset assumption (TCJA expires after 2025)
  const [assumeTaxCutsExtended, setAssumeTaxCutsExtended] = useState(false); // Default: assume sunset happens

  // Scenario comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);

  // Portfolio Stress Tests master card
  const [showStressTests, setShowStressTests] = useState(true);
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    baseline: null,
    bearMarket: null,
    inflation: null,
  });

  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [showP10, setShowP10] = useState(false); // Show 10th percentile line
  const [showP90, setShowP90] = useState(false); // Show 90th percentile line
  const [resultsViewMode, setResultsViewMode] = useState<'quick' | 'detailed'>('detailed');
  const [showBackToTop, setShowBackToTop] = useState(false); // Show back-to-top button after scrolling
  const [activeChartTab, setActiveChartTab] = useState("accumulation"); // Track active chart tab
  // NOTE: Brand loader is disabled - these are constants now (not useState)
  // to avoid unnecessary state and re-renders
  const loaderComplete = true;
  const loaderHandoff = true;
  const cubeAppended = true;

  // Tabbed interface state - foundation for future reorganization
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>('all');
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [inputsModified, setInputsModified] = useState(false);
  const [isFromWizard, setIsFromWizard] = useState(false); // Track if calculation triggered from wizard completion
  const [calcPending, setCalcPending] = useState(false); // Deferred calc trigger — replaces setTimeout race condition

  // Callback for URL tab sync - wrapped in useCallback to prevent unnecessary re-renders
  const handleURLTabChange = useCallback((tab: MainTabId) => {
    setActiveMainTab(tab);
  }, []);

  // Callback for tracking input changes
  const handleInputChange = useCallback(() => {
    setInputsModified(true);
  }, []);

  // Fix #4: Input Consistency - Auto-update fertility windows when generation length changes
  const handleGenerationLengthChange = useCallback((newGenLen: number) => {
    setGenerationLength(newGenLen);
    setFertilityWindowStart(newGenLen - 5);
    setFertilityWindowEnd(newGenLen + 5);
    handleInputChange(); // Mark inputs as modified
  }, [handleInputChange]);

  const resRef = useRef<HTMLDivElement | null>(null);
  const genRef = useRef<HTMLDivElement | null>(null);
  const monteCarloRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const tabGroupRef = useRef<TabGroupRef>(null);
  const splashRef = useRef<CyberpunkSplashHandle>(null);

  // State for tracking simulation progress
  const [calcProgress, setCalcProgress] = useState<CalculationProgress | null>(null);

  // TRUE SIDE EFFECT: Web Worker lifecycle management
  // Web Workers are external browser resources that must be initialized and
  // cleaned up via side effects. This cannot be derived state.
  useEffect(() => {
    console.log('[WORKER] Initializing web worker...');
    try {
      workerRef.current = new Worker('/monte-carlo-worker.js');
      console.log('[WORKER] Web worker initialized successfully');

      // Add global error handler
      workerRef.current.onerror = (error) => {
        console.error('[WORKER] Worker global error:', error);
      };
    } catch (error) {
      console.error('[WORKER] Failed to initialize worker:', error);
    }

    return () => {
      if (workerRef.current) {
        console.log('[WORKER] Terminating web worker');
        workerRef.current.terminate();
      }
    };
  }, []);

  // TRUE SIDE EFFECT: DOM class manipulation
  // Directly modifies the document element outside React's virtual DOM,
  // necessary for CSS dark mode class toggling at the root level.
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // TRUE SIDE EFFECT: Window scroll event subscription
  // Subscribes to browser scroll events outside React's control to show/hide
  // the back-to-top button based on scroll position.
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMar = useMemo(() => marital === "married", [marital]);
  const total = useMemo(() => taxableBalance + pretaxBalance + rothBalance, [taxableBalance, pretaxBalance, rothBalance]);

  // Memoize formatters to avoid recreating on every render
  const formatters = useMemo(() => ({
    currency: (val: number) => val.toLocaleString('en-US'),
    percentage: (val: number) => val.toFixed(1),
    whole: (val: number) => Math.round(val),
    decimal: (val: number, places: number) => val.toFixed(places),
  }), []);

  // Memoize formatted results to avoid expensive toLocaleString calls
  const formattedResults = useMemo(() => {
    if (!res) return null;
    return {
      finNom: fmt(res.finNom),
      finReal: fmt(res.finReal),
      wd: fmt(res.wd),
      wdAfter: fmt(res.wdAfter),
      wdReal: fmt(res.wdReal),
      eol: fmt(res.eol),
      eolReal: fmt(res.eolReal),  // Real (inflation-adjusted) EOL
      estateTax: fmt(res.estateTax),
      netEstate: fmt(res.netEstate),
      totalRMDs: fmt(res.totalRMDs),
      fedOrd: fmt(res.tax.fedOrd),
      fedCap: fmt(res.tax.fedCap),
      niit: fmt(res.tax.niit),
      state: fmt(res.tax.state),
      tot: fmt(res.tax.tot),
    };
  }, [res]);

  // Memoize chart data splits for accumulation and drawdown phases
  const chartData = useMemo(() => {
    if (!res?.data || res.data.length === 0) return null;
    return {
      accumulation: res.data.slice(0, res.yrsToRet + 1),
      drawdown: res.data.slice(res.yrsToRet),
      full: res.data,
    };
  }, [res?.data, res?.yrsToRet]);

  // Memoize net worth comparison calculation
  const netWorthComparison = useMemo(() => {
    if (!res || !age1) return null;
    const bracket = getNetWorthBracket(age1);
    const multiple = res.finReal / bracket.median;
    return {
      bracket,
      percentile: res.finReal > bracket.median ? "above" : "below",
      multiple: multiple.toFixed(1),
      difference: fmt(Math.abs(res.finReal - bracket.median)),
    };
  }, [res?.finReal, age1]);

  // Simple cache for AI Q&A responses (24 hour TTL, max 50 entries with LRU eviction)
  const aiCache = useRef<Map<string, { response: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const MAX_CACHE_SIZE = 50;

  const getCacheKey = (question: string, calcResult: CalculationResult): string => {
    // Create a hash from key parameters + question
    // Include all parameters that could affect the AI response to avoid stale cache
    const keyData = {
      q: question.toLowerCase().trim(),
      // Core result metrics
      bal: Math.round(calcResult.finReal / 1000), // Round to nearest $1k
      wd: Math.round(calcResult.wdReal / 100), // Round to nearest $100
      estate: Math.round((calcResult.estateTax || 0) / 10000), // Round to nearest $10k
      prob: calcResult.probRuin !== undefined ? Math.round(calcResult.probRuin * 100) : 0,
      eol: Math.round(calcResult.eolReal / 1000), // End of life wealth
      // Key input parameters that affect advice
      age: retirementAge,
      marital,
      wdRate: Math.round(wdRate * 10), // Withdrawal rate (1 decimal precision)
      retRate: Math.round(retRate * 10), // Return rate
      inflationRate: Math.round(inflationRate * 10), // Inflation rate
      includeSS: includeSS ? 1 : 0,
      // Contribution totals (rounded)
      contrib: Math.round((cTax1 + cPre1 + cPost1 + cTax2 + cPre2 + cPost2) / 1000),
    };
    return JSON.stringify(keyData);
  };

  const getCachedResponse = (cacheKey: string): string | null => {
    const cached = aiCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Update timestamp for LRU tracking
      cached.timestamp = Date.now();
      return cached.response;
    }
    if (cached) {
      // Expired, remove it
      aiCache.current.delete(cacheKey);
    }
    return null;
  };

  const setCachedResponse = (cacheKey: string, response: string): void => {
    // If cache is at max size, remove least recently used entry
    if (aiCache.current.size >= MAX_CACHE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      aiCache.current.forEach((value, key) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      });
      if (oldestKey) {
        aiCache.current.delete(oldestKey);
      }
    }
    aiCache.current.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  };

  // Generate local insights using templates (no API call needed)
  const generateLocalInsight = (calcResult: CalculationResult, olderAge: number): string => {
    if (!calcResult) return "";

    const probability = calcResult.probRuin !== undefined ? Math.round((1 - calcResult.probRuin) * 100) : 100;
    const endAge = retirementAge + calcResult.survYrs;
    const estateTax = calcResult.estateTax || 0;
    const hasRMDs = (calcResult.totalRMDs || 0) > 0;
    const eolWealth = calcResult.eol;
    const withdrawalRate = wdRate;
    const afterTaxIncome = calcResult.wdReal;
    const survivalYears = calcResult.survYrs;
    const targetYears = calcResult.yrsToSim;

    let analysis = "";

    // Success/Risk Assessment
    if (survivalYears < targetYears) {
      const shortfallYears = targetYears - survivalYears;
      analysis += `⚠️ Your retirement plan shows a critical funding gap. Based on your current withdrawal rate of ${withdrawalRate}%, funds are projected to be exhausted after ${survivalYears} years (age ${endAge}), which is ${shortfallYears} years short of your planning horizon.\n\n`;
      analysis += `Consider reducing your withdrawal rate, increasing savings before retirement, or adjusting your retirement age to ensure long-term sustainability.\n\n`;
    } else if (probability >= 95) {
      analysis += `Your retirement plan demonstrates excellent financial security with a ${probability}% success probability. Funds are projected to last through age ${endAge} and beyond.\n\n`;
    } else if (probability >= 85) {
      analysis += `Your retirement plan shows strong financial security with a ${probability}% success probability. Funds are projected to last through age ${endAge}.\n\n`;
    } else if (probability >= 70) {
      analysis += `Your retirement plan shows moderate financial security with a ${probability}% success probability. Consider strategies to improve your success rate for greater peace of mind.\n\n`;
    } else {
      analysis += `Your retirement plan shows elevated risk with a ${probability}% success probability. Consult with a financial advisor to strengthen your plan.\n\n`;
    }

    // Withdrawal Rate Guidance
    if (withdrawalRate <= 3) {
      analysis += `Your ${withdrawalRate}% withdrawal rate is very conservative, providing strong longevity protection and potential for wealth growth.\n\n`;
    } else if (withdrawalRate <= 4) {
      analysis += `Your ${withdrawalRate}% withdrawal rate aligns with traditional safe withdrawal guidelines, balancing income needs with portfolio preservation.\n\n`;
    } else if (withdrawalRate <= 5) {
      analysis += `Your ${withdrawalRate}% withdrawal rate is moderately aggressive. Monitor your plan annually and be prepared to adjust spending if market conditions decline.\n\n`;
    } else {
      analysis += `Your ${withdrawalRate}% withdrawal rate is quite aggressive and may pose longevity risk. Consider reducing withdrawals or exploring ways to supplement retirement income.\n\n`;
    }

    // Estate Tax Planning
    if (estateTax > 1000000) {
      analysis += `⚡ Significant Estate Tax Impact: Your projected estate of $${eolWealth.toLocaleString()} will incur approximately $${estateTax.toLocaleString()} in federal estate taxes. `;
      analysis += `Strategic gifting, charitable giving, or trust structures could help preserve more wealth for your heirs. This is complex - consult with an estate planning attorney.\n\n`;
    } else if (estateTax > 100000) {
      analysis += `Your estate is projected to incur $${estateTax.toLocaleString()} in federal estate taxes. Consider estate planning strategies to reduce this burden.\n\n`;
    }

    // RMD Analysis
    if (hasRMDs) {
      const totalRMDs = calcResult.totalRMDs;
      analysis += `Required Minimum Distributions (RMDs) starting at age 73 will require you to withdraw $${totalRMDs.toLocaleString()} from pre-tax accounts over your retirement. These mandatory withdrawals may push you into higher tax brackets. `;
      if (olderAge < 60) {
        analysis += `Since you're currently ${olderAge}, consider Roth conversion strategies during lower-income years to reduce future RMD impact.\n\n`;
      } else {
        analysis += `Qualified Charitable Distributions (QCDs) can help manage RMD tax impact if you're charitably inclined.\n\n`;
      }
    }

    // Income Adequacy
    const monthlyIncome = Math.round(afterTaxIncome / 12);
    analysis += `Your projected after-tax retirement income of $${afterTaxIncome.toLocaleString()}/year ($${monthlyIncome.toLocaleString()}/month) will determine your lifestyle in retirement.`;
    if (includeSS) {
      analysis += ` This includes Social Security benefits.`;
    }

    return analysis.trim();
  };

  const fetchAiInsight = useCallback(async (calcResult: CalculationResult, olderAge: number, customQuestion?: string) => {
    if (!calcResult) return;

    // Only use API for custom questions (Q&A feature)
    // Auto-generated insights are now handled locally
    if (!customQuestion || !customQuestion.trim()) {
      return;
    }

    setIsLoadingAi(true);
    setAiInsight("");
    setAiError(null);

    try {
      // Check cache first
      const cacheKey = getCacheKey(customQuestion, calcResult);
      const cachedResponse = getCachedResponse(cacheKey);

      if (cachedResponse) {
        setAiInsight(cachedResponse);
        setIsLoadingAi(false);
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: olderAge,
          retirementAge: retirementAge,
          currentBalance: total,
          futureBalance: calcResult.finNom,
          realBalance: calcResult.finReal,
          annualWithdrawal: calcResult.wd,
          afterTaxIncome: calcResult.wdReal,
          duration: calcResult.survYrs,
          maxDuration: calcResult.yrsToSim,
          endOfLifeWealth: calcResult.eol,
          totalTax: calcResult.tax.tot,
          maritalStatus: marital,
          withdrawalRate: wdRate,
          returnRate: retRate,
          inflationRate: inflationRate,
          stateRate: stateRate,
          // Advanced features
          totalRMDs: calcResult.totalRMDs || 0,
          estateTax: calcResult.estateTax || 0,
          netEstate: calcResult.netEstate || 0,
          eolAccounts: calcResult.eolAccounts,
          includeSS,
          ssIncome: includeSS ? ssIncome : 0,
          ssClaimAge: includeSS ? ssClaimAge : 0,
          // Account allocation
          startingTaxable: taxableBalance,
          startingPretax: pretaxBalance,
          startingRoth: rothBalance,
          // Contribution details
          totalContributions: calcResult.totC,
          returnModel: returnMode,
          // User question
          userQuestion: customQuestion,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setAiError(data.error);
        // Still show the insight message even if there's an error (helpful message)
        if (data.insight) {
          setAiInsight(data.insight);
        }
      } else {
        setAiInsight(data.insight);
        // Cache the successful response
        setCachedResponse(cacheKey, data.insight);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch AI insight:', error);
      setAiError('Network error');
      setAiInsight('Unable to connect to AI analysis service. Please check your internet connection.');
    } finally {
      setIsLoadingAi(false);
    }
  }, [retirementAge, total, marital, wdRate, retRate, inflationRate, stateRate, includeSS, ssIncome, ssClaimAge, taxableBalance, pretaxBalance, rothBalance, returnMode]);

  const handleAskQuestion = async () => {
    if (!userQuestion.trim() || !res) {
      return;
    }

    const older = Math.max(age1, isMar ? age2 : age1);
    await fetchAiInsight(res, older, userQuestion);
  };

  // Helper to ask a pre-filled question
  const askExplainQuestion = async (question: string) => {
    if (!res) return;

    setUserQuestion(question);
    const older = Math.max(age1, isMar ? age2 : age1);
    await fetchAiInsight(res, older, question);

    // Scroll to the insight box
    setTimeout(() => {
      resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Helper function to run Monte Carlo simulation via web worker
  const runMonteCarloViaWorker = useCallback((inputs: Inputs, baseSeed: number, N: number = 2000): Promise<BatchSummary> => {
    return new Promise((resolve, reject) => {
      console.log('[WORKER] Starting runMonteCarloViaWorker...');
      if (!workerRef.current) {
        console.error('[WORKER] Worker not initialized!');
        reject(new Error("Worker not initialized"));
        return;
      }

      const worker = workerRef.current;
      console.log('[WORKER] Worker exists, setting up message handler');

      const handleMessage = (e: MessageEvent) => {
        if (!e.data) return;

        const { type, result, completed, total, error } = e.data;
        console.log('[WORKER] Received message:', { type, completed, total, hasResult: !!result, error });

        if (type === 'progress') {
          const percent = Math.round((completed / total) * 100);
          setCalcProgress({
            phase: 'monteCarlo',
            percent,
            message: `Running Monte Carlo simulation... ${completed} / ${total}`
          });
        } else if (type === 'complete') {
          console.log('[WORKER] Worker complete! Resolving promise...');
          setCalcProgress(null);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(result);
        } else if (type === 'error') {
          console.error('[WORKER] Worker error:', error);
          setCalcProgress(null);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(error));
        }
      };

      const handleError = (e: ErrorEvent) => {
        console.error('[WORKER] Worker error event:', e);
        setCalcProgress(null);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker error: ${e.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      console.log('[WORKER] Posting message to worker with N=', N);
      worker.postMessage({ type: 'run', params: inputs, baseSeed, N });
    });
  }, []);

  /**
   * Run legacy simulation via web worker (offloads 10,000-year simulation)
   */
  const runLegacyViaWorker = useCallback((params: {
    eolNominal: number;
    yearsFrom2025: number;
    nominalRet: number;
    inflPct: number;
    perBenReal: number;
    startBens: number;
    totalFertilityRate: number;
    generationLength?: number;
    deathAge?: number;
    minDistAge?: number;
    capYears?: number;
    initialBenAges?: number[];
    fertilityWindowStart?: number;
    fertilityWindowEnd?: number;
    marital?: string;
  }): Promise<{ years: number; fundLeftReal: number; lastLivingCount: number; generationData?: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const worker = workerRef.current;
      // Generate unique request ID to match response
      const requestId = `legacy_${Date.now()}_${Math.random()}`;

      const handleMessage = (e: MessageEvent) => {
        if (!e.data) return;

        const { type, result, error, requestId: responseId } = e.data;

        // Only process messages for this specific request
        if (type === 'legacy-complete' && responseId === requestId) {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(result);
        } else if (type === 'error' && responseId === requestId) {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(error));
        }
      };

      const handleError = (e: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker error: ${e.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage({ type: 'legacy', params, requestId });
    });
  }, []);

  /**
   * Run guardrails analysis to show impact of spending flexibility
   */
  const runGuardrailsAnalysis = useCallback((batchData: BatchSummary, spendingReduction: number = 0.10) => {
    if (!workerRef.current || !batchData || !batchData.allRuns) {
      console.warn('[GUARDRAILS] Cannot run analysis - missing worker or data');
      return;
    }

    const worker = workerRef.current;

    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;

      const { type, result, error } = e.data;

      if (type === 'guardrails-complete') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        setGuardrailsResult(result);
        console.log('[GUARDRAILS] Analysis complete:', result);
      } else if (type === 'error') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        console.error('[GUARDRAILS] Error:', error);
        setGuardrailsResult(null);
      }
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      console.error('[GUARDRAILS] Worker error:', e.message);
      setGuardrailsResult(null);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'guardrails',
      params: {
        allRuns: batchData.allRuns,
        spendingReduction,
      }
    });
  }, []);

  /**
   * Run Roth conversion optimizer analysis
   * Calculates optimal Roth conversion strategy to minimize lifetime taxes
   */
  const runRothOptimizer = useCallback((result: CalculationResult) => {
    if (!workerRef.current || !result) {
      console.warn('[ROTH-OPT] Cannot run analysis - missing worker or data');
      return;
    }

    // Only run if user has pre-tax balance and is below RMD age
    const { finNom, eolAccounts } = result;
    const pretaxBalance = eolAccounts?.pretax || 0;

    if (pretaxBalance <= 0) {
      console.log('[ROTH-OPT] Skipping - no pre-tax balance');
      setRothResult(null);
      return;
    }

    if (retirementAge >= RMD_START_AGE) {
      console.log('[ROTH-OPT] Skipping - already at or past RMD age');
      setRothResult(null);
      return;
    }

    const worker = workerRef.current;

    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;

      const { type, result: optimizerResult, error } = e.data;

      if (type === 'roth-optimizer-complete') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        setRothResult(optimizerResult);
        console.log('[ROTH-OPT] Analysis complete:', optimizerResult);
      } else if (type === 'error') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        console.error('[ROTH-OPT] Error:', error);
        setRothResult(null);
      }
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      console.error('[ROTH-OPT] Worker error:', e.message);
      setRothResult(null);
    };

    // Calculate SS income for tax planning
    const ssAnnualIncome = includeSS ? (ssIncome || 0) + (isMar ? (ssIncome2 || 0) : 0) : 0;

    // Estimate annual withdrawal (use wdRate on retirement balance)
    const annualWithdrawal = finNom * (wdRate / 100);

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      type: 'roth-optimizer',
      params: {
        retirementAge,
        pretaxBalance,
        marital,
        ssIncome: ssAnnualIncome,
        annualWithdrawal,
        targetBracket: 0.24,  // Default to 24% bracket
        growthRate: retRate / 100,
      }
    });
  }, [retirementAge, marital, includeSS, ssIncome, ssIncome2, isMar, wdRate, retRate]);

  /**
   * Run comparison between baseline and selected scenarios
   * Merges comparison data onto existing res.data to preserve bal, real, p10, p90 keys
   * Accepts optional overrides for scenario values to avoid stale closure issues
   */
  const runComparison = useCallback(async (overrides?: {
    historicalYear?: number | null;
    inflationShockRate?: number;
    inflationShockDuration?: number;
  }) => {
    if (!comparisonMode || !res?.data) return;

    // Use overrides if provided, otherwise fall back to state values
    const effectiveHistoricalYear = overrides?.historicalYear !== undefined ? overrides.historicalYear : historicalYear;
    const effectiveInflationRate = overrides?.inflationShockRate !== undefined ? overrides.inflationShockRate : inflationShockRate;
    const effectiveInflationDuration = overrides?.inflationShockDuration !== undefined ? overrides.inflationShockDuration : inflationShockDuration;

    setErr(null);
    const younger = Math.min(age1, isMar ? age2 : age1);
    const yrsToRet = retirementAge - younger;

    try {
      // Prepare baseline inputs
      const baseInputs = {
        marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
        cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
        retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
        returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        historicalYear: undefined,
        inflationShockRate: null,
        inflationShockDuration: 5,
      };

      // Calculate baseline
      const baselineResult = runSingleSimulation(baseInputs, seed);

      // Calculate bear market scenario if specified
      let bearData = null;
      if (effectiveHistoricalYear) {
        const bearInputs = { ...baseInputs, historicalYear: effectiveHistoricalYear };
        const bearResult = runSingleSimulation(bearInputs, seed);
        bearData = bearResult.balancesReal;
      }

      // Calculate inflation shock scenario if specified
      let inflationData = null;
      if (effectiveInflationRate > 0) {
        const inflationInputs = {
          ...baseInputs,
          inflationShockRate: effectiveInflationRate,
          inflationShockDuration: effectiveInflationDuration
        };
        const inflationResult = runSingleSimulation(inflationInputs, seed);
        inflationData = inflationResult.balancesReal;
      }

      // Merge comparison data onto existing res.data structure
      // This preserves bal, real, p10, p90 while adding baseline, bearMarket, inflation
      const mergedData = res.data.map((row, i) => ({
        ...row, // Keep year, a1, a2, bal, real, p10, p90, etc.
        baseline: baselineResult.balancesReal[i],
        bearMarket: bearData ? bearData[i] : undefined,
        inflation: inflationData ? inflationData[i] : undefined,
      }));

      // Update comparison state
      setComparisonData({
        baseline: {
          data: mergedData,
          visible: true,
          label: "Baseline",
        },
        bearMarket: effectiveHistoricalYear ? {
          data: mergedData,
          visible: true,
          label: BEAR_MARKET_SCENARIOS.find(s => s.year === effectiveHistoricalYear)?.label || `${effectiveHistoricalYear} Crash`,
          year: effectiveHistoricalYear,
        } : null,
        inflation: effectiveInflationRate > 0 ? {
          data: mergedData,
          visible: true,
          label: `${effectiveInflationRate}% Inflation (${effectiveInflationDuration}yr)`,
          rate: effectiveInflationRate,
          duration: effectiveInflationDuration,
        } : null,
      });

    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [comparisonMode, res, age1, age2, retirementAge, marital, taxableBalance, pretaxBalance, rothBalance, cTax1, cPre1, cPost1, cMatch1,
      cTax2, cPre2, cPost2, cMatch2, retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
      returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      historicalYear, inflationShockRate, inflationShockDuration, seed, isMar]);

  /**
   * Run comparison with randomly selected bear market and inflation shock scenarios
   */
  const runRandomComparison = useCallback(() => {
    // Randomly select a bear market scenario
    const randomBearScenario = BEAR_MARKET_SCENARIOS[Math.floor(Math.random() * BEAR_MARKET_SCENARIOS.length)];

    // Randomly select an inflation shock scenario
    const randomInflationScenario = INFLATION_SHOCK_SCENARIOS[Math.floor(Math.random() * INFLATION_SHOCK_SCENARIOS.length)];

    // Set the states for UI display
    setHistoricalYear(randomBearScenario.year);
    setInflationShockRate(randomInflationScenario.rate);
    setInflationShockDuration(randomInflationScenario.duration);
    setComparisonMode(true);

    // Pass values directly to runComparison to avoid stale closure issues
    runComparison({
      historicalYear: randomBearScenario.year,
      inflationShockRate: randomInflationScenario.rate,
      inflationShockDuration: randomInflationScenario.duration,
    });
  }, [runComparison]);

  /**
   * Calculate legacy result from calculation results
   * This generates the LegacyResult object for Apple Wallet pass and legacy cards
   */
  const calculateLegacyResult = useCallback((calcResult: CalculationResult | null): LegacyResult | null => {
    if (!calcResult || !calcResult.genPayout) return null;

    const isPerpetual =
      calcResult.genPayout.p10?.isPerpetual === true &&
      calcResult.genPayout.p50?.isPerpetual === true &&
      calcResult.genPayout.p90?.isPerpetual === true;

    const explanationText = isPerpetual
      ? `Each beneficiary receives ${fmt(calcResult.genPayout.perBenReal)}/year (inflation-adjusted) from age ${hypMinDistAge} to ${hypDeathAge}—equivalent to a ${fmt(calcResult.genPayout.perBenReal * 25)} trust fund. This provides lifelong financial security and freedom to pursue any career path.`
      : `Each beneficiary receives ${fmt(calcResult.genPayout.perBenReal)}/year (inflation-adjusted) for ${calcResult.genPayout.years} years, providing substantial financial support during their lifetime.`;

    return {
      legacyAmount: calcResult.genPayout.perBenReal,
      legacyAmountDisplay: fmt(calcResult.genPayout.perBenReal),
      legacyType: isPerpetual ? "Perpetual Legacy" : "Finite Legacy",
      withdrawalRate: wdRate / 100, // Convert percentage to decimal
      successProbability: calcResult.genPayout.probPerpetual || 0,
      explanationText,
    };
  }, [hypMinDistAge, hypDeathAge, wdRate]);

  // Generational wealth preset configurations
  const applyGenerationalPreset = useCallback((preset: 'conservative' | 'moderate' | 'aggressive') => {
    // Enable generational modeling when a preset is selected
    setShowGen(true);
    switch (preset) {
      case 'conservative':
        setHypPerBen(75_000);
        setNumberOfBeneficiaries(2);
        setTotalFertilityRate(1.5); // Slow growth
        setGenerationLength(32);
        setFertilityWindowStart(27);
        setFertilityWindowEnd(37);
        // Update legacy values for backward compatibility
        setHypBirthMultiple(1.5);
        setHypBirthInterval(32);
        break;
      case 'moderate':
        setHypPerBen(100_000);
        setNumberOfBeneficiaries(2);
        setTotalFertilityRate(2.1); // Replacement rate
        setGenerationLength(30);
        setFertilityWindowStart(25);
        setFertilityWindowEnd(35);
        // Update legacy values for backward compatibility
        setHypBirthMultiple(2.1);
        setHypBirthInterval(30);
        break;
      case 'aggressive':
        setHypPerBen(150_000);
        setNumberOfBeneficiaries(3);
        setTotalFertilityRate(2.5); // Fast growth
        setGenerationLength(28);
        setFertilityWindowStart(23);
        setFertilityWindowEnd(33);
        // Update legacy values for backward compatibility
        setHypBirthMultiple(2.5);
        setHypBirthInterval(28);
        break;
    }
  }, [setShowGen]);

  // TRUE SIDE EFFECT: localStorage read on mount
  // localStorage is a browser API that exists outside React's control.
  // This hydrates component state from persisted user preferences.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wdr_results_view_mode');
      if (saved === 'quick' || saved === 'detailed') {
        setResultsViewMode(saved);
      }
    }
  }, []);

  // TRUE SIDE EFFECT: localStorage write on state change
  // Persists user preference to browser storage for cross-session persistence.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wdr_results_view_mode', resultsViewMode)
    }
  }, [resultsViewMode]);

  const calc = useCallback(async (optionsOrEvent?: { forceShowGen?: boolean } | React.MouseEvent) => {
    console.log('[CALC] Starting calculation...');
    // Allow forcing showGen to true for Legacy tab calculations
    // Check if it's an options object (has forceShowGen) or a mouse event (has target)
    const options = optionsOrEvent && 'forceShowGen' in optionsOrEvent ? optionsOrEvent : undefined;
    const effectiveShowGen = options?.forceShowGen ?? showGen;
    setErr(null);
    setAiInsight("");
    setAiError(null);
    setIsLoadingAi(true);
    setIsRunning(true);

    // Start cinematic Monte Carlo sequence from All-in-One, Configure tabs, or Wizard completion
    if (activeMainTab === 'all' || activeMainTab === 'configure' || isFromWizard) {
      console.log('[CALC] Playing splash animation');
      splashRef.current?.play();
    }

    // Clear any existing stress test comparison data
    setComparisonData({
      baseline: null,
      bearMarket: null,
      inflation: null,
    });
    setComparisonMode(false);
    setShowBearMarket(false);
    setShowInflationShock(false);

    // Close all form tabs when calculation starts
    tabGroupRef.current?.closeAll();

    let newRes: CalculationResult | null = null;
    let olderAgeForAI: number = 0;

    let currentSeed = seed;
    if (randomWalkSeries === 'trulyRandom') {
      currentSeed = Math.floor(Math.random() * 1000000);
      setSeed(currentSeed);
      console.log('[CALC] Using Monte Carlo mode with seed:', currentSeed);
    }

    try {
      console.log('[CALC] Validating inputs...');
      // Comprehensive input validation with specific error messages
      const validationResult = validateCalculatorInputs({
        age1,
        age2: isMar ? age2 : undefined,
        retirementAge,
        taxableBalance,
        pretaxBalance,
        rothBalance,
        cTax1,
        cPre1,
        cPost1,
        cMatch1,
        cTax2: isMar ? cTax2 : undefined,
        cPre2: isMar ? cPre2 : undefined,
        cPost2: isMar ? cPost2 : undefined,
        cMatch2: isMar ? cMatch2 : undefined,
        wdRate,
        retRate,
        inflationRate,
        stateRate,
        marital
      });

      if (!validationResult.isValid) {
        console.error('[CALC] Validation failed:', validationResult.error);
        throw new Error(validationResult.error);
      }

      console.log('[CALC] Validation passed, starting calculation...');

      const younger = Math.min(age1, isMar ? age2 : age1);
      const older = Math.max(age1, isMar ? age2 : age1);
      olderAgeForAI = older;

      const yrsToRet = retirementAge - younger;
      const infl = inflationRate / 100;

      const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

      // ========================================
      // UNIFIED CALCULATION ENGINE
      // All modes now use the web worker for consistency
      // Monte Carlo: N=1000, Deterministic: N=1
      // ========================================

      // Calculate initial asset allocation ratios for accurate RMD estimation
      const initialTotal = taxableBalance + pretaxBalance + rothBalance;
      const initialPretaxRatio = initialTotal > 0 ? pretaxBalance / initialTotal : 0.5; // Default to 50% if no savings
      const initialTaxableRatio = initialTotal > 0 ? taxableBalance / initialTotal : 0.3;
      const initialRothRatio = initialTotal > 0 ? rothBalance / initialTotal : 0.2;
      console.log('[CALC] Initial asset allocation ratios - Pretax:', initialPretaxRatio.toFixed(2),
                  'Taxable:', initialTaxableRatio.toFixed(2), 'Roth:', initialRothRatio.toFixed(2));

      // Determine simulation count based on mode
      const simCount = randomWalkSeries === 'trulyRandom' ? 1000 : 1;
      console.log('[CALC] Running', simCount, 'simulation(s) via web worker for mode:', randomWalkSeries);

      console.log('[CALC] Worker ref exists:', !!workerRef.current);
      const inputs: Inputs = {
        // Personal & Family
        marital, age1, age2, retirementAge,
        numChildren, childrenAges, additionalChildrenExpected,
        // Employment & Income
        employmentType1, employmentType2, primaryIncome, spouseIncome,
        // Account Balances
        emergencyFund, taxableBalance, pretaxBalance, rothBalance,
        // Contributions
        cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
        // Rates & Assumptions
        retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
        returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        historicalYear: historicalYear || undefined,
        inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
        inflationShockDuration,
        dividendYield, // Annual dividend yield for taxable accounts (yield drag)
        // Healthcare costs
        includeMedicare,
        medicarePremium,
        medicalInflation,
        irmaaThresholdSingle,
        irmaaThresholdMarried,
        irmaaSurcharge,
        includeLTC,
        ltcAnnualCost,
        ltcProbability,
        ltcDuration,
        ltcOnsetAge,
        ltcAgeRangeStart,
        ltcAgeRangeEnd,
        // Roth conversion strategy
        enableRothConversions,
        targetConversionBracket,
        // Bond glide path
        bondGlidePath,
      };

      console.log('[CALC] Calling web worker with inputs...');
      let batchSummary;
      try {
        batchSummary = await runMonteCarloViaWorker(inputs, currentSeed, simCount);
          console.log('[CALC] Web worker completed successfully, batch summary:', batchSummary);
          console.log('[CALC] p50BalancesReal length:', batchSummary?.p50BalancesReal?.length);
          console.log('[CALC] p10BalancesReal length:', batchSummary?.p10BalancesReal?.length);
          console.log('[CALC] p90BalancesReal length:', batchSummary?.p90BalancesReal?.length);
          console.log('[CALC] y1AfterTaxReal_p50:', batchSummary?.y1AfterTaxReal_p50);
          console.log('[CALC] eolReal_p50:', batchSummary?.eolReal_p50);
          console.log('[CALC] probRuin:', batchSummary?.probRuin);
        } catch (workerError) {
          console.error('[CALC] Worker failed with error:', workerError);
          throw workerError; // Re-throw to be caught by outer catch
        }

        // Validate batch summary has required data
        if (!batchSummary || !batchSummary.p50BalancesReal || batchSummary.p50BalancesReal.length === 0) {
          console.error('[CALC] Invalid batch summary received:', batchSummary);
          throw new Error('Monte Carlo simulation returned invalid results');
        }

        console.log('[CALC] Starting data reconstruction...');
        // Reconstruct data array from batch summary percentile balances
        const data: any[] = [];
        for (let i = 0; i < batchSummary.p50BalancesReal.length; i++) {
          const yr = getCurrYear() + i;
          const a1 = age1 + i;
          const a2 = isMar ? age2 + i : null;
          const realBal = batchSummary.p50BalancesReal[i];
          const nomBal = realBal * Math.pow(1 + infl, i);
          const p10Nom = batchSummary.p10BalancesReal[i] * Math.pow(1 + infl, i);
          const p90Nom = batchSummary.p90BalancesReal[i] * Math.pow(1 + infl, i);

          const dataPoint: any = {
            year: yr,
            a1,
            a2,
            bal: nomBal,
            real: realBal,
            p10: p10Nom,
            p90: p90Nom,
          };

          data.push(dataPoint);
        }
        console.log('[CALC] Data reconstruction complete, data length:', data.length);

        // Use conservative average (P25-P50) for key metrics instead of median (P50)
        // This provides more conservative projections by averaging 25th and 50th percentiles
        console.log('[CALC] Calculating key metrics...');
        const finReal = batchSummary.p50BalancesReal[yrsToRet];
        const finNom = finReal * Math.pow(1 + infl, yrsToRet);

        // Conservative: average of P25 and P50 (more conservative than median alone)
        const wdRealY1 = (batchSummary.y1AfterTaxReal_p25 + batchSummary.y1AfterTaxReal_p50) / 2;
        const infAdj = Math.pow(1 + infl, yrsToRet);
        const wdAfterY1 = wdRealY1 * infAdj;
        const wdGrossY1 = wdAfterY1 / (1 - 0.15); // rough estimate, actual tax rate varies

        // Conservative: average of P25 and P50 (more conservative than median alone)
        const eolReal = (batchSummary.eolReal_p25 + batchSummary.eolReal_p50) / 2;
        const yearsFrom2025 = yrsToRet + yrsToSim;
        const eolWealth = eolReal * Math.pow(1 + infl, yearsFrom2025);
        console.log('[CALC] Key metrics calculated - finReal:', finReal, 'eolWealth:', eolWealth);

        console.log('[CALC] Starting RMD calculation, yrsToSim:', yrsToSim);
        // Calculate RMD data based on median balances
        // Use actual user's initial asset allocation ratios instead of assuming 50/30/20
        const rmdData: { age: number; spending: number; rmd: number }[] = [];
        for (let y = 1; y <= yrsToSim; y++) {
          const currentAge = age1 + yrsToRet + y;
          if (currentAge >= RMD_START_AGE) {
            const yearIndex = yrsToRet + y;
            if (yearIndex < batchSummary.p50BalancesReal.length) {
              const totalBalReal = batchSummary.p50BalancesReal[yearIndex];
              const totalBalNom = totalBalReal * Math.pow(1 + infl, yearIndex);
              const estimatedPretaxBal = totalBalNom * initialPretaxRatio; // Use actual user's pretax ratio

              // Calculate RMD
              const requiredRMD = calcRMD(estimatedPretaxBal, currentAge);

              // Calculate SS benefit
              let ssAnnualBenefit = 0;
              if (includeSS) {
                if (currentAge >= ssClaimAge) {
                  ssAnnualBenefit += calcSocialSecurity(ssIncome, ssClaimAge);
                }
                if (isMar) {
                  const currentAge2 = age2 + yrsToRet + y;
                  if (currentAge2 >= ssClaimAge2) {
                    ssAnnualBenefit += calcSocialSecurity(ssIncome2, ssClaimAge2);
                  }
                }
              }

              // Calculate spending need (inflated withdrawal rate)
              const currWdGross = wdGrossY1 * Math.pow(1 + infl, y);
              const netSpendingNeed = Math.max(0, currWdGross - ssAnnualBenefit);

              rmdData.push({
                age: currentAge,
                spending: netSpendingNeed,
                rmd: requiredRMD,
              });
            }
          }
        }
        console.log('[CALC] RMD calculation complete, rmdData length:', rmdData.length);

        // Calculate estate tax using median EOL
        console.log('[CALC] Calculating estate tax...');
        const yearOfDeath = getCurrYear() + (LIFE_EXP - older); // Death at LIFE_EXP age
        const estateTax = calcEstateTax(eolWealth, marital, yearOfDeath, assumeTaxCutsExtended);
        // Scale estate tax to real dollars for consistent chart display
        const realEstateTax = estateTax * (eolReal / eolWealth);
        const netEstate = eolReal - realEstateTax;
        console.log('[CALC] Estate tax calculated - year:', yearOfDeath, 'estateTax:', estateTax, 'realEstateTax:', realEstateTax, 'netEstate:', netEstate);

        // Generational payout calculation (if enabled) - Monte Carlo version
        // NOW OPTIMIZED: Uses early-exit, decade chunking, and early termination for 90-99% speedup
        // See commit 0bd3a0e for optimization details
        console.log('[CALC] Checking generational payout, effectiveShowGen:', effectiveShowGen, 'netEstate > 0:', netEstate > 0);
        let genPayout: GenerationalPayout | null = null;

        if (effectiveShowGen && netEstate > 0) {
          console.log('[CALC] Starting generational payout calculation...');
          console.log('[CALC] hypBenAgesStr:', hypBenAgesStr);
          const benAges = hypBenAgesStr
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n >= 0 && n < 90);
          console.log('[CALC] benAges parsed:', benAges);

          // Guard: Skip generational simulation if inputs are degenerate
          const totalAnnualDist = hypPerBen * Math.max(1, numberOfBeneficiaries);
          const hasValidBeneficiaries = benAges.length > 0 && benAges.some(age => age >= 0);
          const hasValidDistribution = hypPerBen > 0 && totalAnnualDist > 0;

          if (!hasValidBeneficiaries || !hasValidDistribution) {
            console.log('[CALC] Skipping generational simulation - degenerate inputs:', {
              benAges,
              numberOfBeneficiaries,
              hypPerBen,
              totalAnnualDist,
              hasValidBeneficiaries,
              hasValidDistribution
            });
            genPayout = null;
          } else {
            try {

          // Calculate EOL values for all three percentiles
          console.log('[CALC] Calculating EOL percentiles...');
          const eolP25 = batchSummary.eolReal_p25 * Math.pow(1 + infl, yearsFrom2025);
          const eolP50 = batchSummary.eolReal_p50 * Math.pow(1 + infl, yearsFrom2025);
          const eolP75 = batchSummary.eolReal_p75 * Math.pow(1 + infl, yearsFrom2025);
          console.log('[CALC] EOL percentiles - p25:', eolP25, 'p50:', eolP50, 'p75:', eolP75);

          // Calculate estate tax and net estate for each percentile
          console.log('[CALC] Calculating estate taxes for percentiles...');
          const estateTaxP25 = calcEstateTax(eolP25, marital, yearOfDeath, assumeTaxCutsExtended);
          const estateTaxP50 = calcEstateTax(eolP50, marital, yearOfDeath, assumeTaxCutsExtended);
          const estateTaxP75 = calcEstateTax(eolP75, marital, yearOfDeath, assumeTaxCutsExtended);

          const netEstateP25 = eolP25 - estateTaxP25;
          const netEstateP50 = eolP50 - estateTaxP50;
          const netEstateP75 = eolP75 - estateTaxP75;
          console.log('[CALC] Net estates - p25:', netEstateP25.toLocaleString(), 'p50:', netEstateP50.toLocaleString(), 'p75:', netEstateP75.toLocaleString());
          console.log('[SUCCESS RATE DEBUG] Distribution per beneficiary: $' + hypPerBen.toLocaleString() + '/year');
          console.log('[SUCCESS RATE DEBUG] Initial beneficiaries:', numberOfBeneficiaries);
          console.log('[SUCCESS RATE DEBUG] Total annual distribution: $' + (hypPerBen * numberOfBeneficiaries).toLocaleString());

          // ========================================
          // Calculate Implied CAGR for Legacy Simulations
          // ========================================
          // P25 and P75 need to use the ACTUAL growth rates they achieved during accumulation
          // (not the user's static retRate), to properly model volatility drag effects.
          // P50 uses the user's nominal retRate as the "expected" scenario.

          const startingBalance = taxableBalance + pretaxBalance + rothBalance;
          const yearsTotal = yrsToRet + yrsToSim;

          // P25: Calculate implied real CAGR from unlucky accumulation outcome
          const totalGrowthP25 = batchSummary.eolReal_p25 / startingBalance;
          const impliedRealCAGR_P25 = Math.pow(totalGrowthP25, 1 / yearsTotal) - 1;
          const impliedNominal_P25 = ((1 + impliedRealCAGR_P25) * (1 + inflationRate / 100) - 1) * 100;

          // P75: Calculate implied real CAGR from lucky accumulation outcome
          const totalGrowthP75 = batchSummary.eolReal_p75 / startingBalance;
          const impliedRealCAGR_P75 = Math.pow(totalGrowthP75, 1 / yearsTotal) - 1;
          const impliedNominal_P75 = ((1 + impliedRealCAGR_P75) * (1 + inflationRate / 100) - 1) * 100;

          console.log('[CALC] Implied CAGR - P25 Real:', (impliedRealCAGR_P25 * 100).toFixed(2) + '%, Nominal:', impliedNominal_P25.toFixed(2) + '%');
          console.log('[CALC] Implied CAGR - P50: Using user retRate:', retRate + '%');
          console.log('[CALC] Implied CAGR - P75 Real:', (impliedRealCAGR_P75 * 100).toFixed(2) + '%, Nominal:', impliedNominal_P75.toFixed(2) + '%');

          // ========================================
          // Fix: "Missing Grandchildren" - Recursive Backfill
          // ========================================
          // If initial beneficiaries are too old to have children (age > fertilityWindowEnd),
          // we need to backfill younger generations to prevent immediate dynasty failure.
          //
          // Example: User dies at 95, child is 65. If fertility window is 25-35, the 65-year-old
          // child cannot have offspring. We need to create implied grandchildren at appropriate ages.

          interface BackfilledBeneficiary {
            age: number;
            size: number;
            generation: number; // 0 = original beneficiaries, 1 = children, 2 = grandchildren, etc.
          }

          const backfillYoungerGenerations = (
            initialAges: number[],
            numBeneficiaries: number,
            fertilityWindowEnd: number,
            generationLength: number,
            totalFertilityRate: number
          ): BackfilledBeneficiary[] => {
            const result: BackfilledBeneficiary[] = [];

            // Process each initial beneficiary
            for (const age of initialAges) {
              if (age <= fertilityWindowEnd) {
                // This beneficiary can have children - add them as-is
                result.push({
                  age,
                  size: numBeneficiaries / initialAges.length, // Distribute total beneficiaries evenly
                  generation: 0
                });
              } else {
                // This beneficiary is too old - backfill younger generations
                let currentAge = age;
                let currentSize = numBeneficiaries / initialAges.length;
                let generation = 0;

                // Recursively create younger generations until we find one within fertility window
                while (currentAge > fertilityWindowEnd) {
                  // Calculate implied child age
                  const childAge = currentAge - generationLength;

                  // Calculate child cohort size using TFR
                  const childSize = currentSize * totalFertilityRate;

                  // Move to the child generation
                  currentAge = childAge;
                  currentSize = childSize;
                  generation++;

                  console.log(`[BACKFILL] Gen ${generation}: Parent age ${currentAge + generationLength} → Child age ${childAge}, size ${childSize.toFixed(2)}`);
                }

                // Add the youngest fertile generation we found
                result.push({
                  age: currentAge,
                  size: currentSize,
                  generation
                });

                console.log(`[BACKFILL] Final: Added beneficiary at age ${currentAge}, size ${currentSize.toFixed(2)}, generation ${generation}`);
              }
            }

            return result;
          };

          // Apply backfill logic
          const backfilledBeneficiaries = backfillYoungerGenerations(
            benAges,
            numberOfBeneficiaries,
            fertilityWindowEnd,
            generationLength,
            totalFertilityRate
          );

          // Convert backfilled beneficiaries to the format expected by the worker
          // The worker expects initialBenAges array, so we need to expand the cohorts
          const adjustedBenAges: number[] = [];
          const adjustedStartBens = backfilledBeneficiaries.reduce((sum, b) => sum + b.size, 0);

          console.log('[BACKFILL] Summary:');
          console.log('[BACKFILL] Original beneficiaries:', numberOfBeneficiaries, 'at ages', benAges);
          console.log('[BACKFILL] Backfilled cohorts:', backfilledBeneficiaries.map(b => `Gen${b.generation}(age=${b.age}, size=${b.size.toFixed(2)})`).join(', '));
          console.log('[BACKFILL] Adjusted total beneficiaries:', adjustedStartBens.toFixed(2));

          // For the worker, we'll use the youngest generation's ages
          // and adjust the starting beneficiary count
          const finalBenAges = backfilledBeneficiaries.length > 0
            ? backfilledBeneficiaries.map(b => b.age)
            : benAges.length > 0 ? benAges : [0];

          const finalStartBens = Math.max(1, Math.round(adjustedStartBens));

          console.log('[BACKFILL] Final parameters for worker:');
          console.log('[BACKFILL] - initialBenAges:', finalBenAges);
          console.log('[BACKFILL] - startBens:', finalStartBens);

          // Run generational wealth simulation for all three percentiles (P25, P50, P75)
          // This allows us to calculate actual success rate based on which percentiles are perpetual
          console.log('[CALC] Running generational simulations for P25, P50, P75...');
          console.log('[CALC] Parameters - yearsFrom2025:', yearsFrom2025, 'retRate:', retRate);

          const simP25 = await runLegacyViaWorker({
            eolNominal: netEstateP25,
            yearsFrom2025,
            nominalRet: impliedNominal_P25,
            inflPct: inflationRate,
            perBenReal: hypPerBen,
            startBens: finalStartBens,
            totalFertilityRate,
            generationLength,
            deathAge: Math.max(1, hypDeathAge),
            minDistAge: Math.max(0, hypMinDistAge),
            capYears: 10000,  // Optimized simulation with early-exit and chunking
            initialBenAges: finalBenAges,
            fertilityWindowStart,
            fertilityWindowEnd,
            marital
          });

          const simP50 = await runLegacyViaWorker({
            eolNominal: netEstateP50,
            yearsFrom2025,
            nominalRet: retRate,
            inflPct: inflationRate,
            perBenReal: hypPerBen,
            startBens: finalStartBens,
            totalFertilityRate,
            generationLength,
            deathAge: Math.max(1, hypDeathAge),
            minDistAge: Math.max(0, hypMinDistAge),
            capYears: 10000,  // Optimized simulation with early-exit and chunking
            initialBenAges: finalBenAges,
            fertilityWindowStart,
            fertilityWindowEnd,
            marital
          });

          const simP75 = await runLegacyViaWorker({
            eolNominal: netEstateP75,
            yearsFrom2025,
            nominalRet: impliedNominal_P75,
            inflPct: inflationRate,
            perBenReal: hypPerBen,
            startBens: finalStartBens,
            totalFertilityRate,
            generationLength,
            deathAge: Math.max(1, hypDeathAge),
            minDistAge: Math.max(0, hypMinDistAge),
            capYears: 10000,  // Optimized simulation with early-exit and chunking
            initialBenAges: finalBenAges,
            fertilityWindowStart,
            fertilityWindowEnd,
            marital
          });

          console.log('[CALC] Generational simulations completed - P25:', simP25, 'P50:', simP50, 'P75:', simP75);

          // ========================================
          // CORRECT APPROACH: Use all 1,000 MC simulations for empirical success rate
          // ========================================
          console.log('[SUCCESS RATE DEBUG] ====================');
          console.log('[SUCCESS RATE DEBUG] CALCULATING EMPIRICAL SUCCESS RATE FROM ALL 1,000 SIMULATIONS');
          console.log('[SUCCESS RATE DEBUG] ====================');

          // Step 1: Calculate minimum estate required for perpetual legacy
          const realReturnRate = realReturn(retRate, inflationRate);
          const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
          const sustainableDistRate = realReturnRate - populationGrowthRate;
          const totalAnnualDist = hypPerBen * Math.max(1, numberOfBeneficiaries);
          const minEstateRequired = totalAnnualDist / sustainableDistRate;
          const safeMinEstate = minEstateRequired * 1.05; // 5% safety margin

          console.log('[SUCCESS RATE DEBUG] Real return rate: ' + (realReturnRate * 100).toFixed(2) + '%');
          console.log('[SUCCESS RATE DEBUG] Population growth rate: ' + (populationGrowthRate * 100).toFixed(2) + '%');
          console.log('[SUCCESS RATE DEBUG] Sustainable distribution rate: ' + (sustainableDistRate * 100).toFixed(2) + '%');
          console.log('[SUCCESS RATE DEBUG] Total annual distribution: $' + totalAnnualDist.toLocaleString());
          console.log('[SUCCESS RATE DEBUG] Minimum estate required (with 5% safety): $' + safeMinEstate.toLocaleString());

          // Step 2: Extract all 1,000 EOL values from Monte Carlo results
          const allEstatesReal = batchSummary.allRuns.map(run => run.eolReal);
          console.log('[SUCCESS RATE DEBUG] Total MC simulations: ' + allEstatesReal.length);

          // Step 3: Convert to nominal terms and apply estate tax
          const allEstatesAfterTax = allEstatesReal.map(eolReal => {
            const eolNominal = eolReal * Math.pow(1 + infl, yearsFrom2025);
            const estateTax = calcEstateTax(eolNominal, marital, yearOfDeath, assumeTaxCutsExtended);
            return eolNominal - estateTax;
          });

          // Step 4: Count how many estates meet the perpetual threshold
          const successCount = allEstatesAfterTax.filter(estate => estate >= safeMinEstate).length;
          const calculatedProbPerpetual = successCount / allEstatesAfterTax.length;
          const successRatePercent = Math.round(calculatedProbPerpetual * 100);

          console.log('[SUCCESS RATE DEBUG] Estates meeting perpetual threshold: ' + successCount + ' / ' + allEstatesAfterTax.length);
          console.log('[SUCCESS RATE DEBUG] SUCCESS RATE: ' + successRatePercent + '%');

          // Step 5: Show distribution of estates for debugging
          const sortedEstates = [...allEstatesAfterTax].sort((a, b) => a - b);
          console.log('[SUCCESS RATE DEBUG] Estate distribution:');
          console.log('[SUCCESS RATE DEBUG]   P10: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.10)].toLocaleString());
          console.log('[SUCCESS RATE DEBUG]   P25: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.25)].toLocaleString());
          console.log('[SUCCESS RATE DEBUG]   P50: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.50)].toLocaleString());
          console.log('[SUCCESS RATE DEBUG]   P75: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.75)].toLocaleString());
          console.log('[SUCCESS RATE DEBUG]   P90: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.90)].toLocaleString());
          console.log('[SUCCESS RATE DEBUG] ====================');

          // Legacy: Keep percentile simulations for P10, P50, P90 display in UI
          const p25Perpetual = simP25.fundLeftReal > 0;
          const p50Perpetual = simP50.fundLeftReal > 0;
          const p75Perpetual = simP75.fundLeftReal > 0;

          console.log('[CALC] Calculated success rate:', calculatedProbPerpetual);

          // Build genPayout object with all three percentiles
          console.log('[CALC] Building genPayout object...');
          genPayout = {
            perBenReal: hypPerBen,
            years: simP50.years,
            fundLeftReal: simP50.fundLeftReal,
            startBeneficiaries: Math.max(1, numberOfBeneficiaries),
            lastLivingCount: simP50.lastLivingCount,
            totalFertilityRate,
            generationLength,
            deathAge: Math.max(1, hypDeathAge),
            generationData: simP50.generationData || [],
            // All three percentiles
            p10: {
              years: simP25.years,
              fundLeftReal: simP25.fundLeftReal,
              isPerpetual: simP25.fundLeftReal > 0,
              generationData: simP25.generationData || []
            },
            p50: {
              years: simP50.years,
              fundLeftReal: simP50.fundLeftReal,
              isPerpetual: simP50.fundLeftReal > 0,
              generationData: simP50.generationData || []
            },
            p90: {
              years: simP75.years,
              fundLeftReal: simP75.fundLeftReal,
              isPerpetual: simP75.fundLeftReal > 0,
              generationData: simP75.generationData || []
            },
            probPerpetual: calculatedProbPerpetual  // Calculated from percentile results, not hardcoded!
          };
            } catch (genError: unknown) {
              console.error('[CALC] Generational simulation error:', genError);
              console.log('[CALC] Continuing with null genPayout due to error');
              genPayout = null;
            }
          }
        }
        console.log('[CALC] Generational payout complete, genPayout:', genPayout ? 'exists' : 'null');

        // Determine if ruined (survived fewer years than expected)
        console.log('[CALC] Calculating survYrs, probRuin:', batchSummary.probRuin);
        const survYrs = batchSummary.probRuin > 0.5 ? yrsToSim - 5 : yrsToSim;
        console.log('[CALC] survYrs calculated:', survYrs);

        console.log('[CALC] Building newRes object...');
        newRes = {
          finNom,
          finReal,
          totC: total,
          data,
          yrsToRet,
          wd: wdGrossY1,
          wdAfter: wdAfterY1,
          wdReal: wdRealY1,
          survYrs,
          yrsToSim,
          eol: eolWealth,
          eolReal,  // Real (inflation-adjusted) EOL wealth for comparisons
          estateTax: realEstateTax,  // IMPORTANT: Use real estate tax to match real EOL accounts
          estateTaxNominal: estateTax,  // Store nominal for reference
          netEstate,  // Already in real dollars
          eolAccounts: {
            // IMPORTANT: Use eolReal (not eolWealth) so chart matches Plan Summary Card
            // Both show real dollars (today's purchasing power) for consistency
            taxable: eolReal * initialTaxableRatio,
            pretax: eolReal * initialPretaxRatio,
            roth: eolReal * initialRothRatio,
          },
          totalRMDs: 0,
          genPayout,
          probRuin: batchSummary.probRuin,  // New field!
          rmdData,  // Add RMD vs spending data for tax bomb chart
          tax: {
            fedOrd: wdAfterY1 * 0.10,  // rough estimates
            fedCap: wdAfterY1 * 0.05,
            niit: 0,
            state: wdAfterY1 * (stateRate / 100),
            tot: wdGrossY1 - wdAfterY1,
          },
        };

        console.log('[CALC] About to set result, newRes:', newRes);
        setRes(newRes);
        setIsDirty(false); // Clear dirty flag after successful calculation
        setLegacyResult(calculateLegacyResult(newRes));
        setBatchSummary(batchSummary); // Store for sequence risk and guardrails analysis
        console.log('[CALC] Result set successfully');

        // Run guardrails analysis if we have failures
        if (batchSummary && batchSummary.probRuin > 0) {
          console.log('[CALC] Running guardrails analysis...');
          runGuardrailsAnalysis(batchSummary);
        } else {
          setGuardrailsResult(null); // Clear previous results if no failures
        }

        // Run Roth conversion optimizer
        console.log('[CALC] Running Roth conversion optimizer...');
        if (newRes) {
          runRothOptimizer(newRes);
        }

        console.log('[CALC] Calculation complete');

      // Track calculation for tab interface
      const isFirstCalculation = !lastCalculated;
      setLastCalculated(new Date());
      setInputsModified(false);

      // NAVIGATION BEHAVIOR:
      // - First calculation from Configure tab OR Wizard completion → Navigate to Results tab and scroll to top
      // - Recalculate from ANY other location → Stay on current tab, don't scroll
      const shouldNavigate = (isFirstCalculation && activeMainTab === 'configure') || isFromWizard;

      console.log('[CALC NAV] Navigation decision:', {
        shouldNavigate,
        isFirstCalculation,
        activeMainTab,
        isFromWizard
      });

      if (shouldNavigate) {
        // First calculation from Configure tab or Wizard: switch to Results and scroll
        console.log('[CALC NAV] Navigating to Results tab');
        setActiveMainTab('results');
        setIsFromWizard(false); // Reset flag after navigation
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setOlderAgeForAnalysis(olderAgeForAI);
          setIsLoadingAi(false);
        }, 800); // INCREASED from 100 to 800 to allow AnimatedSection (700ms) to finish
      } else {
        // Recalculate: stay put, no navigation or scrolling
        console.log('[CALC NAV] Staying on current tab:', activeMainTab);
        setOlderAgeForAnalysis(olderAgeForAI);
        setIsLoadingAi(false);
      }

    } catch (e: unknown) {
      console.error('[CALC] Calculation error:', e);
      setErr(e instanceof Error ? e.message : String(e));
      setRes(null);
      setIsLoadingAi(false);
    } finally {
      console.log('[CALC] Calculation complete, setting isRunning to false');
      setIsRunning(false);
      console.log('[CALC] Finished calculation, clearing loading state');
    }
  }, [
    age1, age2, retirementAge, isMar, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    showGen, total, marital,
    hypPerBen, numberOfBeneficiaries, hypBirthMultiple, hypBirthInterval, hypDeathAge, hypMinDistAge,
    returnMode, seed, randomWalkSeries, historicalYear,
    inflationShockRate, inflationShockDuration,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2, hypBenAgesStr,
    activeMainTab, setActiveMainTab, isFromWizard,
    runMonteCarloViaWorker, fetchAiInsight,
    includeMedicare, medicarePremium, medicalInflation,
    irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
    includeLTC, ltcAnnualCost, ltcProbability, ltcDuration, ltcOnsetAge,
    ltcAgeRangeStart, ltcAgeRangeEnd,
    totalFertilityRate, generationLength, fertilityWindowStart, fertilityWindowEnd,
    calculateLegacyResult, dividendYield, lastCalculated, runGuardrailsAnalysis,
    runRothOptimizer, enableRothConversions, targetConversionBracket, bondGlidePath,
  ]);

  // AUTO-CALCULATE AFTER WIZARD COMPLETION
  // When onboarding sets pendingCalcFromWizard=true, this effect fires on the NEXT
  // render cycle — after React has flushed the planConfig updates and the derived
  // local constants (age1, retirementAge, etc.) reflect the new values.
  // This replaces the unreliable setTimeout(100) that could race against React's
  // render cycle on slow devices.
  const [pendingCalcFromWizard, setPendingCalcFromWizard] = useState(false);

  useEffect(() => {
    if (pendingCalcFromWizard) {
      console.log('[ONBOARDING] planConfig propagated, triggering calc() via useEffect');
      setPendingCalcFromWizard(false);
      calc();
    }
  }, [pendingCalcFromWizard, calc]);

  // Calculate sensitivity analysis using ACTUAL simulations (not approximations)
  const calculateSensitivity = useCallback(() => {
    if (!res) return null;

    // Base inputs for simulations
    const baseInputs: SimulationInputs = {
      marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
      retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
      returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      historicalYear: historicalYear || undefined,
      inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
      inflationShockDuration,
      includeMedicare, medicarePremium, medicalInflation,
      irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
      includeLTC, ltcAnnualCost, ltcProbability, ltcDuration,
      ltcOnsetAge, ltcAgeRangeStart, ltcAgeRangeEnd,
      bondGlidePath,
    };

    // Run baseline simulation
    const baselineSim = runSingleSimulation(baseInputs, seed);
    const baselineEOL = baselineSim.eolReal;
    const infl = inflationRate / 100;
    const younger = Math.min(age1, isMar ? age2 : age1);
    const older = Math.max(age1, isMar ? age2 : age1);
    const yrsToRet = retirementAge - younger;
    const yearsFrom2025 = (LIFE_EXP - older);
    const baselineNominal = baselineEOL * Math.pow(1 + infl, yearsFrom2025);

    const variations = [];

    // 1. Return Rate: ±2%
    const highReturnSim = runSingleSimulation({ ...baseInputs, retRate: retRate + 2 }, seed);
    const lowReturnSim = runSingleSimulation({ ...baseInputs, retRate: retRate - 2 }, seed);
    variations.push({
      label: "Return Rate",
      high: (highReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 2. Retirement Age: ±2 years
    const highRetAgeSim = runSingleSimulation({ ...baseInputs, retirementAge: retirementAge + 2 }, seed);
    const lowRetAgeSim = runSingleSimulation({ ...baseInputs, retirementAge: Math.max(younger + 5, retirementAge - 2) }, seed); // Don't retire before age younger+5
    variations.push({
      label: "Retirement Age",
      high: (highRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 3. Withdrawal Rate: ±0.5%
    const highWdSim = runSingleSimulation({ ...baseInputs, wdRate: wdRate + 0.5 }, seed);
    const lowWdSim = runSingleSimulation({ ...baseInputs, wdRate: wdRate - 0.5 }, seed);
    variations.push({
      label: "Withdrawal Rate",
      high: (lowWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal, // Lower withdrawal = higher EOL
      low: (highWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal, // Higher withdrawal = lower EOL
      range: Math.abs((lowWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (highWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 4. Starting Savings: ±15%
    const savingsFactor = 0.15;
    const highSavingsSim = runSingleSimulation({
      ...baseInputs,
      taxableBalance: taxableBalance * (1 + savingsFactor),
      pretaxBalance: pretaxBalance * (1 + savingsFactor),
      rothBalance: rothBalance * (1 + savingsFactor),
    }, seed);
    const lowSavingsSim = runSingleSimulation({
      ...baseInputs,
      taxableBalance: taxableBalance * (1 - savingsFactor),
      pretaxBalance: pretaxBalance * (1 - savingsFactor),
      rothBalance: rothBalance * (1 - savingsFactor),
    }, seed);
    variations.push({
      label: "Starting Savings",
      high: (highSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 5. Annual Contributions: ±15%
    const contribFactor = 0.15;
    const highContribSim = runSingleSimulation({
      ...baseInputs,
      cTax1: cTax1 * (1 + contribFactor),
      cPre1: cPre1 * (1 + contribFactor),
      cPost1: cPost1 * (1 + contribFactor),
      cMatch1: cMatch1 * (1 + contribFactor),
      cTax2: cTax2 * (1 + contribFactor),
      cPre2: cPre2 * (1 + contribFactor),
      cPost2: cPost2 * (1 + contribFactor),
      cMatch2: cMatch2 * (1 + contribFactor),
    }, seed);
    const lowContribSim = runSingleSimulation({
      ...baseInputs,
      cTax1: cTax1 * (1 - contribFactor),
      cPre1: cPre1 * (1 - contribFactor),
      cPost1: cPost1 * (1 - contribFactor),
      cMatch1: cMatch1 * (1 - contribFactor),
      cTax2: cTax2 * (1 - contribFactor),
      cPre2: cPre2 * (1 - contribFactor),
      cPost2: cPost2 * (1 - contribFactor),
      cMatch2: cMatch2 * (1 - contribFactor),
    }, seed);
    variations.push({
      label: "Annual Contributions",
      high: (highContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 6. Inflation Rate: ±0.5%
    const highInflSim = runSingleSimulation({ ...baseInputs, inflationRate: inflationRate + 0.5 }, seed);
    const lowInflSim = runSingleSimulation({ ...baseInputs, inflationRate: inflationRate - 0.5 }, seed);
    // Higher inflation reduces real purchasing power, lower inflation increases it
    const highInflNominal = highInflSim.eolReal * Math.pow(1 + (inflationRate + 0.5) / 100, yearsFrom2025);
    const lowInflNominal = lowInflSim.eolReal * Math.pow(1 + (inflationRate - 0.5) / 100, yearsFrom2025);
    variations.push({
      label: "Inflation Rate",
      high: lowInflNominal - baselineNominal, // Lower inflation = higher real purchasing power
      low: highInflNominal - baselineNominal, // Higher inflation = lower real purchasing power
      range: Math.abs(lowInflNominal - highInflNominal),
    });

    // Sort by range (impact magnitude)
    variations.sort((a, b) => b.range - a.range);

    return {
      baseline: baselineNominal,
      variations,
    };
  }, [
    res, marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear, inflationShockRate, inflationShockDuration,
    includeMedicare, medicarePremium, medicalInflation,
    irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
    includeLTC, ltcAnnualCost, ltcProbability, ltcDuration,
    ltcOnsetAge, ltcAgeRangeStart, ltcAgeRangeEnd,
    bondGlidePath, isMar, seed,
  ]);

  // TRUE SIDE EFFECT: localStorage read on mount for saved scenarios
  // Hydrates saved scenarios from browser storage on component mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('retirement-scenarios');
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load scenarios:', e);
    }
  }, []);

  // TRUE SIDE EFFECT: sessionStorage read on mount for navigation state
  // Restores calculation results when returning from another page (e.g., 2026 Income).
  // sessionStorage is a browser API outside React's control.
  useEffect(() => {
    try {
      const savedResults = sessionStorage.getItem('calculatorResults');
      const savedTab = sessionStorage.getItem('calculatorTab');

      if (savedResults) {
        const results = JSON.parse(savedResults);
        console.log('[NAV PERSISTENCE] Restoring saved results');
        setRes(results);
        setLastCalculated(new Date());

        // Clear the saved results after restoring
        sessionStorage.removeItem('calculatorResults');
      }

      if (savedTab && isMainTabId(savedTab)) {
        console.log('[NAV PERSISTENCE] Restoring tab:', savedTab);
        setActiveMainTab(savedTab);
        sessionStorage.removeItem('calculatorTab');
      }
    } catch (e) {
      console.error('[NAV PERSISTENCE] Failed to restore state:', e);
    }
  }, []);

  // TRUE SIDE EFFECT: sessionStorage write and context population on result changes
  // Persists results to sessionStorage for cross-page navigation and populates
  // the budget context for seamless data flow to other pages.
  useEffect(() => {
    if (res) {
      try {
        sessionStorage.setItem('calculatorResults', JSON.stringify(res));
        sessionStorage.setItem('calculatorTab', activeMainTab);
        sessionStorage.setItem('calculatorMarital', marital);
        console.log('[NAV PERSISTENCE] Saved current results, tab, and marital status');

        // Also populate budget context for seamless navigation to income page
        const totalContribs401k = cPre1 + cPre2;
        const totalContribsRoth = cPost1 + cPost2;
        const totalContribsTaxable = cTax1 + cTax2;
        const estimatedGross = totalContribs401k > 0 ? totalContribs401k / 0.15 : 0;

        setImplied({
          grossIncome: estimatedGross,
          taxes: estimatedGross * 0.30, // Rough estimate
          housing: res.wdAfter ? (res.wdAfter / 12) * 0.30 * 12 : 0,
          discretionary: res.wdAfter ? (res.wdAfter / 12) * 0.15 * 12 : 0,
          contributions401k: totalContribs401k,
          contributionsRoth: totalContribsRoth,
          contributionsTaxable: totalContribsTaxable,
          maritalStatus: marital,
        });
        console.log('[BUDGET CONTEXT] Populated implied budget for income page');
      } catch (e) {
        console.error('[NAV PERSISTENCE] Failed to save state:', e);
      }
    }
  }, [res, activeMainTab, marital, cPre1, cPre2, cPost1, cPost2, cTax1, cTax2, setImplied]);

  // Save current inputs and results as a scenario
  const saveScenario = useCallback(() => {
    if (!res || !scenarioName.trim()) return;

    const scenario = {
      id: Date.now().toString(),
      name: scenarioName.trim(),
      timestamp: Date.now(),
      inputs: {
        // Use planConfig as source (single source of truth)
        marital, age1, age2, retirementAge,
        employmentType1, employmentType2, primaryIncome, spouseIncome,
        emergencyFund, taxableBalance, pretaxBalance, rothBalance,
        cTax1, cPre1, cPost1, cMatch1,
        cTax2, cPre2, cPost2, cMatch2,
        retRate, inflationRate, stateRate, incContrib, incRate, wdRate, dividendYield,
        includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      },
      results: {
        finNom: res.finNom,
        finReal: res.finReal,
        wd: res.wd,
        wdReal: res.wdReal,
        eol: res.eol,
        eolReal: res.eolReal,  // Include inflation-adjusted EOL for comparisons
        estateTax: res.estateTax,
        netEstate: res.netEstate,
        probRuin: res.probRuin,
      },
    };

    const updated = [...savedScenarios, scenario];
    setSavedScenarios(updated);
    localStorage.setItem('retirement-scenarios', JSON.stringify(updated));
    setScenarioName("");
  }, [res, scenarioName, savedScenarios, marital, age1, age2, retirementAge,
      employmentType1, employmentType2, primaryIncome, spouseIncome,
      emergencyFund, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
      retRate, inflationRate, stateRate, incContrib, incRate, wdRate, dividendYield,
      includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2]);

  // Delete a scenario
  const deleteScenario = useCallback((id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('retirement-scenarios', JSON.stringify(updated));
  }, [savedScenarios]);

  // Load a scenario (restore inputs) - Now uses PlanConfig single source of truth
  const loadScenario = useCallback((scenario: SavedScenario) => {
    const inp = scenario.inputs;

    // Update PlanConfig in one operation
    updatePlanConfig({
      // Personal Info
      age1: inp.age1 ?? 30,
      age2: inp.age2 ?? 30,
      retirementAge: inp.retirementAge ?? 65,
      marital: inp.marital ?? 'single',
      // Employment & Income
      employmentType1: inp.employmentType1 ?? 'w2',
      employmentType2: inp.employmentType2,
      primaryIncome: inp.primaryIncome ?? 100000,
      spouseIncome: inp.spouseIncome ?? 0,
      // Current Balances
      emergencyFund: inp.emergencyFund ?? 0,
      taxableBalance: inp.taxableBalance ?? 0,
      pretaxBalance: inp.pretaxBalance ?? 0,
      rothBalance: inp.rothBalance ?? 0,
      // Contributions
      cTax1: inp.cTax1 ?? 0,
      cPre1: inp.cPre1 ?? 0,
      cPost1: inp.cPost1 ?? 0,
      cMatch1: inp.cMatch1 ?? 0,
      cTax2: inp.cTax2 ?? 0,
      cPre2: inp.cPre2 ?? 0,
      cPost2: inp.cPost2 ?? 0,
      cMatch2: inp.cMatch2 ?? 0,
      // Assumptions
      retRate: inp.retRate ?? 7,
      inflationRate: inp.inflationRate ?? 3,
      stateRate: inp.stateRate ?? 0,
      wdRate: inp.wdRate ?? 4,
      incContrib: inp.incContrib ?? false,
      incRate: inp.incRate ?? 4.5,
      dividendYield: inp.dividendYield ?? 2.0,
      // Social Security
      includeSS: inp.includeSS ?? true,
      ssIncome: inp.ssIncome ?? 0,
      ssClaimAge: inp.ssClaimAge ?? 67,
      ssIncome2: inp.ssIncome2 ?? 0,
      ssClaimAge2: inp.ssClaimAge2 ?? 67,
    }, 'user-entered');
  }, [updatePlanConfig]);

  // Deferred calculation trigger — runs calc() AFTER React flushes planConfig updates.
  // Replaces the fragile setTimeout(100) hack that raced against React rendering.
  useEffect(() => {
    if (calcPending) {
      calc();
      setCalcPending(false);
    }
  }, [calcPending, calc]);

  // TRUE SIDE EFFECT: Auto-run calculations when entering AI Doc Mode
  // This triggers an async calculation side effect when the secret mode is activated.
  // IMPORTANT: This hook must be before the early return to avoid hooks violation.
  useEffect(() => {
    if (isAIDocMode && !res) {
      console.log('[AI Doc Mode] Auto-running calculations...');
      setCalcPending(true);
    }
  }, [isAIDocMode]);

  // Show loading state while determining if wizard should be shown
  // This prevents hydration mismatch since localStorage is only available client-side
  if (shouldShowWizard === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // Show onboarding IMMEDIATELY if user hasn't completed it (no brand loader)
  // OnboardingSelector lets users choose between Quick Start (30 sec) or Guided AI Wizard (2-3 min)
  if (shouldShowWizard) {
    return (
      <OnboardingSelector
        onComplete={async () => {
          console.log('[ONBOARDING] Onboarding completed, triggering auto-calculation...');
          markOnboardingComplete();

          // Give user a moment to see results before transitioning
          await new Promise(resolve => setTimeout(resolve, 300));

          // Mark that we're coming from onboarding to trigger:
          // 1. WORK→DIE→RETIRE animation
          // 2. Auto-navigate to Results tab after calculation
          setIsFromWizard(true);

          // CRITICAL: Defer calc() via state flag so it runs AFTER React flushes
          // the planConfig update. The useEffect watching calcPending will fire
          // once the component re-renders with the new planConfig values.
          console.log('[ONBOARDING] Setting calcPending — calc() will fire after React flush');
          setCalcPending(true);
        }}
        onSkip={() => {
          markOnboardingComplete();
        }}
      />
    );
  }

  // Brand loader DISABLED - was interfering with wizard → calculator transition
  return (
    <div className={isAIDocMode ? 'ai-doc-mode-active' : ''}>
      {/* URL Tab Sync - wrapped in Suspense for Next.js 15 compatibility */}
      <Suspense fallback={null}>
        <URLTabSync onTabChange={handleURLTabChange} />
      </Suspense>

      {/* AI Documentation Mode Header */}
      {isAIDocMode && (
        <>
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg z-50 print:hidden">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">
                    🤖 AI Documentation Mode
                  </h1>
                  <p className="text-sm opacity-90 mb-3">
                    All calculator tabs expanded below for AI review. Scroll to see everything or Save as PDF (Ctrl/Cmd+P).
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="bg-white/20 rounded px-2 py-1">
                      📸 Screenshot sections as needed
                    </div>
                    <div className="bg-white/20 rounded px-2 py-1">
                      📄 Ctrl/Cmd+P → Save as PDF
                    </div>
                    <div className="bg-white/20 rounded px-2 py-1">
                      ⌨️ Ctrl+Shift+D to exit
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsAIDocMode(false)}
                  className="shrink-0 bg-white/20 hover:bg-white/30 rounded px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>

          {/* Global styles for doc mode */}
          <style jsx global>{`
            .ai-doc-mode-active [role="tabpanel"] {
              display: block !important;
              opacity: 1 !important;
              height: auto !important;
              overflow: visible !important;
              margin-bottom: 4rem;
              padding-bottom: 4rem;
              border-bottom: 3px solid #e5e7eb;
              page-break-inside: avoid;
            }

            .ai-doc-mode-active [role="tabpanel"]:last-child {
              border-bottom: none;
            }

            /* Hide tab navigation in doc mode */
            .ai-doc-mode-active [role="tablist"] {
              display: none !important;
            }

            @media print {
              .ai-doc-mode-active [role="tabpanel"] {
                page-break-inside: avoid;
              }

              .ai-doc-mode-active canvas,
              .ai-doc-mode-active img {
                max-width: 100% !important;
                page-break-inside: avoid;
              }
            }
          `}</style>

          {!res && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 mt-4 print:hidden">
              <p className="text-yellow-800">
                ⏳ Running calculations... Page will update in a moment.
              </p>
            </div>
          )}
        </>
      )}

      {/* Main app content - normal layout or doc mode both use same JSX */}
      {/* BrandLoader disabled - uncomment if needed in future */}
      {/* {!loaderComplete && (
        <BrandLoader
          onHandoffStart={() => setLoaderHandoff(true)}
          onCubeAppended={() => setCubeAppended(true)}
          onComplete={() => setLoaderComplete(true)}
        />
      )} */}

      {/* Full-screen Monte Carlo splash */}
      <CyberpunkSplash ref={splashRef} />

      <div
        className="min-h-screen bg-background"
        style={{
          opacity: loaderComplete || loaderHandoff ? 1 : 0,
          transition: "opacity .6s ease",
          pointerEvents: loaderComplete ? 'auto' : 'none'
        }}
      >
        <TopBanner />

      <PageHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        showActions={!!res}
        cubeAppended={cubeAppended}
        onAIReview={() => setAiReviewOpen(true)}
        onDownloadPDF={async () => {
          if (!res) return;

          const { generatePDFReport } = await import('@/lib/pdfReport');
          const reportData = {
            inputs: {
              marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
              cTax1, cPre1, cPost1, cMatch1,
              cTax2, cPre2, cPost2, cMatch2,
              retRate, inflationRate, stateRate, wdRate, incContrib, incRate,
              returnMode, randomWalkSeries,
              includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
              includeMedicare, medicarePremium, medicalInflation,
              irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
              includeLTC, ltcAnnualCost, ltcProbability, ltcDuration, ltcOnsetAge,
              showGen, hypPerBen, numberOfBeneficiaries: numberOfChildren,
              totalFertilityRate, generationLength,
              fertilityWindowStart, fertilityWindowEnd
            },
            results: res,
            reportId: `RPT-${Date.now()}`
          };
          await generatePDFReport(reportData);
        }}
        onShare={() => {
          if (!res) return;
          const shareData = {
            title: 'Tax-Aware Retirement Plan',
            text: `Retirement projection: ${fmt(res.finReal)} by age ${retirementAge}, ${fmt(res.wdReal)}/yr after-tax income`,
            url: window.location.href
          };
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData);
          } else {
            navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
            alert('Plan summary copied to clipboard!');
          }
        }}
        onAdjust={(deltas: AdjustmentDeltas) => {
          // Apply deltas to current inputs and recalculate
          let hasChanges = false;

          // Apply contribution delta if non-zero
          if (deltas.contributionDelta !== 0) {
            const totalContribs = cTax1 + cPre1 + cPost1;
            if (totalContribs > 0) {
              const adjustedTotal = totalContribs * (1 + deltas.contributionDelta / 100);
              const ratio = adjustedTotal / totalContribs;
              setCTax1(Math.round(cTax1 * ratio));
              setCPre1(Math.round(cPre1 * ratio));
              setCPost1(Math.round(cPost1 * ratio));
              hasChanges = true;
            }
          }

          // Apply withdrawal rate delta if non-zero
          if (deltas.withdrawalRateDelta !== 0) {
            setWdRate(parseFloat((wdRate + deltas.withdrawalRateDelta).toFixed(2)));
            hasChanges = true;
          }

          // Only recalculate if changes were made
          if (hasChanges) {
            // Don't set inputsModified=true because we're immediately recalculating
            // The calc() function will set inputsModified=false when complete

            // Use requestAnimationFrame for better timing
            requestAnimationFrame(() => {
              calc();
            });
          }
        }}
      />

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <TabNavigation
                activeTab={activeMainTab}
                onTabChange={setActiveMainTab}
                hasResults={!!res}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('This will reset the wizard and reload the page. Continue?')) {
                  resetOnboarding();
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto sm:shrink-0"
            >
              Restart Wizard
            </Button>
          </div>
          {res && (
            <div className="flex justify-end">
              <LastCalculatedBadge
                lastCalculated={lastCalculated}
                inputsModified={inputsModified}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">

        {res && (
          <>
            {/* Print Report Component */}
            <PrintReport
              res={res}
              batchSummary={batchSummary}
              scenarioName={scenarioName}
              randomWalkSeries={randomWalkSeries}
              inflationRate={inflationRate}
              returnMode={returnMode}
              retRate={retRate}
              wdRate={wdRate}
              retirementAge={retirementAge}
              marital={marital}
              historicalYear={historicalYear}
              inflationShockRate={inflationShockRate}
              inflationShockDuration={inflationShockDuration}
              comparisonMode={comparisonMode}
              comparisonData={comparisonData}
              aiInsight={aiInsight}
              age1={age1}
              taxableBalance={taxableBalance}
              pretaxBalance={pretaxBalance}
              rothBalance={rothBalance}
              cTax1={cTax1}
              cPre1={cPre1}
              cPost1={cPost1}
              total={total}
            />

            {/* Human Dashboard - Interactive (Screen Only) */}
            <AnimatedSection animation="slide-up" duration={700}>
            <div ref={resRef} className="space-y-6 scroll-mt-4">

            {/* User Input Summary - Print Only (Hidden - replaced by new print summary) */}
            <div className="hidden">
            <UserInputsPrintSummary
              age={age1}
              retirementAge={retirementAge}
              maritalStatus={marital}
              taxable={fmt(taxableBalance)}
              pretax={fmt(pretaxBalance)}
              roth={fmt(rothBalance)}
              taxableContrib={fmt(cTax1)}
              pretaxContrib={fmt(cPre1)}
              rothContrib={fmt(cPost1)}
              inflation={inflationRate}
              withdrawalRate={wdRate}
              monteCarloRuns={1000}
              returnModel={returnMode === 'fixed' ? `Fixed at ${retRate}%` : 'Historical 1928–2024 bootstrap'}
            />
            </div>

            <TabPanel id="results" activeTab={activeMainTab}>
            {/* Dirty State Banner */}
            {isDirty && res && (
              <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                          Inputs Modified
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                          Your inputs have changed. Recalculate to see updated projections.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={calc}
                      disabled={isLoadingAi || isRunning}
                      className="flex-shrink-0"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${(isLoadingAi || isRunning) ? 'animate-spin' : ''}`} />
                      Recalculate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plan Summary Card */}
            <div className="mb-6">
              <PlanSummaryCard result={res} batchSummary={batchSummary} />
            </div>

            {/* Next Steps Card */}
            <div className="mb-6">
              <NextStepsCard result={res} batchSummary={batchSummary} />
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-center mb-6">
              <ToggleGroup
                type="single"
                value={resultsViewMode}
                onValueChange={(value) => {
                  if (value === 'quick' || value === 'detailed') {
                    setResultsViewMode(value)
                  }
                }}
                className="bg-muted p-1 rounded-lg"
              >
                <ToggleGroupItem value="quick" className="px-6">
                  Quick View
                </ToggleGroupItem>
                <ToggleGroupItem value="detailed" className="px-6">
                  Detailed View
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Detailed View Content */}
            {resultsViewMode === 'detailed' && (
            <div className="space-y-6">
            <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <FlippingStatCard
                title="Future Balance"
                value={fmt(res.finNom)}
                sub={`At age ${retirementAge} (nominal)`}
                color="blue"
                icon={DollarSignIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Future Balance - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your projected total retirement balance at age {retirementAge} in future dollars (nominal).
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Current Savings</span>
                          <span className="flip-card-list-value">{fmt(total)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Future Value</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">In Today's Dollars</span>
                          <span className="flip-card-list-value">{fmt(res.finReal)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Years to Retirement</span>
                          <span className="flip-card-list-value">{res.yrsToRet} years</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Total Contributions</span>
                          <span className="flip-card-list-value">{fmt(res.totC)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Includes current savings plus all contributions and growth from now until retirement,
                        accounting for mid-year contributions and {returnMode === 'fixed' ? `compounding returns at ${retRate}% annual return` : 'historical S&P 500 total-return bootstrap (1928–2024)'}.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Today's Dollars"
                value={fmt(res.finReal)}
                sub={`At age ${retirementAge} (real)`}
                color="indigo"
                icon={TrendingUpIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Today's Dollars - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is the nominal balance adjusted for inflation to show its value in today's purchasing power.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Future Balance (Nominal)</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">In Today's Dollars (Real)</span>
                          <span className="flip-card-list-value">{fmt(res.finReal)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Inflation Rate</span>
                          <span className="flip-card-list-value">{inflationRate}%</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Years to Retirement</span>
                          <span className="flip-card-list-value">{res.yrsToRet} years</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Formula: Real Value = Nominal Value ÷ (1 + {inflationRate/100})<sup>{res.yrsToRet}</sup>
                        <br/>
                        This helps you understand what your retirement savings will actually buy in terms of today's purchasing power.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Annual Withdrawal"
                value={fmt(res.wd)}
                sub={`Year 1 (${wdRate}% rate)`}
                color="green"
                icon={CalendarIcon}
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Withdrawal Strategy - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your starting withdrawal for the first year of retirement, calculated as {wdRate}% of your total balance.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Future Balance</span>
                          <span className="flip-card-list-value">{fmt(res.finNom)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Withdrawal Rate</span>
                          <span className="flip-card-list-value">{wdRate}%</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Year 1 Withdrawal</span>
                          <span className="flip-card-list-value">{fmt(res.wd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">After Taxes</span>
                          <span className="flip-card-list-value">{fmt(res.wdAfter)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        In all future years, this amount will be adjusted upward by the rate of inflation ({inflationRate}%) to maintain your purchasing power, regardless of market performance.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Real After-Tax Income"
                value={fmt(res.wdReal)}
                sub="Year 1 inflation-adjusted spending"
                color="emerald"
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">Real After-Tax Income - Details</span>
                      <span className="flip-card-icon text-xs print-hide flip-hint">Click to flip back ↻</span>
                    </div>
                    <div className="flip-card-body-details">
                      <p className="mb-4">
                        This is your actual spendable income in today's dollars after paying {fmt(res.tax.tot)} in taxes on your {fmt(res.wd)} withdrawal.
                      </p>
                      <ul className="flip-card-list">
                        <li>
                          <span className="flip-card-list-label">Gross Withdrawal</span>
                          <span className="flip-card-list-value">{fmt(res.wd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Federal Ordinary Tax</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.fedOrd)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Federal Capital Gains</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.fedCap)}</span>
                        </li>
                        {res.tax.niit > 0 && (
                          <li>
                            <span className="flip-card-list-label">NIIT (3.8%)</span>
                            <span className="flip-card-list-value">-{fmt(res.tax.niit)}</span>
                          </li>
                        )}
                        <li>
                          <span className="flip-card-list-label">State Tax</span>
                          <span className="flip-card-list-value">-{fmt(res.tax.state)}</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">After-Tax (Nominal)</span>
                          <span className="flip-card-list-value">{fmt(res.wdAfter)}</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Taxes vary by account type: Pre-tax 401k/IRA incurs ordinary income tax, Taxable accounts incur capital gains tax, and Roth accounts are tax-free.
                      </p>
                    </div>
                  </>
                }
              />
            </div>

            {/* Lifetime Wealth Flow - Sankey Diagram (Screen only - hidden from print) */}
            <div className="print:hidden wealth-flow-block">
                <Card className="border-2 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Real Lifetime Wealth Flow Chart</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs print-hide"
                          onClick={(e) => {
                            e.stopPropagation();
                            askExplainQuestion("How can I optimize my end-of-life wealth and estate planning?");
                          }}
                        >
                          Explain This
                        </Button>
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>From end-of-life wealth to net inheritance (all values in today's dollars)</span>
                        {res.probRuin !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Probability of Running Out: <span className="font-semibold">{(res.probRuin * 100).toFixed(0)}%</span>
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                {res.eolAccounts && res.eol > 0 ? (
                  <>
                    <Suspense fallback={<ChartLoadingFallback height="h-[350px]" />}>
                    <div className="wealth-flow-responsive">
                    <ResponsiveContainer width="100%" height={350}>
                      <Sankey
                        data={{
                          nodes: [
                            { name: `Taxable — ${fmt(res.eolAccounts.taxable)}` },
                            { name: `Pre-Tax — ${fmt(res.eolAccounts.pretax)}` },
                            { name: `Roth — ${fmt(res.eolAccounts.roth)}` },
                            { name: `Estate Tax — ${fmt(res.estateTax || 0)}` },
                            { name: `Net to Heirs — ${fmt(res.netEstate || res.eol)}` },
                          ],
                          links: (() => {
                            // Use eolReal for ratios since all values are in real dollars
                            const totalReal = res.eolReal || res.eol;
                            const taxRatio = (res.estateTax || 0) / totalReal;
                            const heirRatio = (res.netEstate || totalReal) / totalReal;

                            const links = [];

                            // Taxable flows (soft orange)
                            if (res.estateTax > 0 && res.eolAccounts.taxable > 0) {
                              links.push({
                                source: 0,
                                target: 3,
                                value: res.eolAccounts.taxable * taxRatio,
                                color: '#fb923c',
                                sourceName: 'Taxable',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.taxable > 0) {
                              links.push({
                                source: 0,
                                target: 4,
                                value: res.eolAccounts.taxable * heirRatio,
                                color: '#fb923c',
                                sourceName: 'Taxable',
                                targetName: 'Net to Heirs'
                              });
                            }

                            // Pre-tax flows (soft blue)
                            if (res.estateTax > 0 && res.eolAccounts.pretax > 0) {
                              links.push({
                                source: 1,
                                target: 3,
                                value: res.eolAccounts.pretax * taxRatio,
                                color: '#60a5fa',
                                sourceName: 'Pre-Tax',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.pretax > 0) {
                              links.push({
                                source: 1,
                                target: 4,
                                value: res.eolAccounts.pretax * heirRatio,
                                color: '#60a5fa',
                                sourceName: 'Pre-Tax',
                                targetName: 'Net to Heirs'
                              });
                            }

                            // Roth flows (soft green)
                            if (res.estateTax > 0 && res.eolAccounts.roth > 0) {
                              links.push({
                                source: 2,
                                target: 3,
                                value: res.eolAccounts.roth * taxRatio,
                                color: '#4ade80',
                                sourceName: 'Roth',
                                targetName: 'Estate Tax'
                              });
                            }
                            if (res.eolAccounts.roth > 0) {
                              links.push({
                                source: 2,
                                target: 4,
                                value: res.eolAccounts.roth * heirRatio,
                                color: '#4ade80',
                                sourceName: 'Roth',
                                targetName: 'Net to Heirs'
                              });
                            }

                            return links;
                          })(),
                        }}
                        width={800}
                        height={350}
                        nodeWidth={15}
                        nodePadding={15}
                        margin={{ top: 30, right: 80, bottom: 30, left: 80 }}
                        link={(props: any) => {
                          const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;

                          return (
                            <g>
                              <path
                                d={`
                                  M${sourceX},${sourceY}
                                  C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                                `}
                                fill="none"
                                stroke={payload?.color || (isDarkMode ? '#64748b' : '#94a3b8')}
                                strokeWidth={linkWidth}
                                strokeOpacity={0.6}
                                style={{ transition: 'all 0.3s ease' }}
                                className="hover:stroke-opacity-90"
                              />
                              <title>
                                {`${payload?.sourceName} → ${payload?.targetName}\n${fmt(payload?.value || 0)} (${((payload?.value || 0) / res.eol * 100).toFixed(1)}% of total)`}
                              </title>
                            </g>
                          );
                        }}
                        node={(props: any) => {
                          const { x, y, width, height, index, payload } = props;
                          // Muted color palette
                          const colors = [
                            '#fb923c', // soft orange (Taxable)
                            '#60a5fa', // soft blue (Pre-Tax)
                            '#4ade80', // soft green (Roth)
                            '#ef4444', // muted red (Estate Tax)
                            '#10b981'  // blended green (Net to Heirs)
                          ];
                          const fill = colors[index] || (isDarkMode ? '#475569' : '#64748b');

                          // Extract label and value from payload name
                          // Format is "Label — $Value"
                          const fullName = payload?.name || '';
                          const [label, value] = fullName.split(' — ');

                          // Position text - center vertically within node
                          const textY = y + height / 2;

                          return (
                            <g>
                              <Rectangle
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={fill}
                                fillOpacity={0.85}
                              />
                              {/* Node label with value - positioned adjacent to node */}
                              <text
                                x={index < 3 ? x - 10 : x + width + 10}
                                y={textY - 8}
                                textAnchor={index < 3 ? "end" : "start"}
                                dominantBaseline="middle"
                                fill={isDarkMode ? '#d1d5db' : '#374151'}
                                fontSize="13"
                                fontWeight="600"
                              >
                                {label}
                              </text>
                              {/* Dollar value below label */}
                              <text
                                x={index < 3 ? x - 10 : x + width + 10}
                                y={textY + 8}
                                textAnchor={index < 3 ? "end" : "start"}
                                dominantBaseline="middle"
                                fill={isDarkMode ? '#9ca3af' : '#6b7280'}
                                fontSize="12"
                                fontWeight="500"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        }}
                      >
                        <RTooltip
                          content={({ payload }: any) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0];
                            return (
                              <div style={{
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                borderRadius: "8px",
                                border: isDarkMode ? "1px solid #374151" : "1px solid #e5e7eb",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                padding: '8px 12px'
                              }}>
                                <p className="font-semibold">{data.payload?.name}</p>
                                <p className="text-sm">{fmt(data.value)}</p>
                              </div>
                            );
                          }}
                        />
                      </Sankey>
                    </ResponsiveContainer>
                    </div>
                    </Suspense>

                    {/* Disclaimer */}
                    <div className="pt-4 mt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold">Disclaimer:</span> This Lifetime Wealth Flow illustration attributes estate tax proportionally across all account types (taxable, pre-tax, and Roth) based on their share of the total estate. In practice, executors often choose to satisfy estate tax using taxable assets first to preserve tax-advantaged accounts like Roth IRAs. However, federal estate tax is imposed on the value of the entire estate—not on specific accounts—and the economic burden ultimately depends on your estate structure, beneficiary designations, and the tax treatment of your trust or inheritance plan (including whether a dynasty trust is used and how it is taxed). This chart is a simplified economic attribution model and should not be interpreted as guidance on which assets will or should be used to pay estate tax.
                      </p>
                    </div>

                    {/* Total RMDs if applicable */}
                    {res.totalRMDs > 0 && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Total RMDs (Age 73+)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cumulative Required Minimum Distributions
                            </p>
                          </div>
                          <p className="text-lg font-bold text-foreground">{fmt(res.totalRMDs)}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No end-of-life wealth data available.</p>
                  </div>
                )}
                    </CardContent>
                </Card>
            </div>

            <div className="print:hidden analysis-block">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <SparkleIcon className="text-blue-600" />
                      Plan Analysis
                    </CardTitle>
                    <CardDescription>Generate AI analysis of your retirement plan</CardDescription>
                  </div>
                  {res && !aiInsight && !isLoadingAi && (
                    <Button
                      onClick={async () => {
                        if (res && olderAgeForAnalysis > 0) {
                          await fetchAiInsight(res, olderAgeForAnalysis, "Please analyze my retirement plan and provide key insights and recommendations.");
                        }
                      }}
                      className="no-print whitespace-nowrap"
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </CardHeader>
              {(aiInsight || isLoadingAi) && (
                <CardContent>
                  <AiInsightBox
                    insight={aiInsight}
                    error={aiError}
                    isLoading={isLoadingAi}
                  />
                </CardContent>
              )}
            </Card>
            </div>

            {/* 2026 Income Planner CTA */}
            {res && (
              <div className="print:hidden mt-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <TrendingUpIcon className="w-5 h-5" />
                      Ready to Plan Your 2026 Income?
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      Your retirement plan is complete! Now build a detailed 2026 income budget with pre-filled estimates from your calculations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Route to self-employed calculator if either person is not W-2
                      // Only check spouse employment type if married
                      const usesSelfEmployed =
                        (planConfig.employmentType1 && planConfig.employmentType1 !== 'w2') ||
                        (marital === 'married' && planConfig.employmentType2 && planConfig.employmentType2 !== 'w2');
                      const targetPath = usesSelfEmployed ? '/self-employed-2026' : '/income-2026';
                      const plannerName = usesSelfEmployed ? '2026 Self-Employed Planner' : '2026 Income Planner';

                      return (
                        <>
                          <Link href={targetPath}>
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                              View {plannerName} →
                            </Button>
                          </Link>
                          <p className="text-xs text-blue-600 mt-2">
                            Fields will be pre-populated based on your {fmt(cPre1 + cPre2)} annual contributions
                          </p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sensitivity Analysis - Hide interactive UI from print */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="print:hidden">
              <Card data-sensitivity-section>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Which Variables Matter Most?</CardTitle>
                      <CardDescription>Impact ranking - highest to lowest</CardDescription>
                    </div>
                    <Button
                      variant={showSensitivity ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (!showSensitivity) {
                          const data = calculateSensitivity();
                          setSensitivityData(data);
                        }
                        setShowSensitivity(!showSensitivity);
                      }}
                      className="no-print"
                    >
                      {showSensitivity ? "Hide" : "Analyze"}
                    </Button>
                  </div>
                </CardHeader>
                {showSensitivity && sensitivityData && (
                  <CardContent className="print:block">
                    <p className="text-sm text-muted-foreground mb-6">
                      Variables ranked by impact on your end-of-life wealth. Focus your planning on the top factors.
                    </p>

                    {/* Impact Ranking List */}
                    <div className="space-y-4">
                      {sensitivityData.variations.map((variation: SensitivityVariation, idx: number) => {
                        const maxRange = sensitivityData.variations[0].range;
                        const impactScore = Math.min(5, Math.max(1, Math.round((variation.range / maxRange) * 5)));

                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-bold text-sm">
                                  {idx + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-foreground">{variation.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Impact range: {fmt(variation.range)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    className={`w-3 h-6 rounded-sm ${
                                      level <= impactScore
                                        ? 'bg-blue-500 dark:bg-blue-400'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">How to Use This</h4>
                      <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li>• <strong>Top-ranked variables</strong> have the biggest influence on your retirement outcome</li>
                        <li>• <strong>Impact bars (1-5)</strong> show relative importance at a glance</li>
                        <li>• Focus on optimizing the top 2-3 variables for maximum benefit</li>
                        <li>• Consider small changes to high-impact variables before big changes to low-impact ones</li>
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
              </div>
            </AnimatedSection>

            {/* Save/Compare Scenarios - Hide interactive UI from print */}
            <AnimatedSection animation="slide-up" delay={250}>
              <div className="print:hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="scenarios" className="border-none">
                  <Card data-scenarios-section>
                    <AccordionTrigger className="px-6 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                      <CardHeader className="p-0 flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <CardTitle className="text-left">Save & Compare Scenarios</CardTitle>
                            <CardDescription className="text-left">Save different retirement strategies and compare them side-by-side</CardDescription>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowScenarios(!showScenarios);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowScenarios(!showScenarios);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 no-print cursor-pointer ${
                              showScenarios
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {showScenarios ? "Hide" : `Show (${savedScenarios.length})`}
                          </div>
                        </div>
                      </CardHeader>
                    </AccordionTrigger>
                    {!showScenarios && savedScenarios.length > 0 && (
                      <div className="print-only mt-4">
                        <p className="text-sm text-muted-foreground">
                          {savedScenarios.length} saved scenario{savedScenarios.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    )}
                  <AccordionContent>
                    {(showScenarios || savedScenarios.length > 0) && (
                      <CardContent className="print:block pt-4">
                    {/* Save Current Scenario */}
                    {res && (
                      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start gap-2 mb-3">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Save your current calculation</strong> to compare with other strategies later.
                            To create more scenarios: adjust inputs → recalculate → save with a new name.
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <UIInput
                            id="scenario-name"
                            type="text"
                            placeholder="Give this scenario a name (e.g., 'Retire at 67', 'Max Savings')"
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && scenarioName.trim()) {
                                saveScenario();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={saveScenario}
                            disabled={!scenarioName.trim()}
                            className="whitespace-nowrap"
                          >
                            💾 Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Saved Scenarios List */}
                    {savedScenarios.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No saved scenarios yet.</p>
                        <p className="text-xs mt-2">Run a calculation and save it above to start comparing different strategies.</p>
                      </div>
                    ) : (
                      <>
                        {/* Compare Selected Button */}
                        {savedScenarios.length >= 2 && (
                          <div className="mb-4 flex items-center gap-3">
                            <Button
                              variant={showComparison ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowComparison(!showComparison)}
                              disabled={selectedScenarios.size === 0}
                            >
                              {showComparison ? "Hide" : "Compare Selected"} ({selectedScenarios.size})
                            </Button>
                            {selectedScenarios.size > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedScenarios(new Set())}
                                className="text-xs"
                              >
                                Clear Selection
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Comparison Chart */}
                        {showComparison && selectedScenarios.size > 0 && (() => {
                          // Pre-compute selected scenarios and max values once (O(n) instead of O(n^2))
                          const selectedScenariosArray = Array.from(selectedScenarios);
                          const selectedScenarioData = selectedScenariosArray
                            .map(id => savedScenarios.find(s => s.id === id))
                            .filter((s): s is NonNullable<typeof s> => s !== undefined);

                          const maxEOL = Math.max(...selectedScenarioData.map(s => s.results.eolReal || 0));
                          const maxIncome = Math.max(...selectedScenarioData.map(s => s.results.wdReal || 0));
                          const maxBalance = Math.max(...selectedScenarioData.map(s => s.results.finReal || 0));

                          return (
                          <div className="comparison-chart mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg print:border-gray-300">
                            <h4 className="font-semibold mb-4 text-indigo-900 dark:text-indigo-100">Visual Comparison</h4>
                            <div className="space-y-4">
                              {/* EOL Wealth Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">End-of-Life Wealth (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxEOL > 0 ? (scenario.results.eolReal / maxEOL) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.eolReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Annual Income Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Annual Retirement Income (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxIncome > 0 ? (scenario.results.wdReal / maxIncome) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.wdReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Retirement Balance Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Balance at Retirement (Real, Inflation-Adjusted)</div>
                                {selectedScenarioData.map((scenario) => {
                                  const pct = maxBalance > 0 ? (scenario.results.finReal / maxBalance) * 100 : 0;
                                  return (
                                    <div key={scenario.id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.finReal)}</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-violet-600 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                                          style={{ width: `${pct}%` }}
                                        >
                                          {pct > 20 && (
                                            <span className="text-xs font-semibold text-white">{pct.toFixed(0)}%</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          );
                        })()}

                        {/* Print Header for Scenarios */}
                        <div className="print-only print-scenario-header">
                          Saved Retirement Scenarios
                        </div>

                        {/* Comparison Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                {savedScenarios.length >= 2 && (
                                  <th className="text-left py-2 px-2 font-semibold w-8">
                                    <Checkbox
                                      checked={selectedScenarios.size === savedScenarios.length}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedScenarios(new Set(savedScenarios.map(s => s.id)));
                                        } else {
                                          setSelectedScenarios(new Set());
                                        }
                                      }}
                                    />
                                  </th>
                                )}
                                <th className="text-left py-2 px-2 font-semibold">Scenario</th>
                                <th className="text-right py-2 px-2 font-semibold">Retire Age</th>
                                <th className="text-right py-2 px-2 font-semibold">Balance @ Retirement</th>
                                <th className="text-right py-2 px-2 font-semibold">Annual Income</th>
                                <th className="text-right py-2 px-2 font-semibold">End-of-Life</th>
                                {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                  <th className="text-right py-2 px-2 font-semibold">Risk of Ruin</th>
                                )}
                                <th className="text-right py-2 px-2 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Current Plan Row (if calculated) */}
                              {res && (
                                <tr className="border-b border-border bg-primary/5">
                                  {savedScenarios.length >= 2 && <td className="py-2 px-2"></td>}
                                  <td className="py-2 px-2 font-medium text-primary">Current Plan (unsaved)</td>
                                  <td className="text-right py-2 px-2">{retirementAge}</td>
                                  <td className="text-right py-2 px-2">{fmt(res.finReal)} <span className="text-xs text-muted-foreground">real</span></td>
                                  <td className="text-right py-2 px-2">{fmt(res.wdReal)}</td>
                                  <td className="text-right py-2 px-2">{fmt(res.eol)}</td>
                                  {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                    <td className="text-right py-2 px-2">
                                      {res.probRuin !== undefined ? `${(res.probRuin * 100).toFixed(1)}%` : '-'}
                                    </td>
                                  )}
                                  <td className="text-right py-2 px-2">-</td>
                                </tr>
                              )}
                              {/* Saved Scenarios */}
                              {savedScenarios.map((scenario) => (
                                <tr key={scenario.id} className="border-b border-border hover:bg-muted/50">
                                  {savedScenarios.length >= 2 && (
                                    <td className="py-2 px-2">
                                      <Checkbox
                                        checked={selectedScenarios.has(scenario.id)}
                                        onCheckedChange={(checked) => {
                                          const newSet = new Set(selectedScenarios);
                                          if (checked) {
                                            newSet.add(scenario.id);
                                          } else {
                                            newSet.delete(scenario.id);
                                          }
                                          setSelectedScenarios(newSet);
                                        }}
                                      />
                                    </td>
                                  )}
                                  <td className="py-2 px-2 font-medium">{scenario.name}</td>
                                  <td className="text-right py-2 px-2">{scenario.inputs.retirementAge}</td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.finReal)} <span className="text-xs text-muted-foreground">real</span></td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.wdReal)}</td>
                                  <td className="text-right py-2 px-2">{fmt(scenario.results.eol)}</td>
                                  {savedScenarios.some(s => s.results.probRuin !== undefined) && (
                                    <td className="text-right py-2 px-2">
                                      {scenario.results.probRuin !== undefined ? `${(scenario.results.probRuin * 100).toFixed(1)}%` : '-'}
                                    </td>
                                  )}
                                  <td className="text-right py-2 px-2">
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => loadScenario(scenario)}
                                      >
                                        Load
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                        onClick={() => deleteScenario(scenario.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Key Insights */}
                        {savedScenarios.length >= 2 && (
                          <div className="mt-6 p-4 bg-muted rounded-lg">
                            <h4 className="text-sm font-semibold mb-2">Quick Comparison</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {(() => {
                                const allScenarios = res ? [{ name: "Current", results: { eolReal: res.eolReal, wdReal: res.wdReal, finReal: res.finReal } }, ...savedScenarios] : savedScenarios;
                                const bestEOL = allScenarios.reduce((max, s) => s.results.eolReal > max.results.eolReal ? s : max);
                                const bestIncome = allScenarios.reduce((max, s) => s.results.wdReal > max.results.wdReal ? s : max);
                                return (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <span className="text-green-600 dark:text-green-400">🏆</span>
                                      <div>
                                        <strong>Highest end-of-life wealth:</strong> {bestEOL.name} ({fmt(bestEOL.results.eolReal)})
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-blue-600 dark:text-blue-400">💰</span>
                                      <div>
                                        <strong>Highest annual income:</strong> {bestIncome.name} ({fmt(bestIncome.results.wdReal)})
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                      </CardContent>
                    )}
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
              </div>
            </AnimatedSection>
            </div>
            )}

            {/* Quick View Content - Simplified */}
            {resultsViewMode === 'quick' && (
              <div className="space-y-6">
                <AnimatedSection animation="fade-in" delay={200}>
                <Card>
                  <CardHeader>
                    <CardTitle>Wealth Projection</CardTitle>
                    <CardDescription>Your projected wealth over time (inflation-adjusted)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={res.data}>
                        <defs>
                          <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="year"
                          label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft' }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <RTooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                          labelFormatter={(label) => `Year ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="real"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#wealthGradient)"
                          name="Real Balance"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </Suspense>
                  </CardContent>
                </Card>
                </AnimatedSection>

                <p className="text-sm text-muted-foreground text-center">
                  Switch to <strong>Detailed View</strong> to see comprehensive charts, tax analysis, and advanced projections.
                </p>
              </div>
            )}

            </TabPanel>

            {/* Portfolio Stress Tests - Consolidates Bear Market, Inflation Shock, and Scenario Comparison */}
            <TabPanel id="stress" activeTab={activeMainTab}>
            {/* Risk Summary Card */}
            <AnimatedSection animation="fade-in" delay={200}>
              <RiskSummaryCard
                baseSuccessRate={res.probRuin !== undefined ? (1 - res.probRuin) * 100 : undefined}
                currentScenario={{
                  name: returnMode === 'fixed' ? 'Fixed Returns' : 'Historical Bootstrap',
                  description: returnMode === 'fixed'
                    ? `Assumes constant ${retRate}% annual return`
                    : 'Based on historical market data (1928-2024)',
                  successRate: res.probRuin !== undefined ? (1 - res.probRuin) * 100 : 100,
                  eolWealth: res.eolReal,  // Use real dollars for consistency
                  withdrawalAmount: res.wdReal
                }}
                showComparison={false}
              />
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={275}>
              <div className="print:hidden">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Portfolio Stress Tests</CardTitle>
                      <CardDescription>Test your retirement plan against adverse market conditions, inflation shocks, and compare scenarios</CardDescription>
                    </div>
                    <Button
                      variant={showStressTests ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowStressTests(!showStressTests)}
                      className="no-print"
                    >
                      {showStressTests ? "Hide" : "Show"}
                    </Button>
                  </div>
                </CardHeader>
                {showStressTests && (
                <CardContent>
                  <Tabs defaultValue="bear" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="bear">Bear Markets</TabsTrigger>
                      <TabsTrigger value="inflation">Inflation Shocks</TabsTrigger>
                      <TabsTrigger value="comparison">Comparison</TabsTrigger>
                    </TabsList>

                    {/* Bear Market Tab */}
                    <TabsContent value="bear" className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold">Bear Market Retirement Scenarios</h3>
                        <p className="text-sm text-muted-foreground">Test your plan with actual historical returns from major market crashes</p>
                      </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test your plan against the worst bear markets in history. Each scenario uses <strong>actual sequential S&P 500 returns</strong> from that year forward.
                    {historicalYear && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded text-xs font-semibold">
                        Currently using {historicalYear} returns
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BEAR_MARKET_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.year}
                        onClick={() => {
                          setHistoricalYear(scenario.year);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-lg hover:scale-[1.02] ${
                          historicalYear === scenario.year
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-400'
                            : scenario.risk === 'extreme'
                            ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:border-red-400'
                            : scenario.risk === 'high'
                            ? 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:border-orange-400'
                            : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 hover:border-yellow-400'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{scenario.year} - {scenario.label}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            scenario.risk === 'extreme'
                              ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                              : scenario.risk === 'high'
                              ? 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                              : 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
                          }`}>
                            {scenario.firstYear}
                          </span>
                        </div>
                        {historicalYear === scenario.year && (
                          <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">✓ Active scenario</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {historicalYear && (
                      <>
                        <Button
                          onClick={calc}
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Recalculate
                        </Button>
                        <Button
                          onClick={() => setHistoricalYear(null)}
                          variant="outline"
                          size="sm"
                        >
                          Clear Scenario
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Understanding Sequence-of-Returns Risk</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      These scenarios show why <strong>when you retire matters</strong>. Retiring into a bear market can permanently damage your portfolio even if markets recover later.
                      Click any scenario above to recalculate using actual historical returns from that year—the ultimate stress test for your retirement plan.
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                        <strong>Your Monte Carlo simulation already accounts for this!</strong> By running 1,000 scenarios with different return sequences,
                        it includes outcomes similar to these historical periods. Your probability of success reflects this sequence-of-returns risk.
                      </div>
                    </div>
                  </div>
                    </TabsContent>

                    {/* Inflation Shock Tab */}
                    <TabsContent value="inflation" className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold">Inflation Shock Scenarios</h3>
                        <p className="text-sm text-muted-foreground">Test your plan against periods of elevated inflation</p>
                      </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Model the impact of sustained high inflation on your real purchasing power. Inflation shocks start in your retirement year and last for the specified duration.
                    {inflationShockRate > 0 && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 rounded text-xs font-semibold">
                        {inflationShockRate}% inflation for {inflationShockDuration} years active
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {INFLATION_SHOCK_SCENARIOS.map((scenario) => (
                      <button
                        key={`${scenario.rate}-${scenario.duration}`}
                        onClick={() => {
                          setInflationShockRate(scenario.rate);
                          setInflationShockDuration(scenario.duration);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-lg hover:scale-[1.02] ${
                          inflationShockRate === scenario.rate && inflationShockDuration === scenario.duration
                            ? 'border-orange-500 dark:border-orange-400 bg-orange-100 dark:bg-orange-950 ring-2 ring-orange-400'
                            : scenario.risk === 'extreme'
                            ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:border-red-400'
                            : scenario.risk === 'high'
                            ? 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:border-orange-400'
                            : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 hover:border-yellow-400'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{scenario.label}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            scenario.risk === 'extreme'
                              ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                              : scenario.risk === 'high'
                              ? 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                              : 'bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
                          }`}>
                            {scenario.rate}%
                          </span>
                        </div>
                        {inflationShockRate === scenario.rate && inflationShockDuration === scenario.duration && (
                          <div className="mt-2 pt-2 border-t border-orange-300 dark:border-orange-700">
                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">✓ Active scenario</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">Custom Inflation Scenario</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Inflation Rate (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={inflationShockRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setInflationShockRate(Math.max(0, Math.min(20, val)));
                            else if (e.target.value === '') setInflationShockRate(0);
                          }}
                          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Duration (years)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={inflationShockDuration}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) setInflationShockDuration(Math.max(1, Math.min(10, val)));
                            else if (e.target.value === '') setInflationShockDuration(1);
                          }}
                          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {inflationShockRate > 0 && (
                      <>
                        <Button
                          onClick={calc}
                          variant="default"
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Recalculate
                        </Button>
                        <Button
                          onClick={() => setInflationShockRate(0)}
                          variant="outline"
                          size="sm"
                        >
                          Clear Scenario
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Understanding Inflation Risk</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      High inflation early in retirement can be devastating to your purchasing power. Even if your portfolio grows nominally,
                      <strong> real wealth</strong> (what you can actually buy) may decline significantly. These scenarios help you stress-test
                      your withdrawal strategy against sustained inflation shocks.
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                        <strong>Can be combined with bear markets!</strong> You can activate both an inflation shock and a bear market scenario
                        simultaneously to model compound stress (e.g., 1970s stagflation with stock market decline).
                      </div>
                    </div>
                  </div>
                    </TabsContent>

                    {/* Scenario Comparison Tab */}
                    <TabsContent value="comparison" className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold">Scenario Comparison</h3>
                        <p className="text-sm text-muted-foreground">Compare baseline vs bear market vs inflation shock side-by-side</p>
                      </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                          <strong>Comparison Mode Active:</strong> The chart below shows multiple scenarios overlaid using <strong>real (inflation-adjusted) values</strong> for accurate comparison across different inflation rates.
                          Select a bear market and/or inflation shock above, then click "Refresh Comparison" to update the chart. Or click "Random Comparison" to automatically select random scenarios.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Baseline Scenario */}
                      <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <h4 className="font-semibold text-sm">Baseline</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your plan with current assumptions (no shocks)
                        </p>
                      </div>

                      {/* Bear Market Scenario */}
                      <div className={`p-4 border-2 rounded-lg ${
                        historicalYear
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${historicalYear ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                          <h4 className="font-semibold text-sm">
                            {historicalYear
                              ? BEAR_MARKET_SCENARIOS.find(s => s.year === historicalYear)?.label
                              : 'No Bear Market'}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {historicalYear
                            ? `${historicalYear} crash applied`
                            : 'Select a bear market scenario above'}
                        </p>
                      </div>

                      {/* Inflation Shock Scenario */}
                      <div className={`p-4 border-2 rounded-lg ${
                        inflationShockRate > 0
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${inflationShockRate > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                          <h4 className="font-semibold text-sm">
                            {inflationShockRate > 0
                              ? `${inflationShockRate}% Inflation`
                              : 'No Inflation Shock'}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {inflationShockRate > 0
                            ? `${inflationShockDuration} years of elevated inflation`
                            : 'Select an inflation shock above'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => {
                          setComparisonMode(true);
                          runComparison();
                        }}
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Refresh Comparison
                      </Button>
                      <Button
                        onClick={runRandomComparison}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950/20"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Random Comparison
                      </Button>
                    </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                )}
              </Card>
              </div>
            </AnimatedSection>

            {/* Comparison Chart for Stress Tests Tab */}
            {comparisonMode && comparisonData.baseline?.data && comparisonData.baseline.data.length > 0 && (
              <AnimatedSection animation="slide-up" delay={300}>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Scenario Comparison Chart</CardTitle>
                    <CardDescription>Compare baseline, bear market, and inflation shock scenarios</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartLoadingFallback height="h-[400px]" />}>
                      <div className="chart-block">
                        <ScenarioComparisonChart
                          data={comparisonData.baseline.data}
                          comparisonData={comparisonData}
                          isDarkMode={isDarkMode}
                          fmt={fmt}
                        />
                      </div>
                    </Suspense>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}

            {/* Recalculate Button for Stress Tab */}
            <div className="flex justify-center mt-6">
              <RecalculateButton onClick={calc} isCalculating={isLoadingAi} />
            </div>
            </TabPanel>

            {/* Tabbed Chart Container - Using ResultsTab component */}
            <TabPanel id="results" activeTab={activeMainTab}>
              <ResultsTab
                res={res}
                walkSeries={randomWalkSeries}
                activeChartTab={activeChartTab}
                setActiveChartTab={setActiveChartTab}
                showP10={showP10}
                setShowP10={setShowP10}
                showP90={showP90}
                setShowP90={setShowP90}
                isDarkMode={isDarkMode}
                batchSummary={batchSummary}
                guardrailsResult={guardrailsResult}
                retirementAge={retirementAge}
                age1={age1}
                calculatorInputs={planConfig}
              />
            </TabPanel>
          </div>
          </AnimatedSection>
          </>
        )}

        {/* Input Form - Hide from print and All-in-One tab */}
        {activeMainTab !== 'all' && (
        <TabPanel id="configure" activeTab={activeMainTab}>
          <ConfigureTab
            marital={marital}
            setMarital={setMarital}
            age1={age1}
            setAge1={setAge1}
            age2={age2}
            setAge2={setAge2}
            retirementAge={retirementAge}
            setRetirementAge={setRetirementAge}
            isMar={isMar}
            taxableBalance={taxableBalance}
            setTaxableBalance={setTaxableBalance}
            pretaxBalance={pretaxBalance}
            setPretaxBalance={setPretaxBalance}
            rothBalance={rothBalance}
            setRothBalance={setRothBalance}
            cTax1={cTax1}
            setCTax1={setCTax1}
            cPre1={cPre1}
            setCPre1={setCPre1}
            cPost1={cPost1}
            setCPost1={setCPost1}
            cMatch1={cMatch1}
            setCMatch1={setCMatch1}
            cTax2={cTax2}
            setCTax2={setCTax2}
            cPre2={cPre2}
            setCPre2={setCPre2}
            cPost2={cPost2}
            setCPost2={setCPost2}
            cMatch2={cMatch2}
            setCMatch2={setCMatch2}
            retRate={retRate}
            setRetRate={setRetRate}
            inflationRate={inflationRate}
            setInflationRate={setInflationRate}
            stateRate={stateRate}
            setStateRate={setStateRate}
            incContrib={incContrib}
            setIncContrib={setIncContrib}
            incRate={incRate}
            setIncRate={setIncRate}
            wdRate={wdRate}
            setWdRate={setWdRate}
            returnMode={returnMode}
            setReturnMode={setReturnMode}
            randomWalkSeries={randomWalkSeries}
            setRandomWalkSeries={setRandomWalkSeries}
            allocationStrategy={allocationStrategy}
            setAllocationStrategy={setAllocationStrategy}
            bondStartPct={bondStartPct}
            setBondStartPct={setBondStartPct}
            bondEndPct={bondEndPct}
            setBondEndPct={setBondEndPct}
            bondStartAge={bondStartAge}
            setBondStartAge={setBondStartAge}
            bondEndAge={bondEndAge}
            setBondEndAge={setBondEndAge}
            glidePathShape={glidePathShape}
            setGlidePathShape={setGlidePathShape}
            bondGlidePath={bondGlidePath}
            includeSS={includeSS}
            setIncludeSS={setIncludeSS}
            ssIncome={ssIncome}
            setSSIncome={setSSIncome}
            ssClaimAge={ssClaimAge}
            setSSClaimAge={setSSClaimAge}
            ssIncome2={ssIncome2}
            setSSIncome2={setSSIncome2}
            ssClaimAge2={ssClaimAge2}
            setSSClaimAge2={setSSClaimAge2}
            includeMedicare={includeMedicare}
            setIncludeMedicare={setIncludeMedicare}
            medicarePremium={medicarePremium}
            setMedicarePremium={setMedicarePremium}
            medicalInflation={medicalInflation}
            setMedicalInflation={setMedicalInflation}
            includeLTC={includeLTC}
            setIncludeLTC={setIncludeLTC}
            ltcAnnualCost={ltcAnnualCost}
            setLtcAnnualCost={setLtcAnnualCost}
            ltcProbability={ltcProbability}
            setLtcProbability={setLtcProbability}
            ltcDuration={ltcDuration}
            setLtcDuration={setLtcDuration}
            ltcOnsetAge={ltcOnsetAge}
            setLtcOnsetAge={setLtcOnsetAge}
            ltcAgeRangeStart={ltcAgeRangeStart}
            setLtcAgeRangeStart={setLtcAgeRangeStart}
            ltcAgeRangeEnd={ltcAgeRangeEnd}
            setLtcAgeRangeEnd={setLtcAgeRangeEnd}
            enableRothConversions={enableRothConversions}
            setEnableRothConversions={setEnableRothConversions}
            targetConversionBracket={targetConversionBracket}
            setTargetConversionBracket={setTargetConversionBracket}
            onCalculate={calc}
            onInputChange={handleInputChange}
            isLoading={isLoadingAi}
            err={err}
            calcProgress={calcProgress}
            tabGroupRef={tabGroupRef}
          />
        </TabPanel>
        )}

        {/* SSOT Tab - Single Source of Truth - Hide from All-in-One tab */}
        {activeMainTab !== 'all' && (
        <TabPanel id="ssot" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          <SSOTTab />
        </AnimatedSection>
        </TabPanel>
        )}

        {/* Generational Wealth Modeling - Legacy Tab - Hide from All-in-One tab */}
        {activeMainTab !== 'all' && (
        <TabPanel id="legacy" activeTab={activeMainTab}>
          <LegacyTab
            showGen={showGen}
            setShowGen={setShowGen}
            hypPerBen={hypPerBen}
            setHypPerBen={setHypPerBen}
            numberOfBeneficiaries={numChildren || 1}
            setNumberOfBeneficiaries={(v: number) => updatePlanConfig({ numChildren: v }, 'user-entered')}
            childrenCurrentAges={childrenCurrentAges}
            setChildrenCurrentAges={(v: string) => {
              const parsedAges = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0);
              updatePlanConfig({ childrenAges: parsedAges, numChildren: parsedAges.length }, 'user-entered');
            }}
            additionalChildrenExpected={additionalChildrenExpected}
            setAdditionalChildrenExpected={setAdditionalChildrenExpected}
            totalFertilityRate={totalFertilityRate}
            setTotalFertilityRate={setTotalFertilityRate}
            generationLength={generationLength}
            handleGenerationLengthChange={handleGenerationLengthChange}
            fertilityWindowStart={fertilityWindowStart}
            setFertilityWindowStart={setFertilityWindowStart}
            fertilityWindowEnd={fertilityWindowEnd}
            setFertilityWindowEnd={setFertilityWindowEnd}
            hypDeathAge={hypDeathAge}
            setHypDeathAge={setHypDeathAge}
            hypMinDistAge={hypMinDistAge}
            setHypMinDistAge={setHypMinDistAge}
            applyGenerationalPreset={applyGenerationalPreset}
            onCalculate={calc}
            isRunning={isRunning}
            isLoadingAi={isLoadingAi}
            res={res}
            legacyResult={legacyResult}
            legacyCardRef={legacyCardRefLegacy as React.RefObject<HTMLDivElement>}
            genRef={genRef as React.RefObject<HTMLDivElement>}
            updatePlanConfig={(updates, source) => updatePlanConfig(updates, source as 'user-entered' | 'default')}
            onInputChange={handleInputChange}
          />
        </TabPanel>
        )}
        {/* Budget Tab - HIDDEN per user request (contains Retirement Timeline & Implied Budget) */}
        {false && (
        <TabPanel id="budget" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          {/* Retirement Timeline - First element */}
          {res && (
            <div className="mb-6">
              <TimelineView
                result={res!}
                currentAge={Math.max(age1, isMar ? age2 : age1)}
                retirementAge={retirementAge}
                spouseAge={Math.min(age1, isMar ? age2 : age1)}
              />
            </div>
          )}

          {/* Budget Calculator */}
          {res && (() => {
            // Calculate implied budget from retirement contributions
            // Assumptions for budget allocation
            const RETIREMENT_SAVINGS_RATE = 0.15; // 15% of gross income
            const HOUSING_RATE = 0.30; // 30% for housing/necessities
            const DISCRETIONARY_RATE = 0.25; // 25% for discretionary spending
            const TAXES_RATE = 0.30; // 30% for taxes (federal, state, FICA)

            // Calculate total annual contributions (taxable + pre-tax + post-tax/Roth)
            const totalContributions = cTax1 + cPre1 + cPost1;

            // Work backwards: if contributions are X% of gross, what's the gross income?
            const impliedGrossIncome = totalContributions / RETIREMENT_SAVINGS_RATE;

            // Calculate budget categories
            const budgetCategories = {
              gross: impliedGrossIncome,
              retirement: totalContributions,
              taxes: impliedGrossIncome * TAXES_RATE,
              housing: impliedGrossIncome * HOUSING_RATE,
              discretionary: impliedGrossIncome * DISCRETIONARY_RATE,
            };

            return (
              <Card>
                <CardHeader>
                  <CardTitle>Implied Budget</CardTitle>
                  <CardDescription>
                    Based on your ${fmt(totalContributions)} annual retirement contributions,
                    here's the minimum budget you would need assuming standard allocation percentages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">How This Works</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      We work backwards from your retirement contributions to estimate your minimum required income
                      using common financial planning ratios. This assumes you're saving {(RETIREMENT_SAVINGS_RATE * 100).toFixed(0)}%
                      of your gross income for retirement.
                    </p>
                  </div>

                  {/* Budget Breakdown */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gross Income */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Implied Gross Income</div>
                        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                          {fmt(budgetCategories.gross)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">100% of budget</div>
                      </div>

                      {/* Retirement Savings */}
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Retirement Contributions</div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                          {fmt(budgetCategories.retirement)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(RETIREMENT_SAVINGS_RATE * 100).toFixed(0)}% of gross income
                        </div>
                      </div>

                      {/* Taxes */}
                      <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Estimated Taxes</div>
                        <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                          {fmt(budgetCategories.taxes)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(TAXES_RATE * 100).toFixed(0)}% of gross income
                        </div>
                      </div>

                      {/* Housing/Necessities */}
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Housing & Necessities</div>
                        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {fmt(budgetCategories.housing)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(HOUSING_RATE * 100).toFixed(0)}% of gross income
                        </div>
                      </div>

                      {/* Discretionary */}
                      <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg col-span-1 md:col-span-2">
                        <div className="text-sm text-muted-foreground mb-1">Discretionary Spending</div>
                        <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                          {fmt(budgetCategories.discretionary)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(DISCRETIONARY_RATE * 100).toFixed(0)}% of gross income
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assumptions */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-semibold text-sm mb-3">Budget Assumptions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retirement Savings:</span>
                        <span className="font-medium">{(RETIREMENT_SAVINGS_RATE * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes (all):</span>
                        <span className="font-medium">{(TAXES_RATE * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Housing/Necessities:</span>
                        <span className="font-medium">{(HOUSING_RATE * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discretionary:</span>
                        <span className="font-medium">{(DISCRETIONARY_RATE * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      These percentages are based on common financial planning guidelines. Your actual budget may vary
                      based on your location, family size, and lifestyle choices.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </AnimatedSection>
        </TabPanel>
        )}

        {/* Optimize Tab */}
        <TabPanel id="optimize" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          {res && (
            <OptimizationTab
              inputs={{
                marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
                cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
                retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
                returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
                historicalYear: historicalYear || undefined,
                inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
                inflationShockDuration,
                dividendYield,
                enableRothConversions,
                targetConversionBracket,
                includeMedicare,
                medicarePremium,
                medicalInflation,
                irmaaThresholdSingle,
                irmaaThresholdMarried,
                irmaaSurcharge,
                includeLTC,
                ltcAnnualCost,
                ltcProbability,
                ltcDuration,
                ltcOnsetAge,
                ltcAgeRangeStart,
                ltcAgeRangeEnd,
                bondGlidePath,
              }}
              currentAge={Math.min(age1, isMar ? age2 : age1)}
              plannedRetirementAge={retirementAge}
            />
          )}
        </AnimatedSection>
        </TabPanel>

        {/* Planning Tools Tab */}
        <TabPanel id="tools" activeTab={activeMainTab}>
          <AnimatedSection animation="fade-in" delay={100}>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Planning Tools</h2>
                <p className="text-muted-foreground">Specialized calculators for student loans, annuity analysis, and semi-retirement planning.</p>
              </div>

              {/* Student Loan Optimizer */}
              <StudentLoanOptimizer />

              {/* Annuity Analyzer */}
              <AnnuityAnalyzer
                initialAge={age1}
                initialPortfolio={taxableBalance + pretaxBalance + rothBalance}
                expectedSSBenefit={ssIncome}
              />

              {/* Semi-Retirement Planner */}
              <SemiRetirement
                age={age1}
                spouseAge={isMar ? age2 : undefined}
                retirementAge={retirementAge}
                marital={marital}
                taxableBalance={taxableBalance}
                pretaxBalance={pretaxBalance}
                rothBalance={rothBalance}
                cTax1={cTax1}
                cPre1={cPre1}
                cPost1={cPost1}
                cMatch1={cMatch1}
                cTax2={isMar ? cTax2 : undefined}
                cPre2={isMar ? cPre2 : undefined}
                cPost2={isMar ? cPost2 : undefined}
                cMatch2={isMar ? cMatch2 : undefined}
                retRate={retRate}
                inflationRate={inflationRate}
                wdRate={wdRate}
                stateRate={stateRate}
                includeSS={includeSS}
                ssIncome={ssIncome}
                ssClaimAge={ssClaimAge}
                ssIncome2={isMar ? ssIncome2 : undefined}
                ssClaimAge2={isMar ? ssClaimAge2 : undefined}
              />

              {/* Plaid Bank Connection */}
              <PlaidConnect
                demoMode
                onImport={(balances) => {
                  setTaxableBalance(balances.totalInvestments + balances.totalCash);
                }}
              />
            </div>
          </AnimatedSection>
        </TabPanel>

        {/* Math Tab */}
        <TabPanel id="math" activeTab={activeMainTab}>
          <MathTab
            marital={marital}
            ltcProbability={ltcProbability}
            ltcDuration={ltcDuration}
            ltcAnnualCost={ltcAnnualCost}
            irmaaThresholdSingle={irmaaThresholdSingle}
            irmaaThresholdMarried={irmaaThresholdMarried}
          />
        </TabPanel>

        {/* Check Us Tab - Transparency & Calculation Verification */}
        <TabPanel id="checkUs" activeTab={activeMainTab}>
          <CheckUsTab />
        </TabPanel>
      </div>
      </div>

      {/* BACK TO TOP BUTTON */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </button>
      )}
    {/* Close ai-doc-mode-active wrapper */}

      {/* AI Review Panel */}
      <AIReviewPanel
        open={aiReviewOpen}
        onOpenChange={setAiReviewOpen}
        config={planConfig}
        results={res}
      />
    </div>
  );
}

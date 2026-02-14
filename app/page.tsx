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
    loading: () => <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />,
  }
);
import AddToWalletButton from "@/components/AddToWalletButton";
import DownloadCardButton from "@/components/DownloadCardButton";
import DownloadPDFButton from "@/components/DownloadPDFButton";
// LegacyResult type is managed by useCalculatorResults hook
import UserInputsPrintSummary from "@/components/UserInputsPrintSummary";
import { TopBanner } from "@/components/layout/TopBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SliderInput } from "@/components/form/SliderInput";
import { BrandLoader } from "@/components/BrandLoader";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";
import { Input, Spinner, Tip, TrendingUpIcon } from "@/components/calculator/InputHelpers";
import { TabNavigation, type MainTabId, isMainTabId } from "@/components/calculator/TabNavigation";
import { useBondGlidePathDerived, useBeneficiaryAgesDerived, useIsMarried, useTotalBalance } from "@/hooks/useCalculatorDerivedState";
import { TabPanel } from "@/components/calculator/TabPanel";
import { LastCalculatedBadge } from "@/components/calculator/LastCalculatedBadge";
import { RecalculateButton } from "@/components/calculator/RecalculateButton";
// Extracted modules (Phase 1 B1-B4)
import { InfoIcon, DollarSignIcon, UsersIcon, CalendarIcon, HourglassIcon, SparkleIcon } from "@/components/ui/InlineIcons";
import { toTitleCase, formatInsight } from "@/lib/formatUtils";
import { AiInsightBox } from "@/components/calculator/AiInsightBox";
import { StatCard, FlippingStatCard, CollapsibleSection, type IconComponentProps } from "@/components/calculator/StatCards";
import { WealthAccumulationChart } from "@/components/calculator/charts/WealthAccumulationChart";

import { URLTabSync } from "@/components/calculator/URLTabSync";
import { GenerationalWealthVisual } from "@/components/calculator/GenerationalWealthVisual";
import { simulateYearsChunk, checkPerpetualViability, simulateRealPerBeneficiaryPayout, type Cohort } from "@/lib/calculations/generationalWealth";
import { useWorkerSimulations } from "@/hooks/useWorkerSimulations";
import { useAiInsightEngine } from "@/hooks/useAiInsightEngine";
import { useCalculation, type SensitivityAnalysisData, type SensitivityVariation } from "@/hooks/useCalculation";
import { useCalculatorResults, useUIToggles, useSavedScenarios } from "@/hooks/useCalculatorResults";

import { TimelineView } from "@/components/calculator/TimelineView";
import { PlanSummaryCard } from "@/components/calculator/PlanSummaryCard";
import { NextStepsCard } from "@/components/calculator/NextStepsCard";
import { ResultsSummaryPanel } from "@/components/calculator/ResultsSummaryPanel";
// Lazy load MonteCarloVisualizer - only needed in results section
const MonteCarloVisualizer = dynamic(
  () => import("@/components/calculator/MonteCarloVisualizerWrapper").then((mod) => ({ default: mod.MonteCarloVisualizer })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />,
  }
);
import CyberpunkSplash, { type CyberpunkSplashHandle } from "@/components/calculator/CyberpunkSplash";
import { CheckUsTab } from "@/components/calculator/CheckUsTab";
import OptimizationTab from "@/components/calculator/OptimizationTab";
import { PrintReport } from "@/components/calculator/PrintReport";
import { ExportModal } from "@/components/export/ExportModal";
// soundPresets is now used in hooks/useCalculation.ts
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
    loading: () => <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />,
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
// Section wrappers for orphaned features
const OptimizeToolsSection = dynamic(
  () => import("@/components/calculator/tabs/OptimizeToolsSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const StressToolsSection = dynamic(
  () => import("@/components/calculator/tabs/StressToolsSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const LegacyToolsSection = dynamic(
  () => import("@/components/calculator/tabs/LegacyToolsSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const PlanningToolsExpanded = dynamic(
  () => import("@/components/calculator/tabs/PlanningToolsExpanded"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const ResultsVisualizationsSection = dynamic(
  () => import("@/components/calculator/tabs/ResultsVisualizationsSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const EducationSection = dynamic(
  () => import("@/components/calculator/tabs/EducationSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const GamificationSection = dynamic(
  () => import("@/components/calculator/tabs/GamificationSection"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
// Page-level features
const MarketTicker = dynamic(
  () => import("@/components/market/MarketTicker").then(mod => ({ default: mod.MarketTicker })),
  { ssr: false, loading: () => <div className="h-8 animate-pulse bg-muted rounded" /> }
);
const VersionHistory = dynamic(
  () => import("@/components/history/VersionHistory"),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const ScenarioManager = dynamic(
  () => import("@/components/calculator/ScenarioManager").then(mod => ({ default: mod.ScenarioManager })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
const AnalyticsDashboard = dynamic(
  () => import("@/components/calculator/AnalyticsDashboard").then(mod => ({ default: mod.AnalyticsDashboard })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
import { SSOTTab } from "@/components/calculator/SSOTTab";
import type { AdjustmentDeltas } from "@/components/layout/PageHeader";
import { useBudget } from "@/lib/budget-context";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import { OnboardingSelector } from "@/components/onboarding/OnboardingSelector";
import { AIReviewPanel } from "@/components/AIReviewPanel";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTheme } from "@/lib/theme-context";

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
  COLOR,
  type ColorKey,
} from "@/lib/constants";

import {
  fmt,
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
  type SimulationInputs,
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

// Validation utilities - used by ConfigureTab and input forms
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

/** All inputs needed to run a single simulation */
export type Inputs = SimulationInputs;

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

  // === State management hooks (called early to avoid use-before-declaration) ===

  // Calculator results hook (owns result, error, isRunning, isDirty, batch/legacy, comparison, session storage)
  const {
    result: res, setResult: setRes,
    error: err, setError: setErr,
    isRunning, setIsRunning,
    isDirty, setIsDirty, markDirty: markResultsDirty, markClean,
    batchSummary, setBatchSummary,
    legacyResult, setLegacyResult,
    comparisonData, setComparisonData,
    comparisonMode, setComparisonMode,
    lastCalculated, setLastCalculated,
    inputsModified, setInputsModified,
    clearResults, hasResults,
  } = useCalculatorResults();

  // UI toggles hook (owns visibility states + localStorage for resultsViewMode)
  const {
    showSensitivity, setShowSensitivity,
    showBearMarket, setShowBearMarket,
    showInflationShock, setShowInflationShock,
    showStressTests, setShowStressTests,
    showP10, setShowP10,
    showP90, setShowP90,
    showBackToTop, setShowBackToTop,
    aiReviewOpen, setAiReviewOpen,
    assumeTaxCutsExtended, setAssumeTaxCutsExtended,
    resultsViewMode, setResultsViewMode,
  } = useUIToggles();

  // Saved scenarios hook (owns savedScenarios, selectedScenarios, scenarioName + localStorage)
  const {
    savedScenarios,
    selectedScenarios, setSelectedScenarios,
    scenarioName, setScenarioName,
    showScenarios, setShowScenarios,
    showComparison, setShowComparison,
    saveScenario: hookSaveScenario,
    deleteScenario,
    toggleScenarioSelection,
  } = useSavedScenarios();

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
  const cMatch1 = Math.max(0, planConfig.cMatch1 ?? DEFAULTS.cMatch1);
  const cTax2 = planConfig.cTax2 ?? DEFAULTS.cTax2;
  const cPre2 = planConfig.cPre2 ?? DEFAULTS.cPre2;
  const cPost2 = planConfig.cPost2 ?? DEFAULTS.cPost2;
  const cMatch2 = Math.max(0, planConfig.cMatch2 ?? DEFAULTS.cMatch2);

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
  // markDirty delegates to useCalculatorResults hook
  const markDirty = markResultsDirty;

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

  // Refs for legacy card image download
  const legacyCardRefAllInOne = useRef<HTMLDivElement>(null!);
  const legacyCardRefLegacy = useRef<HTMLDivElement>(null!);

  // Build bond glide path configuration object
  const bondGlidePath = useBondGlidePathDerived(planConfig);

  // Auto-calculate beneficiary ages based on user's age and family structure
  const hypBenAgesStr = useBeneficiaryAgesDerived(planConfig, childrenCurrentAges, additionalChildrenExpected);

  const [olderAgeForAnalysis, setOlderAgeForAnalysis] = useState<number>(0);

  // Sensitivity analysis state (page-local, not in any hook)
  const [sensitivityData, setSensitivityData] = useState<SensitivityAnalysisData | null>(null);

  // Scenario Testing - synced to context
  const historicalYear = planConfig.historicalYear ?? null;
  const inflationShockRate = planConfig.inflationShockRate ?? 0;
  const inflationShockDuration = planConfig.inflationShockDuration ?? 5;

  const setHistoricalYear = (value: number | null) => { updatePlanConfig({ historicalYear: value ?? undefined }, 'user-entered'); markDirty(); };
  const setInflationShockRate = (value: number) => { updatePlanConfig({ inflationShockRate: value }, 'user-entered'); markDirty(); };
  const setInflationShockDuration = (value: number) => { updatePlanConfig({ inflationShockDuration: value }, 'user-entered'); markDirty(); };

  const { resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const [activeChartTab, setActiveChartTab] = useState("accumulation"); // Track active chart tab
  // NOTE: Brand loader is disabled - these are constants now (not useState)
  // to avoid unnecessary state and re-renders
  const loaderComplete = true;
  const loaderHandoff = true;
  const cubeAppended = true;

  // Tabbed interface state - foundation for future reorganization
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>('all');
  // lastCalculated and inputsModified are now provided by useCalculatorResults
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
  const tabGroupRef = useRef<TabGroupRef>(null);
  const splashRef = useRef<CyberpunkSplashHandle>(null);

  // Worker simulations hook (owns workerRef, calcProgress, guardrailsResult, rothResult)
  const {
    workerRef,
    calcProgress,
    guardrailsResult,
    setGuardrailsResult,
    rothResult,
    setRothResult,
    runMonteCarloViaWorker,
    runLegacyViaWorker,
    runGuardrailsAnalysis,
    runRothOptimizer,
  } = useWorkerSimulations();

  // AI insight engine hook (owns aiInsight, isLoadingAi, aiError, userQuestion)
  const {
    aiInsight,
    setAiInsight,
    isLoadingAi,
    setIsLoadingAi,
    aiError,
    setAiError,
    userQuestion,
    setUserQuestion,
    generateLocalInsight,
    fetchAiInsight,
    handleAskQuestion,
    askExplainQuestion,
  } = useAiInsightEngine(res, resRef);

  // Calculation engine hook (owns calc, calculateSensitivity, calculateLegacyResult, applyGenerationalPreset)
  const {
    calc,
    calculateSensitivity,
    calculateLegacyResult,
    applyGenerationalPreset,
  } = useCalculation({
    // Result state
    res, setRes, setErr: (v: string | null) => setErr(v), setIsRunning, setIsDirty,
    setBatchSummary, setLegacyResult, setOlderAgeForAnalysis,
    lastCalculated, setLastCalculated, setInputsModified,
    // Worker hook
    workerRef, runMonteCarloViaWorker, runLegacyViaWorker,
    runGuardrailsAnalysis, runRothOptimizer, setGuardrailsResult,
    // AI hook setters
    setAiInsight, setAiError, setIsLoadingAi,
    // UI refs
    splashRef, tabGroupRef,
    // UI state
    activeMainTab, setActiveMainTab, isFromWizard, setIsFromWizard,
    assumeTaxCutsExtended,
    setComparisonData, setComparisonMode,
    setShowBearMarket, setShowInflationShock,
    // Derived values
    hypBenAgesStr, bondGlidePath,
    // Legacy state setters
    setHypBirthMultiple, setHypBirthInterval,
  });

  // Dark mode is now managed by useTheme() from the theme context.
  // The ThemeProvider handles adding/removing the 'dark' class on <html>.

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

  const isMar = useIsMarried(planConfig);
  const total = useTotalBalance(planConfig);

  // formattedResults, chartData, and netWorthComparison are computed by extracted tab components
  // that receive `res` directly. No need to compute them here.

  // AI insight cache, generateLocalInsight, fetchAiInsight, handleAskQuestion, askExplainQuestion
  // are now provided by useAiInsightEngine hook above

  // AI cache functions (getCacheKey, getCachedResponse, setCachedResponse) are now in useAiInsightEngine

  // generateLocalInsight through askExplainQuestion are now provided by useAiInsightEngine hook

  // runMonteCarloViaWorker, runLegacyViaWorker, runGuardrailsAnalysis, runRothOptimizer
  // are now provided by useWorkerSimulations hook

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

  // calculateLegacyResult and applyGenerationalPreset are now provided by useCalculation hook

  // resultsViewMode localStorage read/write is now handled by useUIToggles

  const [exportModalOpen, setExportModalOpen] = useState(false);

  // calc(), calculateSensitivity, calculateLegacyResult, applyGenerationalPreset
  // are now provided by useCalculation hook (see hooks/useCalculation.ts)

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

  // savedScenarios localStorage persistence is now handled by useSavedScenarios hook

  // TRUE SIDE EFFECT: sessionStorage read on mount for tab navigation state
  // calculatorResults restore is now handled by useCalculatorResults hook.
  // This only restores the active tab.
  useEffect(() => {
    try {
      const savedTab = sessionStorage.getItem('calculatorTab');
      if (savedTab && isMainTabId(savedTab)) {
        console.log('[NAV PERSISTENCE] Restoring tab:', savedTab);
        setActiveMainTab(savedTab);
        sessionStorage.removeItem('calculatorTab');
      }
    } catch (e) {
      console.error('[NAV PERSISTENCE] Failed to restore tab:', e);
    }
  }, []);

  // TRUE SIDE EFFECT: sessionStorage write for tab/marital + budget context population
  // calculatorResults persistence is now handled by useCalculatorResults hook.
  // This handles tab, marital status, and budget context for cross-page navigation.
  useEffect(() => {
    if (res) {
      try {
        sessionStorage.setItem('calculatorTab', activeMainTab);
        sessionStorage.setItem('calculatorMarital', marital);

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

  // Save current inputs and results as a scenario (delegates to useSavedScenarios hook)
  const saveScenario = useCallback(() => {
    if (!res) return;
    hookSaveScenario({
      marital, age1, age2, retirementAge,
      employmentType1, employmentType2, primaryIncome, spouseIncome,
      emergencyFund, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cMatch1,
      cTax2, cPre2, cPost2, cMatch2,
      retRate, inflationRate, stateRate, incContrib, incRate, wdRate, dividendYield,
      includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    }, res);
  }, [res, hookSaveScenario, marital, age1, age2, retirementAge,
      employmentType1, employmentType2, primaryIncome, spouseIncome,
      emergencyFund, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
      retRate, inflationRate, stateRate, incContrib, incRate, wdRate, dividendYield,
      includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2]);

  // deleteScenario is now provided by useSavedScenarios hook

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
        onToggleDarkMode={toggleTheme}
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
        onShare={() => setExportModalOpen(true)}
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
      <MarketTicker className="no-print" />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        inputs={{
          marital, age1, age2, retirementAge,
          taxableBalance, pretaxBalance, rothBalance,
          cTax1, cPre1, cPost1, cMatch1,
          cTax2, cPre2, cPost2, cMatch2,
          retRate, inflationRate, stateRate, wdRate,
          incContrib, incRate,
        }}
        results={res}
        userName="Client"
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

        {/* Global error banner - visible on ALL tabs */}
        {err && (
          <Card className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-200">Calculation Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{err}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setErr(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

            <ResultsSummaryPanel
              activeMainTab={activeMainTab}
              isDirty={isDirty}
              res={res}
              calc={calc}
              isLoadingAi={isLoadingAi}
              isRunning={isRunning}
              batchSummary={batchSummary}
              resultsViewMode={resultsViewMode}
              setResultsViewMode={setResultsViewMode}
              retirementAge={retirementAge}
              total={total}
              returnMode={returnMode}
              retRate={retRate}
              inflationRate={inflationRate}
              wdRate={wdRate}
              isDarkMode={isDarkMode}
              askExplainQuestion={askExplainQuestion}
              aiInsight={aiInsight}
              aiError={aiError}
              fetchAiInsight={fetchAiInsight}
              olderAgeForAnalysis={olderAgeForAnalysis}
              planConfigEmploymentType1={planConfig.employmentType1}
              planConfigEmploymentType2={planConfig.employmentType2}
              marital={marital}
              cPre1={cPre1}
              cPre2={cPre2}
              showSensitivity={showSensitivity}
              setShowSensitivity={setShowSensitivity}
              calculateSensitivity={calculateSensitivity}
              sensitivityData={sensitivityData}
              setSensitivityData={setSensitivityData}
              showScenarios={showScenarios}
              setShowScenarios={setShowScenarios}
              savedScenarios={savedScenarios}
              selectedScenarios={selectedScenarios}
              setSelectedScenarios={setSelectedScenarios}
              showComparison={showComparison}
              setShowComparison={setShowComparison}
              scenarioName={scenarioName}
              setScenarioName={setScenarioName}
              saveScenario={saveScenario}
              deleteScenario={deleteScenario}
              loadScenario={loadScenario}
            />

            {/* Portfolio Stress Tests */}
            <TabPanel id="stress" activeTab={activeMainTab}>
              <ScenariosTab
                res={res}
                retMode={returnMode}
                retRate={retRate}
                showStressTests={showStressTests}
                setShowStressTests={setShowStressTests}
                historicalYear={historicalYear}
                setHistoricalYear={setHistoricalYear}
                inflationShockRate={inflationShockRate}
                setInflationShockRate={setInflationShockRate}
                inflationShockDuration={inflationShockDuration}
                setInflationShockDuration={setInflationShockDuration}
                comparisonMode={comparisonMode}
                setComparisonMode={setComparisonMode}
                comparisonData={comparisonData}
                runComparison={runComparison}
                runRandomComparison={runRandomComparison}
                isDarkMode={isDarkMode}
                isLoadingAi={isLoadingAi}
                onCalculate={calc}
              />
              <div className="mt-8">
              <ScenarioManager />
            </div>
            <div className="mt-8">
              <StressToolsSection />
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
              <div className="mt-8">
                <ResultsVisualizationsSection />
              </div>
              <div className="mt-8">
                <GamificationSection />
              </div>
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
        <div className="mt-8">
          <VersionHistory
            currentPlan={planConfig}
            onRestore={(version) => {
              if (version.data) {
                updatePlanConfig(version.data as unknown as Record<string, unknown>, 'user-entered');
              }
            }}
          />
        </div>
        <div className="mt-8">
          <AnalyticsDashboard
            currentSuccessRate={res?.probRuin !== undefined ? (1 - res.probRuin) * 100 : undefined}
            currentEndOfLifeWealth={res?.eolReal}
            retirementAge={retirementAge}
            withdrawalRate={wdRate}
          />
        </div>
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
          <div className="mt-8">
            <LegacyToolsSection />
          </div>
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
        <OptimizeToolsSection
          age={age1}
          spouseAge={isMar ? age2 : undefined}
          maritalStatus={marital}
          retirementAge={retirementAge}
          taxableBalance={taxableBalance}
          pretaxBalance={pretaxBalance}
          rothBalance={rothBalance}
          primaryIncome={planConfig.primaryIncome ?? 100000}
          ssIncome={ssIncome}
          filingStatus={marital}
          isMarried={isMar}
          portfolioValue={taxableBalance + pretaxBalance + rothBalance}
        />
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
          <div className="mt-8">
            <PlanningToolsExpanded />
          </div>
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
          <div className="mt-8">
            <EducationSection />
          </div>
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

      {/* QA Review Panel */}
      <AIReviewPanel
        open={aiReviewOpen}
        onOpenChange={setAiReviewOpen}
      />
    </div>
  );
}

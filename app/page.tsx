"use client"

import React, { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
// recharts components are consumed by extracted chart components (B3)
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ToggleGroup, Accordion, FlippingCard, GenerationalResultCard, LegacyResultCard
// are consumed by extracted tab components
// DynastyTimeline lazy-loaded by LegacyTab
// AddToWalletButton, DownloadCardButton, DownloadPDFButton consumed by extracted tabs
// LegacyResult type is managed by useCalculatorResults hook
import UserInputsPrintSummary from "@/components/UserInputsPrintSummary";
import { TopBanner } from "@/components/layout/TopBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { type TabGroupRef } from "@/components/ui/TabGroup";
import { TabNavigation, type MainTabId, isMainTabId } from "@/components/calculator/TabNavigation";
import { useBondGlidePathDerived, useBeneficiaryAgesDerived, useIsMarried, useTotalBalance } from "@/hooks/useCalculatorDerivedState";
import { TabPanel } from "@/components/calculator/TabPanel";
import { LastCalculatedBadge } from "@/components/calculator/LastCalculatedBadge";
import { URLTabSync } from "@/components/calculator/URLTabSync";
import { useWorkerSimulations } from "@/hooks/useWorkerSimulations";
import { useAiInsightEngine } from "@/hooks/useAiInsightEngine";
import { useCalculation, type SensitivityAnalysisData } from "@/hooks/useCalculation";
import { useCalculatorResults, useUIToggles, useSavedScenarios } from "@/hooks/useCalculatorResults";
import { usePlanConfigSetters } from "@/hooks/usePlanConfigSetters";
import { useComparison } from "@/hooks/useComparison";

// PlanSummaryCard, NextStepsCard consumed by extracted tabs
import { ResultsSummaryPanel } from "@/components/calculator/ResultsSummaryPanel";
import { AIDocMode } from "@/components/calculator/AIDocMode";
// MonteCarloVisualizer lazy-loaded by ResultsTab
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
// SequenceRiskChart, SpendingFlexibilityChart consumed by ResultsTab
// RothConversionOptimizer lazy-loaded by OptimizationTab
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
// MarketTicker removed: mock data was misleading. TODO: reconnect with real API.
// const MarketTicker = dynamic(
//   () => import("@/components/market/MarketTicker").then(mod => ({ default: mod.MarketTicker })),
//   { ssr: false, loading: () => <div className="h-8 animate-pulse bg-muted rounded" /> }
// );
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
import type { SavedScenario } from "@/types/calculator";

// Constants, utils, bondAllocation, validation — consumed by extracted hooks/components
import { fmt } from "@/lib/utils";
import type { ReturnMode, WalkSeries, BatchSummary } from "@/types/planner";
import type { SimulationInputs } from "@/lib/calculations/retirementEngine";

// Re-export types for compatibility
export type { ReturnMode, WalkSeries, BatchSummary };

/** All inputs needed to run a single simulation */
export type Inputs = SimulationInputs;

/** ===============================
 * App
 * ================================ */

export default function App() {
  const { setImplied } = useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

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
    isDirty, setIsDirty, markDirty: markResultsDirty,
    batchSummary, setBatchSummary,
    legacyResult, setLegacyResult,
    comparisonData, setComparisonData,
    comparisonMode, setComparisonMode,
    lastCalculated, setLastCalculated,
    inputsModified, setInputsModified,
  } = useCalculatorResults();

  // UI toggles hook (owns visibility states + localStorage for resultsViewMode)
  const {
    showSensitivity, setShowSensitivity,
    setShowBearMarket,
    setShowInflationShock,
    showStressTests, setShowStressTests,
    showP10, setShowP10,
    showP90, setShowP90,
    showBackToTop, setShowBackToTop,
    aiReviewOpen, setAiReviewOpen,
    assumeTaxCutsExtended,
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
  const numChildren = planConfig.numChildren ?? DEFAULTS.numChildren;

  // Memoized setter functions — generated by usePlanConfigSetters hook.
  // markDirty delegates to useCalculatorResults hook.
  const markDirty = markResultsDirty;

  const {
    setMarital, setAge1, setAge2, setRetirementAge,
    setTaxableBalance, setPretaxBalance, setRothBalance,
    setCTax1, setCPre1, setCPost1, setCMatch1,
    setCTax2, setCPre2, setCPost2, setCMatch2,
    setRetRate, setInflationRate, setStateRate, setIncContrib, setIncRate, setWdRate,
    setIncludeSS, setSSIncome, setSSClaimAge, setSSIncome2, setSSClaimAge2,
    setIncludeMedicare, setMedicarePremium, setMedicalInflation,
    setIncludeLTC, setLtcAnnualCost, setLtcProbability, setLtcDuration,
    setLtcOnsetAge, setLtcAgeRangeStart, setLtcAgeRangeEnd,
    setEnableRothConversions, setTargetConversionBracket,
    setShowGen, setHypPerBen, setAdditionalChildrenExpected,
    setTotalFertilityRate, setGenerationLength, setFertilityWindowStart, setFertilityWindowEnd,
    setHypDeathAge, setHypMinDistAge,
    setReturnMode, setRandomWalkSeries,
    setAllocationStrategy, setBondStartPct, setBondEndPct, setBondStartAge, setBondEndAge, setGlidePathShape,
    setHistoricalYear, setInflationShockRate, setInflationShockDuration,
  } = usePlanConfigSetters(updatePlanConfig, markDirty, planConfig);

  // Healthcare costs (post-retirement) - derived state reads from context
  const includeMedicare = planConfig.includeMedicare ?? true;
  const medicarePremium = planConfig.medicarePremium ?? DEFAULTS.medicarePremium;
  const medicalInflation = planConfig.medicalInflation ?? DEFAULTS.medicalInflation;
  const irmaaThresholdSingle = planConfig.irmaaThresholdSingle ?? DEFAULTS.irmaaThresholdSingle;
  const irmaaThresholdMarried = planConfig.irmaaThresholdMarried ?? DEFAULTS.irmaaThresholdMarried;
  const irmaaSurcharge = planConfig.irmaaSurcharge ?? DEFAULTS.irmaaSurcharge;

  // Long-Term Care - derived state reads from context
  const includeLTC = planConfig.includeLTC ?? false;
  const ltcAnnualCost = planConfig.ltcAnnualCost ?? DEFAULTS.ltcAnnualCost;
  const ltcProbability = planConfig.ltcProbability ?? DEFAULTS.ltcProbability;
  const ltcDuration = planConfig.ltcDuration ?? DEFAULTS.ltcDuration;
  const ltcOnsetAge = planConfig.ltcOnsetAge ?? DEFAULTS.ltcOnsetAge;
  const ltcAgeRangeStart = planConfig.ltcAgeRangeStart ?? DEFAULTS.ltcAgeRangeStart;
  const ltcAgeRangeEnd = planConfig.ltcAgeRangeEnd ?? DEFAULTS.ltcAgeRangeEnd;

  // Roth Conversion Strategy - derived state reads from context
  const enableRothConversions = planConfig.enableRothConversions ?? false;
  const targetConversionBracket = planConfig.targetConversionBracket ?? DEFAULTS.targetConversionBracket;

  // Generational Wealth - derived state reads from planConfig context
  const showGen = planConfig.showGen ?? false;

  // Generational wealth parameters (improved demographic model)
  const hypPerBen = planConfig.hypPerBen ?? DEFAULTS.hypPerBen;

  // Beneficiary inputs - DERIVED from planConfig (no useEffect sync needed)
  // childrenCurrentAges and numberOfChildren are now computed directly from planConfig
  // This eliminates the infinite loop bug that occurred with useEffect-based syncing
  const additionalChildrenExpected = planConfig.additionalChildrenExpected ?? DEFAULTS.additionalChildrenExpected;

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

  // Generational wealth demographic parameters - derived state reads from planConfig context
  const totalFertilityRate = planConfig.totalFertilityRate ?? DEFAULTS.totalFertilityRate; // Children per person (lifetime)
  const generationLength = planConfig.generationLength ?? DEFAULTS.generationLength; // Average age when having children
  const fertilityWindowStart = planConfig.fertilityWindowStart ?? DEFAULTS.fertilityWindowStart;
  const fertilityWindowEnd = planConfig.fertilityWindowEnd ?? DEFAULTS.fertilityWindowEnd;
  const hypDeathAge = planConfig.hypDeathAge ?? DEFAULTS.hypDeathAge;
  const hypMinDistAge = planConfig.hypMinDistAge ?? DEFAULTS.hypMinDistAge; // Minimum age to receive distributions

  // Legacy state variables for backward compatibility with old simulation
  const [, setHypBirthMultiple] = useState(1);
  const [, setHypBirthInterval] = useState(30);

  // Simulation Settings - derived state reads from context
  const returnMode = planConfig.returnMode ?? 'randomWalk';
  const seed = planConfig.seed ?? DEFAULTS.seed;
  const randomWalkSeries = planConfig.randomWalkSeries ?? 'trulyRandom';

  // Bond Glide Path Configuration - derived state reads from context
  const allocationStrategy = planConfig.allocationStrategy ?? 'aggressive';
  const bondStartPct = planConfig.bondStartPct ?? DEFAULTS.bondStartPct;
  const bondEndPct = planConfig.bondEndPct ?? DEFAULTS.bondEndPct;
  const bondStartAge = planConfig.bondStartAge ?? age1;
  const bondEndAge = planConfig.bondEndAge ?? DEFAULTS.bondEndAge;
  const glidePathShape = planConfig.glidePathShape ?? 'linear';

  // NOTE: bondStartAge sync with age1 is now handled atomically in setAge1()
  // This eliminates the useEffect cascade that was causing unnecessary re-renders

  // Refs for legacy card image download
  const legacyCardRefLegacy = useRef<HTMLDivElement>(null!);

  // Build bond glide path configuration object
  const bondGlidePath = useBondGlidePathDerived(planConfig);

  // Auto-calculate beneficiary ages based on user's age and family structure
  const hypBenAgesStr = useBeneficiaryAgesDerived(planConfig, childrenCurrentAges, additionalChildrenExpected);

  const [olderAgeForAnalysis, setOlderAgeForAnalysis] = useState<number>(0);

  // Sensitivity analysis state (page-local, not in any hook)
  const [sensitivityData, setSensitivityData] = useState<SensitivityAnalysisData | null>(null);

  // Scenario Testing - derived state reads from context
  const historicalYear = planConfig.historicalYear ?? null;
  const inflationShockRate = planConfig.inflationShockRate ?? DEFAULTS.inflationShockRate ?? 0;
  const inflationShockDuration = planConfig.inflationShockDuration ?? DEFAULTS.inflationShockDuration;

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
  }, [setInputsModified]);

  // Fix #4: Input Consistency - Auto-update fertility windows when generation length changes
  const handleGenerationLengthChange = useCallback((newGenLen: number) => {
    setGenerationLength(newGenLen);
    setFertilityWindowStart(newGenLen - 5);
    setFertilityWindowEnd(newGenLen + 5);
    handleInputChange(); // Mark inputs as modified
  }, [handleInputChange, setGenerationLength, setFertilityWindowStart, setFertilityWindowEnd]);

  const resRef = useRef<HTMLDivElement | null>(null);
  const genRef = useRef<HTMLDivElement | null>(null);
  const tabGroupRef = useRef<TabGroupRef>(null);
  const splashRef = useRef<CyberpunkSplashHandle>(null);

  // Worker simulations hook (owns workerRef, calcProgress, guardrailsResult, rothResult)
  const {
    workerRef,
    calcProgress,
    guardrailsResult,
    setGuardrailsResult,
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
    fetchAiInsight,
    askExplainQuestion,
  } = useAiInsightEngine(res, resRef);

  // Calculation engine hook (owns calc, calculateSensitivity, calculateLegacyResult, applyGenerationalPreset)
  const {
    calc,
    calculateSensitivity,
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
  }, [setShowBackToTop]);

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

  // runComparison and runRandomComparison are now provided by useComparison hook
  const { runComparison, runRandomComparison } = useComparison({
    comparisonMode, setComparisonMode,
    res, setErr, setComparisonData,
    historicalYear, inflationShockRate, inflationShockDuration,
    setHistoricalYear, setInflationShockRate, setInflationShockDuration,
    marital, age1, age2, retirementAge,
    taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    returnMode, randomWalkSeries,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    seed, isMar,
  });

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
    // All fallbacks use DEFAULTS from createDefaultPlanConfig() for consistency.
    updatePlanConfig({
      // Personal Info
      age1: inp.age1 ?? DEFAULTS.age1,
      age2: inp.age2 ?? DEFAULTS.age2,
      retirementAge: inp.retirementAge ?? DEFAULTS.retirementAge,
      marital: inp.marital ?? DEFAULTS.marital,
      // Employment & Income
      employmentType1: inp.employmentType1 ?? DEFAULTS.employmentType1,
      employmentType2: inp.employmentType2,
      primaryIncome: inp.primaryIncome ?? DEFAULTS.primaryIncome,
      spouseIncome: inp.spouseIncome ?? DEFAULTS.spouseIncome,
      // Current Balances
      emergencyFund: inp.emergencyFund ?? DEFAULTS.emergencyFund,
      taxableBalance: inp.taxableBalance ?? DEFAULTS.taxableBalance,
      pretaxBalance: inp.pretaxBalance ?? DEFAULTS.pretaxBalance,
      rothBalance: inp.rothBalance ?? DEFAULTS.rothBalance,
      // Contributions
      cTax1: inp.cTax1 ?? DEFAULTS.cTax1,
      cPre1: inp.cPre1 ?? DEFAULTS.cPre1,
      cPost1: inp.cPost1 ?? DEFAULTS.cPost1,
      cMatch1: inp.cMatch1 ?? DEFAULTS.cMatch1,
      cTax2: inp.cTax2 ?? DEFAULTS.cTax2,
      cPre2: inp.cPre2 ?? DEFAULTS.cPre2,
      cPost2: inp.cPost2 ?? DEFAULTS.cPost2,
      cMatch2: inp.cMatch2 ?? DEFAULTS.cMatch2,
      // Assumptions
      retRate: inp.retRate ?? DEFAULTS.retRate,
      inflationRate: inp.inflationRate ?? DEFAULTS.inflationRate,
      stateRate: inp.stateRate ?? DEFAULTS.stateRate,
      wdRate: inp.wdRate ?? DEFAULTS.wdRate,
      incContrib: inp.incContrib ?? DEFAULTS.incContrib,
      incRate: inp.incRate ?? DEFAULTS.incRate,
      dividendYield: inp.dividendYield ?? DEFAULTS.dividendYield,
      // Social Security
      includeSS: inp.includeSS ?? DEFAULTS.includeSS,
      ssIncome: inp.ssIncome ?? DEFAULTS.ssIncome,
      ssClaimAge: inp.ssClaimAge ?? DEFAULTS.ssClaimAge,
      ssIncome2: inp.ssIncome2 ?? DEFAULTS.ssIncome2,
      ssClaimAge2: inp.ssClaimAge2 ?? DEFAULTS.ssClaimAge2,
    }, 'user-entered');
  }, [updatePlanConfig, DEFAULTS]);

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
  }, [isAIDocMode, res]);

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
      <AIDocMode isActive={isAIDocMode} onToggle={() => setIsAIDocMode(false)} hasResults={!!res} />

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
      {/* MarketTicker removed: was displaying fake mock data as live market conditions.
          TODO: Re-enable when connected to a real market data API. */}

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

        {/* Plan Settings Tab (SSOT) - Hide from All-in-One tab */}
        {activeMainTab !== 'all' && (
        <TabPanel id="planSettings" activeTab={activeMainTab}>
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
          primaryIncome={planConfig.primaryIncome ?? DEFAULTS.primaryIncome}
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

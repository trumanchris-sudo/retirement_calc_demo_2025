/**
 * Calculator Results State Hook
 *
 * Manages the calculation results and related UI state.
 * This consolidates multiple useState hooks from page.tsx into a single cohesive hook.
 *
 * Benefits:
 * 1. Reduces prop drilling by co-locating related state
 * 2. Encapsulates result transformation logic
 * 3. Provides memoized derived values
 * 4. Manages localStorage persistence for results
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  CalculationResult,
  ChartDataPoint,
  SavedScenario,
  ComparisonData,
} from '@/types/calculator';
import type { BatchSummary } from '@/types/planner';
import type { LegacyResult } from '@/lib/walletPass';
import { fmt } from '@/lib/utils';

/**
 * Formatted results for display
 */
interface FormattedResults {
  finNom: string;
  finReal: string;
  wd: string;
  wdAfter: string;
  wdReal: string;
  eol: string;
  eolReal: string;
  estateTax: string;
  netEstate: string;
  totalRMDs: string;
  fedOrd: string;
  fedCap: string;
  niit: string;
  state: string;
  tot: string;
}

/**
 * Chart data split by phase
 */
interface ChartData {
  accumulation: ChartDataPoint[];
  drawdown: ChartDataPoint[];
  full: ChartDataPoint[];
}

/**
 * Return type of the useCalculatorResults hook
 */
interface UseCalculatorResultsReturn {
  // Core results
  result: CalculationResult | null;
  setResult: (result: CalculationResult | null) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Calculation state
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  markClean: () => void;

  // Derived results (memoized)
  formattedResults: FormattedResults | null;
  chartData: ChartData | null;

  // Batch/Monte Carlo results
  // Note: guardrailsResult, rothResult, and calcProgress are managed by useWorkerSimulations
  batchSummary: BatchSummary | null;
  setBatchSummary: (summary: BatchSummary | null) => void;
  legacyResult: LegacyResult | null;
  setLegacyResult: (result: LegacyResult | null) => void;

  // Comparison data
  comparisonData: ComparisonData;
  setComparisonData: (data: ComparisonData) => void;
  comparisonMode: boolean;
  setComparisonMode: (mode: boolean) => void;

  // UI state
  lastCalculated: Date | null;
  setLastCalculated: (date: Date | null) => void;
  inputsModified: boolean;
  setInputsModified: (modified: boolean) => void;

  // Actions
  clearResults: () => void;
  hasResults: boolean;
}

const SESSION_KEY_RESULTS = 'calculatorResults';

/**
 * Hook for managing calculator results and related state
 */
export function useCalculatorResults(): UseCalculatorResultsReturn {
  // Core results
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculation state
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Batch results (guardrailsResult, rothResult, calcProgress are in useWorkerSimulations)
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [legacyResult, setLegacyResult] = useState<LegacyResult | null>(null);

  // Comparison
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    baseline: null,
    bearMarket: null,
    inflation: null,
  });
  const [comparisonMode, setComparisonMode] = useState(false);

  // UI state
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [inputsModified, setInputsModified] = useState(false);

  // Dirty state helpers
  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);

  // Clear all results
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
    setBatchSummary(null);
    setLegacyResult(null);
    setComparisonData({
      baseline: null,
      bearMarket: null,
      inflation: null,
    });
    setComparisonMode(false);
    setLastCalculated(null);
    setInputsModified(false);
    setIsDirty(false);
  }, []);

  // Memoized formatted results for display
  const formattedResults = useMemo<FormattedResults | null>(() => {
    if (!result) return null;
    return {
      finNom: fmt(result.finNom),
      finReal: fmt(result.finReal),
      wd: fmt(result.wd),
      wdAfter: fmt(result.wdAfter),
      wdReal: fmt(result.wdReal),
      eol: fmt(result.eol),
      eolReal: fmt(result.eolReal),
      estateTax: fmt(result.estateTax),
      netEstate: fmt(result.netEstate),
      totalRMDs: fmt(result.totalRMDs),
      fedOrd: fmt(result.tax.fedOrd),
      fedCap: fmt(result.tax.fedCap),
      niit: fmt(result.tax.niit),
      state: fmt(result.tax.state),
      tot: fmt(result.tax.tot),
    };
  }, [result]);

  // Memoized chart data splits
  const chartData = useMemo<ChartData | null>(() => {
    if (!result?.data || result.data.length === 0) return null;
    return {
      accumulation: result.data.slice(0, result.yrsToRet + 1),
      drawdown: result.data.slice(result.yrsToRet),
      full: result.data,
    };
  }, [result?.data, result?.yrsToRet]);

  // Navigation state persistence - restore from sessionStorage
  useEffect(() => {
    try {
      const savedResults = sessionStorage.getItem(SESSION_KEY_RESULTS);
      if (savedResults) {
        const results = JSON.parse(savedResults);
        if (process.env.NODE_ENV === 'development') {
          console.log('[Results] Restoring saved results from session');
        }
        setResult(results);
        setLastCalculated(new Date());
        // Clear after restore
        sessionStorage.removeItem(SESSION_KEY_RESULTS);
      }
    } catch (e) {
      console.error('[Results] Failed to restore from session:', e);
    }
  }, []);

  // Navigation state persistence - save to sessionStorage when results change
  useEffect(() => {
    if (result) {
      try {
        sessionStorage.setItem(SESSION_KEY_RESULTS, JSON.stringify(result));
      } catch (e) {
        console.error('[Results] Failed to save to session:', e);
      }
    }
  }, [result]);

  return {
    // Core results
    result,
    setResult,
    error,
    setError,

    // Calculation state
    isRunning,
    setIsRunning,
    isDirty,
    setIsDirty,
    markDirty,
    markClean,

    // Derived results
    formattedResults,
    chartData,

    // Batch results
    batchSummary,
    setBatchSummary,
    legacyResult,
    setLegacyResult,

    // Comparison
    comparisonData,
    setComparisonData,
    comparisonMode,
    setComparisonMode,

    // UI state
    lastCalculated,
    setLastCalculated,
    inputsModified,
    setInputsModified,

    // Actions
    clearResults,
    hasResults: result !== null,
  };
}

/**
 * Hook for managing saved scenarios
 */
export function useSavedScenarios() {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [scenarioName, setScenarioName] = useState('');
  const [showScenarios, setShowScenarios] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('retirement-scenarios');
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[Scenarios] Failed to load:', e);
    }
  }, []);

  // Save scenario
  const saveScenario = useCallback(
    (inputs: Record<string, unknown>, results: Partial<CalculationResult>) => {
      if (!scenarioName.trim()) return;

      const scenario: SavedScenario = {
        id: Date.now().toString(),
        name: scenarioName.trim(),
        timestamp: Date.now(),
        inputs,
        results: {
          finNom: results.finNom ?? 0,
          finReal: results.finReal ?? 0,
          wd: results.wd ?? 0,
          wdReal: results.wdReal ?? 0,
          eol: results.eol ?? 0,
          eolReal: results.eolReal ?? 0,
          estateTax: results.estateTax ?? 0,
          netEstate: results.netEstate ?? 0,
          probRuin: results.probRuin,
        },
      };

      const updated = [...savedScenarios, scenario];
      setSavedScenarios(updated);
      localStorage.setItem('retirement-scenarios', JSON.stringify(updated));
      setScenarioName('');
    },
    [scenarioName, savedScenarios]
  );

  // Delete scenario
  const deleteScenario = useCallback(
    (id: string) => {
      const updated = savedScenarios.filter((s) => s.id !== id);
      setSavedScenarios(updated);
      localStorage.setItem('retirement-scenarios', JSON.stringify(updated));
      selectedScenarios.delete(id);
      setSelectedScenarios(new Set(selectedScenarios));
    },
    [savedScenarios, selectedScenarios]
  );

  // Toggle scenario selection for comparison
  const toggleScenarioSelection = useCallback((id: string) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return {
    savedScenarios,
    selectedScenarios,
    setSelectedScenarios,
    scenarioName,
    setScenarioName,
    showScenarios,
    setShowScenarios,
    showComparison,
    setShowComparison,
    saveScenario,
    deleteScenario,
    toggleScenarioSelection,
  };
}

/**
 * Hook for managing AI insight state
 */
export function useAIInsightState() {
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>('');

  // Simple LRU cache for AI responses
  const aiCache = useRef<Map<string, { response: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const MAX_CACHE_SIZE = 50;

  const getCachedResponse = useCallback((key: string): string | null => {
    const cached = aiCache.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      cached.timestamp = Date.now(); // LRU touch
      return cached.response;
    }
    if (cached) {
      aiCache.current.delete(key);
    }
    return null;
  }, []);

  const setCachedResponse = useCallback((key: string, response: string): void => {
    if (aiCache.current.size >= MAX_CACHE_SIZE) {
      // Remove LRU entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      aiCache.current.forEach((value: { response: string; timestamp: number }, k: string) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = k;
        }
      });
      if (oldestKey) aiCache.current.delete(oldestKey);
    }
    aiCache.current.set(key, { response, timestamp: Date.now() });
  }, []);

  const clearAiState = useCallback(() => {
    setAiInsight('');
    setIsLoadingAi(false);
    setAiError(null);
    setUserQuestion('');
  }, []);

  return {
    aiInsight,
    setAiInsight,
    isLoadingAi,
    setIsLoadingAi,
    aiError,
    setAiError,
    userQuestion,
    setUserQuestion,
    getCachedResponse,
    setCachedResponse,
    clearAiState,
  };
}

/**
 * Hook for managing UI visibility toggles
 * Consolidates many boolean useState hooks
 */
export function useUIToggles() {
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showBearMarket, setShowBearMarket] = useState(false);
  const [showInflationShock, setShowInflationShock] = useState(false);
  const [showStressTests, setShowStressTests] = useState(true);
  const [showP10, setShowP10] = useState(false);
  const [showP90, setShowP90] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [assumeTaxCutsExtended, setAssumeTaxCutsExtended] = useState(false);

  // Results view mode with localStorage persistence
  const [resultsViewMode, setResultsViewMode] = useState<'quick' | 'detailed'>('detailed');

  // Load preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wdr_results_view_mode');
      if (saved === 'quick' || saved === 'detailed') {
        setResultsViewMode(saved);
      }
    }
  }, []);

  // Save preference on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wdr_results_view_mode', resultsViewMode);
    }
  }, [resultsViewMode]);

  return {
    showSensitivity,
    setShowSensitivity,
    showBearMarket,
    setShowBearMarket,
    showInflationShock,
    setShowInflationShock,
    showStressTests,
    setShowStressTests,
    showP10,
    setShowP10,
    showP90,
    setShowP90,
    showBackToTop,
    setShowBackToTop,
    aiReviewOpen,
    setAiReviewOpen,
    assumeTaxCutsExtended,
    setAssumeTaxCutsExtended,
    resultsViewMode,
    setResultsViewMode,
  };
}

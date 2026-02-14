/**
 * useWorkerSimulations Hook
 * Extracted from page.tsx — manages Web Worker lifecycle and worker-based simulations.
 *
 * Owns: workerRef, calcProgress
 * Exposes: runMonteCarloViaWorker, runLegacyViaWorker, runGuardrailsAnalysis, runRothOptimizer
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import { createDefaultPlanConfig } from '@/types/plan-config';
import { RMD_START_AGE } from '@/lib/constants';
import type { CalculationResult, CalculationProgress } from '@/types/calculator';
import type { SimulationInputs } from '@/lib/calculations/retirementEngine';
import type { BatchSummary, GuardrailsResult, RothConversionResult } from '@/types/planner';

const DEFAULTS = createDefaultPlanConfig();

export type Inputs = SimulationInputs;

export function useWorkerSimulations() {
  const { config: planConfig } = usePlanConfig();

  // Derive config values
  const retirementAge = planConfig.retirementAge ?? DEFAULTS.retirementAge;
  const marital = planConfig.marital ?? DEFAULTS.marital;
  const includeSS = planConfig.includeSS ?? DEFAULTS.includeSS;
  const ssIncome = planConfig.ssIncome ?? DEFAULTS.ssIncome;
  const ssIncome2 = planConfig.ssIncome2 ?? DEFAULTS.ssIncome2;
  const isMar = marital === 'married';
  const wdRate = planConfig.wdRate ?? DEFAULTS.wdRate;
  const retRate = planConfig.retRate ?? DEFAULTS.retRate;

  // Hook-owned state
  const workerRef = useRef<Worker | null>(null);
  const [calcProgress, setCalcProgress] = useState<CalculationProgress | null>(null);
  const [guardrailsResult, setGuardrailsResult] = useState<GuardrailsResult | null>(null);
  const [rothResult, setRothResult] = useState<RothConversionResult | null>(null);

  // Worker lifecycle
  useEffect(() => {
    console.log('[WORKER] Initializing web worker...');
    try {
      workerRef.current = new Worker('/monte-carlo-worker.js');
      console.log('[WORKER] Web worker initialized successfully');

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

  // Reason: legacy result type uses `any` for generationData from worker
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
    // Reason: generationData shape varies by worker version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<{ years: number; fundLeftReal: number; lastLivingCount: number; generationData?: any[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const worker = workerRef.current;
      const requestId = `legacy_${Date.now()}_${Math.random()}`;

      const timeout = setTimeout(() => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        console.error('[LEGACY] Worker timed out after 60s for request:', requestId);
        reject(new Error("Legacy simulation timed out after 60 seconds"));
      }, 60_000);

      const handleMessage = (e: MessageEvent) => {
        if (!e.data) return;

        const { type, result, error, requestId: responseId } = e.data;

        if (type === 'legacy-complete' && responseId === requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          resolve(result);
        } else if (type === 'error' && responseId === requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(error));
        }
      };

      const handleError = (e: ErrorEvent) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker error: ${e.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage({ type: 'legacy', params, requestId });
    });
  }, []);

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

  const runRothOptimizer = useCallback((result: CalculationResult) => {
    if (!workerRef.current || !result) {
      console.warn('[ROTH-OPT] Cannot run analysis - missing worker or data');
      return;
    }

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

    const ssAnnualIncome = includeSS ? (ssIncome || 0) + (isMar ? (ssIncome2 || 0) : 0) : 0;
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
        targetBracket: 0.24,
        growthRate: retRate / 100,
      }
    });
  }, [retirementAge, marital, includeSS, ssIncome, ssIncome2, isMar, wdRate, retRate]);

  return {
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
  };
}

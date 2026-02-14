/**
 * useAiInsightEngine Hook
 * Extracted from page.tsx — manages AI insight generation, caching, and Q&A.
 *
 * Owns: aiCache, aiInsight, isLoadingAi, aiError, userQuestion
 * Exposes: generateLocalInsight, fetchAiInsight, handleAskQuestion, askExplainQuestion
 */

import { useCallback, useRef, useState } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import { createDefaultPlanConfig } from '@/types/plan-config';
import { useIsMarried, useTotalBalance } from '@/hooks/useCalculatorDerivedState';
import { fmt } from '@/lib/utils';
import type { CalculationResult } from '@/types/calculator';

const DEFAULTS = createDefaultPlanConfig();

export function useAiInsightEngine(
  res: CalculationResult | null,
  resRef: React.RefObject<HTMLDivElement | null>,
) {
  const { config: planConfig } = usePlanConfig();

  // Derive config values
  const age1 = planConfig.age1 ?? DEFAULTS.age1;
  const age2 = planConfig.age2 ?? DEFAULTS.age2;
  const retirementAge = planConfig.retirementAge ?? DEFAULTS.retirementAge;
  const marital = planConfig.marital ?? DEFAULTS.marital;
  const wdRate = planConfig.wdRate ?? DEFAULTS.wdRate;
  const retRate = planConfig.retRate ?? DEFAULTS.retRate;
  const inflationRate = planConfig.inflationRate ?? DEFAULTS.inflationRate;
  const stateRate = planConfig.stateRate ?? DEFAULTS.stateRate;
  const includeSS = planConfig.includeSS ?? DEFAULTS.includeSS;
  const ssIncome = planConfig.ssIncome ?? DEFAULTS.ssIncome;
  const ssClaimAge = planConfig.ssClaimAge ?? DEFAULTS.ssClaimAge;
  const taxableBalance = planConfig.taxableBalance ?? DEFAULTS.taxableBalance;
  const pretaxBalance = planConfig.pretaxBalance ?? DEFAULTS.pretaxBalance;
  const rothBalance = planConfig.rothBalance ?? DEFAULTS.rothBalance;
  const returnMode = planConfig.returnMode ?? DEFAULTS.returnMode;
  const cTax1 = planConfig.cTax1 ?? DEFAULTS.cTax1;
  const cPre1 = planConfig.cPre1 ?? DEFAULTS.cPre1;
  const cPost1 = planConfig.cPost1 ?? DEFAULTS.cPost1;
  const cTax2 = planConfig.cTax2 ?? DEFAULTS.cTax2;
  const cPre2 = planConfig.cPre2 ?? DEFAULTS.cPre2;
  const cPost2 = planConfig.cPost2 ?? DEFAULTS.cPost2;

  const isMar = useIsMarried(planConfig);
  const total = useTotalBalance(planConfig);

  // Hook-owned state
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>("");

  // Cache
  const aiCache = useRef<Map<string, { response: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const MAX_CACHE_SIZE = 50;

  const getCacheKey = (question: string, calcResult: CalculationResult): string => {
    const keyData = {
      q: question.toLowerCase().trim(),
      bal: Math.round(calcResult.finReal / 1000),
      wd: Math.round(calcResult.wdReal / 100),
      estate: Math.round((calcResult.estateTax || 0) / 10000),
      prob: calcResult.probRuin !== undefined ? Math.round(calcResult.probRuin * 100) : 0,
      eol: Math.round(calcResult.eolReal / 1000),
      age: retirementAge,
      marital,
      wdRate: Math.round(wdRate * 10),
      retRate: Math.round(retRate * 10),
      inflationRate: Math.round(inflationRate * 10),
      includeSS: includeSS ? 1 : 0,
      contrib: Math.round((cTax1 + cPre1 + cPost1 + cTax2 + cPre2 + cPost2) / 1000),
    };
    return JSON.stringify(keyData);
  };

  const getCachedResponse = (cacheKey: string): string | null => {
    const cached = aiCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      cached.timestamp = Date.now();
      return cached.response;
    }
    if (cached) {
      aiCache.current.delete(cacheKey);
    }
    return null;
  };

  const setCachedResponse = (cacheKey: string, response: string): void => {
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

    if (survivalYears < targetYears) {
      const shortfallYears = targetYears - survivalYears;
      analysis += `Your retirement plan shows a critical funding gap. Based on your current withdrawal rate of ${withdrawalRate}%, funds are projected to be exhausted after ${survivalYears} years (age ${endAge}), which is ${shortfallYears} years short of your planning horizon.\n\n`;
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

    if (withdrawalRate <= 3) {
      analysis += `Your ${withdrawalRate}% withdrawal rate is very conservative, providing strong longevity protection and potential for wealth growth.\n\n`;
    } else if (withdrawalRate <= 4) {
      analysis += `Your ${withdrawalRate}% withdrawal rate aligns with traditional safe withdrawal guidelines, balancing income needs with portfolio preservation.\n\n`;
    } else if (withdrawalRate <= 5) {
      analysis += `Your ${withdrawalRate}% withdrawal rate is moderately aggressive. Monitor your plan annually and be prepared to adjust spending if market conditions decline.\n\n`;
    } else {
      analysis += `Your ${withdrawalRate}% withdrawal rate is quite aggressive and may pose longevity risk. Consider reducing withdrawals or exploring ways to supplement retirement income.\n\n`;
    }

    if (estateTax > 1000000) {
      analysis += `Significant Estate Tax Impact: Your projected estate of $${eolWealth.toLocaleString()} will incur approximately $${estateTax.toLocaleString()} in federal estate taxes. `;
      analysis += `Strategic gifting, charitable giving, or trust structures could help preserve more wealth for your heirs. This is complex - consult with an estate planning attorney.\n\n`;
    } else if (estateTax > 100000) {
      analysis += `Your estate is projected to incur $${estateTax.toLocaleString()} in federal estate taxes. Consider estate planning strategies to reduce this burden.\n\n`;
    }

    if (hasRMDs) {
      const totalRMDs = calcResult.totalRMDs;
      analysis += `Required Minimum Distributions (RMDs) starting at age 73 will require you to withdraw $${totalRMDs.toLocaleString()} from pre-tax accounts over your retirement. These mandatory withdrawals may push you into higher tax brackets. `;
      if (olderAge < 60) {
        analysis += `Since you're currently ${olderAge}, consider Roth conversion strategies during lower-income years to reduce future RMD impact.\n\n`;
      } else {
        analysis += `Qualified Charitable Distributions (QCDs) can help manage RMD tax impact if you're charitably inclined.\n\n`;
      }
    }

    const monthlyIncome = Math.round(afterTaxIncome / 12);
    analysis += `Your projected after-tax retirement income of $${afterTaxIncome.toLocaleString()}/year ($${monthlyIncome.toLocaleString()}/month) will determine your lifestyle in retirement.`;
    if (includeSS) {
      analysis += ` This includes Social Security benefits.`;
    }

    return analysis.trim();
  };

  const fetchAiInsight = useCallback(async (calcResult: CalculationResult, olderAge: number, customQuestion?: string) => {
    if (!calcResult) return;

    if (!customQuestion || !customQuestion.trim()) {
      return;
    }

    setIsLoadingAi(true);
    setAiInsight("");
    setAiError(null);

    try {
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
          totalRMDs: calcResult.totalRMDs || 0,
          estateTax: calcResult.estateTax || 0,
          netEstate: calcResult.netEstate || 0,
          eolAccounts: calcResult.eolAccounts,
          includeSS,
          ssIncome: includeSS ? ssIncome : 0,
          ssClaimAge: includeSS ? ssClaimAge : 0,
          startingTaxable: taxableBalance,
          startingPretax: pretaxBalance,
          startingRoth: rothBalance,
          totalContributions: calcResult.totC,
          returnModel: returnMode,
          userQuestion: customQuestion,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setAiError(data.error);
        if (data.insight) {
          setAiInsight(data.insight);
        }
      } else {
        setAiInsight(data.insight);
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

  const askExplainQuestion = async (question: string) => {
    if (!res) return;

    setUserQuestion(question);
    const older = Math.max(age1, isMar ? age2 : age1);
    await fetchAiInsight(res, older, question);

    setTimeout(() => {
      resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return {
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
  };
}

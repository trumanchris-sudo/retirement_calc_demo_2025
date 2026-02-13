'use client';

/**
 * What-If Scenarios Component
 *
 * Creates emotional hooks for retirement planning by showing:
 * 1. "What if you started at 25?" - The power of early starting
 * 2. "What if you max everything?" - Full optimization potential
 * 3. "What if you retire 5 years earlier?" - Early retirement impact
 * 4. "What if your kids do this too?" - Multi-generational wealth
 *
 * Includes viral sharing features for each scenario.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Calendar,
  Users,
  Share2,
  Copy,
  Mail,
  Twitter,
  Linkedin,
  Facebook,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Clock,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { fmt } from '@/lib/utils';
import {
  toShareableData,
  createSendToKidsLink,
  createSendToKidsEmailLink,
  createSocialShare,
  createTwitterShareLink,
  createLinkedInShareLink,
  createFacebookShareLink,
  copyShareableLinkToClipboard,
  type ShareableData,
} from '@/lib/shareableLink';
import { runSingleSimulation, calcSocialSecurity } from '@/lib/calculations/retirementEngine';
import type { SimulationInputs } from '@/lib/calculations/retirementEngine';
import type { FilingStatus } from '@/types/calculator';

// ==================== Types ====================

interface WhatIfScenariosProps {
  // Current user inputs
  age: number;
  spouseAge?: number;
  retirementAge: number;
  marital: FilingStatus;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2?: number;
  cPre2?: number;
  cPost2?: number;
  cMatch2?: number;
  retRate: number;
  inflationRate: number;
  wdRate: number;
  stateRate: number;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2?: number;
  ssClaimAge2?: number;

  // Children info for multi-gen scenario
  childrenAges?: number[];
  childrenNames?: string[];

  // Current result (for comparison)
  currentEolReal?: number;
}

interface ScenarioResult {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  projectedValue: number;
  currentValue: number;
  difference: number;
  percentIncrease: number;
  emotionalHook: string;
  callToAction: string;
  shareMessage: string;
  details: string[];
}

// ==================== Constants ====================

// 2026 contribution limits
const MAX_401K_CONTRIB = 24500;
const MAX_401K_CATCHUP = 7500; // For 50+
const MAX_IRA_CONTRIB = 7500;
const MAX_IRA_CATCHUP = 1000; // For 50+
const MAX_HSA_INDIVIDUAL = 4300;
const MAX_HSA_FAMILY = 8550;
const MAX_HSA_CATCHUP = 1000; // For 55+
const MAX_MEGA_BACKDOOR = 46000; // After-tax 401k limit (total 401k limit - pretax)

// ==================== Calculation Helpers ====================

/**
 * Run a what-if simulation with modified inputs
 */
function runWhatIfSimulation(
  baseInputs: Partial<SimulationInputs>,
  modifications: Partial<SimulationInputs>
): number {
  const inputs: SimulationInputs = {
    // Personal defaults
    marital: 'single',
    age1: 35,
    age2: 35,
    retirementAge: 65,

    // Balance defaults
    taxableBalance: 0,
    pretaxBalance: 0,
    rothBalance: 0,

    // Contribution defaults
    cTax1: 0,
    cPre1: 0,
    cPost1: 0,
    cMatch1: 0,
    cTax2: 0,
    cPre2: 0,
    cPost2: 0,
    cMatch2: 0,

    // Rate defaults
    retRate: 9.8,
    inflationRate: 2.6,
    stateRate: 0,
    incContrib: false,
    incRate: 4.5,
    wdRate: 3.5,

    // Simulation defaults
    returnMode: 'fixed',
    randomWalkSeries: 'trulyRandom',

    // Social Security defaults
    includeSS: true,
    ssIncome: 75000,
    ssClaimAge: 67,
    ssIncome2: 0,
    ssClaimAge2: 67,

    // Apply base inputs
    ...baseInputs,

    // Apply modifications
    ...modifications,
  };

  try {
    const result = runSingleSimulation(inputs, 42);
    return result.eolReal;
  } catch (error) {
    console.error('[WhatIfScenarios] Simulation failed:', error);
    return 0;
  }
}

/**
 * Calculate what user would have if they started at age 25
 */
function calculateStartedAt25(
  currentAge: number,
  retirementAge: number,
  annualContribution: number,
  retRate: number,
  inflationRate: number,
  currentBalance: number
): number {
  // Years of additional contributions if started at 25
  const yearsHeadStart = currentAge - 25;
  if (yearsHeadStart <= 0) return currentBalance;

  // Compound the head-start contributions
  const realReturn = (1 + retRate / 100) / (1 + inflationRate / 100) - 1;
  let headStartBalance = 0;

  // Simulate the years from 25 to current age
  for (let year = 0; year < yearsHeadStart; year++) {
    headStartBalance = (headStartBalance + annualContribution) * (1 + realReturn);
  }

  // Then compound from current age to retirement
  const yearsToRetirement = retirementAge - currentAge;
  let projectedBalance = headStartBalance + currentBalance;

  for (let year = 0; year < yearsToRetirement; year++) {
    projectedBalance = (projectedBalance + annualContribution) * (1 + realReturn);
  }

  // Simulate through retirement
  const yearsInRetirement = 30; // Assume 30 year retirement
  const withdrawalRate = 0.035;
  let retirementBalance = projectedBalance;

  for (let year = 0; year < yearsInRetirement; year++) {
    retirementBalance = retirementBalance * (1 + realReturn) - projectedBalance * withdrawalRate;
    if (retirementBalance < 0) {
      retirementBalance = 0;
      break;
    }
  }

  return retirementBalance;
}

/**
 * Calculate maximum contribution scenario
 */
function calculateMaxContributions(
  age: number,
  isMarried: boolean,
  hasHSA: boolean = true
): number {
  const isCatchupEligible = age >= 50;
  const isHSACatchupEligible = age >= 55;

  let maxContrib = 0;

  // 401k
  maxContrib += MAX_401K_CONTRIB;
  if (isCatchupEligible) {
    maxContrib += MAX_401K_CATCHUP;
  }

  // IRA (Roth or Traditional)
  maxContrib += MAX_IRA_CONTRIB;
  if (isCatchupEligible) {
    maxContrib += MAX_IRA_CATCHUP;
  }

  // HSA (if eligible)
  if (hasHSA) {
    maxContrib += isMarried ? MAX_HSA_FAMILY : MAX_HSA_INDIVIDUAL;
    if (isHSACatchupEligible) {
      maxContrib += MAX_HSA_CATCHUP;
    }
  }

  // Mega Backdoor Roth (after-tax 401k contributions)
  maxContrib += MAX_MEGA_BACKDOOR;

  // Double for married couples
  if (isMarried) {
    // Spouse contributions (simplified - assume same age)
    maxContrib += MAX_401K_CONTRIB + MAX_IRA_CONTRIB;
    if (isCatchupEligible) {
      maxContrib += MAX_401K_CATCHUP + MAX_IRA_CATCHUP;
    }
  }

  return maxContrib;
}

// ==================== Component ====================

export function WhatIfScenarios({
  age,
  spouseAge,
  retirementAge,
  marital,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  cTax1,
  cPre1,
  cPost1,
  cMatch1,
  cTax2 = 0,
  cPre2 = 0,
  cPost2 = 0,
  cMatch2 = 0,
  retRate,
  inflationRate,
  wdRate,
  stateRate,
  includeSS,
  ssIncome,
  ssClaimAge,
  ssIncome2 = 0,
  ssClaimAge2 = 67,
  childrenAges = [],
  childrenNames = [],
  currentEolReal = 0,
}: WhatIfScenariosProps) {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [sendToKidsDialogOpen, setSendToKidsDialogOpen] = useState(false);
  const [childNameInput, setChildNameInput] = useState(childrenNames[0] || '');
  const [childAgeInput, setChildAgeInput] = useState(childrenAges[0]?.toString() || '25');
  const [customMessageInput, setCustomMessageInput] = useState('');

  const isMarried = marital === 'married';
  const totalCurrentContrib = cTax1 + cPre1 + cPost1 + cMatch1 +
    (isMarried ? cTax2 + cPre2 + cPost2 + cMatch2 : 0);
  const totalCurrentBalance = taxableBalance + pretaxBalance + rothBalance;

  // Create base inputs for simulations
  const baseInputs: Partial<SimulationInputs> = {
    marital,
    age1: age,
    age2: spouseAge || age,
    retirementAge,
    taxableBalance,
    pretaxBalance,
    rothBalance,
    cTax1,
    cPre1,
    cPost1,
    cMatch1,
    cTax2,
    cPre2,
    cPost2,
    cMatch2,
    retRate,
    inflationRate,
    stateRate,
    wdRate,
    includeSS,
    ssIncome,
    ssClaimAge,
    ssIncome2,
    ssClaimAge2,
    returnMode: 'fixed',
    randomWalkSeries: 'trulyRandom',
    incContrib: false,
    incRate: 0,
  };

  // Calculate all scenarios
  const scenarios = useMemo<ScenarioResult[]>(() => {
    const results: ScenarioResult[] = [];

    // ========== Scenario 1: Started at 25 ==========
    const yearsHeadStart = age - 25;
    if (yearsHeadStart > 0) {
      // Calculate what they'd have if started at 25
      const startedAt25Value = calculateStartedAt25(
        age,
        retirementAge,
        totalCurrentContrib,
        retRate,
        inflationRate,
        totalCurrentBalance
      );

      // Run current scenario for comparison
      const currentScenarioValue = runWhatIfSimulation(baseInputs, {});

      const difference = startedAt25Value - currentScenarioValue;
      const percentIncrease = currentScenarioValue > 0
        ? (difference / currentScenarioValue) * 100
        : 0;

      results.push({
        title: 'What if you started at 25?',
        subtitle: `${yearsHeadStart} years of compound growth you missed`,
        icon: Clock,
        iconColor: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        projectedValue: startedAt25Value,
        currentValue: currentScenarioValue,
        difference,
        percentIncrease,
        emotionalHook: childrenAges.length > 0
          ? `But your kids ARE around that age... They still have time.`
          : `Time is the most powerful force in investing. Every year counts.`,
        callToAction: childrenAges.length > 0
          ? 'Send this to your kids'
          : 'Share this insight',
        shareMessage: `I just discovered I could have ${fmt(difference)} more by retirement if I started investing at 25. Time is truly the greatest asset.`,
        details: [
          `Starting at 25 gives you ${yearsHeadStart} extra years of compound growth`,
          `At ${retRate}% returns, money doubles every ~${Math.round(72 / retRate)} years`,
          `Those early contributions would have grown ${Math.round(Math.pow(1 + retRate / 100, yearsHeadStart))}x by now`,
          `This is the power of "time in the market"`,
        ],
      });
    }

    // ========== Scenario 2: Max Everything ==========
    const maxContribAmount = calculateMaxContributions(age, isMarried);
    const contribGap = maxContribAmount - totalCurrentContrib;

    if (contribGap > 5000) { // Only show if meaningful gap
      // Run simulation with maxed contributions
      const maxContribDistribution = {
        cPre1: MAX_401K_CONTRIB + (age >= 50 ? MAX_401K_CATCHUP : 0),
        cPost1: MAX_IRA_CONTRIB + (age >= 50 ? MAX_IRA_CATCHUP : 0) + MAX_MEGA_BACKDOOR / 2,
        cTax1: isMarried ? MAX_HSA_FAMILY : MAX_HSA_INDIVIDUAL,
      };

      if (isMarried) {
        Object.assign(maxContribDistribution, {
          cPre2: MAX_401K_CONTRIB + (age >= 50 ? MAX_401K_CATCHUP : 0),
          cPost2: MAX_IRA_CONTRIB + (age >= 50 ? MAX_IRA_CATCHUP : 0) + MAX_MEGA_BACKDOOR / 2,
          cTax2: 0,
        });
      }

      const maxedValue = runWhatIfSimulation(baseInputs, maxContribDistribution);
      const currentValue = runWhatIfSimulation(baseInputs, {});
      const difference = maxedValue - currentValue;
      const percentIncrease = currentValue > 0 ? (difference / currentValue) * 100 : 0;

      results.push({
        title: 'What if you max everything?',
        subtitle: `401k + Roth IRA + HSA + Mega Backdoor`,
        icon: TrendingUp,
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        projectedValue: maxedValue,
        currentValue,
        difference,
        percentIncrease,
        emotionalHook: `You're leaving ${fmt(contribGap)}/year in tax-advantaged space on the table.`,
        callToAction: 'See the full breakdown',
        shareMessage: `Maxing all retirement accounts (401k, IRA, HSA, Mega Backdoor) could add ${fmt(difference)} to my retirement. The tax savings alone are worth it.`,
        details: [
          `401(k): $${MAX_401K_CONTRIB.toLocaleString()}/year${age >= 50 ? ` + $${MAX_401K_CATCHUP.toLocaleString()} catch-up` : ''}`,
          `IRA: $${MAX_IRA_CONTRIB.toLocaleString()}/year${age >= 50 ? ` + $${MAX_IRA_CATCHUP.toLocaleString()} catch-up` : ''}`,
          `HSA: $${(isMarried ? MAX_HSA_FAMILY : MAX_HSA_INDIVIDUAL).toLocaleString()}/year (triple tax advantage)`,
          `Mega Backdoor Roth: Up to $${MAX_MEGA_BACKDOOR.toLocaleString()}/year (if employer allows)`,
          isMarried ? `Double these limits for your spouse!` : '',
        ].filter(Boolean),
      });
    }

    // ========== Scenario 3: Retire 5 Years Earlier ==========
    if (retirementAge > 55) {
      const earlyRetirementAge = retirementAge - 5;

      // Run simulation with earlier retirement
      const earlyRetireValue = runWhatIfSimulation(baseInputs, {
        retirementAge: earlyRetirementAge,
      });

      const currentValue = runWhatIfSimulation(baseInputs, {});
      const difference = currentValue - earlyRetireValue; // Will be negative (early = less wealth)
      const percentChange = currentValue > 0 ? (difference / currentValue) * 100 : 0;

      // Calculate Social Security impact
      const ssEarlyClaimAge = Math.max(62, earlyRetirementAge);
      const ssBenefitOriginal = calcSocialSecurity(ssIncome, ssClaimAge);
      const ssBenefitEarly = calcSocialSecurity(ssIncome, ssEarlyClaimAge);
      const ssReduction = ssBenefitOriginal - ssBenefitEarly;
      const ssReductionPercent = ssBenefitOriginal > 0 ? (ssReduction / ssBenefitOriginal) * 100 : 0;

      results.push({
        title: 'What if you retire 5 years earlier?',
        subtitle: `Freedom at ${earlyRetirementAge} instead of ${retirementAge}`,
        icon: Calendar,
        iconColor: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
        projectedValue: earlyRetireValue,
        currentValue,
        difference: -difference, // Show as positive impact needed
        percentIncrease: percentChange,
        emotionalHook: `5 more years of freedom. What would you do with 1,825 extra days?`,
        callToAction: 'See what it takes',
        shareMessage: `Planning to retire at ${earlyRetirementAge} instead of ${retirementAge}. Those 5 extra years of freedom are worth planning for.`,
        details: [
          `Portfolio impact: ${fmt(Math.abs(difference))} less at end of life`,
          `5 fewer years of contributions (~${fmt(totalCurrentContrib * 5)})`,
          `5 more years of withdrawals`,
          ssReduction > 0
            ? `Social Security: ${ssReductionPercent.toFixed(0)}% reduction if claiming at ${ssEarlyClaimAge}`
            : `Consider delaying Social Security to offset portfolio draw`,
          `May need to increase savings rate by ${((totalCurrentContrib * 5) / (retirementAge - age) / totalCurrentContrib * 100).toFixed(0)}%`,
        ],
      });
    }

    // ========== Scenario 4: Kids Do This Too ==========
    const hasKidsOrYoungRelatives = childrenAges.length > 0 || age > 35;
    if (hasKidsOrYoungRelatives) {
      const childAge = childrenAges[0] || 22;
      const childName = childrenNames[0] || 'Emma';

      // What if a 22-year-old does what you're doing
      const childContrib = Math.round(totalCurrentContrib * 0.5); // Assume they can do half

      const childProjection = runWhatIfSimulation({
        marital: 'single',
        age1: childAge,
        age2: childAge,
        retirementAge: 65,
        taxableBalance: 0,
        pretaxBalance: 0,
        rothBalance: 0,
        cPre1: Math.round(childContrib * 0.6),
        cPost1: Math.round(childContrib * 0.4),
        cTax1: 0,
        cMatch1: Math.round(childContrib * 0.1),
        cTax2: 0,
        cPre2: 0,
        cPost2: 0,
        cMatch2: 0,
        retRate,
        inflationRate,
        stateRate: 0,
        wdRate,
        includeSS: true,
        ssIncome: 50000,
        ssClaimAge: 67,
        ssIncome2: 0,
        ssClaimAge2: 67,
        returnMode: 'fixed',
        randomWalkSeries: 'trulyRandom',
        incContrib: true, // Kids will increase contributions
        incRate: 3,
      }, {});

      const yearsAdvantage = age - childAge;

      results.push({
        title: `What if ${childName} starts now?`,
        subtitle: `Multi-generational wealth building`,
        icon: Users,
        iconColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        projectedValue: childProjection,
        currentValue: currentEolReal || runWhatIfSimulation(baseInputs, {}),
        difference: childProjection,
        percentIncrease: 0,
        emotionalHook: `If ${childName} starts at ${childAge} with just ${fmt(childContrib)}/year, they could retire with ${fmt(childProjection)}.`,
        callToAction: `Send to ${childName}`,
        shareMessage: `Just showed my kids what starting at ${childAge} could mean for their retirement. ${yearsAdvantage} years of compound growth is a gift.`,
        details: [
          `Starting age: ${childAge} (${yearsAdvantage} years ahead of where you started)`,
          `Initial contribution: ${fmt(childContrib)}/year (growing 3%/year)`,
          `Projected retirement wealth: ${fmt(childProjection)}`,
          `The earlier they start, the less they need to save`,
          `Your guidance now could be worth millions to them later`,
        ],
      });
    }

    return results;
  }, [
    age, spouseAge, retirementAge, marital, totalCurrentContrib, totalCurrentBalance,
    retRate, inflationRate, wdRate, stateRate, includeSS, ssIncome, ssClaimAge,
    isMarried, childrenAges, childrenNames, currentEolReal, baseInputs,
  ]);

  // Share handlers
  const handleCopyLink = useCallback(async (scenarioTitle: string) => {
    const shareableData = toShareableData({
      age1: age,
      age2: spouseAge,
      retirementAge,
      marital,
      taxableBalance,
      pretaxBalance,
      rothBalance,
      cTax1,
      cPre1,
      cPost1,
      cTax2,
      cPre2,
      cPost2,
      retRate,
      wdRate,
    });

    const success = await copyShareableLinkToClipboard(shareableData);
    if (success) {
      setCopiedLink(scenarioTitle);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [age, spouseAge, retirementAge, marital, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cTax2, cPre2, cPost2, retRate, wdRate]);

  const handleSendToKids = useCallback(() => {
    const shareableData = toShareableData({
      age1: age,
      age2: spouseAge,
      retirementAge,
      marital,
      taxableBalance,
      pretaxBalance,
      rothBalance,
      cTax1,
      cPre1,
      cPost1,
      cTax2,
      cPre2,
      cPost2,
      retRate,
      wdRate,
    });

    const emailLink = createSendToKidsEmailLink({
      childName: childNameInput || undefined,
      childAge: parseInt(childAgeInput) || 25,
      customMessage: customMessageInput || undefined,
      parentScenario: shareableData,
    });

    window.open(emailLink, '_blank');
    setSendToKidsDialogOpen(false);
  }, [age, spouseAge, retirementAge, marital, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cTax2, cPre2, cPost2, retRate, wdRate,
      childNameInput, childAgeInput, customMessageInput]);

  const handleSocialShare = useCallback((platform: 'twitter' | 'linkedin' | 'facebook', scenario: ScenarioResult) => {
    const content = createSocialShare(
      Math.abs(scenario.difference),
      age - 25
    );

    let shareUrl: string;
    switch (platform) {
      case 'twitter':
        shareUrl = createTwitterShareLink(content);
        break;
      case 'linkedin':
        shareUrl = createLinkedInShareLink(content);
        break;
      case 'facebook':
        shareUrl = createFacebookShareLink(content);
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  }, [age]);

  const toggleExpanded = (title: string) => {
    setExpandedScenario(expandedScenario === title ? null : title);
  };

  if (scenarios.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          What If Scenarios
        </CardTitle>
        <CardDescription>
          Explore how different choices could transform your retirement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const isExpanded = expandedScenario === scenario.title;
          const isKidsScenario = scenario.title.includes('starts now');

          return (
            <div
              key={scenario.title}
              className={`rounded-lg border-2 ${scenario.borderColor} ${scenario.bgColor} overflow-hidden transition-all duration-300`}
            >
              {/* Header - Always visible */}
              <button
                onClick={() => toggleExpanded(scenario.title)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm`}>
                    <Icon className={`h-5 w-5 ${scenario.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {scenario.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {scenario.difference !== 0 && (
                    <Badge
                      variant="secondary"
                      className={scenario.difference > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      }
                    >
                      {scenario.difference > 0 ? '+' : ''}{fmt(scenario.difference)}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <Separator />

                  {/* Emotional Hook */}
                  <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <Heart className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {scenario.emotionalHook}
                    </p>
                  </div>

                  {/* Value Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Path</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {fmt(scenario.currentValue)}
                      </p>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Scenario</p>
                      <p className={`text-xl font-bold ${scenario.projectedValue > scenario.currentValue
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {fmt(scenario.projectedValue)}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Key Insights
                    </h4>
                    <ul className="space-y-1.5">
                      {scenario.details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Share Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {isKidsScenario ? (
                      <Dialog open={sendToKidsDialogOpen} onOpenChange={setSendToKidsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Send to Your Kids
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send to Your Kids</DialogTitle>
                            <DialogDescription>
                              Help the next generation start their investment journey early
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="childName">Their Name (optional)</Label>
                              <Input
                                id="childName"
                                placeholder="Emma"
                                value={childNameInput}
                                onChange={(e) => setChildNameInput(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="childAge">Their Age</Label>
                              <Input
                                id="childAge"
                                type="number"
                                min={18}
                                max={40}
                                value={childAgeInput}
                                onChange={(e) => setChildAgeInput(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="customMessage">Custom Message (optional)</Label>
                              <Input
                                id="customMessage"
                                placeholder="Add a personal note..."
                                value={customMessageInput}
                                onChange={(e) => setCustomMessageInput(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSendToKidsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSendToKids} className="gap-2">
                              <Mail className="h-4 w-4" />
                              Open Email
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleCopyLink(scenario.title)}
                        >
                          {copiedLink === scenario.title ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleSocialShare('twitter', scenario)}
                        >
                          <Twitter className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleSocialShare('linkedin', scenario)}
                        >
                          <Linkedin className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleSocialShare('facebook', scenario)}
                        >
                          <Facebook className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer CTA */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center italic">
            These projections use simplified assumptions. Actual results will vary based on market conditions,
            tax changes, and life circumstances. Consider consulting a financial advisor for personalized guidance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default WhatIfScenarios;

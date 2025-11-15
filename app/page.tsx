"use client"

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Sankey,
  Rectangle,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FlippingCard } from "@/components/FlippingCard";
import { GenerationalResultCard } from "@/components/GenerationalResultCard";
import AddToWalletButton from "@/components/AddToWalletButton";
import { LegacyResult } from "@/lib/walletPass";
import UserInputsPrintSummary from "@/components/UserInputsPrintSummary";
import { TopBanner } from "@/components/layout/TopBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SliderInput } from "@/components/form/SliderInput";
import { BrandLoader } from "@/components/BrandLoader";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";
import { Input, Spinner, Tip, TrendingUpIcon } from "@/components/calculator/InputHelpers";
import { TabNavigation, type MainTabId } from "@/components/calculator/TabNavigation";
import { TabPanel } from "@/components/calculator/TabPanel";
import { LastCalculatedBadge } from "@/components/calculator/LastCalculatedBadge";
import { RecalculateButton } from "@/components/calculator/RecalculateButton";
import { RiskSummaryCard } from "@/components/calculator/RiskSummaryCard";
import { TimelineView } from "@/components/calculator/TimelineView";
import { MonteCarloVisualizer } from "@/components/calculator/MonteCarloVisualizerWrapper";
import CyberpunkSplash, { type CyberpunkSplashHandle } from "@/components/calculator/CyberpunkSplash";
import type { AdjustmentDeltas } from "@/components/layout/PageHeader";

// Import types
import type { CalculationResult, ChartDataPoint, SavedScenario, ComparisonData, GenerationalPayout, CalculationProgress } from "@/types/calculator";

// Import from new modules
import {
  MAX_GENS,
  YEARS_PER_GEN,
  LIFE_EXP,
  CURR_YEAR,
  RMD_START_AGE,
  RMD_DIVISORS,
  SS_BEND_POINTS,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  NET_WORTH_DATA,
  getNetWorthBracket,
  SP500_YOY_NOMINAL,
  SP500_START_YEAR,
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
  mulberry32,
} from "@/lib/utils";

import type { ReturnMode, WalkSeries, BatchSummary } from "@/types/planner";

// Import calculation modules
import {
  calcOrdinaryTax,
  calcLTCGTax,
  calcNIIT,
  type FilingStatus,
} from "@/lib/calculations/taxCalculations";

import { computeWithdrawalTaxes } from "@/lib/calculations/withdrawalTax";

// Import retirement engine
import {
  runSingleSimulation,
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

// Re-export types for compatibility
export type { ReturnMode, WalkSeries, BatchSummary };

/**
 * Build a generator that yields **annual** gross return factors for N years:
 * - mode=fixed -> constant nominal return (e.g., 9.8% -> 1.098)
 * - mode=randomWalk -> bootstrap from YoY array (with replacement)
 * If series="real", subtract infPct from the sampled nominal before converting.
 */
export function buildReturnGenerator(options: {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  walkData?: number[];
  seed?: number;
  startYear?: number; // Historical year to start sequential playback (e.g., 1929)
}) {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
    startYear,
  } = options;

  if (mode === "fixed") {
    const g = 1 + nominalPct / 100;
    return function* fixedGen() {
      for (let i = 0; i < years; i++) yield g;
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");
  const inflRate = infPct / 100;

  // Historical sequential playback
  if (startYear !== undefined) {
    const startIndex = startYear - 1928; // SP500_YOY_NOMINAL starts at 1928
    return function* historicalGen() {
      for (let i = 0; i < years; i++) {
        const ix = (startIndex + i) % walkData.length; // Wrap around if we exceed data
        let pct = walkData[ix];

        if (walkSeries === "real") {
          const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
          yield 1 + realRate;
        } else {
          yield 1 + pct / 100;
        }
      }
    };
  }

  // Random bootstrap
  const rnd = mulberry32(seed);
  return function* walkGen() {
    for (let i = 0; i < years; i++) {
      const ix = Math.floor(rnd() * walkData.length);
      let pct = walkData[ix];

      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
        yield 1 + realRate;
      } else {
        yield 1 + pct / 100;
      }
    }
  };
}


/** ===============================
 * Helpers
 * ================================ */

/**
 * Calculate Social Security monthly benefit
 * Uses simplified 2025 bend point formula
 * @param avgAnnualIncome - Average indexed monthly earnings (in annual terms)
 * @param claimAge - Age when claiming benefits (62-70)
 * @param fullRetirementAge - Full retirement age (typically 67)
 */
const calcSocialSecurity = (
  avgAnnualIncome: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number => {
  if (avgAnnualIncome <= 0) return 0;

  // Convert annual to monthly
  const aime = avgAnnualIncome / 12;

  // Apply bend points
  let pia = 0; // Primary Insurance Amount
  if (aime <= SS_BEND_POINTS.first) {
    pia = aime * 0.90;
  } else if (aime <= SS_BEND_POINTS.second) {
    pia = SS_BEND_POINTS.first * 0.90 + (aime - SS_BEND_POINTS.first) * 0.32;
  } else {
    pia = SS_BEND_POINTS.first * 0.90 +
          (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 +
          (aime - SS_BEND_POINTS.second) * 0.15;
  }

  // Adjust for early/delayed claiming
  const monthsFromFRA = (claimAge - fullRetirementAge) * 12;
  let adjustmentFactor = 1.0;

  if (monthsFromFRA < 0) {
    // Early claiming: reduce by 5/9 of 1% for first 36 months, then 5/12 of 1% for each additional month
    const earlyMonths = Math.abs(monthsFromFRA);
    if (earlyMonths <= 36) {
      adjustmentFactor = 1 - (earlyMonths * 5/9 / 100);
    } else {
      adjustmentFactor = 1 - (36 * 5/9 / 100) - ((earlyMonths - 36) * 5/12 / 100);
    }
  } else if (monthsFromFRA > 0) {
    // Delayed claiming: increase by 2/3 of 1% per month (8% per year)
    adjustmentFactor = 1 + (monthsFromFRA * 2/3 / 100);
  }

  // Return annual benefit
  return pia * adjustmentFactor * 12;
};

/**
 * Calculate Required Minimum Distribution
 * @param pretaxBalance - Balance in pre-tax accounts (401k, IRA)
 * @param age - Current age
 */
const calcRMD = (pretaxBalance: number, age: number): number => {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;
  const divisor = RMD_DIVISORS[age] || 2.0; // Use 2.0 for ages beyond 120
  return pretaxBalance / divisor;
};

/**
 * Calculate Estate Tax (2025 law)
 * @param totalEstate - Total estate value (all accounts)
 * @param status - Filing status (single or married)
 */
const calcEstateTax = (totalEstate: number, status: FilingStatus = "single"): number => {
  const exemption = ESTATE_TAX_EXEMPTION[status];
  if (totalEstate <= exemption) return 0;
  const taxableEstate = totalEstate - exemption;
  return taxableEstate * ESTATE_TAX_RATE;
};

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

const AiInsightBox: React.FC<{ insight: string; error?: string | null, isLoading: boolean }> = ({ insight, error, isLoading }) => {
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

  // Format the insight text to have bolded headers
  const formatInsight = (text: string) => {
    // Split by lines and format headers
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Check if line is a header (starts with ## or is followed by a colon and is short)
      const isMarkdownHeader = line.startsWith('##') || line.startsWith('#');
      const isColonHeader = line.includes(':') && line.length < 80 && !line.includes('$') && index > 0 && lines[index - 1] === '';

      if (isMarkdownHeader) {
        // Remove markdown symbols and bold
        const headerText = line.replace(/^#+\s*/, '');
        return <h4 key={index} className="font-bold text-base mt-4 mb-2 first:mt-0">{headerText}</h4>;
      } else if (isColonHeader) {
        return <h5 key={index} className="font-semibold text-sm mt-3 mb-1">{line}</h5>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{line}</p>;
      }
    });
  };

  return (
    <div className="p-6 rounded-xl bg-card border shadow-sm">
      <div className="space-y-1">
        {formatInsight(insight)}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<any>;
  explanation?: string;
}> = ({ title, value, sub, color = "blue", icon: Icon, explanation }) => {
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
};

const FlippingStatCard: React.FC<{
  title: string;
  value: string;
  sub?: string;
  color?: ColorKey;
  icon?: React.ComponentType<any>;
  backContent?: React.ReactNode;
}> = ({ title, value, sub, color = "blue", icon: Icon, backContent }) => {
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
};

const CollapsibleSection: React.FC<{
  title: string;
  icon?: React.ComponentType<any>;
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
 * Simulate constant real-dollar payout per beneficiary with births/deaths.
 * - Works in 2025 dollars (real terms).
 * - fund starts as EOL deflated to 2025 dollars.
 * - Real growth at r = realReturn(nominal, inflation).
 * - Each year, pay (perBenReal * eligible), where eligible = beneficiaries >= minDistAge.
 * - Beneficiaries reproduce gradually across fertility window (e.g., ages 25-35).
 * - Total fertility rate (e.g., 2.1) distributed evenly across fertile years.
 * - Only beneficiaries within fertility window at death (and their descendants) can reproduce.
 * - Death at deathAge.
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
  // Only beneficiaries within fertility window at death can reproduce
  let cohorts: Cohort[] = initialBenAges.length > 0
    ? initialBenAges.map(age => ({
        size: 1,
        age,
        canReproduce: age >= fertilityWindowStart && age <= fertilityWindowEnd,
        cumulativeBirths: 0
      }))
    : startBens > 0
    ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }]
    : [];

  let years = 0;

  for (let t = 0; t < capYears; t++) {
    cohorts = cohorts.filter((c) => c.age < deathAge);

    const living = cohorts.reduce((acc, c) => acc + c.size, 0);
    if (living === 0) {
      return { years, fundLeftReal: fundReal, lastLivingCount: 0 };
    }

    fundReal *= 1 + r;

    // Only beneficiaries at or above minDistAge receive distributions
    const eligible = cohorts
      .filter(c => c.age >= minDistAge)
      .reduce((acc, c) => acc + c.size, 0);
    const payout = perBenReal * eligible;
    fundReal -= payout;

    if (fundReal < 0) {
      return { years, fundLeftReal: 0, lastLivingCount: living };
    }

    years += 1;

    // Age all cohorts
    cohorts.forEach((c) => (c.age += 1));

    // Gradual reproduction across fertility window
    // Each year in the window, cohorts produce birthsPerYear children
    cohorts.forEach((cohort) => {
      if (cohort.canReproduce &&
          cohort.age >= fertilityWindowStart &&
          cohort.age <= fertilityWindowEnd &&
          cohort.cumulativeBirths < totalFertilityRate) {

        // Calculate births for this year, capped at remaining fertility
        const remainingFertility = totalFertilityRate - cohort.cumulativeBirths;
        const birthsThisYear = Math.min(birthsPerYear, remainingFertility);
        const births = cohort.size * birthsThisYear;

        if (births > 0) {
          cohorts.push({ size: births, age: 0, canReproduce: true, cumulativeBirths: 0 });
        }

        cohort.cumulativeBirths += birthsThisYear;
      }
    });
  }

  const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
  return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving };
}

/** ===============================
 * Batch Simulation for Truly Random Mode
 * ================================ */

/** All inputs needed to run a single simulation */
export type Inputs = SimulationInputs;

/** Result from a single simulation run */
export type SimResult = SimulationResult;

// runSingleSimulation is now imported from @/lib/calculations/retirementEngine

/**
 * DEPRECATED: This function is no longer used. Monte Carlo simulations now run via web worker.
 * Run 25 simulations with different seeds and compute median summaries.
 * This provides more stable results for truly random mode.
 */
async function runTenSeedsAndSummarize(params: Inputs, baseSeed: number): Promise<BatchSummary> {
  const N = 25;
  const results: SimResult[] = [];

  // Generate 25 random seeds from the baseSeed for more varied simulations
  const rng = mulberry32(baseSeed);
  const seeds: number[] = [];
  for (let i = 0; i < N; i++) {
    seeds.push(Math.floor(rng() * 1000000));
  }

  for (let i = 0; i < N; i++) {
    // Yield to UI so we don't block rendering
    await new Promise(r => setTimeout(r, 0));
    results.push(runSingleSimulation(params, seeds[i]));
  }

  // Assume all runs produced the same length T
  const T = results[0].balancesReal.length;

  // Calculate percentiles (p10, p50, p90) series by year
  const p10BalancesReal: number[] = [];
  const p50BalancesReal: number[] = [];
  const p90BalancesReal: number[] = [];
  for (let t = 0; t < T; t++) {
    const col = results.map(r => r.balancesReal[t]);
    p10BalancesReal.push(percentile(col, 10));
    p50BalancesReal.push(percentile(col, 50));
    p90BalancesReal.push(percentile(col, 90));
  }

  const eolValues = results.map(r => r.eolReal);
  const eolReal_p10 = percentile(eolValues, 10);
  const eolReal_p50 = percentile(eolValues, 50);
  const eolReal_p90 = percentile(eolValues, 90);

  const y1Values = results.map(r => r.y1AfterTaxReal);
  const y1AfterTaxReal_p10 = percentile(y1Values, 10);
  const y1AfterTaxReal_p50 = percentile(y1Values, 50);
  const y1AfterTaxReal_p90 = percentile(y1Values, 90);

  const probRuin = results.filter(r => r.ruined).length / N;

  return {
    p10BalancesReal,
    p50BalancesReal,
    p90BalancesReal,
    eolReal_p10,
    eolReal_p50,
    eolReal_p90,
    y1AfterTaxReal_p10,
    y1AfterTaxReal_p50,
    y1AfterTaxReal_p90,
    probRuin,
    allRuns: results,  // Include all simulation runs for spaghetti plot
  };
}

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
const ScenarioComparisonChart = React.memo<ComparisonChartProps>(({ data, comparisonData, isDarkMode, fmt }) => (
  <ResponsiveContainer width="100%" height={400}>
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="year" className="text-sm" />
      <YAxis
        tickFormatter={(v) => fmt(v as number)}
        className="text-sm"
        label={{ value: 'Portfolio Value (Real)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
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
));

ScenarioComparisonChart.displayName = 'ScenarioComparisonChart';

/** ===============================
 * App
 * ================================ */

export default function App() {
  const [marital, setMarital] = useState<FilingStatus>("single");
  const [age1, setAge1] = useState(35);
  const [age2, setAge2] = useState(33);
  const [retAge, setRetAge] = useState(65);

  const [sTax, setSTax] = useState(50000);
  const [sPre, setSPre] = useState(150000);
  const [sPost, setSPost] = useState(25000);

  const [cTax1, setCTax1] = useState(12000);
  const [cPre1, setCPre1] = useState(23000);
  const [cPost1, setCPost1] = useState(7000);
  const [cMatch1, setCMatch1] = useState(0);

  const [cTax2, setCTax2] = useState(8000);
  const [cPre2, setCPre2] = useState(23000);
  const [cPost2, setCPost2] = useState(7000);
  const [cMatch2, setCMatch2] = useState(0);

  const [retRate, setRetRate] = useState(9.8);
  const [infRate, setInfRate] = useState(2.6);
  const [stateRate, setStateRate] = useState(0);
  const [incContrib, setIncContrib] = useState(false); // Changed from true to false
  const [incRate, setIncRate] = useState(4.5);
  const [wdRate, setWdRate] = useState(3.5);

  const [includeSS, setIncludeSS] = useState(true);
  const [ssIncome, setSSIncome] = useState(75000); // Primary - Avg career earnings for SS calc
  const [ssClaimAge, setSSClaimAge] = useState(67); // Primary - Full retirement age
  const [ssIncome2, setSSIncome2] = useState(75000); // Spouse - Avg career earnings for SS calc
  const [ssClaimAge2, setSSClaimAge2] = useState(67); // Spouse - Full retirement age

  // Healthcare costs (post-retirement)
  const [includeMedicare, setIncludeMedicare] = useState(true);
  const [medicarePremium, setMedicarePremium] = useState(400); // Monthly premium (Part B + D + Supplemental)
  const [medicalInflation, setMedicalInflation] = useState(5.5); // Medical inflation rate %
  const [irmaaThresholdSingle, setIrmaaThresholdSingle] = useState(103000); // IRMAA income threshold
  const [irmaaThresholdMarried, setIrmaaThresholdMarried] = useState(206000);
  const [irmaaSurcharge, setIrmaaSurcharge] = useState(350); // Monthly surcharge if over threshold

  const [includeLTC, setIncludeLTC] = useState(true);
  const [ltcAnnualCost, setLtcAnnualCost] = useState(80000); // Annual long-term care cost
  const [ltcProbability, setLtcProbability] = useState(70); // Probability of needing LTC (%)
  const [ltcDuration, setLtcDuration] = useState(3.5); // Expected duration in years
  const [ltcOnsetAge, setLtcOnsetAge] = useState(82); // Typical age when LTC begins
  const [ltcAgeRangeStart, setLtcAgeRangeStart] = useState(75); // Earliest possible LTC onset
  const [ltcAgeRangeEnd, setLtcAgeRangeEnd] = useState(90); // Latest possible LTC onset

  const [showGen, setShowGen] = useState(true);

  // Generational wealth parameters (improved demographic model)
  const [hypPerBen, setHypPerBen] = useState(100_000);
  const [hypStartBens, setHypStartBens] = useState(2);
  const [totalFertilityRate, setTotalFertilityRate] = useState(2.1); // Children per person (lifetime)
  const [generationLength, setGenerationLength] = useState(30); // Average age when having children
  const [fertilityWindowStart, setFertilityWindowStart] = useState(25);
  const [fertilityWindowEnd, setFertilityWindowEnd] = useState(35);
  const [hypDeathAge, setHypDeathAge] = useState(90);
  const [hypBenAgesStr, setHypBenAgesStr] = useState("35, 40");
  const [hypMinDistAge, setHypMinDistAge] = useState(21); // Minimum age to receive distributions

  // Legacy state variables for backward compatibility with old simulation
  const [hypBirthMultiple, setHypBirthMultiple] = useState(1);
  const [hypBirthInterval, setHypBirthInterval] = useState(30);

  const [retMode, setRetMode] = useState<"fixed" | "randomWalk">("randomWalk");
  const [seed, setSeed] = useState(42);
  const [walkSeries, setWalkSeries] = useState<"nominal" | "real" | "trulyRandom">("trulyRandom");

  const [res, setRes] = useState<CalculationResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);


  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [olderAgeForAnalysis, setOlderAgeForAnalysis] = useState<number>(0);

  // Sensitivity analysis and scenario comparison
  const [sensitivityData, setSensitivityData] = useState<any>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showBearMarket, setShowBearMarket] = useState(false);
  const [historicalYear, setHistoricalYear] = useState<number | null>(null);
  const [scenarioName, setScenarioName] = useState<string>("");
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Inflation shock scenarios
  const [showInflationShock, setShowInflationShock] = useState(false);
  const [inflationShockRate, setInflationShockRate] = useState<number>(0); // elevated inflation % - default 0 means no shock
  const [inflationShockDuration, setInflationShockDuration] = useState<number>(5); // years

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
  const [showP10, setShowP10] = useState(false); // Show 10th percentile line
  const [showP90, setShowP90] = useState(false); // Show 90th percentile line
  const [activeChartTab, setActiveChartTab] = useState("accumulation"); // Track active chart tab
  const [loaderComplete, setLoaderComplete] = useState(false); // Always show loader on mount
  const [loaderHandoff, setLoaderHandoff] = useState(false); // Track when handoff starts
  const [cubeAppended, setCubeAppended] = useState(false); // Track when cube animation completes

  // Tabbed interface state - foundation for future reorganization
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>('all');
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [inputsModified, setInputsModified] = useState(false);

  // Callback for tracking input changes
  const handleInputChange = useCallback(() => {
    setInputsModified(true);
  }, []);

  const resRef = useRef<HTMLDivElement | null>(null);
  const genRef = useRef<HTMLDivElement | null>(null);
  const monteCarloRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const tabGroupRef = useRef<TabGroupRef>(null);
  const splashRef = useRef<CyberpunkSplashHandle>(null);

  // State for tracking simulation progress
  const [calcProgress, setCalcProgress] = useState<CalculationProgress | null>(null);

  // Initialize web worker
  useEffect(() => {
    workerRef.current = new Worker('/monte-carlo-worker.js');

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const isMar = useMemo(() => marital === "married", [marital]);
  const total = useMemo(() => sTax + sPre + sPost, [sTax, sPre, sPost]);

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

  // Simple cache for AI Q&A responses (24 hour TTL)
  const aiCache = useRef<Map<string, { response: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const getCacheKey = (question: string, calcResult: CalculationResult): string => {
    // Create a hash from key parameters + question
    const keyData = {
      q: question.toLowerCase().trim(),
      bal: Math.round(calcResult.finReal / 1000), // Round to nearest $1k
      wd: Math.round(calcResult.wdReal / 100), // Round to nearest $100
      age: retAge,
      estate: Math.round((calcResult.estateTax || 0) / 10000), // Round to nearest $10k
      prob: calcResult.probRuin !== undefined ? Math.round(calcResult.probRuin * 100) : 0,
    };
    return JSON.stringify(keyData);
  };

  const getCachedResponse = (cacheKey: string): string | null => {
    const cached = aiCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.response;
    }
    if (cached) {
      // Expired, remove it
      aiCache.current.delete(cacheKey);
    }
    return null;
  };

  const setCachedResponse = (cacheKey: string, response: string): void => {
    aiCache.current.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  };

  // Generate local insights using templates (no API call needed)
  const generateLocalInsight = (calcResult: CalculationResult, olderAge: number): string => {
    if (!calcResult) return "";

    const probability = calcResult.probRuin !== undefined ? Math.round((1 - calcResult.probRuin) * 100) : 100;
    const endAge = retAge + calcResult.survYrs;
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

  const fetchAiInsight = async (calcResult: CalculationResult, olderAge: number, customQuestion?: string) => {
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
          retirementAge: retAge,
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
          inflationRate: infRate,
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
          startingTaxable: sTax,
          startingPretax: sPre,
          startingRoth: sPost,
          // Contribution details
          totalContributions: calcResult.totC,
          returnModel: retMode,
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
  };

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
  const runMonteCarloViaWorker = useCallback((inputs: Inputs, baseSeed: number, N: number = 1000): Promise<BatchSummary> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const worker = workerRef.current;

      const handleMessage = (e: MessageEvent) => {
        if (!e.data) return;

        const { type, result, completed, total, error } = e.data;

        if (type === 'progress') {
          const percent = Math.round((completed / total) * 100);
          setCalcProgress({
            phase: 'monteCarlo',
            percent,
            message: `Running Monte Carlo simulation... ${completed} / ${total}`
          });
        } else if (type === 'complete') {
          setCalcProgress(null);
          worker.removeEventListener('message', handleMessage);
          resolve(result);
        } else if (type === 'error') {
          setCalcProgress(null);
          worker.removeEventListener('message', handleMessage);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'run', params: inputs, baseSeed, N });
    });
  }, []);

  /**
   * Run comparison between baseline and selected scenarios
   * Merges comparison data onto existing res.data to preserve bal, real, p10, p90 keys
   */
  const runComparison = useCallback(async () => {
    if (!comparisonMode || !res?.data) return;

    setErr(null);
    const younger = Math.min(age1, isMar ? age2 : age1);
    const yrsToRet = retAge - younger;

    try {
      // Prepare baseline inputs
      const baseInputs = {
        marital, age1, age2, retAge, sTax, sPre, sPost,
        cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
        retRate, infRate, stateRate, incContrib, incRate, wdRate,
        retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        historicalYear: undefined,
        inflationShockRate: null,
        inflationShockDuration: 5,
      };

      // Calculate baseline
      const baselineResult = runSingleSimulation(baseInputs, seed);

      // Calculate bear market scenario if specified
      let bearData = null;
      if (historicalYear) {
        const bearInputs = { ...baseInputs, historicalYear };
        const bearResult = runSingleSimulation(bearInputs, seed);
        bearData = bearResult.balancesReal;
      }

      // Calculate inflation shock scenario if specified
      let inflationData = null;
      if (inflationShockRate > 0) {
        const inflationInputs = {
          ...baseInputs,
          inflationShockRate,
          inflationShockDuration
        };
        const inflationResult = runSingleSimulation(inflationInputs, seed);
        inflationData = inflationResult.balancesReal;
      }

      // Merge comparison data onto existing res.data structure
      // This preserves bal, real, p10, p90 while adding baseline, bearMarket, inflation
      const mergedData = res.data.map((row, i) => ({
        ...row, // Keep year, a1, a2, bal, real, p10, p90, etc.
        baseline: baselineResult.balancesReal[i] ?? null,
        bearMarket: bearData ? bearData[i] ?? null : null,
        inflation: inflationData ? inflationData[i] ?? null : null,
      }));

      // Update comparison state
      setComparisonData({
        baseline: {
          data: mergedData,
          visible: true,
          label: "Baseline",
        },
        bearMarket: historicalYear ? {
          data: mergedData,
          visible: true,
          label: BEAR_MARKET_SCENARIOS.find(s => s.year === historicalYear)?.label || `${historicalYear} Crash`,
          year: historicalYear,
        } : null,
        inflation: inflationShockRate > 0 ? {
          data: mergedData,
          visible: true,
          label: `${inflationShockRate}% Inflation (${inflationShockDuration}yr)`,
          rate: inflationShockRate,
          duration: inflationShockDuration,
        } : null,
      });

    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [comparisonMode, res, age1, age2, retAge, marital, sTax, sPre, sPost, cTax1, cPre1, cPost1, cMatch1,
      cTax2, cPre2, cPost2, cMatch2, retRate, infRate, stateRate, incContrib, incRate, wdRate,
      retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      historicalYear, inflationShockRate, inflationShockDuration, seed, isMar]);

  /**
   * Run comparison with randomly selected bear market and inflation shock scenarios
   */
  const runRandomComparison = useCallback(() => {
    // Randomly select a bear market scenario
    const randomBearScenario = BEAR_MARKET_SCENARIOS[Math.floor(Math.random() * BEAR_MARKET_SCENARIOS.length)];

    // Randomly select an inflation shock scenario
    const randomInflationScenario = INFLATION_SHOCK_SCENARIOS[Math.floor(Math.random() * INFLATION_SHOCK_SCENARIOS.length)];

    // Set the states
    setHistoricalYear(randomBearScenario.year);
    setInflationShockRate(randomInflationScenario.rate);
    setInflationShockDuration(randomInflationScenario.duration);
    setComparisonMode(true);

    // Delay runComparison to ensure state updates are processed
    setTimeout(() => {
      runComparison();
    }, 50);
  }, [runComparison]);

  // Generational wealth preset configurations
  const applyGenerationalPreset = useCallback((preset: 'conservative' | 'moderate' | 'aggressive') => {
    switch (preset) {
      case 'conservative':
        setHypPerBen(75_000);
        setHypStartBens(2);
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
        setHypStartBens(2);
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
        setHypStartBens(3);
        setTotalFertilityRate(2.5); // Fast growth
        setGenerationLength(28);
        setFertilityWindowStart(23);
        setFertilityWindowEnd(33);
        // Update legacy values for backward compatibility
        setHypBirthMultiple(2.5);
        setHypBirthInterval(28);
        break;
    }
  }, []);

  const calc = useCallback(async () => {
    setErr(null);
    setAiInsight("");
    setAiError(null);
    setIsLoadingAi(true);

    // Start cinematic Monte Carlo sequence only from All-in-One or Configure tabs
    if (activeMainTab === 'all' || activeMainTab === 'configure') {
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
    if (walkSeries === 'trulyRandom') {
      currentSeed = Math.floor(Math.random() * 1000000);
      setSeed(currentSeed);
    }

    try {
      // Comprehensive input validation with specific error messages
      const validationResult = validateCalculatorInputs({
        age1,
        age2: isMar ? age2 : undefined,
        retAge,
        sTax,
        sPre,
        sPost,
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
        infRate,
        stateRate,
        marital
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      const younger = Math.min(age1, isMar ? age2 : age1);
      const older = Math.max(age1, isMar ? age2 : age1);
      olderAgeForAI = older;

      const yrsToRet = retAge - younger;
      const g_fixed = 1 + retRate / 100;
      const infl = infRate / 100;
      const infl_factor = 1 + infl;

      const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

      // If truly random mode, run Monte Carlo simulation via web worker (N=1000)
      if (walkSeries === 'trulyRandom') {
        const inputs: Inputs = {
          marital, age1, age2, retAge, sTax, sPre, sPost,
          cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
          retRate, infRate, stateRate, incContrib, incRate, wdRate,
          retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
          historicalYear: historicalYear || undefined,
          inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
          inflationShockDuration,
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
        };

        const batchSummary = await runMonteCarloViaWorker(inputs, currentSeed, 1000);

        // Reconstruct data array from batch summary percentile balances
        const data: any[] = [];
        for (let i = 0; i < batchSummary.p50BalancesReal.length; i++) {
          const yr = CURR_YEAR + i;
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

        // Use median values for key metrics
        const finReal = batchSummary.p50BalancesReal[yrsToRet];
        const finNom = finReal * Math.pow(1 + infl, yrsToRet);
        const wdRealY1 = batchSummary.y1AfterTaxReal_p50;
        const infAdj = Math.pow(1 + infl, yrsToRet);
        const wdAfterY1 = wdRealY1 * infAdj;
        const wdGrossY1 = wdAfterY1 / (1 - 0.15); // rough estimate, actual tax rate varies

        const eolReal = batchSummary.eolReal_p50;
        const yearsFrom2025 = yrsToRet + yrsToSim;
        const eolWealth = eolReal * Math.pow(1 + infl, yearsFrom2025);

        // Calculate RMD data for trulyRandom mode based on median balances
        // Assume typical allocation: 50% pretax, 30% taxable, 20% roth
        const rmdData: { age: number; spending: number; rmd: number }[] = [];
        for (let y = 1; y <= yrsToSim; y++) {
          const currentAge = age1 + yrsToRet + y;
          if (currentAge >= RMD_START_AGE) {
            const yearIndex = yrsToRet + y;
            if (yearIndex < batchSummary.p50BalancesReal.length) {
              const totalBalReal = batchSummary.p50BalancesReal[yearIndex];
              const totalBalNom = totalBalReal * Math.pow(1 + infl, yearIndex);
              const estimatedPretaxBal = totalBalNom * 0.5; // Assume 50% in pretax

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

        // Calculate estate tax using median EOL
        const estateTax = calcEstateTax(eolWealth, marital);
        const netEstate = eolWealth - estateTax;

        // Generational payout calculation (if enabled) - Monte Carlo version
        let genPayout: null | {
          perBenReal: number;
          years: number;
          fundLeftReal: number;
          startBeneficiaries: number;
          lastLivingCount: number;
          birthMultiple: number;
          birthInterval: number;
          deathAge: number;
          // Monte Carlo fields
          p10?: { years: number; fundLeftReal: number; isPerpetual: boolean };
          p50?: { years: number; fundLeftReal: number; isPerpetual: boolean };
          p90?: { years: number; fundLeftReal: number; isPerpetual: boolean };
          probPerpetual?: number;
        } = null;

        if (showGen && netEstate > 0) {
          const benAges = hypBenAgesStr
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n >= 0 && n < 90);

          // Calculate EOL values for all three percentiles
          const eolP10 = batchSummary.eolReal_p10 * Math.pow(1 + infl, yearsFrom2025);
          const eolP50 = batchSummary.eolReal_p50 * Math.pow(1 + infl, yearsFrom2025);
          const eolP90 = batchSummary.eolReal_p90 * Math.pow(1 + infl, yearsFrom2025);

          // Calculate estate tax and net estate for each percentile
          const estateTaxP10 = calcEstateTax(eolP10, marital);
          const estateTaxP50 = calcEstateTax(eolP50, marital);
          const estateTaxP90 = calcEstateTax(eolP90, marital);

          const netEstateP10 = eolP10 - estateTaxP10;
          const netEstateP50 = eolP50 - estateTaxP50;
          const netEstateP90 = eolP90 - estateTaxP90;

          // Run generational wealth simulation for all three percentiles
          const simP10 = simulateRealPerBeneficiaryPayout(
            netEstateP10,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            totalFertilityRate,
            generationLength,
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0],
            fertilityWindowStart,
            fertilityWindowEnd
          );

          const simP50 = simulateRealPerBeneficiaryPayout(
            netEstateP50,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            totalFertilityRate,
            generationLength,
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0],
            fertilityWindowStart,
            fertilityWindowEnd
          );

          const simP90 = simulateRealPerBeneficiaryPayout(
            netEstateP90,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            totalFertilityRate,
            generationLength,
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0],
            fertilityWindowStart,
            fertilityWindowEnd
          );

          // Count how many percentiles resulted in perpetual wealth
          const perpetualCount = [
            simP10.fundLeftReal > 0,
            simP50.fundLeftReal > 0,
            simP90.fundLeftReal > 0
          ].filter(Boolean).length;

          // Estimate probability: if P50 is perpetual, assume ~50%+
          // This is a rough estimate since we only have 3 data points
          let probPerpetual = 0;
          if (simP90.fundLeftReal > 0 && simP50.fundLeftReal > 0 && simP10.fundLeftReal > 0) {
            probPerpetual = 0.90; // All three are perpetual, very likely >90%
          } else if (simP90.fundLeftReal > 0 && simP50.fundLeftReal > 0) {
            probPerpetual = 0.65; // P50 and P90 perpetual, ~65%
          } else if (simP90.fundLeftReal > 0) {
            probPerpetual = 0.15; // Only P90 perpetual, ~15%
          }

          genPayout = {
            perBenReal: hypPerBen,
            years: simP50.years,
            fundLeftReal: simP50.fundLeftReal,
            startBeneficiaries: Math.max(1, hypStartBens),
            lastLivingCount: simP50.lastLivingCount,
            totalFertilityRate,
            generationLength,
            deathAge: Math.max(1, hypDeathAge),
            // Monte Carlo fields
            p10: {
              years: simP10.years,
              fundLeftReal: simP10.fundLeftReal,
              isPerpetual: simP10.fundLeftReal > 0
            },
            p50: {
              years: simP50.years,
              fundLeftReal: simP50.fundLeftReal,
              isPerpetual: simP50.fundLeftReal > 0
            },
            p90: {
              years: simP90.years,
              fundLeftReal: simP90.fundLeftReal,
              isPerpetual: simP90.fundLeftReal > 0
            },
            probPerpetual
          };
        }

        // Determine if ruined (survived fewer years than expected)
        const survYrs = batchSummary.probRuin > 0.5 ? yrsToSim - 5 : yrsToSim;

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
          estateTax,
          netEstate,
          eolAccounts: {
            taxable: eolWealth * 0.3,  // rough estimates for display
            pretax: eolWealth * 0.5,
            roth: eolWealth * 0.2,
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

        setRes(newRes);

        // Track calculation for tab interface and auto-switch to results
        setLastCalculated(new Date());
        setInputsModified(false);

        // Auto-switch from Configure tab to Results tab
        if (activeMainTab === 'configure') {
          setActiveMainTab('results');
        }

        setTimeout(() => {
          // In All-in-One tab, scroll to top of page
          if (activeMainTab === 'all') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (showGen && genPayout) {
            genRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (walkSeries === 'trulyRandom') {
            // Scroll to Monte Carlo visualizer when using Monte Carlo simulation
            monteCarloRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          // AI insight will be generated on demand when user clicks button
          setOlderAgeForAnalysis(olderAgeForAI);
          setIsLoadingAi(false);
        }, 100);

        return; // Exit early, we're done with batch mode
      }

      // Original single-run simulation code continues below...

      const accGen = buildReturnGenerator({
        mode: retMode,
        years: yrsToRet + 1,
        nominalPct: retRate,
        infPct: infRate,
        walkSeries,
        seed: currentSeed,
      })();

      const drawGen = buildReturnGenerator({
        mode: retMode,
        years: yrsToSim,
        nominalPct: retRate,
        infPct: infRate,
        walkSeries,
        seed: currentSeed + 1,
        // Bear market returns are injected directly in drawdown loop, not via generator
      })();

      let bTax = sTax;
      let bPre = sPre;
      let bPost = sPost;
      let basisTax = sTax;

      const data: { year: number; a1: number; a2: number | null; bal: number; real: number }[] = [];
      let totC = total;

      let c = {
        p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
        s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
      };

      // Get bear market returns if applicable
      const bearReturns3 = historicalYear ? getBearReturns(historicalYear) : null;

      for (let y = 0; y <= yrsToRet; y++) {
        let g: number;

        // Apply FIRST bear return in the retirement year itself (y == yrsToRet)
        if (bearReturns3 && y === yrsToRet) {
          const pct = bearReturns3[0]; // First bear year
          if (walkSeries === "real") {
            const realRate = (1 + pct / 100) / (1 + infl) - 1;
            g = 1 + realRate;
          } else {
            g = 1 + pct / 100;
          }
        } else {
          g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);
        }

        const yr = CURR_YEAR + y;
        const a1 = age1 + y;
        const a2 = isMar ? age2 + y : null;

        if (y > 0) {
          bTax *= g;
          bPre *= g;
          bPost *= g;
        }

        if (y > 0 && incContrib) {
          const f = 1 + incRate / 100;
          (Object.keys(c.p) as (keyof typeof c.p)[]).forEach((k) => (c.p[k] *= f));
          if (isMar)
            (Object.keys(c.s) as (keyof typeof c.s)[]).forEach((k) => (c.s[k] *= f));
        }

        const addMidYear = (amt: number) => amt * (1 + (g - 1) * 0.5);

        if (a1 < retAge) {
          bTax += addMidYear(c.p.tax);
          bPre += addMidYear(c.p.pre + c.p.match);
          bPost += addMidYear(c.p.post);
          basisTax += c.p.tax;
          totC += c.p.tax + c.p.pre + c.p.match + c.p.post;
        }
        if (isMar && a2! < retAge) {
          bTax += addMidYear(c.s.tax);
          bPre += addMidYear(c.s.pre + c.s.match);
          bPost += addMidYear(c.s.post);
          basisTax += c.s.tax;
          totC += c.s.tax + c.s.pre + c.s.match + c.s.post;
        }

        const bal = bTax + bPre + bPost;
        data.push({
          year: yr,
          a1,
          a2,
          bal,
          real: bal / Math.pow(1 + infl, y),
        });
      }

      const finNom = bTax + bPre + bPost;
      const infAdj = Math.pow(1 + infl, yrsToRet);
      const finReal = finNom / infAdj;

      const wdGrossY1 = finNom * (wdRate / 100);

      // Use imported tax calculation function
      const y1 = computeWithdrawalTaxes(
        wdGrossY1,
        marital,
        bTax,
        bPre,
        bPost,
        basisTax,
        stateRate
      );

      const wdAfterY1 = wdGrossY1 - y1.tax;
      const wdRealY1 = wdAfterY1 / infAdj;

      let retBalTax = bTax;
      let retBalPre = bPre;
      let retBalRoth = bPost;
      let currBasis = basisTax;
      let currWdGross = wdGrossY1;
      let survYrs = 0;
      let ruined = false;
      let totalRMDs = 0; // Track cumulative RMDs
      const rmdData: { age: number; spending: number; rmd: number }[] = []; // Track RMD vs spending

      // Bear market returns already applied: bearReturns3[0] was used in retirement year
      // Now apply bearReturns3[1] and bearReturns3[2] in years 1-2 of drawdown

      for (let y = 1; y <= yrsToSim; y++) {
        let g_retire: number;

        // Inject remaining bear market returns in years 1-2 after retirement
        if (bearReturns3 && y >= 1 && y <= 2) {
          const pct = bearReturns3[y]; // y=1 uses bearReturns3[1], y=2 uses bearReturns3[2]
          if (walkSeries === "real") {
            const realRate = (1 + pct / 100) / (1 + infl) - 1;
            g_retire = 1 + realRate;
          } else {
            g_retire = 1 + pct / 100;
          }
        } else {
          g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);
        }

        retBalTax *= g_retire;
        retBalPre *= g_retire;
        retBalRoth *= g_retire;

        // Calculate current age and check for RMD requirement
        const currentAge = age1 + yrsToRet + y;
        const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
        const requiredRMD = calcRMD(retBalPre, currentAge);

        // Calculate Social Security benefit if applicable
        let ssAnnualBenefit = 0;
        if (includeSS) {
          // Primary spouse
          if (currentAge >= ssClaimAge) {
            ssAnnualBenefit += calcSocialSecurity(ssIncome, ssClaimAge);
          }
          // Spouse (if married)
          if (isMar && currentAge2 >= ssClaimAge2) {
            ssAnnualBenefit += calcSocialSecurity(ssIncome2, ssClaimAge2);
          }
        }

        // Calculate healthcare costs
        let healthcareCosts = 0;

        // Medicare premiums (age 65+)
        if (includeMedicare && currentAge >= 65) {
          const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
          healthcareCosts += medicarePremium * 12 * medInflationFactor;

          // IRMAA surcharge if high income
          const totalIncome = ssAnnualBenefit + requiredRMD;
          const irmaaThreshold = marital === "married" ? irmaaThresholdMarried : irmaaThresholdSingle;
          if (totalIncome > irmaaThreshold) {
            healthcareCosts += irmaaSurcharge * 12 * medInflationFactor;
          }
        }

        // Long-term care costs (deterministic mode: averaged over probability and duration)
        if (includeLTC && currentAge >= ltcAgeRangeStart && currentAge <= ltcAgeRangeEnd) {
          // Average annual LTC cost = (total cost) × (probability) × (fraction of years in range)
          const yearsInRange = ltcAgeRangeEnd - ltcAgeRangeStart + 1;
          const avgAnnualLTC = (ltcAnnualCost * (ltcProbability / 100) * ltcDuration) / yearsInRange;
          const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
          healthcareCosts += avgAnnualLTC * medInflationFactor;
        }

        // Determine actual withdrawal amount needed from portfolio
        // SS reduces the amount we need to withdraw (but can't go below RMD)
        // Healthcare costs increase the amount we need to withdraw
        let netSpendingNeed = Math.max(0, currWdGross + healthcareCosts - ssAnnualBenefit);
        let actualWithdrawal = netSpendingNeed;
        let rmdExcess = 0;

        if (requiredRMD > 0) {
          // RMD is mandatory - must withdraw at least this much from pre-tax
          totalRMDs += requiredRMD;

          if (requiredRMD > netSpendingNeed) {
            // RMD exceeds spending needs (after SS)
            actualWithdrawal = requiredRMD;
            rmdExcess = requiredRMD - netSpendingNeed;
          }
        }

        // Track RMD vs spending for tax bomb visualization
        if (currentAge >= RMD_START_AGE) {
          rmdData.push({
            age: currentAge,
            spending: netSpendingNeed,
            rmd: requiredRMD,
          });
        }

        const taxes = computeWithdrawalTaxes(
          actualWithdrawal,
          marital,
          retBalTax,
          retBalPre,
          retBalRoth,
          currBasis,
          stateRate
        );

        retBalTax -= taxes.draw.t;
        retBalPre -= taxes.draw.p;
        retBalRoth -= taxes.draw.r;
        currBasis = taxes.newBasis;

        // Handle excess RMD: deposit back into taxable after taxes
        if (rmdExcess > 0) {
          const excessTax = calcOrdinaryTax(rmdExcess, marital);
          const excessAfterTax = rmdExcess - excessTax;
          retBalTax += excessAfterTax;
          currBasis += excessAfterTax; // Excess is now basis in taxable
        }

        if (retBalTax < 0) retBalTax = 0;
        if (retBalPre < 0) retBalPre = 0;
        if (retBalRoth < 0) retBalRoth = 0;

        const totalNow = retBalTax + retBalPre + retBalRoth;

        // Add retirement year data points to chart
        const yr = CURR_YEAR + yrsToRet + y;
        const a1 = age1 + yrsToRet + y;
        const a2 = isMar ? age2 + yrsToRet + y : null;
        data.push({
          year: yr,
          a1,
          a2,
          bal: totalNow,
          real: totalNow / Math.pow(1 + infl, yrsToRet + y),
        });

        if (totalNow <= 0) {
          if (!ruined) {
            survYrs = y - 1;
            ruined = true;
          }
          retBalTax = retBalPre = retBalRoth = 0;
          // Continue loop to maintain chart data through age 95
        } else {
          survYrs = y;
        }

        currWdGross *= infl_factor;
      }

      const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth);

      // Calculate estate tax
      const estateTax = calcEstateTax(eolWealth, marital);
      const netEstate = eolWealth - estateTax;

      // Calculate real (inflation-adjusted) EOL wealth for comparisons
      const yearsFrom2025 = yrsToRet + yrsToSim;
      const eolReal = eolWealth / Math.pow(1 + infl, yearsFrom2025);

      // Track account balances at end of life
      const eolAccounts = {
        taxable: retBalTax,
        pretax: retBalPre,
        roth: retBalRoth,
      };
      let genPayout: null | {
        perBenReal: number;
        years: number;
        fundLeftReal: number;
        startBeneficiaries: number;
        lastLivingCount: number;
        birthMultiple: number;
        birthInterval: number;
        deathAge: number;
      } = null;

      if (showGen && netEstate > 0) {
        // Parse beneficiary ages from comma-separated string
        const benAges = hypBenAgesStr
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n >= 0 && n < 90);

        const sim = simulateRealPerBeneficiaryPayout(
          netEstate, // Use net estate after estate tax
          yearsFrom2025,
          retRate,
          infRate,
          hypPerBen,
          Math.max(1, hypStartBens),
          totalFertilityRate,
          generationLength,
          Math.max(1, hypDeathAge),
          Math.max(0, hypMinDistAge),
          10000,
          benAges.length > 0 ? benAges : [0],
          fertilityWindowStart,
          fertilityWindowEnd
        );
        genPayout = {
          perBenReal: hypPerBen,
          years: sim.years,
          fundLeftReal: sim.fundLeftReal,
          startBeneficiaries: Math.max(1, hypStartBens),
          lastLivingCount: sim.lastLivingCount,
          totalFertilityRate,
          generationLength,
          deathAge: Math.max(1, hypDeathAge),
        };
      }

      newRes = {
        finNom,
        finReal,
        totC,
        data,
        yrsToRet,
        wd: wdGrossY1,
        wdAfter: wdAfterY1,
        wdReal: wdRealY1,
        survYrs,
        yrsToSim,
        eol: eolWealth,
        eolReal,  // Real (inflation-adjusted) EOL wealth for comparisons
        estateTax,
        netEstate,
        eolAccounts,
        totalRMDs,
        genPayout,
        rmdData, // Add RMD vs spending data for tax bomb chart
        tax: {
          fedOrd: calcOrdinaryTax(y1.draw.p, marital),
          fedCap: calcLTCGTax(
            y1.draw.t * (Math.max(0, bTax - basisTax) / Math.max(1, bTax)),
            marital,
            y1.draw.p
          ),
          niit: calcNIIT(
            y1.draw.t * (Math.max(0, bTax - basisTax) / Math.max(1, bTax)),
            marital,
            y1.draw.p +
              y1.draw.t * (Math.max(0, bTax - basisTax) / Math.max(1, bTax))
          ),
          state: (y1.draw.p +
            y1.draw.t * (Math.max(0, bTax - basisTax) / Math.max(1, bTax))) *
            (stateRate / 100),
          tot: y1.tax,
        },
      };

      setRes(newRes);

      // Track calculation for tab interface and auto-switch to results
      setLastCalculated(new Date());
      setInputsModified(false);

      // Auto-switch from Configure tab to Results tab
      if (activeMainTab === 'configure') {
        setActiveMainTab('results');
      }

      setTimeout(() => {
        // In All-in-One tab, scroll to top of page
        if (activeMainTab === 'all') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (showGen && genPayout) {
          genRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (walkSeries === 'trulyRandom') {
          // Scroll to Monte Carlo visualizer when using Monte Carlo simulation
          monteCarloRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // AI insight will be generated on demand when user clicks button
        setOlderAgeForAnalysis(olderAgeForAI);
        setIsLoadingAi(false);
      }, 100);

    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setRes(null);
      setIsLoadingAi(false);
    }
  }, [
    age1, age2, retAge, isMar, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    showGen, total, marital,
    hypPerBen, hypStartBens, hypBirthMultiple, hypBirthInterval, hypDeathAge, hypMinDistAge,
    retMode, seed, walkSeries, historicalYear,
    inflationShockRate, inflationShockDuration,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2, hypBenAgesStr,
    activeMainTab, setActiveMainTab,
  ]);

  // Calculate sensitivity analysis using mathematical approximations
  const calculateSensitivity = useCallback(() => {
    if (!res) return null;

    const baselineEOL = res.eol;
    const retirementBalance = res.finNom;
    const younger = Math.min(age1, isMar ? age2 : age1);
    const yrsToRet = retAge - younger;
    const yrsToSim = Math.max(0, LIFE_EXP - (Math.max(age1, isMar ? age2 : age1) + yrsToRet));
    const variations = [];

    // Return Rate impact: Use compound growth sensitivity
    // ±2% over 30 years ≈ ±60% impact on accumulation, ±40% on total EOL
    const returnDelta = 0.02;
    const accumulationYears = yrsToRet;
    const drawdownYears = yrsToSim;
    const totalYears = accumulationYears + drawdownYears;
    const returnImpact = baselineEOL * (Math.pow(1 + retRate/100 + returnDelta, totalYears) / Math.pow(1 + retRate/100, totalYears) - 1);
    variations.push({
      label: "Return Rate",
      high: returnImpact,
      low: -returnImpact * 0.95, // Slightly asymmetric
      range: Math.abs(returnImpact) * 1.95,
    });

    // Retirement Age: Each year delays retirement adds ~1 year of contributions + growth, saves 1 year of withdrawals
    const annualContrib = (cTax1 + cPre1 + cPost1 + cMatch1 + cTax2 + cPre2 + cPost2 + cMatch2);
    const growthFactor = Math.pow(1 + retRate/100, yrsToRet / 2); // Mid-point growth
    const retAgeImpact = (annualContrib * growthFactor * 2) + (res.wd * 2); // 2 years of contributions + savings from not withdrawing
    variations.push({
      label: "Retirement Age",
      high: retAgeImpact * 2, // +2 years
      low: -retAgeImpact * 2, // -2 years
      range: retAgeImpact * 4,
    });

    // Withdrawal Rate: Direct impact on EOL wealth
    // ±0.5% over yrsToSim years with compound effects
    const avgBalance = (retirementBalance + baselineEOL) / 2;
    const wdImpact = avgBalance * 0.005 * yrsToSim * 1.2; // 1.2 factor for compound effects
    variations.push({
      label: "Withdrawal Rate",
      high: -wdImpact, // Higher withdrawal = lower EOL (negative impact)
      low: wdImpact, // Lower withdrawal = higher EOL (positive impact)
      range: wdImpact * 2,
    });

    // Starting Savings: ±15% with growth over entire period
    const savingsGrowthFactor = Math.pow(1 + retRate/100, totalYears);
    const savingsImpact = (sTax + sPre + sPost) * 0.15 * savingsGrowthFactor;
    variations.push({
      label: "Starting Savings",
      high: savingsImpact,
      low: -savingsImpact,
      range: savingsImpact * 2,
    });

    // Annual Contributions: ±15% over yrsToRet with growth
    // Future value of annuity with geometric growth
    const fvFactor = ((Math.pow(1 + retRate/100, yrsToRet) - 1) / (retRate/100)) * (1 + retRate/100);
    const contribImpact = annualContrib * 0.15 * fvFactor * Math.pow(1 + retRate/100, yrsToSim);
    variations.push({
      label: "Annual Contributions",
      high: contribImpact,
      low: -contribImpact,
      range: contribImpact * 2,
    });

    // Inflation: ±0.5% affects real purchasing power
    // Higher inflation reduces real EOL value
    const inflationDelta = 0.005;
    const inflationImpact = baselineEOL * (1 - Math.pow(1 + inflationDelta, totalYears) / Math.pow(1 + infRate/100, totalYears)) * Math.pow(1 + infRate/100, totalYears);
    variations.push({
      label: "Inflation Rate",
      high: -Math.abs(inflationImpact), // Higher inflation = lower real value
      low: Math.abs(inflationImpact), // Lower inflation = higher real value
      range: Math.abs(inflationImpact) * 2,
    });

    // Sort by range (impact magnitude)
    variations.sort((a, b) => b.range - a.range);

    return {
      baseline: baselineEOL,
      variations,
    };
  }, [res, retRate, retAge, wdRate, sTax, sPre, sPost, cTax1, cPre1, cPost1, cTax2, cPre2, cPost2, age1, age2, isMar, infRate]);

  // Load scenarios from localStorage on mount
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

  // Save current inputs and results as a scenario
  const saveScenario = useCallback(() => {
    if (!res || !scenarioName.trim()) return;

    const scenario = {
      id: Date.now().toString(),
      name: scenarioName.trim(),
      timestamp: Date.now(),
      inputs: {
        age1, age2, retAge, marital,
        sTax, sPre, sPost,
        cTax1, cPre1, cPost1, cMatch1,
        cTax2, cPre2, cPost2, cMatch2,
        retRate, infRate, stateRate, wdRate, incContrib, incRate,
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
  }, [res, scenarioName, savedScenarios, age1, age2, retAge, marital, sTax, sPre, sPost, cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2, retRate, infRate, stateRate, wdRate, incContrib, incRate]);

  // Delete a scenario
  const deleteScenario = useCallback((id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('retirement-scenarios', JSON.stringify(updated));
  }, [savedScenarios]);

  // Load a scenario (restore inputs)
  const loadScenario = useCallback((scenario: SavedScenario) => {
    const inp = scenario.inputs;
    setAge1(inp.age1);
    setAge2(inp.age2);
    setRetAge(inp.retAge);
    setMarital(inp.marital);
    setSTax(inp.sTax);
    setSPre(inp.sPre);
    setSPost(inp.sPost);
    setCTax1(inp.cTax1);
    setCPre1(inp.cPre1);
    setCPost1(inp.cPost1);
    setCMatch1(inp.cMatch1);
    setCTax2(inp.cTax2);
    setCPre2(inp.cPre2);
    setCPost2(inp.cPost2);
    setCMatch2(inp.cMatch2);
    setRetRate(inp.retRate);
    setInfRate(inp.infRate);
    setStateRate(inp.stateRate);
    setWdRate(inp.wdRate);
    setIncContrib(inp.incContrib);
    setIncRate(inp.incRate);
  }, []);

  return (
    <>
      {!loaderComplete && (
        <BrandLoader
          onHandoffStart={() => setLoaderHandoff(true)}
          onCubeAppended={() => setCubeAppended(true)}
          onComplete={() => setLoaderComplete(true)}
        />
      )}

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
        onPrint={() => window.print()}
        onShare={() => {
          const shareData = {
            title: 'Tax-Aware Retirement Plan',
            text: `Retirement projection: ${fmt(res.finReal)} by age ${retAge}, ${fmt(res.wdReal)}/yr after-tax income`,
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
            setWdPct(parseFloat((wdPct + deltas.withdrawalRateDelta).toFixed(2)));
            hasChanges = true;
          }

          // Only recalculate if changes were made
          if (hasChanges) {
            setInputsModified(true);

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
          <TabNavigation
            activeTab={activeMainTab}
            onTabChange={setActiveMainTab}
            hasResults={!!res}
          />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {res && (
          <>
            {/* ============================================
                PRINT REPORT WRAPPER - Professional PDF Output
                ============================================ */}
            <div className="hidden print:block print:bg-white print:text-black print:p-8 print:font-sans print:text-sm">

              {/* PAGE 1: COVER & KEY METRICS */}
              <section className="print-section print-page-break-after">
                <header className="mb-6 border-b-2 border-gray-900 pb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-black">
                    Tax-Aware Retirement Plan Report
                  </h1>
                  <p className="text-xs text-gray-700 mt-1">
                    Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} •
                    {scenarioName ? ` Scenario: ${scenarioName}` : ' Base Case Analysis'} •
                    {walkSeries === 'trulyRandom' ? ' Monte Carlo Simulation (1,000 runs)' : ' Single Path Projection'}
                  </p>
                </header>

                {/* 4 Key Metric Cards - Prominent placement on Page 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Future Balance */}
                  <div className="border-2 border-blue-300 bg-blue-50 p-4">
                    <div className="text-xs uppercase text-blue-800 font-semibold mb-1">Future Balance</div>
                    <div className="text-3xl font-bold text-blue-900 mb-1">{fmt(res.finNom)}</div>
                    <div className="text-sm text-blue-700">At age {retAge} (nominal)</div>
                  </div>

                  {/* Today's Dollars */}
                  <div className="border-2 border-green-300 bg-green-50 p-4">
                    <div className="text-xs uppercase text-green-800 font-semibold mb-1">Today's Dollars</div>
                    <div className="text-3xl font-bold text-green-900 mb-1">{fmt(res.finReal)}</div>
                    <div className="text-sm text-green-700">At age {retAge} (inflation-adjusted)</div>
                  </div>

                  {/* Annual Withdrawal */}
                  <div className="border-2 border-purple-300 bg-purple-50 p-4">
                    <div className="text-xs uppercase text-purple-800 font-semibold mb-1">Annual Withdrawal</div>
                    <div className="text-3xl font-bold text-purple-900 mb-1">{fmt(res.wd)}</div>
                    <div className="text-sm text-purple-700">{wdRate}% of balance (Year 1)</div>
                  </div>

                  {/* After-Tax Income */}
                  <div className="border-2 border-orange-300 bg-orange-50 p-4">
                    <div className="text-xs uppercase text-orange-800 font-semibold mb-1">After-Tax Income</div>
                    <div className="text-3xl font-bold text-orange-900 mb-1">{fmt(res.wdReal)}</div>
                    <div className="text-sm text-orange-700">Spendable (after all taxes)</div>
                  </div>
                </div>

                {/* Additional Metrics - Smaller cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {/* Success Rate */}
                  <div className="border border-gray-300 p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Plan Success Rate</div>
                    <div className="text-lg font-bold text-black">
                      {res.probRuin !== undefined ? `${((1 - res.probRuin) * 100).toFixed(1)}%` : '100%'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {res.probRuin !== undefined
                        ? `${1000 - Math.round(res.probRuin * 1000)}/1,000 runs`
                        : 'Deterministic'}
                    </div>
                  </div>

                  {/* End-of-Life Wealth */}
                  <div className="border border-gray-300 p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-1">End-of-Life Wealth</div>
                    <div className="text-lg font-bold text-black">{fmt(res.eol)}</div>
                    <div className="text-xs text-gray-600">At age {LIFE_EXP}</div>
                  </div>

                  {/* Net to Heirs */}
                  <div className="border border-gray-300 p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Net to Heirs</div>
                    <div className="text-lg font-bold text-black">{fmt(res.netEstate || res.eol)}</div>
                    <div className="text-xs text-gray-600">After {fmt(res.estateTax || 0)} tax</div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="mt-6 p-4 border-2 border-gray-300 bg-gray-50">
                  <h3 className="text-base font-semibold mb-2 text-black">Plan Summary</h3>
                  <div className="space-y-1 text-sm text-gray-800">
                    <p>
                      <strong>Retirement Timeline:</strong> Age {age1} to {retAge} (accumulation), then {retAge} to {LIFE_EXP} (retirement)
                    </p>
                    <p>
                      <strong>Starting Balance:</strong> {fmt(sTax + sPre + sPost)} across all accounts
                    </p>
                    <p>
                      <strong>Annual Contributions:</strong> {fmt(cTax1 + cPre1 + cPost1 + cMatch1)}{isMar ? ` (Primary) + ${fmt(cTax2 + cPre2 + cPost2 + cMatch2)} (Spouse)` : ''} until retirement
                    </p>
                    <p>
                      <strong>Withdrawal Strategy:</strong> {wdRate}% initial withdrawal rate, inflation-adjusted annually
                    </p>
                    <p>
                      <strong>Return Assumptions:</strong> {retMode === 'fixed' ? `${retRate}% nominal (${(retRate - infRate).toFixed(1)}% real)` : 'Historical S&P 500 bootstrap (1928-2024)'} with {infRate}% inflation
                    </p>
                  </div>
                </div>
              </section>

              {/* PAGE 2: USER INPUTS & CORE ASSUMPTIONS */}
              <section className="print-section print-page-break-after">
                <header className="mb-4 border-b-2 border-gray-900 pb-3">
                  <h2 className="text-xl font-bold text-black">Inputs & Assumptions</h2>
                  <p className="text-xs text-gray-700 mt-1">All user-provided inputs and calculator defaults used in this analysis</p>
                </header>

                {/* Profile & Timeline */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Profile & Timeline</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Current Age (Primary)</th>
                        <td className="px-3 py-2 text-right text-black">{age1}</td>
                      </tr>
                      {isMar && (
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Current Age (Spouse)</th>
                          <td className="px-3 py-2 text-right text-black">{age2}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Retirement Age</th>
                        <td className="px-3 py-2 text-right text-black">{retAge}</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Life Expectancy Assumption</th>
                        <td className="px-3 py-2 text-right text-black">Age {LIFE_EXP}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Filing Status</th>
                        <td className="px-3 py-2 text-right text-black capitalize">{marital}</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Years to Retirement</th>
                        <td className="px-3 py-2 text-right text-black">{retAge - age1}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Retirement Duration</th>
                        <td className="px-3 py-2 text-right text-black">{LIFE_EXP - retAge} years</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Account Balances */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Current Account Balances</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable (Brokerage)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(sTax)}</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax (Traditional 401k/IRA)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(sPre)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Roth (Tax-Free)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(sPost)}</td>
                      </tr>
                      <tr className="border-t-2 border-gray-900">
                        <th className="px-3 py-2 text-left font-bold text-black">Total Starting Balance</th>
                        <td className="px-3 py-2 text-right font-bold text-black">{fmt(sTax + sPre + sPost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Annual Contributions */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Annual Contributions (Until Retirement)</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable Account (Primary)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(cTax1)}</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax 401k/IRA (Primary)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(cPre1)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Roth (Primary)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(cPost1)}</td>
                      </tr>
                      {cMatch1 > 0 && (
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Employer Match (Primary)</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(cMatch1)}</td>
                        </tr>
                      )}
                      {isMar && (
                        <>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Taxable Account (Spouse)</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(cTax2)}</td>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax 401k/IRA (Spouse)</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(cPre2)}</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Roth (Spouse)</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(cPost2)}</td>
                          </tr>
                          {cMatch2 > 0 && (
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-black">Employer Match (Spouse)</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(cMatch2)}</td>
                            </tr>
                          )}
                        </>
                      )}
                      <tr className="border-t-2 border-gray-900">
                        <th className="px-3 py-2 text-left font-bold text-black">Total Annual Contributions</th>
                        <td className="px-3 py-2 text-right font-bold text-black">
                          {fmt(cTax1 + cPre1 + cPost1 + cMatch1 + (isMar ? cTax2 + cPre2 + cPost2 + cMatch2 : 0))}
                        </td>
                      </tr>
                      {incContrib && (
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-black">Contribution Growth Rate</th>
                          <td className="px-3 py-2 text-right text-black">{incRate}% annually</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Withdrawal & Spending */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Withdrawal & Spending Policy</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Initial Withdrawal Rate</th>
                        <td className="px-3 py-2 text-right text-black">{wdRate}%</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Withdrawal Adjustment</th>
                        <td className="px-3 py-2 text-right text-black">Inflation-adjusted annually</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Spending Target (Year 1 Real)</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.finReal * (wdRate / 100))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Return & Risk Assumptions */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Return & Risk Assumptions</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      {retMode === 'fixed' ? (
                        <>
                          <tr className="bg-gray-50">
                            <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Return Model</th>
                            <td className="px-3 py-2 text-right text-black">Fixed Annual Return</td>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Nominal Expected Return</th>
                            <td className="px-3 py-2 text-right text-black">{retRate}%</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Real Expected Return</th>
                            <td className="px-3 py-2 text-right text-black">{(retRate - infRate).toFixed(2)}%</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr className="bg-gray-50">
                            <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Return Model</th>
                            <td className="px-3 py-2 text-right text-black">Historical S&P 500 Bootstrap</td>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Historical Data Period</th>
                            <td className="px-3 py-2 text-right text-black">1928-2024 Total Returns</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Sampling Method</th>
                            <td className="px-3 py-2 text-right text-black">
                              {walkSeries === 'trulyRandom' ? 'Random with replacement' : 'Sequential from seed'}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Monte Carlo Runs</th>
                        <td className="px-3 py-2 text-right text-black">
                          {walkSeries === 'trulyRandom' ? '1,000' : '1 (deterministic)'}
                        </td>
                      </tr>
                      {retMode === 'randomWalk' && (
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-black">Sequence-of-Returns Risk</th>
                          <td className="px-3 py-2 text-right text-black">Modeled (historical variability)</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tax Assumptions */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Tax Assumptions</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Tax Treatment</th>
                        <td className="px-3 py-2 text-right text-black">Account-type aware (Taxable/Pre-tax/Roth)</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">RMD Start Age</th>
                        <td className="px-3 py-2 text-right text-black">Age {RMD_START_AGE} (IRS default)</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Estate Tax Exemption</th>
                        <td className="px-3 py-2 text-right text-black">{fmt(ESTATE_TAX_EXEMPTION)} (2025 threshold)</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Estate Tax Rate</th>
                        <td className="px-3 py-2 text-right text-black">{(ESTATE_TAX_RATE * 100).toFixed(0)}% (federal)</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">State Tax Rate</th>
                        <td className="px-3 py-2 text-right text-black">{stateRate}%</td>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-black">Tax Calculation Method</th>
                        <td className="px-3 py-2 text-right text-black">Federal brackets + LTCG + NIIT</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Inflation & Scenario Assumptions */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Inflation & Scenario Modeling</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <tbody>
                      <tr className="bg-gray-50">
                        <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Baseline Inflation Rate</th>
                        <td className="px-3 py-2 text-right text-black">{infRate}% annually</td>
                      </tr>
                      {showInflationShock && inflationShockRate > 0 && (
                        <>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Inflation Shock Rate</th>
                            <td className="px-3 py-2 text-right text-black">{inflationShockRate}%</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Shock Duration</th>
                            <td className="px-3 py-2 text-right text-black">{inflationShockDuration} years</td>
                          </tr>
                        </>
                      )}
                      {showBearMarket && historicalYear && (
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Bear Market Scenario</th>
                          <td className="px-3 py-2 text-right text-black">Starting year {historicalYear}</td>
                        </tr>
                      )}
                      <tr className={showInflationShock || showBearMarket ? '' : 'bg-gray-50'}>
                        <th className="px-3 py-2 text-left font-semibold text-black">Scenario Comparison Mode</th>
                        <td className="px-3 py-2 text-right text-black">{comparisonMode ? 'Enabled' : 'Disabled'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Social Security (if applicable) */}
                {includeSS && (
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Social Security Assumptions</h3>
                    <table className="w-full text-xs border border-gray-200">
                      <tbody>
                        <tr className="bg-gray-50">
                          <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Primary Avg Career Earnings</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(ssIncome)}</td>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Primary Claim Age</th>
                          <td className="px-3 py-2 text-right text-black">{ssClaimAge}</td>
                        </tr>
                        {isMar && (
                          <>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold text-black">Spouse Avg Career Earnings</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(ssIncome2)}</td>
                            </tr>
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-black">Spouse Claim Age</th>
                              <td className="px-3 py-2 text-right text-black">{ssClaimAge2}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* PAGE 3: WEALTH ACCUMULATION CHART & PROJECTIONS */}
              <section className="print-section print-page-break-after">
                <header className="mb-4 border-b-2 border-gray-900 pb-3">
                  <h2 className="text-xl font-bold text-black">Wealth Accumulation Projection</h2>
                  <p className="text-xs text-gray-700 mt-1">
                    {walkSeries === 'trulyRandom'
                      ? 'Median (50th percentile) projection with percentile bands'
                      : 'Deterministic projection based on assumptions'}
                  </p>
                </header>

                {/* Actual Wealth Accumulation Chart */}
                {!comparisonMode && res?.data && res.data.length > 0 && (
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={res.data}>
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
                        <XAxis dataKey="year" className="text-xs" />
                        <YAxis tickFormatter={(v) => fmt(v as number)} className="text-xs" />
                        <RTooltip
                          formatter={(v) => fmt(v as number)}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="bal"
                          fill="url(#colorBal)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Nominal Balance"
                        />
                        <Line
                          type="monotone"
                          dataKey="real"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          name="Real Balance (Today's $)"
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
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            name="90th Percentile (Nominal)"
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Comparison Chart (if in comparison mode) */}
                {comparisonMode && comparisonData.baseline?.data && comparisonData.baseline.data.length > 0 && (
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={comparisonData.baseline.data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="year" className="text-xs" />
                        <YAxis tickFormatter={(v) => fmt(v as number)} className="text-xs" />
                        <RTooltip
                          formatter={(v) => fmt(v as number)}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="real"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Baseline (Real)"
                        />
                        {comparisonData.showBearMarket && comparisonData.bearMarket?.data && (
                          <Line
                            type="monotone"
                            dataKey="bearMarket"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Bear Market (Real)"
                          />
                        )}
                        {comparisonData.showInflation && comparisonData.inflation?.data && (
                          <Line
                            type="monotone"
                            dataKey="inflation"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            name="Inflation Shock (Real)"
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Key Milestones Table */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Key Milestones</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Age / Year</th>
                        <th className="px-3 py-2 text-right font-semibold text-black">Nominal Balance</th>
                        <th className="px-3 py-2 text-right font-semibold text-black">Real Balance (Today's $)</th>
                        <th className="px-3 py-2 text-left font-semibold text-black">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 text-left text-black">Age {age1} (Today)</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(sTax + sPre + sPost)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(sTax + sPre + sPost)}</td>
                        <td className="px-3 py-2 text-left text-black text-xs">Current balance</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2 text-left text-black">Age {retAge} (Retirement)</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.finNom)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.finReal)}</td>
                        <td className="px-3 py-2 text-left text-black text-xs">Retirement begins, withdrawals start</td>
                      </tr>
                      {RMD_START_AGE >= retAge && RMD_START_AGE < LIFE_EXP && (
                        <tr>
                          <td className="px-3 py-2 text-left text-black">Age {RMD_START_AGE} (RMD Start)</td>
                          <td className="px-3 py-2 text-right text-black">—</td>
                          <td className="px-3 py-2 text-right text-black">—</td>
                          <td className="px-3 py-2 text-left text-black text-xs">Required Minimum Distributions begin</td>
                        </tr>
                      )}
                      <tr className={RMD_START_AGE >= retAge ? '' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-left text-black">Age {Math.floor((retAge + LIFE_EXP) / 2)}</td>
                        <td className="px-3 py-2 text-right text-black">—</td>
                        <td className="px-3 py-2 text-right text-black">—</td>
                        <td className="px-3 py-2 text-left text-black text-xs">Mid-retirement checkpoint</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2 text-left text-black">Age {LIFE_EXP} (End of Plan)</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.eol)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.eolReal || 0)}</td>
                        <td className="px-3 py-2 text-left text-black text-xs">End of life expectancy</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Account Composition Over Time */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Account Composition Breakdown</h3>
                  <table className="w-full text-xs border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-black">Milestone</th>
                        <th className="px-3 py-2 text-right font-semibold text-black">Taxable</th>
                        <th className="px-3 py-2 text-right font-semibold text-black">Pre-Tax</th>
                        <th className="px-3 py-2 text-right font-semibold text-black">Roth</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 text-left text-black">Today (Age {age1})</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(sTax)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(sPre)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(sPost)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2 text-left text-black">Retirement (Age {retAge})</td>
                        <td className="px-3 py-2 text-right text-black">—</td>
                        <td className="px-3 py-2 text-right text-black">—</td>
                        <td className="px-3 py-2 text-right text-black">—</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-left text-black">End of Life (Age {LIFE_EXP})</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.taxable)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.pretax)}</td>
                        <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.roth)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    Note: Retirement account composition data is calculated but not stored at all timepoints.
                    Consult the chart for visual representation of the accumulation trajectory.
                  </p>
                </div>

                {/* Success Rate & Risk Metrics */}
                {res.probRuin !== undefined && (
                  <div className="p-4 border-2 border-gray-300 bg-blue-50">
                    <h3 className="text-base font-semibold mb-2 text-black">Monte Carlo Analysis Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-gray-700">Success Rate:</div>
                        <div className="text-lg font-bold text-black">{((1 - res.probRuin) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-700">Failure Risk:</div>
                        <div className="text-lg font-bold text-black">{(res.probRuin * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-700">Successful Runs:</div>
                        <div className="text-base font-semibold text-black">{1000 - Math.round(res.probRuin * 1000)} out of 1,000</div>
                      </div>
                      <div>
                        <div className="text-gray-700">Interpretation:</div>
                        <div className="text-base font-semibold text-black">
                          {res.probRuin < 0.05 ? 'Very High Confidence' :
                           res.probRuin < 0.10 ? 'High Confidence' :
                           res.probRuin < 0.20 ? 'Moderate Confidence' :
                           'Low Confidence'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* PAGE 4: RMD & TAX PROJECTIONS */}
              {res.rmdData && res.rmdData.length > 0 && (
                <section className="print-section print-page-break-after">
                  <header className="mb-4 border-b-2 border-gray-900 pb-3">
                    <h2 className="text-xl font-bold text-black">RMD & Tax Projections</h2>
                    <p className="text-xs text-gray-700 mt-1">Required Minimum Distributions and tax impact analysis</p>
                  </header>

                  {/* Actual RMD Chart */}
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={res.rmdData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="age" className="text-xs" />
                        <YAxis tickFormatter={(v) => fmt(v as number)} className="text-xs" />
                        <RTooltip
                          formatter={(v) => fmt(v as number)}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="spending"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          name="Spending Need (after SS)"
                        />
                        <Line
                          type="monotone"
                          dataKey="rmd"
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Required RMD"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tax Planning Tip */}
                  <div className="mb-6 p-3 bg-amber-50 border border-amber-300 rounded">
                    <p className="text-xs text-amber-900">
                      <strong>Tax Planning Tip:</strong> When the red dashed line (RMD) crosses above the green line (Spending),
                      you're forced to withdraw more than you need. This excess gets taxed and reinvested in taxable accounts.
                      Consider Roth conversions before age {RMD_START_AGE} to reduce future RMDs.
                    </p>
                  </div>

                  {/* RMD Summary Table */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">RMD Summary</h3>
                    {(() => {
                      const peakRMD = res.rmdData.reduce((max: any, curr: any) => curr.rmd > max.rmd ? curr : max, res.rmdData[0]);
                      const firstRMD = res.rmdData.find((d: any) => d.rmd > 0);
                      const totalRMDs = res.rmdData.reduce((sum: number, d: any) => sum + d.rmd, 0);
                      const avgExcess = res.rmdData.reduce((sum: number, d: any) => sum + Math.max(0, d.rmd - d.spending), 0) / res.rmdData.length;

                      return (
                        <table className="w-full text-xs border border-gray-200">
                          <tbody>
                            <tr className="bg-gray-50">
                              <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">RMD Start Age</th>
                              <td className="px-3 py-2 text-right text-black">Age {RMD_START_AGE}</td>
                            </tr>
                            {firstRMD && (
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-black">First Year RMD Amount</th>
                                <td className="px-3 py-2 text-right text-black">{fmt(firstRMD.rmd)}</td>
                              </tr>
                            )}
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold text-black">Peak RMD Year</th>
                              <td className="px-3 py-2 text-right text-black">Age {peakRMD.age}</td>
                            </tr>
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-black">Peak RMD Amount</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(peakRMD.rmd)}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold text-black">Peak Year Spending Need</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(peakRMD.spending)}</td>
                            </tr>
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-black">Peak Year Excess (Taxed)</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(Math.max(0, peakRMD.rmd - peakRMD.spending))}</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold text-black">Total Lifetime RMDs</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(res.totalRMDs || totalRMDs)}</td>
                            </tr>
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-black">Avg Annual Excess</th>
                              <td className="px-3 py-2 text-right text-black">{fmt(avgExcess)}</td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  {/* Tax Impact Analysis */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Tax Impact</h3>
                    <table className="w-full text-xs border border-gray-200">
                      <tbody>
                        <tr className="bg-gray-50">
                          <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Year 1 Federal Ordinary Tax</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(res.tax?.fedOrd || 0)}</td>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Year 1 Capital Gains Tax</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(res.tax?.fedCap || 0)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-black">Year 1 NIIT (3.8%)</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(res.tax?.niit || 0)}</td>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Year 1 State Tax</th>
                          <td className="px-3 py-2 text-right text-black">{fmt(res.tax?.state || 0)}</td>
                        </tr>
                        <tr className="bg-gray-50 border-t-2 border-gray-900">
                          <th className="px-3 py-2 text-left font-bold text-black">Year 1 Total Tax</th>
                          <td className="px-3 py-2 text-right font-bold text-black">{fmt(res.tax?.tot || 0)}</td>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-black">Effective Tax Rate (Year 1)</th>
                          <td className="px-3 py-2 text-right text-black">
                            {((((res.finReal * (wdRate / 100)) - res.wdReal) / (res.finReal * (wdRate / 100))) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Planning Recommendations */}
                  {(() => {
                    const peakRMD = res.rmdData.reduce((max: any, curr: any) => curr.rmd > max.rmd ? curr : max, res.rmdData[0]);
                    const excessRMD = Math.max(0, peakRMD.rmd - peakRMD.spending);
                    const hasRMDBomb = excessRMD > 100000;

                    return hasRMDBomb ? (
                      <div className="p-4 border-2 border-yellow-500 bg-yellow-50">
                        <h3 className="text-base font-semibold mb-2 text-black">⚡ RMD Tax Bomb Detected</h3>
                        <p className="text-xs text-gray-800 mb-2">
                          At age {peakRMD.age}, your Required Minimum Distribution ({fmt(peakRMD.rmd)}) will significantly exceed
                          your spending need ({fmt(peakRMD.spending)}), resulting in {fmt(excessRMD)} of unwanted taxable income.
                        </p>
                        <p className="text-xs font-semibold text-gray-900">
                          Consider: Roth conversions during lower-income years, Qualified Charitable Distributions (QCDs) if eligible,
                          or strategic withdrawal timing to minimize tax impact.
                        </p>
                      </div>
                    ) : null;
                  })()}
                </section>
              )}

              {/* PAGE 5: SCENARIO COMPARISON (if applicable) */}
              {comparisonMode && comparisonData && (comparisonData.showBearMarket || comparisonData.showInflation) && (
                <section className="print-section print-page-break-after">
                  <header className="mb-4 border-b-2 border-gray-900 pb-3">
                    <h2 className="text-xl font-bold text-black">Scenario Comparison</h2>
                    <p className="text-xs text-gray-700 mt-1">Baseline vs. stress test scenarios</p>
                  </header>

                  {/* Note: Comparison chart is already shown in Page 3 Wealth Accumulation section */}
                  <div className="mb-6 p-3 bg-blue-50 border border-blue-300 rounded">
                    <p className="text-xs text-blue-900">
                      <strong>Note:</strong> The scenario comparison chart is displayed in the Wealth Accumulation Projection section (Page 3).
                      Below is a summary of the scenario definitions and key differences.
                    </p>
                  </div>

                  {/* Scenario Descriptions */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Scenario Definitions</h3>
                    <table className="w-full text-xs border border-gray-200">
                      <tbody>
                        <tr className="bg-gray-50">
                          <th className="w-1/3 px-3 py-2 text-left font-semibold text-black">Baseline</th>
                          <td className="px-3 py-2 text-left text-black">
                            {retMode === 'fixed' ? `${retRate}% nominal return` : 'Historical S&P 500 returns'} with {infRate}% inflation
                          </td>
                        </tr>
                        {comparisonData.showBearMarket && (
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Bear Market</th>
                            <td className="px-3 py-2 text-left text-black">
                              Severe early retirement market downturn{historicalYear ? ` (${historicalYear} scenario)` : ''}
                            </td>
                          </tr>
                        )}
                        {comparisonData.showInflation && (
                          <tr className={comparisonData.showBearMarket ? 'bg-gray-50' : ''}>
                            <th className="px-3 py-2 text-left font-semibold text-black">Inflation Shock</th>
                            <td className="px-3 py-2 text-left text-black">
                              Elevated {inflationShockRate}% inflation for {inflationShockDuration} years starting at retirement
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Scenario Outcomes Table (Placeholder) */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Scenario Outcomes</h3>
                    <p className="text-xs text-gray-600 italic">
                      Refer to the comparison chart for visual analysis of how each scenario impacts wealth over time.
                      Key differences will be most pronounced during early retirement years.
                    </p>
                  </div>
                </section>
              )}

              {/* PAGE 6: LIFETIME WEALTH FLOW */}
              <section className="print-section print-page-break-after">
                <header className="mb-4 border-b-2 border-gray-900 pb-3">
                  <h2 className="text-xl font-bold text-black">Lifetime Wealth Flow</h2>
                  <p className="text-xs text-gray-700 mt-1">From end-of-life wealth to net inheritance</p>
                </header>

                {res.eolAccounts && res.eol > 0 ? (
                  <>
                    {/* Sankey Diagram */}
                    <div className="mb-6" style={{ marginLeft: '-1rem', marginRight: '0.5rem' }}>
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
                              const taxRatio = (res.estateTax || 0) / res.eol;
                              const heirRatio = (res.netEstate || res.eol) / res.eol;
                              const links = [];

                              // Taxable flows (soft orange)
                              if (res.estateTax > 0 && res.eolAccounts.taxable > 0) {
                                links.push({
                                  source: 0,
                                  target: 3,
                                  value: res.eolAccounts.taxable * taxRatio,
                                  color: '#fb923c',
                                });
                              }
                              if (res.eolAccounts.taxable > 0) {
                                links.push({
                                  source: 0,
                                  target: 4,
                                  value: res.eolAccounts.taxable * heirRatio,
                                  color: '#fb923c',
                                });
                              }

                              // Pre-tax flows (soft blue)
                              if (res.estateTax > 0 && res.eolAccounts.pretax > 0) {
                                links.push({
                                  source: 1,
                                  target: 3,
                                  value: res.eolAccounts.pretax * taxRatio,
                                  color: '#60a5fa',
                                });
                              }
                              if (res.eolAccounts.pretax > 0) {
                                links.push({
                                  source: 1,
                                  target: 4,
                                  value: res.eolAccounts.pretax * heirRatio,
                                  color: '#60a5fa',
                                });
                              }

                              // Roth flows (soft green)
                              if (res.estateTax > 0 && res.eolAccounts.roth > 0) {
                                links.push({
                                  source: 2,
                                  target: 3,
                                  value: res.eolAccounts.roth * taxRatio,
                                  color: '#4ade80',
                                });
                              }
                              if (res.eolAccounts.roth > 0) {
                                links.push({
                                  source: 2,
                                  target: 4,
                                  value: res.eolAccounts.roth * heirRatio,
                                  color: '#4ade80',
                                });
                              }

                              return links;
                            })(),
                          }}
                          width={800}
                          height={350}
                          nodeWidth={15}
                          nodePadding={15}
                          margin={{ top: 30, right: 80, bottom: 30, left: 60 }}
                          link={(props: any) => {
                            const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
                            return (
                              <path
                                d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
                                fill="none"
                                stroke={payload?.color || '#94a3b8'}
                                strokeWidth={linkWidth}
                                strokeOpacity={0.6}
                              />
                            );
                          }}
                          node={(props: any) => {
                            const { x, y, width, height, index, payload } = props;
                            const colors = ['#fb923c', '#60a5fa', '#4ade80', '#ef4444', '#10b981'];
                            const fill = colors[index] || '#64748b';
                            const fullName = payload?.name || '';
                            const [label, value] = fullName.split(' — ');
                            const textY = y + height / 2;

                            return (
                              <g>
                                <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.85} />
                                <text
                                  x={index < 3 ? x - 10 : x + width + 10}
                                  y={textY - 8}
                                  textAnchor={index < 3 ? "end" : "start"}
                                  dominantBaseline="middle"
                                  fill="#374151"
                                  fontSize="12"
                                  fontWeight="600"
                                >
                                  {label}
                                </text>
                                <text
                                  x={index < 3 ? x - 10 : x + width + 10}
                                  y={textY + 8}
                                  textAnchor={index < 3 ? "end" : "start"}
                                  dominantBaseline="middle"
                                  fill="#6b7280"
                                  fontSize="11"
                                  fontWeight="500"
                                >
                                  {value}
                                </text>
                              </g>
                            );
                          }}
                        />
                      </ResponsiveContainer>
                    </div>

                    {/* Account Breakdown Table */}
                    <div className="mb-4">
                      <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">End-of-Life Account Breakdown</h3>
                      <table className="w-full text-xs border border-gray-200">
                        <tbody>
                          <tr className="bg-gray-50">
                            <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable Accounts</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.taxable)}</td>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax (401k/IRA)</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.pretax)}</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Roth (Tax-Free)</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.roth)}</td>
                          </tr>
                          <tr className="border-t-2 border-gray-900">
                            <th className="px-3 py-2 text-left font-bold text-black">Total Estate</th>
                            <td className="px-3 py-2 text-right font-bold text-black">{fmt(res.eol)}</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Estate Tax</th>
                            <td className="px-3 py-2 text-right text-black">{fmt(res.estateTax || 0)}</td>
                          </tr>
                          <tr className="border-t-2 border-gray-900">
                            <th className="px-3 py-2 text-left font-bold text-black">Net to Heirs</th>
                            <td className="px-3 py-2 text-right font-bold text-black">{fmt(res.netEstate || res.eol)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total RMDs */}
                    {res.totalRMDs > 0 && (
                      <div className="mb-4">
                        <h3 className="text-base font-semibold mb-2 text-black">Total RMDs (Age 73+)</h3>
                        <p className="text-sm text-gray-700">Cumulative Required Minimum Distributions: <span className="font-bold">{fmt(res.totalRMDs)}</span></p>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
                      <p className="leading-relaxed">
                        <strong>Disclaimer:</strong> This Lifetime Wealth Flow illustration attributes estate tax proportionally across all account types based on their share of the total estate. In practice, executors often choose to satisfy estate tax using taxable assets first to preserve tax-advantaged accounts. The economic burden ultimately depends on your estate structure, beneficiary designations, and trust planning.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">No end-of-life wealth data available.</p>
                )}
              </section>

              {/* PAGE 7: STRESS TESTING (if scenarios are active) */}
              {(historicalYear || (inflationShockRate > 0 && inflationShockDuration > 0) || comparisonMode) && (
                <section className="print-section print-page-break-after">
                  <header className="mb-4 border-b-2 border-gray-900 pb-3">
                    <h2 className="text-xl font-bold text-black">Stress Testing & Scenario Analysis</h2>
                    <p className="text-xs text-gray-700 mt-1">Testing your plan against adverse market and inflation conditions</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Bear Market Stress Test */}
                    {historicalYear && (
                      <div className="p-4 border-2 border-red-300 bg-red-50 rounded">
                        <h3 className="text-base font-semibold mb-2 text-black">Bear Market Stress Test</h3>
                        <p className="text-xs text-gray-700 mb-3">
                          Testing with actual historical returns starting from a major market crash.
                        </p>
                        {(() => {
                          const scenario = BEAR_MARKET_SCENARIOS.find(s => s.year === historicalYear);
                          return scenario ? (
                            <div className="space-y-2">
                              <div className="p-2 bg-white border border-red-200 rounded">
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <div className="font-semibold text-sm text-black">{scenario.year} - {scenario.label}</div>
                                    <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    scenario.risk === 'extreme'
                                      ? 'bg-red-200 text-red-900'
                                      : scenario.risk === 'high'
                                      ? 'bg-orange-200 text-orange-900'
                                      : 'bg-yellow-200 text-yellow-900'
                                  }`}>
                                    {scenario.firstYear}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                <strong>Why this matters:</strong> Retiring into a bear market can permanently damage your portfolio even if markets recover later.
                                This scenario uses actual sequential S&P 500 returns from {historicalYear} forward.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600">Active scenario: {historicalYear}</p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Inflation Shock Stress Test */}
                    {inflationShockRate > 0 && inflationShockDuration > 0 && (
                      <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded">
                        <h3 className="text-base font-semibold mb-2 text-black">Inflation Shock Stress Test</h3>
                        <p className="text-xs text-gray-700 mb-3">
                          Modeling sustained high inflation on your real purchasing power.
                        </p>
                        {(() => {
                          const scenario = INFLATION_SHOCK_SCENARIOS.find(s => s.rate === inflationShockRate && s.duration === inflationShockDuration);
                          return scenario ? (
                            <div className="space-y-2">
                              <div className="p-2 bg-white border border-orange-200 rounded">
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <div className="font-semibold text-sm text-black">{scenario.label}</div>
                                    <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    scenario.risk === 'extreme'
                                      ? 'bg-red-200 text-red-900'
                                      : scenario.risk === 'high'
                                      ? 'bg-orange-200 text-orange-900'
                                      : 'bg-yellow-200 text-yellow-900'
                                  }`}>
                                    {scenario.rate}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                <strong>Impact:</strong> {inflationShockRate}% inflation for {inflationShockDuration} years starting at retirement, then returning to {infRate}% baseline.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600">
                              <strong>Custom scenario:</strong> {inflationShockRate}% inflation for {inflationShockDuration} years
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Scenario Comparison Summary */}
                  {comparisonMode && comparisonData && (comparisonData.showBearMarket || comparisonData.showInflation) && (
                    <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded">
                      <h3 className="text-base font-semibold mb-2 text-black">Scenario Comparison</h3>
                      <p className="text-xs text-gray-700 mb-3">
                        The wealth accumulation chart (Page 3) shows how these scenarios compare to your baseline projection.
                      </p>
                      <table className="w-full text-xs border border-gray-200 bg-white">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-black">Scenario</th>
                            <th className="px-3 py-2 text-left font-semibold text-black">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 text-black font-semibold">Baseline</td>
                            <td className="px-3 py-2 text-black">
                              {retMode === 'fixed' ? `${retRate}% nominal return` : 'Historical S&P 500 returns'} with {infRate}% inflation
                            </td>
                          </tr>
                          {comparisonData.showBearMarket && comparisonData.bearMarket && (
                            <tr className="bg-gray-50">
                              <td className="px-3 py-2 text-black font-semibold">Bear Market</td>
                              <td className="px-3 py-2 text-black">
                                Severe early retirement downturn ({comparisonData.bearMarket.label || `${comparisonData.bearMarket.year} scenario`})
                              </td>
                            </tr>
                          )}
                          {comparisonData.showInflation && comparisonData.inflation && (
                            <tr>
                              <td className="px-3 py-2 text-black font-semibold">Inflation Shock</td>
                              <td className="px-3 py-2 text-black">
                                Elevated inflation for first {inflationShockDuration} years of retirement
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* PAGE 8: PLAN ANALYSIS (if generated) */}
              <section className="print-section print-page-break-after">
                <header className="mb-4 border-b-2 border-gray-900 pb-3">
                  <h2 className="text-xl font-bold text-black">Plan Analysis</h2>
                  <p className="text-xs text-gray-700 mt-1">AI-generated insights and recommendations</p>
                </header>

                {aiInsight && aiInsight.trim().length > 0 ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {aiInsight}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-300 rounded">
                    <p className="text-sm text-gray-700">Plan analysis was not generated for this report.</p>
                  </div>
                )}
              </section>

              {/* FINAL PAGE: DISCLAIMERS & LIMITATIONS (No page-break-after to avoid blank page) */}
              <section className="print-section">
                <header className="mb-4 border-b-2 border-gray-900 pb-3">
                  <h2 className="text-xl font-bold text-black">Limitations & Disclaimers</h2>
                </header>

                <div className="space-y-4 text-xs text-gray-800">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-black">Educational Purpose Only</h3>
                    <p>
                      This report is generated by a retirement planning calculator for educational and illustrative purposes only.
                      It does NOT constitute personalized financial, investment, tax, or legal advice. You should consult with
                      qualified financial, tax, and legal professionals before making any financial decisions.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-black">Assumptions & Limitations</h3>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>All projections are based on the assumptions and inputs you provided, which may not reflect actual future conditions.</li>
                      <li>
                        {retMode === 'fixed'
                          ? `Fixed return assumptions (${retRate}% nominal) do not account for market volatility or sequence-of-returns risk.`
                          : 'Historical return data (1928-2024) may not predict future market performance. Past performance does not guarantee future results.'}
                      </li>
                      <li>Tax laws, brackets, and exemptions are subject to change and may differ significantly in the future.</li>
                      <li>Inflation assumptions ({infRate}% baseline) are estimates and actual inflation may vary substantially.</li>
                      <li>The model assumes consistent contribution and withdrawal patterns, which may not reflect real-world behavior.</li>
                      <li>Healthcare costs, long-term care, and other major expenses are not explicitly modeled unless incorporated into withdrawal rates.</li>
                      <li>Estate tax exemptions and rates reflect current law ({fmt(ESTATE_TAX_EXEMPTION)} exemption, {(ESTATE_TAX_RATE * 100).toFixed(0)}% rate) and may change.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-black">Monte Carlo Limitations</h3>
                    <p>
                      {walkSeries === 'trulyRandom'
                        ? 'While Monte Carlo simulation (1,000 runs) provides probabilistic outcomes, it is only as good as its underlying assumptions. Real-world outcomes may differ due to factors not captured in the model.'
                        : 'This report uses a deterministic (single-path) projection, which does not account for sequence-of-returns risk or stochastic variability. Actual outcomes may vary significantly.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-black">No Guarantees</h3>
                    <p>
                      There are no guarantees that any retirement plan will succeed. Market conditions, personal circumstances,
                      health events, tax law changes, and many other factors can dramatically impact outcomes. This calculator
                      provides estimates only and should not be relied upon as a sole basis for retirement planning decisions.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-black">Consult Professionals</h3>
                    <p>
                      For personalized advice, please consult:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>A Certified Financial Planner (CFP) or Registered Investment Advisor (RIA) for investment strategy</li>
                      <li>A Certified Public Accountant (CPA) or tax attorney for tax planning</li>
                      <li>An estate planning attorney for estate, trust, and legacy planning</li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-300">
                    <p className="text-xs text-gray-600 italic">
                      Report generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' '}by Tax-Aware Retirement Calculator.
                      This is a snapshot based on current inputs and may become outdated as circumstances change.
                    </p>
                  </div>
                </div>
              </section>

            </div>
            {/* END PRINT REPORT WRAPPER */}

            {/* Human Dashboard - Interactive (Screen Only) */}
            <AnimatedSection animation="slide-up" duration={700}>
            <div ref={resRef} className="space-y-6 scroll-mt-4">

            {/* User Input Summary - Print Only (Hidden - replaced by new print summary) */}
            <div className="hidden">
            <UserInputsPrintSummary
              age={age1}
              retirementAge={retAge}
              maritalStatus={marital}
              taxable={fmt(sTax)}
              pretax={fmt(sPre)}
              roth={fmt(sPost)}
              taxableContrib={fmt(cTax1)}
              pretaxContrib={fmt(cPre1)}
              rothContrib={fmt(cPost1)}
              inflation={infRate}
              withdrawalRate={wdRate}
              monteCarloRuns={1000}
              returnModel={retMode === 'fixed' ? `Fixed at ${retRate}%` : 'Historical 1928–2024 bootstrap'}
            />
            </div>

            <TabPanel id="results" activeTab={activeMainTab}>
            <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FlippingStatCard
                title="Future Balance"
                value={fmt(res.finNom)}
                sub={`At age ${retAge} (nominal)`}
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
                        This is your projected total retirement balance at age {retAge} in future dollars (nominal).
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
                        accounting for mid-year contributions and {retMode === 'fixed' ? `compounding returns at ${retRate}% annual return` : 'historical S&P 500 total-return bootstrap (1928–2024)'}.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="Today's Dollars"
                value={fmt(res.finReal)}
                sub={`At age ${retAge} (real)`}
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
                          <span className="flip-card-list-value">{infRate}%</span>
                        </li>
                        <li>
                          <span className="flip-card-list-label">Years to Retirement</span>
                          <span className="flip-card-list-value">{res.yrsToRet} years</span>
                        </li>
                      </ul>
                      <p className="flip-card-details-text">
                        Formula: Real Value = Nominal Value ÷ (1 + {infRate/100})<sup>{res.yrsToRet}</sup>
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
                        In all future years, this amount will be adjusted upward by the rate of inflation ({infRate}%) to maintain your purchasing power, regardless of market performance.
                      </p>
                    </div>
                  </>
                }
              />
              <FlippingStatCard
                title="After-Tax Income"
                value={fmt(res.wdReal)}
                sub="Year 1 real spending"
                color="emerald"
                backContent={
                  <>
                    <div className="flip-card-header">
                      <span className="flip-card-title">After-Tax Income - Details</span>
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
                        <span>Lifetime Wealth Flow</span>
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
                        <span>From end-of-life wealth to net inheritance</span>
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
                            const taxRatio = (res.estateTax || 0) / res.eol;
                            const heirRatio = (res.netEstate || res.eol) / res.eol;

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
                      {sensitivityData.variations.map((variation: any, idx: number) => {
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
                          <Button
                            variant={showScenarios ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowScenarios(!showScenarios);
                            }}
                            className="no-print"
                          >
                            {showScenarios ? "Hide" : `Show (${savedScenarios.length})`}
                          </Button>
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
                        {showComparison && selectedScenarios.size > 0 && (
                          <div className="comparison-chart mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg print:border-gray-300">
                            <h4 className="font-semibold mb-4 text-indigo-900 dark:text-indigo-100">Visual Comparison</h4>
                            <div className="space-y-4">
                              {/* EOL Wealth Comparison */}
                              <div>
                                <div className="text-xs font-medium mb-2 text-muted-foreground">End-of-Life Wealth (Real, Inflation-Adjusted)</div>
                                {Array.from(selectedScenarios).map((id) => {
                                  const scenario = savedScenarios.find(s => s.id === id);
                                  if (!scenario) return null;
                                  const maxEOL = Math.max(...Array.from(selectedScenarios).map(sid => savedScenarios.find(s => s.id === sid)?.results.eolReal || 0));
                                  const pct = (scenario.results.eolReal / maxEOL) * 100;
                                  return (
                                    <div key={id} className="mb-2">
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
                                {Array.from(selectedScenarios).map((id) => {
                                  const scenario = savedScenarios.find(s => s.id === id);
                                  if (!scenario) return null;
                                  const maxIncome = Math.max(...Array.from(selectedScenarios).map(sid => savedScenarios.find(s => s.id === sid)?.results.wdReal || 0));
                                  const pct = (scenario.results.wdReal / maxIncome) * 100;
                                  return (
                                    <div key={id} className="mb-2">
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
                                {Array.from(selectedScenarios).map((id) => {
                                  const scenario = savedScenarios.find(s => s.id === id);
                                  if (!scenario) return null;
                                  const maxBalance = Math.max(...Array.from(selectedScenarios).map(sid => savedScenarios.find(s => s.id === sid)?.results.finReal || 0));
                                  const pct = (scenario.results.finReal / maxBalance) * 100;
                                  return (
                                    <div key={id} className="mb-2">
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
                        )}

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
                                  <td className="text-right py-2 px-2">{retAge}</td>
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
                                  <td className="text-right py-2 px-2">{scenario.inputs.retAge}</td>
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
                                        <strong>Highest end-of-life wealth:</strong> {bestEOL.name} ({fmt(bestEOL.results.eol)})
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
            </TabPanel>

            {/* Portfolio Stress Tests - Consolidates Bear Market, Inflation Shock, and Scenario Comparison */}
            <TabPanel id="stress" activeTab={activeMainTab}>
            {/* Risk Summary Card */}
            <AnimatedSection animation="fade-in" delay={200}>
              <RiskSummaryCard
                baseSuccessRate={res.probRuin !== undefined ? (1 - res.probRuin) * 100 : undefined}
                currentScenario={{
                  name: retMode === 'fixed' ? 'Fixed Returns' : 'Historical Bootstrap',
                  description: retMode === 'fixed'
                    ? `Assumes constant ${retRate}% annual return`
                    : 'Based on historical market data (1928-2024)',
                  successRate: res.probRuin !== undefined ? (1 - res.probRuin) * 100 : 100,
                  eolWealth: res.eol,
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
                          type="number"
                          value={inflationShockRate}
                          onChange={(e) => setInflationShockRate(Number(e.target.value))}
                          min="0"
                          max="20"
                          step="0.5"
                          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Duration (years)</label>
                        <input
                          type="number"
                          value={inflationShockDuration}
                          onChange={(e) => setInflationShockDuration(Number(e.target.value))}
                          min="1"
                          max="10"
                          step="1"
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
                    <div className="chart-block">
                      <ScenarioComparisonChart
                        data={comparisonData.baseline.data}
                        comparisonData={comparisonData}
                        isDarkMode={isDarkMode}
                        fmt={fmt}
                      />
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            )}

            {/* Recalculate Button for Stress Tab */}
            <div className="flex justify-center mt-6">
              <RecalculateButton onClick={calc} isCalculating={isLoadingAi} />
            </div>
            </TabPanel>

            {/* Tabbed Chart Container */}
            <TabPanel id="results" activeTab={activeMainTab}>
            <AnimatedSection animation="slide-up" delay={300}>
              <div className="print-section print-block chart-container">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Projections</CardTitle>
                  <CardDescription>Visualize your wealth accumulation and tax planning</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeChartTab} onValueChange={setActiveChartTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 print-hide tab-controls">
                      <TabsTrigger value="accumulation">Accumulation</TabsTrigger>
                      <TabsTrigger value="rmd">RMD Tax Bomb</TabsTrigger>
                    </TabsList>

                    <TabsContent value="accumulation" className="space-y-4">
                      {walkSeries === 'trulyRandom' && (
                        <div className="flex gap-6 items-center print-hide">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="show-p10"
                              checked={showP10}
                              onCheckedChange={(checked) => setShowP10(checked as boolean)}
                            />
                            <label
                              htmlFor="show-p10"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              Show 10th Percentile (Nominal)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="show-p90"
                              checked={showP90}
                              onCheckedChange={(checked) => setShowP90(checked as boolean)}
                            />
                            <label
                              htmlFor="show-p90"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              Show 90th Percentile (Nominal)
                            </label>
                          </div>
                        </div>
                      )}
                      {/* Default Wealth Accumulation Chart - Always show in Results tab */}
                      {res?.data && res.data.length > 0 && (
                        <div className="chart-block">
                          <WealthAccumulationChart
                            data={res.data}
                            showP10={showP10}
                            showP90={showP90}
                            isDarkMode={isDarkMode}
                            fmt={fmt}
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="rmd" className="space-y-4">
                      {res.rmdData && res.rmdData.length > 0 ? (
                        <>
                          <div className="chart-block">
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={res.rmdData}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis dataKey="age" />
                              <YAxis tickFormatter={(v) => fmt(v as number)} />
                              <RTooltip
                                formatter={(v) => fmt(v as number)}
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
                                dataKey="spending"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                name="Spending Need (after SS)"
                              />
                              <Line
                                type="monotone"
                                dataKey="rmd"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Required RMD"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          </div>
                          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              <strong>Tax Planning Tip:</strong> When the red dashed line (RMD) crosses above the green line (Spending),
                              you&apos;re forced to withdraw more than you need. This excess gets taxed and reinvested in taxable accounts.
                              Consider Roth conversions before age {RMD_START_AGE} to reduce future RMDs.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">No RMD data available. RMDs begin at age {RMD_START_AGE} when you have pre-tax account balances.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              </div>
            </AnimatedSection>

            {/* Monte Carlo Visualizer - Always render to avoid canvas initialization issues */}
            <div ref={monteCarloRef} className="scroll-mt-4">
              <AnimatedSection animation="fade-in" delay={400}>
                <MonteCarloVisualizer
                  isRunning={isLoadingAi}
                  visible={walkSeries === 'trulyRandom'}
                />
              </AnimatedSection>
            </div>

            </TabPanel>
          </div>
          </AnimatedSection>
          </>
        )}

        {/* Input Form - Hide from print */}
        <TabPanel id="configure" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Plan Your Retirement</CardTitle>
            <CardDescription>Enter your information to calculate your retirement projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Tabbed Form Sections */}
            <TabGroup
              ref={tabGroupRef}
              tabs={[
                {
                  id: "personal",
                  label: "Personal Info",
                  defaultOpen: false,
                  content: (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Marital Status</Label>
                        <select
                          value={marital}
                          onChange={(e) => { setMarital(e.target.value as FilingStatus); setInputsModified(true); }}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                        </select>
                      </div>
                      <Input label="Your Age" value={age1} setter={setAge1} min={18} max={120} onInputChange={handleInputChange} />
                      <Input label="Retirement Age" value={retAge} setter={setRetAge} min={30} max={90} onInputChange={handleInputChange} />
                      {isMar && (
                        <Input label="Spouse Age" value={age2} setter={setAge2} min={18} max={120} onInputChange={handleInputChange} />
                      )}
                    </div>
                  ),
                },
                {
                  id: "balances",
                  label: "Current Balances",
                  defaultOpen: false,
                  content: (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Taxable Brokerage" value={sTax} setter={setSTax} step={1000} onInputChange={handleInputChange} />
                        <Input label="Pre-Tax (401k/IRA)" value={sPre} setter={setSPre} step={1000} onInputChange={handleInputChange} />
                        <Input label="Post-Tax (Roth)" value={sPost} setter={setSPost} step={1000} onInputChange={handleInputChange} />
                      </div>
                    </div>
                  ),
                },
                {
                  id: "contributions",
                  label: "Annual Contributions",
                  defaultOpen: false,
                  content: (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                    {marital === 'single' ? 'Your Contributions' : 'Your Contributions'}
                  </Badge>
                  <Input label="Taxable" value={cTax1} setter={setCTax1} step={1000} onInputChange={handleInputChange} />
                  <Input label="Pre-Tax" value={cPre1} setter={setCPre1} step={1000} onInputChange={handleInputChange} />
                  <Input label="Post-Tax" value={cPost1} setter={setCPost1} step={500} onInputChange={handleInputChange} />
                  <Input label="Employer Match" value={cMatch1} setter={setCMatch1} step={500} onInputChange={handleInputChange} />
                </div>
                {isMar && (
                  <div className="space-y-4">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                      Spouse's Contributions
                    </Badge>
                    <Input label="Taxable" value={cTax2} setter={setCTax2} step={1000} onInputChange={handleInputChange} />
                    <Input label="Pre-Tax" value={cPre2} setter={setCPre2} step={1000} onInputChange={handleInputChange} />
                    <Input label="Post-Tax" value={cPost2} setter={setCPost2} step={500} onInputChange={handleInputChange} />
                    <Input label="Employer Match" value={cMatch2} setter={setCMatch2} step={500} onInputChange={handleInputChange} />
                  </div>
                )}
                      </div>
                    ),
                  },
                  {
                    id: "assumptions",
                    label: "Assumptions",
                    defaultOpen: false,
                    content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {retMode === 'fixed' && (
                    <SliderInput
                      label="Return Rate"
                      value={retRate}
                      onChange={setRetRate}
                      min={0}
                      max={20}
                      step={0.1}
                      unit="%"
                      description={retMode === 'fixed' ? "Historical median ≈ 9.8% (context only)" : "Used for 'Fixed' mode only"}
                      onInputChange={handleInputChange}
                    />
                  )}
                  <SliderInput
                    label="Inflation"
                    value={infRate}
                    onChange={setInfRate}
                    min={0}
                    max={10}
                    step={0.1}
                    unit="%"
                    description="US avg ~2.6%"
                    onInputChange={handleInputChange}
                  />
                  <SliderInput
                    label="State Tax"
                    value={stateRate}
                    onChange={setStateRate}
                    min={0}
                    max={15}
                    step={0.1}
                    unit="%"
                    description="Income tax rate"
                    onInputChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Return Model</Label>
                    <select
                      value={retMode}
                      onChange={(e) => {
                        const newMode = e.target.value as "fixed" | "randomWalk";
                        setRetMode(newMode);
                        if (newMode === "randomWalk") {
                          setWalkSeries("trulyRandom");
                        }
                        setInputsModified(true);
                      }}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="fixed">Fixed (single rate)</option>
                      <option value="randomWalk">Random Walk (S&P bootstrap)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SliderInput
                    label="Withdrawal Rate"
                    value={wdRate}
                    onChange={setWdRate}
                    min={1}
                    max={8}
                    step={0.1}
                    unit="%"
                    description="Annual spending rate"
                    onInputChange={handleInputChange}
                  />
                  <div className="space-y-4">
                    <Input
                      label="Increase Rate (%)"
                      value={incRate}
                      setter={setIncRate}
                      step={0.1}
                      isRate
                      disabled={!incContrib}
                      onInputChange={handleInputChange}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="inc-contrib"
                        checked={incContrib}
                        onChange={(e) => { setIncContrib(e.target.checked); setInputsModified(true); }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                      />
                      <Label htmlFor="inc-contrib" className="cursor-pointer">
                        Increase contributions annually {incContrib && <span className="print-only">✓</span>}
                      </Label>
                    </div>
                  </div>
                </div>
                      </div>
                    ),
                  },
                  {
                    id: "advanced-settings",
                    label: "Advanced Settings",
                    defaultOpen: false,
                    content: (
                      <div className="space-y-6">
                        {/* Social Security Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="include-ss"
                              checked={includeSS}
                              onChange={(e) => { setIncludeSS(e.target.checked); setInputsModified(true); }}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                            />
                            <Label htmlFor="include-ss" className="text-base font-semibold cursor-pointer">
                              Include Social Security Benefits {includeSS && <span className="print-only">✓</span>}
                            </Label>
                          </div>

                          {includeSS && (
                            <div className="space-y-6 pl-7">
                              <div>
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 mb-2">Primary</Badge>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Input
                                    label="Avg Career Earnings ($/yr)"
                                    value={ssIncome}
                                    setter={setSSIncome}
                                    step={1000}
                                    tip="Your average indexed earnings for SS calculation (AIME)"
                                    onInputChange={handleInputChange}
                                  />
                                  <Input
                                    label="Claim Age"
                                    value={ssClaimAge}
                                    setter={setSSClaimAge}
                                    step={1}
                                    min={62}
                                    max={70}
                                    tip="Age when you start claiming SS (62-70). FRA is typically 67."
                                    onInputChange={handleInputChange}
                                  />
                                </div>
                              </div>
                              {isMar && (
                                <div>
                                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 mb-2">Spouse</Badge>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                      label="Avg Career Earnings ($/yr)"
                                      value={ssIncome2}
                                      setter={setSSIncome2}
                                      step={1000}
                                      tip="Spouse's average indexed earnings for SS calculation (AIME)"
                                      onInputChange={handleInputChange}
                                    />
                                    <Input
                                      label="Claim Age"
                                      value={ssClaimAge2}
                                      setter={setSSClaimAge2}
                                      step={1}
                                      min={62}
                                      max={70}
                                      tip="Age when spouse starts claiming SS (62-70). FRA is typically 67."
                                      onInputChange={handleInputChange}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Medicare Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="include-medicare"
                              checked={includeMedicare}
                              onChange={(e) => { setIncludeMedicare(e.target.checked); setInputsModified(true); }}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                            />
                            <Label htmlFor="include-medicare" className="text-base font-semibold cursor-pointer">
                              Include Medicare Premiums (Age 65+) {includeMedicare && <span className="print-only">✓</span>}
                            </Label>
                          </div>

                          {includeMedicare && (
                            <div className="space-y-4 pl-7">
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-muted-foreground mb-2">
                                  Medicare premiums start at age 65. IRMAA (Income-Related Monthly Adjustment Amount) surcharges apply when income exceeds thresholds.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Base Monthly Premium ($)"
                                  value={medicarePremium}
                                  setter={setMedicarePremium}
                                  step={10}
                                  tip="Typical combined cost for Part B, Part D, and Medigap supplement (~$400/month)"
                                  onInputChange={handleInputChange}
                                />
                                <Input
                                  label="Medical Inflation Rate (%)"
                                  value={medicalInflation}
                                  setter={setMedicalInflation}
                                  step={0.1}
                                  isRate
                                  tip="Healthcare costs typically inflate faster than general inflation (5-6% vs 2-3%)"
                                  onInputChange={handleInputChange}
                                />
                              </div>

                              <div className="mt-4">
                                <h4 className="text-sm font-semibold mb-2">IRMAA Surcharge Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <Input
                                    label="Single Threshold ($)"
                                    value={irmaaThresholdSingle}
                                    setter={setIrmaaThresholdSingle}
                                    step={1000}
                                    tip="MAGI threshold for IRMAA surcharge (single filers, 2025: $103,000)"
                                    onInputChange={handleInputChange}
                                  />
                                  <Input
                                    label="Married Threshold ($)"
                                    value={irmaaThresholdMarried}
                                    setter={setIrmaaThresholdMarried}
                                    step={1000}
                                    tip="MAGI threshold for IRMAA surcharge (married filing jointly, 2025: $206,000)"
                                    onInputChange={handleInputChange}
                                  />
                                  <Input
                                    label="Monthly Surcharge ($)"
                                    value={irmaaSurcharge}
                                    setter={setIrmaaSurcharge}
                                    step={10}
                                    tip="Additional monthly premium when income exceeds threshold (~$350/month for first bracket)"
                                    onInputChange={handleInputChange}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Long-Term Care Section */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="include-ltc"
                              checked={includeLTC}
                              onChange={(e) => { setIncludeLTC(e.target.checked); setInputsModified(true); }}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                            />
                            <Label htmlFor="include-ltc" className="text-base font-semibold cursor-pointer">
                              Include Long-Term Care Planning {includeLTC && <span className="print-only">✓</span>}
                            </Label>
                          </div>

                          {includeLTC && (
                            <div className="space-y-4 pl-7">
                              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-sm text-muted-foreground mb-2">
                                  <strong>~70% of Americans need long-term care at some point.</strong> In deterministic mode, costs are averaged. In Monte Carlo mode, LTC events occur randomly based on probability.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Annual LTC Cost ($)"
                                  value={ltcAnnualCost}
                                  setter={setLtcAnnualCost}
                                  step={5000}
                                  tip="Typical cost: $80,000/year for nursing home or home health aide"
                                  onInputChange={handleInputChange}
                                />
                                <Input
                                  label="Probability of Need (%)"
                                  value={ltcProbability}
                                  setter={setLtcProbability}
                                  step={5}
                                  min={0}
                                  max={100}
                                  isRate
                                  tip="Percentage chance you'll need long-term care (national average: 70%)"
                                  onInputChange={handleInputChange}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Expected Duration (years)"
                                  value={ltcDuration}
                                  setter={setLtcDuration}
                                  step={0.5}
                                  isRate
                                  tip="Average duration of long-term care need (typical: 3-4 years)"
                                  onInputChange={handleInputChange}
                                />
                                <Input
                                  label="Typical Onset Age"
                                  value={ltcOnsetAge}
                                  setter={setLtcOnsetAge}
                                  step={1}
                                  min={65}
                                  max={95}
                                  tip="Average age when LTC begins (median: 82)"
                                  onInputChange={handleInputChange}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Age Range Start"
                                  value={ltcAgeRangeStart}
                                  setter={setLtcAgeRangeStart}
                                  step={1}
                                  min={65}
                                  max={90}
                                  tip="Earliest age LTC might begin (for Monte Carlo distribution)"
                                  onInputChange={handleInputChange}
                                />
                                <Input
                                  label="Age Range End"
                                  value={ltcAgeRangeEnd}
                                  setter={setLtcAgeRangeEnd}
                                  step={1}
                                  min={75}
                                  max={95}
                                  tip="Latest age LTC might begin (for Monte Carlo distribution)"
                                  onInputChange={handleInputChange}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  },
                ]}
              />

            <Separator />

            <div className="flex flex-col items-center pt-6 pb-2 no-print">
              <Button
                onClick={calc}
                disabled={isLoadingAi}
                size="lg"
                className="w-full md:w-auto text-lg px-16 py-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
              >
                {isLoadingAi ? (
                  <span className="flex items-center gap-3">
                    <Spinner />
                    <span>
                      {calcProgress
                        ? `${calcProgress.message} (${calcProgress.percent}%)`
                        : 'Calculating...'}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <TrendingUpIcon className="w-6 h-6" />
                    Calculate Retirement Plan
                  </span>
                )}
              </Button>
              {err && (
                <div className="mt-6 p-5 bg-red-50 border-2 border-red-300 rounded-xl shadow-md max-w-2xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-800 font-medium text-base">{err}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
        </TabPanel>

        {/* Generational Wealth Modeling - Legacy Tab */}
        <TabPanel id="legacy" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Generational Wealth Modeling</CardTitle>
              <CardDescription>Model multi-generational wealth transfer and dynasty trusts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                  {/* Preset Buttons */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold mb-3 text-foreground">Quick Presets:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        onClick={() => applyGenerationalPreset('conservative')}
                        variant="outline"
                        className="w-full text-left justify-start hover:bg-blue-100 dark:hover:bg-blue-900"
                      >
                        <div>
                          <div className="font-semibold">Conservative</div>
                          <div className="text-xs text-muted-foreground">$75k/person, 1.5 children</div>
                        </div>
                      </Button>
                      <Button
                        onClick={() => applyGenerationalPreset('moderate')}
                        variant="outline"
                        className="w-full text-left justify-start hover:bg-purple-100 dark:hover:bg-purple-900"
                      >
                        <div>
                          <div className="font-semibold">Moderate</div>
                          <div className="text-xs text-muted-foreground">$100k/person, 2.1 children</div>
                        </div>
                      </Button>
                      <Button
                        onClick={() => applyGenerationalPreset('aggressive')}
                        variant="outline"
                        className="w-full text-left justify-start hover:bg-indigo-100 dark:hover:bg-indigo-900"
                      >
                        <div>
                          <div className="font-semibold">Aggressive</div>
                          <div className="text-xs text-muted-foreground">$150k/person, 2.5 children</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Core Configuration */}
                  <div className="space-y-4 mb-6">
                    <h5 className="font-semibold text-foreground">Core Settings</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Annual Per Beneficiary (real $)"
                        value={hypPerBen}
                        setter={setHypPerBen}
                        step={10000}
                        tip="How much each person receives per year, adjusted for inflation"
                        onInputChange={handleInputChange}
                      />
                      <Input
                        label="Initial Beneficiaries"
                        value={hypStartBens}
                        setter={setHypStartBens}
                        min={1}
                        step={1}
                        tip="Number of beneficiaries at the start (e.g., your children)"
                        onInputChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Children Per Person (Lifetime)"
                        value={totalFertilityRate}
                        setter={setTotalFertilityRate}
                        min={0}
                        max={5}
                        step={0.1}
                        isRate
                        tip="Average children per person. 2.1 = replacement rate, 2.5 = growing dynasty, 1.5 = slow decline"
                        onInputChange={handleInputChange}
                      />
                      <Input
                        label="Generation Length (years)"
                        value={generationLength}
                        setter={setGenerationLength}
                        min={20}
                        max={40}
                        onInputChange={handleInputChange}
                        step={1}
                        tip="Average age when people have children. Typical: 28-32. Shorter = faster generational turnover"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Advanced Demographics */}
                  <Accordion type="single" collapsible className="mb-4">
                    <AccordionItem value="advanced">
                      <AccordionTrigger className="text-sm font-semibold">
                        Advanced Demographics
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Fertility Window Start"
                              value={fertilityWindowStart}
                              setter={setFertilityWindowStart}
                              min={18}
                              max={35}
                              step={1}
                              tip="Earliest age when people have children (typical: 25)"
                            />
                            <Input
                              label="Fertility Window End"
                              value={fertilityWindowEnd}
                              setter={setFertilityWindowEnd}
                              min={25}
                              max={45}
                              step={1}
                              tip="Latest age when people have children (typical: 35)"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Maximum Lifespan"
                              value={hypDeathAge}
                              setter={setHypDeathAge}
                              min={70}
                              max={100}
                              step={1}
                              tip="Maximum age for all beneficiaries"
                            />
                            <Input
                              label="Minimum Distribution Age"
                              value={hypMinDistAge}
                              setter={setHypMinDistAge}
                              min={0}
                              max={30}
                              step={1}
                              tip="Minimum age before beneficiaries can receive distributions (e.g., 21 for legal adulthood)"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-foreground">
                        Initial Beneficiary Ages at Death
                        <Tip text={`Enter ages of living beneficiaries at your time of death, separated by commas (e.g., '35, 40, 45'). Only beneficiaries within the fertility window (${fertilityWindowStart}-${fertilityWindowEnd}) will produce children.`} />
                      </Label>
                      <UIInput
                        type="text"
                        value={hypBenAgesStr}
                        onChange={(e) => setHypBenAgesStr(e.target.value)}
                        placeholder="e.g., 35, 40"
                        className="transition-all"
                      />
                      <p className="text-xs text-muted-foreground">
                        {hypBenAgesStr.split(',').filter(s => {
                          const n = parseInt(s.trim(), 10);
                          return !isNaN(n) && n >= 0 && n < 90;
                        }).length} beneficiaries specified
                      </p>
                    </div>
                  </div>

                  {res?.genPayout && (
                    <>
                      <Separator className="my-6" />
                      <div ref={genRef} className="mt-6">
                      {(() => {
                        // Determine if perpetual based on all three percentiles
                        const isPerpetual =
                          res.genPayout.p10?.isPerpetual === true &&
                          res.genPayout.p50?.isPerpetual === true &&
                          res.genPayout.p90?.isPerpetual === true;

                        const variant = isPerpetual ? "perpetual" : "finite";

                        const p10Value = res.genPayout.p10?.isPerpetual
                          ? "Infinity"
                          : res.genPayout.p10?.years || 0;
                        const p50Value = res.genPayout.p50?.isPerpetual
                          ? "Infinity"
                          : res.genPayout.p50?.years || 0;
                        const p90Value = res.genPayout.p90?.isPerpetual
                          ? "Infinity"
                          : res.genPayout.p90?.years || 0;

                        const explanationText = isPerpetual
                          ? `Each beneficiary receives ${fmt(res.genPayout.perBenReal)}/year (inflation-adjusted) from age ${hypMinDistAge} to ${hypDeathAge}—equivalent to a ${fmt(res.genPayout.perBenReal * 25)} trust fund. This provides lifelong financial security and freedom to pursue any career path.`
                          : `Each beneficiary receives ${fmt(res.genPayout.perBenReal)}/year (inflation-adjusted) for ${res.genPayout.years} years, providing substantial financial support during their lifetime.`;

                        // Prepare data for Apple Wallet pass
                        const legacyResult: LegacyResult = {
                          legacyAmount: res.genPayout.perBenReal,
                          legacyAmountDisplay: fmt(res.genPayout.perBenReal),
                          legacyType: isPerpetual ? "Perpetual Legacy" : "Finite Legacy",
                          withdrawalRate: 0.035, // Default withdrawal rate
                          successProbability: res.genPayout.probPerpetual || 0,
                          explanationText,
                        };

                        return (
                          <>
                            <div className="flex justify-center">
                              <GenerationalResultCard
                                variant={variant}
                                amountPerBeneficiary={res.genPayout.perBenReal}
                                yearsOfSupport={isPerpetual ? "Infinity" : res.genPayout.years}
                                percentile10={p10Value}
                                percentile50={p50Value}
                                percentile90={p90Value}
                                probability={res.genPayout.probPerpetual || 0}
                                explanationText={explanationText}
                              />
                            </div>
                            <div className="mt-6 flex justify-center gap-3">
                              <RecalculateButton onClick={calc} isCalculating={isLoadingAi} />
                              <AddToWalletButton result={legacyResult} />
                            </div>
                          </>
                        );
                      })()}
                      </div>
                    </>
                  )}
            </CardContent>
          </Card>
        </AnimatedSection>
        </TabPanel>

        {/* Budget Tab */}
        <TabPanel id="budget" activeTab={activeMainTab}>
        <AnimatedSection animation="fade-in" delay={100}>
          {/* Retirement Timeline - First element */}
          {res && (
            <div className="mb-6">
              <TimelineView
                result={res}
                currentAge={Math.max(age1, isMar ? age2 : age1)}
                retirementAge={retAge}
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

        {/* Math Tab */}
        <TabPanel id="math" activeTab={activeMainTab}>
          <Card className="math-print-section print-section print-page-break-before">
            <CardHeader>
              <CardTitle>Math</CardTitle>
              <CardDescription>Understanding the calculations behind your retirement projections</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <div className="space-y-6 text-sm leading-relaxed pt-4 max-w-full break-words">
            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Overview</h3>
              <p className="text-gray-700">
                This calculator uses a comprehensive, tax-aware simulation to project your retirement finances.
                It models two distinct phases: the <strong>accumulation phase</strong> (from now until retirement)
                and the <strong>drawdown phase</strong> (from retirement until age {LIFE_EXP}). All calculations
                account for compound growth, inflation, taxes, and required minimum distributions.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Accumulation Phase (Pre-Retirement)</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Growth Calculation</h4>
                  <p className="text-gray-700 mb-2">
                    Each year, your account balances grow according to the selected return model:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li><strong>Fixed Return:</strong> All accounts grow by a constant rate (e.g., 9.8%) each year: Balance<sub>year+1</sub> = Balance<sub>year</sub> × (1 + r)</li>
                    <li><strong>Random Walk:</strong> Returns are randomly sampled from 97 years of historical S&amp;P 500 data (1928-2024), using a seeded pseudo-random number generator for reproducibility. Each year gets a different historical return, bootstrapped with replacement.</li>
                    <li><strong>Truly Random (Monte Carlo):</strong> Runs 1,000 independent simulations, each with different sequences of returns randomly sampled from 97 years of S&amp;P 500 historical data (1928-2024, including Great Depression, stagflation, dot-com crash, 2008 crisis). Reports median outcomes and calculates probability of portfolio depletion based on actual simulation results—captures real sequence risk without idealized assumptions.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Mid-Year Contributions</h4>
                  <p className="text-gray-700">
                    Annual contributions are assumed to occur mid-year on average. To account for partial-year growth,
                    contributions are multiplied by (1 + (g - 1) × 0.5), where g is the year's growth factor. This
                    gives contributions roughly half a year of growth, which is more realistic than assuming all
                    contributions happen at year-end or year-start.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Contribution Increases</h4>
                  <p className="text-gray-700">
                    If enabled, annual contributions increase by the specified percentage each year to model salary
                    growth and increasing savings capacity: Contribution<sub>year+1</sub> = Contribution<sub>year</sub> × (1 + increase_rate).
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Account Types</h4>
                  <p className="text-gray-700 mb-2">The calculator tracks three separate account types:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li><strong>Taxable (Brokerage):</strong> Subject to long-term capital gains tax on withdrawals. We track your cost basis (total contributions) and only the gains are taxed.</li>
                    <li><strong>Pre-Tax (401k/Traditional IRA):</strong> Contributions grow tax-deferred. All withdrawals are taxed as ordinary income. Subject to Required Minimum Distributions (RMDs) starting at age {RMD_START_AGE}.</li>
                    <li><strong>Post-Tax (Roth):</strong> Contributions grow tax-free. Qualified withdrawals in retirement are completely tax-free (no taxes, no RMDs).</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Inflation Adjustments</h3>
              <p className="text-gray-700 mb-2">
                To show purchasing power, we convert nominal (future) dollars to real (today's) dollars using:
              </p>
              <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2 text-gray-800">
                Real Value = Nominal Value / (1 + inflation_rate)<sup>years</sup>
              </p>
              <p className="text-gray-700">
                For example, if you have $1,000,000 in 30 years and inflation averages 2.6% annually, the real value
                is $1,000,000 / (1.026)<sup>30</sup> ≈ $462,000 in today's purchasing power.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Drawdown Phase (Post-Retirement)</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Withdrawal Strategy</h4>
                  <p className="text-gray-700 mb-2">
                    The first year's withdrawal is calculated as a percentage of your total retirement balance
                    (e.g., 3.5% for a conservative approach, 4% for the classic "4% rule"). In subsequent years,
                    the withdrawal amount increases with inflation to maintain constant purchasing power:
                  </p>
                  <p className="font-mono text-sm bg-gray-100 p-3 rounded text-gray-800">
                    Withdrawal<sub>year+1</sub> = Withdrawal<sub>year</sub> × (1 + inflation_rate)
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Proportional Withdrawal</h4>
                  <p className="text-gray-700">
                    Withdrawals are taken proportionally from all three account types based on their current
                    balances. If one account runs out, the shortfall is automatically drawn from the remaining
                    accounts. This creates a natural tax diversification strategy.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Tax Calculation</h4>
                  <p className="text-gray-700 mb-2">
                    Each year's withdrawal is subject to multiple layers of taxation:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>
                      <strong>Ordinary Income Tax:</strong> Pre-tax withdrawals are taxed using the federal
                      progressive tax brackets ({marital === "married" ? "married" : "single"} filing status)
                      after applying the standard deduction. Brackets range from 10% to 37%.
                    </li>
                    <li>
                      <strong>Long-Term Capital Gains Tax:</strong> Gains from taxable account withdrawals are
                      taxed at preferential LTCG rates (0%, 15%, or 20%) based on your total income. Only the
                      gains portion is taxed—your original contributions (basis) come out tax-free.
                    </li>
                    <li>
                      <strong>Net Investment Income Tax (NIIT):</strong> An additional 3.8% tax on investment
                      income (capital gains) if your modified AGI exceeds ${(NIIT_THRESHOLD[marital] / 1000).toFixed(0)}K.
                    </li>
                    <li>
                      <strong>State Income Tax:</strong> A flat percentage applied to all taxable income if you
                      specify a state tax rate (varies by state, 0% to ~13%).
                    </li>
                    <li>
                      <strong>Roth Withdrawals:</strong> Completely tax-free! This is the "tax-free income"
                      advantage of Roth accounts.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Required Minimum Distributions (RMDs)</h4>
                  <p className="text-gray-700 mb-2">
                    Starting at age {RMD_START_AGE}, the IRS requires you to withdraw a minimum amount from
                    pre-tax accounts each year. The RMD is calculated as:
                  </p>
                  <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2 text-gray-800">
                    RMD = Pre-Tax Balance / Divisor
                  </p>
                  <p className="text-gray-700 mb-2">
                    The divisor comes from the IRS Uniform Lifetime Table (e.g., 26.5 at age 73, decreasing each
                    year). If your RMD exceeds your spending needs, the excess is withdrawn, taxed, and
                    reinvested in your taxable account (with the after-tax amount becoming new basis).
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Social Security Benefits</h4>
                  <p className="text-gray-700 mb-2">
                    If enabled, Social Security benefits are calculated using the 2025 bend point formula:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>90% of Average Indexed Monthly Earnings (AIME) up to ${SS_BEND_POINTS.first.toLocaleString()}/month</li>
                    <li>32% of AIME between ${SS_BEND_POINTS.first.toLocaleString()} and ${SS_BEND_POINTS.second.toLocaleString()}/month</li>
                    <li>15% of AIME above ${SS_BEND_POINTS.second.toLocaleString()}/month</li>
                  </ul>
                  <p className="text-gray-700 mt-2">
                    This gives your Primary Insurance Amount (PIA). If you claim before Full Retirement Age (FRA),
                    benefits are reduced by 5/9 of 1% per month for the first 36 months, then 5/12 of 1% for each
                    additional month. If you delay past FRA, benefits increase by 2/3 of 1% per month (8% per year).
                    SS benefits reduce the amount you need to withdraw from your portfolio.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Continuous Growth</h4>
                  <p className="text-gray-700">
                    Your remaining account balances continue to grow each year according to the same return model
                    used in the accumulation phase. Growth is applied <em>before</em> withdrawals each year, so
                    your money keeps working for you throughout retirement.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Healthcare Costs</h4>
                  <p className="text-gray-700 mb-2">
                    If enabled, the calculator models age-based healthcare expenses in addition to your regular
                    retirement withdrawals:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>
                      <strong>Medicare Premiums:</strong> Starting at age 65, monthly Medicare Part B and Part D
                      premiums (default $400/month) are added to annual expenses. These premiums inflate at the
                      medical inflation rate (typically 5.5%, higher than general inflation) to reflect rising
                      healthcare costs.
                    </li>
                    <li>
                      <strong>IRMAA Surcharges:</strong> Income-Related Monthly Adjustment Amounts apply when your
                      total income (Social Security + RMDs + other withdrawals) exceeds thresholds (default ${irmaaThresholdSingle.toLocaleString()}
                      {marital === "married" && `/${irmaaThresholdMarried.toLocaleString()}`}). An additional surcharge
                      (default $350/month) is added to Medicare premiums, also inflating at the medical rate.
                    </li>
                    <li>
                      <strong>Long-Term Care:</strong> Models the risk of needing expensive care (nursing home,
                      assisted living, home health). Based on probability (default {ltcProbability}%), duration
                      (default {ltcDuration} years), and annual cost (default ${(ltcAnnualCost / 1000).toFixed(0)}K/year).
                      In Monte Carlo mode, each simulation randomly determines if/when LTC is needed. Costs inflate
                      at the medical rate.
                    </li>
                  </ul>
                  <p className="text-gray-700 mt-2">
                    These healthcare costs are withdrawn from your portfolio just like regular expenses and can
                    significantly impact longevity, especially if multiple expensive healthcare events occur or
                    if IRMAA surcharges apply for many years.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Estate Planning</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">End-of-Life Wealth</h4>
                  <p className="text-gray-700">
                    If your accounts last until age {LIFE_EXP}, any remaining balance is your end-of-life (EOL)
                    wealth, which becomes your estate. This represents money you can pass to heirs or charity.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Estate Tax</h4>
                  <p className="text-gray-700">
                    Under current law (2025), estates exceeding ${(ESTATE_TAX_EXEMPTION / 1_000_000).toFixed(2)}
                    million are subject to a 40% federal estate tax on the amount above the exemption. Your heirs
                    receive the net estate after this tax. Note: Estate tax laws may change, and this is a simplified
                    calculation that doesn't account for spousal transfers, trusts, or state estate taxes.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2 text-blue-800">Generational Wealth Model</h4>
                  <p className="text-gray-700 mb-2">
                    If enabled, the generational model simulates how long your estate could support future
                    beneficiaries (children, grandchildren, etc.) with annual payouts in constant 2025 dollars:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>The net estate (after estate tax) is deflated to 2025 purchasing power</li>
                    <li>Each year, the fund grows at a real rate (nominal return minus inflation)</li>
                    <li>Only beneficiaries at or above the minimum distribution age receive payouts in constant 2025 dollars</li>
                    <li>Beneficiaries age each year; those reaching max lifespan exit the model</li>
                    <li>
                      <strong>Fertility Window Model:</strong> Beneficiaries within the fertility window (default ages
                      25-35) gradually produce children over those years. The total fertility rate (default 2.1 children
                      per person) is distributed evenly across the fertile years. For example, with a 10-year window and
                      2.1 total fertility, each person produces 0.21 children per year while fertile. This creates realistic,
                      gradual population growth rather than sudden generational "waves."
                    </li>
                    <li>
                      <strong>Population Growth:</strong> At replacement level (2.1 children per person), the population
                      stays constant. Above 2.1, it grows exponentially; below 2.1, it declines. The calculator shows
                      the perpetual threshold: the maximum annual distribution rate equals real return minus population
                      growth rate (e.g., 7.2% real return - 2.7% population growth = 4.5% sustainable).
                    </li>
                    <li>Simulation continues until funds are exhausted or 10,000 years (effectively perpetual)</li>
                  </ul>
                  <p className="text-gray-700 mt-2">
                    In Monte Carlo mode, the model runs simulations at the P10, P50, and P90 estate values and reports
                    perpetual success probability. This models a "dynasty trust" or "perpetual legacy" scenario and helps
                    you understand whether your wealth could support generations indefinitely. Quick presets
                    (Conservative/Moderate/Aggressive) provide starting points for different legacy goals.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Limitations &amp; Assumptions</h3>

              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>
                  <strong>Tax Law Stability:</strong> Assumes current (2025) tax brackets, standard deductions,
                  RMD rules, and estate tax exemptions remain constant. Tax laws frequently change, especially
                  estate tax provisions which are set to sunset in 2026.
                </li>
                <li>
                  <strong>Sequence-of-Returns Risk:</strong> In Truly Random (Monte Carlo) mode with 1,000 simulations,
                  sequence risk is fully captured—bad early returns can deplete portfolios even if average returns are
                  good. Fixed and Random Walk modes don't model this risk as thoroughly. The P10/P50/P90 percentile
                  bands show the range of outcomes from sequence variation.
                </li>
                <li>
                  <strong>Simplified Withdrawal Strategy:</strong> Uses proportional withdrawals from all accounts.
                  More sophisticated strategies (like draining taxable first, then pre-tax, then Roth) may be more
                  tax-efficient but are not modeled here. The proportional approach provides automatic rebalancing.
                </li>
                <li>
                  <strong>Healthcare Cost Estimates:</strong> Medicare premiums, IRMAA surcharges, and long-term care
                  costs use national averages. Actual costs vary significantly by location, health status, and
                  insurance coverage. The model assumes continuous Medicare coverage and doesn't account for gaps
                  before age 65 or supplemental insurance (Medigap) costs.
                </li>
                <li>
                  <strong>Fixed Withdrawal Rate:</strong> Uses inflation-adjusted constant dollar withdrawals plus
                  healthcare costs. Real retirees often adjust spending based on portfolio performance, market
                  conditions, and changing life circumstances (travel, healthcare events, gifts to family).
                </li>
                <li>
                  <strong>Single Life Expectancy:</strong> Projects to age {LIFE_EXP} for the older spouse.
                  Some households may need to plan for longer lifespans. The generational wealth model allows
                  customization of maximum lifespan (up to age 100).
                </li>
                <li>
                  <strong>No Pension Income:</strong> Doesn't model traditional pensions, annuities, or rental income.
                  These could be approximated by adjusting your withdrawal needs downward or using the Social Security
                  field for other guaranteed income sources.
                </li>
                <li>
                  <strong>Generational Model Simplifications:</strong> The dynasty trust model assumes constant real
                  returns, uniform fertility patterns, and no external income for beneficiaries. It doesn't model
                  legal trust structures, trustee fees, or different payout strategies for different generations.
                </li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3 text-blue-900">Data Sources</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>S&amp;P 500 Returns:</strong> Historical total return data (1928-2024, 97 years) used for random walk and Monte Carlo simulations</li>
                <li><strong>Tax Brackets:</strong> 2025 federal ordinary income tax brackets (IRS)</li>
                <li><strong>LTCG Brackets:</strong> 2025 long-term capital gains tax rates (IRS)</li>
                <li><strong>RMD Table:</strong> IRS Uniform Lifetime Table (Publication 590-B)</li>
                <li><strong>Social Security:</strong> 2025 bend points and claiming adjustment factors (SSA)</li>
                <li><strong>Estate Tax:</strong> 2025 federal exemption ($13.99M) and rate (IRS)</li>
                <li><strong>Medicare &amp; IRMAA:</strong> 2025 Part B/D premiums and income thresholds (CMS)</li>
                <li><strong>Long-Term Care:</strong> National average costs based on Genworth 2024 Cost of Care Survey</li>
                <li><strong>Medical Inflation:</strong> Historical healthcare cost growth trends (Kaiser Family Foundation, CMS)</li>
                <li><strong>Net Worth Data:</strong> Federal Reserve 2022 Survey of Consumer Finances (released Oct 2023)</li>
                <li><strong>Fertility Rates:</strong> U.S. replacement-level fertility (2.1) and demographic modeling standards (CDC, Census Bureau)</li>
              </ul>
            </section>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Disclaimer:</strong> This calculator is for educational and planning purposes only. It does
                not constitute financial, tax, or legal advice. Consult with qualified professionals before making
                significant financial decisions. Past performance (historical returns) does not guarantee future results.
              </p>
            </div>
                </div>
            </CardContent>
          </Card>
        </TabPanel>
      </div>
      </div>
    </>
  );
}

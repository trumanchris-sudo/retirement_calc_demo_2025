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
import UserInputsPrintSummary from "@/components/UserInputsPrintSummary";
import { TopBanner } from "@/components/layout/TopBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SliderInput } from "@/components/form/SliderInput";
import { BrandLoader } from "@/components/BrandLoader";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";

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

type FilingStatus = "single" | "married";

const calcOrdinaryTax = (income: number, status: FilingStatus) => {
  if (income <= 0) return 0;
  const { rates, deduction } = TAX_BRACKETS[status];
  let adj = Math.max(0, income - deduction);
  let tax = 0;
  let prev = 0;
  for (const b of rates) {
    const amount = Math.min(adj, b.limit - prev);
    tax += amount * b.rate;
    adj -= amount;
    prev = b.limit;
    if (adj <= 0) break;
  }
  return tax;
};

const calcLTCGTax = (
  capGain: number,
  status: FilingStatus,
  ordinaryIncome: number
) => {
  if (capGain <= 0) return 0;
  const brackets = LTCG_BRACKETS[status];
  let remainingGain = capGain;
  let tax = 0;
  let used = 0;

  for (const b of brackets) {
    const bracketRoom = Math.max(0, b.limit - used - ordinaryIncome);
    const taxedHere = Math.min(remainingGain, bracketRoom);
    if (taxedHere > 0) {
      tax += taxedHere * b.rate;
      remainingGain -= taxedHere;
    }
    used = b.limit - ordinaryIncome;
    if (remainingGain <= 0) break;
  }

  if (remainingGain > 0) {
    const topRate = brackets[brackets.length - 1].rate;
    tax += remainingGain * topRate;
  }
  return tax;
};

const calcNIIT = (
  investmentIncome: number,
  status: FilingStatus,
  modifiedAGI: number
) => {
  if (investmentIncome <= 0) return 0;
  const threshold = NIIT_THRESHOLD[status];
  const excess = Math.max(0, modifiedAGI - threshold);
  if (excess <= 0) return 0;
  const base = Math.min(investmentIncome, excess);
  return base * 0.038;
};

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

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
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

const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
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

  return (
    <div className="p-6 rounded-xl bg-card border shadow-sm">
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{insight}</p>
    </div>
  );
};


const Tip: React.FC<{ text: string }> = ({ text }) => (
  <div className="inline-block ml-1 group relative">
    <InfoIcon className="w-4 h-4 text-blue-500 cursor-help inline" />
    <div className="invisible group-hover:visible absolute z-10 w-64 p-2 text-xs bg-gray-900 text-white rounded shadow-lg left-1/2 -translate-x-1/2 bottom-full mb-2">
      {text}
    </div>
  </div>
);

type InputProps = {
  label: string;
  value: number;
  setter: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  tip?: string;
  isRate?: boolean;
  disabled?: boolean;
};

const Input: React.FC<InputProps> = ({
  label,
  value,
  setter,
  step = 1,
  min = 0,
  max,
  tip,
  isRate = false,
  disabled = false,
}) => {
  const [local, setLocal] = useState<string>(String(value ?? 0));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      // When not focused, show formatted number with commas
      if (isRate) {
        setLocal(String(value ?? 0));
      } else {
        setLocal((value ?? 0).toLocaleString('en-US'));
      }
    }
  }, [value, isFocused, isRate]);

  const onFocus = () => {
    setIsFocused(true);
    // Remove commas for editing
    setLocal(String(value ?? 0));
  };

  const onBlur = () => {
    setIsFocused(false);
    // Remove commas and parse
    const cleanValue = local.replace(/,/g, '');
    const num = toNumber(cleanValue, value ?? 0);
    let val = isRate ? parseFloat(String(num)) : Math.round(num);
    val = clampNum(val, min, max);
    setter(val);
    // Format with commas for display
    if (isRate) {
      setLocal(String(val));
    } else {
      setLocal(val.toLocaleString('en-US'));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {label}
        {tip && <Tip text={tip} />}
      </Label>
      <UIInput
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        inputMode={isRate ? "decimal" : "numeric"}
        className="transition-all"
      />
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
        <Badge variant="secondary" className={`${c.bg} ${c.badge} border-0`}>
          {title}
        </Badge>
        <span className="flip-card-icon text-xs opacity-50 print-hide flip-hint">Click to flip ↻</span>
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className={`text-3xl font-bold ${c.text} mb-1`}>{value}</div>
        {Icon && (
          <div className={`p-2 rounded-lg ${c.bg}`}>
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
const GenerationalWealthVisual: React.FC<{ genPayout: any }> = ({ genPayout }) => {
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

type Cohort = { size: number; age: number };

/**
 * Simulate constant real-dollar payout per beneficiary with births/deaths.
 * - Works in 2025 dollars (real terms).
 * - fund starts as EOL deflated to 2025 dollars.
 * - Real growth at r = realReturn(nominal, inflation).
 * - Each year, pay (perBenReal * eligible), where eligible = beneficiaries >= minDistAge.
 * - Births every birthInterval years: each living ben creates birthMultiple new age-0 bens.
 * - Death at deathAge.
 */
function simulateRealPerBeneficiaryPayout(
  eolNominal: number,
  yearsFrom2025: number,
  nominalRet: number,
  inflPct: number,
  perBenReal: number,
  startBens: number,
  birthMultiple: number,
  birthInterval = 30,
  deathAge = 90,
  minDistAge = 21,
  capYears = 10000,
  initialBenAges: number[] = [0]
) {
  let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
  const r = realReturn(nominalRet, inflPct);

  // Initialize cohorts with specified ages
  let cohorts: Cohort[] = initialBenAges.length > 0
    ? initialBenAges.map(age => ({ size: 1, age }))
    : startBens > 0
    ? [{ size: startBens, age: 0 }]
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

    cohorts.forEach((c) => (c.age += 1));

    if (years % birthInterval === 0) {
      // Only fertile beneficiaries (ages 20-40) can have children
      const fertile = cohorts.filter(c => c.age >= 20 && c.age <= 40);
      const fertileCount = fertile.reduce((acc, c) => acc + c.size, 0);
      const births = fertileCount * birthMultiple;
      if (births > 0) cohorts.push({ size: births, age: 0 });
    }
  }

  const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
  return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving };
}

/** ===============================
 * Batch Simulation for Truly Random Mode
 * ================================ */

/** All inputs needed to run a single simulation */
export type Inputs = {
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  infRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  retMode: ReturnMode;
  walkSeries: WalkSeries;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  historicalYear?: number; // Start year for historical sequential playback
};

/** Result from a single simulation run */
export type SimResult = {
  balancesReal: number[];      // real balance per year
  eolReal: number;            // end-of-life wealth (real)
  y1AfterTaxReal: number;     // year-1 after-tax withdrawal (real)
  ruined: boolean;            // true if ran out of money before age 95
};

/**
 * Run a single simulation with the given inputs and seed.
 * Returns only the essential data needed for batch summaries.
 */
function runSingleSimulation(params: Inputs, seed: number): SimResult {
  const {
    marital, age1, age2, retAge, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
  } = params;

  const isMar = marital === "married";
  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);

  if (retAge <= younger) {
    throw new Error("Retirement age must be greater than current age");
  }

  const yrsToRet = retAge - younger;
  const g_fixed = 1 + retRate / 100;
  const infl = infRate / 100;
  const infl_factor = 1 + infl;

  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const accGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToRet + 1,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed,
    startYear: historicalYear,
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined,
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;

  const balancesReal: number[] = [];
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    const g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);

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
    }
    if (isMar && a2! < retAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    const bal = bTax + bPre + bPost;
    balancesReal.push(bal / Math.pow(1 + infl, y));
  }

  const finNom = bTax + bPre + bPost;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const computeWithdrawalTaxes = (
    gross: number,
    status: FilingStatus,
    taxableBal: number,
    pretaxBal: number,
    rothBal: number,
    taxableBasis: number,
    statePct: number
  ) => {
    const totalBal = taxableBal + pretaxBal + rothBal;
    if (totalBal <= 0 || gross <= 0)
      return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

    const shareT = totalBal > 0 ? taxableBal / totalBal : 0;
    const shareP = totalBal > 0 ? pretaxBal / totalBal : 0;
    const shareR = totalBal > 0 ? rothBal / totalBal : 0;

    let drawT = gross * shareT;
    let drawP = gross * shareP;
    let drawR = gross * shareR;

    const fixShortfall = (want: number, have: number) => Math.min(want, have);

    const usedT = fixShortfall(drawT, taxableBal);
    let shortT = drawT - usedT;

    const usedP = fixShortfall(drawP + shortT, pretaxBal);
    let shortP = drawP + shortT - usedP;

    const usedR = fixShortfall(drawR + shortP, rothBal);

    drawT = usedT;
    drawP = usedP;
    drawR = usedR;

    const unrealizedGain = Math.max(0, taxableBal - taxableBasis);
    const gainRatio = taxableBal > 0 ? unrealizedGain / taxableBal : 0;
    const drawT_Gain = drawT * gainRatio;
    const drawT_Basis = drawT - drawT_Gain;

    const ordinaryIncome = drawP;
    const capGains = drawT_Gain;

    const fedOrd = calcOrdinaryTax(ordinaryIncome, status);
    const fedCap = calcLTCGTax(capGains, status, ordinaryIncome);
    const magi = ordinaryIncome + capGains;
    const niit = calcNIIT(capGains, status, magi);
    const stateTax = (ordinaryIncome + capGains) * (statePct / 100);

    const totalTax = fedOrd + fedCap + niit + stateTax;
    const newBasis = Math.max(0, taxableBasis - drawT_Basis);

    return {
      tax: totalTax,
      ordinary: fedOrd,
      capgain: fedCap,
      niit,
      state: stateTax,
      draw: { t: drawT, p: drawP, r: drawR },
      newBasis,
    };
  };

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

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    const g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;

    const currentAge = age1 + yrsToRet + y;
    const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
    const requiredRMD = calcRMD(retBalPre, currentAge);

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

    let netSpendingNeed = Math.max(0, currWdGross - ssAnnualBenefit);
    let actualWithdrawal = netSpendingNeed;
    let rmdExcess = 0;

    if (requiredRMD > 0) {
      if (requiredRMD > netSpendingNeed) {
        actualWithdrawal = requiredRMD;
        rmdExcess = requiredRMD - netSpendingNeed;
      }
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

    if (rmdExcess > 0) {
      const excessTax = calcOrdinaryTax(rmdExcess, marital);
      const excessAfterTax = rmdExcess - excessTax;
      retBalTax += excessAfterTax;
      currBasis += excessAfterTax;
    }

    if (retBalTax < 0) retBalTax = 0;
    if (retBalPre < 0) retBalPre = 0;
    if (retBalRoth < 0) retBalRoth = 0;

    const totalNow = retBalTax + retBalPre + retBalRoth;
    balancesReal.push(totalNow / Math.pow(1 + infl, yrsToRet + y));

    if (totalNow <= 0) {
      survYrs = y - 1;
      ruined = true;
      retBalTax = retBalPre = retBalRoth = 0;
      break;
    }
    survYrs = y;

    currWdGross *= infl_factor;
  }

  const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth);
  const yearsFrom2025 = yrsToRet + yrsToSim;
  const eolReal = eolWealth / Math.pow(1 + infl, yearsFrom2025);

  return {
    balancesReal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
  };
}

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

  const [includeSS, setIncludeSS] = useState(false);
  const [ssIncome, setSSIncome] = useState(75000); // Primary - Avg career earnings for SS calc
  const [ssClaimAge, setSSClaimAge] = useState(67); // Primary - Full retirement age
  const [ssIncome2, setSSIncome2] = useState(75000); // Spouse - Avg career earnings for SS calc
  const [ssClaimAge2, setSSClaimAge2] = useState(67); // Spouse - Full retirement age

  const [showGen, setShowGen] = useState(false);

  const [hypPerBen, setHypPerBen] = useState(100_000);
  const [hypStartBens, setHypStartBens] = useState(2);
  const [hypBirthMultiple, setHypBirthMultiple] = useState(1);
  const [hypBirthInterval, setHypBirthInterval] = useState(30);
  const [hypDeathAge, setHypDeathAge] = useState(90);
  const [hypBenAgesStr, setHypBenAgesStr] = useState("35, 40");
  const [hypMinDistAge, setHypMinDistAge] = useState(21); // Minimum age to receive distributions

  const [retMode, setRetMode] = useState<"fixed" | "randomWalk">("randomWalk");
  const [seed, setSeed] = useState(42);
  const [walkSeries, setWalkSeries] = useState<"nominal" | "real" | "trulyRandom">("trulyRandom");

  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [olderAgeForAnalysis, setOlderAgeForAnalysis] = useState<number>(0);

  // Sensitivity analysis and scenario comparison
  const [sensitivityData, setSensitivityData] = useState<any>(null);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showBearMarket, setShowBearMarket] = useState(false);
  const [historicalYear, setHistoricalYear] = useState<number | null>(null);
  const [scenarioName, setScenarioName] = useState<string>("");
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode
  const [showP10, setShowP10] = useState(false); // Show 10th percentile line
  const [showP90, setShowP90] = useState(false); // Show 90th percentile line
  const [activeChartTab, setActiveChartTab] = useState("accumulation"); // Track active chart tab
  const [loaderComplete, setLoaderComplete] = useState(false); // Always show loader on mount
  const [loaderHandoff, setLoaderHandoff] = useState(false); // Track when handoff starts
  const [cubeAppended, setCubeAppended] = useState(false); // Track when cube animation completes

  const resRef = useRef<HTMLDivElement | null>(null);
  const genRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const tabGroupRef = useRef<TabGroupRef>(null);

  // State for tracking simulation progress
  const [simProgress, setSimProgress] = useState<{ completed: number; total: number } | null>(null);

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

  // Simple cache for AI Q&A responses (24 hour TTL)
  const aiCache = useRef<Map<string, { response: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const getCacheKey = (question: string, calcResult: any): string => {
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
  const generateLocalInsight = (calcResult: any, olderAge: number): string => {
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

  const fetchAiInsight = async (calcResult: any, olderAge: number, customQuestion?: string) => {
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
    } catch (error: any) {
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
        const { type, result, completed, total, error } = e.data;

        if (type === 'progress') {
          setSimProgress({ completed, total });
        } else if (type === 'complete') {
          setSimProgress(null);
          worker.removeEventListener('message', handleMessage);
          resolve(result);
        } else if (type === 'error') {
          setSimProgress(null);
          worker.removeEventListener('message', handleMessage);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'run', params: inputs, baseSeed, N });
    });
  }, []);

  const calc = useCallback(async () => {
    setErr(null);
    setAiInsight("");
    setAiError(null);
    setIsLoadingAi(true);

    // Close all form tabs when calculation starts
    tabGroupRef.current?.closeAll();

    let newRes: any = null;
    let olderAgeForAI: number = 0;

    let currentSeed = seed;
    if (walkSeries === 'trulyRandom') {
      currentSeed = Math.floor(Math.random() * 1000000);
      setSeed(currentSeed);
    }

    try {
      if (!age1 || age1 <= 0) throw new Error("Enter valid age");
      if (isMar && (!age2 || age2 <= 0)) throw new Error("Enter valid spouse age");
      if (!retAge || retAge <= 0) throw new Error("Enter valid retirement age");

      const younger = Math.min(age1, isMar ? age2 : age1);
      const older = Math.max(age1, isMar ? age2 : age1);
      olderAgeForAI = older;

      if (retAge <= younger)
        throw new Error("Retirement age must be greater than current age");

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
            Math.max(0, hypBirthMultiple),
            Math.max(1, hypBirthInterval),
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0]
          );

          const simP50 = simulateRealPerBeneficiaryPayout(
            netEstateP50,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            Math.max(0, hypBirthMultiple),
            Math.max(1, hypBirthInterval),
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0]
          );

          const simP90 = simulateRealPerBeneficiaryPayout(
            netEstateP90,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            Math.max(0, hypBirthMultiple),
            Math.max(1, hypBirthInterval),
            Math.max(1, hypDeathAge),
            Math.max(0, hypMinDistAge),
            10000,
            benAges.length > 0 ? benAges : [0]
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
            birthMultiple: Math.max(0, hypBirthMultiple),
            birthInterval: Math.max(1, hypBirthInterval),
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

        setTimeout(() => {
          if (showGen && genPayout) {
            genRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        startYear: historicalYear || undefined,
      })();

      const drawGen = buildReturnGenerator({
        mode: retMode,
        years: yrsToSim,
        nominalPct: retRate,
        infPct: infRate,
        walkSeries,
        seed: currentSeed + 1,
        startYear: historicalYear ? historicalYear + yrsToRet : undefined,
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

      for (let y = 0; y <= yrsToRet; y++) {
        const g = retMode === "fixed" ? g_fixed : (accGen.next().value as number);

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

      const computeWithdrawalTaxes = (
        gross: number,
        status: FilingStatus,
        taxableBal: number,
        pretaxBal: number,
        rothBal: number,
        taxableBasis: number,
        statePct: number
      ) => {
        const totalBal = taxableBal + pretaxBal + rothBal;
        if (totalBal <= 0 || gross <= 0)
          return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

        const shareT = totalBal > 0 ? taxableBal / totalBal : 0;
        const shareP = totalBal > 0 ? pretaxBal / totalBal : 0;
        const shareR = totalBal > 0 ? rothBal / totalBal : 0;

        let drawT = gross * shareT;
        let drawP = gross * shareP;
        let drawR = gross * shareR;

        const fixShortfall = (want: number, have: number) => Math.min(want, have);

        const usedT = fixShortfall(drawT, taxableBal);
        let shortT = drawT - usedT;

        const usedP = fixShortfall(drawP + shortT, pretaxBal);
        let shortP = drawP + shortT - usedP;

        const usedR = fixShortfall(drawR + shortP, rothBal);

        drawT = usedT;
        drawP = usedP;
        drawR = usedR;

        const unrealizedGain = Math.max(0, taxableBal - taxableBasis);
        const gainRatio = taxableBal > 0 ? unrealizedGain / taxableBal : 0;
        const drawT_Gain = drawT * gainRatio;
        const drawT_Basis = drawT - drawT_Gain;

        const ordinaryIncome = drawP;
        const capGains = drawT_Gain;

        const fedOrd = calcOrdinaryTax(ordinaryIncome, status);
        const fedCap = calcLTCGTax(capGains, status, ordinaryIncome);
        const magi = ordinaryIncome + capGains;
        const niit = calcNIIT(capGains, status, magi);
        const stateTax = (ordinaryIncome + capGains) * (statePct / 100);

        const totalTax = fedOrd + fedCap + niit + stateTax;
        const newBasis = Math.max(0, taxableBasis - drawT_Basis);

        return {
          tax: totalTax,
          ordinary: fedOrd,
          capgain: fedCap,
          niit,
          state: stateTax,
          draw: { t: drawT, p: drawP, r: drawR },
          newBasis,
        };
      };

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
      let totalRMDs = 0; // Track cumulative RMDs
      const rmdData: { age: number; spending: number; rmd: number }[] = []; // Track RMD vs spending

      for (let y = 1; y <= yrsToSim; y++) {
        const g_retire = retMode === "fixed" ? g_fixed : (drawGen.next().value as number);

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

        // Determine actual withdrawal amount needed from portfolio
        // SS reduces the amount we need to withdraw (but can't go below RMD)
        let netSpendingNeed = Math.max(0, currWdGross - ssAnnualBenefit);
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
          survYrs = y - 1;
          retBalTax = retBalPre = retBalRoth = 0;
          break;
        }
        survYrs = y;

        currWdGross *= infl_factor;
      }

      const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth);

      // Calculate estate tax
      const estateTax = calcEstateTax(eolWealth, marital);
      const netEstate = eolWealth - estateTax;

      // Track account balances at end of life
      const eolAccounts = {
        taxable: retBalTax,
        pretax: retBalPre,
        roth: retBalRoth,
      };

      const yearsFrom2025 = yrsToRet + yrsToSim;
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
          Math.max(0, hypBirthMultiple),
          Math.max(1, hypBirthInterval),
          Math.max(1, hypDeathAge),
          Math.max(0, hypMinDistAge),
          10000,
          benAges.length > 0 ? benAges : [0]
        );
        genPayout = {
          perBenReal: hypPerBen,
          years: sim.years,
          fundLeftReal: sim.fundLeftReal,
          startBeneficiaries: Math.max(1, hypStartBens),
          lastLivingCount: sim.lastLivingCount,
          birthMultiple: Math.max(0, hypBirthMultiple),
          birthInterval: Math.max(1, hypBirthInterval),
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

      setTimeout(() => {
        if (showGen && genPayout) {
          genRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // AI insight will be generated on demand when user clicks button
        setOlderAgeForAnalysis(olderAgeForAI);
        setIsLoadingAi(false);
      }, 100);

    } catch (e: any) {
      setErr(e.message ?? String(e));
      setRes(null);
      setIsLoadingAi(false);
    }
  }, [
    age1, age2, retAge, isMar, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    showGen, total, marital,
    hypPerBen, hypStartBens, hypBirthMultiple, hypBirthInterval, hypDeathAge, hypMinDistAge,
    retMode, seed, walkSeries,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2, hypBenAgesStr,
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
  const loadScenario = useCallback((scenario: any) => {
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
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {res && (
          <>
            {/* AI SNAPSHOT - Print Only (Page 1) */}
            <div className="hidden print:block print-page-break-after print-section">
              <div className="border-4 border-gray-900 rounded-lg p-6 mb-8 snapshot-block">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-900">
                  <h1 className="text-2xl font-bold">Tax-Aware Retirement Calculator</h1>
                  <div className="flex gap-4 text-sm">
                    <span>☑ {walkSeries === 'trulyRandom' ? 'Monte Carlo (N=1000)' : 'Optimized Path'}</span>
                    <span className="text-gray-600">Page 1 - AI Snapshot</span>
                  </div>
                </div>

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">Future Balance</div>
                    <div className="text-xl font-bold">{fmt(res.finNom)}</div>
                    <div className="text-xs text-gray-600">nominal @{retAge}</div>
                  </div>
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">Today's Dollars</div>
                    <div className="text-xl font-bold">{fmt(res.finReal)}</div>
                    <div className="text-xs text-gray-600">real @{retAge}</div>
                  </div>
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">Annual Withdrawal</div>
                    <div className="text-xl font-bold">{fmt(res.wd)}</div>
                    <div className="text-xs text-gray-600">{wdRate}% → {fmt(res.wdReal)} after-tax</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">EOL Wealth</div>
                    <div className="text-xl font-bold">{fmt(res.eol)}</div>
                    <div className="text-xs text-gray-600">nominal</div>
                  </div>
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">Net to Heirs</div>
                    <div className="text-xl font-bold">{fmt(res.netEstate)}</div>
                    <div className="text-xs text-gray-600">after ${fmt(res.estateTax)} estate tax</div>
                  </div>
                  <div className="border-2 border-gray-800 p-4">
                    <div className="text-xs text-gray-600 mb-1">Failure Probability</div>
                    <div className="text-xl font-bold">
                      {res.probRuin !== undefined ? `${(res.probRuin * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {res.probRuin !== undefined ? `${Math.round(res.probRuin * 1000)}/1000 runs` : 'Single path'}
                    </div>
                  </div>
                </div>

                {/* AI Quick-Check Block */}
                <div className="border-4 border-blue-600 bg-blue-50 p-4 font-mono text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold">⚡ AI QUICK-CHECK (copy-paste this block):</div>
                    <button
                      onClick={() => {
                        const content = document.getElementById('ai-quick-check-content')?.innerText || '';
                        navigator.clipboard.writeText(content).then(() => {
                          const btn = document.getElementById('copy-btn');
                          if (btn) {
                            btn.innerText = '✓ Copied!';
                            setTimeout(() => { btn.innerText = '📋 Copy Block'; }, 2000);
                          }
                        });
                      }}
                      id="copy-btn"
                      className="no-print px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      📋 Copy Block
                    </button>
                  </div>
                  <div id="ai-quick-check-content" className="space-y-1">
                    <div>Age {age1}→{retAge}: {fmt(res.finReal)} real at {retAge} (equiv. {fmt(res.finNom)} nom) → {wdRate}% SWR Gross: {fmt(res.finReal * (wdRate / 100))} real Yr1 ({fmt(res.wd)} nom) → After-tax: {fmt(res.wdReal)} real ({((((res.finReal * (wdRate / 100)) - res.wdReal) / (res.finReal * (wdRate / 100))) * 100).toFixed(0)}% eff. tax)</div>
                    {res.rmdData && res.rmdData.length > 0 && (() => {
                      const peakRMD = res.rmdData.reduce((max: any, curr: any) => curr.rmd > max.rmd ? curr : max, res.rmdData[0]);
                      const excessRMD = Math.max(0, peakRMD.rmd - peakRMD.spending);
                      return excessRMD > 100000 ? (
                        <div>RMD peak during life @{peakRMD.age}: {fmt(peakRMD.rmd)} vs {fmt(peakRMD.spending)} need → {fmt(excessRMD)} excess taxed</div>
                      ) : null;
                    })()}
                    {res.genPayout && (
                      <div>Generational: {res.genPayout.startBeneficiaries} heirs @ {fmt(res.genPayout.perBenReal)}/yr real → {res.genPayout.years} yrs median{res.genPayout.probPerpetual ? `, ${Math.round(res.genPayout.probPerpetual * 100)}% perpetual (P90 historical)` : ''}</div>
                    )}
                    <div>
                      {retMode === 'fixed'
                        ? `Return assumption: ${retRate}% nominal, ${infRate}% inflation = ${(retRate - infRate).toFixed(1)}% real (Fixed return mode)`
                        : `Return model: Historical S&P 500 total-return bootstrap (1928–2024) with ${infRate}% inflation`}
                    </div>
                    <div>Starting balance: {fmt(sTax + sPre + sPost)} ({fmt(sTax)} taxable, {fmt(sPre)} pre-tax, {fmt(sPost)} Roth)</div>
                    <div>Annual contributions: {fmt(cTax1 + cPre1 + cPost1 + cMatch1)}{isMar ? ` + ${fmt(cTax2 + cPre2 + cPost2 + cMatch2)}` : ''}</div>
                    {res.probRuin !== undefined && (
                      <div>Success rate: {((1 - res.probRuin) * 100).toFixed(1)}% ({1000 - Math.round(res.probRuin * 1000)}/1000 Monte Carlo runs)</div>
                    )}
                    <div>EOL buckets: Taxable {fmt(res.eolAccounts.taxable)} ({((res.eolAccounts.taxable / res.eol) * 100).toFixed(0)}%), Pre-tax {fmt(res.eolAccounts.pretax)} ({((res.eolAccounts.pretax / res.eol) * 100).toFixed(0)}%), Roth {fmt(res.eolAccounts.roth)} ({((res.eolAccounts.roth / res.eol) * 100).toFixed(0)}%)</div>
                  </div>
                </div>

                {/* Quick Analysis */}
                <div className="mt-6 p-4 bg-gray-100 border-2 border-gray-700">
                  <div className="font-bold mb-2">⚠️ PLAN ANALYSIS:</div>
                  <div className="space-y-1 text-sm">
                    <div>✓ Success: {res.probRuin !== undefined ? `${((1 - res.probRuin) * 100).toFixed(0)}%` : 'Deterministic'} | Withdrawal: {wdRate}% {wdRate <= 4 ? '(safe)' : '(aggressive)'}</div>
                    {res.rmdData && res.rmdData.some((d: any) => d.rmd > d.spending * 2) && (
                      <div>⚡ RMD bomb detected → Consider Roth conversions now</div>
                    )}
                    {res.genPayout && res.genPayout.fundLeftReal > 0 && (
                      <div>💰 Legacy: {res.genPayout.fundLeftReal > 0 ? 'Perpetual trust achievable' : `${res.genPayout.years} years`}</div>
                    )}
                    {res.estateTax > 1000000 && (
                      <div>🏛️ Estate tax: {fmt(res.estateTax)} ({((res.estateTax / res.eol) * 100).toFixed(0)}% of estate)</div>
                    )}
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-600 text-center">
                  Paste the "AI QUICK-CHECK" block into Claude/GPT/Grok for instant validation
                </div>
              </div>
            </div>

            {/* Human-Readable Financial Summary - Pages 2+ (Print Only) */}
            <div className="hidden print:block print-human-summary">
              {/* Page 2 Header */}
              <div className="print-section">
                <div className="border-b-2 border-gray-900 pb-4 mb-6">
                  <h1 className="text-2xl font-bold">Your Retirement Financial Summary</h1>
                  <p className="text-sm text-gray-600 mt-1">Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>

                {/* 1. Executive Summary - 6 Key Metrics in 2x3 Grid */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Future Balance */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">Future Balance at Retirement</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.finNom)}</div>
                      <div className="text-sm text-gray-600">Nominal dollars at age {retAge}</div>
                    </div>

                    {/* Today's Dollars */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">Purchasing Power (Today's Dollars)</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.finReal)}</div>
                      <div className="text-sm text-gray-600">Inflation-adjusted value at age {retAge}</div>
                    </div>

                    {/* Annual Withdrawal */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">Annual Withdrawal (Gross)</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.wd)}</div>
                      <div className="text-sm text-gray-600">{wdRate}% withdrawal rate in year 1</div>
                    </div>

                    {/* After-Tax Income */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">After-Tax Annual Income</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.wdReal)}</div>
                      <div className="text-sm text-gray-600">Spendable income after all taxes</div>
                    </div>

                    {/* EOL Wealth */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">End-of-Life Wealth</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.eol)}</div>
                      <div className="text-sm text-gray-600">Estate value at age {LIFE_EXP}</div>
                    </div>

                    {/* Net to Heirs */}
                    <div className="border-2 border-gray-300 p-4">
                      <div className="text-xs uppercase text-gray-600 font-semibold mb-1">Net to Heirs</div>
                      <div className="text-2xl font-bold mb-1">{fmt(res.netEstate || res.eol)}</div>
                      <div className="text-sm text-gray-600">After {fmt(res.estateTax || 0)} estate tax</div>
                    </div>
                  </div>
                </div>

                {/* 2. Your Inputs - Two Columns */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Your Inputs</h2>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div>
                      <h3 className="text-base font-semibold mb-3 border-b border-gray-300 pb-1">Personal Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Current Age:</span><span className="font-semibold text-right">{age1}</span></div>
                        <div className="flex justify-between"><span>Retirement Age:</span><span className="font-semibold text-right">{retAge}</span></div>
                        <div className="flex justify-between"><span>Marital Status:</span><span className="font-semibold text-right">{marital}</span></div>
                        <div className="flex justify-between"><span>Planning Horizon:</span><span className="font-semibold text-right">To age {LIFE_EXP}</span></div>
                      </div>

                      <h3 className="text-base font-semibold mb-3 mt-6 border-b border-gray-300 pb-1">Starting Balances</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Taxable (Brokerage):</span><span className="font-semibold text-right">{fmt(sTax)}</span></div>
                        <div className="flex justify-between"><span>Pre-Tax (401k/IRA):</span><span className="font-semibold text-right">{fmt(sPre)}</span></div>
                        <div className="flex justify-between"><span>Roth (Tax-Free):</span><span className="font-semibold text-right">{fmt(sPost)}</span></div>
                        <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="font-semibold">Total:</span><span className="font-bold text-right">{fmt(sTax + sPre + sPost)}</span></div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div>
                      <h3 className="text-base font-semibold mb-3 border-b border-gray-300 pb-1">Annual Contributions</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Taxable:</span><span className="font-semibold text-right">{fmt(cTax1)}</span></div>
                        <div className="flex justify-between"><span>Pre-Tax:</span><span className="font-semibold text-right">{fmt(cPre1)}</span></div>
                        <div className="flex justify-between"><span>Roth:</span><span className="font-semibold text-right">{fmt(cPost1)}</span></div>
                        <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="font-semibold">Total:</span><span className="font-bold text-right">{fmt(cTax1 + cPre1 + cPost1)}</span></div>
                      </div>

                      <h3 className="text-base font-semibold mb-3 mt-6 border-b border-gray-300 pb-1">Key Assumptions</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Inflation Rate:</span><span className="font-semibold text-right">{infRate}%</span></div>
                        <div className="flex justify-between"><span>Withdrawal Rate:</span><span className="font-semibold text-right">{wdRate}%</span></div>
                        <div className="flex justify-between"><span>Return Model:</span><span className="font-semibold text-right">{retMode === 'fixed' ? `${retRate}% Fixed` : 'Historical'}</span></div>
                        <div className="flex justify-between"><span>Monte Carlo Runs:</span><span className="font-semibold text-right">{walkSeries === 'trulyRandom' ? '1,000' : 'Single'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Retirement Analysis */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Retirement Analysis</h2>

                  {/* Success Probability */}
                  <div className="border-2 border-blue-300 bg-blue-50 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-700">Plan Success Rate</div>
                        <div className="text-3xl font-bold text-blue-900 mt-1">
                          {res.probRuin !== undefined ? `${((1 - res.probRuin) * 100).toFixed(1)}%` : '100%'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {res.probRuin !== undefined ? `Based on ${1000 - Math.round(res.probRuin * 1000)} out of 1,000 simulations` : 'Single deterministic path'}
                        </div>
                      </div>
                      <div className="text-6xl">
                        {res.probRuin !== undefined && res.probRuin < 0.05 ? '✓' : res.probRuin < 0.15 ? '⚠️' : '❌'}
                      </div>
                    </div>
                  </div>

                  {/* Key Risks & Opportunities */}
                  <div className="space-y-2 text-sm">
                    <h3 className="text-base font-semibold mb-2">Key Risks & Opportunities:</h3>

                    {/* RMD Warning */}
                    {res.rmdData && res.rmdData.some((d: any) => d.rmd > d.spending * 1.5) && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded">
                        <span className="text-xl">⚡</span>
                        <div>
                          <div className="font-semibold">RMD Tax Bomb Detected</div>
                          <div className="text-xs text-gray-700 mt-1">Your Required Minimum Distributions exceed your spending needs significantly after age 73. Consider Roth conversions now to reduce future tax burden.</div>
                        </div>
                      </div>
                    )}

                    {/* Estate Tax Impact */}
                    {res.estateTax && res.estateTax > 1000000 && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-300 rounded">
                        <span className="text-xl">🏛️</span>
                        <div>
                          <div className="font-semibold">Significant Estate Tax Impact</div>
                          <div className="text-xs text-gray-700 mt-1">Your estate will owe approximately {fmt(res.estateTax)} ({((res.estateTax / res.eol) * 100).toFixed(0)}% of total wealth). Consider gifting strategies or trusts to reduce exposure.</div>
                        </div>
                      </div>
                    )}

                    {/* Withdrawal Sustainability */}
                    <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-300 rounded">
                      <span className="text-xl">{wdRate <= 4 ? '✓' : '⚠️'}</span>
                      <div>
                        <div className="font-semibold">Withdrawal Rate: {wdRate}%</div>
                        <div className="text-xs text-gray-700 mt-1">
                          {wdRate <= 3.5 ? 'Very conservative - high confidence in sustainability' :
                           wdRate <= 4.0 ? 'Classic 4% rule - historically safe' :
                           wdRate <= 5.0 ? 'Aggressive - higher risk of depletion' :
                           'Very aggressive - significant risk of running out'}
                        </div>
                      </div>
                    </div>

                    {/* Generational Legacy */}
                    {res.genPayout && res.genPayout.fundLeftReal > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-300 rounded">
                        <span className="text-xl">💰</span>
                        <div>
                          <div className="font-semibold">Generational Wealth Potential</div>
                          <div className="text-xs text-gray-700 mt-1">Your estate could support {res.genPayout.startBeneficiaries} beneficiaries at {fmt(res.genPayout.perBenReal)}/year for {res.genPayout.years === 10000 ? 'perpetuity' : `${res.genPayout.years} years`}.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Note: Charts appear on subsequent pages via normal flow */}

              {/* Detailed Breakdown */}
              <div className="print-section mt-8">
                <h2 className="text-xl font-bold mb-4">Detailed Account Breakdown</h2>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* At Retirement */}
                  <div>
                    <h3 className="text-base font-semibold mb-3 border-b border-gray-300 pb-1">Account Composition at Retirement (Age {retAge})</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Taxable:</span><span className="font-semibold text-right">{fmt(res.finNom * 0.33)} (33%)</span></div>
                      <div className="flex justify-between"><span>Pre-Tax:</span><span className="font-semibold text-right">{fmt(res.finNom * 0.45)} (45%)</span></div>
                      <div className="flex justify-between"><span>Roth:</span><span className="font-semibold text-right">{fmt(res.finNom * 0.22)} (22%)</span></div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="font-semibold">Total:</span><span className="font-bold text-right">{fmt(res.finNom)}</span></div>
                    </div>
                  </div>

                  {/* At End of Life */}
                  <div>
                    <h3 className="text-base font-semibold mb-3 border-b border-gray-300 pb-1">Account Composition at End of Life (Age {LIFE_EXP})</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Taxable:</span><span className="font-semibold text-right">{fmt(res.eolAccounts.taxable)} ({((res.eolAccounts.taxable / res.eol) * 100).toFixed(0)}%)</span></div>
                      <div className="flex justify-between"><span>Pre-Tax:</span><span className="font-semibold text-right">{fmt(res.eolAccounts.pretax)} ({((res.eolAccounts.pretax / res.eol) * 100).toFixed(0)}%)</span></div>
                      <div className="flex justify-between"><span>Roth:</span><span className="font-semibold text-right">{fmt(res.eolAccounts.roth)} ({((res.eolAccounts.roth / res.eol) * 100).toFixed(0)}%)</span></div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="font-semibold">Total:</span><span className="font-bold text-right">{fmt(res.eol)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Tax Efficiency Metrics */}
                <div>
                  <h3 className="text-base font-semibold mb-3 border-b border-gray-300 pb-1">Tax Efficiency Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Effective Tax Rate on Withdrawals:</span><span className="font-semibold text-right">{((((res.finReal * (wdRate / 100)) - res.wdReal) / (res.finReal * (wdRate / 100))) * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>Total RMDs Over Lifetime:</span><span className="font-semibold text-right">{fmt(res.totalRMDs || 0)}</span></div>
                    <div className="flex justify-between"><span>Estate Tax Rate:</span><span className="font-semibold text-right">{res.estateTax > 0 ? `${((res.estateTax / res.eol) * 100).toFixed(1)}%` : '0%'}</span></div>
                  </div>
                </div>
              </div>
            </div>

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

            <div className="print-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print-tile-grid">
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

            {/* Lifetime Wealth Flow - Sankey Diagram */}
            <div className="print-section print-block wealth-flow-block">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Lifetime Wealth Flow</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs print-hide"
                    onClick={() => askExplainQuestion("How can I optimize my end-of-life wealth and estate planning?")}
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
              <CardContent className="space-y-4">
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
                        margin={{ top: 30, right: 70, bottom: 30, left: 90 }}
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

            <div className="print-section print-block analysis-block">
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

            {/* Sensitivity Analysis */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="print-section print-block">
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

            {/* Save/Compare Scenarios */}
            <AnimatedSection animation="slide-up" delay={250}>
              <div className="print-section">
              <Card data-scenarios-section>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Save & Compare Scenarios</CardTitle>
                      <CardDescription>Save different retirement strategies and compare them side-by-side</CardDescription>
                    </div>
                    <Button
                      variant={showScenarios ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowScenarios(!showScenarios)}
                      className="no-print"
                    >
                      {showScenarios ? "Hide" : `Show (${savedScenarios.length})`}
                    </Button>
                  </div>
                  {!showScenarios && savedScenarios.length > 0 && (
                    <div className="print-only mt-4">
                      <p className="text-sm text-muted-foreground">
                        {savedScenarios.length} saved scenario{savedScenarios.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}
                </CardHeader>
                {(showScenarios || savedScenarios.length > 0) && (
                  <CardContent className="print:block">
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
                                <div className="text-xs font-medium mb-2 text-muted-foreground">End-of-Life Wealth</div>
                                {Array.from(selectedScenarios).map((id) => {
                                  const scenario = savedScenarios.find(s => s.id === id);
                                  if (!scenario) return null;
                                  const maxEOL = Math.max(...Array.from(selectedScenarios).map(sid => savedScenarios.find(s => s.id === sid)?.results.eol || 0));
                                  const pct = (scenario.results.eol / maxEOL) * 100;
                                  return (
                                    <div key={id} className="mb-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-medium">{scenario.name}</span>
                                        <span className="text-muted-foreground">{fmt(scenario.results.eol)}</span>
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
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Annual Retirement Income</div>
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
                                <div className="text-xs font-medium mb-2 text-muted-foreground">Balance at Retirement</div>
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
                                const allScenarios = res ? [{ name: "Current", results: { eol: res.eol, wdReal: res.wdReal, finReal: res.finReal } }, ...savedScenarios] : savedScenarios;
                                const bestEOL = allScenarios.reduce((max, s) => s.results.eol > max.results.eol ? s : max);
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
              </Card>
              </div>
            </AnimatedSection>

            {/* Historical Scenario Playback */}
            <AnimatedSection animation="slide-up" delay={275}>
              <div className="print-section">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Bear Market Retirement Scenarios</CardTitle>
                      <CardDescription>Click to re-calculate with actual historical returns starting from major market crashes</CardDescription>
                    </div>
                    <Button
                      variant={showBearMarket ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowBearMarket(!showBearMarket)}
                      className="no-print"
                    >
                      {showBearMarket ? "Hide" : "Show"}
                    </Button>
                  </div>
                </CardHeader>
                {showBearMarket && (
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test your plan against the worst bear markets in history. Each scenario uses <strong>actual sequential S&P 500 returns</strong> from that year forward.
                    {historicalYear && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded text-xs font-semibold">
                        Currently using {historicalYear} returns
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { year: 1929, label: "Great Depression", description: "-43.8% → -8.3% → -25.1%", risk: "extreme", firstYear: "-43.8%" },
                      { year: 1973, label: "Oil Crisis", description: "-14.3% → -25.9% bear market", risk: "high", firstYear: "-14.3%" },
                      { year: 1987, label: "Black Monday", description: "Single-day crash, quick recovery", risk: "medium", firstYear: "+5.8%" },
                      { year: 2000, label: "Dot-com Crash", description: "-9.0% → -11.9% → -22.0%", risk: "high", firstYear: "-9.0%" },
                      { year: 2001, label: "9/11 Recession", description: "Tech bust continues", risk: "high", firstYear: "-11.9%" },
                      { year: 2008, label: "Financial Crisis", description: "-36.6% worst year since 1931", risk: "extreme", firstYear: "-36.6%" },
                      { year: 2022, label: "Inflation Shock", description: "-18.0% stocks + bonds down", risk: "medium", firstYear: "-18.0%" },
                    ].map((scenario) => (
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
                          Recalculate With This Scenario
                        </Button>
                        <Button
                          onClick={() => setHistoricalYear(null)}
                          variant="outline"
                          size="sm"
                        >
                          Clear & Return to Normal Mode
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
                </CardContent>
                )}
              </Card>
              </div>
            </AnimatedSection>

            {/* Tabbed Chart Container */}
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
                      <div className="chart-block">
                      <ResponsiveContainer width="100%" height={400}>
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
                          <Area
                            type="monotone"
                            dataKey="bal"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorBal)"
                            name="Nominal (50th Percentile)"
                          />
                          <Area
                            type="monotone"
                            dataKey="real"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fillOpacity={1}
                            fill="url(#colorReal)"
                            name="Real (50th Percentile)"
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
                              stroke="#ef4444"
                              strokeWidth={2}
                              strokeDasharray="3 3"
                              dot={false}
                              name="90th Percentile (Nominal)"
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                      </div>
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
          </div>
          </AnimatedSection>
          </>
        )}

        {/* Input Form */}
        <AnimatedSection animation="fade-in" delay={100}>
          <Card>
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
                          onChange={(e) => setMarital(e.target.value as FilingStatus)}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                        </select>
                      </div>
                      <Input label="Your Age" value={age1} setter={setAge1} min={18} max={120} />
                      <Input label="Retirement Age" value={retAge} setter={setRetAge} min={30} max={90} />
                      {isMar && (
                        <Input label="Spouse Age" value={age2} setter={setAge2} min={18} max={120} />
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
                        <Input label="Taxable Brokerage" value={sTax} setter={setSTax} step={1000} />
                        <Input label="Pre-Tax (401k/IRA)" value={sPre} setter={setSPre} step={1000} />
                        <Input label="Post-Tax (Roth)" value={sPost} setter={setSPost} step={1000} />
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
                  <Input label="Taxable" value={cTax1} setter={setCTax1} step={1000} />
                  <Input label="Pre-Tax" value={cPre1} setter={setCPre1} step={1000} />
                  <Input label="Post-Tax" value={cPost1} setter={setCPost1} step={500} />
                  <Input label="Employer Match" value={cMatch1} setter={setCMatch1} step={500} />
                </div>
                {isMar && (
                  <div className="space-y-4">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                      Spouse's Contributions
                    </Badge>
                    <Input label="Taxable" value={cTax2} setter={setCTax2} step={1000} />
                    <Input label="Pre-Tax" value={cPre2} setter={setCPre2} step={1000} />
                    <Input label="Post-Tax" value={cPost2} setter={setCPost2} step={500} />
                    <Input label="Employer Match" value={cMatch2} setter={setCMatch2} step={500} />
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
                  />
                  <div className="space-y-4">
                    <Input
                      label="Increase Rate (%)"
                      value={incRate}
                      setter={setIncRate}
                      step={0.1}
                      isRate
                      disabled={!incContrib}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="inc-contrib"
                        checked={incContrib}
                        onChange={(e) => setIncContrib(e.target.checked)}
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
                    id: "social-security",
                    label: "Social Security",
                    defaultOpen: false,
                    content: (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="include-ss"
                            checked={includeSS}
                            onChange={(e) => setIncludeSS(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                          />
                          <Label htmlFor="include-ss" className="text-base font-semibold cursor-pointer">
                            Include Social Security Benefits {includeSS && <span className="print-only">✓</span>}
                          </Label>
                        </div>

                        {includeSS && (
                          <div className="space-y-6">
                            <div>
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 mb-2">Primary</Badge>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Avg Career Earnings ($/yr)"
                                  value={ssIncome}
                                  setter={setSSIncome}
                                  step={1000}
                                  tip="Your average indexed earnings for SS calculation (AIME)"
                                />
                                <Input
                                  label="Claim Age"
                                  value={ssClaimAge}
                                  setter={setSSClaimAge}
                                  step={1}
                                  min={62}
                                  max={70}
                                  tip="Age when you start claiming SS (62-70). FRA is typically 67."
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
                                  />
                                  <Input
                                    label="Claim Age"
                                    value={ssClaimAge2}
                                    setter={setSSClaimAge2}
                                    step={1}
                                    min={62}
                                    max={70}
                                    tip="Age when spouse starts claiming SS (62-70). FRA is typically 67."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />

            <Separator />

            <div className={`print-section print-block gen-card space-y-6 ${!showGen ? 'no-print' : ''}`}>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="show-gen"
                  checked={showGen}
                  onChange={(e) => setShowGen(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 no-print print-hide"
                />
                <Label htmlFor="show-gen" className="text-lg font-semibold text-foreground cursor-pointer">
                  Generational Wealth Modeling {showGen && <span className="print-only">✓</span>}
                </Label>
              </div>

              {showGen && (
                <div className="p-6 bg-card rounded-xl border border-border shadow-sm gen-card">
                  <h4 className="text-xl font-semibold text-foreground mb-6">
                    Hypothetical Per-Beneficiary Payout
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input
                      label={<>Annual Per-Beneficiary<br />($, 2025)</>}
                      value={hypPerBen}
                      setter={setHypPerBen}
                      step={50000}
                    />
                    <Input
                      label={<>Births per Fertile Ben.<br />(ages 20-40)</>}
                      value={hypBirthMultiple}
                      setter={setHypBirthMultiple}
                      min={0}
                      step={0.1}
                      isRate
                      tip="Every birth interval years, each fertile beneficiary (ages 20-40) spawns this many new beneficiaries."
                    />
                    <Input
                      label={<>Birth Interval<br />(yrs)</>}
                      value={hypBirthInterval}
                      setter={setHypBirthInterval}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-foreground">
                        Initial Beneficiary Ages at Death
                        <Tip text="Enter ages of living beneficiaries at your time of death, separated by commas (e.g., '35, 40, 45'). Only fertile beneficiaries (ages 20-40) will produce children." />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Max Lifespan (yrs)"
                      value={hypDeathAge}
                      setter={setHypDeathAge}
                      min={1}
                      step={1}
                      tip="Maximum age for all beneficiaries"
                    />
                    <Input
                      label="Min Distribution Age"
                      value={hypMinDistAge}
                      setter={setHypMinDistAge}
                      min={0}
                      step={1}
                      tip="Minimum age before beneficiaries can receive distributions (e.g., 21 for legal adulthood, 25 for financial maturity)"
                    />
                  </div>

                  {res?.genPayout && (
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

                        return (
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
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                      {simProgress
                        ? `Simulating... ${simProgress.completed} / ${simProgress.total}`
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

        {/* The Math Section - Always included in print */}
        <div className="math-print-section print-section print-page-break-before">
        <Card>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="math" className="border-none">
              <AccordionTrigger className="px-6 pt-6 pb-2 hover:no-underline">
                <div className="text-left">
                  <h2 className="text-3xl font-bold">The Math</h2>
                  <p className="text-sm text-muted-foreground mt-1">Understanding the calculations behind your retirement projections</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6 text-sm leading-relaxed pt-4">
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
                    beneficiaries (children, grandchildren, etc.) with annual payouts in today's dollars:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>The net estate (after estate tax) is deflated to 2025 purchasing power</li>
                    <li>Each year, the fund grows at a real rate (nominal return minus inflation)</li>
                    <li>Only beneficiaries at or above the minimum distribution age receive payouts in constant 2025 dollars</li>
                    <li>Beneficiaries age each year; those reaching max lifespan exit the model</li>
                    <li>Every N years (birth interval), fertile beneficiaries (ages 20-40) produce offspring</li>
                    <li>Simulation continues until funds are exhausted or 10,000 years (effectively perpetual)</li>
                  </ul>
                  <p className="text-gray-700 mt-2">
                    This models a "perpetual trust" scenario and helps you understand whether your legacy could
                    support multiple generations indefinitely or for how many years it would last under various
                    payout scenarios.
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
                  RMD rules, and estate tax exemptions remain constant. Tax laws frequently change.
                </li>
                <li>
                  <strong>No Sequence Risk Detail:</strong> While random walk mode samples from historical returns,
                  it doesn't specifically model sequence-of-returns risk (getting bad returns early in retirement).
                  Multiple simulations with different seeds can help explore this.
                </li>
                <li>
                  <strong>Simplified Withdrawal Strategy:</strong> Uses proportional withdrawals from all accounts.
                  More sophisticated strategies (like draining taxable first, then pre-tax, then Roth) may be more
                  tax-efficient but are not modeled here.
                </li>
                <li>
                  <strong>No Healthcare Costs:</strong> Doesn't separately model Medicare, long-term care insurance,
                  or extraordinary medical expenses. These should be built into your withdrawal rate or annual spending needs.
                </li>
                <li>
                  <strong>Fixed Withdrawal Rate:</strong> Uses inflation-adjusted constant dollar withdrawals.
                  Real retirees often adjust spending based on portfolio performance.
                </li>
                <li>
                  <strong>Single Life Expectancy:</strong> Projects to age {LIFE_EXP} for the older spouse.
                  Some households may need to plan for longer lifespans.
                </li>
                <li>
                  <strong>No Pension Income:</strong> Doesn't model traditional pensions, annuities, or rental income.
                  These could be approximated by adjusting your withdrawal needs downward.
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
                <li><strong>Estate Tax:</strong> 2025 federal exemption and rate (IRS)</li>
                <li><strong>Net Worth Data:</strong> Federal Reserve 2022 Survey of Consumer Finances (released Oct 2023)</li>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
        </div>
      </div>
      </div>
    </>
  );
}

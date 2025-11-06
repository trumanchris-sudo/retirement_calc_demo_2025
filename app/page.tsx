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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

/** ===============================
 * Constants
 * ================================ */

const MAX_GENS = 40;
const YEARS_PER_GEN = 30;
const LIFE_EXP = 95;
const CURR_YEAR = new Date().getFullYear();
const RMD_START_AGE = 73; // 2023 SECURE Act 2.0

/** RMD Divisor Table (IRS Uniform Lifetime Table) - Complete */
const RMD_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

/** Social Security Full Retirement Age bend points (2025 estimates) */
const SS_BEND_POINTS = {
  first: 1226,  // 90% of AIME up to this
  second: 7391, // 32% of AIME between first and second, 15% above
};

/** Estate Tax (2025) */
const ESTATE_TAX_EXEMPTION = {
  single: 13_990_000,   // $13.99M for individual
  married: 27_980_000,  // $27.98M for married couple (double)
};
const ESTATE_TAX_RATE = 0.40; // 40% on amount over exemption

/** Illustrative 2025 ordinary brackets + standard deductions */
const TAX_BRACKETS = {
  single: {
    deduction: 15000,
    rates: [
      { limit: 11925, rate: 0.1 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
  married: {
    deduction: 30000,
    rates: [
      { limit: 23850, rate: 0.1 },
      { limit: 96950, rate: 0.12 },
      { limit: 206700, rate: 0.22 },
      { limit: 394600, rate: 0.24 },
      { limit: 501050, rate: 0.32 },
      { limit: 751600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
} as const;

/** Illustrative LTCG brackets */
const LTCG_BRACKETS = {
  single: [
    { limit: 50000, rate: 0.0 },
    { limit: 492300, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
  married: [
    { limit: 100000, rate: 0.0 },
    { limit: 553850, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
} as const;

/** NIIT thresholds */
const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
} as const;

// Net worth data (Median) from Fed's 2022 Survey of Consumer Finances (released Oct 2023)
const NET_WORTH_DATA = {
  under35: { median: 39000, label: "Under 35" },
  "35-44": { median: 135600, label: "35-44" },
  "45-54": { median: 247200, label: "45-54" },
  "55-64": { median: 364500, label: "55-64" },
  "65-74": { median: 409900, label: "65-74" },
  "75+": { median: 335600, label: "75+" },
};

const getNetWorthBracket = (age: number) => {
  if (age < 35) return NET_WORTH_DATA.under35;
  if (age <= 44) return NET_WORTH_DATA["35-44"];
  if (age <= 54) return NET_WORTH_DATA["45-54"];
  if (age <= 64) return NET_WORTH_DATA["55-64"];
  if (age <= 74) return NET_WORTH_DATA["65-74"];
  return NET_WORTH_DATA["75+"];
};

/** ===============================
 * S&P 500 Random Walk Data
 * ================================ */

export type ReturnMode = "fixed" | "randomWalk";
export type WalkSeries = "nominal" | "real" | "trulyRandom";

/** Summary statistics from running multiple seeds for truly random simulations */
export type BatchSummary = {
  p10BalancesReal: number[];      // 10th percentile per year
  p50BalancesReal: number[];      // median per year
  p90BalancesReal: number[];      // 90th percentile per year
  eolReal_p10: number;            // 10th percentile end-of-life wealth (real)
  eolReal_p50: number;            // median end-of-life wealth (real)
  eolReal_p90: number;            // 90th percentile end-of-life wealth (real)
  y1AfterTaxReal_p10: number;     // 10th percentile year-1 after-tax withdrawal (real)
  y1AfterTaxReal_p50: number;     // median year-1 after-tax withdrawal (real)
  y1AfterTaxReal_p90: number;     // 90th percentile year-1 after-tax withdrawal (real)
  probRuin: number;               // fraction of runs that ruined
};

/**
 * S&P 500 Total Return (YoY)
 * 1975-2024 (50 years)
 */
export const SP500_YOY_NOMINAL: number[] = [
  37.2, 23.83, -7.18, 6.56, 18.44, 32.5, -4.92, 21.55, 22.56, 6.27, 31.73,
  18.67, 5.25, 16.61, 31.49, -3.1, 30.47, 7.62, 10.08, 1.32, 37.58, 22.96,
  33.36, 28.58, 21.04, -9.1, -11.89, -22.1, 28.69, 4.91, 15.79, 5.49,
  -37.0, 26.46, 15.06, 2.11, 15.99, 32.39, 13.69, 1.38, 11.96, 21.83,
  -4.38, 31.43, 18.4, -18.11, 26.29, 26.39, -47.00, 3.00, -10.00, 15.00, -5.00
];

/** Simple seeded PRNG so runs are reproducible. */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

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
}) {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
  } = options;

  if (mode === "fixed") {
    const g = 1 + nominalPct / 100;
    return function* fixedGen() {
      for (let i = 0; i < years; i++) yield g;
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");
  const rnd = mulberry32(seed);
  const inflRate = infPct / 100;

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

const clampNum = (v: number, min?: number, max?: number) => {
  let out = v;
  if (min !== undefined && out < min) out = min;
  if (max !== undefined && out > max) out = max;
  return out;
};

const toNumber = (s: string, fallback = 0) => {
  if (s.trim() === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

const fmt = (v: number) => {
  if (!Number.isFinite(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(v);
};

/** Calculate median from an array of numbers */
const median = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

/** Calculate percentile from an array of numbers */
const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

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

const realReturn = (nominalPct: number, inflPct: number) =>
  (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;

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

/** Tailwind safe color map */
const COLOR = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    sub: "text-blue-600",
    badge: "text-blue-700",
    icon: "text-blue-500",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-900",
    sub: "text-indigo-600",
    badge: "text-indigo-700",
    icon: "text-indigo-500",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-900",
    sub: "text-green-600",
    badge: "text-green-700",
    icon: "text-green-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    sub: "text-emerald-600",
    badge: "text-emerald-700",
    icon: "text-emerald-500",
  },
} as const;

type ColorKey = keyof typeof COLOR;

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
      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="animate-spin">
            <SparkleIcon className="text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold text-blue-900">Analyzing Your Plan...</h4>
        </div>
        <p className="text-sm text-blue-700 leading-relaxed">
          Please wait a moment while we generate your personalized insights.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border-2 border-red-200 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <SparkleIcon className="text-red-600" />
          <h4 className="text-lg font-semibold text-red-900">Analysis Error</h4>
        </div>
        <p className="text-sm text-red-700 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-6 rounded-xl bg-gray-50 border-2 border-gray-200 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">
          Click "Calculate Retirement Plan" to see your personalized analysis
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
      <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{insight}</p>
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
        <span className="relative flex h-12 w-12 text-purple-600">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-12 w-12 bg-purple-500 p-2">
            <UsersIcon className="m-auto text-white" size={32} />
          </span>
        </span>
      </div>
    );
  } else {
    return (
      <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center" title={`Exhausts after ${genPayout.years} years`}>
        <span className="relative flex h-12 w-12 text-gray-500">
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
 * - Each year, pay (perBenReal * living).
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
    const payout = perBenReal * living;
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
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
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
    probRuin
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

  const [retMode, setRetMode] = useState<"fixed" | "randomWalk">("randomWalk");
  const [seed, setSeed] = useState(42);
  const [walkSeries, setWalkSeries] = useState<"nominal" | "real" | "trulyRandom">("trulyRandom");

  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>("");

  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode
  const [showP10, setShowP10] = useState(false); // Show 10th percentile line
  const [showP90, setShowP90] = useState(false); // Show 90th percentile line

  const resRef = useRef<HTMLDivElement | null>(null);
  const genRef = useRef<HTMLDivElement | null>(null);

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

  const fetchAiInsight = async (calcResult: any, olderAge: number, customQuestion?: string) => {
    if (!calcResult) return;

    setIsLoadingAi(true);
    setAiInsight("");
    setAiError(null);

    try {
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

  const calc = useCallback(async () => {
    setErr(null);
    setAiInsight("");
    setAiError(null);
    setIsLoadingAi(true);
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

      // If truly random mode, run 10 seeds and use median values
      if (walkSeries === 'trulyRandom') {
        const inputs: Inputs = {
          marital, age1, age2, retAge, sTax, sPre, sPost,
          cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
          retRate, infRate, stateRate, incContrib, incRate, wdRate,
          retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        };

        const batchSummary = await runTenSeedsAndSummarize(inputs, currentSeed);

        // Reconstruct data array from batch summary percentile balances
        const data: { year: number; a1: number; a2: number | null; bal: number; real: number; p10: number; p90: number }[] = [];
        for (let i = 0; i < batchSummary.p50BalancesReal.length; i++) {
          const yr = CURR_YEAR + i;
          const a1 = age1 + i;
          const a2 = isMar ? age2 + i : null;
          const realBal = batchSummary.p50BalancesReal[i];
          const nomBal = realBal * Math.pow(1 + infl, i);
          const p10Nom = batchSummary.p10BalancesReal[i] * Math.pow(1 + infl, i);
          const p90Nom = batchSummary.p90BalancesReal[i] * Math.pow(1 + infl, i);

          data.push({
            year: yr,
            a1,
            a2,
            bal: nomBal,
            real: realBal,
            p10: p10Nom,
            p90: p90Nom,
          });
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

        // Calculate estate tax
        const estateTax = calcEstateTax(eolWealth, marital);
        const netEstate = eolWealth - estateTax;

        // Generational payout calculation (if enabled)
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
          const benAges = hypBenAgesStr
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n >= 0 && n < 90);

          const sim = simulateRealPerBeneficiaryPayout(
            netEstate,
            yearsFrom2025,
            retRate,
            infRate,
            hypPerBen,
            Math.max(1, hypStartBens),
            Math.max(0, hypBirthMultiple),
            Math.max(1, hypBirthInterval),
            Math.max(1, hypDeathAge),
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
          fetchAiInsight(newRes, olderAgeForAI);
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
        fetchAiInsight(newRes, olderAgeForAI);
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
    hypPerBen, hypStartBens, hypBirthMultiple, hypBirthInterval, hypDeathAge,
    retMode, seed, walkSeries,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2, hypBenAgesStr,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-900">
          <CardHeader className="py-12">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg">
                  <TrendingUpIcon className="w-12 h-12 text-white" />
                </div>
                <div>
                  <CardTitle className="text-5xl font-bold text-white tracking-tight">
                    Tax-Aware Retirement Planner
                  </CardTitle>
                </div>
              </div>
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
              >
                {isDarkMode ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Print/Share Buttons */}
        {res && (
          <div className="flex justify-center gap-3 no-print">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </Button>
            <Button
              onClick={() => {
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
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Results
            </Button>
          </div>
        )}

        {res && (
          <div ref={resRef} className="space-y-6 scroll-mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Future Balance"
                value={fmt(res.finNom)}
                sub={`At age ${retAge} (nominal)`}
                color="blue"
                icon={DollarSignIcon}
                explanation={`This is your projected total retirement balance at age ${retAge} in future dollars (nominal). It includes your current savings plus all contributions and growth from now until retirement, accounting for mid-year contributions and compounding returns.`}
              />
              <StatCard
                title="Today's Dollars"
                value={fmt(res.finReal)}
                sub={`At age ${retAge} (real)`}
                color="indigo"
                icon={TrendingUpIcon}
                explanation={`This is your Future Balance adjusted for inflation to show its equivalent purchasing power in today's dollars (real value). Calculated by dividing the nominal balance by (1 + inflation)^years. This helps you understand what your retirement savings will actually buy.`}
              />
              <StatCard
                title="Annual Withdrawal"
                value={fmt(res.wd)}
                sub={`Year 1 (${wdRate}% rate)`}
                color="green"
                icon={CalendarIcon}
                explanation={`This is your first-year gross withdrawal amount, calculated as ${wdRate}% of your Future Balance. This is the total amount withdrawn before taxes. In subsequent years, this amount increases with inflation to maintain constant purchasing power.`}
              />
              <StatCard
                title="After-Tax Income"
                value={fmt(res.wdReal)}
                sub="Year 1 real spending"
                color="emerald"
                explanation={`This is your spendable income in today's dollars after all taxes (federal ordinary income, LTCG, NIIT, and state taxes) are deducted from your withdrawal. It represents what you'll actually have available to spend, adjusted to today's purchasing power.`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">Duration</p>
                  <p className="text-2xl font-bold">
                    {res.survYrs === res.yrsToSim
                      ? `${res.yrsToSim} yrs (to ${LIFE_EXP})`
                      : `${res.survYrs} yrs`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">End-of-Life Wealth</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(res.eol)}</p>
                  {res.eolAccounts && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div>Taxable: {fmt(res.eolAccounts.taxable)}</div>
                      <div>Pre-tax: {fmt(res.eolAccounts.pretax)}</div>
                      <div>Roth: {fmt(res.eolAccounts.roth)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-2">Year 1 Tax (all-in)</p>
                  <p className="text-2xl font-bold text-orange-600">{fmt(res.tax.tot)}</p>
                </CardContent>
              </Card>
            </div>

            {(res.totalRMDs > 0 || res.estateTax > 0 || res.probRuin !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {res.totalRMDs > 0 && (
                  <Card className="border-2 border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-950">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Total RMDs (Age 73+)</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{fmt(res.totalRMDs)}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Cumulative Required Minimum Distributions from pre-tax accounts
                      </p>
                    </CardContent>
                  </Card>
                )}
                {res.estateTax > 0 && (
                  <>
                    <Card className="border-2 border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-950">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Estate Tax</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmt(res.estateTax)}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          40% on amount over ${(ESTATE_TAX_EXEMPTION[marital] / 1_000_000).toFixed(2)}M exemption
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-2">Net Estate to Heirs</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(res.netEstate)}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          After 40% estate tax
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
                {res.probRuin !== undefined && (
                  <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Probability of Running Out</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{(res.probRuin * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Based on 25 random simulations. {res.probRuin === 0 ? "All scenarios succeeded!" :
                        res.probRuin === 1 ? "All scenarios failed." :
                        `${(res.probRuin * 25).toFixed(0)} out of 25 scenarios ran out of money.`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparkleIcon className="text-blue-600" />
                  Plan Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AiInsightBox
                  insight={aiInsight}
                  error={aiError}
                  isLoading={isLoadingAi}
                />
                {res && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label htmlFor="ai-question" className="text-sm font-medium mb-2 block">
                      Ask a question about your plan
                    </Label>
                    <div className="flex gap-2">
                      <UIInput
                        id="ai-question"
                        type="text"
                        placeholder="e.g., What if I retire 2 years earlier?"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAskQuestion();
                          }
                        }}
                        className="flex-1"
                        disabled={isLoadingAi}
                      />
                      <Button
                        onClick={handleAskQuestion}
                        disabled={isLoadingAi || !userQuestion.trim()}
                        className="whitespace-nowrap"
                      >
                        Ask Claude
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accumulation Projection</CardTitle>
                <CardDescription>Your wealth over time in nominal and real dollars</CardDescription>
              </CardHeader>
              <CardContent>
                {walkSeries === 'trulyRandom' && (
                  <div className="flex gap-6 mb-4 items-center">
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
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={res.data}>
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
                      labelFormatter={(l) => String(l)}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend />
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
                    <Area
                      type="monotone"
                      dataKey="bal"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBal)"
                      name="Nominal (50th Percentile)"
                    />
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
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Your Retirement</CardTitle>
            <CardDescription>Enter your information to calculate your retirement projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Personal Info</h3>
                </div>

                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <select
                    value={marital}
                    onChange={(e) => setMarital(e.target.value as FilingStatus)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Your Age" value={age1} setter={setAge1} min={18} max={120} />
                  {isMar && (
                    <Input label="Spouse Age" value={age2} setter={setAge2} min={18} max={120} />
                  )}
                </div>

                <Input label="Retirement Age" value={retAge} setter={setRetAge} min={30} max={90} />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSignIcon className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Current Balances</h3>
                </div>
                <Input label="Taxable Brokerage" value={sTax} setter={setSTax} step={1000} />
                <Input label="Pre-Tax (401k/IRA)" value={sPre} setter={setSPre} step={1000} />
                <Input label="Post-Tax (Roth)" value={sPost} setter={setSPost} step={1000} />
                <div className="p-3 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Current Balance</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{fmt(total)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <CollapsibleSection title="Annual Contributions" icon={DollarSignIcon} defaultOpen={false}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Primary</Badge>
                  <Input label="Taxable" value={cTax1} setter={setCTax1} step={1000} />
                  <Input label="Pre-Tax" value={cPre1} setter={setCPre1} step={1000} />
                  <Input label="Post-Tax" value={cPost1} setter={setCPost1} step={500} />
                  <Input label="Employer Match" value={cMatch1} setter={setCMatch1} step={500} />
                </div>
                {isMar && (
                  <div className="space-y-4">
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Spouse</Badge>
                    <Input label="Taxable" value={cTax2} setter={setCTax2} step={1000} />
                    <Input label="Pre-Tax" value={cPre2} setter={setCPre2} step={1000} />
                    <Input label="Post-Tax" value={cPost2} setter={setCPost2} step={500} />
                    <Input label="Employer Match" value={cMatch2} setter={setCMatch2} step={500} />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Assumptions" icon={TrendingUpIcon} defaultOpen={false}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Return Rate (%)"
                    value={retRate}
                    setter={setRetRate}
                    step={0.1}
                    isRate
                    tip={retMode === 'fixed' ? "S&P 500 avg ~9.8%" : "Used for 'Fixed' mode. 'Random Walk' uses S&P data."}
                    disabled={retMode === 'randomWalk'}
                  />
                  <Input
                    label="Inflation (%)"
                    value={infRate}
                    setter={setInfRate}
                    step={0.1}
                    isRate
                    tip="US avg ~2.6%"
                  />
                  <Input
                    label="State Tax (%)"
                    value={stateRate}
                    setter={setStateRate}
                    step={0.1}
                    isRate
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Return Model</Label>
                    <select
                      value={retMode}
                      onChange={(e) => setRetMode(e.target.value as "fixed" | "randomWalk")}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="fixed">Fixed (single rate)</option>
                      <option value="randomWalk">Random Walk (S&P bootstrap)</option>
                    </select>
                  </div>

                  {retMode === "randomWalk" && (
                    <>
                      <div className="space-y-2">
                        <Label>Series Basis</Label>
                        <select
                          value={walkSeries}
                          onChange={(e) => setWalkSeries(e.target.value as "nominal" | "real" | "trulyRandom")}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="nominal">Nominal YoY (Fixed Seed)</option>
                          <option value="real">Real YoY (Fixed Seed)</option>
                          <option value="trulyRandom">Truly Random (New Seed)</option>
                        </select>
                      </div>
                      {walkSeries !== 'trulyRandom' && (
                        <div className="space-y-2">
                          <Label>Seed</Label>
                          <UIInput
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(parseInt(e.target.value || "0", 10))}
                            className="transition-all"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Withdrawal Rate (%)"
                    value={wdRate}
                    setter={setWdRate}
                    step={0.1}
                    isRate
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

                <Separator />

                <div className="space-y-4">
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
              </div>
            </CollapsibleSection>

            <Separator />

            <div className={`space-y-6 ${!showGen ? 'no-print' : ''}`}>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="show-gen"
                  checked={showGen}
                  onChange={(e) => setShowGen(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 no-print"
                />
                <Label htmlFor="show-gen" className="text-lg font-semibold text-purple-700 cursor-pointer">
                  Generational Wealth Modeling {showGen && <span className="print-only">✓</span>}
                </Label>
              </div>

              {showGen && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
                  <h4 className="text-lg font-semibold text-purple-900 mb-4">
                    Hypothetical Per-Beneficiary Payout (Real $)
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
                      <Label className="flex items-center gap-1.5">
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
                      <p className="text-xs text-purple-700">
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
                  </div>

                  {res?.genPayout && (
                    <div ref={genRef} className="mt-6 p-4 bg-white rounded-lg border border-purple-300 flex flex-col md:flex-row items-center gap-4">
                      <GenerationalWealthVisual genPayout={res.genPayout} />

                      <div className="text-sm text-purple-900 flex-1 text-center md:text-left">
                        Could pay <strong className="text-purple-700">{fmt(res.genPayout.perBenReal)}</strong> per beneficiary
                        (2025 dollars) for approximately{" "}
                        <strong className="text-purple-700">{res.genPayout.years} years</strong>{" "}
                        {res.genPayout.fundLeftReal > 0
                          ? "with principal remaining"
                          : "until exhaustion"}
                        .
                      </div>
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
                    <span>Calculating...</span>
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

        {/* The Math Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">The Math</CardTitle>
            <CardDescription>Understanding the calculations behind your retirement projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
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
                    <li><strong>Random Walk:</strong> Returns are randomly sampled from historical S&amp;P 500 data (1975-2024), using a seeded pseudo-random number generator for reproducibility. Each year gets a different historical return, bootstrapped with replacement.</li>
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
                    <li>Each living beneficiary receives a fixed annual payout in constant 2025 dollars</li>
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
                <li><strong>S&amp;P 500 Returns:</strong> Historical total return data (1975-2024) used for random walk simulations</li>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

/**
 * State Tax Comparison Tool
 *
 * Helps users understand the tax implications of relocating to different states
 * in retirement. Moving states can save $10k-50k+ per year in retirement.
 *
 * Features:
 * 1. Current State Analysis - income tax, property tax, sales tax, estate tax
 * 2. State Comparison Grid - compare 2-3 states side by side
 * 3. Retirement-Friendly States - no income tax, no retirement income tax, no estate tax
 * 4. Dollar Impact Calculator - savings over time from relocation
 * 5. Caveats - cost of living, healthcare, family, "taxes aren't everything"
 * 6. Part-Year Residency - establishing new residency rules
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  MapPin,
  DollarSign,
  TrendingDown,
  Info,
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2,
  Calculator,
  Home,
  ShoppingCart,
  Landmark,
  Clock,
  Heart,
  Users,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmt } from "@/lib/utils";

// ==================== Types ====================

interface StateTaxComparisonProps {
  currentState?: string;
  retirementIncome?: number;
  ssIncome?: number;
  pensionIncome?: number;
  investmentIncome?: number;
  homeValue?: number;
  annualSpending?: number;
  yearsInRetirement?: number;
}

interface StateTaxData {
  code: string;
  name: string;
  incomeTaxRate: number;
  incomeTaxBrackets?: { limit: number; rate: number }[];
  taxesRetirementIncome: boolean;
  taxesSocialSecurity: boolean;
  taxesPension: boolean;
  propertyTaxRate: number;
  salesTaxRate: number;
  hasEstateTax: boolean;
  estateExemption?: number;
  estateTaxRate?: number;
  hasInheritanceTax: boolean;
  costOfLivingIndex: number;
  medianHomePrice: number;
  healthcareRanking: number;
  notes?: string;
}

interface ComparisonState {
  code: string;
  selected: boolean;
}

// ==================== Comprehensive State Tax Data ====================

const STATE_TAX_DATA: Record<string, StateTaxData> = {
  // No Income Tax States
  AK: {
    code: "AK",
    name: "Alaska",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 1.19,
    salesTaxRate: 0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 127,
    medianHomePrice: 318000,
    healthcareRanking: 36,
    notes: "Residents receive annual PFD dividend. High COL but no state taxes.",
  },
  FL: {
    code: "FL",
    name: "Florida",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.89,
    salesTaxRate: 6.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 100,
    medianHomePrice: 407000,
    healthcareRanking: 31,
    notes: "Most popular retirement destination. Homestead exemption available.",
  },
  NV: {
    code: "NV",
    name: "Nevada",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.55,
    salesTaxRate: 6.85,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 104,
    medianHomePrice: 425000,
    healthcareRanking: 35,
    notes: "Low property taxes. Popular for CA retirees.",
  },
  TX: {
    code: "TX",
    name: "Texas",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 1.80,
    salesTaxRate: 6.25,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 92,
    medianHomePrice: 301000,
    healthcareRanking: 34,
    notes: "No income tax but high property taxes. Over-65 freeze available.",
  },
  WA: {
    code: "WA",
    name: "Washington",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.98,
    salesTaxRate: 6.5,
    hasEstateTax: true,
    estateExemption: 2193000,
    estateTaxRate: 20,
    hasInheritanceTax: false,
    costOfLivingIndex: 118,
    medianHomePrice: 577000,
    healthcareRanking: 7,
    notes: "New 7% capital gains tax on gains over $250k. Estate tax applies.",
  },
  WY: {
    code: "WY",
    name: "Wyoming",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.57,
    salesTaxRate: 4.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 92,
    medianHomePrice: 340000,
    healthcareRanking: 44,
    notes: "Truly tax-friendly. Lower population density.",
  },
  TN: {
    code: "TN",
    name: "Tennessee",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.71,
    salesTaxRate: 7.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 89,
    medianHomePrice: 315000,
    healthcareRanking: 41,
    notes: "Hall Tax on interest/dividends eliminated in 2021. High sales tax.",
  },
  SD: {
    code: "SD",
    name: "South Dakota",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 1.28,
    salesTaxRate: 4.5,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 92,
    medianHomePrice: 290000,
    healthcareRanking: 22,
    notes: "Very tax-friendly. Popular for trust/asset protection.",
  },
  NH: {
    code: "NH",
    name: "New Hampshire",
    incomeTaxRate: 0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 2.18,
    salesTaxRate: 0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 106,
    medianHomePrice: 450000,
    healthcareRanking: 6,
    notes: "5% tax on dividends/interest (phasing out by 2027). Very high property tax.",
  },

  // States with No Tax on Retirement Income
  PA: {
    code: "PA",
    name: "Pennsylvania",
    incomeTaxRate: 3.07,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 1.58,
    salesTaxRate: 6.0,
    hasEstateTax: false,
    hasInheritanceTax: true,
    costOfLivingIndex: 99,
    medianHomePrice: 265000,
    healthcareRanking: 24,
    notes: "Excludes ALL retirement income including 401k/IRA withdrawals. Inheritance tax 4.5-15%.",
  },
  IL: {
    code: "IL",
    name: "Illinois",
    incomeTaxRate: 4.95,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 2.27,
    salesTaxRate: 6.25,
    hasEstateTax: true,
    estateExemption: 4000000,
    estateTaxRate: 16,
    hasInheritanceTax: false,
    costOfLivingIndex: 93,
    medianHomePrice: 250000,
    healthcareRanking: 19,
    notes: "All retirement income exempt. Very high property taxes. Estate tax applies.",
  },
  MS: {
    code: "MS",
    name: "Mississippi",
    incomeTaxRate: 5.0,
    taxesRetirementIncome: false,
    taxesSocialSecurity: false,
    taxesPension: false,
    propertyTaxRate: 0.81,
    salesTaxRate: 7.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 84,
    medianHomePrice: 180000,
    healthcareRanking: 50,
    notes: "Very low COL. All retirement income exempt. Lowest healthcare ranking.",
  },

  // High Tax States (for comparison)
  CA: {
    code: "CA",
    name: "California",
    incomeTaxRate: 13.3,
    incomeTaxBrackets: [
      { limit: 10412, rate: 1.0 },
      { limit: 24684, rate: 2.0 },
      { limit: 38959, rate: 4.0 },
      { limit: 54081, rate: 6.0 },
      { limit: 68350, rate: 8.0 },
      { limit: 349137, rate: 9.3 },
      { limit: 418961, rate: 10.3 },
      { limit: 698271, rate: 11.3 },
      { limit: 1000000, rate: 12.3 },
      { limit: Infinity, rate: 13.3 },
    ],
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.76,
    salesTaxRate: 7.25,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 142,
    medianHomePrice: 793000,
    healthcareRanking: 8,
    notes: "Highest state income tax. Prop 13 limits property tax increases. Great climate/healthcare.",
  },
  NY: {
    code: "NY",
    name: "New York",
    incomeTaxRate: 10.9,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 1.72,
    salesTaxRate: 4.0,
    hasEstateTax: true,
    estateExemption: 6940000,
    estateTaxRate: 16,
    hasInheritanceTax: false,
    costOfLivingIndex: 139,
    medianHomePrice: 435000,
    healthcareRanking: 12,
    notes: "$20k pension exclusion for govt pensions. NYC adds 3.876% local tax. Estate tax cliff.",
  },
  NJ: {
    code: "NJ",
    name: "New Jersey",
    incomeTaxRate: 10.75,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 2.49,
    salesTaxRate: 6.625,
    hasEstateTax: true,
    estateExemption: 0,
    estateTaxRate: 16,
    hasInheritanceTax: true,
    costOfLivingIndex: 115,
    medianHomePrice: 495000,
    healthcareRanking: 5,
    notes: "Highest property taxes in US. Both estate AND inheritance tax. $100k retirement exclusion.",
  },
  CT: {
    code: "CT",
    name: "Connecticut",
    incomeTaxRate: 6.99,
    taxesRetirementIncome: true,
    taxesSocialSecurity: true,
    taxesPension: true,
    propertyTaxRate: 2.14,
    salesTaxRate: 6.35,
    hasEstateTax: true,
    estateExemption: 13610000,
    estateTaxRate: 12,
    hasInheritanceTax: false,
    costOfLivingIndex: 111,
    medianHomePrice: 405000,
    healthcareRanking: 4,
    notes: "Taxes SS above AGI threshold. High property taxes. Estate tax matches federal exemption.",
  },
  MN: {
    code: "MN",
    name: "Minnesota",
    incomeTaxRate: 9.85,
    taxesRetirementIncome: true,
    taxesSocialSecurity: true,
    taxesPension: true,
    propertyTaxRate: 1.12,
    salesTaxRate: 6.875,
    hasEstateTax: true,
    estateExemption: 3000000,
    estateTaxRate: 16,
    hasInheritanceTax: false,
    costOfLivingIndex: 98,
    medianHomePrice: 330000,
    healthcareRanking: 3,
    notes: "Taxes SS above AGI threshold. Estate tax with low exemption. Excellent healthcare.",
  },

  // Middle-ground states
  AZ: {
    code: "AZ",
    name: "Arizona",
    incomeTaxRate: 2.5,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.66,
    salesTaxRate: 5.6,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 103,
    medianHomePrice: 435000,
    healthcareRanking: 28,
    notes: "Flat 2.5% tax. $2,500 pension exclusion. Popular retirement destination.",
  },
  NC: {
    code: "NC",
    name: "North Carolina",
    incomeTaxRate: 4.5,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.84,
    salesTaxRate: 4.75,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 95,
    medianHomePrice: 330000,
    healthcareRanking: 33,
    notes: "Flat tax dropping to 3.99% by 2027. SS exempt. Growing retirement destination.",
  },
  SC: {
    code: "SC",
    name: "South Carolina",
    incomeTaxRate: 6.4,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.57,
    salesTaxRate: 6.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 89,
    medianHomePrice: 295000,
    healthcareRanking: 42,
    notes: "$10,000 retirement deduction. Very low property taxes. Popular for NC/GA border retirees.",
  },
  GA: {
    code: "GA",
    name: "Georgia",
    incomeTaxRate: 5.75,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.92,
    salesTaxRate: 4.0,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 91,
    medianHomePrice: 335000,
    healthcareRanking: 38,
    notes: "$65k retirement exclusion (65+). SS fully exempt. Moving to flat tax.",
  },
  CO: {
    code: "CO",
    name: "Colorado",
    incomeTaxRate: 4.4,
    taxesRetirementIncome: true,
    taxesSocialSecurity: true,
    taxesPension: true,
    propertyTaxRate: 0.51,
    salesTaxRate: 2.9,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 105,
    medianHomePrice: 535000,
    healthcareRanking: 16,
    notes: "SS exclusion up to $24k (65+). $20k retirement exclusion. High altitude benefits.",
  },
  VA: {
    code: "VA",
    name: "Virginia",
    incomeTaxRate: 5.75,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.82,
    salesTaxRate: 5.3,
    hasEstateTax: false,
    hasInheritanceTax: false,
    costOfLivingIndex: 104,
    medianHomePrice: 380000,
    healthcareRanking: 14,
    notes: "$12k age deduction (65+). Military retirement fully exempt.",
  },
  OR: {
    code: "OR",
    name: "Oregon",
    incomeTaxRate: 9.9,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 0.97,
    salesTaxRate: 0,
    hasEstateTax: true,
    estateExemption: 1000000,
    estateTaxRate: 16,
    hasInheritanceTax: false,
    costOfLivingIndex: 113,
    medianHomePrice: 495000,
    healthcareRanking: 9,
    notes: "No sales tax. High income tax. Very low estate threshold ($1M). 9% retirement credit.",
  },
  MD: {
    code: "MD",
    name: "Maryland",
    incomeTaxRate: 5.75,
    taxesRetirementIncome: true,
    taxesSocialSecurity: false,
    taxesPension: true,
    propertyTaxRate: 1.09,
    salesTaxRate: 6.0,
    hasEstateTax: true,
    estateExemption: 5000000,
    estateTaxRate: 16,
    hasInheritanceTax: true,
    costOfLivingIndex: 114,
    medianHomePrice: 425000,
    healthcareRanking: 10,
    notes: "Both estate AND inheritance tax. $36k pension exclusion (65+). Local income taxes.",
  },
};

// US States list for dropdown
const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

// Retirement-friendly state categories
const NO_INCOME_TAX_STATES = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];
const NO_RETIREMENT_TAX_STATES = ["PA", "IL", "MS", "AL", "HI", "IA"];
const NO_ESTATE_TAX_STATES = ["FL", "TX", "NV", "AZ", "NC", "TN", "GA", "PA"];

// ==================== Helper Functions ====================

/**
 * Calculate effective state income tax for retirement income
 */
function calculateStateTax(
  state: StateTaxData,
  totalIncome: number,
  ssIncome: number,
  pensionIncome: number,
  investmentIncome: number
): number {
  if (state.incomeTaxRate === 0) return 0;

  let taxableIncome = totalIncome;

  // Exclude SS if state doesn't tax it
  if (!state.taxesSocialSecurity) {
    taxableIncome -= ssIncome;
  }

  // Exclude pension if state doesn't tax it
  if (!state.taxesPension) {
    taxableIncome -= pensionIncome;
  }

  // Exclude all retirement income if state doesn't tax it
  if (!state.taxesRetirementIncome) {
    // Only investment income (dividends, capital gains) would be taxed for earned income
    // But most retirement-friendly states exempt this too
    taxableIncome = Math.max(0, totalIncome - ssIncome - pensionIncome);
    if (!state.taxesRetirementIncome) {
      taxableIncome = 0;
    }
  }

  if (taxableIncome <= 0) return 0;

  // Use brackets if available, otherwise flat rate
  if (state.incomeTaxBrackets && state.incomeTaxBrackets.length > 0) {
    let tax = 0;
    let remainingIncome = taxableIncome;
    let previousLimit = 0;

    for (const bracket of state.incomeTaxBrackets) {
      const bracketIncome = Math.min(remainingIncome, bracket.limit - previousLimit);
      if (bracketIncome <= 0) break;

      tax += bracketIncome * (bracket.rate / 100);
      remainingIncome -= bracketIncome;
      previousLimit = bracket.limit;
    }

    return tax;
  }

  return taxableIncome * (state.incomeTaxRate / 100);
}

/**
 * Calculate property tax based on home value
 */
function calculatePropertyTax(state: StateTaxData, homeValue: number): number {
  return homeValue * (state.propertyTaxRate / 100);
}

/**
 * Calculate sales tax based on spending (estimate 30% of spending subject to sales tax)
 */
function calculateSalesTax(state: StateTaxData, annualSpending: number): number {
  const taxableSpending = annualSpending * 0.3; // Estimate 30% of spending is taxable
  return taxableSpending * (state.salesTaxRate / 100);
}

/**
 * Calculate total annual tax burden
 */
function calculateTotalTaxBurden(
  state: StateTaxData,
  retirementIncome: number,
  ssIncome: number,
  pensionIncome: number,
  investmentIncome: number,
  homeValue: number,
  annualSpending: number
): {
  incomeTax: number;
  propertyTax: number;
  salesTax: number;
  totalTax: number;
} {
  const totalIncome = retirementIncome + ssIncome + pensionIncome + investmentIncome;
  const incomeTax = calculateStateTax(state, totalIncome, ssIncome, pensionIncome, investmentIncome);
  const propertyTax = calculatePropertyTax(state, homeValue);
  const salesTax = calculateSalesTax(state, annualSpending);

  return {
    incomeTax,
    propertyTax,
    salesTax,
    totalTax: incomeTax + propertyTax + salesTax,
  };
}

// ==================== Sub-Components ====================

/**
 * State selection card
 */
function StateCard({
  state,
  isSelected,
  onSelect,
  onRemove,
  isPrimary = false,
}: {
  state: StateTaxData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  isPrimary?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? isPrimary
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-green-500 bg-green-50 dark:bg-green-950/30"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${isSelected ? (isPrimary ? "text-blue-600" : "text-green-600") : "text-gray-400"}`} />
          <span className="font-medium">{state.name}</span>
          <span className="text-xs text-gray-500">({state.code})</span>
        </div>
        {isSelected && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {state.incomeTaxRate === 0 && (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            No Income Tax
          </Badge>
        )}
        {!state.taxesRetirementIncome && state.incomeTaxRate > 0 && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            No Retirement Tax
          </Badge>
        )}
        {!state.hasEstateTax && (
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            No Estate Tax
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Tax breakdown row
 */
function TaxRow({
  label,
  icon: Icon,
  values,
  format = "currency",
  highlight = false,
}: {
  label: string;
  icon: React.ElementType;
  values: number[];
  format?: "currency" | "percent" | "rank";
  highlight?: boolean;
}) {
  const formatValue = (value: number) => {
    switch (format) {
      case "currency":
        return fmt(value);
      case "percent":
        return `${value.toFixed(2)}%`;
      case "rank":
        return `#${value}`;
      default:
        return value.toString();
    }
  };

  return (
    <div className={`grid grid-cols-${values.length + 1} gap-4 py-2 ${highlight ? "bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm">{label}</span>
      </div>
      {values.map((value, idx) => (
        <div key={idx} className={`text-sm font-medium text-right ${highlight ? "font-bold" : ""}`}>
          {formatValue(value)}
        </div>
      ))}
    </div>
  );
}

// ==================== Main Component ====================

export function StateTaxComparison({
  currentState = "CA",
  retirementIncome = 60000,
  ssIncome = 30000,
  pensionIncome = 0,
  investmentIncome = 20000,
  homeValue = 400000,
  annualSpending = 80000,
  yearsInRetirement = 20,
}: StateTaxComparisonProps) {
  // State for comparison states
  const [selectedCurrentState, setSelectedCurrentState] = useState(currentState);
  const [comparisonStates, setComparisonStates] = useState<string[]>(["FL", "TX"]);
  const [showAllStates, setShowAllStates] = useState(false);

  // Income inputs (local state for user customization)
  const [income, setIncome] = useState({
    retirement: retirementIncome,
    ss: ssIncome,
    pension: pensionIncome,
    investment: investmentIncome,
    homeValue: homeValue,
    spending: annualSpending,
    years: yearsInRetirement,
  });

  // Get state data
  const currentStateData = STATE_TAX_DATA[selectedCurrentState];
  const comparisonStateData = comparisonStates
    .map((code) => STATE_TAX_DATA[code])
    .filter(Boolean);

  // Calculate tax burdens
  const taxBurdens = useMemo(() => {
    const allStates = [currentStateData, ...comparisonStateData].filter(Boolean);
    return allStates.map((state) =>
      calculateTotalTaxBurden(
        state,
        income.retirement,
        income.ss,
        income.pension,
        income.investment,
        income.homeValue,
        income.spending
      )
    );
  }, [currentStateData, comparisonStateData, income]);

  // Calculate savings vs current state
  const savingsVsCurrent = useMemo(() => {
    if (taxBurdens.length < 2) return [];
    const currentTax = taxBurdens[0].totalTax;
    return taxBurdens.slice(1).map((burden) => ({
      annual: currentTax - burden.totalTax,
      lifetime: (currentTax - burden.totalTax) * income.years,
    }));
  }, [taxBurdens, income.years]);

  // Add comparison state
  const addComparisonState = useCallback((stateCode: string) => {
    if (comparisonStates.length < 3 && !comparisonStates.includes(stateCode)) {
      setComparisonStates([...comparisonStates, stateCode]);
    }
  }, [comparisonStates]);

  // Remove comparison state
  const removeComparisonState = useCallback((stateCode: string) => {
    setComparisonStates(comparisonStates.filter((s) => s !== stateCode));
  }, [comparisonStates]);

  // Get retirement-friendly states for quick selection
  const retirementFriendlyStates = useMemo(() => {
    return Object.values(STATE_TAX_DATA)
      .filter((s) => s.incomeTaxRate === 0 || !s.taxesRetirementIncome)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          State Tax Comparison Tool
        </CardTitle>
        <CardDescription>
          Moving states in retirement can save $10,000-$50,000+ per year in taxes.
          Compare your current state with retirement-friendly alternatives.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calculator" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="friendly">Tax-Free States</TabsTrigger>
            <TabsTrigger value="residency">Residency Rules</TabsTrigger>
            <TabsTrigger value="caveats">Important Caveats</TabsTrigger>
          </TabsList>

          {/* ==================== Calculator Tab ==================== */}
          <TabsContent value="calculator" className="space-y-6">
            {/* Income Inputs */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Your Retirement Income
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retirement-income" className="text-xs">
                    401k/IRA Withdrawals
                  </Label>
                  <Input
                    id="retirement-income"
                    type="number"
                    value={income.retirement}
                    onChange={(e) => setIncome({ ...income, retirement: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ss-income" className="text-xs">
                    Social Security
                  </Label>
                  <Input
                    id="ss-income"
                    type="number"
                    value={income.ss}
                    onChange={(e) => setIncome({ ...income, ss: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pension-income" className="text-xs">
                    Pension Income
                  </Label>
                  <Input
                    id="pension-income"
                    type="number"
                    value={income.pension}
                    onChange={(e) => setIncome({ ...income, pension: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investment-income" className="text-xs">
                    Investment Income
                  </Label>
                  <Input
                    id="investment-income"
                    type="number"
                    value={income.investment}
                    onChange={(e) => setIncome({ ...income, investment: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="home-value" className="text-xs">
                    Home Value
                  </Label>
                  <Input
                    id="home-value"
                    type="number"
                    value={income.homeValue}
                    onChange={(e) => setIncome({ ...income, homeValue: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spending" className="text-xs">
                    Annual Spending
                  </Label>
                  <Input
                    id="spending"
                    type="number"
                    value={income.spending}
                    onChange={(e) => setIncome({ ...income, spending: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years" className="text-xs">
                    Years in Retirement
                  </Label>
                  <Input
                    id="years"
                    type="number"
                    value={income.years}
                    onChange={(e) => setIncome({ ...income, years: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* State Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current State */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  Current State
                </Label>
                <Select value={selectedCurrentState} onValueChange={setSelectedCurrentState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your current state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentStateData && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {currentStateData.notes}
                  </div>
                )}
              </div>

              {/* Comparison States */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Compare To (select up to 3)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {comparisonStates.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={() => removeComparisonState(code)}
                    >
                      {STATE_TAX_DATA[code]?.name || code}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  {comparisonStates.length < 3 && (
                    <Select onValueChange={addComparisonState}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Add state..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__header" disabled className="font-semibold">
                          Retirement-Friendly States
                        </SelectItem>
                        {retirementFriendlyStates
                          .filter((s) => !comparisonStates.includes(s.code) && s.code !== selectedCurrentState)
                          .map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tax Comparison Grid */}
            {currentStateData && comparisonStateData.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Annual Tax Burden Comparison
                </h3>

                {/* Header */}
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `1fr repeat(${1 + comparisonStateData.length}, 1fr)` }}>
                  <div></div>
                  <div className="text-center font-medium text-blue-600">
                    {currentStateData.name}
                    <div className="text-xs text-muted-foreground">(Current)</div>
                  </div>
                  {comparisonStateData.map((state) => (
                    <div key={state.code} className="text-center font-medium text-green-600">
                      {state.name}
                    </div>
                  ))}
                </div>

                {/* Tax Rows */}
                <div className="space-y-1 border rounded-lg p-4">
                  <TaxRow
                    label="Income Tax"
                    icon={Landmark}
                    values={taxBurdens.map((b) => b.incomeTax)}
                  />
                  <TaxRow
                    label="Property Tax"
                    icon={Home}
                    values={taxBurdens.map((b) => b.propertyTax)}
                  />
                  <TaxRow
                    label="Sales Tax (est.)"
                    icon={ShoppingCart}
                    values={taxBurdens.map((b) => b.salesTax)}
                  />
                  <Separator className="my-2" />
                  <TaxRow
                    label="Total Annual Tax"
                    icon={DollarSign}
                    values={taxBurdens.map((b) => b.totalTax)}
                    highlight
                  />
                </div>

                {/* Savings Summary */}
                {savingsVsCurrent.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    {comparisonStateData.map((state, idx) => {
                      const savings = savingsVsCurrent[idx];
                      const isPositiveSavings = savings.annual > 0;

                      return (
                        <Card
                          key={state.code}
                          className={`${
                            isPositiveSavings
                              ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                              : "border-red-200 bg-red-50 dark:bg-red-950/20"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">
                                Moving to {state.name}
                              </span>
                              <Badge
                                variant={isPositiveSavings ? "default" : "destructive"}
                                className={isPositiveSavings ? "bg-green-600" : ""}
                              >
                                {isPositiveSavings ? "Saves" : "Costs"}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Annual savings:</span>
                                <span className={`font-bold ${isPositiveSavings ? "text-green-600" : "text-red-600"}`}>
                                  {isPositiveSavings ? "+" : ""}{fmt(savings.annual)}/year
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Over {income.years} years:
                                </span>
                                <span className={`font-bold text-lg ${isPositiveSavings ? "text-green-600" : "text-red-600"}`}>
                                  {isPositiveSavings ? "+" : ""}{fmt(savings.lifetime)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Additional State Info */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {[currentStateData, ...comparisonStateData].map((state, idx) => (
                    <div
                      key={state.code}
                      className={`p-3 rounded-lg border ${
                        idx === 0 ? "border-blue-200 dark:border-blue-800" : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="font-medium mb-2">{state.name}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Income Tax Rate:</span>
                          <span>{state.incomeTaxRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Tax Rate:</span>
                          <span>{state.propertyTaxRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sales Tax:</span>
                          <span>{state.salesTaxRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost of Living:</span>
                          <span>{state.costOfLivingIndex} (US = 100)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Healthcare Rank:</span>
                          <span>#{state.healthcareRanking}/50</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Estate Tax:</span>
                          {state.hasEstateTax ? (
                            <Badge variant="destructive" className="text-xs">Yes</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">None</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== Retirement-Friendly States Tab ==================== */}
          <TabsContent value="friendly" className="space-y-6">
            {/* No Income Tax States */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                No State Income Tax (9 States)
              </h3>
              <p className="text-sm text-muted-foreground">
                These states have zero state income tax, meaning your 401k/IRA withdrawals, pensions,
                investment income, and Social Security are completely state tax-free.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {NO_INCOME_TAX_STATES.map((code) => {
                  const state = STATE_TAX_DATA[code];
                  if (!state) return null;
                  return (
                    <StateCard
                      key={code}
                      state={state}
                      isSelected={comparisonStates.includes(code)}
                      onSelect={() => addComparisonState(code)}
                      onRemove={() => removeComparisonState(code)}
                    />
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* No Retirement Income Tax States */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                No Tax on Retirement Income (6+ States)
              </h3>
              <p className="text-sm text-muted-foreground">
                These states have income tax but fully exempt retirement income including 401k/IRA
                withdrawals and pensions. They may still tax earned income or investment gains.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {NO_RETIREMENT_TAX_STATES.map((code) => {
                  const state = STATE_TAX_DATA[code];
                  if (!state) return null;
                  return (
                    <StateCard
                      key={code}
                      state={state}
                      isSelected={comparisonStates.includes(code)}
                      onSelect={() => addComparisonState(code)}
                      onRemove={() => removeComparisonState(code)}
                    />
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* No Estate Tax States */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-purple-600" />
                No State Estate Tax
              </h3>
              <p className="text-sm text-muted-foreground">
                Most states have no estate tax (only 12 states + DC have one). States with estate
                taxes often have lower exemptions than the federal $13.61M, triggering state tax
                even when federal estate tax doesn't apply.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      States WITH Estate Tax (12 + DC)
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      CT, HI, IL, ME, MD, MA, MN, NY, OR, RI, VT, WA, DC - These states tax
                      estates as low as $1M (OR) to $13.6M (CT/HI). Maryland and New Jersey
                      also have inheritance taxes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Reference Table */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Quick Reference: Top Retirement-Friendly States</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">State</th>
                      <th className="text-center py-2 px-3">Income Tax</th>
                      <th className="text-center py-2 px-3">Taxes SS</th>
                      <th className="text-center py-2 px-3">Taxes Retirement</th>
                      <th className="text-center py-2 px-3">Property Tax</th>
                      <th className="text-center py-2 px-3">Estate Tax</th>
                      <th className="text-center py-2 px-3">COL Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...NO_INCOME_TAX_STATES, ...NO_RETIREMENT_TAX_STATES]
                      .filter((code, idx, arr) => arr.indexOf(code) === idx)
                      .slice(0, 10)
                      .map((code) => {
                        const state = STATE_TAX_DATA[code];
                        if (!state) return null;
                        return (
                          <tr key={code} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-2 px-3 font-medium">{state.name}</td>
                            <td className="text-center py-2 px-3">
                              {state.incomeTaxRate === 0 ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <span>{state.incomeTaxRate}%</span>
                              )}
                            </td>
                            <td className="text-center py-2 px-3">
                              {!state.taxesSocialSecurity ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="text-center py-2 px-3">
                              {!state.taxesRetirementIncome ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="text-center py-2 px-3">{state.propertyTaxRate}%</td>
                            <td className="text-center py-2 px-3">
                              {!state.hasEstateTax ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="text-center py-2 px-3">{state.costOfLivingIndex}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Residency Rules Tab ==================== */}
          <TabsContent value="residency" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Establishing New State Residency
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Simply moving to a new state doesn't automatically change your tax residency.
                    Follow these steps to properly establish domicile in your new state.
                  </p>
                </div>
              </div>
            </div>

            {/* Residency Requirements */}
            <div className="space-y-4">
              <h3 className="font-semibold">Steps to Establish New Residency</h3>
              <div className="grid gap-4">
                {[
                  {
                    title: "1. Physical Presence",
                    description: "Spend majority of time (183+ days) in your new state. Keep a calendar log.",
                    icon: MapPin,
                  },
                  {
                    title: "2. Primary Home",
                    description: "Establish a permanent residence. Sell or rent out your old home if possible.",
                    icon: Home,
                  },
                  {
                    title: "3. Update Official Documents",
                    description: "Change driver's license, vehicle registration, and voter registration to new state.",
                    icon: Building2,
                  },
                  {
                    title: "4. Financial Ties",
                    description: "Open bank accounts in new state. File taxes as resident. Update address with financial institutions.",
                    icon: Landmark,
                  },
                  {
                    title: "5. Social & Community",
                    description: "Join local organizations, clubs, religious institutions. Establish local doctors, dentists.",
                    icon: Users,
                  },
                  {
                    title: "6. Intent to Remain",
                    description: "Document your intent to make the new state your permanent home (will, trusts, correspondence).",
                    icon: Heart,
                  },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Part-Year Residency */}
            <div className="space-y-4">
              <h3 className="font-semibold">Part-Year Residency Considerations</h3>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Year of Move:</strong> You may owe taxes to both states for the year you move.
                      File part-year resident returns in both states.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>183-Day Rule:</strong> Many states consider you a resident if you're present
                      183+ days. High-tax states actively audit this.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>California/New York Warning:</strong> These states are aggressive about
                      maintaining tax residency. Keep meticulous records when leaving.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Snowbird Strategy:</strong> Splitting time between states requires careful
                      planning. Your domicile should be clearly established.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* State-Specific Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold">State-Specific Residency Notes</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-green-600 mb-1">Florida</div>
                  <p className="text-sm text-muted-foreground">
                    File Declaration of Domicile with county clerk. Get FL driver's license within
                    30 days of moving. Register to vote. Popular destination - well-established process.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-green-600 mb-1">Texas</div>
                  <p className="text-sm text-muted-foreground">
                    No formal declaration required. Focus on physical presence and ties. Get TX
                    driver's license and vehicle registration. Over 65 property tax freeze available.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-amber-600 mb-1">California (Leaving)</div>
                  <p className="text-sm text-muted-foreground">
                    Known for pursuing former residents. FTB may audit for years after you leave.
                    Keep detailed records: cell phone records, credit card statements, travel logs.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-amber-600 mb-1">New York (Leaving)</div>
                  <p className="text-sm text-muted-foreground">
                    "Statutory resident" if 184+ days in NY with permanent residence. Audit risk
                    for 2 years after leaving. Similar to CA - keep comprehensive documentation.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Caveats Tab ==================== */}
          <TabsContent value="caveats" className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Taxes Aren't Everything
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    While tax savings can be significant, they shouldn't be the only factor in
                    choosing where to spend your retirement years. Consider these important factors.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Cost of Living */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cost of Living Differences
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    A state with no income tax might have higher costs elsewhere that offset savings:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Housing costs vary dramatically (FL coastal vs TX inland)</li>
                    <li>Property taxes in TX are 2x+ national average</li>
                    <li>Utility costs (heating, cooling) differ by region</li>
                    <li>Food, healthcare, and services pricing varies</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Example:</strong> Moving from CA to TX might save $15k/year in income
                    tax but cost $8k more in property tax and higher insurance.
                  </p>
                </CardContent>
              </Card>

              {/* Healthcare Access */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Healthcare Access & Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Healthcare becomes increasingly important with age. Consider:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Proximity to quality hospitals and specialists</li>
                    <li>Medicare Advantage plan availability</li>
                    <li>State Medicaid expansion (affects low-income years)</li>
                    <li>Wait times and healthcare infrastructure</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Top healthcare states:</strong> MN (#3), CT (#4), NJ (#5), NH (#6)
                    - but all have income taxes. Trade-offs exist.
                  </p>
                </CardContent>
              </Card>

              {/* Family & Community */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Family & Social Connections
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    The value of being near family often outweighs tax savings:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Proximity to children and grandchildren</li>
                    <li>Existing friend networks and community ties</li>
                    <li>Access to support systems as you age</li>
                    <li>Travel costs to visit family if you move away</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Consider:</strong> $10k/year in tax savings means little if you're
                    spending $5k on flights and hotels to see grandkids.
                  </p>
                </CardContent>
              </Card>

              {/* Climate & Lifestyle */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Climate & Lifestyle Fit
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Your happiness in retirement depends on more than finances:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Climate preferences (warm vs moderate, humidity)</li>
                    <li>Natural disaster risks (hurricanes, wildfires, tornadoes)</li>
                    <li>Access to hobbies and activities you enjoy</li>
                    <li>Cultural amenities (arts, dining, entertainment)</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Reality check:</strong> Many retirees who move purely for taxes
                    eventually move back for lifestyle reasons.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Final Thoughts */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mt-6">
              <h3 className="font-semibold mb-3">Making the Right Decision</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The best approach is to create a comprehensive comparison that weighs all factors:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Calculate true financial impact</strong> - Include all taxes, COL
                    differences, and travel costs to maintain family connections.
                  </li>
                  <li>
                    <strong>Visit before committing</strong> - Spend extended time (1-3 months)
                    in potential destinations before making permanent moves.
                  </li>
                  <li>
                    <strong>Consider phased approach</strong> - Rent before buying. Try a location
                    for 1-2 years before establishing permanent residency.
                  </li>
                  <li>
                    <strong>Plan for changes</strong> - Your needs at 65 differ from needs at 85.
                    Healthcare access becomes more critical with age.
                  </li>
                  <li>
                    <strong>Consult professionals</strong> - Work with a tax advisor and estate
                    attorney who understand multi-state issues.
                  </li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <p className="text-xs text-muted-foreground text-center">
            Tax rates and rules change frequently. This tool provides estimates for educational
            purposes only. Consult a tax professional for advice specific to your situation.
            Data sources: State tax agencies, Tax Foundation, AARP, 2024-2025 tax years.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StateTaxComparison;

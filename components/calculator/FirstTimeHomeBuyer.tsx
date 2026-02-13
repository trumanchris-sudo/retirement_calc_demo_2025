"use client";

/**
 * First-Time Homebuyer Guide
 *
 * A comprehensive calculator and guide for first-time homebuyers to understand
 * affordability, true costs, rent vs buy analysis, and the homebuying process.
 *
 * Features:
 * 1. Affordability Calculator - 28/36 rule analysis
 * 2. True Cost of Homeownership - All monthly expenses
 * 3. Rent vs Buy Analysis - Break-even calculation
 * 4. Down Payment Options - Comparison of different scenarios
 * 5. PMI Elimination - When and how to remove PMI
 * 6. First-Time Buyer Programs - FHA, state programs, IRA withdrawal
 * 7. Process Timeline - Step-by-step guide
 * 8. What NOT to Do - Common mistakes to avoid
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Home,
  DollarSign,
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  PiggyBank,
  Shield,
  Info,
  ChevronRight,
  Target,
  Wallet,
  FileText,
  Search,
  Handshake,
  ClipboardCheck,
  Key,
  Ban,
  Lightbulb,
  Scale,
  Percent,
  HelpCircle,
} from "lucide-react";
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from "@/lib/designTokens";
import { cn, fmt, fmtFull, fmtPctRaw } from "@/lib/utils";

// ==================== Types ====================

interface AffordabilityInputs {
  // Income
  grossAnnualIncome: number;
  spouseIncome: number;
  otherIncome: number;

  // Debts (monthly)
  carPayment: number;
  studentLoans: number;
  creditCards: number;
  otherDebt: number;

  // Down payment
  downPaymentSaved: number;

  // Assumptions
  interestRate: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  loanTerm: number;
}

interface HomeownershipCosts {
  // Property details
  homePrice: number;
  downPaymentPercent: number;

  // Monthly costs
  hoaMonthly: number;
  utilitiesMonthly: number;

  // Rates
  interestRate: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
}

interface RentVsBuyInputs {
  homePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  maintenancePercent: number;
  appreciationRate: number;
  investmentReturn: number;
  monthlyRent: number;
  rentGrowthRate: number;
  marginalTaxRate: number;
}

interface AffordabilityResult {
  maxHomePrice: number;
  maxMonthlyPayment: number;
  housingRatio: number;
  dtiRatio: number;
  meetsHousingRule: boolean;
  meetsDtiRule: boolean;
  isAffordable: boolean;
  recommendation: string;
}

interface TrueCostResult {
  mortgagePayment: number;
  propertyTaxes: number;
  insurance: number;
  pmi: number;
  hoa: number;
  maintenance: number;
  utilities: number;
  totalMonthly: number;
  totalAnnual: number;
}

interface RentVsBuyResult {
  breakEvenYears: number;
  fiveYearBuying: number;
  fiveYearRenting: number;
  tenYearBuying: number;
  tenYearRenting: number;
  opportunityCostDownPayment: number;
  recommendation: "buy" | "rent" | "close";
  reasoning: string;
}

// ==================== Constants ====================

const DEFAULT_AFFORDABILITY: AffordabilityInputs = {
  grossAnnualIncome: 85000,
  spouseIncome: 0,
  otherIncome: 0,
  carPayment: 400,
  studentLoans: 300,
  creditCards: 100,
  otherDebt: 0,
  downPaymentSaved: 50000,
  interestRate: 7.0,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1500,
  loanTerm: 30,
};

const DEFAULT_COSTS: HomeownershipCosts = {
  homePrice: 350000,
  downPaymentPercent: 20,
  hoaMonthly: 0,
  utilitiesMonthly: 200,
  interestRate: 7.0,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1500,
};

const DEFAULT_RENT_VS_BUY: RentVsBuyInputs = {
  homePrice: 350000,
  downPaymentPercent: 20,
  interestRate: 7.0,
  propertyTaxRate: 1.2,
  insuranceAnnual: 1500,
  maintenancePercent: 1.0,
  appreciationRate: 3.0,
  investmentReturn: 7.0,
  monthlyRent: 1800,
  rentGrowthRate: 3.0,
  marginalTaxRate: 22,
};

const TIMELINE_STEPS = [
  {
    icon: FileText,
    title: "Pre-Approval",
    duration: "1-2 weeks",
    description: "Get pre-approved for a mortgage. This shows sellers you're serious and helps you understand your budget.",
    tips: [
      "Shop multiple lenders for best rates",
      "Don't open new credit accounts",
      "Gather tax returns, pay stubs, bank statements",
    ],
  },
  {
    icon: Search,
    title: "House Hunting",
    duration: "2-8 weeks",
    description: "Find your dream home! Work with a real estate agent to view properties that match your criteria.",
    tips: [
      "Make a must-have vs nice-to-have list",
      "Visit neighborhoods at different times",
      "Consider commute, schools, future plans",
    ],
  },
  {
    icon: Handshake,
    title: "Offer & Negotiation",
    duration: "1-2 weeks",
    description: "Make an offer, negotiate terms, and get your offer accepted. Your agent will guide you through this.",
    tips: [
      "Don't bid more than you can afford",
      "Include contingencies (inspection, financing)",
      "Earnest money shows you're serious",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Inspection & Appraisal",
    duration: "2-3 weeks",
    description: "Professional inspection reveals issues. Appraisal confirms value for the lender.",
    tips: [
      "NEVER skip the inspection",
      "Negotiate repairs based on findings",
      "Appraisal protects you from overpaying",
    ],
  },
  {
    icon: Key,
    title: "Closing",
    duration: "2-4 weeks",
    description: "Final paperwork, wire funds, and get your keys! The home is officially yours.",
    tips: [
      "Review closing disclosure carefully",
      "Wire transfer only - verify details by phone",
      "Budget 2-5% for closing costs",
    ],
  },
];

const DONT_DO_LIST = [
  {
    title: "Don't buy at the top of your budget",
    description: "Just because you're approved for $X doesn't mean you should spend $X. Leave room for emergencies and lifestyle.",
    severity: "high" as const,
  },
  {
    title: "Don't forget closing costs",
    description: "Budget 2-5% of the home price for closing costs. On a $350K home, that's $7,000-$17,500.",
    severity: "high" as const,
  },
  {
    title: "Don't make big purchases before closing",
    description: "Buying a car, furniture, or appliances on credit can tank your debt-to-income ratio and kill your mortgage approval.",
    severity: "critical" as const,
  },
  {
    title: "Don't skip the inspection",
    description: "A few hundred dollars can save you tens of thousands in hidden repairs. Never waive inspection to win a bidding war.",
    severity: "critical" as const,
  },
  {
    title: "Don't change jobs during the process",
    description: "Lenders want to see stable employment. A job change, especially to a new industry, can delay or derail approval.",
    severity: "medium" as const,
  },
  {
    title: "Don't empty your savings",
    description: "You'll need reserves for emergencies, repairs, and moving costs. Don't put every penny into the down payment.",
    severity: "high" as const,
  },
  {
    title: "Don't ignore the neighborhood",
    description: "You can renovate a house, but you can't change its location. Research schools, crime, commute, and future development.",
    severity: "medium" as const,
  },
  {
    title: "Don't let emotions drive decisions",
    description: "It's a major financial decision. Walk away from bidding wars that push you past your limit. There will be other homes.",
    severity: "medium" as const,
  },
];

// ==================== Helper Functions ====================

function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

function calculatePMI(
  loanAmount: number,
  homeValue: number,
  downPaymentPercent: number
): number {
  // PMI typically required when down payment < 20%
  if (downPaymentPercent >= 20) return 0;
  // PMI is typically 0.5% - 1% of loan amount annually
  // Higher PMI for lower down payments
  let pmiRate = 0.5;
  if (downPaymentPercent < 10) pmiRate = 1.0;
  else if (downPaymentPercent < 15) pmiRate = 0.75;
  return (loanAmount * (pmiRate / 100)) / 12;
}

function calculateAffordability(inputs: AffordabilityInputs): AffordabilityResult {
  const totalMonthlyIncome = (inputs.grossAnnualIncome + inputs.spouseIncome + inputs.otherIncome) / 12;
  const totalMonthlyDebt = inputs.carPayment + inputs.studentLoans + inputs.creditCards + inputs.otherDebt;

  // 28/36 rule
  const maxHousingPayment = totalMonthlyIncome * 0.28;
  const maxTotalDebt = totalMonthlyIncome * 0.36;
  const availableForHousing = maxTotalDebt - totalMonthlyDebt;

  // Use the lower of the two limits
  const maxMonthlyPayment = Math.min(maxHousingPayment, availableForHousing);

  // Back-calculate max home price
  // Monthly payment includes P&I, taxes, insurance
  const monthlyRate = inputs.interestRate / 100 / 12;
  const numPayments = inputs.loanTerm * 12;

  // Estimate taxes + insurance as percentage of home value
  const monthlyTaxInsuranceRate = (inputs.propertyTaxRate + (inputs.insuranceAnnual / 10000 * 100)) / 100 / 12;

  // P&I portion of payment
  const piPayment = maxMonthlyPayment / (1 + monthlyTaxInsuranceRate * 10); // Rough approximation

  // Calculate loan amount from P&I payment
  let maxLoanAmount = 0;
  if (monthlyRate > 0) {
    maxLoanAmount = piPayment * (Math.pow(1 + monthlyRate, numPayments) - 1) /
                    (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
  } else {
    maxLoanAmount = piPayment * numPayments;
  }

  // Max home price = loan + down payment
  // Assume 20% down for this calculation
  const maxHomePrice = maxLoanAmount / 0.8;

  // Calculate current ratios based on max payment
  const housingRatio = (maxHousingPayment / totalMonthlyIncome) * 100;
  const dtiRatio = ((totalMonthlyDebt + maxMonthlyPayment) / totalMonthlyIncome) * 100;

  const meetsHousingRule = housingRatio <= 28;
  const meetsDtiRule = dtiRatio <= 36;
  const isAffordable = meetsHousingRule && meetsDtiRule;

  let recommendation = "";
  if (isAffordable) {
    recommendation = `Based on your income and debts, you could afford a home up to ${fmtFull(maxHomePrice)}. Remember to leave room in your budget for unexpected expenses.`;
  } else if (totalMonthlyDebt > totalMonthlyIncome * 0.2) {
    recommendation = `Your existing debt payments are high. Consider paying down some debt before buying to improve your purchasing power.`;
  } else {
    recommendation = `Based on standard lending guidelines, your maximum affordable home price is ${fmtFull(maxHomePrice)}. Consider saving a larger down payment or increasing income.`;
  }

  return {
    maxHomePrice: Math.max(0, maxHomePrice),
    maxMonthlyPayment: Math.max(0, maxMonthlyPayment),
    housingRatio: Math.min(housingRatio, 100),
    dtiRatio: Math.min(dtiRatio, 100),
    meetsHousingRule,
    meetsDtiRule,
    isAffordable,
    recommendation,
  };
}

function calculateTrueCost(costs: HomeownershipCosts): TrueCostResult {
  const downPayment = costs.homePrice * (costs.downPaymentPercent / 100);
  const loanAmount = costs.homePrice - downPayment;

  const mortgagePayment = calculateMortgagePayment(loanAmount, costs.interestRate, 30);
  const propertyTaxes = (costs.homePrice * (costs.propertyTaxRate / 100)) / 12;
  const insurance = costs.insuranceAnnual / 12;
  const pmi = calculatePMI(loanAmount, costs.homePrice, costs.downPaymentPercent);
  const maintenance = (costs.homePrice * 0.01) / 12; // 1% of home value per year

  const totalMonthly = mortgagePayment + propertyTaxes + insurance + pmi +
                       costs.hoaMonthly + maintenance + costs.utilitiesMonthly;

  return {
    mortgagePayment,
    propertyTaxes,
    insurance,
    pmi,
    hoa: costs.hoaMonthly,
    maintenance,
    utilities: costs.utilitiesMonthly,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
  };
}

function calculateRentVsBuy(inputs: RentVsBuyInputs): RentVsBuyResult {
  const downPayment = inputs.homePrice * (inputs.downPaymentPercent / 100);
  const loanAmount = inputs.homePrice - downPayment;
  const closingCosts = inputs.homePrice * 0.03; // 3% closing costs
  const totalInitialCost = downPayment + closingCosts;

  const monthlyMortgage = calculateMortgagePayment(loanAmount, inputs.interestRate, 30);
  const monthlyTaxes = (inputs.homePrice * (inputs.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = inputs.insuranceAnnual / 12;
  const monthlyPMI = calculatePMI(loanAmount, inputs.homePrice, inputs.downPaymentPercent);
  const monthlyMaintenance = (inputs.homePrice * (inputs.maintenancePercent / 100)) / 12;

  // Calculate cumulative costs over time
  let buyingCost = totalInitialCost;
  let rentingCost = 0;
  let investedDownPayment = downPayment + closingCosts;
  let homeValue = inputs.homePrice;
  let monthlyRent = inputs.monthlyRent;
  let breakEvenYear = -1;

  for (let year = 1; year <= 30; year++) {
    // Annual buying costs
    const annualBuyingCosts = (monthlyMortgage + monthlyTaxes + monthlyInsurance +
                               (year <= 5 ? monthlyPMI : 0) + monthlyMaintenance) * 12;
    buyingCost += annualBuyingCosts;

    // Home appreciation
    homeValue *= (1 + inputs.appreciationRate / 100);

    // Annual renting costs
    const annualRentCost = monthlyRent * 12;
    rentingCost += annualRentCost;
    monthlyRent *= (1 + inputs.rentGrowthRate / 100);

    // Investment growth of down payment
    investedDownPayment *= (1 + inputs.investmentReturn / 100);

    // Net position: Home equity vs invested down payment + rent savings
    const homeEquity = homeValue - loanAmount; // Simplified
    const netBuying = homeEquity - buyingCost;
    const netRenting = investedDownPayment - rentingCost;

    if (breakEvenYear === -1 && netBuying > netRenting) {
      breakEvenYear = year;
    }
  }

  // Calculate 5 and 10 year scenarios
  const fiveYearHomeValue = inputs.homePrice * Math.pow(1 + inputs.appreciationRate / 100, 5);
  const tenYearHomeValue = inputs.homePrice * Math.pow(1 + inputs.appreciationRate / 100, 10);

  const fiveYearEquity = fiveYearHomeValue - loanAmount * 0.9; // Rough equity estimate
  const tenYearEquity = tenYearHomeValue - loanAmount * 0.75;

  const fiveYearBuyingCosts = totalInitialCost + (monthlyMortgage + monthlyTaxes +
                               monthlyInsurance + monthlyMaintenance) * 60;
  const tenYearBuyingCosts = totalInitialCost + (monthlyMortgage + monthlyTaxes +
                              monthlyInsurance + monthlyMaintenance) * 120;

  let fiveYearRentCost = 0;
  let tenYearRentCost = 0;
  let rent = inputs.monthlyRent;
  for (let year = 1; year <= 10; year++) {
    const annualRent = rent * 12;
    if (year <= 5) fiveYearRentCost += annualRent;
    tenYearRentCost += annualRent;
    rent *= (1 + inputs.rentGrowthRate / 100);
  }

  const fiveYearInvestment = (downPayment + closingCosts) * Math.pow(1 + inputs.investmentReturn / 100, 5);
  const tenYearInvestment = (downPayment + closingCosts) * Math.pow(1 + inputs.investmentReturn / 100, 10);

  const fiveYearBuying = fiveYearEquity - fiveYearBuyingCosts;
  const fiveYearRenting = fiveYearInvestment - fiveYearRentCost;
  const tenYearBuying = tenYearEquity - tenYearBuyingCosts;
  const tenYearRenting = tenYearInvestment - tenYearRentCost;

  const opportunityCostDownPayment = tenYearInvestment - totalInitialCost;

  let recommendation: "buy" | "rent" | "close";
  let reasoning: string;

  if (breakEvenYear <= 3) {
    recommendation = "buy";
    reasoning = `Buying becomes advantageous in just ${breakEvenYear} years. If you plan to stay at least 5 years, buying is likely the better financial choice.`;
  } else if (breakEvenYear <= 5) {
    recommendation = "close";
    reasoning = `Break-even occurs around year ${breakEvenYear}. The decision depends on your timeline and certainty about staying in the area.`;
  } else if (breakEvenYear <= 7) {
    recommendation = "rent";
    reasoning = `It takes ${breakEvenYear} years to break even. Unless you're certain you'll stay 7+ years, renting may be better.`;
  } else {
    recommendation = "rent";
    reasoning = `Break-even is ${breakEvenYear > 30 ? "beyond 30" : breakEvenYear} years out. In this market/situation, renting is likely more financially advantageous.`;
  }

  return {
    breakEvenYears: breakEvenYear === -1 ? 30 : breakEvenYear,
    fiveYearBuying,
    fiveYearRenting,
    tenYearBuying,
    tenYearRenting,
    opportunityCostDownPayment,
    recommendation,
    reasoning,
  };
}

// ==================== Sub-Components ====================

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  tooltip,
  min = 0,
  step = 1,
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <Label className={cn(TYPOGRAPHY.inputLabel, "flex items-center gap-1")}>
        {label}
        {tooltip && (
          <span title={tooltip}>
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </span>
        )}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(
            "text-right",
            prefix && "pl-7",
            suffix && "pr-8"
          )}
          min={min}
          step={step}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ElementType;
  status?: "positive" | "negative" | "neutral" | "warning";
}

function MetricCard({ label, value, subtext, icon: Icon, status = "neutral" }: MetricCardProps) {
  const colors = METRIC_COLORS[status];
  return (
    <div className={cn("rounded-lg p-4 border", colors.bg, colors.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={TYPOGRAPHY.metricLabel}>{label}</p>
          <p className={cn(TYPOGRAPHY.metricMedium, colors.text)}>{value}</p>
          {subtext && <p className={TYPOGRAPHY.helperText}>{subtext}</p>}
        </div>
        {Icon && <Icon className={cn("h-5 w-5", colors.text)} />}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

interface FirstTimeHomeBuyerProps {
  compact?: boolean;
}

export function FirstTimeHomeBuyer({ compact = false }: FirstTimeHomeBuyerProps) {
  // Active section state
  const [activeSection, setActiveSection] = useState<
    "affordability" | "trueCost" | "rentVsBuy" | "downPayment" | "pmi" | "programs" | "timeline" | "donts"
  >("affordability");

  // Affordability inputs
  const [affordability, setAffordability] = useState<AffordabilityInputs>(DEFAULT_AFFORDABILITY);

  // True cost inputs
  const [costs, setCosts] = useState<HomeownershipCosts>(DEFAULT_COSTS);

  // Rent vs buy inputs
  const [rentVsBuy, setRentVsBuy] = useState<RentVsBuyInputs>(DEFAULT_RENT_VS_BUY);

  // Down payment scenario
  const [selectedDownPayment, setSelectedDownPayment] = useState<5 | 10 | 20>(20);

  // VA eligibility
  const [isVAEligible, setIsVAEligible] = useState(false);

  // Calculations
  const affordabilityResult = useMemo(() => calculateAffordability(affordability), [affordability]);
  const trueCostResult = useMemo(() => calculateTrueCost(costs), [costs]);
  const rentVsBuyResult = useMemo(() => calculateRentVsBuy(rentVsBuy), [rentVsBuy]);

  // Update handlers
  const updateAffordability = useCallback(<K extends keyof AffordabilityInputs>(
    key: K,
    value: AffordabilityInputs[K]
  ) => {
    setAffordability((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateCosts = useCallback(<K extends keyof HomeownershipCosts>(
    key: K,
    value: HomeownershipCosts[K]
  ) => {
    setCosts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateRentVsBuy = useCallback(<K extends keyof RentVsBuyInputs>(
    key: K,
    value: RentVsBuyInputs[K]
  ) => {
    setRentVsBuy((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Navigation tabs
  const tabs = [
    { id: "affordability", label: "Affordability", icon: Calculator },
    { id: "trueCost", label: "True Cost", icon: DollarSign },
    { id: "rentVsBuy", label: "Rent vs Buy", icon: Scale },
    { id: "downPayment", label: "Down Payment", icon: PiggyBank },
    { id: "pmi", label: "PMI", icon: Percent },
    { id: "programs", label: "Programs", icon: Building2 },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "donts", label: "Don'ts", icon: Ban },
  ] as const;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {/* Header */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                First-Time Homebuyer Guide
              </CardTitle>
              <CardDescription className="text-base">
                The biggest purchase of your life - demystified
              </CardDescription>
            </div>
            <Badge className={cn(STATUS.info, "border-0")}>
              Interactive Guide
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className={TYPOGRAPHY.body}>
            Buying your first home is exciting but complex. This comprehensive guide and calculator
            will help you understand exactly how much you can afford, the true costs of ownership,
            and whether buying makes sense for your situation.
          </p>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeSection === tab.id
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Section 1: Affordability Calculator */}
      {activeSection === "affordability" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Your Financial Situation
                </CardTitle>
                <CardDescription>
                  We use the 28/36 rule used by most lenders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Income */}
                <div className="space-y-3">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>Monthly Income</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField
                      label="Your Gross Annual Income"
                      value={affordability.grossAnnualIncome}
                      onChange={(v) => updateAffordability("grossAnnualIncome", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Spouse Income (if any)"
                      value={affordability.spouseIncome}
                      onChange={(v) => updateAffordability("spouseIncome", v)}
                      prefix="$"
                    />
                  </div>
                  <InputField
                    label="Other Income (bonuses, side income)"
                    value={affordability.otherIncome}
                    onChange={(v) => updateAffordability("otherIncome", v)}
                    prefix="$"
                  />
                </div>

                {/* Debts */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>Monthly Debt Payments</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Car Payment"
                      value={affordability.carPayment}
                      onChange={(v) => updateAffordability("carPayment", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Student Loans"
                      value={affordability.studentLoans}
                      onChange={(v) => updateAffordability("studentLoans", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Credit Card Minimum"
                      value={affordability.creditCards}
                      onChange={(v) => updateAffordability("creditCards", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Other Debt"
                      value={affordability.otherDebt}
                      onChange={(v) => updateAffordability("otherDebt", v)}
                      prefix="$"
                    />
                  </div>
                </div>

                {/* Down Payment */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>Savings</h4>
                  <InputField
                    label="Down Payment Saved"
                    value={affordability.downPaymentSaved}
                    onChange={(v) => updateAffordability("downPaymentSaved", v)}
                    prefix="$"
                  />
                </div>

                {/* Assumptions */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>Market Assumptions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Interest Rate"
                      value={affordability.interestRate}
                      onChange={(v) => updateAffordability("interestRate", v)}
                      suffix="%"
                      step={0.125}
                    />
                    <InputField
                      label="Property Tax Rate"
                      value={affordability.propertyTaxRate}
                      onChange={(v) => updateAffordability("propertyTaxRate", v)}
                      suffix="%"
                      step={0.1}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {/* Main Result */}
              <Card className={cn(
                "border-2",
                affordabilityResult.isAffordable
                  ? "border-green-200 dark:border-green-800"
                  : "border-amber-200 dark:border-amber-800"
              )}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className={cn(
                      "inline-flex p-4 rounded-full",
                      affordabilityResult.isAffordable
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-amber-100 dark:bg-amber-900/30"
                    )}>
                      <Home className={cn(
                        "h-10 w-10",
                        affordabilityResult.isAffordable
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      )} />
                    </div>
                    <div>
                      <p className={TYPOGRAPHY.metricLabel}>You Can Afford Up To</p>
                      <p className={cn(
                        TYPOGRAPHY.metricLarge,
                        affordabilityResult.isAffordable
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}>
                        {fmtFull(affordabilityResult.maxHomePrice)}
                      </p>
                      <p className={TYPOGRAPHY.body}>
                        Maximum monthly payment: {fmtFull(affordabilityResult.maxMonthlyPayment)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 28/36 Rule Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    The 28/36 Rule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Housing Ratio (28%) */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.inputLabel}>Housing Ratio</span>
                      <span className={cn(
                        "font-medium",
                        affordabilityResult.housingRatio <= 28 ? "text-green-600" : "text-red-600"
                      )}>
                        {fmtPctRaw(Math.min(affordabilityResult.housingRatio, 28), 0)} of 28% max
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={Math.min((affordabilityResult.housingRatio / 28) * 100, 100)}
                        className="h-4"
                      />
                      <div className="absolute right-0 top-0 h-4 w-0.5 bg-red-500" />
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Housing costs should be less than 28% of gross monthly income
                    </p>
                  </div>

                  {/* DTI Ratio (36%) */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.inputLabel}>Debt-to-Income Ratio</span>
                      <span className={cn(
                        "font-medium",
                        affordabilityResult.dtiRatio <= 36 ? "text-green-600" : "text-red-600"
                      )}>
                        {fmtPctRaw(Math.min(affordabilityResult.dtiRatio, 36), 0)} of 36% max
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={Math.min((affordabilityResult.dtiRatio / 36) * 100, 100)}
                        className="h-4"
                      />
                      <div className="absolute right-0 top-0 h-4 w-0.5 bg-red-500" />
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Total debt (including housing) should be less than 36% of gross income
                    </p>
                  </div>

                  {/* Status */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    affordabilityResult.isAffordable
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  )}>
                    <div className="flex items-start gap-3">
                      {affordabilityResult.isAffordable ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      )}
                      <p className={TYPOGRAPHY.body}>
                        {affordabilityResult.recommendation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: True Cost of Homeownership */}
      {activeSection === "trueCost" && (
        <div className="space-y-6">
          <Alert className="border-2 border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5" />
            <AlertTitle>The Hidden Costs</AlertTitle>
            <AlertDescription>
              Your mortgage payment is just the beginning. Property taxes, insurance, maintenance,
              and more can add 30-50% to your monthly housing costs.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Home Price"
                    value={costs.homePrice}
                    onChange={(v) => updateCosts("homePrice", v)}
                    prefix="$"
                  />
                  <InputField
                    label="Down Payment"
                    value={costs.downPaymentPercent}
                    onChange={(v) => updateCosts("downPaymentPercent", v)}
                    suffix="%"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Interest Rate"
                    value={costs.interestRate}
                    onChange={(v) => updateCosts("interestRate", v)}
                    suffix="%"
                    step={0.125}
                  />
                  <InputField
                    label="Property Tax Rate"
                    value={costs.propertyTaxRate}
                    onChange={(v) => updateCosts("propertyTaxRate", v)}
                    suffix="%"
                    step={0.1}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Annual Insurance"
                    value={costs.insuranceAnnual}
                    onChange={(v) => updateCosts("insuranceAnnual", v)}
                    prefix="$"
                  />
                  <InputField
                    label="Monthly HOA"
                    value={costs.hoaMonthly}
                    onChange={(v) => updateCosts("hoaMonthly", v)}
                    prefix="$"
                  />
                </div>
                <InputField
                  label="Monthly Utilities"
                  value={costs.utilitiesMonthly}
                  onChange={(v) => updateCosts("utilitiesMonthly", v)}
                  prefix="$"
                />
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Monthly Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Individual costs */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className={TYPOGRAPHY.body}>Mortgage (P&I)</span>
                    <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.mortgagePayment)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className={TYPOGRAPHY.body}>Property Taxes</span>
                    <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.propertyTaxes)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className={TYPOGRAPHY.body}>Insurance</span>
                    <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.insurance)}</span>
                  </div>
                  {trueCostResult.pmi > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className={cn(TYPOGRAPHY.body, "text-amber-600")}>
                        PMI <span className="text-xs">(until 20% equity)</span>
                      </span>
                      <span className={cn(TYPOGRAPHY.metricSmall, "text-amber-600")}>
                        {fmtFull(trueCostResult.pmi)}
                      </span>
                    </div>
                  )}
                  {trueCostResult.hoa > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className={TYPOGRAPHY.body}>HOA Fees</span>
                      <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.hoa)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className={TYPOGRAPHY.body}>
                      Maintenance <span className="text-xs">(1% of value/year)</span>
                    </span>
                    <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.maintenance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className={TYPOGRAPHY.body}>Utilities</span>
                    <span className={TYPOGRAPHY.metricSmall}>{fmtFull(trueCostResult.utilities)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <span className={TYPOGRAPHY.sectionHeader}>Total Monthly</span>
                    <span className={cn(TYPOGRAPHY.metricMedium, "text-blue-600 dark:text-blue-400")}>
                      {fmtFull(trueCostResult.totalMonthly)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={TYPOGRAPHY.bodyMuted}>Annual Total</span>
                    <span className={TYPOGRAPHY.body}>{fmtFull(trueCostResult.totalAnnual)}</span>
                  </div>
                </div>

                {/* Warning if mortgage is much less than total */}
                {trueCostResult.mortgagePayment < trueCostResult.totalMonthly * 0.7 && (
                  <Alert className="border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm">
                      Your additional costs add {fmtPctRaw(
                        ((trueCostResult.totalMonthly - trueCostResult.mortgagePayment) / trueCostResult.mortgagePayment) * 100,
                        0
                      )} to your mortgage payment. Make sure to budget for the full amount!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Section 3: Rent vs Buy Analysis */}
      {activeSection === "rentVsBuy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Compare Your Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Buying Inputs */}
                <div className="space-y-3">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>If You Buy</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Home Price"
                      value={rentVsBuy.homePrice}
                      onChange={(v) => updateRentVsBuy("homePrice", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Down Payment"
                      value={rentVsBuy.downPaymentPercent}
                      onChange={(v) => updateRentVsBuy("downPaymentPercent", v)}
                      suffix="%"
                    />
                    <InputField
                      label="Interest Rate"
                      value={rentVsBuy.interestRate}
                      onChange={(v) => updateRentVsBuy("interestRate", v)}
                      suffix="%"
                      step={0.125}
                    />
                    <InputField
                      label="Appreciation Rate"
                      value={rentVsBuy.appreciationRate}
                      onChange={(v) => updateRentVsBuy("appreciationRate", v)}
                      suffix="%"
                      tooltip="Historical average: 3-4%"
                    />
                  </div>
                </div>

                {/* Renting Inputs */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className={TYPOGRAPHY.subSectionHeader}>If You Rent</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Monthly Rent"
                      value={rentVsBuy.monthlyRent}
                      onChange={(v) => updateRentVsBuy("monthlyRent", v)}
                      prefix="$"
                    />
                    <InputField
                      label="Rent Growth Rate"
                      value={rentVsBuy.rentGrowthRate}
                      onChange={(v) => updateRentVsBuy("rentGrowthRate", v)}
                      suffix="%"
                    />
                    <InputField
                      label="Investment Return"
                      value={rentVsBuy.investmentReturn}
                      onChange={(v) => updateRentVsBuy("investmentReturn", v)}
                      suffix="%"
                      tooltip="If you invest the down payment instead"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {/* Break-even */}
              <Card className={cn(
                "border-2",
                rentVsBuyResult.recommendation === "buy"
                  ? "border-green-200 dark:border-green-800"
                  : rentVsBuyResult.recommendation === "rent"
                  ? "border-blue-200 dark:border-blue-800"
                  : "border-amber-200 dark:border-amber-800"
              )}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className={TYPOGRAPHY.metricLabel}>Break-Even Point</p>
                    <p className={cn(
                      TYPOGRAPHY.metricLarge,
                      rentVsBuyResult.recommendation === "buy"
                        ? "text-green-600 dark:text-green-400"
                        : rentVsBuyResult.recommendation === "rent"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}>
                      {rentVsBuyResult.breakEvenYears} Years
                    </p>
                    <p className={TYPOGRAPHY.body}>
                      If you stay {rentVsBuyResult.breakEvenYears}+ years, buying wins
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>5 & 10 Year Comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 5 Year */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                      <p className={TYPOGRAPHY.helperText}>5-Year Buying</p>
                      <p className={cn(
                        TYPOGRAPHY.metricSmall,
                        rentVsBuyResult.fiveYearBuying > rentVsBuyResult.fiveYearRenting
                          ? "text-green-600"
                          : "text-muted-foreground"
                      )}>
                        {fmt(rentVsBuyResult.fiveYearBuying)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-center">
                      <p className={TYPOGRAPHY.helperText}>5-Year Renting</p>
                      <p className={cn(
                        TYPOGRAPHY.metricSmall,
                        rentVsBuyResult.fiveYearRenting > rentVsBuyResult.fiveYearBuying
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      )}>
                        {fmt(rentVsBuyResult.fiveYearRenting)}
                      </p>
                    </div>
                  </div>

                  {/* 10 Year */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                      <p className={TYPOGRAPHY.helperText}>10-Year Buying</p>
                      <p className={cn(
                        TYPOGRAPHY.metricSmall,
                        rentVsBuyResult.tenYearBuying > rentVsBuyResult.tenYearRenting
                          ? "text-green-600"
                          : "text-muted-foreground"
                      )}>
                        {fmt(rentVsBuyResult.tenYearBuying)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-center">
                      <p className={TYPOGRAPHY.helperText}>10-Year Renting</p>
                      <p className={cn(
                        TYPOGRAPHY.metricSmall,
                        rentVsBuyResult.tenYearRenting > rentVsBuyResult.tenYearBuying
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      )}>
                        {fmt(rentVsBuyResult.tenYearRenting)}
                      </p>
                    </div>
                  </div>

                  {/* Opportunity Cost */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className={TYPOGRAPHY.inputLabel}>Opportunity Cost of Down Payment</p>
                        <p className={cn(TYPOGRAPHY.metricSmall, "text-amber-600")}>
                          {fmt(rentVsBuyResult.opportunityCostDownPayment)}
                        </p>
                        <p className={TYPOGRAPHY.helperText}>
                          What your down payment could grow to if invested instead (10 years)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation */}
              <div className={cn(
                "p-4 rounded-lg border",
                rentVsBuyResult.recommendation === "buy"
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : rentVsBuyResult.recommendation === "rent"
                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              )}>
                <div className="flex items-start gap-3">
                  <Lightbulb className={cn(
                    "h-5 w-5 mt-0.5",
                    rentVsBuyResult.recommendation === "buy"
                      ? "text-green-600"
                      : rentVsBuyResult.recommendation === "rent"
                      ? "text-blue-600"
                      : "text-amber-600"
                  )} />
                  <p className={TYPOGRAPHY.body}>
                    {rentVsBuyResult.reasoning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Down Payment Options */}
      {activeSection === "downPayment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 20% Down */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              selectedDownPayment === 20
                ? "border-green-500 ring-2 ring-green-500/20"
                : "border-muted hover:border-green-300"
            )}
            onClick={() => setSelectedDownPayment(20)}
            >
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className={TYPOGRAPHY.sectionHeader}>20% Down</h3>
                <Badge className={cn(STATUS.success, "mt-2")}>Best Option</Badge>
                <ul className={cn(TYPOGRAPHY.bodyMuted, "mt-4 text-left space-y-2")}>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    No PMI required
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Best interest rates
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Lower monthly payment
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Instant equity
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 10-20% Down */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              selectedDownPayment === 10
                ? "border-blue-500 ring-2 ring-blue-500/20"
                : "border-muted hover:border-blue-300"
            )}
            onClick={() => setSelectedDownPayment(10)}
            >
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className={TYPOGRAPHY.sectionHeader}>10-20% Down</h3>
                <Badge className={cn(STATUS.info, "mt-2")}>Acceptable</Badge>
                <ul className={cn(TYPOGRAPHY.bodyMuted, "mt-4 text-left space-y-2")}>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    PMI required
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Decent rates available
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Keep more savings
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    PMI drops at 20% equity
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 3-5% Down */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              selectedDownPayment === 5
                ? "border-amber-500 ring-2 ring-amber-500/20"
                : "border-muted hover:border-amber-300"
            )}
            onClick={() => setSelectedDownPayment(5)}
            >
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className={TYPOGRAPHY.sectionHeader}>3-5% Down</h3>
                <Badge className={cn(STATUS.warning, "mt-2")}>FHA/Conventional</Badge>
                <ul className={cn(TYPOGRAPHY.bodyMuted, "mt-4 text-left space-y-2")}>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    Higher PMI costs
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    Higher interest rate
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Get in market sooner
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    FHA allows 3.5%
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 0% Down (VA) */}
            <Card className={cn(
              "border-2 cursor-pointer transition-all",
              isVAEligible
                ? "border-purple-500 ring-2 ring-purple-500/20"
                : "border-muted hover:border-purple-300"
            )}
            onClick={() => setIsVAEligible(!isVAEligible)}
            >
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className={TYPOGRAPHY.sectionHeader}>0% Down</h3>
                <Badge className="bg-purple-100 text-purple-700 border-0 mt-2">VA Loan</Badge>
                <ul className={cn(TYPOGRAPHY.bodyMuted, "mt-4 text-left space-y-2")}>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    No down payment
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    No PMI ever
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Competitive rates
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    Veterans only
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Cost Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Down Payment Comparison on {fmtFull(costs.homePrice)} Home</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Scenario</th>
                      <th className="text-right py-3 px-4">Down Payment</th>
                      <th className="text-right py-3 px-4">Loan Amount</th>
                      <th className="text-right py-3 px-4">Monthly P&I</th>
                      <th className="text-right py-3 px-4">Monthly PMI</th>
                      <th className="text-right py-3 px-4">Total Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[20, 10, 5, 3].map((pct) => {
                      const dp = costs.homePrice * (pct / 100);
                      const loan = costs.homePrice - dp;
                      const pi = calculateMortgagePayment(loan, costs.interestRate, 30);
                      const pmi = calculatePMI(loan, costs.homePrice, pct);
                      return (
                        <tr key={pct} className="border-b">
                          <td className="py-3 px-4 font-medium">{pct}% Down</td>
                          <td className="text-right py-3 px-4">{fmtFull(dp)}</td>
                          <td className="text-right py-3 px-4">{fmtFull(loan)}</td>
                          <td className="text-right py-3 px-4">{fmtFull(pi)}</td>
                          <td className={cn(
                            "text-right py-3 px-4",
                            pmi > 0 ? "text-amber-600" : "text-green-600"
                          )}>
                            {pmi > 0 ? fmtFull(pmi) : "None"}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            {fmtFull(pi + pmi)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 5: PMI Elimination */}
      {activeSection === "pmi" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Private Mortgage Insurance (PMI)
              </CardTitle>
              <CardDescription>
                PMI protects the lender (not you) when you have less than 20% equity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What is PMI */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className={cn(TYPOGRAPHY.sectionHeader, "text-amber-700 dark:text-amber-300 mb-2")}>
                  What You're Paying For
                </h4>
                <p className={TYPOGRAPHY.body}>
                  PMI typically costs 0.5% - 1% of your loan amount annually. On a $300,000 loan,
                  that's $125 - $250/month that provides zero benefit to you.
                </p>
              </div>

              {/* How to Remove PMI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <h4 className={TYPOGRAPHY.sectionHeader}>At 20% Equity</h4>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Request removal once your loan balance reaches 80% of the original home value.
                      You must be current on payments.
                    </p>
                    <Badge className={cn(STATUS.info, "mt-3")}>Requires Request</Badge>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className={TYPOGRAPHY.sectionHeader}>At 22% Equity</h4>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      PMI is automatically removed when your loan balance reaches 78% of the
                      original purchase price. No action needed.
                    </p>
                    <Badge className={cn(STATUS.success, "mt-3")}>Automatic</Badge>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <h4 className={TYPOGRAPHY.sectionHeader}>Reappraisal</h4>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      If your home has appreciated significantly, request a new appraisal.
                      If it shows 20%+ equity, you can remove PMI early.
                    </p>
                    <Badge className="bg-purple-100 text-purple-700 border-0 mt-3">
                      Costs $300-500
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* PMI Calculator */}
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className={cn(TYPOGRAPHY.sectionHeader, "mb-4")}>PMI Cost Calculator</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className={TYPOGRAPHY.inputLabel}>Home Price</Label>
                    <p className={TYPOGRAPHY.metricSmall}>{fmtFull(costs.homePrice)}</p>
                  </div>
                  <div>
                    <Label className={TYPOGRAPHY.inputLabel}>Down Payment</Label>
                    <p className={TYPOGRAPHY.metricSmall}>{costs.downPaymentPercent}%</p>
                  </div>
                  <div>
                    <Label className={TYPOGRAPHY.inputLabel}>Monthly PMI</Label>
                    <p className={cn(
                      TYPOGRAPHY.metricSmall,
                      trueCostResult.pmi > 0 ? "text-amber-600" : "text-green-600"
                    )}>
                      {trueCostResult.pmi > 0 ? fmtFull(trueCostResult.pmi) : "No PMI!"}
                    </p>
                  </div>
                </div>
                {trueCostResult.pmi > 0 && (
                  <p className={cn(TYPOGRAPHY.bodyMuted, "mt-4")}>
                    You're paying {fmtFull(trueCostResult.pmi * 12)}/year in PMI.
                    To eliminate PMI, you need 20% equity ({fmtFull(costs.homePrice * 0.2)}).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 6: First-Time Buyer Programs */}
      {activeSection === "programs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FHA Loans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  FHA Loans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className={TYPOGRAPHY.body}>
                  Government-backed loans with lower down payment and credit score requirements.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>3.5% down payment minimum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Credit scores as low as 580</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Gift funds allowed for down payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className={TYPOGRAPHY.body}>Mortgage insurance for life of loan</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* State/Local Programs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-600" />
                  State & Local Programs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className={TYPOGRAPHY.body}>
                  Many states and cities offer first-time buyer assistance. Check your local options.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Down payment assistance grants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Low-interest second mortgages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Tax credits for mortgage interest</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className={TYPOGRAPHY.body}>Income limits often apply</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Down Payment Assistance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-purple-600" />
                  Down Payment Assistance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className={TYPOGRAPHY.body}>
                  Programs that help cover your down payment and closing costs.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Grants (free money!)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Forgivable loans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Employer assistance programs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className={TYPOGRAPHY.body}>Often require homebuyer education</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IRA Withdrawal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-600" />
                  IRA First-Time Buyer Withdrawal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className={TYPOGRAPHY.body}>
                  First-time buyers can withdraw up to $10,000 from an IRA without the 10% early
                  withdrawal penalty.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>$10,000 penalty-free from IRA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>$20,000 if married (each spouse)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className={TYPOGRAPHY.body}>Still owe income taxes (Traditional IRA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className={TYPOGRAPHY.body}>Roth contributions always tax-free</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Section 7: Process Timeline */}
      {activeSection === "timeline" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                The Homebuying Timeline
              </CardTitle>
              <CardDescription>
                From first search to getting your keys - typically 8-12 weeks total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-800" />

                {/* Timeline steps */}
                <div className="space-y-8">
                  {TIMELINE_STEPS.map((step, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "relative z-10 flex items-center justify-center w-12 h-12 rounded-full",
                        "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                      )}>
                        <step.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className={TYPOGRAPHY.sectionHeader}>{step.title}</h4>
                          <Badge variant="outline">{step.duration}</Badge>
                        </div>
                        <p className={TYPOGRAPHY.bodyMuted}>{step.description}</p>

                        {/* Tips */}
                        <div className="mt-3 space-y-1">
                          {step.tips.map((tip, tipIndex) => (
                            <div key={tipIndex} className="flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className={TYPOGRAPHY.helperText}>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 8: What NOT to Do */}
      {activeSection === "donts" && (
        <div className="space-y-6">
          <Alert variant="destructive" className="border-2">
            <Ban className="h-5 w-5" />
            <AlertTitle className="text-lg">Critical Mistakes to Avoid</AlertTitle>
            <AlertDescription>
              These common errors can cost you thousands or even kill your mortgage approval.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DONT_DO_LIST.map((item, index) => (
              <Card
                key={index}
                className={cn(
                  "border-2",
                  item.severity === "critical"
                    ? "border-red-200 dark:border-red-800"
                    : item.severity === "high"
                    ? "border-amber-200 dark:border-amber-800"
                    : "border-muted"
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full flex-shrink-0",
                      item.severity === "critical"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : item.severity === "high"
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-muted"
                    )}>
                      <XCircle className={cn(
                        "h-5 w-5",
                        item.severity === "critical"
                          ? "text-red-600"
                          : item.severity === "high"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h4 className={TYPOGRAPHY.sectionHeader}>{item.title}</h4>
                      <p className={cn(TYPOGRAPHY.bodyMuted, "mt-1")}>{item.description}</p>
                      {item.severity === "critical" && (
                        <Badge variant="destructive" className="mt-2">Critical</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={cn(TYPOGRAPHY.helperText, "text-center")}>
          This calculator and guide provide general educational information. Actual mortgage
          terms, rates, and eligibility depend on your specific financial situation and lender
          requirements. Consult with a mortgage professional for personalized advice.
        </p>
      </div>
    </div>
  );
}

export default FirstTimeHomeBuyer;

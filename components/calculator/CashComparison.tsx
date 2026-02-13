"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Shield,
  TrendingUp,
  Clock,
  Info,
  AlertTriangle,
  ExternalLink,
  ArrowUpDown,
  CheckCircle2,
  Calculator,
  Landmark,
  PiggyBank,
  Building2,
  Lock,
} from "lucide-react";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CashVehicle {
  id: string;
  name: string;
  shortName: string;
  category: "savings" | "money-market" | "treasury" | "cd";
  rate: number;
  rateRange?: { min: number; max: number };
  fdicInsured: boolean;
  stateTaxExempt: boolean;
  liquidity: "instant" | "1-2 days" | "weekly" | "locked";
  minDeposit: number;
  bestFor: string;
  institution?: string;
  link?: string;
}

interface StateInfo {
  code: string;
  name: string;
  incomeTaxRate: number;
}

type SortField = "rate" | "name" | "liquidity";
type SortDirection = "asc" | "desc";

// =============================================================================
// Constants & Data
// =============================================================================

const HIGH_TAX_STATES: StateInfo[] = [
  { code: "CA", name: "California", incomeTaxRate: 0.133 },
  { code: "NY", name: "New York", incomeTaxRate: 0.109 },
  { code: "NJ", name: "New Jersey", incomeTaxRate: 0.1075 },
  { code: "OR", name: "Oregon", incomeTaxRate: 0.099 },
  { code: "MN", name: "Minnesota", incomeTaxRate: 0.0985 },
  { code: "DC", name: "Washington D.C.", incomeTaxRate: 0.0975 },
  { code: "VT", name: "Vermont", incomeTaxRate: 0.0875 },
  { code: "HI", name: "Hawaii", incomeTaxRate: 0.11 },
  { code: "IA", name: "Iowa", incomeTaxRate: 0.085 },
  { code: "WI", name: "Wisconsin", incomeTaxRate: 0.0765 },
];

const NO_TAX_STATES: StateInfo[] = [
  { code: "TX", name: "Texas", incomeTaxRate: 0 },
  { code: "FL", name: "Florida", incomeTaxRate: 0 },
  { code: "WA", name: "Washington", incomeTaxRate: 0 },
  { code: "NV", name: "Nevada", incomeTaxRate: 0 },
  { code: "WY", name: "Wyoming", incomeTaxRate: 0 },
  { code: "SD", name: "South Dakota", incomeTaxRate: 0 },
  { code: "AK", name: "Alaska", incomeTaxRate: 0 },
  { code: "NH", name: "New Hampshire", incomeTaxRate: 0 },
  { code: "TN", name: "Tennessee", incomeTaxRate: 0 },
];

// Representative rates as of late 2024 - these would ideally come from an API
const CASH_VEHICLES: CashVehicle[] = [
  // High Yield Savings
  {
    id: "hysa-marcus",
    name: "Marcus by Goldman Sachs HYSA",
    shortName: "Marcus HYSA",
    category: "savings",
    rate: 4.40,
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "instant",
    minDeposit: 0,
    bestFor: "Emergency fund",
    institution: "Goldman Sachs",
    link: "https://www.marcus.com",
  },
  {
    id: "hysa-ally",
    name: "Ally Bank HYSA",
    shortName: "Ally HYSA",
    category: "savings",
    rate: 4.20,
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "instant",
    minDeposit: 0,
    bestFor: "Emergency fund",
    institution: "Ally Bank",
    link: "https://www.ally.com",
  },
  {
    id: "hysa-sofi",
    name: "SoFi Checking & Savings",
    shortName: "SoFi",
    category: "savings",
    rate: 4.50,
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "instant",
    minDeposit: 0,
    bestFor: "Emergency fund + direct deposit",
    institution: "SoFi",
    link: "https://www.sofi.com",
  },
  {
    id: "hysa-wealthfront",
    name: "Wealthfront Cash Account",
    shortName: "Wealthfront Cash",
    category: "savings",
    rate: 4.50,
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "instant",
    minDeposit: 0,
    bestFor: "Tech-forward savers",
    institution: "Wealthfront",
    link: "https://www.wealthfront.com",
  },
  // Money Market Funds
  {
    id: "mmf-vanguard",
    name: "Vanguard Federal Money Market (VMFXX)",
    shortName: "VMFXX",
    category: "money-market",
    rate: 5.28,
    fdicInsured: false,
    stateTaxExempt: false,
    liquidity: "1-2 days",
    minDeposit: 3000,
    bestFor: "Investment cash",
    institution: "Vanguard",
    link: "https://investor.vanguard.com",
  },
  {
    id: "mmf-fidelity",
    name: "Fidelity Government Money Market (SPAXX)",
    shortName: "SPAXX",
    category: "money-market",
    rate: 4.97,
    fdicInsured: false,
    stateTaxExempt: false,
    liquidity: "1-2 days",
    minDeposit: 0,
    bestFor: "Brokerage default sweep",
    institution: "Fidelity",
    link: "https://www.fidelity.com",
  },
  {
    id: "mmf-schwab",
    name: "Schwab Value Advantage (SWVXX)",
    shortName: "SWVXX",
    category: "money-market",
    rate: 5.16,
    fdicInsured: false,
    stateTaxExempt: false,
    liquidity: "1-2 days",
    minDeposit: 0,
    bestFor: "Schwab account holders",
    institution: "Schwab",
    link: "https://www.schwab.com",
  },
  // Treasury Bills
  {
    id: "tbill-4week",
    name: "4-Week Treasury Bill",
    shortName: "4-Week T-Bill",
    category: "treasury",
    rate: 5.27,
    fdicInsured: false,
    stateTaxExempt: true,
    liquidity: "weekly",
    minDeposit: 100,
    bestFor: "Short-term, state tax savings",
    institution: "US Treasury",
    link: "https://www.treasurydirect.gov",
  },
  {
    id: "tbill-13week",
    name: "13-Week Treasury Bill",
    shortName: "13-Week T-Bill",
    category: "treasury",
    rate: 5.24,
    fdicInsured: false,
    stateTaxExempt: true,
    liquidity: "weekly",
    minDeposit: 100,
    bestFor: "Rolling quarterly ladder",
    institution: "US Treasury",
    link: "https://www.treasurydirect.gov",
  },
  {
    id: "tbill-26week",
    name: "26-Week Treasury Bill",
    shortName: "26-Week T-Bill",
    category: "treasury",
    rate: 5.05,
    fdicInsured: false,
    stateTaxExempt: true,
    liquidity: "weekly",
    minDeposit: 100,
    bestFor: "6-month savings goal",
    institution: "US Treasury",
    link: "https://www.treasurydirect.gov",
  },
  // CDs
  {
    id: "cd-3month",
    name: "3-Month CD (Avg Top Rates)",
    shortName: "3-Month CD",
    category: "cd",
    rate: 5.00,
    rateRange: { min: 4.50, max: 5.25 },
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "locked",
    minDeposit: 500,
    bestFor: "Known short-term expense",
    institution: "Various",
  },
  {
    id: "cd-6month",
    name: "6-Month CD (Avg Top Rates)",
    shortName: "6-Month CD",
    category: "cd",
    rate: 5.10,
    rateRange: { min: 4.75, max: 5.30 },
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "locked",
    minDeposit: 500,
    bestFor: "6-month goal",
    institution: "Various",
  },
  {
    id: "cd-12month",
    name: "12-Month CD (Avg Top Rates)",
    shortName: "12-Month CD",
    category: "cd",
    rate: 4.90,
    rateRange: { min: 4.50, max: 5.15 },
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "locked",
    minDeposit: 500,
    bestFor: "1-year savings goal",
    institution: "Various",
  },
  // Big Bank for comparison
  {
    id: "bigbank",
    name: "Big Bank Savings (Chase, BofA, Wells)",
    shortName: "Big Bank Savings",
    category: "savings",
    rate: 0.01,
    fdicInsured: true,
    stateTaxExempt: false,
    liquidity: "instant",
    minDeposit: 0,
    bestFor: "Convenience (not returns!)",
    institution: "Major Banks",
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

const getLiquidityLabel = (liquidity: CashVehicle["liquidity"]): string => {
  switch (liquidity) {
    case "instant":
      return "Instant";
    case "1-2 days":
      return "1-2 Days";
    case "weekly":
      return "Weekly Auctions";
    case "locked":
      return "Locked Term";
    default:
      return liquidity;
  }
};

const getCategoryIcon = (category: CashVehicle["category"]) => {
  switch (category) {
    case "savings":
      return <PiggyBank className="h-4 w-4" />;
    case "money-market":
      return <Building2 className="h-4 w-4" />;
    case "treasury":
      return <Landmark className="h-4 w-4" />;
    case "cd":
      return <Lock className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: CashVehicle["category"]): string => {
  switch (category) {
    case "savings":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "money-market":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
    case "treasury":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    case "cd":
      return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// =============================================================================
// Sub-Components
// =============================================================================

interface VehicleCardProps {
  vehicle: CashVehicle;
  icon: React.ReactNode;
  features: string[];
  accentColor: string;
}

function VehicleCard({ vehicle, icon, features, accentColor }: VehicleCardProps) {
  return (
    <Card className={`border-2 ${accentColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accentColor.replace("border-", "bg-").replace("-200", "-100")} dark:bg-opacity-20`}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{vehicle.shortName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-green-600">{formatPercent(vehicle.rate)}</span>
              <span className="text-sm text-muted-foreground">APY</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {vehicle.fdicInsured && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              <Shield className="h-3 w-3 mr-1" />
              FDIC Insured
            </Badge>
          )}
          {vehicle.stateTaxExempt && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              <DollarSign className="h-3 w-3 mr-1" />
              State Tax Free
            </Badge>
          )}
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {getLiquidityLabel(vehicle.liquidity)}
          </Badge>
        </div>
        <ul className="space-y-1.5">
          {features.map((feature, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t">
          <p className="text-sm">
            <span className="font-medium">Best for: </span>
            <span className="text-muted-foreground">{vehicle.bestFor}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface CashComparisonProps {
  monthlyExpenses?: number;
  currentCashPosition?: number;
}

export default function CashComparison({
  monthlyExpenses = 5000,
  currentCashPosition = 50000,
}: CashComparisonProps) {
  // State
  const [cashAmount, setCashAmount] = useState(currentCashPosition);
  const [selectedState, setSelectedState] = useState<StateInfo | null>(
    HIGH_TAX_STATES.find((s) => s.code === "CA") || null
  );
  const [sortField, setSortField] = useState<SortField>("rate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterCategory, setFilterCategory] = useState<CashVehicle["category"] | "all">("all");

  // Calculate emergency fund range
  const emergencyFundMin = monthlyExpenses * 3;
  const emergencyFundMax = monthlyExpenses * 6;
  const emergencyFundTarget = monthlyExpenses * 4.5; // Middle ground

  // Calculate how much to invest vs keep as cash
  const recommendedCash = Math.min(
    emergencyFundMax,
    Math.max(emergencyFundMin, cashAmount * 0.15) // At least 15% of cash position, but within 3-6 months
  );
  const investableAmount = Math.max(0, cashAmount - recommendedCash);

  // Sort and filter vehicles
  const sortedVehicles = useMemo(() => {
    let filtered =
      filterCategory === "all"
        ? CASH_VEHICLES
        : CASH_VEHICLES.filter((v) => v.category === filterCategory);

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "rate":
          comparison = a.rate - b.rate;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "liquidity":
          const liquidityOrder = { instant: 0, "1-2 days": 1, weekly: 2, locked: 3 };
          comparison = liquidityOrder[a.liquidity] - liquidityOrder[b.liquidity];
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [filterCategory, sortField, sortDirection]);

  // Calculate after-tax yields
  const calculateAfterTaxYield = (vehicle: CashVehicle): number => {
    if (!selectedState || selectedState.incomeTaxRate === 0) {
      return vehicle.rate;
    }
    if (vehicle.stateTaxExempt) {
      return vehicle.rate;
    }
    // After state tax
    return vehicle.rate * (1 - selectedState.incomeTaxRate);
  };

  // Find best options for each category
  const bestHYSA = CASH_VEHICLES.filter((v) => v.category === "savings" && v.rate > 1)
    .sort((a, b) => b.rate - a.rate)[0];
  const bestMM = CASH_VEHICLES.filter((v) => v.category === "money-market")
    .sort((a, b) => b.rate - a.rate)[0];
  const bestTBill = CASH_VEHICLES.filter((v) => v.category === "treasury")
    .sort((a, b) => b.rate - a.rate)[0];

  // Calculate opportunity cost of big bank
  const bigBank = CASH_VEHICLES.find((v) => v.id === "bigbank")!;
  const bestRate = Math.max(...CASH_VEHICLES.map((v) => v.rate));
  const opportunityCostAnnual = cashAmount * ((bestRate - bigBank.rate) / 100);
  const opportunityCostMonthly = opportunityCostAnnual / 12;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-600" />
          <CardTitle className="text-2xl">Where to Park Your Cash</CardTitle>
        </div>
        <CardDescription>
          Stop earning 0.01% at big banks. Compare high-yield options and maximize your cash returns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compare">Rate Comparison</TabsTrigger>
            <TabsTrigger value="after-tax">After-Tax</TabsTrigger>
            <TabsTrigger value="how-much">How Much Cash?</TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/* OVERVIEW TAB */}
          {/* ============================================================= */}
          <TabsContent value="overview" className="space-y-6">
            {/* Opportunity Cost Alert */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    The Cost of Big Bank Savings
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    With <strong>{formatCurrency(cashAmount)}</strong> earning 0.01% APY at a big bank,
                    you are losing approximately <strong>{formatCurrency(opportunityCostAnnual)}/year</strong>{" "}
                    ({formatCurrency(opportunityCostMonthly)}/month) compared to the best available rates.
                  </p>
                </div>
              </div>
            </div>

            {/* Cash Amount Slider */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Your Cash Position</label>
                <span className="text-lg font-bold text-green-600">{formatCurrency(cashAmount)}</span>
              </div>
              <Slider
                value={[cashAmount]}
                onValueChange={([value]) => setCashAmount(value)}
                min={1000}
                max={500000}
                step={1000}
                thumbLabel="Cash amount"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$1,000</span>
                <span>$500,000</span>
              </div>
            </div>

            {/* Vehicle Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* HYSA */}
              <VehicleCard
                vehicle={bestHYSA}
                icon={<PiggyBank className="h-5 w-5 text-blue-600" />}
                features={[
                  `Current rates around ${formatPercent(bestHYSA.rate)}`,
                  "FDIC insured up to $250,000",
                  "Instant access to your money",
                  "No minimum balance requirements",
                ]}
                accentColor="border-blue-200 dark:border-blue-800"
              />

              {/* Money Market */}
              <VehicleCard
                vehicle={bestMM}
                icon={<Building2 className="h-5 w-5 text-purple-600" />}
                features={[
                  `Current rates around ${formatPercent(bestMM.rate)}`,
                  "NOT FDIC insured (but very safe)",
                  "Usually held in brokerage account",
                  "Great for investment cash waiting to be deployed",
                ]}
                accentColor="border-purple-200 dark:border-purple-800"
              />

              {/* T-Bills */}
              <VehicleCard
                vehicle={bestTBill}
                icon={<Landmark className="h-5 w-5 text-green-600" />}
                features={[
                  `Current rates around ${formatPercent(bestTBill.rate)}`,
                  "STATE TAX EXEMPT - higher effective yield",
                  '"Risk-free" - backed by US government',
                  "Best for large cash positions in high-tax states",
                ]}
                accentColor="border-green-200 dark:border-green-800"
              />

              {/* CDs */}
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/50">
                      <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">CD Ladders</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-green-600">4.90-5.10%</span>
                        <span className="text-sm text-muted-foreground">APY Range</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      FDIC Insured
                    </Badge>
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked Term
                    </Badge>
                  </div>
                  <ul className="space-y-1.5">
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Lock in current high rates
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Higher rates for longer terms
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Early withdrawal penalty applies
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Build a ladder for regular access
                    </li>
                  </ul>
                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <span className="font-medium">Best for: </span>
                      <span className="text-muted-foreground">Known future expenses (car, wedding, down payment)</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Recommendation */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Quick Recommendation
                  </div>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>
                      <strong>Emergency Fund ({formatCurrency(emergencyFundMin)} - {formatCurrency(emergencyFundMax)}):</strong>{" "}
                      High-Yield Savings Account for instant access
                    </li>
                    <li>
                      <strong>Investment Cash:</strong> Money Market Fund in your brokerage
                    </li>
                    <li>
                      <strong>Large Cash Positions ({">"}$50k in high-tax states):</strong>{" "}
                      Consider T-Bills for state tax savings
                    </li>
                    <li>
                      <strong>Known Future Expenses:</strong> CD ladder matching your timeline
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* RATE COMPARISON TAB */}
          {/* ============================================================= */}
          <TabsContent value="compare" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Filter by Type</label>
                <Select
                  value={filterCategory}
                  onValueChange={(value) => setFilterCategory(value as typeof filterCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="savings">High-Yield Savings</SelectItem>
                    <SelectItem value="money-market">Money Market Funds</SelectItem>
                    <SelectItem value="treasury">Treasury Bills</SelectItem>
                    <SelectItem value="cd">CDs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Sort by</label>
                <Select
                  value={`${sortField}-${sortDirection}`}
                  onValueChange={(value) => {
                    const [field, dir] = value.split("-") as [SortField, SortDirection];
                    setSortField(field);
                    setSortDirection(dir);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rate-desc">Highest Rate First</SelectItem>
                    <SelectItem value="rate-asc">Lowest Rate First</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="liquidity-asc">Most Liquid First</SelectItem>
                    <SelectItem value="liquidity-desc">Least Liquid First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rates Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                      onClick={() => {
                        if (sortField === "rate") {
                          setSortDirection(sortDirection === "desc" ? "asc" : "desc");
                        } else {
                          setSortField("rate");
                          setSortDirection("desc");
                        }
                      }}
                    >
                      APY
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Protection</TableHead>
                  <TableHead className="hidden md:table-cell">Liquidity</TableHead>
                  <TableHead className="hidden lg:table-cell">Min</TableHead>
                  <TableHead className="text-right">Annual on {formatCurrency(cashAmount)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    className={vehicle.id === "bigbank" ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getCategoryColor(vehicle.category)} hidden sm:flex`}>
                          {getCategoryIcon(vehicle.category)}
                        </Badge>
                        <div>
                          <div className="font-medium">{vehicle.shortName}</div>
                          <div className="text-xs text-muted-foreground">{vehicle.institution}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-bold ${
                          vehicle.id === "bigbank" ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {formatPercent(vehicle.rate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {vehicle.fdicInsured ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                          FDIC
                        </Badge>
                      ) : vehicle.category === "treasury" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                          US Govt
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Insured</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getLiquidityLabel(vehicle.liquidity)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {vehicle.minDeposit === 0
                        ? "None"
                        : formatCurrency(vehicle.minDeposit)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cashAmount * (vehicle.rate / 100))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Last Updated Note */}
            <div className="text-xs text-muted-foreground text-center">
              Rates shown are representative as of late 2024 and may vary. Always verify current rates with institutions.
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* AFTER-TAX TAB */}
          {/* ============================================================= */}
          <TabsContent value="after-tax" className="space-y-6">
            {/* State Selector */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Your State</label>
                  <Select
                    value={selectedState?.code || ""}
                    onValueChange={(code) => {
                      const state =
                        HIGH_TAX_STATES.find((s) => s.code === code) ||
                        NO_TAX_STATES.find((s) => s.code === code);
                      setSelectedState(state || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        High Tax States
                      </SelectItem>
                      {HIGH_TAX_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} ({(state.incomeTaxRate * 100).toFixed(1)}%)
                        </SelectItem>
                      ))}
                      <SelectItem value="none2" disabled>
                        No Income Tax States
                      </SelectItem>
                      {NO_TAX_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} (0%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Your Cash Position</label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(cashAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    Why T-Bills Can Be Better
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Treasury Bills are <strong>exempt from state and local income taxes</strong>.
                    {selectedState && selectedState.incomeTaxRate > 0 && (
                      <>
                        {" "}
                        In {selectedState.name} with a {(selectedState.incomeTaxRate * 100).toFixed(1)}% state tax rate,
                        a 5.00% T-Bill effectively yields the same as a{" "}
                        <strong>{formatPercent(5.0 / (1 - selectedState.incomeTaxRate))}</strong> HYSA after taxes.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* After-Tax Comparison Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Stated APY</TableHead>
                  <TableHead className="text-right">After State Tax</TableHead>
                  <TableHead className="text-right">Annual Earnings</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Tax Advantage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles
                  .filter((v) => v.rate > 1)
                  .sort((a, b) => calculateAfterTaxYield(b) - calculateAfterTaxYield(a))
                  .map((vehicle) => {
                    const afterTax = calculateAfterTaxYield(vehicle);
                    const annualEarnings = cashAmount * (afterTax / 100);
                    const hasTaxAdvantage = vehicle.stateTaxExempt && selectedState && selectedState.incomeTaxRate > 0;

                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(vehicle.category)}>
                              {getCategoryIcon(vehicle.category)}
                            </Badge>
                            <span className="font-medium">{vehicle.shortName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatPercent(vehicle.rate)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${hasTaxAdvantage ? "text-green-600" : ""}`}>
                            {formatPercent(afterTax)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(annualEarnings)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          {hasTaxAdvantage ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                              State Tax Free
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>

            {/* High-Tax State Call Out */}
            {selectedState && selectedState.incomeTaxRate >= 0.09 && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Living in a High-Tax State? T-Bills Are Your Friend
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      With {selectedState.name}&apos;s {(selectedState.incomeTaxRate * 100).toFixed(1)}% state income tax,
                      you can save approximately{" "}
                      <strong>
                        {formatCurrency(cashAmount * (bestTBill.rate / 100) * selectedState.incomeTaxRate)}
                      </strong>{" "}
                      per year in state taxes by choosing T-Bills over a traditional HYSA.
                      That&apos;s real money back in your pocket.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/* HOW MUCH CASH TAB */}
          {/* ============================================================= */}
          <TabsContent value="how-much" className="space-y-6">
            {/* Monthly Expenses Input */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Your Monthly Expenses</label>
                <span className="text-lg font-bold">{formatCurrency(monthlyExpenses)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on your monthly expenses, here&apos;s how to allocate your cash.
              </p>
            </div>

            {/* Emergency Fund Section */}
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">Emergency Fund</CardTitle>
                </div>
                <CardDescription>3-6 months of expenses in instantly accessible savings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-muted-foreground">Minimum (3 mo)</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(emergencyFundMin)}</div>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                    <div className="text-sm text-muted-foreground">Target</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(emergencyFundTarget)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-muted-foreground">Maximum (6 mo)</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(emergencyFundMax)}</div>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Where to keep it:</strong> High-Yield Savings Account (HYSA) like Marcus, Ally, or SoFi.
                    You need instant access in emergencies.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cash Allocation Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-xl">Your Cash Allocation</CardTitle>
                </div>
                <CardDescription>
                  Based on your {formatCurrency(cashAmount)} cash position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visual breakdown */}
                <div className="space-y-3">
                  {/* Emergency Fund Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        Emergency Fund (HYSA)
                      </span>
                      <span className="text-blue-600 font-bold">{formatCurrency(recommendedCash)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-500"
                        style={{ width: `${Math.min(100, (recommendedCash / cashAmount) * 100)}%` }}
                      >
                        {((recommendedCash / cashAmount) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Investable Amount Bar */}
                  {investableAmount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Should Be Invested
                        </span>
                        <span className="text-green-600 font-bold">{formatCurrency(investableAmount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-green-600 h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-500"
                          style={{ width: `${(investableAmount / cashAmount) * 100}%` }}
                        >
                          {((investableAmount / cashAmount) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Key insight */}
                {investableAmount > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          You May Be Holding Too Much Cash
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Beyond your emergency fund, you have <strong>{formatCurrency(investableAmount)}</strong> that
                          could potentially be invested for long-term growth. Over 10 years at historical market returns,
                          this could grow to approximately <strong>{formatCurrency(investableAmount * 2.6)}</strong>{" "}
                          vs <strong>{formatCurrency(investableAmount * 1.6)}</strong> in a savings account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How Much Cash Should You Hold?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Emergency Fund: 3-6 Months Expenses</div>
                      <p className="text-sm text-muted-foreground">
                        More months if: self-employed, single income, unstable industry, dependents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Short-Term Goals: &lt;2 Years Away</div>
                      <p className="text-sm text-muted-foreground">
                        Home down payment, car, wedding, tuition - keep in cash or short-term CDs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Everything Else: Should Be Invested</div>
                      <p className="text-sm text-muted-foreground">
                        Long-term goals ({">"}5 years) belong in diversified investments, not cash
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Final Call to Action */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-900 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-2">The Bottom Line</h3>
              <p className="text-muted-foreground mb-4">
                Cash is for safety and short-term needs, not wealth building.
                Beyond your emergency fund, put your money to work.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">0.01%</div>
                  <div className="text-sm text-muted-foreground">Big Bank Savings</div>
                </div>
                <div className="text-2xl">{"->"}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">5%+</div>
                  <div className="text-sm text-muted-foreground">HYSA / T-Bills</div>
                </div>
                <div className="text-2xl">{"->"}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">10%+</div>
                  <div className="text-sm text-muted-foreground">Long-term Investing</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { CashComparison };

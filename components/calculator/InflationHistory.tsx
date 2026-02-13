"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Shield,
  Info,
  ArrowRight,
  Building,
  GraduationCap,
  Heart,
  Home,
  ShoppingCart,
  Cpu,
  Banknote,
  PiggyBank,
  LineChart as LineChartIcon,
} from "lucide-react";

// =============================================================================
// HISTORICAL INFLATION DATA (CPI-U Annual Averages)
// =============================================================================
const HISTORICAL_INFLATION: Record<number, number> = {
  1960: 1.7, 1961: 1.0, 1962: 1.0, 1963: 1.3, 1964: 1.3,
  1965: 1.6, 1966: 2.9, 1967: 3.1, 1968: 4.2, 1969: 5.5,
  1970: 5.7, 1971: 4.4, 1972: 3.2, 1973: 6.2, 1974: 11.0,
  1975: 9.1, 1976: 5.8, 1977: 6.5, 1978: 7.6, 1979: 11.3,
  1980: 13.5, 1981: 10.3, 1982: 6.2, 1983: 3.2, 1984: 4.3,
  1985: 3.6, 1986: 1.9, 1987: 3.6, 1988: 4.1, 1989: 4.8,
  1990: 5.4, 1991: 4.2, 1992: 3.0, 1993: 3.0, 1994: 2.6,
  1995: 2.8, 1996: 3.0, 1997: 2.3, 1998: 1.6, 1999: 2.2,
  2000: 3.4, 2001: 2.8, 2002: 1.6, 2003: 2.3, 2004: 2.7,
  2005: 3.4, 2006: 3.2, 2007: 2.8, 2008: 3.8, 2009: -0.4,
  2010: 1.6, 2011: 3.2, 2012: 2.1, 2013: 1.5, 2014: 1.6,
  2015: 0.1, 2016: 1.3, 2017: 2.1, 2018: 2.4, 2019: 1.8,
  2020: 1.2, 2021: 4.7, 2022: 8.0, 2023: 4.1, 2024: 2.9,
  2025: 2.5, // Projected
};

// Cumulative CPI index (1960 = 100)
const CPI_INDEX: Record<number, number> = {};
let cumulativeIndex = 100;
Object.keys(HISTORICAL_INFLATION).sort().forEach(year => {
  CPI_INDEX[parseInt(year)] = cumulativeIndex;
  cumulativeIndex *= (1 + HISTORICAL_INFLATION[parseInt(year)] / 100);
});

// =============================================================================
// CATEGORY-SPECIFIC INFLATION (Average annual rates)
// =============================================================================
interface CategoryInflation {
  name: string;
  rate: number;
  icon: React.ElementType;
  color: string;
  description: string;
  comparedToCPI: string;
}

const CATEGORY_INFLATION: CategoryInflation[] = [
  {
    name: "Overall CPI",
    rate: 3.0,
    icon: DollarSign,
    color: "#6366f1",
    description: "General consumer price index",
    comparedToCPI: "baseline",
  },
  {
    name: "Healthcare",
    rate: 5.5,
    icon: Heart,
    color: "#ef4444",
    description: "Medical services, insurance, prescriptions",
    comparedToCPI: "+83% faster",
  },
  {
    name: "Education",
    rate: 6.5,
    icon: GraduationCap,
    color: "#f97316",
    description: "College tuition, textbooks, fees",
    comparedToCPI: "+117% faster",
  },
  {
    name: "Housing",
    rate: 4.0,
    icon: Home,
    color: "#eab308",
    description: "Rent, home prices, property taxes",
    comparedToCPI: "+33% faster",
  },
  {
    name: "Food",
    rate: 2.8,
    icon: ShoppingCart,
    color: "#22c55e",
    description: "Groceries and dining out",
    comparedToCPI: "~CPI",
  },
  {
    name: "Technology",
    rate: -5.0,
    icon: Cpu,
    color: "#06b6d4",
    description: "Electronics, computers, software",
    comparedToCPI: "Deflation!",
  },
];

// =============================================================================
// SOCIAL SECURITY COLA HISTORY
// =============================================================================
const COLA_HISTORY: Array<{ year: number; cola: number }> = [
  { year: 2015, cola: 0.0 },
  { year: 2016, cola: 0.3 },
  { year: 2017, cola: 2.0 },
  { year: 2018, cola: 2.8 },
  { year: 2019, cola: 1.6 },
  { year: 2020, cola: 1.3 },
  { year: 2021, cola: 5.9 },
  { year: 2022, cola: 8.7 },
  { year: 2023, cola: 3.2 },
  { year: 2024, cola: 2.5 },
  { year: 2025, cola: 2.5 },
];

// =============================================================================
// INFLATION HEDGES
// =============================================================================
interface InflationHedge {
  name: string;
  icon: React.ElementType;
  effectiveness: "Excellent" | "Good" | "Mixed" | "Poor";
  description: string;
  details: string;
  historicalReturn: string;
}

const INFLATION_HEDGES: InflationHedge[] = [
  {
    name: "Stocks",
    icon: TrendingUp,
    effectiveness: "Excellent",
    description: "Ownership of real assets that grow with economy",
    details: "Companies can raise prices to match inflation, maintaining real profits. Long-term returns historically outpace inflation by 7%+.",
    historicalReturn: "~10% nominal, ~7% real",
  },
  {
    name: "Real Estate",
    icon: Home,
    effectiveness: "Good",
    description: "Rental income and property values rise with inflation",
    details: "Rent prices typically track inflation. Property values appreciate long-term. REITs required to distribute 90% of income.",
    historicalReturn: "~9% nominal, ~6% real",
  },
  {
    name: "I-Bonds & TIPS",
    icon: Shield,
    effectiveness: "Excellent",
    description: "Government bonds designed to protect against inflation",
    details: "I-Bond rate = fixed rate + inflation rate. TIPS principal adjusts with CPI. Government guaranteed, zero credit risk.",
    historicalReturn: "CPI + 0-2% real",
  },
  {
    name: "Commodities",
    icon: Banknote,
    effectiveness: "Mixed",
    description: "Raw materials often rise during inflation",
    details: "Gold and oil can spike during inflation fears, but long-term returns are volatile. Not income-producing.",
    historicalReturn: "~3% nominal, volatile",
  },
];

// =============================================================================
// NOTABLE INFLATION PERIODS
// =============================================================================
interface NotablePeriod {
  start: number;
  end: number;
  name: string;
  avgInflation: number;
  cause: string;
  color: string;
}

const NOTABLE_PERIODS: NotablePeriod[] = [
  {
    start: 1973,
    end: 1982,
    name: "Great Inflation",
    avgInflation: 8.8,
    cause: "Oil shocks, loose monetary policy",
    color: "#ef4444",
  },
  {
    start: 2021,
    end: 2023,
    name: "Post-COVID Surge",
    avgInflation: 5.6,
    cause: "Supply chains, stimulus, demand surge",
    color: "#f97316",
  },
  {
    start: 2009,
    end: 2009,
    name: "Deflation Year",
    avgInflation: -0.4,
    cause: "Financial crisis, demand collapse",
    color: "#3b82f6",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
function calculatePurchasingPower(startYear: number, endYear: number, amount: number): number {
  if (!CPI_INDEX[startYear] || !CPI_INDEX[endYear]) return amount;
  return amount * (CPI_INDEX[startYear] / CPI_INDEX[endYear]);
}

function calculateEquivalentValue(startYear: number, endYear: number, amount: number): number {
  if (!CPI_INDEX[startYear] || !CPI_INDEX[endYear]) return amount;
  return amount * (CPI_INDEX[endYear] / CPI_INDEX[startYear]);
}

function calculateFutureValue(presentValue: number, rate: number, years: number): number {
  return presentValue * Math.pow(1 + rate / 100, years);
}

function calculateRealValue(futureValue: number, inflationRate: number, years: number): number {
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}

function getAverageInflation(startYear: number, endYear: number): number {
  const years = Object.keys(HISTORICAL_INFLATION)
    .map(Number)
    .filter(y => y >= startYear && y <= endYear);
  if (years.length === 0) return 0;
  const sum = years.reduce((acc, y) => acc + HISTORICAL_INFLATION[y], 0);
  return sum / years.length;
}

// =============================================================================
// CHART CONFIGURATIONS
// =============================================================================
const inflationChartConfig: ChartConfig = {
  inflation: {
    label: "Inflation Rate",
    color: "#6366f1",
  },
};

const purchasingPowerConfig: ChartConfig = {
  value: {
    label: "Purchasing Power",
    color: "#22c55e",
  },
};

const categoryChartConfig: ChartConfig = {
  value: {
    label: "Value After 20 Years",
    color: "#6366f1",
  },
};

const colaChartConfig: ChartConfig = {
  cola: {
    label: "COLA %",
    color: "#3b82f6",
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export function InflationHistory() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [startYear, setStartYear] = useState(1980);
  const [endYear, setEndYear] = useState(2024);
  const [amount, setAmount] = useState(100);
  const [projectionRate, setProjectionRate] = useState(3);
  const [projectionYears, setProjectionYears] = useState(20);
  const [projectionAmount, setProjectionAmount] = useState(100000);

  const years = useMemo(() => {
    return Object.keys(HISTORICAL_INFLATION).map(Number).sort((a, b) => a - b);
  }, []);

  // Calculate equivalent value
  const equivalentValue = useMemo(() => {
    return calculateEquivalentValue(startYear, endYear, amount);
  }, [startYear, endYear, amount]);

  // Calculate purchasing power decline
  const purchasingPowerDecline = useMemo(() => {
    const currentPower = calculatePurchasingPower(startYear, endYear, amount);
    return ((amount - currentPower) / amount) * 100;
  }, [startYear, endYear, amount]);

  // Historical inflation chart data
  const inflationChartData = useMemo(() => {
    return years.map(year => ({
      year,
      inflation: HISTORICAL_INFLATION[year],
      isNotable: NOTABLE_PERIODS.some(p => year >= p.start && year <= p.end),
    }));
  }, [years]);

  // Purchasing power over time data
  const purchasingPowerData = useMemo(() => {
    const selectedYears = years.filter(y => y >= startYear && y <= endYear);
    return selectedYears.map(year => ({
      year,
      value: calculatePurchasingPower(startYear, year, amount),
    }));
  }, [years, startYear, endYear, amount]);

  // Category comparison data (20-year projections)
  const categoryComparisonData = useMemo(() => {
    return CATEGORY_INFLATION.map(cat => ({
      name: cat.name,
      startValue: 100,
      endValue: calculateFutureValue(100, cat.rate, 20),
      rate: cat.rate,
      color: cat.color,
    }));
  }, []);

  // Future projection calculations
  const futureNominal = useMemo(() => {
    return calculateFutureValue(projectionAmount, 7, projectionYears); // 7% nominal return
  }, [projectionAmount, projectionYears]);

  const futureReal = useMemo(() => {
    return calculateRealValue(futureNominal, projectionRate, projectionYears);
  }, [futureNominal, projectionRate, projectionYears]);

  const inflationErosion = useMemo(() => {
    return futureNominal - futureReal;
  }, [futureNominal, futureReal]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-red-500" />
          Historical Inflation Calculator
        </CardTitle>
        <CardDescription>
          Understand how inflation erodes purchasing power and why we use real (inflation-adjusted) returns in retirement planning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto gap-1">
            <TabsTrigger value="calculator" className="text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
              History
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">
              <Building className="h-4 w-4 mr-1 hidden sm:inline" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="projections" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Projections
            </TabsTrigger>
            <TabsTrigger value="hedges" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
              Hedges
            </TabsTrigger>
            <TabsTrigger value="social-security" className="text-xs sm:text-sm">
              <PiggyBank className="h-4 w-4 mr-1 hidden sm:inline" />
              SS COLA
            </TabsTrigger>
            <TabsTrigger value="real-numbers" className="text-xs sm:text-sm">
              <LineChartIcon className="h-4 w-4 mr-1 hidden sm:inline" />
              Real vs Nominal
            </TabsTrigger>
          </TabsList>

          {/* =================================================================
              TAB 1: DOLLAR VALUE CALCULATOR
          ================================================================= */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-900">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Dollar Value Over Time
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ($)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">${amount}</span>
                  </div>
                  <Slider
                    value={[amount]}
                    onValueChange={(v) => setAmount(v[0])}
                    min={10}
                    max={1000}
                    step={10}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Year</label>
                  <Select value={startYear.toString()} onValueChange={(v) => setStartYear(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.filter(y => y < endYear).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Year</label>
                  <Select value={endYear.toString()} onValueChange={(v) => setEndYear(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.filter(y => y > startYear).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Result Display */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">{startYear}</div>
                      <div className="text-3xl font-bold text-blue-600">${amount}</div>
                    </div>
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">{endYear} Equivalent</div>
                      <div className="text-3xl font-bold text-green-600">
                        ${equivalentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">${amount}</span> in {startYear} has the same purchasing power as{" "}
                      <span className="font-semibold text-green-600">
                        ${equivalentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>{" "}
                      in {endYear}
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Purchasing power declined by {purchasingPowerDecline.toFixed(1)}% over {endYear - startYear} years
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchasing Power Chart */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">Purchasing Power Decline</h4>
                <ChartContainer config={purchasingPowerConfig} className="h-[200px]">
                  <AreaChart data={purchasingPowerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, amount]} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Purchasing Power"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      fill="url(#purchasingPowerGradient)"
                    />
                    <defs>
                      <linearGradient id="purchasingPowerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 2: HISTORICAL INFLATION DATA
          ================================================================= */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Annual Inflation Rate (1960-2025)
              </h3>

              <ChartContainer config={inflationChartConfig} className="h-[300px]">
                <AreaChart data={inflationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={[-2, 15]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Inflation"]}
                  />
                  <ReferenceLine y={3} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "3% Target", position: "right" }} />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
                  <Area
                    type="monotone"
                    dataKey="inflation"
                    stroke="#6366f1"
                    fill="url(#inflationGradient)"
                  />
                  <defs>
                    <linearGradient id="inflationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ChartContainer>

              {/* Notable Periods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {NOTABLE_PERIODS.map((period) => (
                  <div
                    key={period.name}
                    className="p-4 rounded-lg border"
                    style={{ borderLeftColor: period.color, borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{period.name}</span>
                      <Badge variant="outline" style={{ color: period.color, borderColor: period.color }}>
                        {period.start === period.end ? period.start : `${period.start}-${period.end}`}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: period.color }}>
                      {period.avgInflation > 0 ? "+" : ""}{period.avgInflation}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{period.cause}</p>
                  </div>
                ))}
              </div>

              {/* Period Averages */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mt-4">
                <h4 className="font-semibold mb-3">Historical Averages</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">1960-1979</div>
                    <div className="text-xl font-bold text-orange-600">{getAverageInflation(1960, 1979).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">1980-1999</div>
                    <div className="text-xl font-bold text-yellow-600">{getAverageInflation(1980, 1999).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">2000-2019</div>
                    <div className="text-xl font-bold text-green-600">{getAverageInflation(2000, 2019).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">2020-2025</div>
                    <div className="text-xl font-bold text-red-600">{getAverageInflation(2020, 2025).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 3: CATEGORY-SPECIFIC INFLATION
          ================================================================= */}
          <TabsContent value="categories" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Not All Inflation is Equal</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Different spending categories experience vastly different inflation rates. Healthcare and education
                    have historically outpaced general inflation significantly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORY_INFLATION.map((cat) => {
                  const Icon = cat.icon;
                  const endValue = calculateFutureValue(100, cat.rate, 20);
                  return (
                    <div
                      key={cat.name}
                      className="p-4 rounded-lg border bg-white dark:bg-gray-900"
                      style={{ borderTopColor: cat.color, borderTopWidth: "3px" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5" style={{ color: cat.color }} />
                        <span className="font-semibold">{cat.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" style={{ color: cat.color }}>
                          {cat.rate > 0 ? "+" : ""}{cat.rate}%
                        </span>
                        <span className="text-sm text-muted-foreground">/year</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{cat.description}</p>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span>$100 today</span>
                          <span className="font-semibold" style={{ color: cat.color }}>
                            ${endValue.toFixed(0)} in 20 years
                          </span>
                        </div>
                        <Badge variant="outline" className="mt-2 text-xs" style={{ color: cat.color, borderColor: cat.color }}>
                          {cat.comparedToCPI}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category Comparison Chart */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">$100 Investment Growth by Category (20 Years)</h4>
                <ChartContainer config={categoryChartConfig} className="h-[250px]">
                  <BarChart data={categoryComparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 400]} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`$${value.toFixed(0)}`, "Value"]}
                    />
                    <Bar dataKey="endValue" fill="#6366f1" />
                    <ReferenceLine x={100} stroke="#000" strokeDasharray="5 5" label={{ value: "Start $100", position: "top" }} />
                  </BarChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Note: Technology shows deflation - electronics get cheaper and better over time
                </p>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 4: FUTURE PROJECTIONS
          ================================================================= */}
          <TabsContent value="projections" className="space-y-6 mt-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-6 border border-purple-200 dark:border-purple-900">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Future Value Calculator
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Today&apos;s Value ($)</label>
                  <div className="text-2xl font-bold text-purple-600">
                    ${projectionAmount.toLocaleString()}
                  </div>
                  <Slider
                    value={[projectionAmount]}
                    onValueChange={(v) => setProjectionAmount(v[0])}
                    min={10000}
                    max={1000000}
                    step={10000}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assumed Inflation (%)</label>
                  <div className="text-2xl font-bold text-purple-600">{projectionRate}%</div>
                  <Slider
                    value={[projectionRate]}
                    onValueChange={(v) => setProjectionRate(v[0])}
                    min={1}
                    max={8}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Years</label>
                  <div className="text-2xl font-bold text-purple-600">{projectionYears}</div>
                  <Slider
                    value={[projectionYears]}
                    onValueChange={(v) => setProjectionYears(v[0])}
                    min={5}
                    max={40}
                    step={5}
                  />
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Nominal Value (7% return)</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${futureNominal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">What your account shows</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Real Value (Today&apos;s $)</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${futureReal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Actual purchasing power</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
                  <div className="text-sm text-muted-foreground mb-1">Lost to Inflation</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${inflationErosion.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((inflationErosion / futureNominal) * 100).toFixed(0)}% of nominal value
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Why We Inflate Retirement Projections</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      At {projectionRate}% inflation, ${projectionAmount.toLocaleString()} today needs to grow to{" "}
                      <strong>${calculateFutureValue(projectionAmount, projectionRate, projectionYears).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>{" "}
                      in {projectionYears} years just to maintain the same purchasing power. That&apos;s why retirement
                      calculators project future expenses - not to scare you, but to plan realistically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 5: INFLATION HEDGES
          ================================================================= */}
          <TabsContent value="hedges" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Protecting Against Inflation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INFLATION_HEDGES.map((hedge) => {
                  const Icon = hedge.icon;
                  const effectivenessColors = {
                    Excellent: "text-green-600 bg-green-50 border-green-200",
                    Good: "text-blue-600 bg-blue-50 border-blue-200",
                    Mixed: "text-yellow-600 bg-yellow-50 border-yellow-200",
                    Poor: "text-red-600 bg-red-50 border-red-200",
                  };
                  return (
                    <div key={hedge.name} className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{hedge.name}</span>
                        </div>
                        <Badge className={effectivenessColors[hedge.effectiveness]}>
                          {hedge.effectiveness}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{hedge.description}</p>
                      <p className="text-sm">{hedge.details}</p>
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Historical Return: </span>
                        <span className="text-sm font-medium">{hedge.historicalReturn}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">The Power of Stocks</p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                      Over the long term, stocks have been the best inflation hedge. Companies can raise prices,
                      increase dividends, and grow earnings faster than inflation. A diversified stock portfolio
                      has historically returned 7%+ above inflation over long periods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 6: SOCIAL SECURITY COLA
          ================================================================= */}
          <TabsContent value="social-security" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                Social Security COLA (Cost-of-Living Adjustment)
              </h3>

              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">Social Security is Inflation-Protected</p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      Unlike most pensions and annuities, Social Security benefits automatically increase each year
                      based on inflation (CPI-W). This makes SS one of the most valuable inflation hedges in retirement.
                    </p>
                  </div>
                </div>
              </div>

              <ChartContainer config={colaChartConfig} className="h-[250px]">
                <BarChart data={COLA_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 10]} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "COLA"]}
                  />
                  <Bar dataKey="cola" fill="#3b82f6" />
                </BarChart>
              </ChartContainer>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 rounded-lg border bg-white dark:bg-gray-900 text-center">
                  <div className="text-sm text-muted-foreground">2022 COLA (Largest in 40 years)</div>
                  <div className="text-3xl font-bold text-blue-600">8.7%</div>
                  <p className="text-xs text-muted-foreground mt-1">Response to high inflation</p>
                </div>
                <div className="p-4 rounded-lg border bg-white dark:bg-gray-900 text-center">
                  <div className="text-sm text-muted-foreground">Average COLA (2015-2025)</div>
                  <div className="text-3xl font-bold text-green-600">
                    {(COLA_HISTORY.reduce((sum, c) => sum + c.cola, 0) / COLA_HISTORY.length).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-white dark:bg-gray-900 text-center">
                  <div className="text-sm text-muted-foreground">2015-2016 (Zero Inflation)</div>
                  <div className="text-3xl font-bold text-yellow-600">0%</div>
                  <p className="text-xs text-muted-foreground mt-1">No COLA when inflation is zero</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Why This Matters for Retirement</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Because Social Security is inflation-adjusted, it becomes relatively more valuable over time
                      compared to fixed income sources. A $30,000/year SS benefit today could grow to $54,000/year
                      in 20 years at 3% inflation - maintaining purchasing power automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* =================================================================
              TAB 7: REAL VS NOMINAL
          ================================================================= */}
          <TabsContent value="real-numbers" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-indigo-600" />
                The &quot;Real&quot; Numbers: Why Inflation-Adjusted Returns Matter
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Nominal Returns</h4>
                  <div className="text-4xl font-bold text-green-600 mb-2">~10%</div>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Historical S&P 500 average annual return. This is what your brokerage statement shows.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Example: $100,000 at 10% = $259,374 in 10 years
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Real Returns (Inflation-Adjusted)</h4>
                  <div className="text-4xl font-bold text-blue-600 mb-2">~7%</div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    After subtracting ~3% inflation. This is your actual increase in purchasing power.
                  </p>
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Example: $100,000 at 7% real = $196,715 in today&apos;s purchasing power
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">$1 Million in 30 Years is NOT $1 Million Today</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      At 3% inflation, $1,000,000 in 30 years has the purchasing power of only{" "}
                      <strong>${calculateRealValue(1000000, 3, 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>{" "}
                      in today&apos;s dollars. That&apos;s why retirement planning must account for inflation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-900">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-4">Why Our Calculator Uses Real Returns</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-medium text-indigo-900 dark:text-indigo-100">Honest Projections</p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        When we say you need $1.5M, that&apos;s in today&apos;s purchasing power. No inflation guessing games.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-medium text-indigo-900 dark:text-indigo-100">Comparable Numbers</p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        You can compare future projections directly to your current expenses and income.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-medium text-indigo-900 dark:text-indigo-100">Conservative Planning</p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        Using real returns (~7%) instead of nominal (~10%) builds in a safety margin for higher inflation periods.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                <h4 className="font-semibold mb-3">Quick Reference: Real vs Nominal Returns</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Asset Class</th>
                        <th className="text-right py-2">Nominal Return</th>
                        <th className="text-right py-2">Real Return (~3% inflation)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">US Stocks (S&P 500)</td>
                        <td className="text-right text-green-600">~10%</td>
                        <td className="text-right text-blue-600">~7%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Bonds (Aggregate)</td>
                        <td className="text-right text-green-600">~5%</td>
                        <td className="text-right text-blue-600">~2%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Cash/Money Market</td>
                        <td className="text-right text-green-600">~3%</td>
                        <td className="text-right text-blue-600">~0%</td>
                      </tr>
                      <tr>
                        <td className="py-2">60/40 Portfolio</td>
                        <td className="text-right text-green-600">~8%</td>
                        <td className="text-right text-blue-600">~5%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default InflationHistory;

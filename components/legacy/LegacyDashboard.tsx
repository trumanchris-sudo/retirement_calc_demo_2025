"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  TrendingUp,
  Heart,
  Building2,
  Shield,
  Info,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  PieChart,
  ArrowUpRight,
  Landmark,
  Scale,
  Gift,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
} from "lucide-react"
import { Input } from "@/components/calculator/InputHelpers"
import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ReferenceLine,
} from "recharts"
// Reason: recharts v3 PieLabelRenderProps does not include custom data fields
import type { PieLabel } from "recharts"

// ==================== Types ====================

interface LegacyDashboardProps {
  className?: string
  // Estate Values
  currentNetWorth?: number
  projectedEstateAtDeath?: number
  annualGrowthRate?: number
  // Beneficiary Info
  beneficiaries?: Beneficiary[]
  // User Info
  currentAge?: number
  lifeExpectancy?: number
  filingStatus?: "single" | "married"
  // Charitable Goals
  charitableGoal?: number
  // Callbacks
  onStrategyChange?: (strategy: LegacyStrategy) => void
}

interface Beneficiary {
  id: string
  name: string
  relationship: string
  allocation: number // percentage 0-100
  age?: number
  isMinor?: boolean
  isCharity?: boolean
  isTrust?: boolean
}

interface LegacyStrategy {
  totalEstate: number
  estateToHeirs: number
  estateToCharity: number
  estateTax: number
  stepUpBasisSavings: number
  gstSavings: number
  strategiesUsed: string[]
}

interface EstateProjection {
  age: number
  year: number
  netWorth: number
  estateValue: number
  taxableEstate: number
  exemptionUsed: number
}

interface TrustType {
  name: string
  purpose: string
  taxBenefit: string
  bestFor: string
  complexity: "Low" | "Medium" | "High"
}

// ==================== Constants ====================

const FEDERAL_ESTATE_EXEMPTION_2024 = 13610000
const FEDERAL_ESTATE_TAX_RATE = 0.40
const GST_EXEMPTION_2024 = 13610000
const ANNUAL_GIFT_EXCLUSION_2024 = 18000
const LIFETIME_GIFT_EXEMPTION_2024 = 13610000

const DEFAULT_BENEFICIARIES: Beneficiary[] = [
  { id: "1", name: "Spouse", relationship: "Spouse", allocation: 50 },
  { id: "2", name: "Child 1", relationship: "Child", allocation: 25, age: 35 },
  { id: "3", name: "Child 2", relationship: "Child", allocation: 25, age: 32 },
]

const BEQUEST_STRATEGIES = [
  {
    id: "step-up-basis",
    name: "Step-Up in Basis",
    description: "Hold appreciated assets until death for tax-free capital gains elimination",
    taxSavings: "15-23.8% of unrealized gains",
    complexity: "Low",
    icon: TrendingUp,
  },
  {
    id: "annual-gifts",
    name: "Annual Gift Exclusion",
    description: `Gift up to $${ANNUAL_GIFT_EXCLUSION_2024.toLocaleString()}/person/year without using lifetime exemption`,
    taxSavings: "Reduces taxable estate over time",
    complexity: "Low",
    icon: Gift,
  },
  {
    id: "charitable-remainder",
    name: "Charitable Remainder Trust",
    description: "Receive income now, charity gets remainder, avoid capital gains",
    taxSavings: "Income tax deduction + cap gains avoidance",
    complexity: "High",
    icon: Heart,
  },
  {
    id: "gst-planning",
    name: "Generation-Skipping",
    description: "Transfer wealth directly to grandchildren, skipping estate tax at the child level",
    taxSavings: "Avoid 40% estate tax at one generation",
    complexity: "High",
    icon: Layers,
  },
  {
    id: "dynasty-trust",
    name: "Dynasty Trust",
    description: "Multi-generational trust that can last perpetually in some states",
    taxSavings: "Remove assets from estate tax system permanently",
    complexity: "High",
    icon: Building2,
  },
  {
    id: "ilit",
    name: "Irrevocable Life Insurance Trust",
    description: "Keep life insurance proceeds out of taxable estate",
    taxSavings: "Estate tax on insurance proceeds",
    complexity: "Medium",
    icon: Shield,
  },
]

const TRUST_TYPES: TrustType[] = [
  {
    name: "Revocable Living Trust",
    purpose: "Avoid probate, manage incapacity",
    taxBenefit: "None (included in estate)",
    bestFor: "Everyone wanting probate avoidance",
    complexity: "Low",
  },
  {
    name: "Irrevocable Life Insurance Trust (ILIT)",
    purpose: "Remove life insurance from taxable estate",
    taxBenefit: "Life insurance proceeds excluded from estate",
    bestFor: "High net worth with large life insurance policies",
    complexity: "Medium",
  },
  {
    name: "Grantor Retained Annuity Trust (GRAT)",
    purpose: "Transfer appreciation to heirs tax-free",
    taxBenefit: "Gift tax on initial transfer only, appreciation passes free",
    bestFor: "Assets expected to appreciate significantly",
    complexity: "High",
  },
  {
    name: "Charitable Remainder Trust (CRT)",
    purpose: "Income stream to you, remainder to charity",
    taxBenefit: "Immediate income tax deduction, capital gains avoidance",
    bestFor: "Charitably inclined with appreciated assets",
    complexity: "High",
  },
  {
    name: "Dynasty Trust",
    purpose: "Multi-generational wealth transfer",
    taxBenefit: "Wealth can grow tax-free for multiple generations",
    bestFor: "Very high net worth, generational wealth goals",
    complexity: "High",
  },
  {
    name: "Qualified Personal Residence Trust (QPRT)",
    purpose: "Transfer home to heirs at reduced gift tax cost",
    taxBenefit: "Reduced gift value based on retained interest",
    bestFor: "Valuable home, intent to stay for fixed term",
    complexity: "Medium",
  },
  {
    name: "Special Needs Trust",
    purpose: "Provide for disabled beneficiary without losing benefits",
    taxBenefit: "Varies; preserves government benefit eligibility",
    bestFor: "Beneficiaries receiving SSI/Medicaid",
    complexity: "Medium",
  },
]

const PIE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

const CHARITY_COLORS = "#ef4444" // red for charity

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0"
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function calculateEstateTax(estateValue: number, exemptionUsed: number = 0): number {
  const availableExemption = Math.max(0, FEDERAL_ESTATE_EXEMPTION_2024 - exemptionUsed)
  const taxableAmount = Math.max(0, estateValue - availableExemption)
  return taxableAmount * FEDERAL_ESTATE_TAX_RATE
}

function calculateStepUpBasisSavings(
  unrealizedGains: number,
  capitalGainsRate: number = 0.238
): number {
  return unrealizedGains * capitalGainsRate
}

// ==================== Sub-Components ====================

const StatCard: React.FC<{
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  color?: string
}> = ({ label, value, subtext, icon, trend, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    green: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
    amber: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
    purple: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900",
    red: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
  }

  const textColorClasses = {
    blue: "text-blue-900 dark:text-blue-100",
    green: "text-green-900 dark:text-green-100",
    amber: "text-amber-900 dark:text-amber-100",
    purple: "text-purple-900 dark:text-purple-100",
    red: "text-red-900 dark:text-red-100",
  }

  return (
    <div className={cn("rounded-lg p-4 border", colorClasses[color as keyof typeof colorClasses])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">{label}</div>
          <div className={cn("text-2xl font-bold", textColorClasses[color as keyof typeof textColorClasses])}>
            {value}
          </div>
          {subtext && (
            <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
          {icon}
        </div>
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 mt-2 text-xs",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600",
          trend === "neutral" && "text-gray-600"
        )}>
          {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
          {trend === "down" && <ArrowUpRight className="h-3 w-3 rotate-180" />}
          {trend === "neutral" && <ArrowRight className="h-3 w-3" />}
          <span>vs. no planning</span>
        </div>
      )}
    </div>
  )
}

const StrategyCard: React.FC<{
  strategy: typeof BEQUEST_STRATEGIES[0]
  isActive: boolean
  onToggle: () => void
  estimatedSavings?: number
}> = ({ strategy, isActive, onToggle, estimatedSavings }) => {
  const Icon = strategy.icon
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all cursor-pointer",
      isActive
        ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800 ring-2 ring-green-500/20"
        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300"
    )}
    onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isActive
            ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{strategy.name}</h4>
            <Badge variant={isActive ? "default" : "outline"} className="text-xs">
              {strategy.complexity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{strategy.description}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Savings: {strategy.taxSavings}
          </p>
          {isActive && estimatedSavings !== undefined && estimatedSavings > 0 && (
            <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                Est. Savings: {formatCurrency(estimatedSavings)}
              </span>
            </div>
          )}
        </div>
        <Switch checked={isActive} onCheckedChange={onToggle} />
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function LegacyDashboard({
  className,
  currentNetWorth = 2500000,
  projectedEstateAtDeath: _projectedEstateAtDeath = 5000000,
  annualGrowthRate = 0.05,
  beneficiaries = DEFAULT_BENEFICIARIES,
  currentAge = 55,
  lifeExpectancy = 85,
  filingStatus: _filingStatus = "married",
  charitableGoal = 0,
  onStrategyChange,
}: LegacyDashboardProps) {
  // Suppress unused variable warnings (reserved for future use)
  void _projectedEstateAtDeath
  void _filingStatus
  // State
  const [localNetWorth, setLocalNetWorth] = useState(currentNetWorth)
  const [localGrowthRate, setLocalGrowthRate] = useState(annualGrowthRate * 100)
  const [localBeneficiaries, setLocalBeneficiaries] = useState<Beneficiary[]>(beneficiaries)
  const [localCharitableGoal, setLocalCharitableGoal] = useState(charitableGoal)
  const [unrealizedGains, setUnrealizedGains] = useState(localNetWorth * 0.4) // Assume 40% unrealized gains
  const [activeStrategies, setActiveStrategies] = useState<Set<string>>(new Set(["step-up-basis"]))
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate projections
  const estateProjections = useMemo((): EstateProjection[] => {
    const projections: EstateProjection[] = []
    const yearsToProject = lifeExpectancy - currentAge + 10 // Project 10 years beyond life expectancy
    const currentYear = new Date().getFullYear()

    for (let year = 0; year <= yearsToProject; year++) {
      const age = currentAge + year
      const netWorth = localNetWorth * Math.pow(1 + localGrowthRate / 100, year)
      const estateValue = netWorth - (localCharitableGoal * (year / yearsToProject)) // Gradual charitable giving
      const exemptionUsed = activeStrategies.has("annual-gifts")
        ? Math.min(ANNUAL_GIFT_EXCLUSION_2024 * localBeneficiaries.length * year, LIFETIME_GIFT_EXEMPTION_2024 * 0.5)
        : 0
      const taxableEstate = Math.max(0, estateValue - FEDERAL_ESTATE_EXEMPTION_2024 + exemptionUsed)

      projections.push({
        age,
        year: currentYear + year,
        netWorth,
        estateValue,
        taxableEstate,
        exemptionUsed,
      })
    }

    return projections
  }, [localNetWorth, localGrowthRate, currentAge, lifeExpectancy, localBeneficiaries, localCharitableGoal, activeStrategies])

  // Calculate estate at death
  const estateAtDeath = useMemo(() => {
    const yearsUntilDeath = lifeExpectancy - currentAge
    return localNetWorth * Math.pow(1 + localGrowthRate / 100, yearsUntilDeath)
  }, [localNetWorth, localGrowthRate, currentAge, lifeExpectancy])

  // Calculate tax savings from strategies
  const strategySavings = useMemo(() => {
    let stepUpSavings = 0
    let annualGiftSavings = 0
    let charitableSavings = 0
    let gstSavings = 0

    const yearsUntilDeath = lifeExpectancy - currentAge

    if (activeStrategies.has("step-up-basis")) {
      stepUpSavings = calculateStepUpBasisSavings(unrealizedGains)
    }

    if (activeStrategies.has("annual-gifts")) {
      const annualGifts = ANNUAL_GIFT_EXCLUSION_2024 * localBeneficiaries.length
      const totalGifted = annualGifts * yearsUntilDeath
      annualGiftSavings = Math.min(totalGifted, estateAtDeath * 0.3) * FEDERAL_ESTATE_TAX_RATE
    }

    if (activeStrategies.has("charitable-remainder")) {
      charitableSavings = localCharitableGoal * 0.35 // Approximate income tax deduction value
    }

    if (activeStrategies.has("gst-planning")) {
      const gstTransfer = Math.min(GST_EXEMPTION_2024, estateAtDeath * 0.3)
      gstSavings = gstTransfer * FEDERAL_ESTATE_TAX_RATE // Tax saved by skipping generation
    }

    return {
      stepUpSavings,
      annualGiftSavings,
      charitableSavings,
      gstSavings,
      total: stepUpSavings + annualGiftSavings + charitableSavings + gstSavings,
    }
  }, [activeStrategies, unrealizedGains, localBeneficiaries, lifeExpectancy, currentAge, estateAtDeath, localCharitableGoal])

  // Calculate final estate tax
  const finalEstateTax = useMemo(() => {
    let adjustedEstate = estateAtDeath

    // Reduce for charitable giving
    adjustedEstate -= localCharitableGoal

    // Reduce for annual gifts
    if (activeStrategies.has("annual-gifts")) {
      const yearsUntilDeath = lifeExpectancy - currentAge
      const totalGifted = ANNUAL_GIFT_EXCLUSION_2024 * localBeneficiaries.length * yearsUntilDeath
      adjustedEstate -= Math.min(totalGifted, adjustedEstate * 0.3)
    }

    return calculateEstateTax(adjustedEstate)
  }, [estateAtDeath, localCharitableGoal, activeStrategies, localBeneficiaries, lifeExpectancy, currentAge])

  // Calculate what each beneficiary receives
  const beneficiaryAllocations = useMemo(() => {
    const netEstate = estateAtDeath - finalEstateTax - localCharitableGoal
    return localBeneficiaries.map((ben) => ({
      ...ben,
      amount: netEstate * (ben.allocation / 100),
    }))
  }, [localBeneficiaries, estateAtDeath, finalEstateTax, localCharitableGoal])

  // Pie chart data for beneficiaries
  const pieData = useMemo(() => {
    const data = beneficiaryAllocations.map((ben, idx) => ({
      name: ben.name,
      value: ben.amount,
      percentage: ben.allocation,
      fill: ben.isCharity ? CHARITY_COLORS : PIE_COLORS[idx % PIE_COLORS.length],
    }))

    // Add charity if there is a charitable goal
    if (localCharitableGoal > 0) {
      data.push({
        name: "Charitable Giving",
        value: localCharitableGoal,
        percentage: (localCharitableGoal / estateAtDeath) * 100,
        fill: CHARITY_COLORS,
      })
    }

    return data
  }, [beneficiaryAllocations, localCharitableGoal, estateAtDeath])

  // Notify parent of strategy changes
  useEffect(() => {
    onStrategyChange?.({
      totalEstate: estateAtDeath,
      estateToHeirs: estateAtDeath - finalEstateTax - localCharitableGoal,
      estateToCharity: localCharitableGoal,
      estateTax: finalEstateTax,
      stepUpBasisSavings: strategySavings.stepUpSavings,
      gstSavings: strategySavings.gstSavings,
      strategiesUsed: Array.from(activeStrategies),
    })
  }, [estateAtDeath, finalEstateTax, localCharitableGoal, strategySavings, activeStrategies, onStrategyChange])

  // Toggle strategy
  const toggleStrategy = (strategyId: string) => {
    const newStrategies = new Set(activeStrategies)
    if (newStrategies.has(strategyId)) {
      newStrategies.delete(strategyId)
    } else {
      newStrategies.add(strategyId)
    }
    setActiveStrategies(newStrategies)
  }

  // Update beneficiary allocation
  const updateBeneficiaryAllocation = (id: string, newAllocation: number) => {
    setLocalBeneficiaries((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, allocation: newAllocation } : b
      )
      // Normalize to 100%
      const total = updated.reduce((sum, b) => sum + b.allocation, 0)
      if (total !== 100 && total > 0) {
        return updated.map((b) => ({
          ...b,
          allocation: (b.allocation / total) * 100,
        }))
      }
      return updated
    })
  }

  // Chart config for estate projection
  const chartConfig: ChartConfig = {
    netWorth: {
      label: "Net Worth",
      color: "#3b82f6",
    },
    taxableEstate: {
      label: "Taxable Estate",
      color: "#ef4444",
    },
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-purple-600" />
          Estate & Legacy Dashboard
        </CardTitle>
        <CardDescription>
          Plan your legacy intentionally - visualize wealth transfer, minimize taxes, and maximize impact
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Projected Estate"
            value={formatCurrency(estateAtDeath)}
            subtext={`at age ${lifeExpectancy}`}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            color="blue"
          />
          <StatCard
            label="Estate Tax"
            value={formatCurrency(finalEstateTax)}
            subtext={`${formatPercent(finalEstateTax / estateAtDeath)} of estate`}
            icon={<Landmark className="h-5 w-5 text-red-600" />}
            color="red"
            trend="down"
          />
          <StatCard
            label="Tax Savings"
            value={formatCurrency(strategySavings.total)}
            subtext={`from ${activeStrategies.size} strategies`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            color="green"
            trend="up"
          />
          <StatCard
            label="Net to Heirs"
            value={formatCurrency(estateAtDeath - finalEstateTax - localCharitableGoal)}
            subtext={`split among ${localBeneficiaries.length} beneficiaries`}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            color="purple"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="charitable">Charitable</TabsTrigger>
            <TabsTrigger value="trusts">Trusts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Estate Growth Chart */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Net Estate Value Over Time
              </h3>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={estateProjections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="age"
                    tickFormatter={(age) => `Age ${age}`}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [formatCurrency(value as number), name]}
                      />
                    }
                  />
                  <ReferenceLine
                    x={lifeExpectancy}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    label={{ value: "Life Expectancy", position: "top" }}
                  />
                  <ReferenceLine
                    y={FEDERAL_ESTATE_EXEMPTION_2024}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{ value: "Estate Exemption", position: "right" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="taxableEstate"
                    name="Taxable Estate"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Net Worth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Taxable Estate (above exemption)</span>
                </div>
              </div>
            </div>

            {/* Step-Up Basis Explanation */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Step-Up in Basis: Your Biggest Tax Advantage
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    When you hold appreciated assets until death, your heirs receive them at their current market value,
                    not your original cost. This eliminates all capital gains tax on appreciation during your lifetime.
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground mb-1">Your Unrealized Gains</div>
                    <div className="text-xl font-bold text-purple-600">{formatCurrency(unrealizedGains)}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border">
                    <span className="text-sm">If you sold today:</span>
                    <span className="text-sm font-semibold text-red-600">
                      -{formatCurrency(unrealizedGains * 0.238)} tax
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200">
                    <span className="text-sm">If heirs inherit:</span>
                    <span className="text-sm font-semibold text-green-600">$0 tax</span>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-green-600">
                      Save {formatCurrency(unrealizedGains * 0.238)} in capital gains tax
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs for adjustment */}
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <Input
                label="Current Net Worth"
                value={localNetWorth}
                setter={setLocalNetWorth}
                min={0}
                max={100000000}
                step={100000}
                prefix="$"
                tip="Your total assets minus liabilities"
              />
              <Input
                label="Growth Rate"
                value={localGrowthRate}
                setter={setLocalGrowthRate}
                min={0}
                max={15}
                step={0.5}
                isRate
                tip="Expected annual growth rate of your portfolio"
              />
              <Input
                label="Unrealized Gains"
                value={unrealizedGains}
                setter={setUnrealizedGains}
                min={0}
                max={localNetWorth}
                step={10000}
                prefix="$"
                tip="Appreciation in assets above your cost basis"
              />
            </div>
          </TabsContent>

          {/* Beneficiaries Tab */}
          <TabsContent value="beneficiaries" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-600" />
                  Beneficiary Allocation
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      // Reason: recharts v3 PieLabelRenderProps does not include custom data fields
                      label={(({ name, percentage }: { name: string; percentage: number }) => `${name}: ${percentage.toFixed(1)}%`) as unknown as PieLabel}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beneficiary List */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Adjust Allocations
                </h3>
                <div className="space-y-4">
                  {localBeneficiaries.map((ben, idx) => (
                    <div key={ben.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{ben.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({ben.relationship})</span>
                        </div>
                        <Badge variant="outline">{ben.allocation.toFixed(1)}%</Badge>
                      </div>
                      <Slider
                        value={[ben.allocation]}
                        onValueChange={(v) => updateBeneficiaryAllocation(ben.id, v[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Receives: {formatCurrency(beneficiaryAllocations[idx]?.amount || 0)}</span>
                        {ben.age && <span>Age: {ben.age}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    These allocations show how your estate would be divided after taxes and charitable giving.
                    Actual distribution depends on your will, trusts, and beneficiary designations.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Generation-Skip Opportunity */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Generation-Skipping Opportunity
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    If you transfer wealth directly to grandchildren (skipping your child&apos;s generation),
                    the assets avoid estate tax when your children die. This can save up to 40% estate tax
                    at each generation skipped.
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-muted-foreground mb-1">GST Exemption Available</div>
                    <div className="text-xl font-bold text-purple-600">
                      {formatCurrency(GST_EXEMPTION_2024)}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Example (40% estate tax rate):</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white dark:bg-gray-900 rounded border">
                      <span>Transfer to children, then grandchildren:</span>
                      <span className="text-red-600">$1M becomes $360K</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200">
                      <span>Direct transfer to grandchildren:</span>
                      <span className="text-green-600">$1M becomes $600K</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Using GST exemption, transfers up to {formatCurrency(GST_EXEMPTION_2024)} skip generation tax entirely.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {BEQUEST_STRATEGIES.map((strategy) => {
                let estimatedSavings = 0
                if (strategy.id === "step-up-basis") {
                  estimatedSavings = strategySavings.stepUpSavings
                } else if (strategy.id === "annual-gifts") {
                  estimatedSavings = strategySavings.annualGiftSavings
                } else if (strategy.id === "charitable-remainder") {
                  estimatedSavings = strategySavings.charitableSavings
                } else if (strategy.id === "gst-planning") {
                  estimatedSavings = strategySavings.gstSavings
                }

                return (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    isActive={activeStrategies.has(strategy.id)}
                    onToggle={() => toggleStrategy(strategy.id)}
                    estimatedSavings={estimatedSavings}
                  />
                )
              })}
            </div>

            {/* Strategy Summary */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Your Selected Strategies
              </h3>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Step-Up Basis</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(strategySavings.stepUpSavings)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Annual Gifts</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(strategySavings.annualGiftSavings)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Charitable</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(strategySavings.charitableSavings)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">GST Planning</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(strategySavings.gstSavings)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <span className="font-semibold">Total Estimated Tax Savings:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(strategySavings.total)}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Charitable Tab */}
          <TabsContent value="charitable" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Charitable Goal Input */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-600" />
                  Charitable Giving Goal
                </h3>
                <Input
                  label="Total Charitable Bequest"
                  value={localCharitableGoal}
                  setter={setLocalCharitableGoal}
                  min={0}
                  max={estateAtDeath}
                  step={10000}
                  prefix="$"
                  tip="Amount you want to leave to charity in your estate"
                />

                <div className="space-y-2 pt-2">
                  <Label className="text-sm">Quick Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 20].map((pct) => (
                      <Button
                        key={pct}
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalCharitableGoal(estateAtDeath * (pct / 100))}
                        className={cn(
                          Math.round((localCharitableGoal / estateAtDeath) * 100) === pct &&
                            "border-pink-500 bg-pink-50 dark:bg-pink-950/20"
                        )}
                      >
                        {pct}% of Estate
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Impact Visualization */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Your Charitable Impact
                </h3>

                {localCharitableGoal > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-3 border border-pink-200">
                      <div className="text-xs text-muted-foreground mb-1">Your Charitable Legacy</div>
                      <div className="text-2xl font-bold text-pink-600">
                        {formatCurrency(localCharitableGoal)}
                      </div>
                      <div className="text-xs text-pink-600 mt-1">
                        {formatPercent(localCharitableGoal / estateAtDeath)} of your estate
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-muted-foreground mb-1">Estate Tax Savings</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(localCharitableGoal * FEDERAL_ESTATE_TAX_RATE)}
                        </div>
                        <div className="text-xs text-green-600">
                          (charitable deduction)
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200">
                        <div className="text-xs text-muted-foreground mb-1">Net Cost to Heirs</div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(localCharitableGoal * (1 - FEDERAL_ESTATE_TAX_RATE))}
                        </div>
                        <div className="text-xs text-blue-600">
                          (after tax benefit)
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Because of the estate tax deduction, every $1 you give to charity only costs
                      your heirs ${(1 - FEDERAL_ESTATE_TAX_RATE).toFixed(2)}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Set a charitable giving goal to see the impact on your estate and the tax benefits.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Charitable Strategies */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="crt">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Charitable Remainder Trust (CRT)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A CRT allows you to donate appreciated assets, receive an income stream for life,
                    get an immediate tax deduction, and have the remainder go to charity at death.
                  </p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 mb-1" />
                      <div className="text-sm font-medium">Avoid Capital Gains</div>
                      <div className="text-xs text-muted-foreground">
                        Sell appreciated assets inside trust tax-free
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 mb-1" />
                      <div className="text-sm font-medium">Income for Life</div>
                      <div className="text-xs text-muted-foreground">
                        Receive 5-50% of trust value annually
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 mb-1" />
                      <div className="text-sm font-medium">Tax Deduction</div>
                      <div className="text-xs text-muted-foreground">
                        Immediate deduction for charitable remainder
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="daf">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    Donor Advised Fund (DAF)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A DAF allows you to make a charitable contribution, receive an immediate tax deduction,
                    and recommend grants to charities over time. Think of it as a charitable savings account.
                  </p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      In your estate, naming a DAF as a beneficiary of retirement accounts (IRA, 401k)
                      is especially tax-efficient because neither estate tax nor income tax applies to
                      the charitable gift.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="private-foundation">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-600" />
                    Private Foundation
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    For very large charitable goals, a private foundation offers maximum control over
                    charitable giving and can employ family members. However, it has higher administrative
                    costs and more restrictions than a DAF.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600 mb-1" />
                    <div className="text-sm font-medium">Best for estates over $10M</div>
                    <div className="text-xs text-muted-foreground">
                      Annual filing requirements and 5% minimum distribution rule apply
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Trusts Tab */}
          <TabsContent value="trusts" className="space-y-6 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Trust Visualization
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Trusts are legal entities that hold assets for the benefit of your beneficiaries.
                Different trusts serve different purposes in estate planning.
              </p>

              {/* Trust Flow Diagram */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <div className="flex flex-col items-center space-y-4">
                  {/* You */}
                  <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-4 text-center w-48">
                    <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">You (Grantor)</div>
                    <div className="text-xs text-muted-foreground">
                      Estate: {formatCurrency(estateAtDeath)}
                    </div>
                  </div>

                  <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />

                  {/* Trust Types */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-4 text-center">
                      <Shield className="h-5 w-5 text-green-600 mx-auto mb-2" />
                      <div className="font-medium text-sm">Revocable Trust</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Avoid probate, maintain control
                      </div>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900/50 rounded-lg p-4 text-center">
                      <Building2 className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                      <div className="font-medium text-sm">Irrevocable Trust</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Remove from estate, asset protection
                      </div>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/50 rounded-lg p-4 text-center">
                      <Heart className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                      <div className="font-medium text-sm">Charitable Trust</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Tax benefits + charitable impact
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />

                  {/* Beneficiaries */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 w-full">
                    <div className="text-center font-semibold mb-3">Beneficiaries</div>
                    <div className="flex justify-center gap-4 flex-wrap">
                      {localBeneficiaries.map((ben, idx) => (
                        <div
                          key={ben.id}
                          className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center min-w-[100px]"
                        >
                          <div className="text-sm font-medium">{ben.name}</div>
                          <div className="text-xs text-muted-foreground">{ben.allocation}%</div>
                          <div className="text-xs font-semibold text-green-600 mt-1">
                            {formatCurrency(beneficiaryAllocations[idx]?.amount || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Comparison Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left font-semibold">Trust Type</th>
                    <th className="p-3 text-left font-semibold">Purpose</th>
                    <th className="p-3 text-left font-semibold">Tax Benefit</th>
                    <th className="p-3 text-center font-semibold">Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {TRUST_TYPES.map((trust, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-muted/20"}>
                      <td className="p-3 font-medium">{trust.name}</td>
                      <td className="p-3 text-muted-foreground">{trust.purpose}</td>
                      <td className="p-3 text-muted-foreground">{trust.taxBenefit}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            trust.complexity === "Low"
                              ? "secondary"
                              : trust.complexity === "Medium"
                              ? "outline"
                              : "default"
                          }
                        >
                          {trust.complexity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dynasty Trust Deep Dive */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Dynasty Trust: Multi-Generational Wealth
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    A dynasty trust can last for multiple generations (or perpetually in some states),
                    allowing wealth to compound and pass to descendants without estate tax at each generation.
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground mb-1">States Allowing Perpetual Trusts</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["AK", "DE", "ID", "IL", "ME", "MD", "MO", "NV", "NH", "NJ", "NC", "OH", "PA", "RI", "SD", "VA", "WI", "WY"].map((state) => (
                        <Badge key={state} variant="outline" className="text-xs">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Growth Example over 100 Years (6% return):</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white dark:bg-gray-900 rounded border">
                      <span>$1M initial</span>
                      <span className="font-semibold text-purple-600">$339M to descendants</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white dark:bg-gray-900 rounded border">
                      <span>Without dynasty trust</span>
                      <span className="text-red-600">$44M (after 3 generations of estate tax)</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Uses GST exemption to shield initial transfer; all growth passes tax-free.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom Summary */}
        <div className="border-t pt-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Your Legacy Summary
            </h3>
            <div className="grid md:grid-cols-5 gap-4 text-center">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Estate Value</div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(estateAtDeath)}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Estate Tax</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(finalEstateTax)}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Charitable</div>
                <div className="text-lg font-bold text-pink-600">{formatCurrency(localCharitableGoal)}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Tax Savings</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(strategySavings.total)}</div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-700 dark:text-green-400 mb-1">Net to Heirs</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(estateAtDeath - finalEstateTax - localCharitableGoal)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground italic">
            This dashboard provides educational estimates for planning purposes only. Estate tax laws are complex
            and subject to change. The 2024 federal estate tax exemption of ${FEDERAL_ESTATE_EXEMPTION_2024.toLocaleString()} is
            scheduled to decrease significantly in 2026. Consult with qualified estate planning attorneys and tax
            professionals to implement these strategies for your specific situation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default LegacyDashboard

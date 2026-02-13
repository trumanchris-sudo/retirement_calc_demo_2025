"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Award,
} from "lucide-react"

// Types
interface MatchGenerosity {
  matchPercent: number // e.g., 100 for 100% match
  upToPercent: number // e.g., 6 for "up to 6%"
}

interface InvestmentOptions {
  hasIndexFunds: boolean
  hasTargetDateFunds: boolean
  expenseRatio: number // as decimal, e.g., 0.10 for 0.10%
}

interface PlanFees {
  adminFeePercent: number // Annual admin fee as percent
  perParticipantFee: number // Annual per-participant fee in dollars
}

interface MegaBackdoorRoth {
  afterTaxContributionsAllowed: boolean
  inPlanRothConversion: boolean
}

type VestingType = "immediate" | "graded-3" | "graded-6" | "cliff-3" | "cliff-5"

interface PlanRatings {
  matchScore: number
  investmentScore: number
  feeScore: number
  megaBackdoorScore: number
  vestingScore: number
  overallScore: number
  grade: "A" | "B" | "C" | "D" | "F"
  percentile: number
}

interface Plan401kRatingProps {
  className?: string
}

// Helper functions
function calculateMatchScore(match: MatchGenerosity): number {
  // Score based on effective match value
  const effectiveMatch = (match.matchPercent / 100) * match.upToPercent

  if (effectiveMatch >= 6) return 10 // 100% up to 6% or better
  if (effectiveMatch >= 4.5) return 9 // e.g., 75% up to 6% or 100% up to 4.5%
  if (effectiveMatch >= 3) return 8 // 50% up to 6% or 100% up to 3%
  if (effectiveMatch >= 2) return 6
  if (effectiveMatch >= 1) return 4
  if (effectiveMatch > 0) return 2
  return 1 // No match
}

function calculateInvestmentScore(options: InvestmentOptions): number {
  let score = 0

  // Index funds are essential (up to 4 points)
  if (options.hasIndexFunds) score += 4
  else score -= 2 // Penalty for no index funds

  // Target date funds are convenient (up to 2 points)
  if (options.hasTargetDateFunds) score += 2

  // Expense ratio is crucial (up to 4 points)
  if (options.expenseRatio < 0.05) score += 4 // < 0.05% excellent
  else if (options.expenseRatio < 0.10) score += 3.5 // < 0.10% very good
  else if (options.expenseRatio < 0.25) score += 3 // < 0.25% good
  else if (options.expenseRatio < 0.50) score += 2 // < 0.50% acceptable
  else if (options.expenseRatio < 0.75) score += 1 // < 0.75% below average
  else score += 0 // >= 0.75% poor

  return Math.max(1, Math.min(10, score))
}

function calculateFeeScore(fees: PlanFees): number {
  // Calculate total cost impact (assuming $100k balance)
  const balanceForCalc = 100000
  const totalAnnualCost = (fees.adminFeePercent / 100) * balanceForCalc + fees.perParticipantFee

  // Score based on total cost as percentage
  const totalCostPercent = (totalAnnualCost / balanceForCalc) * 100

  if (totalCostPercent <= 0.1) return 10 // Excellent
  if (totalCostPercent <= 0.25) return 9
  if (totalCostPercent <= 0.4) return 8
  if (totalCostPercent <= 0.5) return 7
  if (totalCostPercent <= 0.75) return 6
  if (totalCostPercent <= 1.0) return 5
  if (totalCostPercent <= 1.5) return 4
  if (totalCostPercent <= 2.0) return 3
  if (totalCostPercent <= 3.0) return 2
  return 1 // Very high fees
}

function calculateMegaBackdoorScore(mbd: MegaBackdoorRoth): number {
  if (mbd.afterTaxContributionsAllowed && mbd.inPlanRothConversion) {
    return 10 // Full mega backdoor available - this is HUGE
  }
  if (mbd.afterTaxContributionsAllowed) {
    return 6 // After-tax allowed but no in-plan conversion (can do in-service rollover)
  }
  return 3 // Not available - still a valid plan, just missing this feature
}

function calculateVestingScore(vesting: VestingType): number {
  switch (vesting) {
    case "immediate":
      return 10
    case "graded-3":
      return 8
    case "cliff-3":
      return 6
    case "graded-6":
      return 5
    case "cliff-5":
      return 3
    default:
      return 5
  }
}

function calculateOverallRatings(
  match: MatchGenerosity,
  investments: InvestmentOptions,
  fees: PlanFees,
  megaBackdoor: MegaBackdoorRoth,
  vesting: VestingType
): PlanRatings {
  const matchScore = calculateMatchScore(match)
  const investmentScore = calculateInvestmentScore(investments)
  const feeScore = calculateFeeScore(fees)
  const megaBackdoorScore = calculateMegaBackdoorScore(megaBackdoor)
  const vestingScore = calculateVestingScore(vesting)

  // Weighted average (match and investments most important)
  const weights = {
    match: 0.30,
    investment: 0.25,
    fees: 0.20,
    megaBackdoor: 0.10,
    vesting: 0.15,
  }

  const overallScore =
    matchScore * weights.match +
    investmentScore * weights.investment +
    feeScore * weights.fees +
    megaBackdoorScore * weights.megaBackdoor +
    vestingScore * weights.vesting

  // Determine grade
  let grade: "A" | "B" | "C" | "D" | "F"
  if (overallScore >= 8.5) grade = "A"
  else if (overallScore >= 7) grade = "B"
  else if (overallScore >= 5.5) grade = "C"
  else if (overallScore >= 4) grade = "D"
  else grade = "F"

  // Estimate percentile (rough approximation based on typical 401k quality)
  let percentile: number
  if (overallScore >= 9) percentile = 95
  else if (overallScore >= 8) percentile = 85
  else if (overallScore >= 7) percentile = 70
  else if (overallScore >= 6) percentile = 55
  else if (overallScore >= 5) percentile = 40
  else if (overallScore >= 4) percentile = 25
  else percentile = 10

  return {
    matchScore,
    investmentScore,
    feeScore,
    megaBackdoorScore,
    vestingScore,
    overallScore,
    grade,
    percentile,
  }
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-600 dark:text-green-400"
    case "B":
      return "text-blue-600 dark:text-blue-400"
    case "C":
      return "text-yellow-600 dark:text-yellow-400"
    case "D":
      return "text-orange-600 dark:text-orange-400"
    case "F":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-gray-600"
  }
}

function getGradeBgColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
    case "B":
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
    case "C":
      return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900"
    case "D":
      return "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
    case "F":
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
    default:
      return "bg-gray-50 dark:bg-gray-900/30"
  }
}

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-green-500"
  if (score >= 6) return "bg-blue-500"
  if (score >= 4) return "bg-yellow-500"
  if (score >= 2) return "bg-orange-500"
  return "bg-red-500"
}

// Score Display Component
function ScoreDisplay({
  label,
  score,
  icon: Icon,
  description,
}: {
  label: string
  score: number
  icon: React.ComponentType<{ className?: string }>
  description: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="font-mono">
          {score.toFixed(1)}/10
        </Badge>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  )
}

// Main Component
export function Plan401kRating({ className }: Plan401kRatingProps) {
  // Match Generosity State
  const [matchPercent, setMatchPercent] = useState(50)
  const [upToPercent, setUpToPercent] = useState(6)

  // Investment Options State
  const [hasIndexFunds, setHasIndexFunds] = useState(true)
  const [hasTargetDateFunds, setHasTargetDateFunds] = useState(true)
  const [expenseRatio, setExpenseRatio] = useState(0.25)

  // Fees State
  const [adminFeePercent, setAdminFeePercent] = useState(0.25)
  const [perParticipantFee, setPerParticipantFee] = useState(50)

  // Mega Backdoor State
  const [afterTaxAllowed, setAfterTaxAllowed] = useState(false)
  const [inPlanConversion, setInPlanConversion] = useState(false)

  // Vesting State
  const [vestingType, setVestingType] = useState<VestingType>("graded-6")

  // Employer Name (for future plan lookup)
  const [employerName, setEmployerName] = useState("")

  // Calculate ratings
  const ratings = useMemo(() => {
    return calculateOverallRatings(
      { matchPercent, upToPercent },
      { hasIndexFunds, hasTargetDateFunds, expenseRatio },
      { adminFeePercent, perParticipantFee },
      { afterTaxContributionsAllowed: afterTaxAllowed, inPlanRothConversion: inPlanConversion },
      vestingType
    )
  }, [
    matchPercent,
    upToPercent,
    hasIndexFunds,
    hasTargetDateFunds,
    expenseRatio,
    adminFeePercent,
    perParticipantFee,
    afterTaxAllowed,
    inPlanConversion,
    vestingType,
  ])

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: { type: "good" | "warning" | "action"; text: string }[] = []

    // Strategy based on overall plan quality
    if (ratings.overallScore >= 7) {
      recs.push({
        type: "good",
        text: "Your plan is above average. Maximize your 401(k) contributions before other accounts.",
      })
    } else if (ratings.overallScore >= 5) {
      recs.push({
        type: "action",
        text: "Contribute enough to get the full employer match, then consider maxing a Roth IRA before additional 401(k) contributions.",
      })
    } else {
      recs.push({
        type: "warning",
        text: "Your plan has room for improvement. Prioritize: 1) Get employer match, 2) Max Roth IRA, 3) Taxable brokerage, 4) Additional 401(k) only if needed.",
      })
    }

    // Match-specific
    if (matchPercent === 0) {
      recs.push({
        type: "warning",
        text: "No employer match significantly reduces the plan's value. Consider talking to HR about adding a match.",
      })
    } else if (matchPercent >= 100 && upToPercent >= 6) {
      recs.push({
        type: "good",
        text: "Excellent match! This is a 100% immediate return on your contributions. Always contribute at least " + upToPercent + "% to capture it all.",
      })
    }

    // Investment-specific
    if (!hasIndexFunds) {
      recs.push({
        type: "warning",
        text: "No index funds is a red flag. Ask HR about adding low-cost index options like S&P 500 or Total Market funds.",
      })
    }

    if (expenseRatio > 0.5) {
      recs.push({
        type: "action",
        text: "High expense ratios (>" + expenseRatio.toFixed(2) + "%) cost you thousands over time. Advocate for lower-cost options.",
      })
    }

    // Mega Backdoor
    if (afterTaxAllowed && inPlanConversion) {
      recs.push({
        type: "good",
        text: "Mega Backdoor Roth available! After maxing traditional 401(k), you can contribute up to $69,000 total (2024) and convert to Roth. This is a powerful wealth-building tool.",
      })
    } else if (!afterTaxAllowed) {
      recs.push({
        type: "action",
        text: "Ask HR if after-tax contributions and in-plan Roth conversions can be added. The Mega Backdoor Roth is a valuable benefit.",
      })
    }

    // Vesting
    if (vestingType === "cliff-5") {
      recs.push({
        type: "warning",
        text: "5-year cliff vesting means you lose all employer contributions if you leave before 5 years. Factor this into job change decisions.",
      })
    }

    return recs
  }, [ratings, matchPercent, upToPercent, hasIndexFunds, expenseRatio, afterTaxAllowed, inPlanConversion, vestingType])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          401(k) Plan Rating Tool
        </CardTitle>
        <CardDescription>
          Rate your employer's 401(k) plan to understand its quality and optimize your strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Overall Grade Display */}
        <div className={`rounded-lg border-2 p-6 ${getGradeBgColor(ratings.grade)}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`text-6xl font-bold ${getGradeColor(ratings.grade)}`}>
                {ratings.grade}
              </div>
              <div>
                <div className="text-lg font-semibold">Overall Grade</div>
                <div className="text-sm text-muted-foreground">
                  Score: {ratings.overallScore.toFixed(1)}/10
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-3xl font-bold text-primary">
                Top {100 - ratings.percentile}%
              </div>
              <div className="text-sm text-muted-foreground">
                Better than {ratings.percentile}% of 401(k) plans
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Scores */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Category Scores</h3>
          <div className="grid gap-4">
            <ScoreDisplay
              label="Match Generosity"
              score={ratings.matchScore}
              icon={DollarSign}
              description="How generous is the employer match? 100% match up to 6% is excellent, no match scores poorly."
            />
            <ScoreDisplay
              label="Investment Options"
              score={ratings.investmentScore}
              icon={TrendingUp}
              description="Quality and cost of available investments. Low-cost index funds are essential."
            />
            <ScoreDisplay
              label="Plan Fees"
              score={ratings.feeScore}
              icon={Percent}
              description="Administrative and per-participant fees. Lower is better - these eat into returns."
            />
            <ScoreDisplay
              label="Mega Backdoor Roth"
              score={ratings.megaBackdoorScore}
              icon={Sparkles}
              description="After-tax contributions with in-plan Roth conversion. A powerful tax-advantaged feature."
            />
            <ScoreDisplay
              label="Vesting Schedule"
              score={ratings.vestingScore}
              icon={Clock}
              description="How quickly you own employer contributions. Immediate vesting is best."
            />
          </div>
        </div>

        {/* Input Sections */}
        <div className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-semibold">Rate Your Plan</h3>

          {/* Section 1: Match Generosity */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">1. Match Generosity</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Employer Match Rate</Label>
                  <span className="text-sm font-mono font-medium">{matchPercent}%</span>
                </div>
                <Slider
                  value={[matchPercent]}
                  onValueChange={(v) => setMatchPercent(v[0])}
                  min={0}
                  max={200}
                  step={25}
                  thumbLabel="Employer match percentage"
                />
                <p className="text-xs text-muted-foreground">
                  e.g., 50% match means employer contributes $0.50 for every $1 you contribute
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Up to % of Salary</Label>
                  <span className="text-sm font-mono font-medium">{upToPercent}%</span>
                </div>
                <Slider
                  value={[upToPercent]}
                  onValueChange={(v) => setUpToPercent(v[0])}
                  min={0}
                  max={10}
                  step={0.5}
                  thumbLabel="Maximum salary percentage matched"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum percentage of your salary that gets matched
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <strong>Your match:</strong> {matchPercent}% match up to {upToPercent}% of salary
              {matchPercent > 0 && (
                <span className="block text-muted-foreground mt-1">
                  Effective value: {((matchPercent / 100) * upToPercent).toFixed(1)}% of salary added by employer
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Investment Options */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold">2. Investment Options</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Index Funds Available</Label>
                  <p className="text-xs text-muted-foreground">S&P 500, Total Market, etc.</p>
                </div>
                <Switch
                  checked={hasIndexFunds}
                  onCheckedChange={setHasIndexFunds}
                  aria-label="Toggle index funds availability"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Target Date Funds</Label>
                  <p className="text-xs text-muted-foreground">Auto-rebalancing based on retirement year</p>
                </div>
                <Switch
                  checked={hasTargetDateFunds}
                  onCheckedChange={setHasTargetDateFunds}
                  aria-label="Toggle target date funds availability"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Average Expense Ratio</Label>
                <span className="text-sm font-mono font-medium">{expenseRatio.toFixed(2)}%</span>
              </div>
              <Slider
                value={[expenseRatio]}
                onValueChange={(v) => setExpenseRatio(v[0])}
                min={0.02}
                max={1.5}
                step={0.01}
                thumbLabel="Fund expense ratio"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Excellent (&lt;0.10%)</span>
                <span>Good (&lt;0.50%)</span>
                <span>High (&gt;1.00%)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Fees */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold">3. Plan Fees</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Administrative Fee (% of assets)</Label>
                  <span className="text-sm font-mono font-medium">{adminFeePercent.toFixed(2)}%</span>
                </div>
                <Slider
                  value={[adminFeePercent]}
                  onValueChange={(v) => setAdminFeePercent(v[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  thumbLabel="Administrative fee percentage"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Per-Participant Fee ($/year)</Label>
                  <span className="text-sm font-mono font-medium">${perParticipantFee}</span>
                </div>
                <Slider
                  value={[perParticipantFee]}
                  onValueChange={(v) => setPerParticipantFee(v[0])}
                  min={0}
                  max={200}
                  step={10}
                  thumbLabel="Per-participant annual fee"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <strong>Total annual cost</strong> (on $100k balance):{" "}
              <span className="font-mono">
                ${(adminFeePercent * 1000 + perParticipantFee).toFixed(0)}/year
              </span>
            </div>
          </div>

          {/* Section 4: Mega Backdoor Roth */}
          <div className="space-y-4 rounded-lg border p-4 border-purple-200 dark:border-purple-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold">4. Mega Backdoor Roth</h4>
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                Advanced
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              This powerful feature lets high earners contribute up to $69,000/year (2024) to tax-advantaged accounts.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>After-Tax Contributions Allowed</Label>
                  <p className="text-xs text-muted-foreground">Beyond the $23,000 pre-tax limit</p>
                </div>
                <Switch
                  checked={afterTaxAllowed}
                  onCheckedChange={setAfterTaxAllowed}
                  aria-label="Toggle after-tax contributions"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In-Plan Roth Conversion</Label>
                  <p className="text-xs text-muted-foreground">Convert after-tax to Roth within plan</p>
                </div>
                <Switch
                  checked={inPlanConversion}
                  onCheckedChange={setInPlanConversion}
                  aria-label="Toggle in-plan Roth conversion"
                />
              </div>
            </div>

            {afterTaxAllowed && inPlanConversion && (
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-md p-3 text-sm border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-purple-900 dark:text-purple-100">Mega Backdoor Roth Available!</strong>
                    <p className="text-purple-800 dark:text-purple-200 mt-1">
                      This is a significant advantage. After maxing your regular 401(k), you can contribute additional after-tax dollars and immediately convert them to Roth for tax-free growth.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Vesting Schedule */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold">5. Vesting Schedule</h4>
            </div>

            <Select value={vestingType} onValueChange={(v) => setVestingType(v as VestingType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vesting schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate (100% vested immediately)</SelectItem>
                <SelectItem value="graded-3">3-Year Graded (33% per year)</SelectItem>
                <SelectItem value="graded-6">6-Year Graded (20% per year after year 2)</SelectItem>
                <SelectItem value="cliff-3">3-Year Cliff (0% until year 3, then 100%)</SelectItem>
                <SelectItem value="cliff-5">5-Year Cliff (0% until year 5, then 100%)</SelectItem>
              </SelectContent>
            </Select>

            <div className="bg-muted/50 rounded-md p-3 text-sm">
              {vestingType === "immediate" && (
                <p>You own 100% of employer contributions immediately. Best possible vesting!</p>
              )}
              {vestingType === "graded-3" && (
                <p>Year 1: 33%, Year 2: 66%, Year 3: 100%. Standard and fair.</p>
              )}
              {vestingType === "graded-6" && (
                <p>Year 2: 20%, Year 3: 40%, Year 4: 60%, Year 5: 80%, Year 6: 100%. Common but slow.</p>
              )}
              {vestingType === "cliff-3" && (
                <p>You get nothing until year 3, then 100%. Risky if you might leave early.</p>
              )}
              {vestingType === "cliff-5" && (
                <p className="text-orange-700 dark:text-orange-300">
                  <strong>Warning:</strong> You lose all employer contributions if you leave before 5 years!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Recommendations
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-lg p-4 ${
                  rec.type === "good"
                    ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                    : rec.type === "warning"
                    ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                    : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                }`}
              >
                {rec.type === "good" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : rec.type === "warning" ? (
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Future: Plan Lookup */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Plan Lookup</h3>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 border border-dashed">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Automatic Plan Lookup
                </p>
                <p className="text-xs text-muted-foreground">
                  In the future, search by employer name to auto-populate plan details from public filings (Form 5500).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            This tool provides general guidance based on typical 401(k) plan characteristics. Your actual plan may have unique features not captured here. Consult your plan documents and a financial advisor for personalized advice.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default Plan401kRating

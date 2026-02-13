"use client"

import React, { useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  Zap,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react"
import { fmt } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface DailyContribution {
  date: string // ISO date string YYYY-MM-DD
  amount: number
  type?: "savings" | "investment" | "401k" | "ira" | "other"
  note?: string
}

export interface HeatmapCalendarProps {
  /** Array of daily contribution data */
  contributions: DailyContribution[]
  /** Starting year for the calendar (defaults to current year) */
  initialYear?: number
  /** Available years to select from */
  availableYears?: number[]
  /** Color scheme for the heatmap */
  colorScheme?: "green" | "blue" | "purple" | "emerald"
  /** Callback when a day is clicked */
  onDayClick?: (date: string, contribution?: DailyContribution) => void
  /** Custom className */
  className?: string
  /** Show streak indicators */
  showStreaks?: boolean
  /** Show monthly totals */
  showMonthlyTotals?: boolean
  /** Target daily amount for streak calculations */
  targetDailyAmount?: number
}

interface MonthData {
  month: number
  name: string
  days: DayData[]
  total: number
  contributionDays: number
}

interface DayData {
  date: string
  dayOfMonth: number
  dayOfWeek: number
  weekIndex: number
  amount: number
  contribution?: DailyContribution
  isToday: boolean
  isFuture: boolean
  isCurrentMonth: boolean
}

interface StreakInfo {
  current: number
  longest: number
  lastContributionDate: string | null
  isActive: boolean
}

// ============================================================================
// COLOR SCHEMES
// ============================================================================

const colorSchemes = {
  green: {
    empty: "bg-gray-100 dark:bg-gray-800",
    level1: "bg-green-200 dark:bg-green-900",
    level2: "bg-green-300 dark:bg-green-700",
    level3: "bg-green-400 dark:bg-green-600",
    level4: "bg-green-500 dark:bg-green-500",
    level5: "bg-green-600 dark:bg-green-400",
    glow: "shadow-green-500/50",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900",
  },
  blue: {
    empty: "bg-gray-100 dark:bg-gray-800",
    level1: "bg-blue-200 dark:bg-blue-900",
    level2: "bg-blue-300 dark:bg-blue-700",
    level3: "bg-blue-400 dark:bg-blue-600",
    level4: "bg-blue-500 dark:bg-blue-500",
    level5: "bg-blue-600 dark:bg-blue-400",
    glow: "shadow-blue-500/50",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900",
  },
  purple: {
    empty: "bg-gray-100 dark:bg-gray-800",
    level1: "bg-purple-200 dark:bg-purple-900",
    level2: "bg-purple-300 dark:bg-purple-700",
    level3: "bg-purple-400 dark:bg-purple-600",
    level4: "bg-purple-500 dark:bg-purple-500",
    level5: "bg-purple-600 dark:bg-purple-400",
    glow: "shadow-purple-500/50",
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-900",
  },
  emerald: {
    empty: "bg-gray-100 dark:bg-gray-800",
    level1: "bg-emerald-200 dark:bg-emerald-900",
    level2: "bg-emerald-300 dark:bg-emerald-700",
    level3: "bg-emerald-400 dark:bg-emerald-600",
    level4: "bg-emerald-500 dark:bg-emerald-500",
    level5: "bg-emerald-600 dark:bg-emerald-400",
    glow: "shadow-emerald-500/50",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900",
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// ============================================================================
// COMPONENT
// ============================================================================

export const HeatmapCalendar = React.memo(function HeatmapCalendar({
  contributions,
  initialYear,
  availableYears,
  colorScheme = "green",
  onDayClick,
  className,
  showStreaks = true,
  showMonthlyTotals = true,
  targetDailyAmount = 50,
}: HeatmapCalendarProps) {
  const today = new Date()
  const currentYear = today.getFullYear()

  const [selectedYear, setSelectedYear] = useState(initialYear ?? currentYear)

  const colors = colorSchemes[colorScheme]

  // Build contribution map for quick lookup
  const contributionMap = useMemo(() => {
    const map = new Map<string, DailyContribution>()
    contributions.forEach((c) => {
      map.set(c.date, c)
    })
    return map
  }, [contributions])

  // Calculate year statistics
  const yearStats = useMemo(() => {
    let total = 0
    let contributionDays = 0
    let maxDaily = 0

    contributions.forEach((c) => {
      const date = parseDate(c.date)
      if (date.getFullYear() === selectedYear) {
        total += c.amount
        contributionDays++
        maxDaily = Math.max(maxDaily, c.amount)
      }
    })

    return { total, contributionDays, maxDaily }
  }, [contributions, selectedYear])

  // Calculate color intensity levels based on contribution amounts
  const getColorLevel = useCallback((amount: number): string => {
    if (amount === 0) return colors.empty

    // Dynamic thresholds based on max contribution or target
    const threshold = Math.max(yearStats.maxDaily, targetDailyAmount * 5)
    const ratio = amount / threshold

    if (ratio <= 0.15) return colors.level1
    if (ratio <= 0.35) return colors.level2
    if (ratio <= 0.55) return colors.level3
    if (ratio <= 0.75) return colors.level4
    return colors.level5
  }, [colors, yearStats.maxDaily, targetDailyAmount])

  // Build calendar data structure
  const calendarData = useMemo((): MonthData[] => {
    const months: MonthData[] = []

    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(selectedYear, month)
      const firstDay = getFirstDayOfMonth(selectedYear, month)
      const days: DayData[] = []
      let monthTotal = 0
      let monthContributionDays = 0

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, month, day)
        const dateKey = getDateKey(date)
        const contribution = contributionMap.get(dateKey)
        const amount = contribution?.amount ?? 0

        if (amount > 0) {
          monthTotal += amount
          monthContributionDays++
        }

        days.push({
          date: dateKey,
          dayOfMonth: day,
          dayOfWeek: date.getDay(),
          weekIndex: Math.floor((firstDay + day - 1) / 7),
          amount,
          contribution,
          isToday: isSameDay(date, today),
          isFuture: date > today,
          isCurrentMonth: true,
        })
      }

      months.push({
        month,
        name: MONTHS[month],
        days,
        total: monthTotal,
        contributionDays: monthContributionDays,
      })
    }

    return months
  }, [selectedYear, contributionMap, today])

  // Calculate streaks
  const streakInfo = useMemo((): StreakInfo => {
    // Get all contribution dates for the year, sorted
    const yearContributions = contributions
      .filter((c) => parseDate(c.date).getFullYear() === selectedYear && c.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (yearContributions.length === 0) {
      return { current: 0, longest: 0, lastContributionDate: null, isActive: false }
    }

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 1
    const lastContributionDate = yearContributions[yearContributions.length - 1].date

    // Calculate longest streak
    for (let i = 1; i < yearContributions.length; i++) {
      const prevDate = parseDate(yearContributions[i - 1].date)
      const currDate = parseDate(yearContributions[i].date)
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (diffDays === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // Calculate current streak (going backwards from today)
    const todayKey = getDateKey(today)
    const yesterdayKey = getDateKey(new Date(today.getTime() - 86400000))

    // Check if streak is active (contributed today or yesterday)
    const lastContrib = parseDate(lastContributionDate)
    const daysSinceLastContrib = Math.round(
      (today.getTime() - lastContrib.getTime()) / (1000 * 60 * 60 * 24)
    )
    const isActive = daysSinceLastContrib <= 1

    if (isActive) {
      // Count backwards from the last contribution
      currentStreak = 1
      for (let i = yearContributions.length - 2; i >= 0; i--) {
        const currDate = parseDate(yearContributions[i + 1].date)
        const prevDate = parseDate(yearContributions[i].date)
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      lastContributionDate,
      isActive,
    }
  }, [contributions, selectedYear, today])

  // Year navigation
  const years = availableYears ??
    Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).filter((y) => y <= currentYear)

  const canGoPrev = years.indexOf(selectedYear) > 0
  const canGoNext = years.indexOf(selectedYear) < years.length - 1

  const handlePrevYear = () => {
    const idx = years.indexOf(selectedYear)
    if (idx > 0) setSelectedYear(years[idx - 1])
  }

  const handleNextYear = () => {
    const idx = years.indexOf(selectedYear)
    if (idx < years.length - 1) setSelectedYear(years[idx + 1])
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className={cn("h-5 w-5", colors.text)} />
              Savings Activity
            </CardTitle>
            <CardDescription>
              Track your daily contributions and build savings streaks
            </CardDescription>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevYear}
              disabled={!canGoPrev}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                canGoPrev
                  ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={cn(
                "px-3 py-1.5 rounded-md border bg-background text-foreground",
                "font-semibold text-lg cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextYear}
              disabled={!canGoNext}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                canGoNext
                  ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              aria-label="Next year"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex flex-wrap gap-4 mt-4">
          {/* Total Saved */}
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", colors.bg, colors.border, "border")}>
            <TrendingUp className={cn("h-4 w-4", colors.text)} />
            <div>
              <div className="text-xs text-muted-foreground">Total Saved</div>
              <div className={cn("font-bold", colors.text)}>{fmt(yearStats.total)}</div>
            </div>
          </div>

          {/* Active Days */}
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", colors.bg, colors.border, "border")}>
            <Target className={cn("h-4 w-4", colors.text)} />
            <div>
              <div className="text-xs text-muted-foreground">Active Days</div>
              <div className={cn("font-bold", colors.text)}>{yearStats.contributionDays}</div>
            </div>
          </div>

          {/* Streaks */}
          {showStreaks && (
            <>
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border",
                streakInfo.isActive
                  ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                  : "bg-muted/50 border-border"
              )}>
                <Flame className={cn(
                  "h-4 w-4",
                  streakInfo.isActive
                    ? "text-orange-500 animate-pulse"
                    : "text-muted-foreground"
                )} />
                <div>
                  <div className="text-xs text-muted-foreground">Current Streak</div>
                  <div className={cn(
                    "font-bold",
                    streakInfo.isActive ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                  )}>
                    {streakInfo.current} day{streakInfo.current !== 1 ? "s" : ""}
                    {streakInfo.isActive && streakInfo.current >= 7 && " "}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Best Streak</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    {streakInfo.longest} day{streakInfo.longest !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[800px]">
            {/* Month Labels */}
            <div className="flex mb-2">
              <div className="w-8" /> {/* Spacer for day labels */}
              {calendarData.map((month) => (
                <div
                  key={month.month}
                  className="flex-1 text-center text-xs font-medium text-muted-foreground"
                >
                  {month.name}
                </div>
              ))}
            </div>

            {/* Day Labels + Grid */}
            <div className="flex">
              {/* Day of week labels */}
              <div className="w-8 flex flex-col justify-between py-0.5">
                {DAYS.map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      "text-[10px] text-muted-foreground h-3 flex items-center",
                      idx % 2 === 1 ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {day.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 flex gap-0.5">
                {calendarData.map((month) => (
                  <MonthColumn
                    key={month.month}
                    month={month}
                    colors={colors}
                    getColorLevel={getColorLevel}
                    onDayClick={onDayClick}
                    showMonthlyTotals={showMonthlyTotals}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Less
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded-sm", colors.empty)} />
                <div className={cn("w-3 h-3 rounded-sm", colors.level1)} />
                <div className={cn("w-3 h-3 rounded-sm", colors.level2)} />
                <div className={cn("w-3 h-3 rounded-sm", colors.level3)} />
                <div className={cn("w-3 h-3 rounded-sm", colors.level4)} />
                <div className={cn("w-3 h-3 rounded-sm", colors.level5)} />
              </div>
              <div className="text-xs text-muted-foreground">
                More
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Totals */}
        {showMonthlyTotals && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-medium mb-3">Monthly Breakdown</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {calendarData.map((month) => (
                <div
                  key={month.month}
                  className={cn(
                    "p-2 rounded-lg text-center transition-all",
                    month.total > 0
                      ? cn(colors.bg, colors.border, "border")
                      : "bg-muted/30"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{month.name}</div>
                  <div className={cn(
                    "font-semibold text-sm",
                    month.total > 0 ? colors.text : "text-muted-foreground"
                  )}>
                    {month.total > 0 ? fmt(month.total) : "-"}
                  </div>
                  {month.contributionDays > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {month.contributionDays} day{month.contributionDays !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gamification Elements */}
        {showStreaks && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Achievements
            </div>
            <div className="flex flex-wrap gap-2">
              <AchievementBadge
                title="First Step"
                description="Made your first contribution"
                unlocked={yearStats.contributionDays >= 1}
                icon={<Target className="h-3 w-3" />}
              />
              <AchievementBadge
                title="Week Warrior"
                description="7-day saving streak"
                unlocked={streakInfo.longest >= 7}
                icon={<Flame className="h-3 w-3" />}
              />
              <AchievementBadge
                title="Monthly Master"
                description="30-day saving streak"
                unlocked={streakInfo.longest >= 30}
                icon={<Trophy className="h-3 w-3" />}
              />
              <AchievementBadge
                title="Centurion"
                description="100 days of contributions"
                unlocked={yearStats.contributionDays >= 100}
                icon={<Zap className="h-3 w-3" />}
              />
              <AchievementBadge
                title="$10K Club"
                description="Saved $10,000 in a year"
                unlocked={yearStats.total >= 10000}
                icon={<TrendingUp className="h-3 w-3" />}
              />
              <AchievementBadge
                title="$50K Legend"
                description="Saved $50,000 in a year"
                unlocked={yearStats.total >= 50000}
                icon={<Trophy className="h-3 w-3" />}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================================================
// MONTH COLUMN COMPONENT
// ============================================================================

interface MonthColumnProps {
  month: MonthData
  colors: typeof colorSchemes.green
  getColorLevel: (amount: number) => string
  onDayClick?: (date: string, contribution?: DailyContribution) => void
  showMonthlyTotals: boolean
}

const MonthColumn = React.memo(function MonthColumn({
  month,
  colors,
  getColorLevel,
  onDayClick,
}: MonthColumnProps) {
  // Build a 7x6 grid (7 days x ~6 weeks max)
  const weeks: (DayData | null)[][] = []

  // Get first day of month's day of week
  const firstDayOfWeek = month.days[0]?.dayOfWeek ?? 0

  // Calculate number of weeks needed
  const totalCells = firstDayOfWeek + month.days.length
  const numWeeks = Math.ceil(totalCells / 7)

  for (let week = 0; week < numWeeks; week++) {
    const weekDays: (DayData | null)[] = []
    for (let dow = 0; dow < 7; dow++) {
      const dayIndex = week * 7 + dow - firstDayOfWeek
      if (dayIndex >= 0 && dayIndex < month.days.length) {
        weekDays.push(month.days[dayIndex])
      } else {
        weekDays.push(null)
      }
    }
    weeks.push(weekDays)
  }

  return (
    <div className="flex-1 flex flex-col gap-0.5">
      {/* Transpose to show days of week as rows */}
      {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
        <div key={dow} className="flex gap-0.5">
          {weeks.map((week, weekIdx) => {
            const day = week[dow]
            if (!day) {
              return <div key={weekIdx} className="w-3 h-3" />
            }
            return (
              <DayCell
                key={day.date}
                day={day}
                colors={colors}
                colorLevel={getColorLevel(day.amount)}
                onClick={onDayClick}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
})

// ============================================================================
// DAY CELL COMPONENT
// ============================================================================

interface DayCellProps {
  day: DayData
  colors: typeof colorSchemes.green
  colorLevel: string
  onClick?: (date: string, contribution?: DailyContribution) => void
}

const DayCell = React.memo(function DayCell({
  day,
  colors,
  colorLevel,
  onClick,
}: DayCellProps) {
  const handleClick = () => {
    onClick?.(day.date, day.contribution)
  }

  const formattedDate = useMemo(() => {
    const date = parseDate(day.date)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [day.date])

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={day.isFuture}
            className={cn(
              "w-3 h-3 rounded-sm transition-all duration-150",
              colorLevel,
              day.isToday && "ring-2 ring-offset-1 ring-foreground",
              day.isFuture && "opacity-30 cursor-not-allowed",
              !day.isFuture && "hover:scale-125 hover:z-10 cursor-pointer",
              day.amount > 0 && !day.isFuture && `hover:shadow-md ${colors.glow}`
            )}
            aria-label={`${formattedDate}: ${day.amount > 0 ? fmt(day.amount) : "No contribution"}`}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs"
          sideOffset={8}
        >
          <div className="space-y-1">
            <div className="font-semibold text-sm">{formattedDate}</div>
            {day.amount > 0 ? (
              <>
                <div className={cn("text-lg font-bold", colors.text)}>
                  {fmt(day.amount)}
                </div>
                {day.contribution?.type && (
                  <Badge variant="outline" className="text-xs">
                    {day.contribution.type.toUpperCase()}
                  </Badge>
                )}
                {day.contribution?.note && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {day.contribution.note}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {day.isFuture ? "Future date" : "No contribution"}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

// ============================================================================
// ACHIEVEMENT BADGE COMPONENT
// ============================================================================

interface AchievementBadgeProps {
  title: string
  description: string
  unlocked: boolean
  icon: React.ReactNode
}

const AchievementBadge = React.memo(function AchievementBadge({
  title,
  description,
  unlocked,
  icon,
}: AchievementBadgeProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
              unlocked
                ? "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shadow-sm"
                : "bg-muted text-muted-foreground border border-transparent opacity-50 grayscale"
            )}
          >
            <span className={unlocked ? "animate-pulse" : ""}>{icon}</span>
            {title}
            {unlocked && <span className="ml-1">+</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-center">
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
            <div className={cn(
              "text-xs mt-1 font-medium",
              unlocked ? "text-green-500" : "text-muted-foreground"
            )}>
              {unlocked ? "Unlocked!" : "Locked"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default HeatmapCalendar

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  SlidersHorizontal,
  History,
  TrendingUp,
  Clock,
  Target,
  Trophy,
  Calendar,
  BarChart3,
  Sparkles,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline, MiniSparkline } from "@/components/ui/Sparkline";

// ==================== Types ====================

interface ParameterAdjustment {
  parameter: string;
  count: number;
  lastAdjusted: number;
}

interface ScenarioHistoryEntry {
  id: string;
  timestamp: number;
  name: string;
  successRate: number;
  endOfLifeWealth: number;
  retirementAge: number;
  withdrawalRate: number;
}

interface GoalAchievement {
  id: string;
  name: string;
  description: string;
  achievedAt: number;
  icon: string;
}

interface PlanningSession {
  date: string;
  durationMinutes: number;
  calculationsRun: number;
}

interface AnalyticsData {
  totalCalculations: number;
  parameterAdjustments: ParameterAdjustment[];
  scenarioHistory: ScenarioHistoryEntry[];
  goalsAchieved: GoalAchievement[];
  planningSessions: PlanningSession[];
  firstVisit: number;
  lastVisit: number;
  totalPlanningMinutes: number;
  currentSessionStart: number;
  bestSuccessRate: number;
  improvementFromStart: number;
}

interface AnalyticsDashboardProps {
  onCalculationRun?: () => void;
  onParameterChange?: (parameter: string) => void;
  onScenarioSave?: (scenario: ScenarioHistoryEntry) => void;
  currentSuccessRate?: number;
  currentEndOfLifeWealth?: number;
  retirementAge?: number;
  withdrawalRate?: number;
}

// ==================== Storage Keys ====================

const STORAGE_KEY = "retirement_calc_analytics";
const SESSION_KEY = "retirement_calc_session";

// ==================== Default Data ====================

const getDefaultAnalytics = (): AnalyticsData => ({
  totalCalculations: 0,
  parameterAdjustments: [],
  scenarioHistory: [],
  goalsAchieved: [],
  planningSessions: [],
  firstVisit: Date.now(),
  lastVisit: Date.now(),
  totalPlanningMinutes: 0,
  currentSessionStart: Date.now(),
  bestSuccessRate: 0,
  improvementFromStart: 0,
});

// ==================== Goal Definitions ====================

const GOAL_DEFINITIONS = [
  {
    id: "first_calculation",
    name: "First Steps",
    description: "Run your first retirement calculation",
    icon: "calculator",
    check: (data: AnalyticsData) => data.totalCalculations >= 1,
  },
  {
    id: "ten_calculations",
    name: "Explorer",
    description: "Run 10 different calculations",
    icon: "search",
    check: (data: AnalyticsData) => data.totalCalculations >= 10,
  },
  {
    id: "fifty_calculations",
    name: "Power Planner",
    description: "Run 50 calculations to optimize your plan",
    icon: "rocket",
    check: (data: AnalyticsData) => data.totalCalculations >= 50,
  },
  {
    id: "scenario_saver",
    name: "Scenario Saver",
    description: "Save 5 different scenarios",
    icon: "bookmark",
    check: (data: AnalyticsData) => data.scenarioHistory.length >= 5,
  },
  {
    id: "optimization_master",
    name: "Optimization Master",
    description: "Adjust parameters 20 times to fine-tune your plan",
    icon: "sliders",
    check: (data: AnalyticsData) =>
      data.parameterAdjustments.reduce((sum, p) => sum + p.count, 0) >= 20,
  },
  {
    id: "high_success",
    name: "High Achiever",
    description: "Achieve a 90%+ success rate",
    icon: "trophy",
    check: (data: AnalyticsData) => data.bestSuccessRate >= 90,
  },
  {
    id: "improved_10pct",
    name: "Progress Maker",
    description: "Improve your success rate by 10 percentage points",
    icon: "trending-up",
    check: (data: AnalyticsData) => data.improvementFromStart >= 10,
  },
  {
    id: "dedicated_planner",
    name: "Dedicated Planner",
    description: "Spend 30+ minutes planning your retirement",
    icon: "clock",
    check: (data: AnalyticsData) => data.totalPlanningMinutes >= 30,
  },
  {
    id: "week_streak",
    name: "Consistent Planner",
    description: "Return to plan on 7 different days",
    icon: "calendar",
    check: (data: AnalyticsData) => {
      const uniqueDays = new Set(data.planningSessions.map((s) => s.date));
      return uniqueDays.size >= 7;
    },
  },
];

// ==================== Utility Functions ====================

const anonymizeValue = (value: number, precision: number = 1000): number => {
  return Math.round(value / precision) * precision;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const getIconForGoal = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    calculator: <Calculator className="w-4 h-4" />,
    search: <BarChart3 className="w-4 h-4" />,
    rocket: <Sparkles className="w-4 h-4" />,
    bookmark: <History className="w-4 h-4" />,
    sliders: <SlidersHorizontal className="w-4 h-4" />,
    trophy: <Trophy className="w-4 h-4" />,
    "trending-up": <TrendingUp className="w-4 h-4" />,
    clock: <Clock className="w-4 h-4" />,
    calendar: <Calendar className="w-4 h-4" />,
  };
  return icons[iconName] || <Target className="w-4 h-4" />;
};

// ==================== Custom Hook for Analytics ====================

function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(getDefaultAnalytics);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AnalyticsData;
        // Update last visit and session start
        parsed.lastVisit = Date.now();
        parsed.currentSessionStart = Date.now();
        setData(parsed);
      } else {
        // First visit
        const initial = getDefaultAnalytics();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        setData(initial);
      }
    } catch {
      // If parsing fails, start fresh
      const initial = getDefaultAnalytics();
      setData(initial);
    }
    setIsLoaded(true);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  // Track session time
  useEffect(() => {
    if (!isLoaded) return;

    const updateSessionTime = () => {
      const sessionMinutes =
        (Date.now() - data.currentSessionStart) / 60000;
      const today = new Date().toISOString().split("T")[0];

      setData((prev) => {
        const existingSession = prev.planningSessions.find(
          (s) => s.date === today
        );
        let updatedSessions: PlanningSession[];

        if (existingSession) {
          updatedSessions = prev.planningSessions.map((s) =>
            s.date === today
              ? {
                  ...s,
                  durationMinutes: s.durationMinutes + sessionMinutes,
                }
              : s
          );
        } else {
          updatedSessions = [
            ...prev.planningSessions,
            {
              date: today,
              durationMinutes: sessionMinutes,
              calculationsRun: 0,
            },
          ];
        }

        return {
          ...prev,
          planningSessions: updatedSessions.slice(-30), // Keep last 30 days
          totalPlanningMinutes: prev.totalPlanningMinutes + sessionMinutes,
          currentSessionStart: Date.now(),
        };
      });
    };

    // Update every 5 minutes
    const interval = setInterval(updateSessionTime, 5 * 60 * 1000);

    // Also update on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSessionTime();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      updateSessionTime();
    };
  }, [isLoaded, data.currentSessionStart]);

  const recordCalculation = useCallback(() => {
    setData((prev) => {
      const today = new Date().toISOString().split("T")[0];
      const updatedSessions = prev.planningSessions.map((s) =>
        s.date === today
          ? { ...s, calculationsRun: s.calculationsRun + 1 }
          : s
      );

      // Ensure today's session exists
      if (!updatedSessions.find((s) => s.date === today)) {
        updatedSessions.push({
          date: today,
          durationMinutes: 0,
          calculationsRun: 1,
        });
      }

      return {
        ...prev,
        totalCalculations: prev.totalCalculations + 1,
        planningSessions: updatedSessions,
      };
    });
  }, []);

  const recordParameterChange = useCallback((parameter: string) => {
    setData((prev) => {
      const existing = prev.parameterAdjustments.find(
        (p) => p.parameter === parameter
      );
      let updatedAdjustments: ParameterAdjustment[];

      if (existing) {
        updatedAdjustments = prev.parameterAdjustments.map((p) =>
          p.parameter === parameter
            ? { ...p, count: p.count + 1, lastAdjusted: Date.now() }
            : p
        );
      } else {
        updatedAdjustments = [
          ...prev.parameterAdjustments,
          { parameter, count: 1, lastAdjusted: Date.now() },
        ];
      }

      return {
        ...prev,
        parameterAdjustments: updatedAdjustments,
      };
    });
  }, []);

  const recordScenario = useCallback(
    (
      successRate: number,
      endOfLifeWealth: number,
      retirementAge: number,
      withdrawalRate: number
    ) => {
      setData((prev) => {
        const newScenario: ScenarioHistoryEntry = {
          id: `scenario_${Date.now()}`,
          timestamp: Date.now(),
          name: `Scenario ${prev.scenarioHistory.length + 1}`,
          successRate: anonymizeValue(successRate, 1),
          endOfLifeWealth: anonymizeValue(endOfLifeWealth, 10000),
          retirementAge,
          withdrawalRate: anonymizeValue(withdrawalRate, 0.1),
        };

        // Calculate improvement from first scenario
        const firstScenario = prev.scenarioHistory[0];
        const improvementFromStart = firstScenario
          ? successRate - firstScenario.successRate
          : 0;

        return {
          ...prev,
          scenarioHistory: [...prev.scenarioHistory, newScenario].slice(-50), // Keep last 50
          bestSuccessRate: Math.max(prev.bestSuccessRate, successRate),
          improvementFromStart: Math.max(prev.improvementFromStart, improvementFromStart),
        };
      });
    },
    []
  );

  const checkGoals = useCallback(() => {
    setData((prev) => {
      const newGoals: GoalAchievement[] = [];

      for (const goalDef of GOAL_DEFINITIONS) {
        const alreadyAchieved = prev.goalsAchieved.find(
          (g) => g.id === goalDef.id
        );
        if (!alreadyAchieved && goalDef.check(prev)) {
          newGoals.push({
            id: goalDef.id,
            name: goalDef.name,
            description: goalDef.description,
            achievedAt: Date.now(),
            icon: goalDef.icon,
          });
        }
      }

      if (newGoals.length === 0) return prev;

      return {
        ...prev,
        goalsAchieved: [...prev.goalsAchieved, ...newGoals],
      };
    });
  }, []);

  const clearData = useCallback(() => {
    const fresh = getDefaultAnalytics();
    setData(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  return {
    data,
    isLoaded,
    recordCalculation,
    recordParameterChange,
    recordScenario,
    checkGoals,
    clearData,
  };
}

// ==================== Sub-Components ====================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  /** Optional sparkline data for trend visualization */
  sparklineData?: number[];
  /** Sparkline variant */
  sparklineVariant?: "line" | "bar" | "area";
}

function StatCard({ title, value, subtitle, icon, color, sparklineData, sparklineVariant = "line" }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2",
        color,
        "transition-all duration-200 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-full bg-background/80">{icon}</div>
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 pt-2 border-t border-current/10">
          <Sparkline
            data={sparklineData}
            width={120}
            height={24}
            variant={sparklineVariant}
            colorMode="auto"
            showTooltip={true}
            strokeWidth={1.5}
          />
        </div>
      )}
    </div>
  );
}

interface TimelineEntryProps {
  entry: ScenarioHistoryEntry;
  isLatest: boolean;
  previousRate?: number;
}

function TimelineEntry({ entry, isLatest, previousRate }: TimelineEntryProps) {
  const improvement =
    previousRate !== undefined ? entry.successRate - previousRate : 0;

  return (
    <div
      className={cn(
        "relative pl-6 pb-4 border-l-2",
        isLatest ? "border-primary" : "border-muted"
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full",
          isLatest ? "bg-primary" : "bg-muted"
        )}
      />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.name}</span>
          {isLatest && (
            <Badge variant="secondary" className="text-[10px]">
              Latest
            </Badge>
          )}
          {improvement !== 0 && (
            <Badge
              variant={improvement > 0 ? "default" : "destructive"}
              className="text-[10px]"
            >
              {improvement > 0 ? "+" : ""}
              {improvement.toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Success: {entry.successRate.toFixed(1)}%</span>
          <span>Retire at {entry.retirementAge}</span>
          <span>{formatRelativeTime(entry.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

interface GoalBadgeProps {
  goal: GoalAchievement;
}

function GoalBadge({ goal }: GoalBadgeProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800">
      <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400">
        {getIconForGoal(goal.icon)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{goal.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {goal.description}
        </p>
      </div>
      <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
    </div>
  );
}

interface ParameterBarProps {
  parameter: string;
  count: number;
  maxCount: number;
}

function ParameterBar({ parameter, count, maxCount }: ParameterBarProps) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  // Humanize parameter names
  const displayName =
    {
      retirementAge: "Retirement Age",
      withdrawalRate: "Withdrawal Rate",
      savingsRate: "Savings Rate",
      inflationRate: "Inflation Rate",
      returnRate: "Return Rate",
      socialSecurity: "Social Security",
      bondAllocation: "Bond Allocation",
      rothConversion: "Roth Conversion",
    }[parameter] || parameter;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{displayName}</span>
        <span className="font-medium">{count}x</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

// ==================== Main Component ====================

export function AnalyticsDashboard({
  onCalculationRun,
  onParameterChange,
  onScenarioSave,
  currentSuccessRate,
  currentEndOfLifeWealth,
  retirementAge,
  withdrawalRate,
}: AnalyticsDashboardProps) {
  const {
    data,
    isLoaded,
    recordCalculation,
    recordParameterChange,
    recordScenario,
    checkGoals,
    clearData,
  } = useAnalytics();

  // Expose recording functions via callbacks
  useEffect(() => {
    if (onCalculationRun) {
      recordCalculation();
      checkGoals();
    }
  }, [onCalculationRun]);

  useEffect(() => {
    if (onParameterChange) {
      // This would be called with the parameter name from parent
    }
  }, [onParameterChange]);

  // Record scenario when results change
  useEffect(() => {
    if (
      currentSuccessRate !== undefined &&
      currentEndOfLifeWealth !== undefined &&
      retirementAge !== undefined &&
      withdrawalRate !== undefined
    ) {
      recordScenario(
        currentSuccessRate,
        currentEndOfLifeWealth,
        retirementAge,
        withdrawalRate
      );
      checkGoals();
    }
  }, [currentSuccessRate, currentEndOfLifeWealth, retirementAge, withdrawalRate]);

  // Calculate derived metrics
  const metrics = useMemo(() => {
    const totalAdjustments = data.parameterAdjustments.reduce(
      (sum, p) => sum + p.count,
      0
    );
    const mostAdjusted = [...data.parameterAdjustments]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxAdjustmentCount = mostAdjusted[0]?.count || 0;

    const recentScenarios = [...data.scenarioHistory]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    const uniqueDays = new Set(data.planningSessions.map((s) => s.date));

    const goalsProgress = {
      achieved: data.goalsAchieved.length,
      total: GOAL_DEFINITIONS.length,
      percentage: (data.goalsAchieved.length / GOAL_DEFINITIONS.length) * 100,
    };

    // Calculate planning streak
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let checkDate = new Date();

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDays.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr !== today) {
        break;
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Generate sparkline data from history
    const successRateHistory = data.scenarioHistory
      .slice(-12)
      .map(s => s.successRate);

    const calculationsPerDay = data.planningSessions
      .slice(-7)
      .map(s => s.calculationsRun);

    const planningTimePerDay = data.planningSessions
      .slice(-7)
      .map(s => s.durationMinutes);

    const goalsOverTime = data.goalsAchieved
      .map((_, i) => i + 1);

    return {
      totalAdjustments,
      mostAdjusted,
      maxAdjustmentCount,
      recentScenarios,
      uniqueDays: uniqueDays.size,
      goalsProgress,
      streak,
      // Sparkline data
      successRateHistory,
      calculationsPerDay,
      planningTimePerDay,
      goalsOverTime,
    };
  }, [data]);

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Your Planning Journey
            </CardTitle>
            <CardDescription>
              Track your retirement planning progress and insights
            </CardDescription>
          </div>
          <button
            onClick={clearData}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
            title="Clear all analytics data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Calculations Run"
            value={data.totalCalculations}
            subtitle={
              data.totalCalculations > 0
                ? `Since ${new Date(data.firstVisit).toLocaleDateString()}`
                : "Run your first calculation"
            }
            icon={<Calculator className="w-5 h-5 text-blue-600" />}
            color="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
            sparklineData={metrics.calculationsPerDay}
            sparklineVariant="bar"
          />
          <StatCard
            title="Time Planning"
            value={formatDuration(data.totalPlanningMinutes)}
            subtitle={
              metrics.streak > 1 ? `${metrics.streak} day streak` : "Keep planning"
            }
            icon={<Clock className="w-5 h-5 text-purple-600" />}
            color="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20"
            sparklineData={metrics.planningTimePerDay}
            sparklineVariant="area"
          />
          <StatCard
            title="Best Success Rate"
            value={`${data.bestSuccessRate.toFixed(0)}%`}
            subtitle={
              data.improvementFromStart > 0
                ? `+${data.improvementFromStart.toFixed(0)}% improvement`
                : "Keep optimizing"
            }
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            color="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
            sparklineData={metrics.successRateHistory}
            sparklineVariant="line"
          />
          <StatCard
            title="Goals Achieved"
            value={`${metrics.goalsProgress.achieved}/${metrics.goalsProgress.total}`}
            subtitle={`${metrics.goalsProgress.percentage.toFixed(0)}% complete`}
            icon={<Trophy className="w-5 h-5 text-amber-600" />}
            color="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
            sparklineData={metrics.goalsOverTime}
            sparklineVariant="area"
          />
        </div>

        {/* Goals Section */}
        {data.goalsAchieved.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Achievements Unlocked
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.goalsAchieved.slice(-4).map((goal) => (
                <GoalBadge key={goal.id} goal={goal} />
              ))}
            </div>
            {data.goalsAchieved.length > 4 && (
              <p className="text-xs text-muted-foreground text-center">
                +{data.goalsAchieved.length - 4} more achievements
              </p>
            )}
          </div>
        )}

        {/* Most Adjusted Parameters */}
        {metrics.mostAdjusted.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              Most Adjusted Parameters
            </h3>
            <div className="space-y-2">
              {metrics.mostAdjusted.map((param) => (
                <ParameterBar
                  key={param.parameter}
                  parameter={param.parameter}
                  count={param.count}
                  maxCount={metrics.maxAdjustmentCount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scenario History Timeline */}
        {metrics.recentScenarios.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                Scenario History
              </h3>
              {metrics.successRateHistory.length > 2 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Trend:</span>
                  <MiniSparkline
                    data={metrics.successRateHistory}
                    size="sm"
                    variant="line"
                    colorMode="auto"
                  />
                </div>
              )}
            </div>
            <div className="space-y-0 pl-2">
              {metrics.recentScenarios.slice(0, 5).map((entry, index) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLatest={index === 0}
                  previousRate={metrics.recentScenarios[index + 1]?.successRate}
                />
              ))}
            </div>
            {metrics.recentScenarios.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                {metrics.recentScenarios.length - 5} more scenarios in history
              </p>
            )}
          </div>
        )}

        {/* Improvement Tracking */}
        {data.scenarioHistory.length >= 2 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Progress Tracking</p>
                <p className="text-sm text-muted-foreground">
                  {data.improvementFromStart >= 0 ? (
                    <>
                      You've improved your success rate by{" "}
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {data.improvementFromStart.toFixed(1)} percentage points
                      </span>{" "}
                      since your first scenario.
                    </>
                  ) : (
                    <>
                      Your current plan is{" "}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {Math.abs(data.improvementFromStart).toFixed(1)} percentage
                        points
                      </span>{" "}
                      below your first scenario. Keep optimizing!
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.totalCalculations === 0 && (
          <div className="text-center py-8 space-y-3">
            <div className="inline-flex p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30">
              <Calculator className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Start Your Planning Journey</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Run your first retirement calculation to begin tracking your
                progress and unlock achievements.
              </p>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="pt-4 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            All data is stored locally on your device. Financial values are
            anonymized and rounded for privacy. No data is sent to external
            servers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Export Hook for External Use ====================

export { useAnalytics };
export type { AnalyticsData, ScenarioHistoryEntry, GoalAchievement };

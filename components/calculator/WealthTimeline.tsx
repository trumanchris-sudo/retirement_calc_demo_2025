"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Target,
  Trophy,
  Crown,
  Heart,
  TrendingUp,
  Star,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import type { CalculationResult, ChartDataPoint } from "@/types/calculator";

// ==================== Types ====================

interface WealthMilestone {
  id: string;
  value: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: "accumulation" | "retirement" | "legacy";
  description: string;
  celebrationEmoji: string;
}

interface TimelinePoint {
  milestone: WealthMilestone;
  year: number;
  age: number;
  actualValue: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  percentOfTimeline: number;
}

interface WealthTimelineProps {
  result: CalculationResult;
  currentAge: number;
  retirementAge: number;
  currentWealth?: number;
}

// ==================== Constants ====================

const WEALTH_MILESTONES: WealthMilestone[] = [
  {
    id: "100k",
    value: 100_000,
    label: "First $100K",
    shortLabel: "$100K",
    icon: Sparkles,
    phase: "accumulation",
    description: "The hardest milestone! Your money truly starts working for you.",
    celebrationEmoji: "🎯",
  },
  {
    id: "250k",
    value: 250_000,
    label: "Quarter Million",
    shortLabel: "$250K",
    icon: TrendingUp,
    phase: "accumulation",
    description: "Momentum is building. Compound interest is becoming visible.",
    celebrationEmoji: "📈",
  },
  {
    id: "500k",
    value: 500_000,
    label: "Half Million",
    shortLabel: "$500K",
    icon: Target,
    phase: "accumulation",
    description: "A major psychological milestone. You're building real wealth.",
    celebrationEmoji: "🎪",
  },
  {
    id: "1m",
    value: 1_000_000,
    label: "Millionaire",
    shortLabel: "$1M",
    icon: Trophy,
    phase: "accumulation",
    description: "Welcome to the seven-figure club. A testament to discipline.",
    celebrationEmoji: "🏆",
  },
  {
    id: "2m",
    value: 2_000_000,
    label: "Double Millionaire",
    shortLabel: "$2M",
    icon: Star,
    phase: "retirement",
    description: "Financial freedom achieved. Your wealth sustains your lifestyle.",
    celebrationEmoji: "⭐",
  },
  {
    id: "5m",
    value: 5_000_000,
    label: "Five Million",
    shortLabel: "$5M",
    icon: Crown,
    phase: "retirement",
    description: "Generational wealth territory. Options are limitless.",
    celebrationEmoji: "👑",
  },
  {
    id: "retirement",
    value: -1, // Special marker - will be calculated
    label: "Retirement",
    shortLabel: "Retire",
    icon: Heart,
    phase: "retirement",
    description: "The beginning of your next chapter. Freedom to choose.",
    celebrationEmoji: "🌅",
  },
  {
    id: "estate",
    value: -2, // Special marker - end of simulation
    label: "Legacy Estate",
    shortLabel: "Estate",
    icon: Gem,
    phase: "legacy",
    description: "Your lasting impact on the next generation.",
    celebrationEmoji: "💎",
  },
];

// Phase color configurations
const PHASE_COLORS = {
  accumulation: {
    bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
    border: "border-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/50",
    line: "#3b82f6",
    fill: "rgba(59, 130, 246, 0.1)",
  },
  retirement: {
    bg: "bg-gradient-to-r from-emerald-500 to-green-500",
    border: "border-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "shadow-emerald-500/50",
    line: "#10b981",
    fill: "rgba(16, 185, 129, 0.1)",
  },
  legacy: {
    bg: "bg-gradient-to-r from-purple-500 to-violet-500",
    border: "border-purple-400",
    text: "text-purple-600 dark:text-purple-400",
    glow: "shadow-purple-500/50",
    line: "#8b5cf6",
    fill: "rgba(139, 92, 246, 0.1)",
  },
};

// ==================== Helper Functions ====================

function findMilestoneYear(
  data: ChartDataPoint[],
  targetValue: number,
  currentYear: number
): { year: number; age: number; value: number } | null {
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    if (point.real >= targetValue) {
      return {
        year: point.year,
        age: point.a1,
        value: point.real,
      };
    }
  }
  return null;
}

function getCurrentWealthFromData(
  data: ChartDataPoint[],
  currentYear: number
): number {
  const currentPoint = data.find((p) => p.year === currentYear);
  return currentPoint?.real ?? data[0]?.real ?? 0;
}

// ==================== Sub-Components ====================

interface MilestoneNodeProps {
  point: TimelinePoint;
  index: number;
  totalPoints: number;
  isAnimated: boolean;
  onHover: (point: TimelinePoint | null) => void;
  hoveredPoint: TimelinePoint | null;
}

const MilestoneNode = React.memo(function MilestoneNode({
  point,
  index,
  totalPoints,
  isAnimated,
  onHover,
  hoveredPoint,
}: MilestoneNodeProps) {
  const Icon = point.milestone.icon;
  const phaseColors = PHASE_COLORS[point.milestone.phase];
  const isHovered = hoveredPoint?.milestone.id === point.milestone.id;
  const nodeSize = point.isCurrent ? "w-14 h-14 md:w-16 md:h-16" : "w-10 h-10 md:w-12 md:h-12";

  const animationDelay = `${index * 150}ms`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex flex-col items-center cursor-pointer transition-all duration-300",
              "group",
              isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{
              transitionDelay: isAnimated ? animationDelay : "0ms",
              left: `${point.percentOfTimeline}%`,
            }}
            onMouseEnter={() => onHover(point)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Connector line to timeline */}
            <div
              className={cn(
                "absolute bottom-full h-6 md:h-8 w-0.5 transition-all duration-300",
                point.isPast
                  ? phaseColors.bg
                  : point.isFuture
                  ? "bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500"
                  : phaseColors.bg
              )}
              style={{
                opacity: isHovered ? 1 : 0.6,
              }}
            />

            {/* Milestone node */}
            <div
              className={cn(
                "relative rounded-full flex items-center justify-center transition-all duration-300",
                nodeSize,
                point.isPast
                  ? phaseColors.bg
                  : point.isCurrent
                  ? cn(phaseColors.bg, "ring-4 ring-offset-2 ring-offset-background", phaseColors.border)
                  : "bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400 dark:border-gray-500",
                isHovered && "scale-110 shadow-lg",
                point.isCurrent && "animate-pulse"
              )}
              style={{
                boxShadow: isHovered && point.isPast
                  ? `0 0 20px ${PHASE_COLORS[point.milestone.phase].line}40`
                  : undefined,
              }}
            >
              <Icon
                className={cn(
                  "transition-all duration-300",
                  point.isCurrent ? "w-6 h-6 md:w-7 md:h-7" : "w-4 h-4 md:w-5 md:h-5",
                  point.isPast || point.isCurrent
                    ? "text-white"
                    : "text-gray-500 dark:text-gray-400"
                )}
              />

              {/* Current position pulse ring */}
              {point.isCurrent && (
                <>
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full animate-ping opacity-30",
                      phaseColors.bg
                    )}
                  />
                  <div
                    className={cn(
                      "absolute -inset-1 rounded-full animate-pulse opacity-20",
                      phaseColors.bg
                    )}
                  />
                </>
              )}

              {/* Achievement badge for past milestones */}
              {point.isPast && !point.isCurrent && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-xs shadow-sm">
                  <span className="text-[10px]">{point.milestone.celebrationEmoji}</span>
                </div>
              )}
            </div>

            {/* Label */}
            <div
              className={cn(
                "mt-2 text-center transition-all duration-300",
                isHovered && "scale-105"
              )}
            >
              <div
                className={cn(
                  "font-semibold text-xs md:text-sm whitespace-nowrap",
                  point.isPast || point.isCurrent
                    ? phaseColors.text
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {point.milestone.shortLabel}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground">
                Age {point.age}
              </div>
            </div>

            {/* Future indicator */}
            {point.isFuture && (
              <Badge
                variant="outline"
                className="absolute -bottom-6 text-[8px] md:text-[10px] px-1 py-0 opacity-70"
              >
                {point.year}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-4 bg-card/95 backdrop-blur-sm border shadow-xl"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-full", phaseColors.bg)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold">{point.milestone.label}</div>
                <div className="text-xs text-muted-foreground">
                  {point.milestone.phase.charAt(0).toUpperCase() + point.milestone.phase.slice(1)} Phase
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {point.milestone.description}
            </p>
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target:</span>
                <span className="font-mono font-semibold">{fmt(point.milestone.value)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projected at:</span>
                <span className="font-mono">{point.year} (Age {point.age})</span>
              </div>
              {point.isPast && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {fmt(point.actualValue)}
                  </span>
                </div>
              )}
            </div>
            {point.isCurrent && (
              <div className="pt-2 border-t">
                <Badge className={cn("w-full justify-center", phaseColors.bg)}>
                  You Are Here
                </Badge>
              </div>
            )}
            {point.isFuture && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground italic text-center">
                  {Math.abs(point.year - new Date().getFullYear())} years from now
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ==================== Main Component ====================

export const WealthTimeline = React.memo(function WealthTimeline({
  result,
  currentAge,
  retirementAge,
  currentWealth = 0,
}: WealthTimelineProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);
  const [pathProgress, setPathProgress] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentYear = new Date().getFullYear();
  const data = result.data;

  // Calculate the actual current wealth from the data
  const actualCurrentWealth = useMemo(() => {
    if (currentWealth > 0) return currentWealth;
    return getCurrentWealthFromData(data, currentYear);
  }, [data, currentYear, currentWealth]);

  // Calculate timeline points from milestones
  const timelinePoints = useMemo<TimelinePoint[]>(() => {
    const points: TimelinePoint[] = [];
    const lastDataPoint = data[data.length - 1];
    const firstDataPoint = data[0];
    const timelineSpan = lastDataPoint.year - firstDataPoint.year;

    // Process each milestone
    for (const milestone of WEALTH_MILESTONES) {
      let year: number;
      let age: number;
      let actualValue: number;

      if (milestone.id === "retirement") {
        // Retirement milestone
        year = currentYear + (retirementAge - currentAge);
        age = retirementAge;
        const retirementPoint = data.find((p) => p.a1 === retirementAge);
        actualValue = retirementPoint?.real ?? result.finReal;
      } else if (milestone.id === "estate") {
        // Estate milestone (end of simulation)
        year = lastDataPoint.year;
        age = lastDataPoint.a1;
        actualValue = result.eolReal;
      } else {
        // Wealth-based milestone
        const found = findMilestoneYear(data, milestone.value, currentYear);
        if (!found) continue; // Skip milestones that won't be reached
        if (found.value > result.eolReal * 1.5) continue; // Skip unrealistic milestones
        year = found.year;
        age = found.age;
        actualValue = found.value;
      }

      const isPast = year < currentYear || (year === currentYear && actualCurrentWealth >= milestone.value);
      const isCurrent = milestone.id === "retirement"
        ? currentAge === retirementAge
        : Math.abs(actualCurrentWealth - milestone.value) < milestone.value * 0.1;
      const isFuture = year > currentYear && !isPast && !isCurrent;

      const percentOfTimeline = ((year - firstDataPoint.year) / timelineSpan) * 100;

      points.push({
        milestone: { ...milestone, value: milestone.value < 0 ? actualValue : milestone.value },
        year,
        age,
        actualValue,
        isPast,
        isCurrent,
        isFuture,
        percentOfTimeline: Math.min(100, Math.max(0, percentOfTimeline)),
      });
    }

    // Sort by year
    return points.sort((a, b) => a.year - b.year);
  }, [data, currentYear, currentAge, retirementAge, actualCurrentWealth, result]);

  // Find current position on timeline
  const currentPositionPercent = useMemo(() => {
    const firstYear = data[0]?.year ?? currentYear;
    const lastYear = data[data.length - 1]?.year ?? currentYear + 40;
    const span = lastYear - firstYear;
    return ((currentYear - firstYear) / span) * 100;
  }, [data, currentYear]);

  // Animation on mount / intersection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsAnimated(true);
            // Animate path drawing
            const animateProgress = () => {
              setPathProgress(0);
              let progress = 0;
              const interval = setInterval(() => {
                progress += 2;
                setPathProgress(Math.min(progress, 100));
                if (progress >= 100) clearInterval(interval);
              }, 20);
            };
            setTimeout(animateProgress, 300);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (timelineRef.current) {
      observer.observe(timelineRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle hover callback
  const handleHover = useCallback((point: TimelinePoint | null) => {
    setHoveredPoint(point);
  }, []);

  // Calculate path for the wealth curve
  const wealthPath = useMemo(() => {
    if (data.length < 2) return "";

    const width = 1000;
    const height = 100;
    const maxWealth = Math.max(...data.map(d => d.real));
    const minWealth = Math.min(...data.map(d => d.real));
    const wealthRange = maxWealth - minWealth || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.real - minWealth) / wealthRange) * height * 0.8 - height * 0.1;
      return { x, y };
    });

    // Create smooth curve using cubic bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
    }

    return path;
  }, [data]);

  // Calculate split point for retirement (solid vs dashed)
  const retirementSplitPercent = useMemo(() => {
    const retirementYear = currentYear + (retirementAge - currentAge);
    const firstYear = data[0]?.year ?? currentYear;
    const lastYear = data[data.length - 1]?.year ?? currentYear + 40;
    return ((retirementYear - firstYear) / (lastYear - firstYear)) * 100;
  }, [data, currentYear, currentAge, retirementAge]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Your Wealth Story
            </CardTitle>
            <CardDescription>
              Key milestones on your path to financial freedom
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {(["accumulation", "retirement", "legacy"] as const).map((phase) => (
              <Badge
                key={phase}
                variant="outline"
                className={cn(
                  "text-[10px] md:text-xs capitalize",
                  PHASE_COLORS[phase].text,
                  PHASE_COLORS[phase].border
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mr-1",
                    PHASE_COLORS[phase].bg
                  )}
                />
                {phase}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-6">
        <div
          ref={timelineRef}
          className="relative px-4 md:px-8"
        >
          {/* Background wealth curve visualization */}
          <div className="absolute inset-x-4 md:inset-x-8 top-0 h-24 overflow-hidden opacity-30">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="wealthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={PHASE_COLORS.accumulation.line} />
                  <stop offset={`${retirementSplitPercent}%`} stopColor={PHASE_COLORS.retirement.line} />
                  <stop offset="100%" stopColor={PHASE_COLORS.legacy.line} />
                </linearGradient>
                <linearGradient id="wealthFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Wealth curve fill */}
              <path
                d={`${wealthPath} L 1000 100 L 0 100 Z`}
                fill="url(#wealthFill)"
                className="text-primary"
                style={{
                  clipPath: `inset(0 ${100 - pathProgress}% 0 0)`,
                  transition: "clip-path 50ms linear",
                }}
              />

              {/* Wealth curve line - past portion (solid) */}
              <path
                d={wealthPath}
                fill="none"
                stroke="url(#wealthGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={pathProgress < currentPositionPercent ? "0" : "none"}
                style={{
                  clipPath: `inset(0 ${100 - Math.min(pathProgress, currentPositionPercent)}% 0 0)`,
                  transition: "clip-path 50ms linear",
                }}
              />

              {/* Wealth curve line - future portion (dashed) */}
              <path
                d={wealthPath}
                fill="none"
                stroke="url(#wealthGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="8 4"
                opacity="0.5"
                style={{
                  clipPath: `inset(0 ${100 - pathProgress}% 0 ${currentPositionPercent}%)`,
                  transition: "clip-path 50ms linear",
                }}
              />

              {/* Current position marker */}
              <circle
                cx={currentPositionPercent * 10}
                cy="50"
                r="6"
                fill={PHASE_COLORS.accumulation.line}
                className="animate-pulse"
                style={{
                  opacity: pathProgress >= currentPositionPercent ? 1 : 0,
                  transition: "opacity 300ms ease",
                }}
              />
            </svg>
          </div>

          {/* Timeline base line */}
          <div className="relative h-48 md:h-56 flex items-end pb-16 md:pb-20">
            {/* Timeline horizontal line */}
            <div className="absolute bottom-8 md:bottom-10 left-0 right-0 h-1 rounded-full overflow-hidden">
              {/* Past portion (solid, colored by phase) */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 transition-all duration-1000 ease-out"
                style={{
                  width: `${isAnimated ? currentPositionPercent : 0}%`,
                }}
              />
              {/* Future portion (dashed) */}
              <div
                className="absolute inset-y-0 right-0 bg-gray-200 dark:bg-gray-700"
                style={{
                  left: `${currentPositionPercent}%`,
                  backgroundImage: `repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 4px,
                    currentColor 4px,
                    currentColor 8px
                  )`,
                  opacity: 0.5,
                }}
              />
            </div>

            {/* Current position indicator on timeline */}
            <div
              className="absolute bottom-6 md:bottom-8 transition-all duration-1000 ease-out z-20"
              style={{
                left: `${isAnimated ? currentPositionPercent : 0}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="relative">
                <div className="w-4 h-4 bg-primary rounded-full shadow-lg animate-pulse" />
                <div className="absolute inset-0 w-4 h-4 bg-primary rounded-full animate-ping opacity-50" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    Today
                  </Badge>
                </div>
              </div>
            </div>

            {/* Milestone nodes container */}
            <div className="absolute bottom-14 md:bottom-16 left-0 right-0">
              <div className="relative h-24 md:h-28">
                {/* Position milestone nodes absolutely */}
                {timelinePoints.map((point, index) => (
                  <div
                    key={point.milestone.id}
                    className="absolute"
                    style={{
                      left: `${point.percentOfTimeline}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <MilestoneNode
                      point={point}
                      index={index}
                      totalPoints={timelinePoints.length}
                      isAnimated={isAnimated}
                      onHover={handleHover}
                      hoveredPoint={hoveredPoint}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Year markers */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] md:text-xs text-muted-foreground">
              <span>{data[0]?.year ?? currentYear}</span>
              <span className="font-medium text-foreground">
                {currentYear}
              </span>
              <span>{data[data.length - 1]?.year ?? currentYear + 40}</span>
            </div>
          </div>

          {/* Current wealth summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Current Wealth</div>
                <div className="font-mono font-bold text-lg md:text-xl text-blue-600 dark:text-blue-400">
                  {fmt(actualCurrentWealth)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">At Retirement</div>
                <div className="font-mono font-bold text-lg md:text-xl text-emerald-600 dark:text-emerald-400">
                  {fmt(result.finReal)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estate Value</div>
                <div className="font-mono font-bold text-lg md:text-xl text-purple-600 dark:text-purple-400">
                  {fmt(result.eolReal)}
                </div>
              </div>
            </div>
          </div>

          {/* Motivational message based on progress */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground italic">
              {actualCurrentWealth >= 1_000_000
                ? "Incredible journey! Your discipline has built generational wealth."
                : actualCurrentWealth >= 500_000
                ? "You're in the top tier. Keep the momentum going!"
                : actualCurrentWealth >= 100_000
                ? "The hardest milestone is behind you. Compound growth accelerates from here."
                : "Every journey begins with a single step. Your future self will thank you."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default WealthTimeline;

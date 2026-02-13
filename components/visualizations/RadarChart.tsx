"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Info, Target, TrendingUp, Shield, Droplets, PieChart, Percent } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface RadarAxis {
  key: string;
  label: string;
  value: number; // 0-100 scale
  icon: React.ReactNode;
  description: string;
  tips: string[];
}

export interface RadarScenario {
  id: string;
  name: string;
  color: string;
  axes: RadarAxis[];
  isOptimal?: boolean;
}

export interface RadarChartProps {
  /** Array of scenarios to display (first is typically user's profile) */
  scenarios: RadarScenario[];
  /** Size of the chart in pixels */
  size?: number;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Whether to animate drawing on mount */
  animateOnMount?: boolean;
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
  /** Callback when an axis is clicked */
  onAxisClick?: (axis: RadarAxis) => void;
}

// ============================================================================
// Axis Explanations
// ============================================================================

const AXIS_EXPLANATIONS: Record<string, { title: string; description: string; tips: string[] }> = {
  savingsRate: {
    title: "Savings Rate",
    description: "The percentage of your gross income that you save and invest each month. A higher savings rate accelerates wealth building and provides more financial flexibility.",
    tips: [
      "Aim for at least 15-20% of gross income",
      "Include employer 401(k) matches in your calculation",
      "Automate savings to remove decision fatigue",
      "Increase rate by 1% with each raise"
    ]
  },
  taxEfficiency: {
    title: "Tax Efficiency",
    description: "How effectively you minimize taxes through strategic account placement and tax-advantaged vehicles. This measures your use of 401(k), IRA, HSA, and tax-loss harvesting.",
    tips: [
      "Max out tax-advantaged accounts first",
      "Place bonds in tax-deferred accounts",
      "Hold growth stocks in taxable accounts",
      "Consider Roth conversions in low-income years"
    ]
  },
  riskLevel: {
    title: "Risk Level",
    description: "Your portfolio's risk-adjusted positioning relative to your time horizon and goals. Higher isn't always better - it should match your timeline and risk tolerance.",
    tips: [
      "Younger investors can typically take more risk",
      "Reduce risk as retirement approaches",
      "Diversify across asset classes",
      "Consider your emotional tolerance for volatility"
    ]
  },
  diversification: {
    title: "Diversification",
    description: "How well your assets are spread across different asset classes, sectors, and geographies. Good diversification reduces overall portfolio risk without sacrificing returns.",
    tips: [
      "Include domestic and international stocks",
      "Add bonds for stability",
      "Consider REITs for real estate exposure",
      "Avoid over-concentration in employer stock"
    ]
  },
  liquidity: {
    title: "Liquidity",
    description: "Your ability to access cash quickly without penalties or selling at a loss. Includes emergency fund adequacy and accessible investment accounts.",
    tips: [
      "Maintain 3-6 months expenses in emergency fund",
      "Keep some investments in taxable accounts",
      "Consider a HELOC as backup liquidity",
      "Balance liquidity with investment returns"
    ]
  }
};

// ============================================================================
// Default Optimal Profile
// ============================================================================

export const OPTIMAL_PROFILE: RadarAxis[] = [
  {
    key: "savingsRate",
    label: "Savings Rate",
    value: 85,
    icon: <Percent className="h-4 w-4" />,
    description: AXIS_EXPLANATIONS.savingsRate.description,
    tips: AXIS_EXPLANATIONS.savingsRate.tips
  },
  {
    key: "taxEfficiency",
    label: "Tax Efficiency",
    value: 90,
    icon: <Shield className="h-4 w-4" />,
    description: AXIS_EXPLANATIONS.taxEfficiency.description,
    tips: AXIS_EXPLANATIONS.taxEfficiency.tips
  },
  {
    key: "riskLevel",
    label: "Risk Level",
    value: 70,
    icon: <TrendingUp className="h-4 w-4" />,
    description: AXIS_EXPLANATIONS.riskLevel.description,
    tips: AXIS_EXPLANATIONS.riskLevel.tips
  },
  {
    key: "diversification",
    label: "Diversification",
    value: 95,
    icon: <PieChart className="h-4 w-4" />,
    description: AXIS_EXPLANATIONS.diversification.description,
    tips: AXIS_EXPLANATIONS.diversification.tips
  },
  {
    key: "liquidity",
    label: "Liquidity",
    value: 75,
    icon: <Droplets className="h-4 w-4" />,
    description: AXIS_EXPLANATIONS.liquidity.description,
    tips: AXIS_EXPLANATIONS.liquidity.tips
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert polar coordinates to cartesian
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

/**
 * Generate polygon points for a radar shape
 */
function generatePolygonPoints(
  center: number,
  values: number[],
  maxRadius: number
): string {
  const angleStep = 360 / values.length;
  return values
    .map((value, index) => {
      const radius = (value / 100) * maxRadius;
      const point = polarToCartesian(center, center, radius, angleStep * index);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

/**
 * Generate SVG path for animated drawing
 */
function generatePolygonPath(
  center: number,
  values: number[],
  maxRadius: number
): string {
  const angleStep = 360 / values.length;
  const points = values.map((value, index) => {
    const radius = (value / 100) * maxRadius;
    return polarToCartesian(center, center, radius, angleStep * index);
  });

  if (points.length === 0) return "";

  const pathParts = points.map((point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `L ${point.x} ${point.y}`;
  });

  return pathParts.join(" ") + " Z";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AxisLabelProps {
  axis: RadarAxis;
  position: { x: number; y: number };
  angle: number;
  onAxisClick?: (axis: RadarAxis) => void;
}

function AxisLabel({ axis, position, angle, onAxisClick }: AxisLabelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine text anchor based on position
  const getTextAnchor = () => {
    if (angle > 45 && angle < 135) return "start";
    if (angle > 225 && angle < 315) return "end";
    return "middle";
  };

  // Determine vertical offset based on position
  const getVerticalOffset = () => {
    if (angle >= 315 || angle < 45) return -12;
    if (angle >= 135 && angle < 225) return 20;
    return 4;
  };

  // Determine horizontal offset based on position
  const getHorizontalOffset = () => {
    if (angle > 45 && angle < 135) return 12;
    if (angle > 225 && angle < 315) return -12;
    return 0;
  };

  const handleClick = () => {
    setIsOpen(true);
    onAxisClick?.(axis);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <g
          className="cursor-pointer group"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label={`Learn more about ${axis.label}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleClick();
            }
          }}
        >
          {/* Invisible larger hit area */}
          <circle
            cx={position.x + getHorizontalOffset()}
            cy={position.y + getVerticalOffset()}
            r={30}
            fill="transparent"
          />
          {/* Label text */}
          <text
            x={position.x + getHorizontalOffset()}
            y={position.y + getVerticalOffset()}
            textAnchor={getTextAnchor()}
            className="text-xs font-medium fill-foreground group-hover:fill-primary transition-colors"
          >
            {axis.label}
          </text>
          {/* Value badge */}
          <text
            x={position.x + getHorizontalOffset()}
            y={position.y + getVerticalOffset() + 14}
            textAnchor={getTextAnchor()}
            className="text-[10px] fill-muted-foreground group-hover:fill-primary transition-colors"
          >
            {axis.value}%
          </text>
          {/* Info icon indicator */}
          <circle
            cx={position.x + getHorizontalOffset() + (getTextAnchor() === "start" ? 45 : getTextAnchor() === "end" ? -45 : 35)}
            cy={position.y + getVerticalOffset() - 2}
            r={6}
            className="fill-muted group-hover:fill-primary/20 transition-colors"
          />
          <text
            x={position.x + getHorizontalOffset() + (getTextAnchor() === "start" ? 45 : getTextAnchor() === "end" ? -45 : 35)}
            y={position.y + getVerticalOffset() + 2}
            textAnchor="middle"
            className="text-[8px] fill-muted-foreground group-hover:fill-primary transition-colors"
          >
            ?
          </text>
        </g>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top" sideOffset={8}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {axis.icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm">{axis.label}</h4>
              <Badge variant="outline" className="text-xs">
                Your Score: {axis.value}%
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {axis.description}
          </p>
          {axis.tips.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Tips to Improve:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {axis.tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RadarChart({
  scenarios,
  size = 400,
  showLegend = true,
  animateOnMount = true,
  animationDuration = 1.5,
  className,
  onAxisClick
}: RadarChartProps) {
  const [isAnimating, setIsAnimating] = useState(animateOnMount);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);

  // Chart dimensions
  const padding = 60;
  const center = size / 2;
  const maxRadius = (size - padding * 2) / 2;
  const numAxes = scenarios[0]?.axes.length || 5;
  const angleStep = 360 / numAxes;

  // Generate grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  // Calculate axis positions for labels
  const axisPositions = useMemo(() => {
    if (!scenarios[0]) return [];
    return scenarios[0].axes.map((axis, index) => {
      const angle = angleStep * index;
      const point = polarToCartesian(center, center, maxRadius + 25, angle);
      return { axis, position: point, angle };
    });
  }, [scenarios, center, maxRadius, angleStep]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < numAxes; i++) {
      const angle = angleStep * i;
      const outer = polarToCartesian(center, center, maxRadius, angle);
      lines.push({ x1: center, y1: center, x2: outer.x, y2: outer.y });
    }
    return lines;
  }, [center, maxRadius, numAxes, angleStep]);

  // Handle animation completion
  useEffect(() => {
    if (animateOnMount) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration * 1000);
      return () => clearTimeout(timer);
    }
  }, [animateOnMount, animationDuration]);

  // Calculate path lengths for animation
  const getPathLength = useCallback((values: number[]) => {
    const points = values.map((value, index) => {
      const radius = (value / 100) * maxRadius;
      return polarToCartesian(center, center, radius, angleStep * index);
    });

    let length = 0;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      length += Math.sqrt(
        Math.pow(next.x - points[i].x, 2) + Math.pow(next.y - points[i].y, 2)
      );
    }
    return length;
  }, [center, maxRadius, angleStep]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Financial Profile Radar
            </CardTitle>
            <CardDescription>
              Multi-dimensional view of your financial health
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Info className="h-3 w-3 mr-1" />
            Click axes for details
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* SVG Radar Chart */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          role="img"
          aria-label="Radar chart comparing financial profiles"
        >
          {/* Grid circles */}
          {gridLevels.map((level) => {
            const radius = (level / 100) * maxRadius;
            return (
              <g key={`grid-${level}`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                />
                {/* Grid level label */}
                <text
                  x={center + 4}
                  y={center - radius + 4}
                  className="text-[9px] fill-muted-foreground/50"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Axis lines */}
          {gridLines.map((line, index) => (
            <line
              key={`axis-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          ))}

          {/* Scenario polygons */}
          <AnimatePresence>
            {scenarios.map((scenario, scenarioIndex) => {
              const values = scenario.axes.map((a) => a.value);
              const path = generatePolygonPath(center, values, maxRadius);
              const pathLength = getPathLength(values);
              const isHighlighted = hoveredScenario === scenario.id || selectedScenario === scenario.id;
              const isOptimalScenario = scenario.isOptimal;

              return (
                <g
                  key={scenario.id}
                  onMouseEnter={() => setHoveredScenario(scenario.id)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  onClick={() => setSelectedScenario(
                    selectedScenario === scenario.id ? null : scenario.id
                  )}
                  className="cursor-pointer"
                >
                  {/* Filled area */}
                  <motion.path
                    d={path}
                    fill={scenario.color}
                    fillOpacity={isHighlighted ? 0.3 : isOptimalScenario ? 0.1 : 0.15}
                    stroke={scenario.color}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeLinejoin="round"
                    initial={animateOnMount ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                    animate={{
                      pathLength: 1,
                      opacity: 1,
                      strokeWidth: isHighlighted ? 3 : 2
                    }}
                    transition={{
                      pathLength: {
                        duration: animationDuration,
                        delay: scenarioIndex * 0.3,
                        ease: "easeInOut"
                      },
                      opacity: {
                        duration: 0.3,
                        delay: scenarioIndex * 0.3
                      },
                      strokeWidth: {
                        duration: 0.2
                      }
                    }}
                    style={{
                      strokeDasharray: pathLength,
                      strokeDashoffset: 0
                    }}
                  />

                  {/* Data points */}
                  {scenario.axes.map((axis, axisIndex) => {
                    const angle = angleStep * axisIndex;
                    const radius = (axis.value / 100) * maxRadius;
                    const point = polarToCartesian(center, center, radius, angle);

                    return (
                      <motion.circle
                        key={`${scenario.id}-${axis.key}`}
                        cx={point.x}
                        cy={point.y}
                        r={isHighlighted ? 6 : 4}
                        fill={scenario.color}
                        stroke="white"
                        strokeWidth={2}
                        initial={animateOnMount ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: animateOnMount
                            ? scenarioIndex * 0.3 + axisIndex * 0.1 + animationDuration * 0.5
                            : 0,
                          duration: 0.3,
                          type: "spring",
                          stiffness: 200
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}
          </AnimatePresence>

          {/* Axis labels (rendered last to be on top) */}
          {axisPositions.map(({ axis, position, angle }) => (
            <AxisLabel
              key={axis.key}
              axis={axis}
              position={position}
              angle={angle}
              onAxisClick={onAxisClick}
            />
          ))}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t w-full">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                  "hover:bg-muted/50",
                  (hoveredScenario === scenario.id || selectedScenario === scenario.id)
                    ? "bg-muted ring-2 ring-offset-2"
                    : "bg-muted/30"
                )}
                style={{
                  ringColor: scenario.color
                }}
                onMouseEnter={() => setHoveredScenario(scenario.id)}
                onMouseLeave={() => setHoveredScenario(null)}
                onClick={() => setSelectedScenario(
                  selectedScenario === scenario.id ? null : scenario.id
                )}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: scenario.color }}
                />
                <span className="font-medium">{scenario.name}</span>
                {scenario.isOptimal && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Target
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Score Summary */}
        <div className="grid grid-cols-5 gap-2 mt-4 w-full">
          {scenarios[0]?.axes.map((axis) => {
            const optimalAxis = scenarios.find(s => s.isOptimal)?.axes.find(a => a.key === axis.key);
            const difference = optimalAxis ? axis.value - optimalAxis.value : 0;

            return (
              <div
                key={axis.key}
                className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="text-lg font-bold">{axis.value}%</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {axis.label}
                </div>
                {optimalAxis && difference !== 0 && (
                  <Badge
                    variant={difference >= 0 ? "default" : "secondary"}
                    className={cn(
                      "text-[9px] px-1 mt-1",
                      difference >= 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    )}
                  >
                    {difference > 0 ? "+" : ""}{difference}%
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Function to Create Profile from User Data
// ============================================================================

export interface UserFinancialData {
  /** Monthly savings as percentage of gross income */
  savingsRatePercent: number;
  /** Percentage of savings in tax-advantaged accounts (401k, IRA, HSA) */
  taxAdvantagedPercent: number;
  /** Stock allocation percentage (higher = more risk) */
  stockAllocationPercent: number;
  /** Number of distinct asset classes held */
  assetClassCount: number;
  /** Emergency fund months of expenses */
  emergencyFundMonths: number;
  /** Age for risk calculation */
  age?: number;
}

/**
 * Creates a radar scenario from user financial data
 */
export function createUserProfile(
  data: UserFinancialData,
  name: string = "Your Profile",
  color: string = "#3b82f6"
): RadarScenario {
  // Calculate savings rate score (0-100)
  // 0% = 0, 20% = 100, caps at 100
  const savingsRateScore = Math.min(100, (data.savingsRatePercent / 20) * 100);

  // Calculate tax efficiency score
  // 0% tax-advantaged = 0, 80% = 100
  const taxEfficiencyScore = Math.min(100, (data.taxAdvantagedPercent / 80) * 100);

  // Calculate risk level score
  // This is relative to age - higher stock allocation is better when young
  const targetStockAllocation = data.age
    ? Math.max(20, 110 - data.age) // Rule of 110
    : 70;
  const riskDifference = Math.abs(data.stockAllocationPercent - targetStockAllocation);
  const riskScore = Math.max(0, 100 - riskDifference * 2);

  // Calculate diversification score
  // 1 asset class = 20, 5+ = 100
  const diversificationScore = Math.min(100, Math.max(20, data.assetClassCount * 20));

  // Calculate liquidity score
  // 0 months = 0, 6 months = 100
  const liquidityScore = Math.min(100, (data.emergencyFundMonths / 6) * 100);

  const axes: RadarAxis[] = [
    {
      key: "savingsRate",
      label: "Savings Rate",
      value: Math.round(savingsRateScore),
      icon: <Percent className="h-4 w-4" />,
      description: AXIS_EXPLANATIONS.savingsRate.description,
      tips: AXIS_EXPLANATIONS.savingsRate.tips
    },
    {
      key: "taxEfficiency",
      label: "Tax Efficiency",
      value: Math.round(taxEfficiencyScore),
      icon: <Shield className="h-4 w-4" />,
      description: AXIS_EXPLANATIONS.taxEfficiency.description,
      tips: AXIS_EXPLANATIONS.taxEfficiency.tips
    },
    {
      key: "riskLevel",
      label: "Risk Level",
      value: Math.round(riskScore),
      icon: <TrendingUp className="h-4 w-4" />,
      description: AXIS_EXPLANATIONS.riskLevel.description,
      tips: AXIS_EXPLANATIONS.riskLevel.tips
    },
    {
      key: "diversification",
      label: "Diversification",
      value: Math.round(diversificationScore),
      icon: <PieChart className="h-4 w-4" />,
      description: AXIS_EXPLANATIONS.diversification.description,
      tips: AXIS_EXPLANATIONS.diversification.tips
    },
    {
      key: "liquidity",
      label: "Liquidity",
      value: Math.round(liquidityScore),
      icon: <Droplets className="h-4 w-4" />,
      description: AXIS_EXPLANATIONS.liquidity.description,
      tips: AXIS_EXPLANATIONS.liquidity.tips
    }
  ];

  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    color,
    axes
  };
}

/**
 * Creates the optimal/target profile for comparison
 */
export function createOptimalProfile(
  color: string = "#22c55e"
): RadarScenario {
  return {
    id: "optimal",
    name: "Optimal Profile",
    color,
    axes: OPTIMAL_PROFILE,
    isOptimal: true
  };
}

// ============================================================================
// Demo/Example Component
// ============================================================================

export function RadarChartDemo() {
  // Example user data
  const userProfile = createUserProfile({
    savingsRatePercent: 15,
    taxAdvantagedPercent: 60,
    stockAllocationPercent: 75,
    assetClassCount: 4,
    emergencyFundMonths: 4,
    age: 35
  }, "Your Profile", "#3b82f6");

  // Alternative scenario
  const aggressiveProfile = createUserProfile({
    savingsRatePercent: 25,
    taxAdvantagedPercent: 80,
    stockAllocationPercent: 90,
    assetClassCount: 3,
    emergencyFundMonths: 3,
    age: 35
  }, "Aggressive Scenario", "#f59e0b");

  const optimalProfile = createOptimalProfile("#22c55e");

  const scenarios = [userProfile, optimalProfile, aggressiveProfile];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <RadarChart
        scenarios={scenarios}
        size={400}
        showLegend={true}
        animateOnMount={true}
        animationDuration={1.5}
        onAxisClick={(axis) => {
          console.log("Axis clicked:", axis.label);
        }}
      />
    </div>
  );
}

export default RadarChart;

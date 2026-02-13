"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  X,
} from "lucide-react";

// Market data interface
interface MarketIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit?: string;
}

interface MarketData {
  sp500: MarketIndicator;
  treasury10Y: MarketIndicator;
  fedFunds: MarketIndicator;
  lastUpdated: Date;
}

interface ProjectionImpact {
  indicator: string;
  impact: string;
  description: string;
  severity: "positive" | "neutral" | "negative";
}

// Mock data generator with realistic values and small random variations
function generateMockMarketData(): MarketData {
  const now = new Date();

  // Base values with realistic ranges
  const sp500Base = 5250;
  const treasury10YBase = 4.25;
  const fedFundsBase = 5.25;

  // Add small random variations
  const sp500Change = (Math.random() - 0.5) * 100;
  const treasury10YChange = (Math.random() - 0.5) * 0.1;
  const fedFundsChange = 0; // Fed funds typically doesn't change daily

  return {
    sp500: {
      symbol: "SPX",
      name: "S&P 500",
      value: sp500Base + sp500Change,
      change: sp500Change,
      changePercent: (sp500Change / sp500Base) * 100,
    },
    treasury10Y: {
      symbol: "TNX",
      name: "10-Yr Treasury",
      value: treasury10YBase + treasury10YChange,
      change: treasury10YChange,
      changePercent: (treasury10YChange / treasury10YBase) * 100,
      unit: "%",
    },
    fedFunds: {
      symbol: "FF",
      name: "Fed Funds Rate",
      value: fedFundsBase,
      change: fedFundsChange,
      changePercent: 0,
      unit: "%",
    },
    lastUpdated: now,
  };
}

// Calculate how market conditions affect retirement projections
function calculateProjectionImpacts(data: MarketData): ProjectionImpact[] {
  const impacts: ProjectionImpact[] = [];

  // S&P 500 impact
  if (data.sp500.changePercent > 0.5) {
    impacts.push({
      indicator: "S&P 500",
      impact: "Favorable",
      description: "Rising equity markets may boost portfolio growth projections",
      severity: "positive",
    });
  } else if (data.sp500.changePercent < -0.5) {
    impacts.push({
      indicator: "S&P 500",
      impact: "Headwind",
      description: "Market decline may reduce short-term projected returns",
      severity: "negative",
    });
  } else {
    impacts.push({
      indicator: "S&P 500",
      impact: "Stable",
      description: "Market conditions are relatively flat",
      severity: "neutral",
    });
  }

  // Treasury yield impact
  if (data.treasury10Y.value > 4.5) {
    impacts.push({
      indicator: "10-Yr Treasury",
      impact: "Higher Yields",
      description: "Elevated yields improve bond income but may pressure equity valuations",
      severity: "neutral",
    });
  } else if (data.treasury10Y.value < 3.5) {
    impacts.push({
      indicator: "10-Yr Treasury",
      impact: "Lower Yields",
      description: "Lower yields reduce fixed income returns but support equity growth",
      severity: "neutral",
    });
  } else {
    impacts.push({
      indicator: "10-Yr Treasury",
      impact: "Normal Range",
      description: "Treasury yields are within historical norms",
      severity: "neutral",
    });
  }

  // Fed Funds impact
  if (data.fedFunds.value > 5) {
    impacts.push({
      indicator: "Fed Funds Rate",
      impact: "Restrictive",
      description: "Higher rates may slow economic growth but help control inflation",
      severity: "neutral",
    });
  } else if (data.fedFunds.value < 3) {
    impacts.push({
      indicator: "Fed Funds Rate",
      impact: "Accommodative",
      description: "Lower rates typically support asset prices and economic growth",
      severity: "positive",
    });
  } else {
    impacts.push({
      indicator: "Fed Funds Rate",
      impact: "Moderate",
      description: "Fed policy is neither too tight nor too loose",
      severity: "neutral",
    });
  }

  return impacts;
}

function formatValue(indicator: MarketIndicator): string {
  if (indicator.unit === "%") {
    return `${indicator.value.toFixed(2)}%`;
  }
  return indicator.value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(indicator: MarketIndicator): string {
  const sign = indicator.change >= 0 ? "+" : "";
  if (indicator.unit === "%") {
    return `${sign}${indicator.change.toFixed(2)}%`;
  }
  return `${sign}${indicator.change.toFixed(2)} (${sign}${indicator.changePercent.toFixed(2)}%)`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface IndicatorBadgeProps {
  indicator: MarketIndicator;
  onClick: () => void;
}

function IndicatorBadge({ indicator, onClick }: IndicatorBadgeProps) {
  const isPositive = indicator.change >= 0;
  const isNeutral = Math.abs(indicator.changePercent) < 0.05;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "transition-all duration-200 hover:scale-[1.02]",
        "border bg-background/50 backdrop-blur-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        isNeutral
          ? "border-muted-foreground/30 hover:border-muted-foreground/50"
          : isPositive
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : "border-rose-500/30 hover:border-rose-500/50"
      )}
      aria-label={`${indicator.name}: ${formatValue(indicator)}, ${formatChange(indicator)}`}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {indicator.name}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {formatValue(indicator)}
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-xs font-medium tabular-nums",
          isNeutral
            ? "text-muted-foreground"
            : isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        )}
      >
        {isNeutral ? null : isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {formatChange(indicator)}
      </span>
    </button>
  );
}

interface ImpactPanelProps {
  impacts: ProjectionImpact[];
  onClose: () => void;
}

function ImpactPanel({ impacts, onClose }: ImpactPanelProps) {
  return (
    <div className="mt-3 p-4 rounded-lg border bg-card/50 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          How Current Markets Affect Your Plan
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label="Close impact panel"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-3">
        {impacts.map((impact) => (
          <div
            key={impact.indicator}
            className="flex items-start gap-3 text-sm"
          >
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5",
                impact.severity === "positive"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : impact.severity === "negative"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {impact.impact}
            </span>
            <div>
              <span className="font-medium">{impact.indicator}:</span>{" "}
              <span className="text-muted-foreground">{impact.description}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
        Note: Your retirement projections use long-term historical averages.
        Daily market movements have minimal impact on multi-decade planning
        horizons, but understanding current conditions provides valuable context.
      </p>
    </div>
  );
}

export interface MarketTickerProps {
  className?: string;
  defaultExpanded?: boolean;
  onMarketDataChange?: (data: MarketData) => void;
}

export function MarketTicker({
  className,
  defaultExpanded = true,
  onMarketDataChange,
}: MarketTickerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImpactPanel, setShowImpactPanel] = useState(false);
  // Track which indicator was clicked for potential future filtering of impacts
  const [, setSelectedIndicator] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, this would call a real API
      // For now, we use mock data with a small delay to simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = generateMockMarketData();
      setMarketData(data);
      onMarketDataChange?.(data);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onMarketDataChange]);

  // Initial fetch and refresh every 5 minutes
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const handleIndicatorClick = (indicatorName: string) => {
    setSelectedIndicator(indicatorName);
    setShowImpactPanel(true);
  };

  const impacts = marketData ? calculateProjectionImpacts(marketData) : [];

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "rounded-lg border bg-gradient-to-r from-slate-50 to-slate-100",
          "dark:from-slate-900/50 dark:to-slate-800/50",
          "transition-all duration-200"
        )}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">
                Market Pulse
              </span>
            </div>
            {marketData && (
              <span className="text-xs text-muted-foreground">
                As of {formatTimestamp(marketData.lastUpdated)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMarketData()}
              disabled={isLoading}
              className={cn(
                "p-1.5 rounded-md hover:bg-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isLoading && "animate-spin"
              )}
              aria-label="Refresh market data"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md",
                  "text-xs font-medium text-muted-foreground",
                  "hover:bg-muted transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                )}
                aria-label={isExpanded ? "Collapse ticker" : "Expand ticker"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Show</span>
                  </>
                )}
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Collapsible content */}
        <CollapsibleContent>
          <div className="px-4 pb-3">
            {/* Market indicators */}
            {isLoading && !marketData ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-40 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : marketData ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <IndicatorBadge
                    indicator={marketData.sp500}
                    onClick={() => handleIndicatorClick("S&P 500")}
                  />
                  <IndicatorBadge
                    indicator={marketData.treasury10Y}
                    onClick={() => handleIndicatorClick("10-Yr Treasury")}
                  />
                  <IndicatorBadge
                    indicator={marketData.fedFunds}
                    onClick={() => handleIndicatorClick("Fed Funds Rate")}
                  />
                </div>

                {/* Impact panel */}
                {showImpactPanel && (
                  <ImpactPanel
                    impacts={impacts}
                    onClose={() => {
                      setShowImpactPanel(false);
                      setSelectedIndicator(null);
                    }}
                  />
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Unable to load market data. Please try again.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default MarketTicker;

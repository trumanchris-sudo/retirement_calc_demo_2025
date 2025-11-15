"use client";

import React, { useState } from "react";
import { Moon, Sun, Printer, Share2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import CubeStaticMini from "@/components/CubeStaticMini";

interface PageHeaderProps {
  showActions?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onAdjust?: (deltas: AdjustmentDeltas) => void;
  cubeAppended?: boolean;
}

export interface AdjustmentDeltas {
  contributionDelta: number;
  withdrawalRateDelta: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  showActions = false,
  isDarkMode = false,
  onToggleDarkMode,
  onPrint,
  onShare,
  onAdjust,
  cubeAppended = false
}) => {
  const [contributionDelta, setContributionDelta] = useState(0);
  const [withdrawalRateDelta, setWithdrawalRateDelta] = useState(0);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const handleRecalculate = () => {
    if (onAdjust && (contributionDelta !== 0 || withdrawalRateDelta !== 0)) {
      onAdjust({ contributionDelta, withdrawalRateDelta });
      // Reset deltas after applying
      setContributionDelta(0);
      setWithdrawalRateDelta(0);
      setIsAdjustOpen(false);
    }
  };

  const handleReset = () => {
    setContributionDelta(0);
    setWithdrawalRateDelta(0);
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo/Title - CUBE ALWAYS RENDERS */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink retirement-header-left">
          <CubeStaticMini />
          <span className="font-semibold text-slate-900 dark:text-slate-50 hidden sm:inline-block truncate retirement-header-title">
            Retirement Calculator
          </span>
        </div>

        {/* Actions - Always show dark mode toggle prominently */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Dark Mode Toggle - Always First for Accessibility */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="no-print flex-shrink-0 order-first"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {showActions && (
            <>
              <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />

              {/* Adjust Button with Popover */}
              <Popover open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden no-print"
                    aria-label="Adjust parameters"
                  >
                    <Sliders className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:inline-flex no-print"
                  >
                    <Sliders className="w-4 h-4 mr-2" />
                    Adjust
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Quick Adjustments</h4>
                      <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                        These adjustments apply as deltas on top of your existing inputs.
                      </p>
                    </div>

                    {/* Contribution Adjustment */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Contribution Adjustment: {contributionDelta > 0 ? '+' : ''}{contributionDelta}%
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContributionDelta(Math.max(contributionDelta - 5, -50))}
                        >
                          -5%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContributionDelta(Math.min(contributionDelta + 5, 50))}
                        >
                          +5%
                        </Button>
                      </div>
                    </div>

                    {/* Withdrawal Rate Adjustment */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Withdrawal Rate Adjustment: {withdrawalRateDelta > 0 ? '+' : ''}{withdrawalRateDelta.toFixed(1)}%
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalRateDelta(Math.max(withdrawalRateDelta - 0.5, -5))}
                        >
                          -0.5%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawalRateDelta(Math.min(withdrawalRateDelta + 0.5, 5))}
                        >
                          +0.5%
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="flex-1"
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleRecalculate}
                        className="flex-1"
                      >
                        Recalculate
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={onPrint}
                className="md:hidden no-print"
                aria-label="Print"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                className="hidden md:inline-flex no-print"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="md:hidden no-print"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className="hidden md:inline-flex no-print"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

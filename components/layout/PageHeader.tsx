"use client";

import React, { useState } from "react";
import { Moon, Sun, FileText, Share2, Sliders, DollarSign, Briefcase, Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import CubeStaticMini from "@/components/CubeStaticMini";
import { useTheme } from "@/lib/theme-context";

interface PageHeaderProps {
  showActions?: boolean;
  /** @deprecated Use theme context instead */
  isDarkMode?: boolean;
  /** @deprecated Use theme context instead */
  onToggleDarkMode?: () => void;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onAdjust?: (deltas: AdjustmentDeltas) => void;
  onAIReview?: () => void;
  cubeAppended?: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
}

export interface AdjustmentDeltas {
  contributionDelta: number;
  withdrawalRateDelta: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  showActions = false,
  isDarkMode: _isDarkMode,
  onToggleDarkMode: _onToggleDarkMode,
  onDownloadPDF,
  onPrint,
  onShare,
  onAdjust,
  onAIReview,
  cubeAppended = false,
  hasUnsavedChanges = false,
  isSaving = false,
}) => {
  // Use theme context - the props are deprecated but kept for compatibility
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const onToggleDarkMode = toggleTheme;
  const [contributionDelta, setContributionDelta] = useState(0);
  const [withdrawalRateDelta, setWithdrawalRateDelta] = useState(0);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const handleRecalculate = () => {
    if (onAdjust) {
      onAdjust({ contributionDelta, withdrawalRateDelta });
      setIsAdjustOpen(false);
    }
  };

  // Reset deltas when popover closes
  React.useEffect(() => {
    if (!isAdjustOpen) {
      // Small delay to allow the adjustment to process
      const timer = setTimeout(() => {
        setContributionDelta(0);
        setWithdrawalRateDelta(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAdjustOpen]);

  const handleReset = () => {
    setContributionDelta(0);
    setWithdrawalRateDelta(0);
  };
  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2"
        aria-label="Main navigation"
      >
        {/* Logo/Title - CUBE ALWAYS RENDERS */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink retirement-header-left">
          <CubeStaticMini />
          <span className="font-semibold text-slate-900 dark:text-slate-50 hidden sm:inline-block truncate retirement-header-title">
            Tax-Aware Retirement Calculator
          </span>
          {/* Unsaved changes / saving indicator */}
          {isSaving && (
            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 no-print">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Saving...
            </span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 no-print" title="You have unsaved changes">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="hidden md:inline">Unsaved</span>
            </span>
          )}
        </div>

        {/* Actions - Always show dark mode toggle prominently */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Income Planner Link */}
          <Link href="/income-2026">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden no-print"
              aria-label="2026 Income Planner"
            >
              <DollarSign className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/income-2026">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex no-print"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              2026 Income
            </Button>
          </Link>

          {/* Self-Employed Calculator Link */}
          <Link href="/self-employed-2026">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden no-print"
              aria-label="Self-Employed 2026"
            >
              <Briefcase className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/self-employed-2026">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex no-print"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Self-Employed
            </Button>
          </Link>

          <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />

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

              {/* QA Review Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onAIReview}
                className="md:hidden no-print"
                aria-label="QA Review"
              >
                <Bot className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAIReview}
                className="hidden md:inline-flex no-print"
              >
                <Bot className="w-4 h-4 mr-2" />
                QA Review
              </Button>

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
                onClick={onDownloadPDF}
                className="md:hidden no-print"
                aria-label="Download PDF Report"
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownloadPDF}
                className="hidden md:inline-flex no-print"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF Report
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
      </nav>
    </header>
  );
};

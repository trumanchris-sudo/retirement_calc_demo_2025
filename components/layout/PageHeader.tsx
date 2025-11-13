"use client";

import React from "react";
import { Moon, Sun, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  showActions?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  cubeAppended?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  showActions = false,
  isDarkMode = false,
  onToggleDarkMode,
  onPrint,
  onShare,
  cubeAppended = false
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo/Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <div
            id="logoSlot"
            className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              overflow: 'visible',
              backgroundColor: cubeAppended ? 'transparent' : '#6b4cd6'
            }}
          >
            {/* Logo will be inserted here by BrandLoader, or show fallback */}
            {!cubeAppended && (
              <span className="text-white font-bold text-lg">R</span>
            )}
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-50 hidden sm:inline-block truncate">
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

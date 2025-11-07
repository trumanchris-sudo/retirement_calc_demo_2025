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
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  showActions = false,
  isDarkMode = false,
  onToggleDarkMode,
  onPrint,
  onShare
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-50 hidden sm:inline-block">
            Retirement Calculator
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showActions && (
            <>
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
                size="sm"
                onClick={onShare}
                className="hidden md:inline-flex no-print"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="no-print"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

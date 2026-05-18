"use client";

import React from "react";
import { Calculator, LockKeyhole, Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopBannerProps {
  className?: string;
}

export const TopBanner: React.FC<TopBannerProps> = ({ className = "" }) => {
  return (
    <div
      role="banner"
      aria-label="Site branding and features"
      className={`border-b bg-background/95 text-foreground ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-card"
            aria-hidden="true"
          >
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              WORK DIE RETIRE
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Tax-aware planning, Monte Carlo testing, no account required.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Shield className="h-3 w-3" aria-hidden="true" />
            Tax-aware
          </Badge>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            Monte Carlo
          </Badge>
          <span className="inline-flex items-center gap-1">
            <LockKeyhole className="h-3 w-3" aria-hidden="true" />
            No cookies or stored plan data
          </span>
        </div>
      </div>
    </div>
  );
};

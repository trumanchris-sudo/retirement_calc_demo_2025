"use client";

import React from "react";
import { TrendingUp, Shield, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopBannerProps {
  className?: string;
}

export const TopBanner: React.FC<TopBannerProps> = ({ className = "" }) => {
  return (
    <div
      role="banner"
      aria-label="Site branding and features"
      className={`relative overflow-hidden bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] animate-gradient ${className}`}
    >
      {/* Subtle pattern overlay - decorative, hidden from screen readers */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Title with icon */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              aria-hidden="true"
            >
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                WORK DIE RETIRE
              </span>
            </div>
          </div>

          {/* Features badges - list for better semantics */}
          <ul
            className="flex items-center gap-2 flex-wrap justify-center list-none"
            aria-label="Key features"
          >
            <li>
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
                <span className="hidden sm:inline">Tax-Optimized</span>
                <span className="sm:hidden" aria-hidden="true">Optimized</span>
                <span className="sr-only sm:hidden">Tax-Optimized</span>
              </Badge>
            </li>
            <li>
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" />
                <span className="hidden sm:inline">Monte Carlo</span>
                <span className="sm:hidden" aria-hidden="true">MC Sims</span>
                <span className="sr-only sm:hidden">Monte Carlo Simulations</span>
              </Badge>
            </li>
          </ul>
        </div>

        {/* Tagline */}
        <div className="relative text-center pt-2 border-t border-white/20">
          <p className="text-xs sm:text-sm text-blue-100">
            Free. No ads. No bullshit.
          </p>
          <p className="text-[10px] text-blue-100/60 mt-1">
            We don&apos;t use cookies, link or store data. We only track visits, browser type, and country.
          </p>
        </div>
      </div>
    </div>
  );
};

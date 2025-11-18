"use client";

import React from "react";
import { TrendingUp, Shield, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopBannerProps {
  className?: string;
}

export const TopBanner: React.FC<TopBannerProps> = ({ className = "" }) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] animate-gradient ${className}`}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
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
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                WORK DIE RETIRE
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">
                Free. No ads. No bullshit.
              </p>
            </div>
          </div>

          {/* Features badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <Shield className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Tax-Optimized</span>
              <span className="sm:hidden">Optimized</span>
            </Badge>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Monte Carlo</span>
              <span className="sm:hidden">MC Sims</span>
            </Badge>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="relative text-center pt-2 border-t border-white/20">
          <p className="text-xs text-blue-100/80">
            We don&apos;t use cookies, link or store data. The only thing we know is how many users visit the site, from which browser and from which country.
          </p>
        </div>
      </div>
    </div>
  );
};

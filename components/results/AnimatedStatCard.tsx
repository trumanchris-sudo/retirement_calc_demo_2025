"use client";

import React from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AnimatedStatCardProps {
  label: string;
  value: number;
  format: "currency" | "number" | "percentage";
  sublabel?: string;
  change?: number; // For +/- indicators
  icon?: LucideIcon;
  delay?: number; // Stagger animations
  onClick?: () => void; // For flip interaction
  className?: string;
}

const formatters = {
  currency: (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(n),
  number: (n: number) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(n),
  percentage: (n: number) => `${n.toFixed(1)}%`
};

export const AnimatedStatCard: React.FC<AnimatedStatCardProps> = React.memo(({
  label,
  value,
  format,
  sublabel,
  change,
  icon: Icon,
  delay = 0,
  onClick,
  className
}) => {
  const formatter = formatters[format];

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        "animate-in slide-in-from-bottom-4 fade-in duration-500",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {label}
          </p>
          {Icon && (
            <Icon className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-3xl md:text-4xl font-bold font-mono tracking-tight">
            <AnimatedNumber
              value={value}
              format={formatter}
              delay={delay}
              duration={1500}
            />
          </p>

          {sublabel && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {sublabel}
            </p>
          )}

          {change !== undefined && change !== 0 && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                change > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              <span>{change > 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {onClick && (
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click for details
          </p>
        )}
      </CardContent>
    </Card>
  );
});

AnimatedStatCard.displayName = 'AnimatedStatCard';

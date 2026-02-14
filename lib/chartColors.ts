/**
 * Centralized chart color palette using CSS variables for theme-aware colors.
 *
 * These reference HSL CSS custom properties defined in globals.css so charts
 * automatically adapt to light/dark mode. Each value resolves to a valid CSS
 * color string that Recharts and SVG elements can consume directly.
 *
 * Usage:
 *   import { CHART_COLORS } from '@/lib/chartColors';
 *   <Line stroke={CHART_COLORS.primary} />
 */

// ---------------------------------------------------------------------------
// Primary chart series colors (mapped to --chart-1 … --chart-5)
// ---------------------------------------------------------------------------

export const CHART_COLORS = {
  /** Blue — primary data series (e.g., nominal balance, baseline) */
  primary: "hsl(var(--chart-1))",
  /** Green — secondary data series (e.g., real/inflation-adjusted) */
  secondary: "hsl(var(--chart-2))",
  /** Purple — tertiary series / accents */
  tertiary: "hsl(var(--chart-3))",
  /** Amber/Orange — warning series (e.g., inflation shock, 90th pct) */
  quaternary: "hsl(var(--chart-4))",
  /** Red — danger / negative series (e.g., bear market, 10th pct) */
  danger: "hsl(var(--chart-5))",
} as const;

// ---------------------------------------------------------------------------
// Semantic aliases (for readability in specific chart contexts)
// ---------------------------------------------------------------------------

export const CHART_SEMANTIC = {
  /** Nominal / baseline series */
  nominal: CHART_COLORS.primary,
  /** Real (inflation-adjusted) series */
  real: CHART_COLORS.secondary,
  /** Bear market / pessimistic scenario */
  bearMarket: CHART_COLORS.danger,
  /** Inflation / optimistic scenario */
  inflation: CHART_COLORS.quaternary,
  /** 10th-percentile band */
  p10: CHART_COLORS.danger,
  /** 90th-percentile band */
  p90: CHART_COLORS.quaternary,
} as const;

// ---------------------------------------------------------------------------
// Waterfall chart category colors
// ---------------------------------------------------------------------------

export const WATERFALL_COLORS = {
  income: "hsl(var(--chart-2))",
  tax: "hsl(var(--chart-5))",
  expense: "hsl(var(--chart-4))",
  savings: "hsl(var(--chart-1))",
  total: "hsl(var(--chart-3))",
} as const;

// ---------------------------------------------------------------------------
// Sankey / flow diagram colors
// ---------------------------------------------------------------------------

export const SANKEY_COLORS = {
  /** Income source nodes */
  income: {
    salary: "hsl(var(--chart-2))",
    bonus: "hsl(var(--sankey-income-2))",
    investments: "hsl(var(--sankey-income-3))",
    socialSecurity: "hsl(var(--sankey-income-4))",
  },
  /** Account type nodes */
  accounts: {
    "401k": "hsl(var(--chart-1))",
    roth: "hsl(var(--chart-3))",
    taxable: "hsl(var(--sankey-account-3))",
    hsa: "hsl(var(--sankey-account-4))",
  },
  /** Spending category nodes */
  spending: {
    housing: "hsl(var(--chart-4))",
    healthcare: "hsl(var(--chart-5))",
    lifestyle: "hsl(var(--sankey-spending-3))",
    travel: "hsl(var(--sankey-spending-4))",
    legacy: "hsl(var(--sankey-spending-5))",
  },
  /** Tax leakage */
  taxLeak: "hsl(var(--sankey-tax-leak))",
  /** Fallback / neutral */
  neutral: "hsl(var(--muted-foreground))",
} as const;

// ---------------------------------------------------------------------------
// Radar chart profile colors
// ---------------------------------------------------------------------------

export const RADAR_COLORS = {
  userProfile: "hsl(var(--chart-1))",
  optimal: "hsl(var(--chart-2))",
  aggressive: "hsl(var(--chart-4))",
} as const;

// ---------------------------------------------------------------------------
// Tooltip theming helpers
// ---------------------------------------------------------------------------

export const TOOLTIP_STYLES = {
  light: {
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
} as const;

/**
 * Returns tooltip contentStyle and labelStyle that respect the current theme.
 * Replaces the previous isDarkMode ternary pattern.
 */
export function getTooltipStyles() {
  return {
    contentStyle: {
      backgroundColor: "hsl(var(--background))",
      borderRadius: "8px",
      border: "1px solid hsl(var(--border))",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      color: "hsl(var(--foreground))",
    },
    labelStyle: {
      color: "hsl(var(--foreground))",
      fontWeight: "bold" as const,
    },
  };
}

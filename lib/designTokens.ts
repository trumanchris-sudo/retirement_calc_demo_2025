/**
 * Design Tokens - Standardized typography, spacing, and UX patterns
 * Use these constants across all components for consistency
 *
 * This file serves as the single source of truth for visual design decisions.
 */

// Typography
export const TYPOGRAPHY = {
  // Page titles
  pageTitle: 'text-2xl md:text-3xl font-bold tracking-tight',
  pageSubtitle: 'text-lg md:text-xl text-muted-foreground',

  // Section headers
  sectionHeader: 'text-lg font-semibold text-foreground',
  subSectionHeader: 'text-sm font-semibold text-muted-foreground uppercase tracking-wide',

  // Card titles
  cardTitle: 'text-xl font-semibold leading-none tracking-tight',
  cardDescription: 'text-sm text-muted-foreground',

  // Metric values - with tabular numbers for alignment
  metricLarge: 'text-3xl font-bold tabular-nums',
  metricMedium: 'text-2xl font-bold tabular-nums',
  metricSmall: 'text-xl font-semibold tabular-nums',
  metricTiny: 'text-lg font-medium tabular-nums',

  // Labels
  inputLabel: 'text-sm font-medium text-foreground',
  metricLabel: 'text-sm text-muted-foreground',
  helperText: 'text-xs text-muted-foreground',

  // Body text
  body: 'text-sm text-foreground',
  bodyMuted: 'text-sm text-muted-foreground',
  bodyLarge: 'text-base text-foreground',

  // Table text
  tableHeader: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  tableCell: 'text-sm',
  tableCellCompact: 'text-xs',
  tableCellMono: 'text-sm font-mono tabular-nums',
} as const;

// Spacing
export const SPACING = {
  // Section spacing
  sectionGap: 'space-y-8',
  cardGap: 'space-y-6',
  fieldGap: 'space-y-4',
  itemGap: 'space-y-2',

  // Padding
  cardPadding: 'p-6',
  cardPaddingCompact: 'p-4',
  sectionPadding: 'py-6 md:py-8',
  inputPadding: 'px-3 py-2',

  // Table cell padding
  tableCell: 'px-3 py-2',
  tableCellCompact: 'px-2 py-1',

  // Container widths
  containerMax: 'max-w-7xl mx-auto',
  containerNarrow: 'max-w-4xl mx-auto',
  containerWide: 'max-w-screen-2xl mx-auto',
} as const;

// Semantic colors for metric cards
export const METRIC_COLORS = {
  positive: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    ring: 'ring-green-500/20',
  },
  negative: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    ring: 'ring-red-500/20',
  },
  neutral: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    ring: 'ring-blue-500/20',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-amber-500/20',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    ring: 'ring-emerald-500/20',
  },
} as const;

export type MetricColorKey = keyof typeof METRIC_COLORS;

// Chart color palette - optimized for data visualization
export const CHART_COLORS = {
  // Primary data series
  primary: '#3b82f6',      // Blue - main metric
  secondary: '#10b981',    // Green - positive/growth
  tertiary: '#8b5cf6',     // Purple - alternative series

  // Semantic colors
  positive: '#22c55e',     // Green - good outcomes
  negative: '#ef4444',     // Red - warnings/risks
  warning: '#f59e0b',      // Amber - caution
  neutral: '#6b7280',      // Gray - baseline/reference

  // Percentile bands
  p10: '#ef4444',          // Red - worst case
  p25: '#f97316',          // Orange - poor
  p50: '#3b82f6',          // Blue - median
  p75: '#10b981',          // Green - good
  p90: '#22c55e',          // Bright green - best case

  // Area fills (with opacity)
  areaFill: 'rgba(59, 130, 246, 0.1)',
  areaFillPositive: 'rgba(34, 197, 94, 0.1)',
  areaFillNegative: 'rgba(239, 68, 68, 0.1)',

  // Grid and axes
  grid: 'rgba(0, 0, 0, 0.08)',
  gridDark: 'rgba(255, 255, 255, 0.08)',
  axis: '#94a3b8',
} as const;

// Transitions and animations
export const TRANSITIONS = {
  // Durations
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',

  // Easings
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Common combinations
  default: 'transition-all duration-200 ease-out',
  hover: 'transition-all duration-150 ease-out',
  enter: 'transition-all duration-300 ease-out',

  // Specific transitions
  opacity: 'transition-opacity duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  colors: 'transition-colors duration-150 ease-out',
} as const;

// Interactive states
export const INTERACTIVE = {
  // Focus states
  focusRing: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  focusWithin: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',

  // Hover states
  hoverLift: 'hover:-translate-y-0.5 hover:shadow-md',
  hoverScale: 'hover:scale-[1.02]',
  hoverGlow: 'hover:shadow-lg hover:shadow-blue-500/10',

  // Active states
  activePress: 'active:scale-[0.98]',
  activeOpacity: 'active:opacity-80',

  // Disabled states
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',

  // Card interactions
  cardHover: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
  cardActive: 'active:shadow-md active:translate-y-0',
} as const;

// Status indicators
export const STATUS = {
  // Badge styles
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',

  // Icon colors
  successIcon: 'text-green-600 dark:text-green-400',
  warningIcon: 'text-amber-600 dark:text-amber-400',
  errorIcon: 'text-red-600 dark:text-red-400',
  infoIcon: 'text-blue-600 dark:text-blue-400',

  // Border accents
  successBorder: 'border-l-4 border-green-500',
  warningBorder: 'border-l-4 border-amber-500',
  errorBorder: 'border-l-4 border-red-500',
  infoBorder: 'border-l-4 border-blue-500',
} as const;

// Loading states
export const LOADING = {
  // Skeleton animations
  skeleton: 'animate-pulse bg-slate-200 dark:bg-slate-800 rounded',
  skeletonShimmer: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800',

  // Spinner sizes
  spinnerSm: 'h-4 w-4',
  spinnerMd: 'h-5 w-5',
  spinnerLg: 'h-8 w-8',

  // Loading overlay
  overlay: 'absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-10',

  // Progress bar
  progressTrack: 'h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden',
  progressFill: 'h-full bg-blue-500 transition-all duration-300 ease-out',
  progressIndeterminate: 'h-full bg-blue-500 animate-progress-indeterminate',
} as const;

// Form elements
export const FORMS = {
  // Input styles
  input: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  inputError: 'border-red-500 focus-visible:ring-red-500',
  inputSuccess: 'border-green-500 focus-visible:ring-green-500',

  // Label styles
  label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  labelRequired: "after:content-['*'] after:ml-0.5 after:text-red-500",

  // Helper text
  helperText: 'text-xs text-muted-foreground mt-1',
  errorText: 'text-xs text-red-600 dark:text-red-400 mt-1',
  successText: 'text-xs text-green-600 dark:text-green-400 mt-1',

  // Field groups
  fieldGroup: 'space-y-2',
  fieldRow: 'flex gap-4 items-end',
} as const;

// Shadows for depth
export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',

  // Colored shadows
  blue: 'shadow-lg shadow-blue-500/10',
  green: 'shadow-lg shadow-green-500/10',
  red: 'shadow-lg shadow-red-500/10',

  // Inner shadows
  inner: 'shadow-inner',
  innerSm: 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]',

  // Card shadows
  card: 'shadow-sm hover:shadow-md transition-shadow',
  cardElevated: 'shadow-md hover:shadow-lg transition-shadow',
} as const;

// Border radius presets
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',

  // Specific use cases
  card: 'rounded-xl',
  button: 'rounded-md',
  input: 'rounded-md',
  badge: 'rounded-full',
  avatar: 'rounded-full',
} as const;

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Glassmorphism Card Component
 *
 * A premium card component with frosted glass effects, perfect for
 * modern financial dashboards and premium UI experiences.
 *
 * Features:
 * - Backdrop blur for frosted glass effect
 * - Semi-transparent backgrounds
 * - Subtle borders with light opacity
 * - Colored shadow options
 * - Gradient overlay variants
 * - Smooth hover animations
 */

const glassCardVariants = cva(
  // Base styles
  [
    'relative rounded-2xl overflow-hidden',
    'transition-all duration-300 ease-out',
    // Print mode - remove glass effects
    'print:bg-white print:border print:border-gray-300 print:shadow-none',
  ],
  {
    variants: {
      // Glass intensity
      variant: {
        default: [
          'bg-white/10 dark:bg-slate-900/30',
          'backdrop-blur-md',
          'border border-white/20 dark:border-white/10',
          'shadow-xl shadow-black/5 dark:shadow-black/20',
        ],
        frosted: [
          'bg-white/20 dark:bg-slate-800/40',
          'backdrop-blur-xl',
          'border border-white/30 dark:border-white/15',
          'shadow-2xl shadow-black/10 dark:shadow-black/30',
        ],
        subtle: [
          'bg-white/5 dark:bg-slate-900/20',
          'backdrop-blur-sm',
          'border border-white/10 dark:border-white/5',
          'shadow-lg shadow-black/5 dark:shadow-black/10',
        ],
        solid: [
          'bg-white/80 dark:bg-slate-900/80',
          'backdrop-blur-xl',
          'border border-white/40 dark:border-white/20',
          'shadow-xl shadow-black/10 dark:shadow-black/30',
        ],
        // Premium colored variants
        emerald: [
          'bg-emerald-500/10 dark:bg-emerald-900/20',
          'backdrop-blur-md',
          'border border-emerald-200/30 dark:border-emerald-500/20',
          'shadow-xl shadow-emerald-500/10 dark:shadow-emerald-500/20',
        ],
        blue: [
          'bg-blue-500/10 dark:bg-blue-900/20',
          'backdrop-blur-md',
          'border border-blue-200/30 dark:border-blue-500/20',
          'shadow-xl shadow-blue-500/10 dark:shadow-blue-500/20',
        ],
        amber: [
          'bg-amber-500/10 dark:bg-amber-900/20',
          'backdrop-blur-md',
          'border border-amber-200/30 dark:border-amber-500/20',
          'shadow-xl shadow-amber-500/10 dark:shadow-amber-500/20',
        ],
        rose: [
          'bg-rose-500/10 dark:bg-rose-900/20',
          'backdrop-blur-md',
          'border border-rose-200/30 dark:border-rose-500/20',
          'shadow-xl shadow-rose-500/10 dark:shadow-rose-500/20',
        ],
        purple: [
          'bg-purple-500/10 dark:bg-purple-900/20',
          'backdrop-blur-md',
          'border border-purple-200/30 dark:border-purple-500/20',
          'shadow-xl shadow-purple-500/10 dark:shadow-purple-500/20',
        ],
      },
      // Size variants
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      // Glow effect intensity
      glow: {
        none: '',
        subtle: 'glass-glow-subtle',
        medium: 'glass-glow-medium',
        strong: 'glass-glow-strong',
      },
      // Hover effects
      hover: {
        none: '',
        lift: 'hover:-translate-y-1 hover:shadow-2xl',
        scale: 'hover:scale-[1.02]',
        glow: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
        border: 'hover:border-white/40 dark:hover:border-white/30',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      glow: 'none',
      hover: 'none',
    },
  }
)

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  // Enable gradient overlay
  gradient?: boolean
  // Gradient direction
  gradientDirection?: 'top' | 'bottom' | 'left' | 'right' | 'radial'
  // Animated border effect
  animatedBorder?: boolean
  // Noise texture overlay
  noiseTexture?: boolean
  // Inner glow effect
  innerGlow?: boolean
  // Premium shimmer effect
  shimmer?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      size,
      glow,
      hover,
      gradient = false,
      gradientDirection = 'radial',
      animatedBorder = false,
      noiseTexture = false,
      innerGlow = false,
      shimmer = false,
      children,
      ...props
    },
    ref
  ) => {
    const gradientClasses = gradient
      ? {
          top: 'glass-gradient-top',
          bottom: 'glass-gradient-bottom',
          left: 'glass-gradient-left',
          right: 'glass-gradient-right',
          radial: 'glass-gradient-radial',
        }[gradientDirection]
      : ''

    return (
      <div
        ref={ref}
        className={cn(
          glassCardVariants({ variant, size, glow, hover }),
          gradientClasses,
          animatedBorder && 'glass-animated-border',
          noiseTexture && 'glass-noise',
          innerGlow && 'glass-inner-glow',
          shimmer && 'glass-shimmer',
          className
        )}
        {...props}
      >
        {/* Inner glow overlay */}
        {innerGlow && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Shimmer effect overlay */}
        {shimmer && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl glass-shimmer-overlay"
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

// Header component for GlassCard
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 mb-4', className)}
    {...props}
  />
))
GlassCardHeader.displayName = 'GlassCardHeader'

// Title component for GlassCard
const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight',
      'text-white/90 dark:text-white/95',
      className
    )}
    {...props}
  />
))
GlassCardTitle.displayName = 'GlassCardTitle'

// Description component for GlassCard
const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-white/60 dark:text-white/70', className)}
    {...props}
  />
))
GlassCardDescription.displayName = 'GlassCardDescription'

// Content component for GlassCard
const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

// Footer component for GlassCard
const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center mt-4 pt-4',
      'border-t border-white/10 dark:border-white/5',
      className
    )}
    {...props}
  />
))
GlassCardFooter.displayName = 'GlassCardFooter'

// Stat display for financial metrics
interface GlassStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  sublabel?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

const GlassStat = React.forwardRef<HTMLDivElement, GlassStatProps>(
  ({ className, label, value, sublabel, trend, trendValue, ...props }, ref) => {
    const trendColors = {
      up: 'text-emerald-400',
      down: 'text-rose-400',
      neutral: 'text-white/50',
    }

    const trendIcons = {
      up: '\u2191',
      down: '\u2193',
      neutral: '\u2192',
    }

    return (
      <div ref={ref} className={cn('space-y-1', className)} {...props}>
        <p className="text-sm font-medium text-white/60 dark:text-white/70">
          {label}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-white/95 font-mono tracking-tight">
          {value}
        </p>
        {(sublabel || trend) && (
          <div className="flex items-center gap-2">
            {sublabel && (
              <p className="text-xs text-white/50">{sublabel}</p>
            )}
            {trend && trendValue && (
              <span className={cn('text-xs font-medium', trendColors[trend])}>
                {trendIcons[trend]} {trendValue}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)
GlassStat.displayName = 'GlassStat'

// Premium metric card with icon
interface GlassMetricCardProps extends GlassCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple'
}

const GlassMetricCard = React.forwardRef<HTMLDivElement, GlassMetricCardProps>(
  (
    {
      icon,
      label,
      value,
      sublabel,
      trend,
      trendValue,
      accentColor = 'blue',
      className,
      ...props
    },
    ref
  ) => {
    const accentClasses = {
      emerald: 'from-emerald-500/20 to-emerald-500/5',
      blue: 'from-blue-500/20 to-blue-500/5',
      amber: 'from-amber-500/20 to-amber-500/5',
      rose: 'from-rose-500/20 to-rose-500/5',
      purple: 'from-purple-500/20 to-purple-500/5',
    }

    const iconBgClasses = {
      emerald: 'bg-emerald-500/20 text-emerald-400',
      blue: 'bg-blue-500/20 text-blue-400',
      amber: 'bg-amber-500/20 text-amber-400',
      rose: 'bg-rose-500/20 text-rose-400',
      purple: 'bg-purple-500/20 text-purple-400',
    }

    return (
      <GlassCard
        ref={ref}
        variant="default"
        hover="lift"
        className={cn(
          'bg-gradient-to-br',
          accentClasses[accentColor],
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <GlassStat
            label={label}
            value={value}
            sublabel={sublabel}
            trend={trend}
            trendValue={trendValue}
          />
          {icon && (
            <div
              className={cn(
                'p-3 rounded-xl',
                iconBgClasses[accentColor]
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </GlassCard>
    )
  }
)
GlassMetricCard.displayName = 'GlassMetricCard'

// Glass panel for larger sections
const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'frosted' | 'solid'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: [
      'bg-white/5 dark:bg-slate-900/20',
      'backdrop-blur-md',
      'border border-white/10 dark:border-white/5',
    ],
    frosted: [
      'bg-white/10 dark:bg-slate-800/30',
      'backdrop-blur-xl',
      'border border-white/20 dark:border-white/10',
    ],
    solid: [
      'bg-white/70 dark:bg-slate-900/70',
      'backdrop-blur-xl',
      'border border-white/30 dark:border-white/15',
    ],
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl p-8',
        'shadow-2xl shadow-black/10 dark:shadow-black/30',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
GlassPanel.displayName = 'GlassPanel'

// Divider for glass cards
const GlassDivider = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn(
      'border-0 h-px my-4',
      'bg-gradient-to-r from-transparent via-white/20 to-transparent',
      className
    )}
    {...props}
  />
))
GlassDivider.displayName = 'GlassDivider'

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  GlassStat,
  GlassMetricCard,
  GlassPanel,
  GlassDivider,
  glassCardVariants,
}

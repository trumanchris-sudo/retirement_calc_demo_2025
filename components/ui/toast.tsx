"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export type ToastVariant =
  | "default"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "loading"

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: "default" | "destructive" | "outline"
}

export interface ToastConfig {
  /** Position of the toast viewport */
  position?: ToastPosition
  /** Maximum number of toasts visible at once */
  maxVisible?: number
  /** Default duration in ms (0 = persistent) */
  defaultDuration?: number
  /** Gap between stacked toasts in pixels */
  stackGap?: number
  /** Whether to show progress bar for auto-dismiss */
  showProgress?: boolean
  /** Enable swipe to dismiss on touch devices */
  swipeToDismiss?: boolean
  /** Pause auto-dismiss on hover */
  pauseOnHover?: boolean
}

const DEFAULT_CONFIG: Required<ToastConfig> = {
  position: "bottom-right",
  maxVisible: 5,
  defaultDuration: 5000,
  stackGap: 12,
  showProgress: true,
  swipeToDismiss: true,
  pauseOnHover: true,
}

// Context for toast configuration
const ToastConfigContext = React.createContext<Required<ToastConfig>>(DEFAULT_CONFIG)

export const useToastConfig = () => React.useContext(ToastConfigContext)

// ============================================================================
// TOAST PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode
  config?: ToastConfig
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children, config }) => {
  const mergedConfig = React.useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  )

  return (
    <ToastConfigContext.Provider value={mergedConfig}>
      <ToastPrimitives.Provider
        swipeDirection={
          mergedConfig.position.includes("left")
            ? "left"
            : mergedConfig.position.includes("right")
            ? "right"
            : "down"
        }
        swipeThreshold={mergedConfig.swipeToDismiss ? 50 : 10000}
      >
        {children}
      </ToastPrimitives.Provider>
    </ToastConfigContext.Provider>
  )
}

// ============================================================================
// TOAST VIEWPORT - Multiple positions with smart stacking
// ============================================================================

const viewportPositionVariants = cva(
  "fixed z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px] pointer-events-none",
  {
    variants: {
      position: {
        "top-left": "top-0 left-0 items-start",
        "top-center": "top-0 left-1/2 -translate-x-1/2 items-center",
        "top-right": "top-0 right-0 items-end",
        "bottom-left": "bottom-0 left-0 items-start flex-col-reverse",
        "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
        "bottom-right": "bottom-0 right-0 items-end flex-col-reverse",
      },
    },
    defaultVariants: {
      position: "bottom-right",
    },
  }
)

interface ToastViewportProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> {
  position?: ToastPosition
}

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  ToastViewportProps
>(({ className, position, ...props }, ref) => {
  const config = useToastConfig()
  const pos = position || config.position

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(viewportPositionVariants({ position: pos }), className)}
      {...props}
    />
  )
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// ============================================================================
// TOAST VARIANTS & STYLING
// ============================================================================

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 pr-10 shadow-lg",
    "transition-all duration-300 ease-out",
    // Swipe gestures
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    // Entry/exit animations
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-80",
    "data-[state=open]:fade-in-0",
    // Slide animations based on position (handled via CSS variables)
    "data-[state=open]:slide-in-from-bottom-full",
    "data-[state=closed]:slide-out-to-right-full",
    // Touch device optimizations
    "touch-pan-x select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-border bg-background text-foreground",
          "shadow-md",
        ].join(" "),
        destructive: [
          "border-red-200 bg-red-50 text-red-900",
          "dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-100",
        ].join(" "),
        success: [
          "border-green-200 bg-green-50 text-green-900",
          "dark:border-green-800/50 dark:bg-green-950/50 dark:text-green-100",
        ].join(" "),
        warning: [
          "border-yellow-200 bg-yellow-50 text-yellow-900",
          "dark:border-yellow-800/50 dark:bg-yellow-950/50 dark:text-yellow-100",
        ].join(" "),
        info: [
          "border-blue-200 bg-blue-50 text-blue-900",
          "dark:border-blue-800/50 dark:bg-blue-950/50 dark:text-blue-100",
        ].join(" "),
        loading: [
          "border-border bg-background text-foreground",
          "shadow-md",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Icon configuration per variant
const variantIcons: Record<ToastVariant, LucideIcon> = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
}

const variantIconColors: Record<ToastVariant, string> = {
  default: "text-foreground/70",
  destructive: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  loading: "text-foreground/70 animate-spin",
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

interface ToastProgressProps {
  duration: number
  paused: boolean
  variant: ToastVariant
  onComplete?: () => void
}

const ToastProgress = React.forwardRef<HTMLDivElement, ToastProgressProps>(
  ({ duration, paused, variant, onComplete }, ref) => {
    const [progress, setProgress] = React.useState(100)
    // Initialize refs with safe defaults to avoid hydration mismatch
    const startTimeRef = React.useRef<number>(0)
    const remainingRef = React.useRef<number>(duration)
    const isInitializedRef = React.useRef(false)

    React.useEffect(() => {
      if (duration <= 0) return

      // Initialize timing on first mount
      if (!isInitializedRef.current) {
        startTimeRef.current = Date.now()
        remainingRef.current = duration
        isInitializedRef.current = true
      }

      let animationFrame: number

      const animate = () => {
        if (paused) {
          remainingRef.current = (progress / 100) * duration
          startTimeRef.current = Date.now()
          animationFrame = requestAnimationFrame(animate)
          return
        }

        const elapsed = Date.now() - startTimeRef.current
        const remaining = remainingRef.current - elapsed
        const newProgress = Math.max(0, (remaining / duration) * 100)

        setProgress(newProgress)

        if (newProgress <= 0) {
          onComplete?.()
        } else {
          animationFrame = requestAnimationFrame(animate)
        }
      }

      animationFrame = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationFrame)
    }, [duration, paused, progress, onComplete])

    if (duration <= 0) return null

    const progressColors: Record<ToastVariant, string> = {
      default: "bg-foreground/20",
      destructive: "bg-red-600/30 dark:bg-red-400/30",
      success: "bg-green-600/30 dark:bg-green-400/30",
      warning: "bg-yellow-600/30 dark:bg-yellow-400/30",
      info: "bg-blue-600/30 dark:bg-blue-400/30",
      loading: "bg-foreground/20",
    }

    const progressBarColors: Record<ToastVariant, string> = {
      default: "bg-foreground/50",
      destructive: "bg-red-600 dark:bg-red-400",
      success: "bg-green-600 dark:bg-green-400",
      warning: "bg-yellow-600 dark:bg-yellow-400",
      info: "bg-blue-600 dark:bg-blue-400",
      loading: "bg-foreground/50",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 overflow-hidden",
          progressColors[variant]
        )}
      >
        <div
          className={cn(
            "h-full transition-none",
            progressBarColors[variant]
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    )
  }
)
ToastProgress.displayName = "ToastProgress"

// ============================================================================
// MAIN TOAST COMPONENT
// ============================================================================

interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {
  /** Custom icon to display */
  icon?: LucideIcon | React.ReactNode
  /** Whether to show the default variant icon */
  showIcon?: boolean
  /** Auto-dismiss duration in ms (0 = persistent) */
  duration?: number
  /** Whether this toast is persistent (critical info) */
  persistent?: boolean
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean
  /** Action buttons */
  actions?: ToastAction[]
  /** Custom close button */
  closeButton?: React.ReactNode
  /** Callback when toast is dismissed */
  onDismiss?: () => void
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(
  (
    {
      className,
      variant = "default",
      icon,
      showIcon = true,
      duration,
      persistent = false,
      showProgress: showProgressProp,
      actions,
      children,
      onDismiss,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const config = useToastConfig()
    const [isPaused, setIsPaused] = React.useState(false)

    // Calculate actual duration
    const actualDuration = persistent
      ? 0
      : duration ?? (variant === "loading" ? 0 : config.defaultDuration)

    const shouldShowProgress =
      (showProgressProp ?? config.showProgress) && actualDuration > 0

    // Get icon to display
    const IconComponent = React.useMemo(() => {
      if (!showIcon) return null
      if (React.isValidElement(icon)) return icon
      if (icon) return icon as LucideIcon
      return variantIcons[variant || "default"]
    }, [icon, showIcon, variant])

    const handleOpenChange = React.useCallback(
      (open: boolean) => {
        if (!open) {
          onDismiss?.()
        }
        onOpenChange?.(open)
      },
      [onDismiss, onOpenChange]
    )

    return (
      <ToastPrimitives.Root
        ref={ref}
        duration={actualDuration || Infinity}
        className={cn(toastVariants({ variant }), className)}
        onOpenChange={handleOpenChange}
        onMouseEnter={() => config.pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => config.pauseOnHover && setIsPaused(false)}
        onTouchStart={() => config.pauseOnHover && setIsPaused(true)}
        onTouchEnd={() => config.pauseOnHover && setIsPaused(false)}
        {...props}
      >
        {/* Icon */}
        {showIcon && IconComponent && (
          <div className="flex-shrink-0 mt-0.5">
            {React.isValidElement(IconComponent) ? (
              IconComponent
            ) : (
              <IconComponent
                className={cn(
                  "h-5 w-5",
                  variantIconColors[variant || "default"]
                )}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}

          {/* Action Buttons */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {actions.map((action, index) => (
                <ToastActionButton
                  key={index}
                  variant={variant || "default"}
                  actionVariant={action.variant}
                  onClick={action.onClick}
                >
                  {action.label}
                </ToastActionButton>
              ))}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {shouldShowProgress && (
          <ToastProgress
            duration={actualDuration}
            paused={isPaused}
            variant={variant || "default"}
          />
        )}
      </ToastPrimitives.Root>
    )
  }
)
Toast.displayName = ToastPrimitives.Root.displayName

// ============================================================================
// TOAST ACTION BUTTON
// ============================================================================

interface ToastActionButtonProps {
  children: React.ReactNode
  variant: ToastVariant
  actionVariant?: "default" | "destructive" | "outline"
  onClick: () => void
}

const ToastActionButton: React.FC<ToastActionButtonProps> = ({
  children,
  variant,
  actionVariant = "default",
  onClick,
}) => {
  const baseStyles =
    "inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

  const variantStyles: Record<ToastVariant, Record<string, string>> = {
    default: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    destructive: {
      default: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
      outline: "border border-red-300 bg-transparent text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50",
      destructive: "bg-red-800 text-white hover:bg-red-900",
    },
    success: {
      default: "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
      outline: "border border-green-300 bg-transparent text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/50",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    },
    warning: {
      default: "bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600",
      outline: "border border-yellow-300 bg-transparent text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/50",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    },
    info: {
      default: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      outline: "border border-blue-300 bg-transparent text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    },
    loading: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseStyles, variantStyles[variant][actionVariant])}
    >
      {children}
    </button>
  )
}

// ============================================================================
// RADIX TOAST ACTION (for compatibility)
// ============================================================================

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

// ============================================================================
// TOAST CLOSE BUTTON
// ============================================================================

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity",
      "hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
      "group-hover:opacity-100",
      // Variant-specific close button colors
      "group-[.destructive]:text-red-400 group-[.destructive]:hover:text-red-100 group-[.destructive]:focus:ring-red-400",
      "group-[.success]:text-green-400 group-[.success]:hover:text-green-100 group-[.success]:focus:ring-green-400",
      "group-[.warning]:text-yellow-400 group-[.warning]:hover:text-yellow-100 group-[.warning]:focus:ring-yellow-400",
      "group-[.info]:text-blue-400 group-[.info]:hover:text-blue-100 group-[.info]:focus:ring-blue-400",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

// ============================================================================
// TOAST TITLE & DESCRIPTION
// ============================================================================

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90 mt-1", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// ============================================================================
// EXPORTS
// ============================================================================

type ToastRootProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastRootProps as ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

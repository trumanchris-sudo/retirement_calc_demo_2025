"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

type TooltipTheme = "dark" | "light" | "primary" | "success" | "warning" | "danger"
type ArrowPosition = "center" | "start" | "end"

interface TooltipContextValue {
  isPinned: boolean
  setIsPinned: (pinned: boolean) => void
  theme: TooltipTheme
}

// ============================================================================
// CONTEXT
// ============================================================================

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const context = React.useContext(TooltipContext)
  return context
}

// ============================================================================
// SPRING ANIMATION KEYFRAMES (CSS-based spring physics simulation)
// ============================================================================

const springKeyframes = `
@keyframes tooltip-spring-in {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(4px);
  }
  40% {
    opacity: 1;
    transform: scale(1.02) translateY(-1px);
  }
  70% {
    transform: scale(0.98) translateY(1px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes tooltip-spring-out {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.9) translateY(4px);
  }
}

@keyframes tooltip-slide-top {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(8px);
  }
  40% {
    opacity: 1;
    transform: scale(1.02) translateY(-2px);
  }
  70% {
    transform: scale(0.98) translateY(1px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes tooltip-slide-bottom {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(-8px);
  }
  40% {
    opacity: 1;
    transform: scale(1.02) translateY(2px);
  }
  70% {
    transform: scale(0.98) translateY(-1px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes tooltip-slide-left {
  0% {
    opacity: 0;
    transform: scale(0.85) translateX(8px);
  }
  40% {
    opacity: 1;
    transform: scale(1.02) translateX(-2px);
  }
  70% {
    transform: scale(0.98) translateX(1px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}

@keyframes tooltip-slide-right {
  0% {
    opacity: 0;
    transform: scale(0.85) translateX(-8px);
  }
  40% {
    opacity: 1;
    transform: scale(1.02) translateX(2px);
  }
  70% {
    transform: scale(0.98) translateX(-1px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}

@keyframes tooltip-pin-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}
`

// Inject keyframes into document head
if (typeof document !== "undefined") {
  const styleId = "tooltip-spring-keyframes"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = springKeyframes
    document.head.appendChild(style)
  }
}

// ============================================================================
// THEME VARIANTS
// ============================================================================

const themeVariants: Record<TooltipTheme, string> = {
  dark: "bg-gray-900 text-white border-gray-700 shadow-lg shadow-gray-900/20",
  light: "bg-white text-gray-900 border-gray-200 shadow-lg shadow-gray-200/50",
  primary: "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30",
  success: "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30",
  warning: "bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30",
  danger: "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30",
}

const arrowVariants: Record<TooltipTheme, string> = {
  dark: "fill-gray-900",
  light: "fill-white",
  primary: "fill-blue-600",
  success: "fill-emerald-600",
  warning: "fill-amber-500",
  danger: "fill-red-600",
}

// ============================================================================
// PROVIDER
// ============================================================================

const TooltipProvider = TooltipPrimitive.Provider

// ============================================================================
// ENHANCED TOOLTIP ROOT
// ============================================================================

interface EnhancedTooltipProps {
  children: React.ReactNode
  theme?: TooltipTheme
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  disableHoverableContent?: boolean
}

function Tooltip({
  children,
  theme = "dark",
  defaultOpen,
  open: controlledOpen,
  onOpenChange,
  delayDuration,
  disableHoverableContent,
}: EnhancedTooltipProps) {
  const [isPinned, setIsPinned] = React.useState(false)
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isPinned || (isControlled ? controlledOpen : internalOpen)

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!isPinned) {
      if (!isControlled) {
        setInternalOpen(open)
      }
      onOpenChange?.(open)
    }
  }, [isPinned, isControlled, onOpenChange])

  return (
    <TooltipContext.Provider value={{ isPinned, setIsPinned, theme }}>
      <TooltipPrimitive.Root
        open={isOpen}
        onOpenChange={handleOpenChange}
        delayDuration={delayDuration}
        disableHoverableContent={disableHoverableContent}
      >
        {children}
      </TooltipPrimitive.Root>
    </TooltipContext.Provider>
  )
}

// ============================================================================
// TRIGGER WITH MOBILE LONG-PRESS SUPPORT
// ============================================================================

interface TooltipTriggerProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {
  asChild?: boolean
  longPressDuration?: number
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  TooltipTriggerProps
>(({ className, longPressDuration = 500, onKeyDown, ...props }, ref) => {
  const context = useTooltipContext()
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = React.useState(false)

  // Long-press handlers for mobile
  const handleTouchStart = React.useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true)
      if (context) {
        context.setIsPinned(true)
      }
    }, longPressDuration)
  }, [longPressDuration, context])

  const handleTouchEnd = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  const handleTouchMove = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  // Keyboard accessibility
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (context) {
        context.setIsPinned(!context.isPinned)
      }
    }
    if (e.key === "Escape" && context?.isPinned) {
      e.preventDefault()
      context.setIsPinned(false)
    }
    onKeyDown?.(e)
  }, [context, onKeyDown])

  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      className={cn(
        "touch-none select-none cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isLongPressing && "scale-95 transition-transform duration-150",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onKeyDown={handleKeyDown}
      aria-expanded={context?.isPinned}
      {...props}
    />
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

// ============================================================================
// ENHANCED CONTENT WITH ALL FEATURES
// ============================================================================

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  showArrow?: boolean
  arrowPosition?: ArrowPosition
  enablePin?: boolean
  maxWidth?: number | string
  theme?: TooltipTheme
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({
  className,
  sideOffset = 8,
  showArrow = true,
  arrowPosition = "center",
  enablePin = true,
  maxWidth = 320,
  theme: propTheme,
  children,
  onPointerDownOutside,
  ...props
}, ref) => {
  const context = useTooltipContext()
  const theme = propTheme ?? context?.theme ?? "dark"
  const [side, setSide] = React.useState<"top" | "bottom" | "left" | "right">("top")

  // Click-to-pin handler
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    if (enablePin && context) {
      e.stopPropagation()
      context.setIsPinned(!context.isPinned)
    }
  }, [enablePin, context])

  // Handle clicking outside when pinned
  const handlePointerDownOutside = React.useCallback((e: Event) => {
    if (context?.isPinned) {
      e.preventDefault()
      context.setIsPinned(false)
    }
    onPointerDownOutside?.(e as any)
  }, [context, onPointerDownOutside])

  // Get animation class based on side
  const getAnimationClass = () => {
    if (context?.isPinned) {
      return "animate-[tooltip-pin-bounce_0.3s_ease-out]"
    }
    switch (side) {
      case "top":
        return "animate-[tooltip-slide-top_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
      case "bottom":
        return "animate-[tooltip-slide-bottom_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
      case "left":
        return "animate-[tooltip-slide-left_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
      case "right":
        return "animate-[tooltip-slide-right_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
      default:
        return "animate-[tooltip-spring-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)]"
    }
  }

  // Arrow alignment styles
  const arrowAlignmentStyles: Record<ArrowPosition, string> = {
    center: "",
    start: "[&>svg]:translate-x-[-8px]",
    end: "[&>svg]:translate-x-[8px]",
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        onPointerDownOutside={handlePointerDownOutside}
        className={cn(
          // Base styles
          "z-50 overflow-hidden rounded-lg border px-3 py-2 text-sm",
          // Theme
          themeVariants[theme],
          // Animation
          getAnimationClass(),
          "data-[state=closed]:animate-[tooltip-spring-out_0.2s_ease-out]",
          // Pinned state
          context?.isPinned && [
            "ring-2 ring-offset-2",
            theme === "dark" && "ring-gray-500 ring-offset-gray-900",
            theme === "light" && "ring-gray-300 ring-offset-white",
            theme === "primary" && "ring-blue-400 ring-offset-blue-600",
            theme === "success" && "ring-emerald-400 ring-offset-emerald-600",
            theme === "warning" && "ring-amber-300 ring-offset-amber-500",
            theme === "danger" && "ring-red-400 ring-offset-red-600",
          ],
          // Clickable when pin is enabled
          enablePin && "cursor-pointer",
          className
        )}
        style={{
          maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
        }}
        onClick={handleClick}
        onAnimationStart={(e) => {
          // Capture current side for animation
          const el = e.currentTarget as HTMLElement
          const dataSide = el.getAttribute("data-side") as typeof side
          if (dataSide) setSide(dataSide)
        }}
        role="tooltip"
        aria-live={context?.isPinned ? "polite" : undefined}
        {...props}
      >
        {children}

        {/* Pin indicator */}
        {context?.isPinned && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          </div>
        )}

        {/* Arrow */}
        {showArrow && (
          <TooltipPrimitive.Arrow
            className={cn(
              "drop-shadow-sm",
              arrowVariants[theme],
              arrowAlignmentStyles[arrowPosition]
            )}
            width={12}
            height={6}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// ============================================================================
// RICH CONTENT COMPONENTS
// ============================================================================

interface TooltipHeaderProps {
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

const TooltipHeader = React.forwardRef<HTMLDivElement, TooltipHeaderProps>(
  ({ children, className, icon }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 font-semibold text-base mb-1.5 pb-1.5 border-b border-current/20",
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </div>
  )
)
TooltipHeader.displayName = "TooltipHeader"

interface TooltipBodyProps {
  children: React.ReactNode
  className?: string
}

const TooltipBody = React.forwardRef<HTMLDivElement, TooltipBodyProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm leading-relaxed opacity-90", className)}
    >
      {children}
    </div>
  )
)
TooltipBody.displayName = "TooltipBody"

interface TooltipImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

const TooltipImage = React.forwardRef<HTMLImageElement, TooltipImageProps>(
  ({ src, alt, className, width, height }, ref) => (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        "rounded-md my-2 max-w-full h-auto object-cover",
        className
      )}
      loading="lazy"
    />
  )
)
TooltipImage.displayName = "TooltipImage"

interface TooltipFooterProps {
  children: React.ReactNode
  className?: string
}

const TooltipFooter = React.forwardRef<HTMLDivElement, TooltipFooterProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-2 mt-2 pt-2 border-t border-current/20 text-xs opacity-70",
        className
      )}
    >
      {children}
    </div>
  )
)
TooltipFooter.displayName = "TooltipFooter"

interface TooltipListProps {
  items: string[]
  className?: string
  ordered?: boolean
}

const TooltipList = React.forwardRef<HTMLUListElement, TooltipListProps>(
  ({ items, className, ordered = false }, ref) => {
    const ListTag = ordered ? "ol" : "ul"
    return (
      <ListTag
        ref={ref as any}
        className={cn(
          "my-1.5 ml-4 space-y-0.5 text-sm",
          ordered ? "list-decimal" : "list-disc",
          className
        )}
      >
        {items.map((item, index) => (
          <li key={index} className="opacity-90">
            {item}
          </li>
        ))}
      </ListTag>
    )
  }
)
TooltipList.displayName = "TooltipList"

interface TooltipCodeProps {
  children: string
  className?: string
}

const TooltipCode = React.forwardRef<HTMLElement, TooltipCodeProps>(
  ({ children, className }, ref) => (
    <code
      ref={ref}
      className={cn(
        "px-1.5 py-0.5 rounded bg-current/10 font-mono text-xs",
        className
      )}
    >
      {children}
    </code>
  )
)
TooltipCode.displayName = "TooltipCode"

interface TooltipBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "success" | "warning" | "danger"
}

const badgeVariants = {
  default: "bg-current/20",
  success: "bg-emerald-500/30 text-emerald-100",
  warning: "bg-amber-500/30 text-amber-100",
  danger: "bg-red-500/30 text-red-100",
}

const TooltipBadge = React.forwardRef<HTMLSpanElement, TooltipBadgeProps>(
  ({ children, className, variant = "default" }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
)
TooltipBadge.displayName = "TooltipBadge"

// ============================================================================
// KEYBOARD HINT COMPONENT
// ============================================================================

interface TooltipKeyboardHintProps {
  className?: string
}

const TooltipKeyboardHint = React.forwardRef<HTMLDivElement, TooltipKeyboardHintProps>(
  ({ className }, ref) => {
    const context = useTooltipContext()

    if (!context) return null

    return (
      <div
        ref={ref}
        className={cn(
          "text-[10px] opacity-50 mt-2 flex items-center gap-2",
          className
        )}
      >
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded bg-current/10 font-mono">Enter</kbd>
          <span>to {context.isPinned ? "unpin" : "pin"}</span>
        </span>
        {context.isPinned && (
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-current/10 font-mono">Esc</kbd>
            <span>to close</span>
          </span>
        )}
      </div>
    )
  }
)
TooltipKeyboardHint.displayName = "TooltipKeyboardHint"

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  // Rich content components
  TooltipHeader,
  TooltipBody,
  TooltipImage,
  TooltipFooter,
  TooltipList,
  TooltipCode,
  TooltipBadge,
  TooltipKeyboardHint,
  // Types
  type TooltipTheme,
  type ArrowPosition,
  type TooltipContentProps,
  type TooltipTriggerProps,
}

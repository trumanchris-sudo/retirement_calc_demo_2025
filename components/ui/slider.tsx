"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  gradient?: boolean;
  /** Accessible label for the slider thumb */
  thumbLabel?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, gradient = true, thumbLabel, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group",
      // Ensure proper touch target spacing
      "py-2 md:py-1",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative w-full grow overflow-hidden rounded-full bg-secondary",
        // Larger track on touch devices for easier targeting
        "h-3 md:h-2"
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full transition-colors",
          gradient
            ? "bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600"
            : "bg-primary"
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        // 44px minimum touch target on mobile (WCAG 2.5.5), 24px on desktop
        "block h-11 w-11 md:h-6 md:w-6",
        "rounded-full border-2 bg-background ring-offset-background",
        // Smooth transitions
        "transition-all duration-150",
        // Focus styles - highly visible for keyboard users
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "focus-visible:scale-110",
        // Disabled state
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        // Hover and active states
        "hover:scale-110 hover:shadow-lg",
        "active:scale-95 cursor-grab active:cursor-grabbing",
        // Color based on gradient prop
        gradient
          ? "border-blue-600 dark:border-blue-400 shadow-md"
          : "border-primary shadow-md"
      )}
      aria-label={thumbLabel || "Adjust value"}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

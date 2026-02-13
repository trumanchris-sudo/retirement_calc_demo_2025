"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base styles - larger on mobile for touch (20px default, can be overridden)
      "peer h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded-sm border border-primary",
      // Focus and interaction styles
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state
      "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      // Touch-friendly: cursor pointer and active states
      "cursor-pointer active:scale-95 transition-transform",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

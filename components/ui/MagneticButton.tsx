"use client";

import * as React from "react";
import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Magnetic strength and glow configuration
const MAGNETIC_STRENGTH = 0.35; // How strongly the button follows cursor (0-1)
const MAGNETIC_RADIUS = 150; // Distance in pixels where magnetic effect activates
const SPRING_CONFIG = {
  stiffness: 150,
  damping: 15,
  mass: 0.1,
};

// Button variants matching the existing button.tsx patterns
const magneticButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 md:h-10 px-4 py-2",
        sm: "h-10 md:h-9 rounded-md px-3",
        lg: "h-12 md:h-11 rounded-md px-8",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
      glow: {
        none: "",
        subtle: "",
        strong: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: "subtle",
    },
  }
);

// Glow color mappings based on variant
const glowColors: Record<string, string> = {
  default: "rgba(var(--primary-rgb, 59, 130, 246), 0.5)",
  destructive: "rgba(239, 68, 68, 0.5)",
  outline: "rgba(var(--primary-rgb, 59, 130, 246), 0.3)",
  secondary: "rgba(var(--secondary-rgb, 100, 116, 139), 0.4)",
  ghost: "rgba(var(--primary-rgb, 59, 130, 246), 0.2)",
  link: "rgba(var(--primary-rgb, 59, 130, 246), 0.2)",
};

const glowIntensity: Record<string, { blur: number; spread: number }> = {
  none: { blur: 0, spread: 0 },
  subtle: { blur: 20, spread: 0 },
  strong: { blur: 30, spread: 5 },
};

export interface MagneticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof magneticButtonVariants> {
  asChild?: boolean;
  /** Disable the magnetic effect while keeping glow */
  disableMagnetic?: boolean;
  /** Custom magnetic strength (0-1, default 0.35) */
  magneticStrength?: number;
  /** Custom magnetic radius in pixels (default 150) */
  magneticRadius?: number;
}

const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  (
    {
      className,
      variant = "default",
      size,
      glow = "subtle",
      asChild = false,
      disableMagnetic = false,
      magneticStrength = MAGNETIC_STRENGTH,
      magneticRadius = MAGNETIC_RADIUS,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isNearby, setIsNearby] = useState(false);

    // Motion values for smooth animation
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring physics for natural feel
    const springX = useSpring(x, SPRING_CONFIG);
    const springY = useSpring(y, SPRING_CONFIG);

    // Track mouse position with requestAnimationFrame for performance
    const rafRef = useRef<number | null>(null);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (disabled || disableMagnetic || !buttonRef.current) return;

        // Cancel any pending animation frame
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          const button = buttonRef.current;
          if (!button) return;

          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const distanceX = e.clientX - centerX;
          const distanceY = e.clientY - centerY;
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

          if (distance < magneticRadius) {
            setIsNearby(true);
            // Calculate normalized distance (0 at edge, 1 at center)
            const normalizedDistance = 1 - distance / magneticRadius;
            // Apply easing for smoother falloff
            const eased = normalizedDistance * normalizedDistance;

            const moveX = distanceX * magneticStrength * eased;
            const moveY = distanceY * magneticStrength * eased;

            x.set(moveX);
            y.set(moveY);
          } else {
            setIsNearby(false);
            x.set(0);
            y.set(0);
          }
        });
      },
      [disabled, disableMagnetic, magneticRadius, magneticStrength, x, y]
    );

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
      setIsNearby(false);
      x.set(0);
      y.set(0);
    }, [x, y]);

    // Add global mouse move listener for magnetic effect
    useEffect(() => {
      if (disabled || disableMagnetic) return;

      window.addEventListener("mousemove", handleMouseMove, { passive: true });

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, [handleMouseMove, disabled, disableMagnetic]);

    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const Comp = asChild ? Slot : "button";
    const variantKey = variant || "default";
    const glowKey = glow || "subtle";
    const glowColor = glowColors[variantKey] || glowColors.default;
    const glowSettings = glowIntensity[glowKey] || glowIntensity.subtle;

    // Calculate glow opacity based on hover/nearby state
    const glowOpacity = isHovered ? 1 : isNearby ? 0.5 : 0;

    return (
      <motion.div
        className="relative inline-block"
        style={{
          x: springX,
          y: springY,
        }}
      >
        {/* Glow effect layer */}
        {glowKey !== "none" && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-md"
            initial={{ opacity: 0 }}
            animate={{
              opacity: glowOpacity,
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { type: "spring", stiffness: 300, damping: 20 },
            }}
            style={{
              boxShadow: `0 0 ${glowSettings.blur}px ${glowSettings.spread}px ${glowColor}`,
              zIndex: -1,
            }}
          />
        )}

        {/* Button content */}
        <Comp
          ref={mergedRef}
          className={cn(
            magneticButtonVariants({ variant, size, glow, className }),
            "transform-gpu" // Enable GPU acceleration
          )}
          disabled={disabled}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          {children}
        </Comp>
      </motion.div>
    );
  }
);

MagneticButton.displayName = "MagneticButton";

export { MagneticButton, magneticButtonVariants };

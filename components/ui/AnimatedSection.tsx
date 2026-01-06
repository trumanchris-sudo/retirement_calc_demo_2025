"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // milliseconds
  animation?: "fade-in" | "slide-up" | "slide-in-from-bottom" | "scale-in";
  duration?: number; // milliseconds
  threshold?: number; // Intersection observer threshold (0-1)
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className,
  delay = 0,
  animation = "slide-up",
  duration = 600,
  threshold = 0.1
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if element is already in viewport on mount
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

      if (isInViewport) {
        // Element is already visible, show it immediately (with delay if specified)
        setTimeout(() => {
          setIsVisible(true);
        }, delay);
        return; // No need to set up observer
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add delay before triggering animation
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          // Unobserve after animation triggers
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before element is fully visible
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay, threshold]);

  const animationClasses = {
    "fade-in": {
      initial: "opacity-0",
      animate: "opacity-100"
    },
    "slide-up": {
      initial: "opacity-0 translate-y-8",
      animate: "opacity-100 translate-y-0"
    },
    "slide-in-from-bottom": {
      initial: "opacity-0 translate-y-12",
      animate: "opacity-100 translate-y-0"
    },
    "scale-in": {
      initial: "opacity-0 scale-95",
      animate: "opacity-100 scale-100"
    }
  };

  const { initial, animate } = animationClasses[animation];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        initial,
        isVisible && animate,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
};

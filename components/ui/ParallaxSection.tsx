"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FloatingElement {
  /** Unique identifier */
  id: string;
  /** Type of decorative element */
  type: "circle" | "ring" | "blob" | "gradient-orb" | "diamond" | "line";
  /** Size in pixels or as CSS value */
  size: number | string;
  /** Position from left (0-100%) */
  left: number;
  /** Position from top (0-100%) */
  top: number;
  /** Parallax speed multiplier (0 = static, 1 = normal scroll, -1 = reverse) */
  speed: number;
  /** Color (supports Tailwind color classes or CSS values) */
  color?: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Blur radius in pixels */
  blur?: number;
  /** Additional rotation during scroll (degrees per 100px scroll) */
  rotationSpeed?: number;
  /** Initial rotation in degrees */
  initialRotation?: number;
  /** Horizontal movement during scroll */
  horizontalSpeed?: number;
  /** Scale variation during scroll */
  scaleSpeed?: number;
  /** Animation delay for floating animation */
  animationDelay?: number;
  /** Enable floating animation */
  float?: boolean;
}

interface BackgroundLayer {
  /** Unique identifier */
  id: string;
  /** Parallax speed multiplier */
  speed: number;
  /** CSS gradient or color */
  background: string;
  /** Z-index for layering */
  zIndex?: number;
  /** Opacity (0-1) */
  opacity?: number;
}

interface ParallaxSectionProps {
  /** Child content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Height of the section */
  height?: string;
  /** Background layers with different parallax speeds */
  backgroundLayers?: BackgroundLayer[];
  /** Floating decorative elements */
  floatingElements?: FloatingElement[];
  /** Intensity multiplier for all parallax effects (0-2) */
  intensity?: number;
  /** Disable parallax and show static version */
  disabled?: boolean;
  /** Custom container styles */
  style?: React.CSSProperties;
  /** Content wrapper className */
  contentClassName?: string;
  /** Enable debug mode to visualize elements */
  debug?: boolean;
  /** Preset configuration */
  preset?: "hero" | "results" | "minimal" | "dramatic" | "custom";
}

// ============================================================================
// Preset Configurations
// ============================================================================

const presets: Record<
  Exclude<ParallaxSectionProps["preset"], "custom" | undefined>,
  {
    backgroundLayers: BackgroundLayer[];
    floatingElements: FloatingElement[];
  }
> = {
  hero: {
    backgroundLayers: [
      {
        id: "hero-base",
        speed: 0,
        background:
          "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)/0.3) 100%)",
        zIndex: 0,
        opacity: 1,
      },
      {
        id: "hero-mid",
        speed: 0.3,
        background:
          "radial-gradient(ellipse at 30% 20%, hsl(217 91% 60% / 0.08) 0%, transparent 50%)",
        zIndex: 1,
        opacity: 1,
      },
      {
        id: "hero-accent",
        speed: 0.5,
        background:
          "radial-gradient(ellipse at 70% 80%, hsl(263 70% 50% / 0.06) 0%, transparent 50%)",
        zIndex: 2,
        opacity: 1,
      },
    ],
    floatingElements: [
      {
        id: "hero-orb-1",
        type: "gradient-orb",
        size: 400,
        left: 10,
        top: 15,
        speed: 0.2,
        color: "from-blue-400/20 to-violet-400/10",
        blur: 80,
        float: true,
        animationDelay: 0,
      },
      {
        id: "hero-orb-2",
        type: "gradient-orb",
        size: 300,
        left: 75,
        top: 60,
        speed: 0.35,
        color: "from-violet-400/15 to-blue-400/10",
        blur: 60,
        float: true,
        animationDelay: 2,
      },
      {
        id: "hero-ring-1",
        type: "ring",
        size: 200,
        left: 85,
        top: 20,
        speed: 0.15,
        color: "border-blue-300/20 dark:border-blue-500/10",
        rotationSpeed: 5,
        float: true,
        animationDelay: 1,
      },
      {
        id: "hero-circle-1",
        type: "circle",
        size: 12,
        left: 20,
        top: 70,
        speed: 0.4,
        color: "bg-blue-400/30 dark:bg-blue-400/20",
        float: true,
        animationDelay: 0.5,
      },
      {
        id: "hero-circle-2",
        type: "circle",
        size: 8,
        left: 60,
        top: 25,
        speed: 0.5,
        color: "bg-violet-400/25 dark:bg-violet-400/15",
        float: true,
        animationDelay: 1.5,
      },
    ],
  },
  results: {
    backgroundLayers: [
      {
        id: "results-base",
        speed: 0,
        background: "hsl(var(--background))",
        zIndex: 0,
        opacity: 1,
      },
      {
        id: "results-gradient",
        speed: 0.2,
        background:
          "linear-gradient(180deg, transparent 0%, hsl(217 91% 60% / 0.03) 50%, transparent 100%)",
        zIndex: 1,
        opacity: 1,
      },
    ],
    floatingElements: [
      {
        id: "results-blob-1",
        type: "blob",
        size: 500,
        left: -10,
        top: 30,
        speed: 0.15,
        color: "from-blue-500/5 to-transparent",
        blur: 100,
        float: false,
      },
      {
        id: "results-blob-2",
        type: "blob",
        size: 400,
        left: 80,
        top: 60,
        speed: 0.25,
        color: "from-violet-500/5 to-transparent",
        blur: 80,
        float: false,
      },
      {
        id: "results-line-1",
        type: "line",
        size: 200,
        left: 5,
        top: 50,
        speed: 0.1,
        color: "bg-gradient-to-r from-transparent via-blue-300/10 to-transparent",
        initialRotation: 45,
        rotationSpeed: 2,
      },
      {
        id: "results-diamond-1",
        type: "diamond",
        size: 40,
        left: 90,
        top: 20,
        speed: 0.3,
        color: "border-blue-300/15 dark:border-blue-400/10",
        rotationSpeed: 8,
      },
    ],
  },
  minimal: {
    backgroundLayers: [
      {
        id: "minimal-gradient",
        speed: 0.1,
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(217 91% 60% / 0.04) 0%, transparent 70%)",
        zIndex: 1,
        opacity: 1,
      },
    ],
    floatingElements: [
      {
        id: "minimal-orb",
        type: "gradient-orb",
        size: 600,
        left: 50,
        top: 0,
        speed: 0.1,
        color: "from-blue-400/10 to-transparent",
        blur: 120,
        float: false,
      },
    ],
  },
  dramatic: {
    backgroundLayers: [
      {
        id: "dramatic-base",
        speed: 0,
        background:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(217 30% 10% / 0.5) 100%)",
        zIndex: 0,
        opacity: 1,
      },
      {
        id: "dramatic-mid",
        speed: 0.4,
        background:
          "radial-gradient(ellipse at 20% 50%, hsl(217 91% 60% / 0.15) 0%, transparent 50%)",
        zIndex: 1,
        opacity: 1,
      },
      {
        id: "dramatic-accent",
        speed: 0.6,
        background:
          "radial-gradient(ellipse at 80% 30%, hsl(263 70% 50% / 0.12) 0%, transparent 40%)",
        zIndex: 2,
        opacity: 1,
      },
    ],
    floatingElements: [
      {
        id: "dramatic-orb-1",
        type: "gradient-orb",
        size: 500,
        left: 5,
        top: 10,
        speed: 0.3,
        color: "from-blue-500/25 to-violet-500/15",
        blur: 100,
        float: true,
        animationDelay: 0,
      },
      {
        id: "dramatic-orb-2",
        type: "gradient-orb",
        size: 400,
        left: 70,
        top: 50,
        speed: 0.45,
        color: "from-violet-500/20 to-blue-500/10",
        blur: 80,
        float: true,
        animationDelay: 1.5,
      },
      {
        id: "dramatic-ring-1",
        type: "ring",
        size: 300,
        left: 80,
        top: 15,
        speed: 0.2,
        color: "border-blue-400/15 dark:border-blue-300/10",
        rotationSpeed: 3,
        float: true,
        animationDelay: 0.5,
      },
      {
        id: "dramatic-ring-2",
        type: "ring",
        size: 150,
        left: 15,
        top: 70,
        speed: 0.35,
        color: "border-violet-400/10 dark:border-violet-300/8",
        rotationSpeed: -5,
        float: true,
        animationDelay: 2,
      },
      {
        id: "dramatic-circle-1",
        type: "circle",
        size: 20,
        left: 30,
        top: 20,
        speed: 0.5,
        color: "bg-blue-400/20",
        float: true,
        animationDelay: 1,
      },
      {
        id: "dramatic-circle-2",
        type: "circle",
        size: 14,
        left: 65,
        top: 75,
        speed: 0.55,
        color: "bg-violet-400/15",
        float: true,
        animationDelay: 2.5,
      },
      {
        id: "dramatic-diamond-1",
        type: "diamond",
        size: 30,
        left: 50,
        top: 40,
        speed: 0.4,
        color: "border-blue-300/20",
        rotationSpeed: 10,
      },
    ],
  },
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to detect reduced motion preference
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect mobile devices
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    mediaQuery.addEventListener("change", checkMobile);

    return () => mediaQuery.removeEventListener("change", checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook for optimized scroll position tracking
 */
function useScrollPosition(enabled: boolean) {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    // Initial value
    setScrollY(window.scrollY);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  return scrollY;
}

/**
 * Hook for element visibility with IntersectionObserver
 */
function useElementVisibility(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const [isVisible, setIsVisible] = useState(false);
  const [offsetTop, setOffsetTop] = useState(0);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && ref.current) {
          setOffsetTop(ref.current.offsetTop);
        }
      },
      {
        rootMargin: "100px 0px",
        threshold: 0,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, enabled]);

  return { isVisible, offsetTop };
}

// ============================================================================
// Floating Element Component
// ============================================================================

interface FloatingElementRendererProps {
  element: FloatingElement;
  scrollY: number;
  offsetTop: number;
  intensity: number;
  isAnimated: boolean;
  debug?: boolean;
}

const FloatingElementRenderer: React.FC<FloatingElementRendererProps> =
  React.memo(({ element, scrollY, offsetTop, intensity, isAnimated, debug }) => {
    const relativeScroll = scrollY - offsetTop;
    const translateY = isAnimated ? relativeScroll * element.speed * intensity : 0;
    const translateX = isAnimated
      ? relativeScroll * (element.horizontalSpeed || 0) * intensity
      : 0;
    const rotation = isAnimated
      ? (element.initialRotation || 0) +
        (relativeScroll / 100) * (element.rotationSpeed || 0) * intensity
      : element.initialRotation || 0;
    const scale = isAnimated
      ? 1 + relativeScroll * (element.scaleSpeed || 0) * 0.001 * intensity
      : 1;

    const size =
      typeof element.size === "number" ? `${element.size}px` : element.size;

    const baseStyles: React.CSSProperties = {
      position: "absolute",
      left: `${element.left}%`,
      top: `${element.top}%`,
      width: size,
      height: element.type === "line" ? "2px" : size,
      transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotation}deg) scale(${scale})`,
      willChange: isAnimated ? "transform" : "auto",
      pointerEvents: "none",
      opacity: element.opacity ?? 1,
      filter: element.blur ? `blur(${element.blur}px)` : undefined,
    };

    const floatAnimation = element.float
      ? {
          animation: `parallax-float 6s ease-in-out infinite`,
          animationDelay: `${element.animationDelay || 0}s`,
        }
      : {};

    const renderElement = () => {
      switch (element.type) {
        case "circle":
          return (
            <div
              className={cn("rounded-full", element.color || "bg-blue-400/20")}
              style={{ width: "100%", height: "100%" }}
            />
          );

        case "ring":
          return (
            <div
              className={cn(
                "rounded-full border-2",
                element.color || "border-blue-300/20"
              )}
              style={{ width: "100%", height: "100%" }}
            />
          );

        case "blob":
          return (
            <div
              className={cn(
                "rounded-full bg-gradient-to-br",
                element.color || "from-blue-400/10 to-transparent"
              )}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
              }}
            />
          );

        case "gradient-orb":
          return (
            <div
              className={cn(
                "rounded-full bg-gradient-to-br",
                element.color || "from-blue-400/20 to-violet-400/10"
              )}
              style={{ width: "100%", height: "100%" }}
            />
          );

        case "diamond":
          return (
            <div
              className={cn("border-2", element.color || "border-blue-300/20")}
              style={{
                width: "70.7%",
                height: "70.7%",
                transform: "rotate(45deg)",
                transformOrigin: "center",
              }}
            />
          );

        case "line":
          return (
            <div
              className={cn(element.color || "bg-blue-300/20")}
              style={{ width: "100%", height: "100%" }}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div
        style={{ ...baseStyles, ...floatAnimation }}
        data-element-id={debug ? element.id : undefined}
        aria-hidden="true"
      >
        {renderElement()}
        {debug && (
          <span className="absolute top-0 left-0 text-[8px] text-red-500 bg-white/80 px-1">
            {element.id}
          </span>
        )}
      </div>
    );
  });

FloatingElementRenderer.displayName = "FloatingElementRenderer";

// ============================================================================
// Background Layer Component
// ============================================================================

interface BackgroundLayerRendererProps {
  layer: BackgroundLayer;
  scrollY: number;
  offsetTop: number;
  intensity: number;
  isAnimated: boolean;
}

const BackgroundLayerRenderer: React.FC<BackgroundLayerRendererProps> =
  React.memo(({ layer, scrollY, offsetTop, intensity, isAnimated }) => {
    const relativeScroll = scrollY - offsetTop;
    const translateY = isAnimated ? relativeScroll * layer.speed * intensity : 0;

    return (
      <div
        className="absolute inset-0"
        style={{
          background: layer.background,
          zIndex: layer.zIndex ?? 0,
          opacity: layer.opacity ?? 1,
          transform: `translate3d(0, ${translateY}px, 0)`,
          willChange: isAnimated ? "transform" : "auto",
        }}
        aria-hidden="true"
      />
    );
  });

BackgroundLayerRenderer.displayName = "BackgroundLayerRenderer";

// ============================================================================
// Main Component
// ============================================================================

export const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  className,
  height = "auto",
  backgroundLayers: customBackgroundLayers,
  floatingElements: customFloatingElements,
  intensity = 1,
  disabled = false,
  style,
  contentClassName,
  debug = false,
  preset = "custom",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  // Determine if animations should be enabled
  const shouldAnimate = !disabled && !prefersReducedMotion && !isMobile;

  // Get scroll position only if animations are enabled
  const scrollY = useScrollPosition(shouldAnimate);

  // Track element visibility and position
  const { isVisible, offsetTop } = useElementVisibility(
    containerRef,
    shouldAnimate
  );

  // Determine which layers and elements to use
  const { backgroundLayers, floatingElements } = useMemo(() => {
    if (preset !== "custom" && presets[preset]) {
      return {
        backgroundLayers:
          customBackgroundLayers ?? presets[preset].backgroundLayers,
        floatingElements:
          customFloatingElements ?? presets[preset].floatingElements,
      };
    }
    return {
      backgroundLayers: customBackgroundLayers ?? [],
      floatingElements: customFloatingElements ?? [],
    };
  }, [preset, customBackgroundLayers, customFloatingElements]);

  // Only animate when visible for performance
  const isAnimated = shouldAnimate && isVisible;

  return (
    <>
      {/* CSS Keyframes for floating animation */}
      <style jsx global>{`
        @keyframes parallax-float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(-5px) translateX(-3px);
          }
          75% {
            transform: translateY(-15px) translateX(8px);
          }
        }
      `}</style>

      <section
        ref={containerRef}
        className={cn("relative overflow-hidden", className)}
        style={{
          height,
          ...style,
        }}
      >
        {/* Background Layers */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {backgroundLayers.map((layer) => (
            <BackgroundLayerRenderer
              key={layer.id}
              layer={layer}
              scrollY={scrollY}
              offsetTop={offsetTop}
              intensity={intensity}
              isAnimated={isAnimated}
            />
          ))}
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {floatingElements.map((element) => (
            <FloatingElementRenderer
              key={element.id}
              element={element}
              scrollY={scrollY}
              offsetTop={offsetTop}
              intensity={intensity}
              isAnimated={isAnimated}
              debug={debug}
            />
          ))}
        </div>

        {/* Content */}
        <div className={cn("relative z-10", contentClassName)}>{children}</div>

        {/* Debug overlay */}
        {debug && (
          <div className="absolute top-2 left-2 z-50 bg-black/80 text-white text-xs p-2 rounded font-mono">
            <div>scrollY: {scrollY.toFixed(0)}</div>
            <div>offsetTop: {offsetTop.toFixed(0)}</div>
            <div>isVisible: {isVisible ? "true" : "false"}</div>
            <div>isAnimated: {isAnimated ? "true" : "false"}</div>
            <div>isMobile: {isMobile ? "true" : "false"}</div>
            <div>reducedMotion: {prefersReducedMotion ? "true" : "false"}</div>
          </div>
        )}
      </section>
    </>
  );
};

// ============================================================================
// Specialized Variants
// ============================================================================

/**
 * Hero section with dramatic parallax effects
 */
export const ParallaxHero: React.FC<
  Omit<ParallaxSectionProps, "preset"> & { children: React.ReactNode }
> = (props) => <ParallaxSection {...props} preset="hero" />;

/**
 * Results section with subtle depth effects
 */
export const ParallaxResults: React.FC<
  Omit<ParallaxSectionProps, "preset"> & { children: React.ReactNode }
> = (props) => <ParallaxSection {...props} preset="results" />;

/**
 * Minimal parallax for content sections
 */
export const ParallaxMinimal: React.FC<
  Omit<ParallaxSectionProps, "preset"> & { children: React.ReactNode }
> = (props) => <ParallaxSection {...props} preset="minimal" />;

/**
 * Dramatic parallax for landing sections
 */
export const ParallaxDramatic: React.FC<
  Omit<ParallaxSectionProps, "preset"> & { children: React.ReactNode }
> = (props) => <ParallaxSection {...props} preset="dramatic" />;

export default ParallaxSection;

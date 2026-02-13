"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Configuration
// =============================================================================

export type CounterFormat = "currency" | "percentage" | "number" | "compact";
export type AnimationPreset = "smooth" | "bouncy" | "snappy" | "dramatic";

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const SPRING_PRESETS: Record<AnimationPreset, SpringConfig> = {
  smooth: { stiffness: 120, damping: 20, mass: 1 },
  bouncy: { stiffness: 200, damping: 12, mass: 0.8 },
  snappy: { stiffness: 300, damping: 25, mass: 0.6 },
  dramatic: { stiffness: 80, damping: 8, mass: 1.2 },
};

// Color transition presets
const COLOR_PRESETS = {
  default: {
    positive: "rgb(16, 185, 129)", // emerald-500
    negative: "rgb(239, 68, 68)", // red-500
    neutral: "inherit",
  },
  vibrant: {
    positive: "rgb(34, 211, 153)", // emerald-400
    negative: "rgb(248, 113, 113)", // red-400
    neutral: "inherit",
  },
  subtle: {
    positive: "rgb(52, 211, 153)", // emerald-400
    negative: "rgb(251, 146, 60)", // orange-400
    neutral: "inherit",
  },
};

export interface AnimatedCounterProps {
  /** The target value to animate to */
  value: number;
  /** Format type: currency ($), percentage (%), number, or compact (K/M/B) */
  format?: CounterFormat;
  /** Currency symbol for currency format */
  currencySymbol?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Animation preset */
  animation?: AnimationPreset;
  /** Custom spring configuration (overrides preset) */
  springConfig?: Partial<SpringConfig>;
  /** Duration hint in milliseconds (affects spring stiffness) */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Enable color transitions on value changes */
  colorTransition?: boolean;
  /** Color preset for transitions */
  colorPreset?: keyof typeof COLOR_PRESETS;
  /** Custom colors for transitions */
  colors?: {
    positive?: string;
    negative?: string;
    neutral?: string;
  };
  /** Enable highlight glow on significant changes */
  highlightOnChange?: boolean;
  /** Threshold for significant change (percentage) */
  significantThreshold?: number;
  /** Enable sound effects */
  enableSound?: boolean;
  /** Custom sound URLs */
  sounds?: {
    tick?: string;
    complete?: string;
    milestone?: string;
  };
  /** Sound volume (0-1) */
  soundVolume?: number;
  /** Prefix to display */
  prefix?: string;
  /** Suffix to display */
  suffix?: string;
  /** Always show sign (+/-) */
  showSign?: boolean;
  /** Enable digit rolling animation (odometer style) */
  odometerStyle?: boolean;
  /** Digit height for odometer (pixels) */
  digitHeight?: number;
  /** Stagger delay between digits (ms) */
  digitStagger?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Callback when significant change detected */
  onSignificantChange?: (direction: "up" | "down", magnitude: number) => void;
  /** ARIA label override */
  ariaLabel?: string;
  /** Enable reduced motion support */
  respectReducedMotion?: boolean;
}

// =============================================================================
// Sound Manager Hook
// =============================================================================

const useSoundManager = (
  enabled: boolean,
  volume: number,
  sounds?: AnimatedCounterProps["sounds"]
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!enabled || audioContextRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch {
      // Audio not supported
    }
  }, [enabled]);

  // Generate synthetic tick sound
  const playTick = useCallback(() => {
    if (!enabled || !audioContextRef.current) {
      initAudio();
      return;
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Create a short click/tick sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, [enabled, volume, initAudio]);

  // Play completion chime
  const playComplete = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Two-tone completion sound
    const frequencies = [523.25, 659.25]; // C5, E5
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);

      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  }, [enabled, volume]);

  // Play milestone celebration sound
  const playMilestone = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Triumphant three-note chord
    const frequencies = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime + i * 0.05);
      oscillator.stop(ctx.currentTime + 0.4);
    });
  }, [enabled, volume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playTick, playComplete, playMilestone, initAudio };
};

// =============================================================================
// Spring Physics Hook
// =============================================================================

const useSpringValue = (
  target: number,
  config: SpringConfig,
  onUpdate?: (value: number) => void
): number => {
  const [current, setCurrent] = useState(target);
  const velocityRef = useRef(0);
  const positionRef = useRef(target);
  const targetRef = useRef(target);
  const frameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const { stiffness, damping, mass } = config;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.064);
      lastTime = currentTime;

      const displacement = positionRef.current - targetRef.current;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * velocityRef.current;
      const acceleration = (springForce + dampingForce) / mass;

      velocityRef.current += acceleration * deltaTime;
      positionRef.current += velocityRef.current * deltaTime;

      // Check if settled
      const isSettled =
        Math.abs(displacement) < 0.5 &&
        Math.abs(velocityRef.current) < 0.5;

      if (isSettled) {
        positionRef.current = targetRef.current;
        velocityRef.current = 0;
        setCurrent(targetRef.current);
        onUpdate?.(targetRef.current);
      } else {
        setCurrent(positionRef.current);

        // Throttle onUpdate calls for performance
        if (currentTime - lastUpdateRef.current > 50) {
          onUpdate?.(positionRef.current);
          lastUpdateRef.current = currentTime;
        }

        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, config, onUpdate]);

  return current;
};

// =============================================================================
// Individual Odometer Digit Component
// =============================================================================

interface OdometerDigitProps {
  digit: string;
  index: number;
  totalDigits: number;
  digitHeight: number;
  stagger: number;
  springConfig: SpringConfig;
  isChanging: boolean;
}

const OdometerDigit = memo<OdometerDigitProps>(({
  digit,
  index,
  totalDigits,
  digitHeight,
  stagger,
  springConfig,
  isChanging,
}) => {
  const numericValue = digit === "," || digit === "." || digit === "-" || digit === "+" || digit === "$" || digit === "%" || digit === " "
    ? -1
    : parseInt(digit, 10);

  const [displayOffset, setDisplayOffset] = useState(0);
  const prevDigitRef = useRef(numericValue);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (numericValue === -1) return;

    const prevDigit = prevDigitRef.current;
    prevDigitRef.current = numericValue;

    if (prevDigit === -1 || prevDigit === numericValue) {
      setDisplayOffset(numericValue * digitHeight);
      return;
    }

    // Calculate shortest path (accounting for wrap-around)
    let diff = numericValue - prevDigit;
    if (Math.abs(diff) > 5) {
      // Wrap around for shorter animation
      diff = diff > 0 ? diff - 10 : diff + 10;
    }

    const startOffset = prevDigit * digitHeight;
    const endOffset = (prevDigit + diff) * digitHeight;
    const { stiffness, damping, mass } = springConfig;

    let velocity = 0;
    let position = startOffset;
    const targetPosition = numericValue * digitHeight;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const deltaTime = 0.016; // ~60fps

      const displacement = position - targetPosition;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * velocity;
      const acceleration = (springForce + dampingForce) / mass;

      velocity += acceleration * deltaTime;
      position += velocity * deltaTime;

      // Handle wrap-around for display
      let displayPosition = position;
      while (displayPosition < 0) displayPosition += 10 * digitHeight;
      while (displayPosition >= 10 * digitHeight) displayPosition -= 10 * digitHeight;

      setDisplayOffset(displayPosition);

      const isSettled = Math.abs(displacement) < 0.5 && Math.abs(velocity) < 5;

      if (!isSettled) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayOffset(targetPosition);
        startTimeRef.current = undefined;
      }
    };

    // Apply stagger delay based on digit position (from right)
    const delayMs = (totalDigits - index - 1) * stagger;
    const timeoutId = setTimeout(() => {
      startTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [numericValue, digitHeight, stagger, index, totalDigits, springConfig]);

  // Non-numeric characters (separators, symbols)
  if (numericValue === -1) {
    return (
      <span
        className="inline-flex items-center justify-center"
        style={{
          height: digitHeight,
          lineHeight: `${digitHeight}px`,
        }}
      >
        {digit}
      </span>
    );
  }

  // Numeric digit with rolling animation
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{
        height: digitHeight,
        width: "0.65em",
      }}
    >
      <span
        className="absolute left-0 flex flex-col transition-none"
        style={{
          transform: `translateY(-${displayOffset}px)`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => (
          <span
            key={i}
            className="flex items-center justify-center"
            style={{
              height: digitHeight,
              lineHeight: `${digitHeight}px`,
            }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
});

OdometerDigit.displayName = "OdometerDigit";

// =============================================================================
// Number Formatting Utilities
// =============================================================================

const formatNumber = (
  value: number,
  format: CounterFormat,
  decimals: number,
  currencySymbol: string,
  showSign: boolean
): string => {
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  let formatted: string;
  let prefix = "";
  let suffix = "";

  switch (format) {
    case "currency":
      prefix = currencySymbol;
      formatted = absValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      break;

    case "percentage":
      suffix = "%";
      formatted = absValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      break;

    case "compact":
      if (absValue >= 1e12) {
        formatted = (absValue / 1e12).toFixed(decimals);
        suffix = "T";
      } else if (absValue >= 1e9) {
        formatted = (absValue / 1e9).toFixed(decimals);
        suffix = "B";
      } else if (absValue >= 1e6) {
        formatted = (absValue / 1e6).toFixed(decimals);
        suffix = "M";
      } else if (absValue >= 1e3) {
        formatted = (absValue / 1e3).toFixed(decimals);
        suffix = "K";
      } else {
        formatted = absValue.toFixed(decimals);
      }
      break;

    case "number":
    default:
      formatted = absValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  }

  // Build sign
  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (showSign && value > 0) {
    sign = "+";
  }

  return `${prefix}${sign}${formatted}${suffix}`;
};

// =============================================================================
// Main AnimatedCounter Component
// =============================================================================

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  format = "number",
  currencySymbol = "$",
  decimals = 0,
  animation = "smooth",
  springConfig: customSpringConfig,
  duration,
  delay = 0,
  colorTransition = false,
  colorPreset = "default",
  colors: customColors,
  highlightOnChange = false,
  significantThreshold = 10,
  enableSound = false,
  sounds,
  soundVolume = 0.5,
  prefix = "",
  suffix = "",
  showSign = false,
  odometerStyle = true,
  digitHeight = 40,
  digitStagger = 30,
  className,
  onAnimationComplete,
  onSignificantChange,
  ariaLabel,
  respectReducedMotion = true,
}) => {
  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [changeDirection, setChangeDirection] = useState<"positive" | "negative" | "neutral">("neutral");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [colorOpacity, setColorOpacity] = useState(0);

  // Refs
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (!respectReducedMotion) return false;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [respectReducedMotion]);

  // Resolve spring config
  const springConfig: SpringConfig = useMemo(() => {
    const preset = SPRING_PRESETS[animation];
    const config = { ...preset, ...customSpringConfig };

    // Adjust stiffness based on duration hint if provided
    if (duration) {
      const factor = 1000 / duration;
      config.stiffness = config.stiffness * factor;
    }

    return config;
  }, [animation, customSpringConfig, duration]);

  // Sound effects
  const { playTick, playComplete, playMilestone, initAudio } = useSoundManager(
    enableSound,
    soundVolume,
    sounds
  );

  // Initialize audio on first user interaction
  useEffect(() => {
    if (enableSound) {
      const handleInteraction = () => {
        initAudio();
        window.removeEventListener("click", handleInteraction);
        window.removeEventListener("keydown", handleInteraction);
      };
      window.addEventListener("click", handleInteraction);
      window.addEventListener("keydown", handleInteraction);
      return () => {
        window.removeEventListener("click", handleInteraction);
        window.removeEventListener("keydown", handleInteraction);
      };
    }
  }, [enableSound, initAudio]);

  // Resolve colors
  const resolvedColors = useMemo(() => ({
    ...COLOR_PRESETS[colorPreset],
    ...customColors,
  }), [colorPreset, customColors]);

  // Spring animation for the actual value
  const animatedValue = useSpringValue(
    hasStarted ? value : prevValueRef.current,
    prefersReducedMotion ? { stiffness: 1000, damping: 100, mass: 0.1 } : springConfig,
    useCallback((v: number) => {
      // Play tick sound occasionally during animation
      if (enableSound && Math.random() < 0.1) {
        playTick();
      }
    }, [enableSound, playTick])
  );

  // Handle delay
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setHasStarted(true), delay);
      return () => clearTimeout(timer);
    } else {
      setHasStarted(true);
    }
  }, [delay]);

  // Detect value changes and trigger effects
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      return;
    }

    const prevValue = prevValueRef.current;
    const change = value - prevValue;
    const percentChange = prevValue !== 0
      ? Math.abs((change / prevValue) * 100)
      : Math.abs(change) > 0 ? 100 : 0;

    // Determine direction
    if (change > 0) {
      setChangeDirection("positive");
    } else if (change < 0) {
      setChangeDirection("negative");
    } else {
      setChangeDirection("neutral");
    }

    // Trigger color transition
    if (colorTransition && change !== 0) {
      setColorOpacity(1);
      const timer = setTimeout(() => setColorOpacity(0), 2000);
      return () => clearTimeout(timer);
    }

    // Check for significant change
    if (percentChange >= significantThreshold) {
      onSignificantChange?.(change > 0 ? "up" : "down", percentChange);

      if (highlightOnChange) {
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 800);
      }

      if (enableSound) {
        playMilestone();
      }
    }

    // Mark animation complete
    setIsAnimating(true);
    const completeTimer = setTimeout(() => {
      setIsAnimating(false);
      onAnimationComplete?.();
      if (enableSound && Math.abs(change) > 0) {
        playComplete();
      }
    }, (duration ?? 1000) + 200);

    prevValueRef.current = value;

    return () => clearTimeout(completeTimer);
  }, [
    value,
    colorTransition,
    highlightOnChange,
    significantThreshold,
    enableSound,
    duration,
    onAnimationComplete,
    onSignificantChange,
    playMilestone,
    playComplete,
  ]);

  // Format the current animated value
  const formattedValue = useMemo(
    () => formatNumber(animatedValue, format, decimals, currencySymbol, showSign),
    [animatedValue, format, decimals, currencySymbol, showSign]
  );

  // Determine current color
  const currentColor = useMemo(() => {
    if (!colorTransition || colorOpacity === 0) return resolvedColors.neutral;
    return changeDirection === "positive"
      ? resolvedColors.positive
      : changeDirection === "negative"
      ? resolvedColors.negative
      : resolvedColors.neutral;
  }, [colorTransition, colorOpacity, changeDirection, resolvedColors]);

  // Split into characters for odometer rendering
  const characters = useMemo(() => {
    const fullDisplay = `${prefix}${formattedValue}${suffix}`;
    return fullDisplay.split("");
  }, [prefix, formattedValue, suffix]);

  // Render odometer style
  if (odometerStyle && !prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "inline-flex items-center tabular-nums font-mono",
          isHighlighted && "animate-pulse",
          className
        )}
        style={{
          color: currentColor,
          transition: "color 0.5s ease-out",
          fontSize: digitHeight * 0.8,
          lineHeight: 1,
        }}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel ?? `Value: ${formattedValue}`}
      >
        {/* Highlight glow effect */}
        {isHighlighted && (
          <div
            className="absolute inset-0 -z-10 rounded-lg"
            style={{
              background: `radial-gradient(ellipse at center, ${
                changeDirection === "positive"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(239, 68, 68, 0.3)"
              } 0%, transparent 70%)`,
              animation: "pulse 0.8s ease-out",
            }}
          />
        )}

        {characters.map((char, index) => (
          <OdometerDigit
            key={`${index}-${char}`}
            digit={char}
            index={index}
            totalDigits={characters.length}
            digitHeight={digitHeight}
            stagger={digitStagger}
            springConfig={springConfig}
            isChanging={isAnimating}
          />
        ))}
      </div>
    );
  }

  // Render simple animated number (fallback / reduced motion)
  return (
    <span
      ref={containerRef}
      className={cn(
        "inline-block tabular-nums transition-transform",
        isHighlighted && "scale-110",
        className
      )}
      style={{
        color: currentColor,
        transition: "color 0.5s ease-out, transform 0.3s ease-out",
      }}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? `Value: ${formattedValue}`}
    >
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

// =============================================================================
// Preset Wrapper Components
// =============================================================================

export interface CurrencyCounterProps extends Omit<AnimatedCounterProps, "format"> {
  /** Show cents (2 decimal places) */
  showCents?: boolean;
  /** Currency symbol */
  currency?: string;
}

export const CurrencyCounter: React.FC<CurrencyCounterProps> = ({
  showCents = false,
  currency = "$",
  ...props
}) => (
  <AnimatedCounter
    format="currency"
    currencySymbol={currency}
    decimals={showCents ? 2 : 0}
    colorTransition={true}
    highlightOnChange={true}
    {...props}
  />
);

export interface PercentageCounterProps extends Omit<AnimatedCounterProps, "format"> {
  /** Number of decimal places */
  precision?: number;
}

export const PercentageCounter: React.FC<PercentageCounterProps> = ({
  precision = 1,
  ...props
}) => (
  <AnimatedCounter
    format="percentage"
    decimals={precision}
    colorTransition={true}
    {...props}
  />
);

export interface CompactCounterProps extends Omit<AnimatedCounterProps, "format"> {
  /** Show currency symbol */
  showCurrency?: boolean;
}

export const CompactCounter: React.FC<CompactCounterProps> = ({
  showCurrency = true,
  ...props
}) => (
  <AnimatedCounter
    format="compact"
    decimals={1}
    prefix={showCurrency ? "$" : ""}
    highlightOnChange={true}
    {...props}
  />
);

// =============================================================================
// Big Number Display Component
// =============================================================================

export interface BigNumberDisplayProps extends AnimatedCounterProps {
  /** Label displayed above the number */
  label?: string;
  /** Sublabel displayed below the number */
  sublabel?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show trend indicator */
  showTrend?: boolean;
  /** Previous value for trend calculation */
  previousValue?: number;
}

const SIZE_CONFIG = {
  sm: { digitHeight: 28, fontSize: "text-2xl", labelSize: "text-xs" },
  md: { digitHeight: 40, fontSize: "text-4xl", labelSize: "text-sm" },
  lg: { digitHeight: 56, fontSize: "text-5xl", labelSize: "text-base" },
  xl: { digitHeight: 72, fontSize: "text-6xl", labelSize: "text-lg" },
};

export const BigNumberDisplay: React.FC<BigNumberDisplayProps> = ({
  label,
  sublabel,
  size = "lg",
  showTrend = false,
  previousValue,
  className,
  ...props
}) => {
  const config = SIZE_CONFIG[size];

  const trendValue = useMemo(() => {
    if (!showTrend || previousValue === undefined || previousValue === 0) return null;
    const change = ((props.value - previousValue) / previousValue) * 100;
    return change;
  }, [showTrend, previousValue, props.value]);

  const trendDirection = trendValue !== null
    ? trendValue > 0 ? "up" : trendValue < 0 ? "down" : "neutral"
    : null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {label && (
        <span className={cn("text-muted-foreground font-medium", config.labelSize)}>
          {label}
        </span>
      )}

      <div className="flex items-center gap-3">
        <AnimatedCounter
          digitHeight={config.digitHeight}
          className={cn("font-bold", config.fontSize)}
          animation="dramatic"
          colorTransition={true}
          highlightOnChange={true}
          {...props}
        />

        {showTrend && trendValue !== null && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
              trendDirection === "up" && "bg-emerald-500/20 text-emerald-500",
              trendDirection === "down" && "bg-red-500/20 text-red-500",
              trendDirection === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {trendDirection === "up" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
            {trendDirection === "down" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span>{Math.abs(trendValue).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {sublabel && (
        <span className={cn("text-muted-foreground", config.labelSize)}>
          {sublabel}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Milestone Counter (plays celebration on milestones)
// =============================================================================

export interface MilestoneCounterProps extends AnimatedCounterProps {
  /** Milestone values to celebrate */
  milestones?: number[];
  /** Callback when milestone reached */
  onMilestone?: (milestone: number) => void;
}

export const MilestoneCounter: React.FC<MilestoneCounterProps> = ({
  milestones = [100000, 250000, 500000, 1000000],
  onMilestone,
  ...props
}) => {
  const prevValueRef = useRef(props.value);
  const celebratedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const prevValue = prevValueRef.current;
    const currentValue = props.value;

    // Check if any milestone was crossed
    milestones.forEach((milestone) => {
      if (
        !celebratedRef.current.has(milestone) &&
        prevValue < milestone &&
        currentValue >= milestone
      ) {
        celebratedRef.current.add(milestone);
        onMilestone?.(milestone);
      }
    });

    prevValueRef.current = currentValue;
  }, [props.value, milestones, onMilestone]);

  return (
    <AnimatedCounter
      enableSound={true}
      highlightOnChange={true}
      animation="dramatic"
      colorTransition={true}
      {...props}
    />
  );
};

export default AnimatedCounter;

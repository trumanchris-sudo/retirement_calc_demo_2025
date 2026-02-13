"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Typing speed presets with natural variation ranges
 */
const typingSpeedPresets = {
  /** Slow, deliberate typing for important messages */
  slow: { baseMs: 80, variationMs: 40 },
  /** Normal conversational typing speed */
  normal: { baseMs: 50, variationMs: 30 },
  /** Fast typing for quick messages */
  fast: { baseMs: 30, variationMs: 15 },
  /** Very fast, almost instant but still readable */
  rapid: { baseMs: 15, variationMs: 10 },
} as const;

type TypingSpeedPreset = keyof typeof typingSpeedPresets;

/**
 * Punctuation pause multipliers for natural feel
 */
const punctuationPauses: Record<string, number> = {
  ".": 6,  // Long pause for periods
  "!": 6,  // Long pause for exclamations
  "?": 6,  // Long pause for questions
  ",": 3,  // Medium pause for commas
  ";": 4,  // Slightly longer for semicolons
  ":": 3,  // Medium pause for colons
  "\n": 8, // Extra long pause for newlines
};

const typewriterVariants = cva("", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const cursorVariants = cva("inline-block ml-0.5", {
  variants: {
    style: {
      block: "w-2 h-[1.2em] bg-current",
      line: "w-0.5 h-[1.2em] bg-current",
      underscore: "w-2.5 h-0.5 bg-current translate-y-[0.3em]",
    },
  },
  defaultVariants: {
    style: "line",
  },
});

export interface TypewriterTextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof typewriterVariants> {
  /** The text content to animate */
  text: string;
  /** Typing speed preset or custom speed in ms */
  speed?: TypingSpeedPreset | number;
  /** Enable variation in typing speed for natural feel (default: true) */
  naturalVariation?: boolean;
  /** Pause on punctuation marks (default: true) */
  pauseOnPunctuation?: boolean;
  /** Show blinking cursor (default: true) */
  showCursor?: boolean;
  /** Cursor style */
  cursorStyle?: "block" | "line" | "underscore";
  /** Cursor blink speed in ms (default: 530) */
  cursorBlinkSpeed?: number;
  /** Enable typing sound effect (default: false) */
  soundEnabled?: boolean;
  /** Sound volume 0-1 (default: 0.3) */
  soundVolume?: number;
  /** Callback when typing starts */
  onStart?: () => void;
  /** Callback when typing completes */
  onComplete?: () => void;
  /** Callback for each character typed */
  onCharacter?: (char: string, index: number) => void;
  /** Delay before starting animation in ms (default: 0) */
  startDelay?: number;
  /** Allow clicking to skip animation (default: true) */
  skipOnClick?: boolean;
  /** Start animation immediately (default: true) */
  autoStart?: boolean;
  /** HTML element to render as */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * TypewriterText - Character-by-character text reveal with natural typing feel
 *
 * Features:
 * - Character-by-character reveal with blinking cursor
 * - Variable typing speed for natural feel
 * - Pause on punctuation marks
 * - Customizable cursor styles and blink animation
 * - Optional typing sound effects
 * - Click to skip animation
 * - Respects prefers-reduced-motion
 *
 * @example
 * // Basic usage
 * <TypewriterText text="Hello, I'm your AI assistant!" />
 *
 * @example
 * // With callbacks
 * <TypewriterText
 *   text="Welcome to your retirement planning journey."
 *   speed="slow"
 *   onComplete={() => setShowNextStep(true)}
 * />
 *
 * @example
 * // AI onboarding message style
 * <TypewriterText
 *   text="Let me analyze your financial situation..."
 *   speed="normal"
 *   cursorStyle="block"
 *   soundEnabled
 * />
 */
export function TypewriterText({
  text,
  className,
  size,
  speed = "normal",
  naturalVariation = true,
  pauseOnPunctuation = true,
  showCursor = true,
  cursorStyle = "line",
  cursorBlinkSpeed = 530,
  soundEnabled = false,
  soundVolume = 0.3,
  onStart,
  onComplete,
  onCharacter,
  startDelay = 0,
  skipOnClick = true,
  autoStart = true,
  as: Component = "span",
  ...props
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [cursorVisible, setCursorVisible] = React.useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const charIndexRef = React.useRef(0);
  const hasStartedRef = React.useRef(false);

  // Get typing speed configuration
  const getSpeedConfig = React.useCallback(() => {
    if (typeof speed === "number") {
      return { baseMs: speed, variationMs: naturalVariation ? speed * 0.5 : 0 };
    }
    const preset = typingSpeedPresets[speed];
    return {
      baseMs: preset.baseMs,
      variationMs: naturalVariation ? preset.variationMs : 0,
    };
  }, [speed, naturalVariation]);

  // Calculate delay for a character
  const getCharDelay = React.useCallback(
    (char: string) => {
      const { baseMs, variationMs } = getSpeedConfig();
      let delay = baseMs;

      // Add random variation for natural feel
      if (variationMs > 0) {
        delay += (Math.random() - 0.5) * 2 * variationMs;
      }

      // Add pause for punctuation
      if (pauseOnPunctuation && punctuationPauses[char]) {
        delay *= punctuationPauses[char];
      }

      return Math.max(delay, 10); // Minimum 10ms
    },
    [getSpeedConfig, pauseOnPunctuation]
  );

  // Play typing sound
  const playTypingSound = React.useCallback(() => {
    if (!soundEnabled || prefersReducedMotion) return;

    try {
      // Create audio context lazily
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Typewriter-like click sound
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);

      // Quick attack and decay
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(soundVolume * 0.1, ctx.currentTime + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.02);
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled, soundVolume, prefersReducedMotion]);

  // Type next character
  const typeNextChar = React.useCallback(() => {
    if (charIndexRef.current >= text.length) {
      setIsTyping(false);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const char = text[charIndexRef.current];
    setDisplayedText(text.slice(0, charIndexRef.current + 1));
    onCharacter?.(char, charIndexRef.current);
    playTypingSound();

    charIndexRef.current++;

    const delay = getCharDelay(char);
    timeoutRef.current = setTimeout(typeNextChar, delay);
  }, [text, getCharDelay, onCharacter, onComplete, playTypingSound]);

  // Start typing animation
  const startTyping = React.useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setIsTyping(true);
    onStart?.();

    if (startDelay > 0) {
      timeoutRef.current = setTimeout(typeNextChar, startDelay);
    } else {
      typeNextChar();
    }
  }, [startDelay, typeNextChar, onStart]);

  // Skip to end
  const skipAnimation = React.useCallback(() => {
    if (!skipOnClick || isComplete) return;

    // Clear pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
    charIndexRef.current = text.length;
    onComplete?.();
  }, [skipOnClick, isComplete, text, onComplete]);

  // Check for reduced motion preference
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Handle reduced motion - skip animation entirely
  React.useEffect(() => {
    if (prefersReducedMotion && autoStart) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
    }
  }, [prefersReducedMotion, autoStart, text, onComplete]);

  // Auto-start animation
  React.useEffect(() => {
    if (autoStart && !prefersReducedMotion) {
      startTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoStart, prefersReducedMotion, startTyping]);

  // Reset when text changes
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText("");
    setIsTyping(false);
    setIsComplete(false);
    charIndexRef.current = 0;
    hasStartedRef.current = false;

    if (autoStart && !prefersReducedMotion) {
      startTyping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Cursor blink animation
  React.useEffect(() => {
    if (!showCursor) return;

    cursorIntervalRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, cursorBlinkSpeed);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [showCursor, cursorBlinkSpeed]);

  // Cleanup audio context on unmount
  React.useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Component
      className={cn(
        typewriterVariants({ size }),
        skipOnClick && !isComplete && "cursor-pointer",
        className
      )}
      onClick={skipAnimation}
      role="text"
      aria-label={text}
      aria-live={isTyping ? "polite" : "off"}
      {...props}
    >
      {displayedText}
      {showCursor && !isComplete && (
        <span
          className={cn(
            cursorVariants({ style: cursorStyle }),
            "transition-opacity duration-100",
            cursorVisible ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
      )}
    </Component>
  );
}

/**
 * Hook for programmatic typewriter control
 */
export function useTypewriter({
  text,
  speed = "normal",
  naturalVariation = true,
  pauseOnPunctuation = true,
  startDelay = 0,
  autoStart = true,
}: Pick<
  TypewriterTextProps,
  | "text"
  | "speed"
  | "naturalVariation"
  | "pauseOnPunctuation"
  | "startDelay"
  | "autoStart"
>) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = React.useRef(0);

  const getSpeedConfig = React.useCallback(() => {
    if (typeof speed === "number") {
      return { baseMs: speed, variationMs: naturalVariation ? speed * 0.5 : 0 };
    }
    const preset = typingSpeedPresets[speed];
    return {
      baseMs: preset.baseMs,
      variationMs: naturalVariation ? preset.variationMs : 0,
    };
  }, [speed, naturalVariation]);

  const getCharDelay = React.useCallback(
    (char: string) => {
      const { baseMs, variationMs } = getSpeedConfig();
      let delay = baseMs;

      if (variationMs > 0) {
        delay += (Math.random() - 0.5) * 2 * variationMs;
      }

      if (pauseOnPunctuation && punctuationPauses[char]) {
        delay *= punctuationPauses[char];
      }

      return Math.max(delay, 10);
    },
    [getSpeedConfig, pauseOnPunctuation]
  );

  const typeNextChar = React.useCallback(() => {
    if (charIndexRef.current >= text.length) {
      setIsTyping(false);
      setIsComplete(true);
      return;
    }

    const char = text[charIndexRef.current];
    setDisplayedText(text.slice(0, charIndexRef.current + 1));
    charIndexRef.current++;

    const delay = getCharDelay(char);
    timeoutRef.current = setTimeout(typeNextChar, delay);
  }, [text, getCharDelay]);

  const start = React.useCallback(() => {
    setIsTyping(true);
    if (startDelay > 0) {
      timeoutRef.current = setTimeout(typeNextChar, startDelay);
    } else {
      typeNextChar();
    }
  }, [startDelay, typeNextChar]);

  const skip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
    charIndexRef.current = text.length;
  }, [text]);

  const reset = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText("");
    setIsTyping(false);
    setIsComplete(false);
    charIndexRef.current = 0;
  }, []);

  React.useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoStart, start]);

  return {
    displayedText,
    isTyping,
    isComplete,
    start,
    skip,
    reset,
    progress: text.length > 0 ? charIndexRef.current / text.length : 0,
  };
}

/**
 * Convenience component for AI onboarding messages
 */
export function AITypewriterMessage({
  className,
  ...props
}: Omit<TypewriterTextProps, "speed" | "cursorStyle">) {
  return (
    <TypewriterText
      speed="normal"
      cursorStyle="block"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Convenience component for educational content
 */
export function EducationalTypewriter({
  className,
  ...props
}: Omit<TypewriterTextProps, "speed" | "pauseOnPunctuation">) {
  return (
    <TypewriterText
      speed="slow"
      pauseOnPunctuation
      className={cn("leading-relaxed", className)}
      {...props}
    />
  );
}

export { typingSpeedPresets, punctuationPauses };
export type { TypingSpeedPreset };

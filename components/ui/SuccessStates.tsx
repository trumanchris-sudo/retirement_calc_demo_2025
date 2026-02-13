"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Trophy,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

// Dynamic import for framer-motion to avoid SSR issues
// Type-safe dynamic imports: next/dynamic loses framer-motion prop types,
// so we import the types and cast the dynamic components appropriately.
type MotionDivComponent = typeof import("framer-motion").motion.div;
type MotionPathComponent = typeof import("framer-motion").motion.path;
type MotionCircleComponent = typeof import("framer-motion").motion.circle;

const MotionDiv = dynamic(
  () => import("framer-motion").then((m) => m.motion.div),
  { ssr: false }
) as unknown as MotionDivComponent;

const MotionPath = dynamic(
  () => import("framer-motion").then((m) => m.motion.path),
  { ssr: false }
) as unknown as MotionPathComponent;

const MotionCircle = dynamic(
  () => import("framer-motion").then((m) => m.motion.circle),
  { ssr: false }
) as unknown as MotionCircleComponent;

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SuccessTrigger = "calculation_complete" | "goal_achieved" | "milestone_reached";

export interface SuccessStateConfig {
  trigger: SuccessTrigger;
  title?: string;
  subtitle?: string;
  metric?: {
    label: string;
    value: string | number;
    prefix?: string;
    suffix?: string;
  };
  celebrationLevel?: "low" | "medium" | "high" | "epic";
  nextSteps?: NextStep[];
  shareData?: ShareData;
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export interface NextStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export interface ShareData {
  title: string;
  description: string;
  url?: string;
  hashtags?: string[];
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  shape: "square" | "circle" | "triangle" | "star";
  opacity: number;
}

interface CelebrationParticle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  decay: number;
  life: number;
}

// ============================================================================
// Constants
// ============================================================================

const CONFETTI_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#FFD700", // gold
  "#f97316", // orange-500
];

const CELEBRATION_CONFIGS = {
  low: { confettiCount: 30, particleCount: 20, duration: 2000 },
  medium: { confettiCount: 60, particleCount: 40, duration: 3000 },
  high: { confettiCount: 100, particleCount: 60, duration: 4000 },
  epic: { confettiCount: 150, particleCount: 100, duration: 5000 },
};

const TRIGGER_DEFAULTS: Record<SuccessTrigger, { title: string; subtitle: string; level: "low" | "medium" | "high" | "epic" }> = {
  calculation_complete: {
    title: "Calculation Complete!",
    subtitle: "Your retirement plan is ready",
    level: "medium",
  },
  goal_achieved: {
    title: "Goal Achieved!",
    subtitle: "You did it! Congratulations!",
    level: "high",
  },
  milestone_reached: {
    title: "Milestone Reached!",
    subtitle: "Another step toward your goals",
    level: "epic",
  },
};

// ============================================================================
// Animated Checkmark Component
// ============================================================================

interface AnimatedCheckmarkProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  onComplete?: () => void;
  delay?: number;
}

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  size = 120,
  strokeWidth = 4,
  color = "currentColor",
  className,
  onComplete,
  delay = 0,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const circleRef = useRef<SVGCircleElement>(null);
  const checkRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (isAnimating && onComplete) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, onComplete]);

  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Checkmark path - adjusted for the circle size
  const checkmarkScale = size / 120;
  const checkmarkPath = `M ${30 * checkmarkScale} ${60 * checkmarkScale} L ${52 * checkmarkScale} ${82 * checkmarkScale} L ${90 * checkmarkScale} ${40 * checkmarkScale}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      aria-label="Success checkmark"
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-emerald-100 dark:text-emerald-900"
      />

      {/* Animated circle */}
      <MotionCircle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={isAnimating ? 0 : circumference}
        initial={{ strokeDashoffset: circumference, rotate: -90 }}
        animate={
          isAnimating
            ? { strokeDashoffset: 0, rotate: -90 }
            : { strokeDashoffset: circumference, rotate: -90 }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: "center" }}
        className="text-emerald-500"
      />

      {/* Animated checkmark */}
      <MotionPath
        d={checkmarkPath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={isAnimating ? 0 : 1}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isAnimating
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
        className="text-emerald-500"
      />

      {/* Glow effect */}
      {isAnimating && (
        <MotionCircle
          cx={center}
          cy={center}
          r={radius + 10}
          fill="none"
          stroke={color}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.9, 1.1, 1.2] }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-emerald-400"
        />
      )}

      <style jsx>{`
        @keyframes checkmark-glow {
          0% {
            filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.6));
          }
          100% {
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.3));
          }
        }
      `}</style>
    </svg>
  );
};

// ============================================================================
// Confetti Burst Component
// ============================================================================

interface ConfettiBurstProps {
  active: boolean;
  count?: number;
  duration?: number;
  spread?: number;
  origin?: { x: number; y: number };
  onComplete?: () => void;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  active,
  count = 100,
  duration = 3000,
  spread = 360,
  origin = { x: 50, y: 50 },
  onComplete,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const generateShape = (): "square" | "circle" | "triangle" | "star" => {
    const shapes: Array<"square" | "circle" | "triangle" | "star"> = [
      "square",
      "circle",
      "triangle",
      "star",
    ];
    return shapes[Math.floor(Math.random() * shapes.length)];
  };

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const angleStep = spread / count;
    const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => {
      const baseAngle = (spread / 2) - (i * angleStep) - 90;
      const angleVariation = (Math.random() - 0.5) * 30;
      const angle = ((baseAngle + angleVariation) * Math.PI) / 180;

      return {
        id: i,
        x: origin.x,
        y: origin.y,
        rotation: Math.random() * 360,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 10,
        velocityX: Math.cos(angle) * (8 + Math.random() * 12),
        velocityY: Math.sin(angle) * (8 + Math.random() * 12),
        shape: generateShape(),
        opacity: 1,
      };
    });

    setPieces(newPieces);
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = elapsed / duration;

      if (progress >= 1) {
        setPieces([]);
        onComplete?.();
        return;
      }

      setPieces((prev) =>
        prev.map((piece) => ({
          ...piece,
          x: piece.x + piece.velocityX * 0.5,
          y: piece.y + piece.velocityY * 0.5,
          rotation: piece.rotation + (piece.velocityX > 0 ? 5 : -5),
          velocityY: piece.velocityY + 0.4, // gravity
          velocityX: piece.velocityX * 0.99, // air resistance
          opacity: Math.max(0, 1 - progress * 1.2),
        }))
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, count, duration, spread, origin, onComplete]);

  if (!active || pieces.length === 0) return null;

  const renderShape = (piece: ConfettiPiece) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${piece.x}%`,
      top: `${piece.y}%`,
      transform: `rotate(${piece.rotation}deg)`,
      opacity: piece.opacity,
      pointerEvents: "none",
    };

    switch (piece.shape) {
      case "circle":
        return (
          <div
            key={piece.id}
            style={{
              ...style,
              width: piece.size,
              height: piece.size,
              borderRadius: "50%",
              backgroundColor: piece.color,
            }}
          />
        );
      case "triangle":
        return (
          <div
            key={piece.id}
            style={{
              ...style,
              width: 0,
              height: 0,
              borderLeft: `${piece.size / 2}px solid transparent`,
              borderRight: `${piece.size / 2}px solid transparent`,
              borderBottom: `${piece.size}px solid ${piece.color}`,
              backgroundColor: "transparent",
            }}
          />
        );
      case "star":
        return (
          <svg
            key={piece.id}
            style={{ ...style, width: piece.size, height: piece.size }}
            viewBox="0 0 24 24"
          >
            <polygon
              points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
              fill={piece.color}
            />
          </svg>
        );
      default: // square
        return (
          <div
            key={piece.id}
            style={{
              ...style,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
            }}
          />
        );
    }
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map(renderShape)}
    </div>
  );
};

// ============================================================================
// Celebration Particles Component
// ============================================================================

interface CelebrationParticlesProps {
  active: boolean;
  count?: number;
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

export const CelebrationParticles: React.FC<CelebrationParticlesProps> = ({
  active,
  count = 60,
  duration = 3000,
  colors = CONFETTI_COLORS,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<CelebrationParticle[]>([]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Initialize particles from center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: centerX,
      y: centerY,
      angle: (Math.random() * Math.PI * 2),
      speed: 2 + Math.random() * 8,
      size: 3 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      decay: 0.015 + Math.random() * 0.02,
      life: 1,
    }));

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.speed *= 0.98;
        p.life -= p.decay;

        if (p.life <= 0) return false;

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // Draw sparkle trail
        ctx.save();
        ctx.globalAlpha = p.life * 0.3;
        ctx.beginPath();
        ctx.arc(
          p.x - Math.cos(p.angle) * p.size * 2,
          p.y - Math.sin(p.angle) * p.size * 2,
          p.size * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, count, duration, colors, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99]"
      aria-hidden="true"
    />
  );
};

// ============================================================================
// Typography Animation Component ("You did it!")
// ============================================================================

interface AnimatedTypographyProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: "bounce" | "typewriter" | "wave" | "scale" | "glow";
}

export const AnimatedTypography: React.FC<AnimatedTypographyProps> = ({
  text,
  className,
  delay = 0,
  duration = 0.6,
  variant = "bounce",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const letters = text.split("");

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) return null;

  const getLetterAnimation = (index: number) => {
    const letterDelay = index * 0.05;

    switch (variant) {
      case "typewriter":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.1, delay: letterDelay },
        };
      case "wave":
        return {
          initial: { y: 0 },
          animate: { y: [0, -20, 0] },
          transition: {
            duration: 0.5,
            delay: letterDelay,
            repeat: Infinity,
            repeatDelay: letters.length * 0.05,
          },
        };
      case "scale":
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: {
            type: "spring" as const,
            stiffness: 500,
            damping: 15,
            delay: letterDelay,
          },
        };
      case "glow":
        return {
          initial: { opacity: 0, textShadow: "0 0 0 transparent" },
          animate: {
            opacity: 1,
            textShadow: [
              "0 0 0 transparent",
              "0 0 20px rgba(16, 185, 129, 0.8)",
              "0 0 10px rgba(16, 185, 129, 0.5)",
            ],
          },
          transition: { duration: 0.4, delay: letterDelay },
        };
      case "bounce":
      default:
        return {
          initial: { y: 50, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: {
            type: "spring" as const,
            stiffness: 400,
            damping: 20,
            delay: letterDelay,
          },
        };
    }
  };

  return (
    <span className={cn("inline-flex", className)} aria-label={text}>
      {letters.map((letter, index) => (
        <MotionDiv
          key={`${letter}-${index}`}
          className="inline-block"
          style={{ whiteSpace: letter === " " ? "pre" : "normal" }}
          {...getLetterAnimation(index)}
        >
          {letter === " " ? "\u00A0" : letter}
        </MotionDiv>
      ))}
    </span>
  );
};

// ============================================================================
// Share Achievement Buttons Component
// ============================================================================

interface ShareAchievementButtonsProps {
  shareData: ShareData;
  className?: string;
  onShare?: (platform: string) => void;
}

export const ShareAchievementButtons: React.FC<ShareAchievementButtonsProps> = ({
  shareData,
  className,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    return shareData.url || (typeof window !== "undefined" ? window.location.href : "");
  };

  const generateShareText = () => {
    let text = `${shareData.title} - ${shareData.description}`;
    if (shareData.hashtags && shareData.hashtags.length > 0) {
      text += `\n\n${shareData.hashtags.map((h) => `#${h}`).join(" ")}`;
    }
    return text;
  };

  const handleShare = async (platform: string) => {
    const url = getShareUrl();
    const text = generateShareText();
    let shareLink = "";

    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          text
        )}&url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          url
        )}&summary=${encodeURIComponent(text)}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}&quote=${encodeURIComponent(text)}`;
        break;
      case "copy":
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
        }
        onShare?.(platform);
        return;
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareData.title,
              text: shareData.description,
              url,
            });
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              console.error("Share failed:", err);
            }
          }
        }
        onShare?.(platform);
        return;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "width=600,height=400");
    }
    onShare?.(platform);
  };

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {/* Native share (mobile) */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button
          variant="default"
          size="sm"
          onClick={() => handleShare("native")}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      )}

      {/* Social platforms */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("twitter")}
        className="gap-2 hover:bg-black hover:text-white hover:border-black"
      >
        <Twitter className="h-4 w-4" />
        <span className="hidden sm:inline">Twitter</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("linkedin")}
        className="gap-2 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
      >
        <Linkedin className="h-4 w-4" />
        <span className="hidden sm:inline">LinkedIn</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("facebook")}
        className="gap-2 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]"
      >
        <Facebook className="h-4 w-4" />
        <span className="hidden sm:inline">Facebook</span>
      </Button>

      {/* Copy link */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("copy")}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy</span>
          </>
        )}
      </Button>
    </div>
  );
};

// ============================================================================
// Next Steps CTA Component
// ============================================================================

interface NextStepsCTAProps {
  steps: NextStep[];
  className?: string;
}

export const NextStepsCTA: React.FC<NextStepsCTAProps> = ({ steps, className }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-muted-foreground text-center">
        What would you like to do next?
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {steps.map((step, index) => (
          <MotionDiv
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.5 }}
          >
            <Button
              variant={step.variant === "primary" ? "default" : step.variant === "ghost" ? "ghost" : "outline"}
              onClick={step.action}
              className={cn(
                "gap-2",
                step.variant === "primary" &&
                  "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              )}
            >
              {step.icon}
              <span>{step.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </MotionDiv>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Sound Effects Helper
// ============================================================================

const playSuccessSound = (level: "low" | "medium" | "high" | "epic") => {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    // Base tones
    const frequencies = {
      low: [523.25, 659.25], // C5, E5
      medium: [523.25, 659.25, 783.99], // C5, E5, G5
      high: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
      epic: [523.25, 659.25, 783.99, 1046.5, 1318.51], // C5, E5, G5, C6, E6
    };

    const tones = frequencies[level];

    tones.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + i * 0.1 + 0.3
      );

      oscillator.start(audioContext.currentTime + i * 0.1);
      oscillator.stop(audioContext.currentTime + i * 0.1 + 0.3);
    });

    // Sparkle effect for higher levels
    if (level === "high" || level === "epic") {
      setTimeout(() => {
        const sparkleOsc = audioContext.createOscillator();
        const sparkleGain = audioContext.createGain();
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(audioContext.destination);
        sparkleOsc.frequency.setValueAtTime(2093.0, audioContext.currentTime); // C7
        sparkleOsc.type = "sine";
        sparkleGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        sparkleOsc.start(audioContext.currentTime);
        sparkleOsc.stop(audioContext.currentTime + 0.15);
      }, tones.length * 100 + 50);
    }
  } catch {
    // Audio not supported
  }
};

// ============================================================================
// Main Success State Modal Component
// ============================================================================

interface SuccessStateModalProps {
  config: SuccessStateConfig | null;
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export const SuccessStateModal: React.FC<SuccessStateModalProps> = ({
  config,
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [checkmarkComplete, setCheckmarkComplete] = useState(false);
  const hasPlayedSound = useRef(false);

  const defaults = config ? TRIGGER_DEFAULTS[config.trigger] : null;
  const celebrationLevel = config?.celebrationLevel || defaults?.level || "medium";
  const celebrationConfig = CELEBRATION_CONFIGS[celebrationLevel];

  useEffect(() => {
    if (isOpen && config) {
      // Reset states
      setShowConfetti(true);
      setShowParticles(true);
      setCheckmarkComplete(false);
      hasPlayedSound.current = false;

      // Play sound
      if (soundEnabled && !hasPlayedSound.current) {
        playSuccessSound(celebrationLevel);
        hasPlayedSound.current = true;
      }

      // Auto-hide if configured
      if (config.autoHide) {
        const timer = setTimeout(
          () => {
            onClose();
            config.onComplete?.();
          },
          config.autoHideDelay || celebrationConfig.duration + 2000
        );
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, config, soundEnabled, celebrationLevel, celebrationConfig.duration, onClose]);

  if (!isOpen || !config) return null;

  const title = config.title || defaults?.title || "Success!";
  const subtitle = config.subtitle || defaults?.subtitle || "";

  return (
    <>
      {/* Confetti and particles */}
      <ConfettiBurst
        active={showConfetti}
        count={celebrationConfig.confettiCount}
        duration={celebrationConfig.duration}
        onComplete={() => setShowConfetti(false)}
      />
      <CelebrationParticles
        active={showParticles}
        count={celebrationConfig.particleCount}
        duration={celebrationConfig.duration}
        onComplete={() => setShowParticles(false)}
      />

      {/* Modal backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <MotionDiv
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal content */}
        <MotionDiv
          className="relative z-10 w-full max-w-md mx-4"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Card className="overflow-hidden border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>

            {/* Gradient header */}
            <div className="relative h-32 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>

              {/* Checkmark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatedCheckmark
                  size={80}
                  strokeWidth={5}
                  color="white"
                  delay={200}
                  onComplete={() => setCheckmarkComplete(true)}
                />
              </div>

              {/* Decorative sparkles */}
              <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/60 animate-pulse" />
              <Sparkles className="absolute bottom-4 right-4 w-6 h-6 text-white/60 animate-pulse" />
            </div>

            <CardContent className="p-6 text-center space-y-6">
              {/* Title with animation */}
              <div className="space-y-2">
                <AnimatedTypography
                  text={title}
                  className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent justify-center"
                  variant="bounce"
                  delay={600}
                />
                {subtitle && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <p className="text-muted-foreground">{subtitle}</p>
                  </MotionDiv>
                )}
              </div>

              {/* Metric display */}
              {config.metric && (
                <MotionDiv
                  className="py-4 px-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {config.metric.label}
                  </p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {config.metric.prefix}
                    {typeof config.metric.value === "number"
                      ? fmt(config.metric.value)
                      : config.metric.value}
                    {config.metric.suffix}
                  </p>
                </MotionDiv>
              )}

              {/* Share buttons */}
              {config.shareData && (
                <MotionDiv
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <ShareAchievementButtons shareData={config.shareData} />
                </MotionDiv>
              )}

              {/* Next steps */}
              {config.nextSteps && config.nextSteps.length > 0 && (
                <MotionDiv
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  className="pt-4 border-t"
                >
                  <NextStepsCTA steps={config.nextSteps} />
                </MotionDiv>
              )}

              {/* Continue button (if no next steps) */}
              {(!config.nextSteps || config.nextSteps.length === 0) && (
                <MotionDiv
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                >
                  <Button
                    onClick={() => {
                      onClose();
                      config.onComplete?.();
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    Continue
                  </Button>
                </MotionDiv>
              )}
            </CardContent>
          </Card>
        </MotionDiv>
      </div>
    </>
  );
};

// ============================================================================
// Inline Success State Component (non-modal)
// ============================================================================

interface SuccessStateInlineProps {
  config: SuccessStateConfig;
  className?: string;
  soundEnabled?: boolean;
}

export const SuccessStateInline: React.FC<SuccessStateInlineProps> = ({
  config,
  className,
  soundEnabled = true,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayedSound = useRef(false);

  const defaults = TRIGGER_DEFAULTS[config.trigger];
  const celebrationLevel = config.celebrationLevel || defaults.level;
  const celebrationConfig = CELEBRATION_CONFIGS[celebrationLevel];

  useEffect(() => {
    setShowConfetti(true);
    setShowParticles(true);

    if (soundEnabled && !hasPlayedSound.current) {
      playSuccessSound(celebrationLevel);
      hasPlayedSound.current = true;
    }
  }, [soundEnabled, celebrationLevel]);

  const title = config.title || defaults.title;
  const subtitle = config.subtitle || defaults.subtitle;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Confetti relative to container */}
      <ConfettiBurst
        active={showConfetti}
        count={Math.floor(celebrationConfig.confettiCount / 2)}
        duration={celebrationConfig.duration}
        origin={{ x: 50, y: 30 }}
        onComplete={() => setShowConfetti(false)}
      />

      <Card className="overflow-hidden border-2 border-emerald-500/30">
        <div className="relative h-24 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
          <AnimatedCheckmark
            size={60}
            strokeWidth={4}
            color="white"
            delay={100}
          />
        </div>

        <CardContent className="p-6 text-center space-y-4">
          <div className="space-y-1">
            <AnimatedTypography
              text={title}
              className="text-xl font-bold text-emerald-600 dark:text-emerald-400 justify-center"
              variant="bounce"
              delay={400}
            />
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {config.metric && (
            <div className="py-3 px-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-muted-foreground">{config.metric.label}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {config.metric.prefix}
                {typeof config.metric.value === "number"
                  ? fmt(config.metric.value)
                  : config.metric.value}
                {config.metric.suffix}
              </p>
            </div>
          )}

          {config.shareData && (
            <ShareAchievementButtons shareData={config.shareData} />
          )}

          {config.nextSteps && config.nextSteps.length > 0 && (
            <NextStepsCTA steps={config.nextSteps} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Success State Context & Hook
// ============================================================================

interface SuccessStateContextValue {
  show: (config: SuccessStateConfig) => void;
  hide: () => void;
  isVisible: boolean;
}

const SuccessStateContext = createContext<SuccessStateContextValue | null>(null);

export const SuccessStateProvider: React.FC<{
  children: React.ReactNode;
  soundEnabled?: boolean;
}> = ({ children, soundEnabled = true }) => {
  const [config, setConfig] = useState<SuccessStateConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback((newConfig: SuccessStateConfig) => {
    setConfig(newConfig);
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setConfig(null);
  }, []);

  return (
    <SuccessStateContext.Provider value={{ show, hide, isVisible }}>
      {children}
      <SuccessStateModal
        config={config}
        isOpen={isVisible}
        onClose={hide}
        soundEnabled={soundEnabled}
      />
    </SuccessStateContext.Provider>
  );
};

export const useSuccessState = (): SuccessStateContextValue => {
  const context = useContext(SuccessStateContext);
  if (!context) {
    throw new Error("useSuccessState must be used within a SuccessStateProvider");
  }
  return context;
};

// ============================================================================
// Quick Trigger Functions
// ============================================================================

export const createCalculationCompleteConfig = (
  metric?: { label: string; value: number },
  nextSteps?: NextStep[]
): SuccessStateConfig => ({
  trigger: "calculation_complete",
  title: "Calculation Complete!",
  subtitle: "Your retirement projection is ready",
  celebrationLevel: "medium",
  metric: metric
    ? {
        label: metric.label,
        value: metric.value,
        prefix: "",
        suffix: "",
      }
    : undefined,
  nextSteps: nextSteps || [
    {
      id: "view-results",
      label: "View Results",
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => {},
      variant: "primary",
    },
  ],
  shareData: {
    title: "Retirement Calculation Complete",
    description: "I just completed my retirement projection!",
    hashtags: ["RetirementPlanning", "FinancialPlanning"],
  },
});

export const createGoalAchievedConfig = (
  goalName: string,
  value?: number,
  nextSteps?: NextStep[]
): SuccessStateConfig => ({
  trigger: "goal_achieved",
  title: "Goal Achieved!",
  subtitle: `You reached your ${goalName} goal`,
  celebrationLevel: "high",
  metric: value
    ? {
        label: goalName,
        value,
        prefix: "",
        suffix: "",
      }
    : undefined,
  nextSteps: nextSteps || [
    {
      id: "set-new-goal",
      label: "Set New Goal",
      icon: <Target className="w-4 h-4" />,
      action: () => {},
      variant: "primary",
    },
  ],
  shareData: {
    title: `Goal Achieved: ${goalName}`,
    description: `I just achieved my ${goalName} goal!`,
    hashtags: ["GoalAchieved", "FinancialMilestone"],
  },
});

export const createMilestoneReachedConfig = (
  milestoneName: string,
  value?: number,
  nextSteps?: NextStep[]
): SuccessStateConfig => ({
  trigger: "milestone_reached",
  title: "Milestone Reached!",
  subtitle: `You've reached ${milestoneName}`,
  celebrationLevel: "epic",
  metric: value
    ? {
        label: milestoneName,
        value,
        prefix: "",
        suffix: "",
      }
    : undefined,
  nextSteps: nextSteps || [
    {
      id: "view-milestones",
      label: "View All Milestones",
      icon: <Trophy className="w-4 h-4" />,
      action: () => {},
      variant: "primary",
    },
  ],
  shareData: {
    title: `Milestone: ${milestoneName}`,
    description: `I just reached the ${milestoneName} milestone!`,
    hashtags: ["Milestone", "FinancialFreedom", "FIRE"],
  },
});

// ============================================================================
// Default Export
// ============================================================================

export default SuccessStateModal;

"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";

// ==================== Types ====================

export type ConfettiTrigger =
  | "portfolio_million"
  | "monte_carlo_success"
  | "onboarding_complete"
  | "estate_milestone"
  | "custom";

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "square" | "rectangle" | "circle";
}

export interface ConfettiConfig {
  // Number of particles to spawn
  particleCount?: number;
  // Duration in milliseconds before fadeout begins
  duration?: number;
  // Spread angle in degrees (how wide the burst is)
  spread?: number;
  // Starting Y position (0 = top, 1 = bottom)
  startY?: number;
  // Initial velocity range
  velocity?: { min: number; max: number };
  // Gravity strength
  gravity?: number;
  // Color palette (array of hex colors)
  colors?: string[];
  // Whether to show celebration text
  showMessage?: boolean;
  // Custom celebration message
  message?: string;
  // Callback when animation completes
  onComplete?: () => void;
}

interface ConfettiContextType {
  trigger: (type: ConfettiTrigger, config?: ConfettiConfig) => void;
  triggerPortfolioMillion: () => void;
  triggerMonteCarloSuccess: (rate: number) => void;
  triggerOnboardingComplete: () => void;
  triggerEstateMilestone: (value: number) => void;
}

// ==================== Configuration Presets ====================

const DEFAULT_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

const MILESTONE_CONFIGS: Record<Exclude<ConfettiTrigger, "custom">, ConfettiConfig> = {
  portfolio_million: {
    particleCount: 150,
    duration: 4000,
    spread: 120,
    startY: 0.3,
    velocity: { min: 15, max: 25 },
    gravity: 0.3,
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#10b981", "#059669"], // Gold/amber tones
    showMessage: true,
    message: "You're a Millionaire!",
  },
  monte_carlo_success: {
    particleCount: 100,
    duration: 3000,
    spread: 90,
    startY: 0.4,
    velocity: { min: 12, max: 20 },
    gravity: 0.25,
    colors: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"], // Green success tones
    showMessage: true,
    message: "95%+ Success Rate!",
  },
  onboarding_complete: {
    particleCount: 80,
    duration: 2500,
    spread: 70,
    startY: 0.5,
    velocity: { min: 10, max: 18 },
    gravity: 0.3,
    colors: DEFAULT_COLORS,
    showMessage: true,
    message: "Setup Complete!",
  },
  estate_milestone: {
    particleCount: 120,
    duration: 3500,
    spread: 100,
    startY: 0.35,
    velocity: { min: 14, max: 22 },
    gravity: 0.28,
    colors: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#fbbf24", "#f59e0b"], // Purple/gold
    showMessage: true,
    message: "Legacy Secured!",
  },
};

// ==================== Context ====================

const ConfettiContext = createContext<ConfettiContextType | null>(null);

export const useConfetti = (): ConfettiContextType => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
};

// ==================== Canvas Animation ====================

function createParticle(
  canvasWidth: number,
  canvasHeight: number,
  config: Required<ConfettiConfig>
): ConfettiParticle {
  const centerX = canvasWidth / 2;
  const startY = canvasHeight * config.startY;

  // Random angle within spread
  const spreadRad = (config.spread * Math.PI) / 180;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;

  // Random velocity
  const velocity =
    config.velocity.min +
    Math.random() * (config.velocity.max - config.velocity.min);

  // Random shape
  const shapes: Array<"square" | "rectangle" | "circle"> = ["square", "rectangle", "circle"];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];

  return {
    x: centerX + (Math.random() - 0.5) * 100,
    y: startY,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity,
    width: shape === "rectangle" ? 4 + Math.random() * 6 : 6 + Math.random() * 4,
    height: shape === "rectangle" ? 10 + Math.random() * 8 : 6 + Math.random() * 4,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
    opacity: 1,
    shape,
  };
}

function updateParticle(
  particle: ConfettiParticle,
  gravity: number,
  friction: number = 0.99
): void {
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.vy += gravity;
  particle.vx *= friction;
  particle.rotation += particle.rotationSpeed;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: ConfettiParticle
): void {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate((particle.rotation * Math.PI) / 180);
  ctx.globalAlpha = particle.opacity;
  ctx.fillStyle = particle.color;

  if (particle.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, particle.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(
      -particle.width / 2,
      -particle.height / 2,
      particle.width,
      particle.height
    );
  }

  ctx.restore();
}

// ==================== Confetti Canvas Component ====================

interface ConfettiCanvasProps {
  isActive: boolean;
  config: Required<ConfettiConfig>;
  onComplete: () => void;
}

const ConfettiCanvas: React.FC<ConfettiCanvasProps> = ({
  isActive,
  config,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageOpacity, setMessageOpacity] = useState(0);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    particlesRef.current = Array.from({ length: config.particleCount }, () =>
      createParticle(canvas.width, canvas.height, config)
    );

    startTimeRef.current = performance.now();

    // Show message with fade-in
    if (config.showMessage) {
      setShowMessage(true);
      // Animate message opacity
      let messageFrame = 0;
      const animateMessage = () => {
        messageFrame++;
        if (messageFrame < 30) {
          setMessageOpacity(messageFrame / 30);
          requestAnimationFrame(animateMessage);
        }
      };
      requestAnimationFrame(animateMessage);
    }

    // Animation loop
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate fade based on duration
      const fadeStart = config.duration * 0.7;
      const fadeDuration = config.duration * 0.3;
      let globalOpacity = 1;

      if (elapsed > fadeStart) {
        globalOpacity = Math.max(0, 1 - (elapsed - fadeStart) / fadeDuration);
      }

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        updateParticle(particle, config.gravity);
        particle.opacity = globalOpacity;
        drawParticle(ctx, particle);
      });

      // Fade out message
      if (elapsed > fadeStart) {
        setMessageOpacity(globalOpacity);
      }

      // Continue animation or complete
      if (elapsed < config.duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setShowMessage(false);
        setMessageOpacity(0);
        onComplete();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive, config, onComplete]);

  if (!isActive) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9999]"
        aria-hidden="true"
      />
      {showMessage && config.message && (
        <div
          className="fixed inset-0 pointer-events-none z-[10000] flex items-center justify-center"
          style={{ opacity: messageOpacity }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div
              className="absolute inset-0 blur-xl rounded-full"
              style={{
                background: `radial-gradient(circle, ${config.colors[0]}40 0%, transparent 70%)`,
                transform: "scale(2)",
              }}
            />
            {/* Message text */}
            <div
              className="relative px-8 py-4 rounded-2xl text-3xl md:text-4xl font-bold text-white text-center"
              style={{
                background: `linear-gradient(135deg, ${config.colors[0]}dd, ${config.colors[1] || config.colors[0]}dd)`,
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                boxShadow: `0 4px 30px ${config.colors[0]}50`,
              }}
            >
              {config.message}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==================== Confetti Provider ====================

interface ConfettiProviderProps {
  children: React.ReactNode;
}

export const ConfettiProvider: React.FC<ConfettiProviderProps> = ({
  children,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Required<ConfettiConfig> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trigger = useCallback(
    (type: ConfettiTrigger, customConfig?: ConfettiConfig) => {
      // Get base config from presets or use defaults
      const baseConfig =
        type === "custom"
          ? {}
          : MILESTONE_CONFIGS[type];

      // Merge with custom config
      const finalConfig: Required<ConfettiConfig> = {
        particleCount: customConfig?.particleCount ?? baseConfig?.particleCount ?? 100,
        duration: customConfig?.duration ?? baseConfig?.duration ?? 3000,
        spread: customConfig?.spread ?? baseConfig?.spread ?? 90,
        startY: customConfig?.startY ?? baseConfig?.startY ?? 0.4,
        velocity: customConfig?.velocity ?? baseConfig?.velocity ?? { min: 12, max: 20 },
        gravity: customConfig?.gravity ?? baseConfig?.gravity ?? 0.3,
        colors: customConfig?.colors ?? baseConfig?.colors ?? DEFAULT_COLORS,
        showMessage: customConfig?.showMessage ?? baseConfig?.showMessage ?? false,
        message: customConfig?.message ?? baseConfig?.message ?? "",
        onComplete: customConfig?.onComplete ?? (() => {}),
      };

      setCurrentConfig(finalConfig);
      setIsActive(true);
    },
    []
  );

  const handleComplete = useCallback(() => {
    setIsActive(false);
    currentConfig?.onComplete?.();
    setCurrentConfig(null);
  }, [currentConfig]);

  // Convenience methods for specific milestones
  const triggerPortfolioMillion = useCallback(() => {
    trigger("portfolio_million");
  }, [trigger]);

  const triggerMonteCarloSuccess = useCallback(
    (rate: number) => {
      trigger("monte_carlo_success", {
        message: `${rate.toFixed(0)}% Success Rate!`,
      });
    },
    [trigger]
  );

  const triggerOnboardingComplete = useCallback(() => {
    trigger("onboarding_complete");
  }, [trigger]);

  const triggerEstateMilestone = useCallback(
    (value: number) => {
      const formattedValue =
        value >= 1e6
          ? `$${(value / 1e6).toFixed(1)}M`
          : `$${(value / 1e3).toFixed(0)}K`;
      trigger("estate_milestone", {
        message: `${formattedValue} Legacy!`,
      });
    },
    [trigger]
  );

  const contextValue: ConfettiContextType = {
    trigger,
    triggerPortfolioMillion,
    triggerMonteCarloSuccess,
    triggerOnboardingComplete,
    triggerEstateMilestone,
  };

  return (
    <ConfettiContext.Provider value={contextValue}>
      {children}
      {mounted &&
        isActive &&
        currentConfig &&
        createPortal(
          <ConfettiCanvas
            isActive={isActive}
            config={currentConfig}
            onComplete={handleComplete}
          />,
          document.body
        )}
    </ConfettiContext.Provider>
  );
};

// ==================== Standalone Hook for Milestone Detection ====================

export interface MilestoneDetectionConfig {
  currentPortfolioValue: number;
  previousPortfolioValue?: number;
  monteCarloSuccessRate?: number;
  previousMonteCarloRate?: number;
  estateValue?: number;
  previousEstateValue?: number;
  isOnboardingComplete?: boolean;
  wasOnboardingComplete?: boolean;
}

/**
 * Hook to automatically detect and trigger confetti for financial milestones.
 * Use this in components that track portfolio values to auto-celebrate achievements.
 */
export function useMilestoneConfetti(config: MilestoneDetectionConfig): void {
  const confetti = useConfetti();
  const hasTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const {
      currentPortfolioValue,
      previousPortfolioValue = 0,
      monteCarloSuccessRate,
      previousMonteCarloRate = 0,
      estateValue,
      previousEstateValue = 0,
      isOnboardingComplete = false,
      wasOnboardingComplete = false,
    } = config;

    // Portfolio reaching $1M
    if (
      currentPortfolioValue >= 1_000_000 &&
      previousPortfolioValue < 1_000_000 &&
      !hasTriggeredRef.current.has("million")
    ) {
      hasTriggeredRef.current.add("million");
      confetti.triggerPortfolioMillion();
    }

    // Monte Carlo success rate hitting 95%+
    if (
      monteCarloSuccessRate !== undefined &&
      monteCarloSuccessRate >= 95 &&
      previousMonteCarloRate < 95 &&
      !hasTriggeredRef.current.has("montecarlo")
    ) {
      hasTriggeredRef.current.add("montecarlo");
      confetti.triggerMonteCarloSuccess(monteCarloSuccessRate);
    }

    // Onboarding completion
    if (
      isOnboardingComplete &&
      !wasOnboardingComplete &&
      !hasTriggeredRef.current.has("onboarding")
    ) {
      hasTriggeredRef.current.add("onboarding");
      confetti.triggerOnboardingComplete();
    }

    // Estate value crossing significant thresholds ($500K, $1M, $2M, $5M)
    const estateThresholds = [500_000, 1_000_000, 2_000_000, 5_000_000];
    if (estateValue !== undefined) {
      for (const threshold of estateThresholds) {
        const key = `estate_${threshold}`;
        if (
          estateValue >= threshold &&
          previousEstateValue < threshold &&
          !hasTriggeredRef.current.has(key)
        ) {
          hasTriggeredRef.current.add(key);
          confetti.triggerEstateMilestone(threshold);
          break; // Only trigger one at a time
        }
      }
    }
  }, [config, confetti]);
}

// ==================== Simple Standalone Component ====================

interface ConfettiProps {
  trigger: boolean;
  type?: ConfettiTrigger;
  config?: ConfettiConfig;
  onComplete?: () => void;
}

/**
 * Standalone Confetti component for simple use cases.
 * For more complex scenarios, use the ConfettiProvider and useConfetti hook.
 *
 * @example
 * ```tsx
 * <Confetti
 *   trigger={showCelebration}
 *   type="portfolio_million"
 *   onComplete={() => setShowCelebration(false)}
 * />
 * ```
 */
export const Confetti: React.FC<ConfettiProps> = ({
  trigger: shouldTrigger,
  type = "custom",
  config: customConfig,
  onComplete,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Required<ConfettiConfig> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (shouldTrigger && !isActive) {
      const baseConfig =
        type === "custom" ? {} : MILESTONE_CONFIGS[type];

      const finalConfig: Required<ConfettiConfig> = {
        particleCount: customConfig?.particleCount ?? baseConfig?.particleCount ?? 100,
        duration: customConfig?.duration ?? baseConfig?.duration ?? 3000,
        spread: customConfig?.spread ?? baseConfig?.spread ?? 90,
        startY: customConfig?.startY ?? baseConfig?.startY ?? 0.4,
        velocity: customConfig?.velocity ?? baseConfig?.velocity ?? { min: 12, max: 20 },
        gravity: customConfig?.gravity ?? baseConfig?.gravity ?? 0.3,
        colors: customConfig?.colors ?? baseConfig?.colors ?? DEFAULT_COLORS,
        showMessage: customConfig?.showMessage ?? baseConfig?.showMessage ?? false,
        message: customConfig?.message ?? baseConfig?.message ?? "",
        onComplete: onComplete ?? (() => {}),
      };

      setCurrentConfig(finalConfig);
      setIsActive(true);
    }
  }, [shouldTrigger, type, customConfig, onComplete, isActive]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    onComplete?.();
    setCurrentConfig(null);
  }, [onComplete]);

  if (!mounted || !isActive || !currentConfig) return null;

  return createPortal(
    <ConfettiCanvas
      isActive={isActive}
      config={currentConfig}
      onComplete={handleComplete}
    />,
    document.body
  );
};

export default Confetti;

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  TrendingUp,
  Coins,
  Shield,
  Crown,
  BarChart3,
  Lock,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  X,
} from "lucide-react";

// Dynamic import for framer-motion to avoid SSR issues
const MotionDiv = dynamic(
  () => import("framer-motion").then((m) => m.motion.div),
  { ssr: false }
);

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AchievementId =
  | "first_calculation"
  | "million_dollar_plan"
  | "roth_maximizer"
  | "tax_optimizer"
  | "hundred_year_dynasty"
  | "monte_carlo_master";

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  requirement: string;
  progressLabel?: string;
  maxProgress?: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  viewed: boolean;
}

export interface AchievementsState {
  achievements: AchievementProgress[];
  soundEnabled: boolean;
  lastUpdated: string;
}

// ============================================================================
// Achievement Definitions
// ============================================================================

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_calculation",
    name: "First Calculation",
    description: "Complete your first retirement calculation",
    icon: Calculator,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/50",
    requirement: "Run 1 calculation",
    rarity: "common",
  },
  {
    id: "million_dollar_plan",
    name: "Million Dollar Plan",
    description: "Create a retirement plan worth $1,000,000+",
    icon: TrendingUp,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/50",
    requirement: "Plan worth $1M+",
    rarity: "uncommon",
  },
  {
    id: "roth_maximizer",
    name: "Roth Maximizer",
    description: "Max out Roth IRA contributions in your plan",
    icon: Coins,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/50",
    requirement: "Max Roth contributions",
    rarity: "rare",
  },
  {
    id: "tax_optimizer",
    name: "Tax Optimizer",
    description: "Optimize tax efficiency across all account types",
    icon: Shield,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/50",
    requirement: "Use all account types",
    progressLabel: "Account types used",
    maxProgress: 3,
    rarity: "rare",
  },
  {
    id: "hundred_year_dynasty",
    name: "100-Year Dynasty",
    description: "Create a plan that lasts 100+ years with inheritance",
    icon: Crown,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    glowColor: "shadow-rose-500/50",
    requirement: "100+ year plan",
    rarity: "epic",
  },
  {
    id: "monte_carlo_master",
    name: "Monte Carlo Master",
    description: "Run 10 Monte Carlo simulations to analyze outcomes",
    icon: BarChart3,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/50",
    requirement: "Run 10 simulations",
    progressLabel: "Simulations run",
    maxProgress: 10,
    rarity: "legendary",
  },
];

// Rarity colors and labels
const RARITY_CONFIG = {
  common: { label: "Common", color: "text-gray-400", bgColor: "bg-gray-400/20" },
  uncommon: { label: "Uncommon", color: "text-green-400", bgColor: "bg-green-400/20" },
  rare: { label: "Rare", color: "text-blue-400", bgColor: "bg-blue-400/20" },
  epic: { label: "Epic", color: "text-purple-400", bgColor: "bg-purple-400/20" },
  legendary: { label: "Legendary", color: "text-amber-400", bgColor: "bg-amber-400/20" },
};

// ============================================================================
// localStorage Helpers
// ============================================================================

const STORAGE_KEY = "retirement_calc_achievements";

const getDefaultState = (): AchievementsState => ({
  achievements: ACHIEVEMENTS.map((a) => ({
    id: a.id,
    unlocked: false,
    progress: 0,
    viewed: false,
  })),
  soundEnabled: true,
  lastUpdated: new Date().toISOString(),
});

export const loadAchievements = (): AchievementsState => {
  if (typeof window === "undefined") return getDefaultState();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultState();

    const parsed = JSON.parse(stored) as AchievementsState;

    // Merge with current achievements (in case new ones were added)
    const mergedAchievements = ACHIEVEMENTS.map((def) => {
      const existing = parsed.achievements.find((a) => a.id === def.id);
      return existing || { id: def.id, unlocked: false, progress: 0, viewed: false };
    });

    return {
      ...parsed,
      achievements: mergedAchievements,
    };
  } catch {
    return getDefaultState();
  }
};

export const saveAchievements = (state: AchievementsState): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, lastUpdated: new Date().toISOString() })
    );
  } catch {
    console.error("Failed to save achievements to localStorage");
  }
};

// ============================================================================
// Sound Effects
// ============================================================================

const playUnlockSound = (enabled: boolean) => {
  if (!enabled || typeof window === "undefined") return;

  try {
    // Create a simple success sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Main tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.3); // C6

    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Sparkle effect
    setTimeout(() => {
      const sparkleOsc = audioContext.createOscillator();
      const sparkleGain = audioContext.createGain();
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(audioContext.destination);
      sparkleOsc.frequency.setValueAtTime(1318.51, audioContext.currentTime); // E6
      sparkleOsc.type = "sine";
      sparkleGain.gain.setValueAtTime(0.15, audioContext.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      sparkleOsc.start(audioContext.currentTime);
      sparkleOsc.stop(audioContext.currentTime + 0.2);
    }, 350);
  } catch {
    // Audio not supported, silently fail
  }
};

// ============================================================================
// Confetti Component
// ============================================================================

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
}

const Confetti: React.FC<{ active: boolean; onComplete?: () => void }> = ({
  active,
  onComplete,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const colors = [
      "#FFD700", // Gold
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#FFEAA7", // Yellow
      "#DDA0DD", // Plum
      "#98D8C8", // Mint
    ];

    const newPieces: ConfettiPiece[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: 2 + Math.random() * 3,
    }));

    setPieces(newPieces);

    let frame = 0;
    const maxFrames = 180; // 3 seconds at 60fps

    const animate = () => {
      frame++;

      setPieces((prev) =>
        prev.map((piece) => ({
          ...piece,
          x: piece.x + piece.velocityX * 0.3,
          y: piece.y + piece.velocityY,
          rotation: piece.rotation + 3,
          velocityY: piece.velocityY + 0.1, // gravity
        }))
      );

      if (frame < maxFrames) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setPieces([]);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, onComplete]);

  if (!active || pieces.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
            opacity: Math.max(0, 1 - piece.y / 150),
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Achievement Badge Component
// ============================================================================

interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  progress: AchievementProgress;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  animated?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  progress,
  onClick,
  size = "md",
  showProgress = true,
  animated = true,
}) => {
  const Icon = achievement.icon;
  const isUnlocked = progress.unlocked;
  const rarity = RARITY_CONFIG[achievement.rarity];

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  const Wrapper = animated && typeof window !== "undefined" ? MotionDiv : "div";
  const wrapperProps = animated
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: isUnlocked ? { scale: 1.05 } : undefined,
        whileTap: isUnlocked ? { scale: 0.95 } : undefined,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "relative flex flex-col items-center gap-2 cursor-pointer group",
        !isUnlocked && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Badge circle */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center border-2 transition-all duration-300",
          sizeClasses[size],
          isUnlocked
            ? cn(
                achievement.bgColor,
                achievement.borderColor,
                "shadow-lg",
                `hover:${achievement.glowColor}`
              )
            : "bg-muted border-muted-foreground/20"
        )}
      >
        {isUnlocked ? (
          <Icon className={cn(iconSizes[size], achievement.color)} />
        ) : (
          <Lock className={cn(iconSizes[size], "text-muted-foreground/50")} />
        )}

        {/* Sparkle effect for unlocked */}
        {isUnlocked && (
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
        )}

        {/* New indicator */}
        {isUnlocked && !progress.viewed && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <p
          className={cn(
            "text-sm font-medium",
            isUnlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {achievement.name}
        </p>
        <Badge className={cn("text-[10px] mt-1", rarity.bgColor, rarity.color)}>
          {rarity.label}
        </Badge>
      </div>

      {/* Progress bar for in-progress achievements */}
      {showProgress && !isUnlocked && achievement.maxProgress && (
        <div className="w-full max-w-[80px]">
          <Progress
            value={(progress.progress / achievement.maxProgress) * 100}
            className="h-1.5"
          />
          <p className="text-[10px] text-muted-foreground text-center mt-0.5">
            {progress.progress}/{achievement.maxProgress}
          </p>
        </div>
      )}
    </Wrapper>
  );
};

// ============================================================================
// Achievement Unlock Modal
// ============================================================================

interface UnlockModalProps {
  achievement: AchievementDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform: string) => void;
}

const UnlockModal: React.FC<UnlockModalProps> = ({
  achievement,
  isOpen,
  onClose,
  onShare,
}) => {
  if (!isOpen || !achievement) return null;

  const Icon = achievement.icon;
  const rarity = RARITY_CONFIG[achievement.rarity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <MotionDiv
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 bg-card border-2 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl"
        style={{ borderColor: achievement.color.replace("text-", "") }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy icon */}
        <div className="flex justify-center mb-4">
          <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
        </div>

        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Achievement Unlocked!
        </h2>

        {/* Achievement badge */}
        <div
          className={cn(
            "w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 mb-4 shadow-lg",
            achievement.bgColor,
            achievement.borderColor
          )}
        >
          <Icon className={cn("w-12 h-12", achievement.color)} />
        </div>

        <h3 className="text-xl font-semibold mb-1">{achievement.name}</h3>
        <Badge className={cn("mb-3", rarity.bgColor, rarity.color)}>
          {rarity.label}
        </Badge>
        <p className="text-muted-foreground mb-6">{achievement.description}</p>

        {/* Share buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => onShare("twitter")}
            className="p-2 rounded-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] transition-colors"
            aria-label="Share on Twitter"
          >
            <Twitter className="w-5 h-5" />
          </button>
          <button
            onClick={() => onShare("linkedin")}
            className="p-2 rounded-full bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] transition-colors"
            aria-label="Share on LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
          </button>
          <button
            onClick={() => onShare("facebook")}
            className="p-2 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-colors"
            aria-label="Share on Facebook"
          >
            <Facebook className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          Awesome!
        </button>
      </MotionDiv>
    </div>
  );
};

// ============================================================================
// Achievement Detail Modal
// ============================================================================

interface DetailModalProps {
  achievement: AchievementDefinition | null;
  progress: AchievementProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({
  achievement,
  progress,
  isOpen,
  onClose,
  onShare,
}) => {
  if (!isOpen || !achievement || !progress) return null;

  const Icon = achievement.icon;
  const rarity = RARITY_CONFIG[achievement.rarity];
  const isUnlocked = progress.unlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 bg-card border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 mb-4",
              isUnlocked
                ? cn(achievement.bgColor, achievement.borderColor, "shadow-lg")
                : "bg-muted border-muted-foreground/20"
            )}
          >
            {isUnlocked ? (
              <Icon className={cn("w-10 h-10", achievement.color)} />
            ) : (
              <Lock className="w-10 h-10 text-muted-foreground/50" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-1">{achievement.name}</h3>
          <Badge className={cn("mb-3", rarity.bgColor, rarity.color)}>
            {rarity.label}
          </Badge>
          <p className="text-muted-foreground mb-4">{achievement.description}</p>

          {/* Progress or unlock info */}
          {isUnlocked ? (
            <p className="text-sm text-muted-foreground mb-4">
              Unlocked on{" "}
              {progress.unlockedAt
                ? new Date(progress.unlockedAt).toLocaleDateString()
                : "Unknown"}
            </p>
          ) : achievement.maxProgress ? (
            <div className="mb-4">
              <Progress
                value={(progress.progress / achievement.maxProgress) * 100}
                className="h-2 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {achievement.progressLabel}: {progress.progress}/
                {achievement.maxProgress}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              {achievement.requirement}
            </p>
          )}

          {/* Share buttons (only if unlocked) */}
          {isUnlocked && (
            <div className="flex justify-center gap-3 pt-4 border-t">
              <button
                onClick={() => onShare("twitter")}
                className="p-2 rounded-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] transition-colors"
                aria-label="Share on Twitter"
              >
                <Twitter className="w-5 h-5" />
              </button>
              <button
                onClick={() => onShare("linkedin")}
                className="p-2 rounded-full bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] transition-colors"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </button>
              <button
                onClick={() => onShare("facebook")}
                className="p-2 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-colors"
                aria-label="Share on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </MotionDiv>
    </div>
  );
};

// ============================================================================
// Main Achievements Component
// ============================================================================

export interface AchievementsProps {
  className?: string;
  compact?: boolean;
}

export const Achievements: React.FC<AchievementsProps> = ({
  className,
  compact = false,
}) => {
  const [state, setState] = useState<AchievementsState>(getDefaultState);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockModal, setUnlockModal] = useState<AchievementDefinition | null>(null);
  const [detailModal, setDetailModal] = useState<{
    achievement: AchievementDefinition;
    progress: AchievementProgress;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    setState(loadAchievements());
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    if (mounted) {
      saveAchievements(state);
    }
  }, [state, mounted]);

  const toggleSound = useCallback(() => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const handleShare = useCallback((platform: string, achievement?: AchievementDefinition) => {
    const ach = achievement || unlockModal;
    if (!ach) return;

    const text = `I just unlocked the "${ach.name}" achievement in my retirement planning journey! ${ach.description}`;
    const url = typeof window !== "undefined" ? window.location.href : "";

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  }, [unlockModal]);

  const markViewed = useCallback((id: AchievementId) => {
    setState((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, viewed: true } : a
      ),
    }));
  }, []);

  const handleBadgeClick = useCallback((achievement: AchievementDefinition) => {
    const progress = state.achievements.find((a) => a.id === achievement.id);
    if (!progress) return;

    if (progress.unlocked && !progress.viewed) {
      markViewed(achievement.id);
    }

    setDetailModal({ achievement, progress });
  }, [state.achievements, markViewed]);

  // Calculate stats
  const stats = useMemo(() => {
    const unlocked = state.achievements.filter((a) => a.unlocked).length;
    const total = ACHIEVEMENTS.length;
    const percentage = Math.round((unlocked / total) * 100);
    return { unlocked, total, percentage };
  }, [state.achievements]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (compact) {
    // Compact view for sidebar or header
    const unlockedCount = state.achievements.filter((a) => a.unlocked).length;
    const newCount = state.achievements.filter((a) => a.unlocked && !a.viewed).length;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Trophy className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-medium">
          {unlockedCount}/{ACHIEVEMENTS.length}
        </span>
        {newCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {newCount} new
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <UnlockModal
        achievement={unlockModal}
        isOpen={!!unlockModal}
        onClose={() => setUnlockModal(null)}
        onShare={handleShare}
      />

      <DetailModal
        achievement={detailModal?.achievement || null}
        progress={detailModal?.progress || null}
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        onShare={(platform) => handleShare(platform, detailModal?.achievement)}
      />

      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-400" />
              Achievements
            </h2>
            <p className="text-muted-foreground">
              Track your financial planning milestones
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={state.soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {state.soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Overall progress */}
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.percentage}%</p>
              <p className="text-sm text-muted-foreground">
                {stats.unlocked}/{stats.total} unlocked
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={stats.percentage} className="h-3" />

        {/* Achievement grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {ACHIEVEMENTS.map((achievement) => {
            const progress = state.achievements.find(
              (a) => a.id === achievement.id
            ) || { id: achievement.id, unlocked: false, progress: 0, viewed: false };

            return (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                progress={progress}
                onClick={() => handleBadgeClick(achievement)}
                size="md"
                showProgress
              />
            );
          })}
        </div>

        {/* Unlocked achievements list */}
        {stats.unlocked > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Unlocked Achievements
            </h3>
            <div className="space-y-3">
              {ACHIEVEMENTS.filter((a) =>
                state.achievements.find((p) => p.id === a.id)?.unlocked
              ).map((achievement) => {
                const progress = state.achievements.find(
                  (p) => p.id === achievement.id
                )!;
                const Icon = achievement.icon;
                const rarity = RARITY_CONFIG[achievement.rarity];

                return (
                  <div
                    key={achievement.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer hover:bg-muted/50",
                      achievement.bgColor,
                      achievement.borderColor
                    )}
                    onClick={() => handleBadgeClick(achievement)}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        achievement.bgColor
                      )}
                    >
                      <Icon className={cn("w-6 h-6", achievement.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{achievement.name}</h4>
                        <Badge className={cn("text-[10px]", rarity.bgColor, rarity.color)}>
                          {rarity.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {progress.unlockedAt &&
                        new Date(progress.unlockedAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare("twitter", achievement);
                      }}
                      className="p-2 rounded-full hover:bg-background transition-colors"
                      aria-label="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// Achievement Hook - For triggering achievements from other components
// ============================================================================

export interface UseAchievementsReturn {
  state: AchievementsState;
  unlock: (id: AchievementId) => boolean;
  updateProgress: (id: AchievementId, progress: number) => boolean;
  incrementProgress: (id: AchievementId, amount?: number) => boolean;
  isUnlocked: (id: AchievementId) => boolean;
  getProgress: (id: AchievementId) => number;
  resetAll: () => void;
}

export const useAchievements = (): UseAchievementsReturn => {
  const [state, setState] = useState<AchievementsState>(getDefaultState);
  const [mounted, setMounted] = useState(false);
  const pendingUnlockRef = useRef<AchievementId | null>(null);

  useEffect(() => {
    setMounted(true);
    setState(loadAchievements());
  }, []);

  useEffect(() => {
    if (mounted) {
      saveAchievements(state);

      // Handle pending unlock after state update
      if (pendingUnlockRef.current) {
        const achievement = ACHIEVEMENTS.find((a) => a.id === pendingUnlockRef.current);
        if (achievement) {
          playUnlockSound(state.soundEnabled);
          // Dispatch custom event for UI components to show celebration
          window.dispatchEvent(
            new CustomEvent("achievement-unlocked", {
              detail: { achievement, state },
            })
          );
        }
        pendingUnlockRef.current = null;
      }
    }
  }, [state, mounted]);

  const unlock = useCallback((id: AchievementId): boolean => {
    const current = state.achievements.find((a) => a.id === id);
    if (!current || current.unlocked) return false;

    pendingUnlockRef.current = id;

    setState((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id
          ? {
              ...a,
              unlocked: true,
              unlockedAt: new Date().toISOString(),
              viewed: false,
            }
          : a
      ),
    }));

    return true;
  }, [state.achievements]);

  const updateProgress = useCallback((id: AchievementId, progress: number): boolean => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    const current = state.achievements.find((a) => a.id === id);

    if (!achievement || !current || current.unlocked) return false;

    const maxProgress = achievement.maxProgress || 1;
    const newProgress = Math.min(progress, maxProgress);
    const shouldUnlock = newProgress >= maxProgress;

    if (shouldUnlock) {
      return unlock(id);
    }

    setState((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, progress: newProgress } : a
      ),
    }));

    return true;
  }, [state.achievements, unlock]);

  const incrementProgress = useCallback((id: AchievementId, amount = 1): boolean => {
    const current = state.achievements.find((a) => a.id === id);
    if (!current) return false;
    return updateProgress(id, current.progress + amount);
  }, [state.achievements, updateProgress]);

  const isUnlocked = useCallback((id: AchievementId): boolean => {
    return state.achievements.find((a) => a.id === id)?.unlocked || false;
  }, [state.achievements]);

  const getProgress = useCallback((id: AchievementId): number => {
    return state.achievements.find((a) => a.id === id)?.progress || 0;
  }, [state.achievements]);

  const resetAll = useCallback(() => {
    const defaultState = getDefaultState();
    setState(defaultState);
    saveAchievements(defaultState);
  }, []);

  return {
    state,
    unlock,
    updateProgress,
    incrementProgress,
    isUnlocked,
    getProgress,
    resetAll,
  };
};

// ============================================================================
// Achievement Notification Listener Component
// ============================================================================

export const AchievementNotificationListener: React.FC = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockModal, setUnlockModal] = useState<AchievementDefinition | null>(null);

  useEffect(() => {
    const handleUnlock = (event: CustomEvent<{ achievement: AchievementDefinition }>) => {
      setUnlockModal(event.detail.achievement);
      setShowConfetti(true);
    };

    window.addEventListener(
      "achievement-unlocked",
      handleUnlock as EventListener
    );

    return () => {
      window.removeEventListener(
        "achievement-unlocked",
        handleUnlock as EventListener
      );
    };
  }, []);

  const handleShare = (platform: string) => {
    if (!unlockModal) return;

    const text = `I just unlocked the "${unlockModal.name}" achievement in my retirement planning journey! ${unlockModal.description}`;
    const url = typeof window !== "undefined" ? window.location.href : "";

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  };

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <UnlockModal
        achievement={unlockModal}
        isOpen={!!unlockModal}
        onClose={() => setUnlockModal(null)}
        onShare={handleShare}
      />
    </>
  );
};

export default Achievements;

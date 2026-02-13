"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence, useAnimation, PanInfo } from "framer-motion";
import {
  Home,
  Calculator,
  PieChart,
  Settings,
  ChevronUp,
  TrendingUp,
  FileText,
  HelpCircle,
  Share2,
  Bookmark,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  badge?: number | string;
}

interface MobileNavProps {
  /** Currently active navigation item ID */
  activeId?: string;
  /** Callback when navigation item is clicked */
  onNavigate?: (id: string) => void;
  /** Callback when calculate FAB is pressed */
  onCalculate?: () => void;
  /** Whether to show the nav bar */
  visible?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Haptic Feedback Utility
// ============================================================================

const triggerHapticFeedback = (
  style: "light" | "medium" | "heavy" | "selection" = "light"
) => {
  // Check for native haptic support (iOS Safari, Android Chrome)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      selection: [10, 10],
    };
    navigator.vibrate(patterns[style]);
  }
};

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to detect scroll direction and hide/show nav
 */
const useScrollDirection = (threshold = 10) => {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null
  );
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY.current ? "down" : "up";

      if (
        Math.abs(scrollY - lastScrollY.current) > threshold &&
        direction !== scrollDirection
      ) {
        setScrollDirection(direction);
      }

      setIsAtTop(scrollY < 50);
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollDirection, threshold]);

  return { scrollDirection, isAtTop };
};

/**
 * Hook for swipe gesture detection
 */
const useSwipeGesture = (
  onSwipeUp: () => void,
  onSwipeDown: () => void,
  swipeThreshold = 50
) => {
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y < -swipeThreshold && info.velocity.y < -500) {
        triggerHapticFeedback("medium");
        onSwipeUp();
      } else if (info.offset.y > swipeThreshold && info.velocity.y > 500) {
        triggerHapticFeedback("light");
        onSwipeDown();
      }
    },
    [onSwipeUp, onSwipeDown, swipeThreshold]
  );

  return { handleDragEnd };
};

// ============================================================================
// Sub-components
// ============================================================================

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-w-[64px] min-h-[44px] px-3 py-2",
        "rounded-xl transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </AnimatePresence>

      {/* Icon with active indicator dot */}
      <div className="relative z-10">
        <Icon
          className={cn(
            "w-6 h-6 transition-transform duration-200",
            isActive && "scale-110"
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {item.badge !== undefined && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {typeof item.badge === "number" && item.badge > 99
              ? "99+"
              : item.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[10px] font-medium mt-0.5 transition-opacity duration-200",
          isActive ? "opacity-100" : "opacity-70"
        )}
      >
        {item.label}
      </span>

      {/* Active dot indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

interface ExpandedMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: NavItem) => void;
}

const ExpandedMenu: React.FC<ExpandedMenuProps> = ({
  isOpen,
  onClose,
  onItemClick,
}) => {
  const expandedItems: NavItem[] = useMemo(
    () => [
      { id: "reports", label: "Reports", icon: FileText },
      { id: "analysis", label: "Analysis", icon: TrendingUp },
      { id: "help", label: "Help", icon: HelpCircle },
      { id: "share", label: "Share", icon: Share2 },
      { id: "saved", label: "Saved", icon: Bookmark },
    ],
    []
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Expanded Panel */}
          <motion.div
            className={cn(
              "fixed left-0 right-0 bottom-0 z-50",
              "bg-background/95 backdrop-blur-xl",
              "rounded-t-3xl border-t border-border",
              "shadow-2xl"
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Menu header */}
            <div className="px-6 py-2">
              <h3 className="text-lg font-semibold">More Options</h3>
              <p className="text-sm text-muted-foreground">
                Access additional features
              </p>
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-4 gap-2 p-4">
              {expandedItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className={cn(
                      "flex flex-col items-center justify-center",
                      "p-4 rounded-2xl",
                      "bg-muted/50 hover:bg-muted",
                      "transition-colors duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-6 h-6 text-foreground mb-2" />
                    <span className="text-xs font-medium text-foreground">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Safe area spacer */}
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface CalculateFABProps {
  onClick: () => void;
  isVisible: boolean;
}

const CalculateFAB: React.FC<CalculateFABProps> = ({ onClick, isVisible }) => {
  const controls = useAnimation();
  const [isPulsing, setIsPulsing] = useState(false);

  // Update animation when visibility changes
  useEffect(() => {
    if (isVisible) {
      controls.start({ scale: 1, y: 0 });
    } else {
      controls.start({ scale: 0, y: 20 });
    }
  }, [isVisible, controls]);

  const handleClick = () => {
    triggerHapticFeedback("heavy");
    setIsPulsing(true);
    controls.start({
      scale: [1, 1.2, 1],
      transition: { duration: 0.3 },
    }).then(() => setIsPulsing(false));
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      animate={controls}
      className={cn(
        "absolute -top-7 left-1/2 -translate-x-1/2",
        "w-14 h-14 rounded-full",
        "bg-gradient-to-br from-blue-500 to-violet-600",
        "shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20",
        "flex items-center justify-center",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50",
        "active:scale-95 transition-transform"
      )}
      initial={{ scale: 0, y: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Calculate retirement"
    >
      <Calculator className="w-6 h-6 text-white" strokeWidth={2.5} />

      {/* Pulse ring animation */}
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-500/30"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const primaryNavItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "portfolio", label: "Portfolio", icon: PieChart },
  // Calculator is the FAB in the middle
  { id: "charts", label: "Charts", icon: TrendingUp },
  { id: "settings", label: "Settings", icon: Settings },
];

export const MobileNav: React.FC<MobileNavProps> = ({
  activeId = "home",
  onNavigate,
  onCalculate,
  visible = true,
  className,
}) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalActiveId, setInternalActiveId] = useState(activeId);
  const { scrollDirection, isAtTop } = useScrollDirection();

  // Sync internal state with prop
  useEffect(() => {
    setInternalActiveId(activeId);
  }, [activeId]);

  // Swipe gesture handling
  const { handleDragEnd } = useSwipeGesture(
    () => setIsExpanded(true),
    () => setIsExpanded(false)
  );

  const handleNavItemClick = useCallback(
    (item: NavItem) => {
      triggerHapticFeedback("selection");
      setInternalActiveId(item.id);
      onNavigate?.(item.id);
      item.action?.();
    },
    [onNavigate]
  );

  const handleExpandedItemClick = useCallback(
    (item: NavItem) => {
      triggerHapticFeedback("selection");
      setIsExpanded(false);
      onNavigate?.(item.id);
      item.action?.();
    },
    [onNavigate]
  );

  const handleCalculateClick = useCallback(() => {
    triggerHapticFeedback("heavy");
    onCalculate?.();
  }, [onCalculate]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Calculate nav visibility based on scroll
  const shouldHide =
    scrollDirection === "down" && !isAtTop && !isExpanded && visible;

  return (
    <>
      {/* Expanded menu overlay */}
      <ExpandedMenu
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        onItemClick={handleExpandedItemClick}
      />

      {/* Main navigation bar */}
      <motion.nav
        className={cn(
          "fixed left-0 right-0 bottom-0 z-30",
          "bg-background/80 backdrop-blur-xl",
          "border-t border-border/50",
          "shadow-lg shadow-black/5 dark:shadow-black/20",
          className
        )}
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ y: 0 }}
        animate={{ y: shouldHide ? "100%" : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {/* Swipe up indicator */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -top-4 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isExpanded ? 0 : 0.5 }}
          transition={{ delay: 1 }}
        >
          <ChevronUp className="w-4 h-4 text-muted-foreground animate-bounce" />
        </motion.div>

        {/* Calculate FAB */}
        <CalculateFAB onClick={handleCalculateClick} isVisible={!shouldHide} />

        {/* Navigation items */}
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {/* Left side items */}
          <div className="flex items-center gap-1">
            {primaryNavItems.slice(0, 2).map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={internalActiveId === item.id}
                onClick={() => handleNavItemClick(item)}
              />
            ))}
          </div>

          {/* Center spacer for FAB */}
          <div className="w-16" />

          {/* Right side items */}
          <div className="flex items-center gap-1">
            {primaryNavItems.slice(2).map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={internalActiveId === item.id}
                onClick={() => handleNavItemClick(item)}
              />
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Bottom padding spacer to prevent content from being hidden behind nav */}
      <div
        className="h-20"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      />
    </>
  );
};

export default MobileNav;

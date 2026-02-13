"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
  type Transition,
  LayoutGroup,
} from "framer-motion";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type TransitionType = "fade" | "slide" | "slideUp" | "slideDown" | "zoom" | "none";
type TransitionDirection = "left" | "right" | "up" | "down";

interface TransitionConfig {
  type: TransitionType;
  direction?: TransitionDirection;
  duration?: number;
  delay?: number;
  staggerChildren?: number;
  ease?: number[] | string;
}

interface PageTransitionContextValue {
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
  transitionConfig: TransitionConfig;
  setTransitionConfig: (config: Partial<TransitionConfig>) => void;
  prefersReducedMotion: boolean;
}

interface SharedElementState {
  id: string;
  rect: DOMRect;
  element: HTMLElement;
}

// =============================================================================
// CONSTANTS & DEFAULTS
// =============================================================================

const DEFAULT_DURATION = 0.35;
const DEFAULT_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]; // Smooth ease-out

const DEFAULT_CONFIG: TransitionConfig = {
  type: "fade",
  direction: "right",
  duration: DEFAULT_DURATION,
  delay: 0,
  staggerChildren: 0.05,
  ease: DEFAULT_EASE,
};

// Premium spring configuration for natural movement
const springConfig: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const smoothEase: Transition = {
  duration: DEFAULT_DURATION,
  ease: DEFAULT_EASE as [number, number, number, number],
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/**
 * Fade transition - Elegant opacity crossfade
 * Best for: Tab changes, content updates
 */
const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: smoothEase,
  },
  exit: {
    opacity: 0,
    transition: { ...smoothEase, duration: 0.2 },
  },
};

/**
 * Slide transitions - Directional movement
 * Best for: Wizard steps, page navigation
 */
const createSlideVariants = (direction: TransitionDirection): Variants => {
  const offsets = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    up: { x: 0, y: -30 },
    down: { x: 0, y: 30 },
  };

  const exitOffsets = {
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
    up: { x: 0, y: 30 },
    down: { x: 0, y: -30 },
  };

  return {
    initial: {
      opacity: 0,
      ...offsets[direction],
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: springConfig,
    },
    exit: {
      opacity: 0,
      ...exitOffsets[direction],
      transition: { ...smoothEase, duration: 0.2 },
    },
  };
};

/**
 * Zoom transition - Scale with fade
 * Best for: Modals, dialogs, popups
 */
const zoomVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springConfig,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 5,
    transition: { ...smoothEase, duration: 0.15 },
  },
};

/**
 * Zoom In transition - For appearing content
 */
const zoomInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.85,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: smoothEase,
  },
};

/**
 * Slide up transition - Common for content entering
 */
const slideUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: smoothEase,
  },
};

/**
 * Stagger container for child animations
 */
const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Stagger item for use within stagger containers
 */
const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: smoothEase,
  },
};

// =============================================================================
// CONTEXT
// =============================================================================

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export const usePageTransition = () => {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within PageTransitionProvider");
  }
  return context;
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface PageTransitionProviderProps {
  children: React.ReactNode;
  defaultConfig?: Partial<TransitionConfig>;
}

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({
  children,
  defaultConfig,
}) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionConfig, setConfig] = useState<TransitionConfig>({
    ...DEFAULT_CONFIG,
    ...defaultConfig,
  });

  const setTransitionConfig = useCallback((config: Partial<TransitionConfig>) => {
    setConfig((prev) => ({ ...prev, ...config }));
  }, []);

  const value = useMemo(
    () => ({
      isTransitioning,
      setIsTransitioning,
      transitionConfig,
      setTransitionConfig,
      prefersReducedMotion,
    }),
    [isTransitioning, transitionConfig, setTransitionConfig, prefersReducedMotion]
  );

  return (
    <PageTransitionContext.Provider value={value}>
      <LayoutGroup>{children}</LayoutGroup>
    </PageTransitionContext.Provider>
  );
};

// =============================================================================
// PAGE TRANSITION COMPONENT (Next.js App Router)
// =============================================================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  mode?: "wait" | "sync" | "popLayout";
}

/**
 * PageTransition - Wraps page content for route transitions
 *
 * Integrates with Next.js App Router to provide smooth page transitions.
 * Place this in your layout.tsx to enable transitions between routes.
 *
 * @example
 * // In app/layout.tsx
 * <PageTransitionProvider>
 *   <PageTransition>
 *     {children}
 *   </PageTransition>
 * </PageTransitionProvider>
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  mode = "wait",
}) => {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // Skip animations if user prefers reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        className={cn("w-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// =============================================================================
// FADE TRANSITION (for Tabs)
// =============================================================================

interface FadeTransitionProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
  duration?: number;
  delay?: number;
  unmountOnExit?: boolean;
  onExitComplete?: () => void;
}

/**
 * FadeTransition - Smooth opacity transition
 *
 * Best for tab content changes where content simply fades in/out.
 *
 * @example
 * <Tabs value={activeTab} onValueChange={setActiveTab}>
 *   <TabsContent value="tab1">
 *     <FadeTransition show={activeTab === "tab1"}>
 *       <TabContent />
 *     </FadeTransition>
 *   </TabsContent>
 * </Tabs>
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  show = true,
  className,
  duration = DEFAULT_DURATION,
  delay = 0,
  unmountOnExit = true,
  onExitComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : duration,
        delay,
        ease: DEFAULT_EASE as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : duration * 0.6,
        ease: DEFAULT_EASE as [number, number, number, number],
      },
    },
  };

  if (!unmountOnExit && !show) {
    return (
      <div className={cn("opacity-0 pointer-events-none", className)}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// SLIDE TRANSITION (for Wizard Steps)
// =============================================================================

interface SlideTransitionProps {
  children: React.ReactNode;
  direction?: TransitionDirection;
  show?: boolean;
  className?: string;
  distance?: number;
  duration?: number;
  onExitComplete?: () => void;
}

/**
 * SlideTransition - Directional slide with fade
 *
 * Perfect for wizard steps where content slides in from a direction
 * based on whether the user is moving forward or backward.
 *
 * @example
 * const direction = newStep > currentStep ? "right" : "left";
 *
 * <SlideTransition direction={direction} show key={currentStep}>
 *   <StepContent />
 * </SlideTransition>
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  direction = "right",
  show = true,
  className,
  distance = 30,
  duration = DEFAULT_DURATION,
  onExitComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const getOffset = useCallback(() => {
    const sign = direction === "left" || direction === "up" ? -1 : 1;
    const axis = direction === "left" || direction === "right" ? "x" : "y";
    return { [axis]: sign * distance };
  }, [direction, distance]);

  const getExitOffset = useCallback(() => {
    const sign = direction === "left" || direction === "up" ? 1 : -1;
    const axis = direction === "left" || direction === "right" ? "x" : "y";
    return { [axis]: sign * (distance * 0.5) };
  }, [direction, distance]);

  const variants: Variants = {
    initial: {
      opacity: 0,
      ...getOffset(),
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { ...springConfig, duration },
    },
    exit: {
      opacity: 0,
      ...getExitOffset(),
      transition: {
        duration: prefersReducedMotion ? 0 : duration * 0.6,
        ease: DEFAULT_EASE as [number, number, number, number],
      },
    },
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// ZOOM TRANSITION (for Modals)
// =============================================================================

interface ZoomTransitionProps {
  children: React.ReactNode;
  show?: boolean;
  className?: string;
  scale?: number;
  duration?: number;
  origin?: string;
  onExitComplete?: () => void;
}

/**
 * ZoomTransition - Scale and fade transition
 *
 * Ideal for modals, dialogs, and popups that need to feel
 * like they're emerging from or receding into the background.
 *
 * @example
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <ZoomTransition show={isOpen}>
 *     <DialogContent>...</DialogContent>
 *   </ZoomTransition>
 * </Dialog>
 */
export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  children,
  show = true,
  className,
  scale = 0.92,
  duration = 0.25,
  origin = "center",
  onExitComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    initial: {
      opacity: 0,
      scale,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : {
            ...springConfig,
            stiffness: 400,
            damping: 28,
          },
    },
    exit: {
      opacity: 0,
      scale: scale + 0.03,
      transition: {
        duration: prefersReducedMotion ? 0 : duration * 0.6,
        ease: DEFAULT_EASE as [number, number, number, number],
      },
    },
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
          style={{ transformOrigin: origin }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// SHARED ELEMENT TRANSITION
// =============================================================================

interface SharedElementProps {
  children: React.ReactNode;
  layoutId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SharedElement - Enables shared element transitions
 *
 * When two SharedElements have the same layoutId, Framer Motion
 * will automatically animate between them, creating a seamless
 * visual connection.
 *
 * @example
 * // In a list view
 * <SharedElement layoutId={`card-${item.id}`}>
 *   <CardThumbnail />
 * </SharedElement>
 *
 * // In the detail view
 * <SharedElement layoutId={`card-${item.id}`}>
 *   <CardHero />
 * </SharedElement>
 */
export const SharedElement: React.FC<SharedElementProps> = ({
  children,
  layoutId,
  className,
  style,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      layoutId={prefersReducedMotion ? undefined : layoutId}
      className={className}
      style={style}
      transition={springConfig}
    >
      {children}
    </motion.div>
  );
};

// =============================================================================
// STAGGER CONTAINER (for List Animations)
// =============================================================================

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
  show?: boolean;
}

/**
 * StaggerContainer - Container for staggered child animations
 *
 * Wrap list items or grid items to create a cascading animation effect.
 *
 * @example
 * <StaggerContainer>
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <ListItem {...item} />
 *     </StaggerItem>
 *   ))}
 * </StaggerContainer>
 */
export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  staggerDelay = 0.05,
  delayChildren = 0.1,
  show = true,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren: prefersReducedMotion ? 0 : delayChildren,
      },
    },
    exit: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay * 0.5,
        staggerDirection: -1,
      },
    },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// STAGGER ITEM
// =============================================================================

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

/**
 * StaggerItem - Individual item within a StaggerContainer
 */
export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// =============================================================================
// ANIMATED TAB CONTENT
// =============================================================================

interface AnimatedTabContentProps {
  children: React.ReactNode;
  value: string;
  activeValue: string;
  className?: string;
  direction?: "horizontal" | "vertical";
}

/**
 * AnimatedTabContent - Tab content with directional transitions
 *
 * Automatically determines slide direction based on tab order.
 *
 * @example
 * const tabs = ["overview", "details", "settings"];
 * const [activeTab, setActiveTab] = useState("overview");
 *
 * {tabs.map(tab => (
 *   <AnimatedTabContent
 *     key={tab}
 *     value={tab}
 *     activeValue={activeTab}
 *   >
 *     <TabPanel />
 *   </AnimatedTabContent>
 * ))}
 */
export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = ({
  children,
  value,
  activeValue,
  className,
  direction = "horizontal",
}) => {
  const isActive = value === activeValue;
  const prevValueRef = useRef(activeValue);
  const [slideDirection, setSlideDirection] = useState<TransitionDirection>("right");

  useEffect(() => {
    if (prevValueRef.current !== activeValue) {
      // Determine direction based on position change
      // This is a simple approach - you can customize based on your tab order
      setSlideDirection(direction === "horizontal" ? "right" : "down");
      prevValueRef.current = activeValue;
    }
  }, [activeValue, direction]);

  if (!isActive) return null;

  return (
    <FadeTransition show={isActive} className={className}>
      {children}
    </FadeTransition>
  );
};

// =============================================================================
// WIZARD STEP TRANSITION
// =============================================================================

interface WizardStepTransitionProps {
  children: React.ReactNode;
  currentStep: number;
  stepIndex: number;
  previousStep?: number;
  className?: string;
}

/**
 * WizardStepTransition - Step content with directional awareness
 *
 * Automatically slides content based on whether the user is
 * navigating forward or backward through the wizard.
 *
 * @example
 * <WizardStepTransition
 *   currentStep={currentStep}
 *   stepIndex={0}
 *   previousStep={previousStep}
 * >
 *   <StepOneContent />
 * </WizardStepTransition>
 */
export const WizardStepTransition: React.FC<WizardStepTransitionProps> = ({
  children,
  currentStep,
  stepIndex,
  previousStep = 0,
  className,
}) => {
  const isActive = currentStep === stepIndex;
  const direction: TransitionDirection = currentStep > previousStep ? "right" : "left";

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <SlideTransition
          key={stepIndex}
          direction={direction}
          show={isActive}
          className={className}
        >
          {children}
        </SlideTransition>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// MODAL TRANSITION WRAPPER
// =============================================================================

interface ModalTransitionProps {
  children: React.ReactNode;
  isOpen: boolean;
  className?: string;
  onExitComplete?: () => void;
}

/**
 * ModalTransition - Complete modal animation with backdrop
 *
 * Provides coordinated animations for both the backdrop and content.
 *
 * @example
 * <ModalTransition isOpen={isOpen} onExitComplete={onClose}>
 *   <div className="modal-content">
 *     ...
 *   </div>
 * </ModalTransition>
 */
export const ModalTransition: React.FC<ModalTransitionProps> = ({
  children,
  isOpen,
  className,
  onExitComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const backdropVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: prefersReducedMotion ? 0 : 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.15 },
    },
  };

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          {/* Content */}
          <motion.div
            key="content"
            variants={zoomVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4",
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useExitAnimation - Hook to handle exit animations before unmount
 *
 * @example
 * const { triggerExit, isExiting } = useExitAnimation(onComplete);
 *
 * <FadeTransition show={!isExiting}>
 *   <Button onClick={triggerExit}>Close</Button>
 * </FadeTransition>
 */
export const useExitAnimation = (onComplete?: () => void) => {
  const [isExiting, setIsExiting] = useState(false);

  const triggerExit = useCallback(() => {
    setIsExiting(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    onComplete?.();
    setIsExiting(false);
  }, [onComplete]);

  return { triggerExit, isExiting, handleExitComplete };
};

/**
 * useTransitionDirection - Track direction for wizard-like navigation
 *
 * @example
 * const { direction, navigateTo } = useTransitionDirection(currentStep);
 * navigateTo(newStep); // Automatically sets direction
 */
export const useTransitionDirection = (currentValue: number) => {
  const previousValueRef = useRef(currentValue);
  const [direction, setDirection] = useState<TransitionDirection>("right");

  const navigateTo = useCallback((newValue: number) => {
    setDirection(newValue > previousValueRef.current ? "right" : "left");
    previousValueRef.current = newValue;
  }, []);

  useEffect(() => {
    previousValueRef.current = currentValue;
  }, [currentValue]);

  return { direction, navigateTo };
};

// =============================================================================
// PRESET VARIANTS (Export for custom usage)
// =============================================================================

export const presetVariants = {
  fade: fadeVariants,
  zoom: zoomVariants,
  zoomIn: zoomInVariants,
  slideUp: slideUpVariants,
  slideLeft: createSlideVariants("left"),
  slideRight: createSlideVariants("right"),
  staggerContainer: staggerContainerVariants,
  staggerItem: staggerItemVariants,
};

export const presetTransitions = {
  spring: springConfig,
  smooth: smoothEase,
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  PageTransitionProvider,
  PageTransition,
  FadeTransition,
  SlideTransition,
  ZoomTransition,
  SharedElement,
  StaggerContainer,
  StaggerItem,
  AnimatedTabContent,
  WizardStepTransition,
  ModalTransition,
  usePageTransition,
  useExitAnimation,
  useTransitionDirection,
  presetVariants,
  presetTransitions,
};

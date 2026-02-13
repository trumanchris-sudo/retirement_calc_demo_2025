'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useIsMobile } from '@/components/ui/use-mobile';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Play,
  RotateCcw,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TourStep {
  /** Unique identifier for the step */
  id: string;
  /** CSS selector or ref ID for the target element */
  target: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Description/content of the step */
  content: string;
  /** Position of the tooltip relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional action to perform when this step is shown */
  onShow?: () => void;
  /** Optional action to perform when leaving this step */
  onHide?: () => void;
  /** Whether to highlight the target with a spotlight effect */
  spotlight?: boolean;
  /** Custom spotlight padding around the element */
  spotlightPadding?: number;
  /** Whether clicking outside should advance to next step */
  advanceOnClick?: boolean;
  /** Disable the target element during this step */
  disableTarget?: boolean;
}

interface TourState {
  isActive: boolean;
  currentStep: number;
  isPaused: boolean;
}

interface TourContextValue {
  /** Start the tour from the beginning or a specific step */
  startTour: (stepIndex?: number) => void;
  /** End the tour */
  endTour: () => void;
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  prevStep: () => void;
  /** Go to a specific step */
  goToStep: (index: number) => void;
  /** Pause the tour */
  pauseTour: () => void;
  /** Resume the tour */
  resumeTour: () => void;
  /** Reset the tour (clear "don't show again") */
  resetTour: () => void;
  /** Current tour state */
  state: TourState;
  /** Whether the tour has been completed or dismissed */
  hasSeenTour: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
}

// ============================================================================
// Context
// ============================================================================

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within an AppTourProvider');
  }
  return context;
}

// ============================================================================
// Default Tour Steps for Retirement Calculator
// ============================================================================

export const DEFAULT_CALCULATOR_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="hero"]',
    title: 'Welcome to the Retirement Calculator',
    content:
      'This powerful tool helps you plan your financial future with Monte Carlo simulations, tax optimization, and personalized recommendations.',
    placement: 'bottom',
    spotlight: true,
    spotlightPadding: 20,
  },
  {
    id: 'inputs',
    target: '[data-tour="inputs"]',
    title: 'Your Financial Information',
    content:
      'Start by entering your current age, income, savings, and investment balances. The more accurate your inputs, the better your projections.',
    placement: 'right',
    spotlight: true,
    spotlightPadding: 12,
  },
  {
    id: 'retirement-age',
    target: '[data-tour="retirement-age"]',
    title: 'Set Your Target',
    content:
      'Choose when you want to retire. The calculator will show you if your current savings rate supports this goal.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'monte-carlo',
    target: '[data-tour="monte-carlo"]',
    title: 'Monte Carlo Simulations',
    content:
      'We run thousands of market scenarios to show you the probability of success. This accounts for market volatility and sequence-of-returns risk.',
    placement: 'left',
    spotlight: true,
    spotlightPadding: 16,
  },
  {
    id: 'results',
    target: '[data-tour="results"]',
    title: 'Your Results',
    content:
      'See your projected retirement success rate, estimated portfolio value, and recommendations for improvement.',
    placement: 'top',
    spotlight: true,
  },
  {
    id: 'optimization',
    target: '[data-tour="optimization"]',
    title: 'Optimization Tools',
    content:
      'Use the optimization tab to see how changes to your savings rate, retirement age, or spending can improve your outcomes.',
    placement: 'bottom',
    spotlight: true,
  },
  {
    id: 'next-steps',
    target: '[data-tour="next-steps"]',
    title: 'Personalized Recommendations',
    content:
      'Based on your results, we provide actionable next steps to help you reach your retirement goals.',
    placement: 'top',
    spotlight: true,
  },
];

// ============================================================================
// Spotlight Overlay Component
// ============================================================================

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  padding: number;
  onClick?: () => void;
}

function SpotlightOverlay({ targetRect, padding, onClick }: SpotlightOverlayProps) {
  if (!targetRect) return null;

  const spotlightStyle = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  return (
    <div
      className="fixed inset-0 z-[9998] pointer-events-auto"
      onClick={onClick}
      aria-hidden="true"
    >
      {/* SVG mask for the spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightStyle.left}
              y={spotlightStyle.top}
              width={spotlightStyle.width}
              height={spotlightStyle.height}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Spotlight ring effect */}
      <div
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300 ease-out"
        style={{
          top: spotlightStyle.top,
          left: spotlightStyle.left,
          width: spotlightStyle.width,
          height: spotlightStyle.height,
        }}
      />

      {/* Pulse animation */}
      <div
        className="absolute rounded-lg animate-pulse pointer-events-none"
        style={{
          top: spotlightStyle.top - 4,
          left: spotlightStyle.left - 4,
          width: spotlightStyle.width + 8,
          height: spotlightStyle.height + 8,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)',
        }}
      />
    </div>
  );
}

// ============================================================================
// Tooltip Component
// ============================================================================

interface TourTooltipProps {
  step: TourStep;
  targetRect: DOMRect | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  isMobile: boolean;
}

function TourTooltip({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  isMobile,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');

  // Calculate tooltip position
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const padding = 16;
    const arrowSize = 12;

    let placement = step.placement || 'auto';

    // Auto-placement logic
    if (placement === 'auto') {
      const spaceAbove = targetRect.top;
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceLeft = targetRect.left;
      const spaceRight = viewportWidth - targetRect.right;

      // For mobile, prefer top or bottom
      if (isMobile) {
        placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      } else {
        const maxSpace = Math.max(spaceAbove, spaceBelow, spaceLeft, spaceRight);
        if (maxSpace === spaceAbove) placement = 'top';
        else if (maxSpace === spaceBelow) placement = 'bottom';
        else if (maxSpace === spaceLeft) placement = 'left';
        else placement = 'right';
      }
    }

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top + scrollY - tooltipRect.height - arrowSize - padding;
        left = targetRect.left + scrollX + (targetRect.width - tooltipRect.width) / 2;
        setArrowPosition('bottom');
        break;
      case 'bottom':
        top = targetRect.bottom + scrollY + arrowSize + padding;
        left = targetRect.left + scrollX + (targetRect.width - tooltipRect.width) / 2;
        setArrowPosition('top');
        break;
      case 'left':
        top = targetRect.top + scrollY + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left + scrollX - tooltipRect.width - arrowSize - padding;
        setArrowPosition('right');
        break;
      case 'right':
        top = targetRect.top + scrollY + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + scrollX + arrowSize + padding;
        setArrowPosition('left');
        break;
    }

    // Ensure tooltip stays within viewport
    const minPadding = isMobile ? 8 : 16;
    left = Math.max(minPadding, Math.min(left, viewportWidth - tooltipRect.width - minPadding));
    top = Math.max(minPadding + scrollY, Math.min(top, scrollY + viewportHeight - tooltipRect.height - minPadding));

    setPosition({ top, left });
  }, [targetRect, step.placement, isMobile]);

  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-tooltip-title"
      aria-describedby="tour-tooltip-content"
      className={cn(
        'fixed z-[9999] bg-card border border-border rounded-lg shadow-xl',
        'w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px]',
        'transition-all duration-300 ease-out',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Arrow */}
      <div
        className={cn(
          'absolute w-3 h-3 bg-card border-border rotate-45',
          arrowPosition === 'top' && 'top-[-7px] left-1/2 -translate-x-1/2 border-t border-l',
          arrowPosition === 'bottom' && 'bottom-[-7px] left-1/2 -translate-x-1/2 border-b border-r',
          arrowPosition === 'left' && 'left-[-7px] top-1/2 -translate-y-1/2 border-l border-b',
          arrowPosition === 'right' && 'right-[-7px] top-1/2 -translate-y-1/2 border-r border-t'
        )}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
        aria-label="Close tour"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentIndex + 1} of {totalSteps}
          </span>
          <Progress value={progressPercent} className="flex-1 h-1.5" />
        </div>

        <h3
          id="tour-tooltip-title"
          className="text-base sm:text-lg font-semibold mb-2 pr-6"
        >
          {step.title}
        </h3>

        <p
          id="tour-tooltip-content"
          className="text-sm text-muted-foreground leading-relaxed mb-4"
        >
          {step.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip tour
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirstStep}
              aria-label="Previous step"
            >
              <ChevronLeft className="w-4 h-4" />
              {!isMobile && <span>Back</span>}
            </Button>

            <Button
              size="sm"
              onClick={onNext}
              aria-label={isLastStep ? 'Finish tour' : 'Next step'}
            >
              {isLastStep ? (
                'Finish'
              ) : (
                <>
                  {!isMobile && <span>Next</span>}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Step dots for mobile */}
      {isMobile && totalSteps <= 10 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tour Trigger Button Component
// ============================================================================

export interface TourTriggerProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'icon';
  children?: ReactNode;
}

export function TourTrigger({ className, variant = 'default', children }: TourTriggerProps) {
  const { startTour, hasSeenTour, resetTour } = useTour();

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => startTour()}
        className={className}
        aria-label="Start product tour"
      >
        {children || <Play className="w-4 h-4" />}
      </Button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => startTour()}
        className={cn(
          'text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors',
          className
        )}
      >
        {children || 'Take a tour'}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="outline" size="sm" onClick={() => startTour()}>
        <Play className="w-4 h-4 mr-1" />
        {children || (hasSeenTour ? 'Replay Tour' : 'Take the Tour')}
      </Button>
      {hasSeenTour && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetTour}
          className="text-muted-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Main App Tour Provider
// ============================================================================

export interface AppTourProviderProps {
  children: ReactNode;
  /** Custom tour steps (defaults to calculator tour) */
  steps?: TourStep[];
  /** Storage key for persistence */
  storageKey?: string;
  /** Auto-start tour for new users */
  autoStart?: boolean;
  /** Delay before auto-starting (ms) */
  autoStartDelay?: number;
  /** Callback when tour completes */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
}

export function AppTourProvider({
  children,
  steps = DEFAULT_CALCULATOR_TOUR_STEPS,
  storageKey = 'wdr_app_tour_completed',
  autoStart = false,
  autoStartDelay = 1500,
  onComplete,
  onSkip,
}: AppTourProviderProps) {
  const [hasSeenTour, setHasSeenTour] = useLocalStorage(storageKey, false);
  const [state, setState] = useState<TourState>({
    isActive: false,
    currentStep: 0,
    isPaused: false,
  });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-start tour for new users
  useEffect(() => {
    if (autoStart && !hasSeenTour && mounted) {
      const timer = setTimeout(() => {
        startTour();
      }, autoStartDelay);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasSeenTour, mounted, autoStartDelay]);

  // Update target rect when step changes or window resizes
  useEffect(() => {
    if (!state.isActive || state.isPaused) {
      setTargetRect(null);
      return;
    }

    const currentStep = steps[state.currentStep];
    if (!currentStep) return;

    const updateTargetRect = () => {
      const target = document.querySelector(currentStep.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll target into view if needed
        const viewportHeight = window.innerHeight;
        const padding = 100;
        if (rect.top < padding || rect.bottom > viewportHeight - padding) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Target not found, try again after a short delay (for dynamic content)
        const retryTimer = setTimeout(updateTargetRect, 200);
        return () => clearTimeout(retryTimer);
      }
    };

    updateTargetRect();

    // Handle resize and scroll
    const handleResize = () => {
      requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });

    // Call onShow callback
    currentStep.onShow?.();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      currentStep.onHide?.();
    };
  }, [state.isActive, state.currentStep, state.isPaused, steps]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          endTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, state.currentStep]);

  const startTour = useCallback((stepIndex = 0) => {
    setState({
      isActive: true,
      currentStep: stepIndex,
      isPaused: false,
    });
    // Prevent body scroll during tour
    document.body.style.overflow = 'hidden';
  }, []);

  const endTour = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
    setTargetRect(null);
    setHasSeenTour(true);
    document.body.style.overflow = '';
    onComplete?.();
  }, [onComplete, setHasSeenTour]);

  const skipTour = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
    setTargetRect(null);
    setHasSeenTour(true);
    document.body.style.overflow = '';
    onSkip?.();
  }, [onSkip, setHasSeenTour]);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentStep + 1;
      if (nextIndex >= steps.length) {
        // Tour complete
        setTimeout(endTour, 0);
        return prev;
      }
      return { ...prev, currentStep: nextIndex };
    });
  }, [steps.length, endTour]);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setState((prev) => ({ ...prev, currentStep: index }));
    }
  }, [steps.length]);

  const pauseTour = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
    document.body.style.overflow = '';
  }, []);

  const resumeTour = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
    document.body.style.overflow = 'hidden';
  }, []);

  const resetTour = useCallback(() => {
    setHasSeenTour(false);
    setState({
      isActive: false,
      currentStep: 0,
      isPaused: false,
    });
  }, [setHasSeenTour]);

  const currentStep = steps[state.currentStep];
  const spotlightPadding = currentStep?.spotlightPadding ?? 8;

  const contextValue: TourContextValue = {
    startTour,
    endTour,
    nextStep,
    prevStep,
    goToStep,
    pauseTour,
    resumeTour,
    resetTour,
    state,
    hasSeenTour,
    currentStepIndex: state.currentStep,
    totalSteps: steps.length,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* Tour overlay rendered via portal */}
      {mounted &&
        state.isActive &&
        !state.isPaused &&
        currentStep &&
        createPortal(
          <>
            {/* Spotlight overlay */}
            {currentStep.spotlight && (
              <SpotlightOverlay
                targetRect={targetRect}
                padding={spotlightPadding}
                onClick={currentStep.advanceOnClick ? nextStep : undefined}
              />
            )}

            {/* Tooltip */}
            <TourTooltip
              step={currentStep}
              targetRect={targetRect}
              currentIndex={state.currentStep}
              totalSteps={steps.length}
              onNext={nextStep}
              onPrev={prevStep}
              onSkip={skipTour}
              onClose={endTour}
              isMobile={isMobile}
            />
          </>,
          document.body
        )}
    </TourContext.Provider>
  );
}

// ============================================================================
// Convenience wrapper for standalone usage
// ============================================================================

export interface AppTourProps {
  steps?: TourStep[];
  storageKey?: string;
  autoStart?: boolean;
  autoStartDelay?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  children: ReactNode;
}

export function AppTour({
  steps,
  storageKey,
  autoStart,
  autoStartDelay,
  onComplete,
  onSkip,
  children,
}: AppTourProps) {
  return (
    <AppTourProvider
      steps={steps}
      storageKey={storageKey}
      autoStart={autoStart}
      autoStartDelay={autoStartDelay}
      onComplete={onComplete}
      onSkip={onSkip}
    >
      {children}
    </AppTourProvider>
  );
}

export default AppTour;

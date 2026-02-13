/**
 * ================================================================================
 * APP INTEGRATION PLAN - COMPREHENSIVE COMPONENT REGISTRY
 * ================================================================================
 *
 * This document serves as a planning/documentation file for integrating all
 * newly created components across the retirement calculator application.
 *
 * Generated: 2026-02-13
 * Status: Planning Document (not for production use)
 *
 * ================================================================================
 */

// ================================================================================
// SECTION 1: COMPONENT IMPORTS - ORGANIZED BY DIRECTORY
// ================================================================================

// =============================================================================
// 1A. CALCULATOR COMPONENTS (/components/calculator/)
// =============================================================================
//
// Core calculator UI components that power the main retirement planning interface.
// These components handle input, visualization, and result display.

// --- ANIMATION & SPLASH ---
// export { default as CyberpunkSplash } from './calculator/CyberpunkSplash';
// export type { CyberpunkSplashHandle } from './calculator/CyberpunkSplash';

// --- STATUS INDICATORS ---
// export { LastCalculatedBadge } from './calculator/LastCalculatedBadge';
// export type { LastCalculatedBadgeProps } from './calculator/LastCalculatedBadge';

// --- MONTE CARLO VISUALIZATION ---
// export { MonteCarloVisualizer } from './calculator/MonteCarloVisualizerWrapper';
// Note: This is actually MonteCarloErrorBoundary exported as MonteCarloVisualizer

// --- RESULTS & RECOMMENDATIONS ---
// export { NextStepsCard } from './calculator/NextStepsCard';
// export { default as OptimizationTab } from './calculator/OptimizationTab';
// export { SpendingFlexibilityChart } from './calculator/SpendingFlexibilityChart';

// --- TAB NAVIGATION ---
// export { TabPanel } from './calculator/TabPanel';
// export type { TabPanelProps } from './calculator/TabPanel';
// Note: Depends on MainTabId from TabNavigation.tsx

// --- TIMELINE ---
// export { TimelineView } from './calculator/TimelineView';

// =============================================================================
// 1B. UI COMPONENTS (/components/ui/)
// =============================================================================
//
// Reusable UI primitives and custom UI components built on top of shadcn/ui.

// --- CUSTOM UI COMPONENTS ---
// export { AnimatedSection } from './ui/AnimatedSection';
// export { InfoTooltip, TOOLTIP_CONTENT } from './ui/InfoTooltip';
// export { PopCard } from './ui/PopCard';
// export { ScrollIndicator } from './ui/ScrollIndicator';

// =============================================================================
// 1C. EDUCATION COMPONENTS (/components/education/)
// =============================================================================
//
// Educational content components that explain retirement planning concepts.
// Already has a barrel export at ./education/index.ts

// export {
//   // Types
//   EducationTopic,
//   EducationProgressType,
//   EDUCATION_TOPICS,
//   TOTAL_TOPICS,
//   // Hook
//   useEducationProgress,
//   // Explainer Components
//   WhyRothIsBetter,
//   TenYearRuleExplainer,
//   TaxBracketsSimplified,
//   CompoundGrowthVisualizer,
//   RichPeoplePlaybook,
//   // Integration Components
//   EducationModal,
//   EducationInfoIcon,
//   EducationLink,
//   EducationProgress,
//   EducationProgressCompact,
//   EducationComplete,
// } from './education';

// =============================================================================
// 1D. ONBOARDING COMPONENTS (/components/onboarding/)
// =============================================================================
//
// Guided onboarding flow components for first-time users.

// --- INPUT COMPONENTS ---
// export { ConsoleInput } from './onboarding/ConsoleInput';

// --- MESSAGE DISPLAY ---
// export { MessageBubble } from './onboarding/MessageBubble';
// export { StreamingMessage } from './onboarding/StreamingMessage';

// --- STEP COMPONENTS ---
// export { ReviewStep } from './onboarding/steps/ReviewStep';

// =============================================================================
// 1E. VISUALIZATION COMPONENTS (/components/visualizations/)
// =============================================================================
//
// Advanced data visualization components for financial data.

// export { HeatmapCalendar } from './visualizations/HeatmapCalendar';
// export type { DailyContribution, HeatmapCalendarProps } from './visualizations/HeatmapCalendar';

// export { RadarChart } from './visualizations/RadarChart';
// export type { RadarAxis, RadarScenario, RadarChartProps } from './visualizations/RadarChart';

// export { SankeyDiagram } from './visualizations/SankeyDiagram';
// export { Treemap } from './visualizations/Treemap';
// export type { TreemapNode, TreemapProps, ColorScheme } from './visualizations/Treemap';

// export { WaterfallChart } from './visualizations/WaterfallChart';
// export type { WaterfallDataPoint, WaterfallChartProps, WaterfallCategory } from './visualizations/WaterfallChart';


// ================================================================================
// SECTION 2: COMPONENT REGISTRY
// ================================================================================

/**
 * Complete registry of all new components with metadata
 */
export const COMPONENT_REGISTRY = {
  // ===========================================================================
  // CALCULATOR COMPONENTS
  // ===========================================================================
  calculator: {
    // -------------------------------------------------------------------------
    // CyberpunkSplash - Animation overlay during Monte Carlo calculations
    // -------------------------------------------------------------------------
    CyberpunkSplash: {
      path: '/components/calculator/CyberpunkSplash.tsx',
      status: 'complete',
      type: 'animation',
      exports: ['default', 'CyberpunkSplashHandle (type)'],
      props: {
        className: { type: 'string', optional: true, description: 'Custom CSS class' },
      },
      imperativeHandle: {
        play: { description: 'Triggers the animation sequence (~2.5s duration)' },
      },
      dependencies: ['react'],
      usage: `
        const splashRef = useRef<CyberpunkSplashHandle>(null);
        <CyberpunkSplash ref={splashRef} />
        // Trigger: splashRef.current?.play();
      `,
      notes: [
        'Uses forwardRef with imperative handle pattern',
        'Purple diagonal bars animation with "WORK DIE RETIRE" text',
        'Self-contained animation state management',
        'Accessible with role="status" announcement',
      ],
    },

    // -------------------------------------------------------------------------
    // LastCalculatedBadge - Shows calculation timestamp and modification status
    // -------------------------------------------------------------------------
    LastCalculatedBadge: {
      path: '/components/calculator/LastCalculatedBadge.tsx',
      status: 'complete',
      type: 'indicator',
      exports: ['LastCalculatedBadge', 'LastCalculatedBadgeProps (type)'],
      props: {
        lastCalculated: { type: 'Date | null', required: true, description: 'When calculation was last run' },
        inputsModified: { type: 'boolean', required: true, description: 'Whether inputs changed since last calc' },
      },
      dependencies: ['@/components/ui/badge', 'lucide-react'],
      usage: `
        <LastCalculatedBadge
          lastCalculated={lastCalcDate}
          inputsModified={hasChanges}
        />
      `,
      notes: [
        'Auto-updates time display every second',
        'Shows warning badge when inputs are modified',
        'Returns null when no calculation has been run',
      ],
    },

    // -------------------------------------------------------------------------
    // MonteCarloVisualizerWrapper - Error boundary wrapper for Monte Carlo viz
    // -------------------------------------------------------------------------
    MonteCarloVisualizerWrapper: {
      path: '/components/calculator/MonteCarloVisualizerWrapper.tsx',
      status: 'needs-work',
      type: 'visualization',
      exports: ['MonteCarloVisualizer (actually MonteCarloErrorBoundary)'],
      props: {
        isRunning: { type: 'boolean', optional: true, description: 'Whether simulation is running' },
        visible: { type: 'boolean', optional: true, default: true, description: 'Visibility toggle' },
      },
      dependencies: [
        './MonteCarloVisualizer (MISSING - must be created)',
        '@/components/ui/card',
      ],
      missingDependencies: ['./MonteCarloVisualizer'],
      usage: `
        <MonteCarloVisualizer isRunning={isSimulating} visible={showViz} />
      `,
      notes: [
        'CRITICAL: Imports MonteCarloVisualizer.tsx which does NOT exist',
        'Component is an error boundary wrapper',
        'Need to create actual MonteCarloVisualizer component',
        'Shows error UI with retry button on crash',
      ],
    },

    // -------------------------------------------------------------------------
    // NextStepsCard - Personalized recommendation card based on results
    // -------------------------------------------------------------------------
    NextStepsCard: {
      path: '/components/calculator/NextStepsCard.tsx',
      status: 'complete',
      type: 'recommendations',
      exports: ['NextStepsCard'],
      props: {
        result: { type: 'CalculationResult | null', required: true, description: 'Calculation results' },
        batchSummary: { type: 'BatchSummary | null', required: true, description: 'Monte Carlo batch summary' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/types/calculator',
        '@/types/planner',
        'lucide-react',
      ],
      usage: `
        <NextStepsCard result={calcResult} batchSummary={batchData} />
      `,
      notes: [
        'Generates 2-4 personalized suggestions based on success rate',
        'Different suggestions for <75%, 75-90%, and >90% success rates',
        'Includes tax optimization suggestions when effective rate >20%',
        'Shows disclaimer about not being financial advice',
      ],
    },

    // -------------------------------------------------------------------------
    // OptimizationTab - Financial freedom analysis panel
    // -------------------------------------------------------------------------
    OptimizationTab: {
      path: '/components/calculator/OptimizationTab.tsx',
      status: 'needs-work',
      type: 'analysis',
      exports: ['default'],
      props: {
        inputs: { type: 'any', required: true, description: 'Calculator inputs (needs typing)' },
        currentAge: { type: 'number', required: true, description: 'User current age' },
        plannedRetirementAge: { type: 'number', required: true, description: 'Target retirement age' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/components/ui/badge',
        'lucide-react',
        '/monte-carlo-worker.js (Web Worker)',
      ],
      missingDependencies: ['/public/monte-carlo-worker.js'],
      usage: `
        <OptimizationTab
          inputs={calculatorInputs}
          currentAge={35}
          plannedRetirementAge={65}
        />
      `,
      notes: [
        'Uses Web Worker for optimization calculations',
        'Shows: Splurge Capacity, Freedom Date analysis',
        '"Live a Little" assessment section is commented out',
        'Worker must support "optimize" message type',
        'NEEDS: Proper typing for inputs prop',
        'NEEDS: Worker file at /public/monte-carlo-worker.js',
      ],
    },

    // -------------------------------------------------------------------------
    // SpendingFlexibilityChart - Guardrails impact visualization
    // -------------------------------------------------------------------------
    SpendingFlexibilityChart: {
      path: '/components/calculator/SpendingFlexibilityChart.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['SpendingFlexibilityChart'],
      props: {
        guardrailsResult: { type: 'GuardrailsResult | null', required: true, description: 'Guardrails analysis data' },
        isCalculating: { type: 'boolean', optional: true, description: 'Loading state' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/components/ui/badge',
        '@/types/planner',
        'lucide-react',
      ],
      usage: `
        <SpendingFlexibilityChart
          guardrailsResult={guardrailsData}
          isCalculating={isLoading}
        />
      `,
      notes: [
        'Shows before/after success rates with visual bars',
        'Includes implementation guidance for spending guardrails',
        'Uses React.memo for performance optimization',
        'Returns null when no failures to prevent',
      ],
    },

    // -------------------------------------------------------------------------
    // TabPanel - Tab content container with visibility control
    // -------------------------------------------------------------------------
    TabPanel: {
      path: '/components/calculator/TabPanel.tsx',
      status: 'needs-work',
      type: 'layout',
      exports: ['TabPanel', 'TabPanelProps (type)'],
      props: {
        id: { type: 'MainTabId', required: true, description: 'Panel identifier matching tab' },
        activeTab: { type: 'MainTabId', required: true, description: 'Currently active tab' },
        children: { type: 'ReactNode', required: true, description: 'Panel content' },
        className: { type: 'string', optional: true, description: 'Custom CSS class' },
      },
      dependencies: [
        '@/lib/utils',
        './TabNavigation (for MainTabId type)',
      ],
      missingDependencies: ['./TabNavigation (needs MainTabId export)'],
      usage: `
        <TabPanel id="results" activeTab={currentTab}>
          <ResultsContent />
        </TabPanel>
      `,
      notes: [
        'Supports "all" tab which shows all panels',
        'Uses proper ARIA attributes for accessibility',
        'Returns null when panel should be hidden',
        'NEEDS: MainTabId type from TabNavigation.tsx',
      ],
    },

    // -------------------------------------------------------------------------
    // TimelineView - Retirement milestones timeline
    // -------------------------------------------------------------------------
    TimelineView: {
      path: '/components/calculator/TimelineView.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['TimelineView'],
      props: {
        result: { type: 'CalculationResult', required: true, description: 'Calculation results' },
        currentAge: { type: 'number', required: true, description: 'User current age' },
        retirementAge: { type: 'number', required: true, description: 'Target retirement age' },
        spouseAge: { type: 'number', optional: true, description: 'Spouse age if married' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/components/ui/badge',
        '@/types/calculator',
        'lucide-react',
      ],
      usage: `
        <TimelineView
          result={calcResult}
          currentAge={35}
          retirementAge={65}
        />
      `,
      notes: [
        'Shows key milestones: Today, Retirement, Medicare, SS, RMD, LTC, Estate',
        'Horizontally scrollable on mobile',
        'Uses React.memo for performance',
        'Fixed milestone ages: Medicare=65, SS=67, RMD=73, LTC=80, Estate=95',
      ],
    },
  },

  // ===========================================================================
  // UI COMPONENTS
  // ===========================================================================
  ui: {
    // -------------------------------------------------------------------------
    // AnimatedSection - Intersection observer animation wrapper
    // -------------------------------------------------------------------------
    AnimatedSection: {
      path: '/components/ui/AnimatedSection.tsx',
      status: 'complete',
      type: 'animation',
      exports: ['AnimatedSection'],
      props: {
        children: { type: 'ReactNode', required: true, description: 'Content to animate' },
        className: { type: 'string', optional: true, description: 'Custom CSS class' },
        delay: { type: 'number', optional: true, default: 0, description: 'Animation delay in ms' },
        animation: {
          type: '"fade-in" | "slide-up" | "slide-in-from-bottom" | "scale-in"',
          optional: true,
          default: '"slide-up"',
          description: 'Animation type',
        },
        duration: { type: 'number', optional: true, default: 600, description: 'Animation duration in ms' },
        threshold: { type: 'number', optional: true, default: 0.1, description: 'Intersection threshold (0-1)' },
      },
      dependencies: ['@/lib/utils'],
      usage: `
        <AnimatedSection animation="slide-up" delay={200}>
          <Card>...</Card>
        </AnimatedSection>
      `,
      notes: [
        'Uses IntersectionObserver for scroll-triggered animations',
        'Handles immediate visibility on mount',
        'Unobserves after first animation trigger',
        'CSS-based animations using Tailwind classes',
      ],
    },

    // -------------------------------------------------------------------------
    // InfoTooltip - Help icon with tooltip content
    // -------------------------------------------------------------------------
    InfoTooltip: {
      path: '/components/ui/InfoTooltip.tsx',
      status: 'complete',
      type: 'help',
      exports: ['InfoTooltip', 'TOOLTIP_CONTENT'],
      props: {
        content: { type: 'string', required: true, description: 'Tooltip text content' },
        learnMoreLink: { type: 'string', optional: true, description: 'Optional link URL' },
        learnMoreText: { type: 'string', optional: true, default: '"Learn more →"', description: 'Link text' },
        side: { type: '"top" | "right" | "bottom" | "left"', optional: true, default: '"top"', description: 'Tooltip position' },
        className: { type: 'string', optional: true, description: 'Custom CSS class' },
      },
      dependencies: [
        '@/components/ui/tooltip',
        'lucide-react',
        'next/link',
      ],
      usage: `
        <InfoTooltip
          content={TOOLTIP_CONTENT.successRate.content}
          learnMoreLink={TOOLTIP_CONTENT.successRate.learnMoreLink}
        />
      `,
      constants: {
        TOOLTIP_CONTENT: 'Predefined content for: successRate, endOfLifeWealth, freedomDate, generationalWealth, afterTaxWithdrawal, rothConversion, sequenceRisk, safeWithdrawalRate',
      },
      notes: [
        'Uses shadcn/ui Tooltip component',
        'Includes predefined content for common concepts',
        'Learn more links use # placeholder (need real links)',
      ],
    },

    // -------------------------------------------------------------------------
    // PopCard - Framer Motion animated card
    // -------------------------------------------------------------------------
    PopCard: {
      path: '/components/ui/PopCard.tsx',
      status: 'complete',
      type: 'layout',
      exports: ['PopCard'],
      props: {
        children: { type: 'ReactNode', required: true, description: 'Card content' },
      },
      dependencies: ['framer-motion', 'next/dynamic'],
      usage: `
        <PopCard>
          <h3>Card Title</h3>
          <p>Content...</p>
        </PopCard>
      `,
      notes: [
        'Uses dynamic import for framer-motion (client-side only)',
        'Fade-in + slide animation on mount',
        'Subtle scale on hover (1.01)',
        'Basic styling: rounded-xl border p-4',
      ],
    },

    // -------------------------------------------------------------------------
    // ScrollIndicator - Floating scroll-to-results button
    // -------------------------------------------------------------------------
    ScrollIndicator: {
      path: '/components/ui/ScrollIndicator.tsx',
      status: 'complete',
      type: 'navigation',
      exports: ['ScrollIndicator'],
      props: {
        targetId: { type: 'string', required: true, description: 'ID of element to scroll to' },
        show: { type: 'boolean', required: true, description: 'Whether to show indicator' },
      },
      dependencies: ['lucide-react'],
      usage: `
        <ScrollIndicator targetId="results-section" show={hasResults} />
      `,
      notes: [
        'Auto-hides after 5 seconds',
        'Smooth scroll behavior',
        'Fixed position at bottom center',
        'Bouncing animation for attention',
        'Uses no-print class for PDF exclusion',
      ],
    },
  },

  // ===========================================================================
  // EDUCATION COMPONENTS
  // ===========================================================================
  education: {
    // -------------------------------------------------------------------------
    // Module Index - Already has barrel export
    // -------------------------------------------------------------------------
    index: {
      path: '/components/education/index.ts',
      status: 'complete',
      type: 'barrel',
      exports: [
        'EducationTopic (type)',
        'EducationProgressType (type)',
        'EDUCATION_TOPICS',
        'TOTAL_TOPICS',
        'useEducationProgress',
        'WhyRothIsBetter',
        'TenYearRuleExplainer',
        'TaxBracketsSimplified',
        'CompoundGrowthVisualizer',
        'RichPeoplePlaybook',
        'EducationModal',
        'EducationInfoIcon',
        'EducationLink',
        'EducationProgress',
        'EducationProgressCompact',
        'EducationComplete',
      ],
      notes: ['Barrel export already exists - use this for imports'],
    },

    // -------------------------------------------------------------------------
    // EducationModal - Full-screen education content modal
    // -------------------------------------------------------------------------
    EducationModal: {
      path: '/components/education/EducationModal.tsx',
      status: 'complete',
      type: 'modal',
      exports: ['EducationModal'],
      props: {
        topic: { type: 'EducationTopic | null', required: true, description: 'Topic to display' },
        isOpen: { type: 'boolean', required: true, description: 'Modal open state' },
        onClose: { type: '() => void', required: true, description: 'Close callback' },
        onMarkComplete: { type: '() => void', optional: true, description: 'Completion callback' },
      },
      dependencies: [
        '@/components/ui/dialog',
        '@/components/ui/scroll-area',
        '@/components/ui/button',
        './types',
        './useEducationProgress',
        'next/dynamic (for lazy loading)',
      ],
      usage: `
        <EducationModal
          topic="roth-vs-traditional"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      `,
      notes: [
        'Auto-marks as complete after 30 seconds of viewing',
        'Lazy loads education content for performance',
        'Shows completion status in header',
        'Supports 5 topics: roth-vs-traditional, ten-year-rule, tax-brackets, compound-growth, wealthy-strategies',
      ],
    },

    // -------------------------------------------------------------------------
    // useEducationProgress - Progress tracking hook
    // -------------------------------------------------------------------------
    useEducationProgress: {
      path: '/components/education/useEducationProgress.ts',
      status: 'complete',
      type: 'hook',
      exports: ['useEducationProgress'],
      returns: {
        progress: 'EducationProgress - Full progress object',
        markCompleted: '(topic: EducationTopic) => void',
        markViewed: '(topic: EducationTopic) => void',
        isCompleted: '(topic: EducationTopic) => boolean',
        completedCount: 'number',
        totalCount: 'number',
        progressPercent: 'number',
        resetProgress: '() => void',
        isLoaded: 'boolean',
      },
      dependencies: ['./types'],
      usage: `
        const { markCompleted, isCompleted, progressPercent } = useEducationProgress();
      `,
      notes: [
        'Persists to localStorage with key "retirement_calc_education_progress"',
        'Handles SSR with isLoaded flag',
        'Tracks lastViewedAt timestamps',
      ],
    },
  },

  // ===========================================================================
  // ONBOARDING COMPONENTS
  // ===========================================================================
  onboarding: {
    // -------------------------------------------------------------------------
    // ConsoleInput - Terminal-style text input
    // -------------------------------------------------------------------------
    ConsoleInput: {
      path: '/components/onboarding/ConsoleInput.tsx',
      status: 'complete',
      type: 'input',
      exports: ['ConsoleInput'],
      props: {
        value: { type: 'string', required: true, description: 'Input value' },
        onChange: { type: '(value: string) => void', required: true, description: 'Change handler' },
        onSend: { type: '() => void', required: true, description: 'Send handler' },
        onKeyDown: { type: '(e: KeyboardEvent) => void', required: true, description: 'Keyboard handler' },
        onFocus: { type: '() => void', optional: true, description: 'Focus handler' },
        disabled: { type: 'boolean', optional: true, description: 'Disabled state' },
        placeholder: { type: 'string', optional: true, description: 'Placeholder text' },
      },
      dependencies: [
        '@/components/ui/button',
        '@/lib/utils',
        'lucide-react',
      ],
      usage: `
        <ConsoleInput
          ref={inputRef}
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
        />
      `,
      notes: [
        'Uses forwardRef for textarea access',
        'Terminal/console styling (black bg, green text)',
        'Shows Ctrl+Enter hint on desktop only',
        '16px font size to prevent iOS auto-zoom',
        'Auto-resize textarea with max-height',
      ],
    },

    // -------------------------------------------------------------------------
    // MessageBubble - Chat message display with streaming
    // -------------------------------------------------------------------------
    MessageBubble: {
      path: '/components/onboarding/MessageBubble.tsx',
      status: 'complete',
      type: 'display',
      exports: ['MessageBubble'],
      props: {
        message: { type: 'ConversationMessage', required: true, description: 'Message data' },
        isLatest: { type: 'boolean', optional: true, description: 'Enable streaming for latest message' },
      },
      dependencies: ['@/types/ai-onboarding'],
      usage: `
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isLatest={i === messages.length - 1}
          />
        ))}
      `,
      notes: [
        'Terminal-style display ("> you" / "$ wizard")',
        'Typewriter streaming effect for assistant messages',
        '~67 chars/second streaming speed',
        'Only streams the latest assistant message',
      ],
    },

    // -------------------------------------------------------------------------
    // StreamingMessage - Modern chat bubble with streaming
    // -------------------------------------------------------------------------
    StreamingMessage: {
      path: '/components/onboarding/StreamingMessage.tsx',
      status: 'complete',
      type: 'display',
      exports: ['StreamingMessage'],
      props: {
        content: { type: 'string', required: true, description: 'Message content' },
      },
      dependencies: ['lucide-react'],
      usage: `
        <StreamingMessage content={partialResponse} />
      `,
      notes: [
        'Modern chat bubble style (vs terminal style of MessageBubble)',
        'Bot icon with gradient background',
        'Pulsing cursor animation',
        'Glassmorphism design with blur/border',
      ],
    },

    // -------------------------------------------------------------------------
    // ReviewStep - Onboarding summary and run button
    // -------------------------------------------------------------------------
    ReviewStep: {
      path: '/components/onboarding/steps/ReviewStep.tsx',
      status: 'complete',
      type: 'wizard-step',
      exports: ['ReviewStep'],
      props: {
        wizardData: { type: 'OnboardingWizardData', required: true, description: 'Collected wizard data' },
        onRunPlan: { type: '() => void', required: true, description: 'Run plan callback' },
        isSubmitting: { type: 'boolean', required: true, description: 'Submission loading state' },
      },
      dependencies: [
        '@/components/ui/button',
        '@/components/ui/card',
        '@/types/onboarding',
        'lucide-react',
      ],
      usage: `
        <ReviewStep
          wizardData={wizardState}
          onRunPlan={handleRunPlan}
          isSubmitting={isLoading}
        />
      `,
      notes: [
        'Shows summary cards: Personal Info, Income & Savings, Retirement Goals',
        'Calculates total annual savings and savings rate',
        'Uses IRS_LIMITS_2026 constants',
        'Includes reassuring message about not needing perfection',
      ],
    },
  },

  // ===========================================================================
  // VISUALIZATION COMPONENTS
  // ===========================================================================
  visualizations: {
    // -------------------------------------------------------------------------
    // HeatmapCalendar - GitHub-style contribution calendar
    // -------------------------------------------------------------------------
    HeatmapCalendar: {
      path: '/components/visualizations/HeatmapCalendar.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['HeatmapCalendar', 'DailyContribution (type)', 'HeatmapCalendarProps (type)'],
      props: {
        contributions: { type: 'DailyContribution[]', required: true, description: 'Daily contribution data' },
        initialYear: { type: 'number', optional: true, description: 'Starting year' },
        availableYears: { type: 'number[]', optional: true, description: 'Selectable years' },
        colorScheme: { type: '"green" | "blue" | "purple" | "emerald"', optional: true, description: 'Color theme' },
        onDayClick: { type: '(date, contribution) => void', optional: true, description: 'Day click handler' },
        showStreaks: { type: 'boolean', optional: true, description: 'Show streak indicators' },
        showMonthlyTotals: { type: 'boolean', optional: true, description: 'Show monthly totals' },
        targetDailyAmount: { type: 'number', optional: true, description: 'Target for streak calculation' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/components/ui/badge',
        '@/components/ui/tooltip',
        '@/lib/utils (fmt)',
        'lucide-react',
      ],
      usage: `
        <HeatmapCalendar
          contributions={dailyData}
          colorScheme="green"
          showStreaks
          showMonthlyTotals
        />
      `,
      notes: [
        'GitHub-style yearly contribution heatmap',
        '5 intensity levels based on contribution amount',
        'Streak tracking with current/longest streaks',
        'Year navigation with arrow buttons',
      ],
    },

    // -------------------------------------------------------------------------
    // RadarChart - Multi-axis financial profile comparison
    // -------------------------------------------------------------------------
    RadarChart: {
      path: '/components/visualizations/RadarChart.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['RadarChart', 'RadarAxis (type)', 'RadarScenario (type)', 'RadarChartProps (type)'],
      props: {
        scenarios: { type: 'RadarScenario[]', required: true, description: 'Scenarios to compare' },
        size: { type: 'number', optional: true, description: 'Chart size in pixels' },
        showLegend: { type: 'boolean', optional: true, description: 'Show legend' },
        animateOnMount: { type: 'boolean', optional: true, description: 'Animate drawing' },
        animationDuration: { type: 'number', optional: true, description: 'Animation duration (seconds)' },
        onAxisClick: { type: '(axis: RadarAxis) => void', optional: true, description: 'Axis click handler' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/components/ui/badge',
        '@/components/ui/popover',
        'framer-motion',
        'lucide-react',
      ],
      usage: `
        <RadarChart
          scenarios={[userProfile, optimalProfile]}
          showLegend
          animateOnMount
        />
      `,
      notes: [
        'Uses framer-motion for animations',
        'Built-in axis explanations for financial metrics',
        'Includes tips for improvement on each axis',
        'Supports multiple scenario overlays for comparison',
      ],
    },

    // -------------------------------------------------------------------------
    // SankeyDiagram - Income flow visualization
    // -------------------------------------------------------------------------
    SankeyDiagram: {
      path: '/components/visualizations/SankeyDiagram.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['SankeyDiagram'],
      props: {
        incomeSources: { type: 'IncomeSource[]', optional: true, description: 'Income sources' },
        accounts: { type: 'AccountNode[]', optional: true, description: 'Account nodes' },
        spendingCategories: { type: 'SpendingCategory[]', optional: true, description: 'Spending categories' },
        flows: { type: 'FlowLink[]', optional: true, description: 'Flow connections' },
        animated: { type: 'boolean', optional: true, description: 'Enable animations' },
        showParticles: { type: 'boolean', optional: true, description: 'Show flowing particles' },
        particleCount: { type: 'number', optional: true, description: 'Number of particles' },
        particleSpeed: { type: 'number', optional: true, description: 'Particle animation speed' },
      },
      dependencies: [
        '@/lib/utils (cn, fmt)',
        'framer-motion',
      ],
      usage: `
        <SankeyDiagram
          incomeSources={income}
          accounts={accounts}
          spendingCategories={spending}
          animated
          showParticles
        />
      `,
      notes: [
        'Shows money flow: Income -> Accounts -> Spending',
        'Visualizes tax leakage per account',
        'Particle animation for money flow visualization',
        'Has default data for demo purposes',
      ],
    },

    // -------------------------------------------------------------------------
    // Treemap - Portfolio composition drill-down
    // -------------------------------------------------------------------------
    Treemap: {
      path: '/components/visualizations/Treemap.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['Treemap', 'TreemapNode (type)', 'TreemapProps (type)', 'ColorScheme (type)'],
      props: {
        data: { type: 'TreemapNode', required: true, description: 'Hierarchical portfolio data' },
        colorScheme: { type: '"accountType" | "assetClass" | "risk" | "performance"', optional: true, description: 'Color mode' },
        height: { type: 'number', optional: true, description: 'Chart height' },
        onNodeClick: { type: '(node, path) => void', optional: true, description: 'Node click handler' },
        showLegend: { type: 'boolean', optional: true, description: 'Show legend' },
        showTooltips: { type: 'boolean', optional: true, description: 'Enable tooltips' },
        minCellSize: { type: 'number', optional: true, description: 'Minimum cell size' },
      },
      dependencies: [
        '@/components/ui/breadcrumb',
        '@/components/ui/card',
        '@/components/ui/badge',
        '@/components/ui/button',
        '@/components/ui/tooltip',
        '@/lib/utils (cn, fmt, fmtPercent)',
        'framer-motion',
        'lucide-react',
      ],
      usage: `
        <Treemap
          data={portfolioHierarchy}
          colorScheme="accountType"
          showLegend
          showTooltips
        />
      `,
      notes: [
        'Drill-down navigation with breadcrumbs',
        'Multiple color schemes for different views',
        'Shows YTD returns when performance scheme active',
        'Zoom in/out controls',
      ],
    },

    // -------------------------------------------------------------------------
    // WaterfallChart - Income to net visualization
    // -------------------------------------------------------------------------
    WaterfallChart: {
      path: '/components/visualizations/WaterfallChart.tsx',
      status: 'complete',
      type: 'visualization',
      exports: ['WaterfallChart', 'WaterfallDataPoint (type)', 'WaterfallChartProps (type)', 'WaterfallCategory (type)'],
      props: {
        data: { type: 'WaterfallDataPoint[]', required: true, description: 'Chart data points' },
        title: { type: 'string', optional: true, description: 'Chart title' },
        description: { type: 'string', optional: true, description: 'Chart description' },
        height: { type: 'number', optional: true, description: 'Chart height' },
        showRunningTotal: { type: 'boolean', optional: true, description: 'Show cumulative line' },
        showConnectors: { type: 'boolean', optional: true, description: 'Show connecting lines' },
        animated: { type: 'boolean', optional: true, description: 'Animate bars' },
        colors: { type: 'Partial<Record<WaterfallCategory, string>>', optional: true, description: 'Custom colors' },
        formatValue: { type: '(value: number) => string', optional: true, description: 'Value formatter' },
      },
      dependencies: [
        '@/components/ui/card',
        '@/lib/utils (cn, fmt)',
        'recharts',
      ],
      usage: `
        <WaterfallChart
          data={incomeToNetData}
          title="Annual Income Breakdown"
          showRunningTotal
          animated
        />
      `,
      notes: [
        'Uses Recharts ComposedChart',
        'Categories: income, tax, expense, savings, total',
        'Running total line overlay option',
        'Loading skeleton state support',
      ],
    },
  },
} as const;


// ================================================================================
// SECTION 3: BARREL EXPORTS NEEDED
// ================================================================================

/**
 * INDEX FILES THAT NEED TO BE CREATED
 *
 * These barrel exports should be created to enable clean imports across the app.
 */

// -----------------------------------------------------------------------------
// /components/calculator/index.ts (NEEDS CREATION)
// -----------------------------------------------------------------------------
const calculatorIndexContent = `
// Calculator component exports
export { default as CyberpunkSplash } from './CyberpunkSplash';
export type { CyberpunkSplashHandle } from './CyberpunkSplash';

export { LastCalculatedBadge } from './LastCalculatedBadge';
export type { LastCalculatedBadgeProps } from './LastCalculatedBadge';

export { MonteCarloVisualizer } from './MonteCarloVisualizerWrapper';

export { NextStepsCard } from './NextStepsCard';

export { default as OptimizationTab } from './OptimizationTab';

export { SpendingFlexibilityChart } from './SpendingFlexibilityChart';

export { TabPanel } from './TabPanel';
export type { TabPanelProps } from './TabPanel';

export { TimelineView } from './TimelineView';

// Additional calculator components can be exported as needed
`;

// -----------------------------------------------------------------------------
// /components/ui/index.ts (NEEDS CREATION - custom components only)
// -----------------------------------------------------------------------------
const uiIndexContent = `
// Custom UI component exports (supplements shadcn/ui components)
export { AnimatedSection } from './AnimatedSection';
export { InfoTooltip, TOOLTIP_CONTENT } from './InfoTooltip';
export { PopCard } from './PopCard';
export { ScrollIndicator } from './ScrollIndicator';

// Note: shadcn/ui components have their own files (accordion.tsx, etc.)
// Import those directly: import { Button } from '@/components/ui/button'
`;

// -----------------------------------------------------------------------------
// /components/onboarding/index.ts (NEEDS CREATION)
// -----------------------------------------------------------------------------
const onboardingIndexContent = `
// Onboarding component exports
export { ConsoleInput } from './ConsoleInput';
export { MessageBubble } from './MessageBubble';
export { StreamingMessage } from './StreamingMessage';
export { ReviewStep } from './steps/ReviewStep';
`;

// -----------------------------------------------------------------------------
// /components/visualizations/index.ts (NEEDS CREATION)
// -----------------------------------------------------------------------------
const visualizationsIndexContent = `
// Visualization component exports
export { HeatmapCalendar } from './HeatmapCalendar';
export type { DailyContribution, HeatmapCalendarProps } from './HeatmapCalendar';

export { default as RadarChart } from './RadarChart';
export type { RadarAxis, RadarScenario, RadarChartProps } from './RadarChart';

export { default as SankeyDiagram } from './SankeyDiagram';

export { default as Treemap } from './Treemap';
export type { TreemapNode, TreemapProps, ColorScheme } from './Treemap';

export { default as WaterfallChart } from './WaterfallChart';
export type { WaterfallDataPoint, WaterfallChartProps, WaterfallCategory } from './WaterfallChart';
`;


// ================================================================================
// SECTION 4: MISSING DEPENDENCIES
// ================================================================================

/**
 * CRITICAL MISSING DEPENDENCIES
 *
 * These files/components are imported but do not exist:
 */
export const MISSING_DEPENDENCIES = {
  critical: [
    {
      file: '/components/calculator/MonteCarloVisualizer.tsx',
      importedBy: '/components/calculator/MonteCarloVisualizerWrapper.tsx',
      description: 'The actual Monte Carlo visualizer component',
      impact: 'MonteCarloVisualizerWrapper will crash on load',
      solution: 'Create MonteCarloVisualizer.tsx with isRunning and visible props',
    },
    {
      file: '/public/monte-carlo-worker.js',
      importedBy: '/components/calculator/OptimizationTab.tsx',
      description: 'Web Worker for optimization calculations',
      impact: 'OptimizationTab will fail to run optimizations',
      solution: 'Create worker that handles "optimize" message type',
    },
  ],

  typeIssues: [
    {
      file: '/components/calculator/TabPanel.tsx',
      issue: 'Imports MainTabId from ./TabNavigation',
      description: 'TabNavigation.tsx exists but MainTabId type may not be exported',
      solution: 'Verify MainTabId is exported from TabNavigation.tsx',
    },
    {
      file: '/components/calculator/OptimizationTab.tsx',
      issue: 'inputs prop typed as "any"',
      description: 'Props interface needs proper typing',
      solution: 'Use Inputs type from @/types/planner or create specific interface',
    },
  ],

  external: [
    {
      dependency: 'framer-motion',
      usedBy: [
        'RadarChart',
        'SankeyDiagram',
        'Treemap',
        'PopCard',
        'EducationProgress',
      ],
      note: 'Must be installed: npm install framer-motion',
    },
    {
      dependency: 'recharts',
      usedBy: ['WaterfallChart'],
      note: 'Must be installed: npm install recharts',
    },
  ],
};


// ================================================================================
// SECTION 5: COMPONENTS NEEDING ADDITIONAL WORK
// ================================================================================

/**
 * COMPONENTS REQUIRING ADDITIONAL WORK
 */
export const COMPONENTS_NEEDING_WORK = [
  {
    component: 'MonteCarloVisualizerWrapper',
    path: '/components/calculator/MonteCarloVisualizerWrapper.tsx',
    status: 'BROKEN',
    issues: [
      'Imports non-existent MonteCarloVisualizer component',
      'Will crash immediately on load',
    ],
    requiredWork: [
      'Create MonteCarloVisualizer.tsx component',
      'Visualizer needs: isRunning (boolean), visible (boolean) props',
      'Should show running animation or results visualization',
    ],
    priority: 'HIGH',
  },
  {
    component: 'OptimizationTab',
    path: '/components/calculator/OptimizationTab.tsx',
    status: 'INCOMPLETE',
    issues: [
      'Requires Web Worker at /public/monte-carlo-worker.js',
      'inputs prop is typed as "any"',
      '"Live a Little" section is commented out',
    ],
    requiredWork: [
      'Create or verify monte-carlo-worker.js exists',
      'Worker must handle message type "optimize"',
      'Add proper typing for inputs prop',
      'Decision: Enable or remove "Live a Little" section',
    ],
    priority: 'MEDIUM',
  },
  {
    component: 'TabPanel',
    path: '/components/calculator/TabPanel.tsx',
    status: 'DEPENDS',
    issues: [
      'Depends on MainTabId type from TabNavigation.tsx',
      'TabNavigation may not export this type',
    ],
    requiredWork: [
      'Verify TabNavigation.tsx exports MainTabId',
      'If not, add export or define type locally',
    ],
    priority: 'LOW',
  },
  {
    component: 'InfoTooltip',
    path: '/components/ui/InfoTooltip.tsx',
    status: 'INCOMPLETE',
    issues: [
      'TOOLTIP_CONTENT learnMoreLink values are all "#" placeholders',
    ],
    requiredWork: [
      'Add actual documentation links for each tooltip',
      'Consider linking to education modules',
    ],
    priority: 'LOW',
  },
];


// ================================================================================
// SECTION 6: INTEGRATION RECOMMENDATIONS
// ================================================================================

/**
 * RECOMMENDED INTEGRATION ORDER
 *
 * Based on dependencies and complexity, integrate in this order:
 */
export const INTEGRATION_ORDER = [
  {
    phase: 1,
    name: 'Foundation - Fix Critical Issues',
    tasks: [
      'Create MonteCarloVisualizer.tsx component',
      'Create or verify monte-carlo-worker.js',
      'Verify framer-motion and recharts are installed',
      'Export MainTabId from TabNavigation.tsx',
    ],
  },
  {
    phase: 2,
    name: 'Create Barrel Exports',
    tasks: [
      'Create /components/calculator/index.ts',
      'Create /components/ui/index.ts (custom components)',
      'Create /components/onboarding/index.ts',
      'Create /components/visualizations/index.ts',
      'Verify /components/education/index.ts is complete',
    ],
  },
  {
    phase: 3,
    name: 'UI Components Integration',
    tasks: [
      'Integrate AnimatedSection for scroll animations',
      'Add InfoTooltip to complex input fields',
      'Use ScrollIndicator on results page',
      'Apply PopCard for subtle hover effects',
    ],
  },
  {
    phase: 4,
    name: 'Calculator Components Integration',
    tasks: [
      'Add LastCalculatedBadge to calculator header',
      'Integrate CyberpunkSplash for Monte Carlo runs',
      'Add TimelineView to results section',
      'Integrate NextStepsCard in results',
      'Add SpendingFlexibilityChart when guardrails available',
    ],
  },
  {
    phase: 5,
    name: 'Visualization Components',
    tasks: [
      'Add WaterfallChart for income breakdown',
      'Integrate Treemap for portfolio composition',
      'Add HeatmapCalendar for contribution tracking',
      'Use RadarChart for financial profile comparison',
      'Add SankeyDiagram for money flow visualization',
    ],
  },
  {
    phase: 6,
    name: 'Education & Onboarding',
    tasks: [
      'Integrate EducationInfoIcon next to key terms',
      'Add EducationProgress to dashboard',
      'Use onboarding components for first-time user flow',
      'Connect education topics to relevant calculator sections',
    ],
  },
];


// ================================================================================
// SECTION 7: TYPE DEPENDENCIES MAP
// ================================================================================

/**
 * TYPE DEPENDENCIES
 *
 * Maps which types each component needs
 */
export const TYPE_DEPENDENCIES = {
  '/types/calculator.ts': [
    'NextStepsCard (CalculationResult)',
    'TimelineView (CalculationResult)',
    'SpendingFlexibilityChart (via planner)',
  ],
  '/types/planner.ts': [
    'NextStepsCard (BatchSummary)',
    'SpendingFlexibilityChart (GuardrailsResult)',
    'OptimizationTab (Inputs - should use)',
  ],
  '/types/onboarding.ts': [
    'ReviewStep (OnboardingWizardData, IRS_LIMITS_2026)',
  ],
  '/types/ai-onboarding.ts': [
    'MessageBubble (ConversationMessage)',
  ],
  '/components/education/types.ts': [
    'EducationModal (EducationTopic)',
    'EducationInfoIcon (EducationTopic)',
    'EducationProgress (EducationTopic)',
    'useEducationProgress (EducationTopic, EducationProgress)',
  ],
};


// ================================================================================
// END OF INTEGRATION PLAN
// ================================================================================

/**
 * This file serves as documentation only.
 * Do not import or use this file in production code.
 *
 * NEXT STEPS:
 * 1. Address MISSING_DEPENDENCIES.critical items
 * 2. Create barrel exports as documented
 * 3. Follow INTEGRATION_ORDER phases
 * 4. Update this document as components evolve
 */

export default null; // Prevent accidental default import

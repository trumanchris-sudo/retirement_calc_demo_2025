# ARCHITECTURE.md

## Overview

**WORK DIE RETIRE** is a Next.js 15 / React 19 retirement planning calculator that delivers tax-aware projections, Monte Carlo simulations, and AI-powered onboarding. The app uses PlanConfig as a single source of truth (SSOT) for all calculator inputs, offloads heavy simulation work to Web Workers, and integrates Claude AI for conversational onboarding and plan review. Built with shadcn/ui components, Tailwind CSS theming, and progressive web app (PWA) capabilities for offline use.

---

## Data Flow

```
Onboarding (AI Console / Wizard)
        |
        v
  PlanConfig Context  <---->  localStorage (debounced sync)
        |
        v
  Calculation Hooks (useCalculation, useWorkerSimulations)
        |                          |
        v                          v
  Retirement Engine       Monte Carlo Worker (off-thread)
        |                          |
        v                          v
  Calculator Results State (useCalculatorResults)
        |
        v
  Display Components (Tabs, Charts, Cards)
```

Users enter data via the onboarding flow (AI conversational or step-based wizard). Data is written to `PlanConfig` context, which persists to `localStorage`. Calculation hooks read from PlanConfig, invoke the retirement engine or the Monte Carlo web worker, and push results into the results state hook. Tab and chart components consume those results for rendering.

---

## Pages (`app/`)

| Route | File | Charter |
|---|---|---|
| `/` | `app/page.tsx` | Main retirement calculator -- full-featured single-page app with tabs, charts, and all planning tools |
| `/demo` | `app/demo/page.tsx` | Simplified demo page showcasing core UI components (slider inputs, stat cards, results grid) |
| `/income-2026` | `app/income-2026/page.tsx` | W-2 employee take-home pay calculator for 2026 tax year |
| `/self-employed-2026` | `app/self-employed-2026/page.tsx` | Self-employment / K-1 partner tax and take-home pay calculator for 2026 |
| `/reports/...` | `app/reports/` | PDF report templates and components for generating professional retirement reports |
| (layout) | `app/layout.tsx` | Root layout -- wraps app in Providers, ErrorBoundary, a11y utilities, PWA prompts, Vercel Analytics |
| (loading) | `app/loading.tsx` | Global loading fallback (returns null for instant paint) |

### API Routes (`app/api/`)

| Route | File | Charter |
|---|---|---|
| `/api/ai-onboarding` | `app/api/ai-onboarding/route.ts` | Streaming conversational onboarding powered by Claude AI |
| `/api/ai-defaults` | `app/api/ai-defaults/route.ts` | AI-generated default values for onboarding wizard fields |
| `/api/ai-review` | `app/api/ai-review/route.ts` | AI-powered plan review and recommendations via Claude |
| `/api/analyze` | `app/api/analyze/route.ts` | AI analysis of retirement plan scenarios via Claude |
| `/api/process-onboarding` | `app/api/process-onboarding/route.ts` | Single-call AI processing of onboarding responses into structured data + assumptions |
| `/api/analytics` | `app/api/analytics/route.ts` | Receives Web Vitals and performance metrics from the client |
| `/api/wallet/legacy` | `app/api/wallet/legacy/route.ts` | Generates Apple Wallet passes with legacy wealth summary |

### Report Components (`app/reports/`)

| File | Charter |
|---|---|
| `templates/RetirementReportTemplate.tsx` | React-PDF document template for professional retirement reports |
| `components/ReportHeader.tsx` | PDF report header with branding and date |
| `components/ReportFooter.tsx` | PDF report footer with disclaimers |
| `components/ReportSection.tsx` | Reusable section wrapper for PDF report pages |
| `components/ReportPage.tsx` | Page-level container for PDF report content |
| `components/Charts/WealthTrajectoryChart.tsx` | Wealth trajectory chart rendered for PDF output |
| `components/Charts/MonteCarloHistogram.tsx` | Monte Carlo distribution histogram for PDF output |

---

## Hooks (`hooks/`)

| File | Charter |
|---|---|
| `useCalculation.ts` | Core retirement calculation logic -- runs single simulations, sensitivity analysis, legacy calculations, and generational presets |
| `useCalculatorResults.ts` | Manages calculation results state, saved scenarios, AI insight state, and UI toggles with localStorage persistence |
| `useCalculatorDerivedState.ts` | Consolidates all computed/derived values from PlanConfig using `useMemo` (replaces useEffect chains) |
| `useWorkerSimulations.ts` | Manages Web Worker lifecycle for Monte Carlo simulations, guardrails analysis, and Roth optimization |
| `usePlanConfigSelectors.ts` | Optimized memoized selectors for specific PlanConfig slices to minimize re-renders |
| `useAIDefaults.ts` | Fetches AI-generated default suggestions from the `/api/ai-defaults` endpoint |
| `useAiInsightEngine.ts` | Manages AI insight generation, caching, and Q&A interactions for plan analysis |
| `useOnboarding.ts` | Manages onboarding wizard state, step progress, and PlanConfig completeness detection |
| `useIncomeCalculator.ts` | Shared logic for income calculator pages (filing status, pay frequency, AI onboarding state, scroll behavior) |
| `useLocalStorage.ts` | SSR-safe localStorage/sessionStorage hooks with automatic JSON serialization |
| `useDebounce.ts` | Debounce and throttle hooks for rate-limiting expensive operations (inputs, API calls, writes) |
| `useOffline.ts` | Reactive offline/online state detection, offline queue, and service worker management |
| `usePerformanceMonitor.ts` | Dev-only render counting, timing, and profiling utilities (auto-disabled in production) |
| `useKeyboardNavigation.ts` | WAI-ARIA keyboard interaction patterns for lists, grids, and composite widgets |
| `useKeyboardShortcuts.ts` | Global/scoped keyboard shortcut system with customization, conflict detection, and Mac/Windows support |
| `useKeyboardInset.ts` | Detects iOS keyboard height via Visual Viewport API for input visibility on mobile Safari |
| `use-mobile.tsx` | Returns boolean indicating mobile viewport (breakpoint: 768px) |
| `use-toast.ts` | Re-exports toast notification hook from `components/ui/use-toast` |
| `index.ts` | Barrel export for all hooks -- import from `@/hooks` |

---

## Library Modules (`lib/`)

### Core Context Providers

| File | Charter |
|---|---|
| `plan-config-context.tsx` | PlanConfig React context -- SSOT for all calculator inputs with debounced localStorage sync and memoized derived state |
| `budget-context.tsx` | Budget context for implied spending breakdown derived from income and contributions |
| `theme-context.tsx` | Theme context managing light/dark/system mode with localStorage persistence |
| `keyboard-shortcuts-context.tsx` | Centralized keyboard shortcut context with global event listener and modal state |
| `offline-context.tsx` | Offline state context providing connection status and queue utilities app-wide |

### Calculation Engines (`lib/calculations/`)

| File | Charter |
|---|---|
| `retirementEngine.ts` | Core simulation engine -- single-path retirement projection with tax-aware withdrawals, Social Security, RMDs, and estate tax |
| `optimizationEngine.ts` | Generates actionable optimization recommendations (Roth conversions, contribution order, bracket arbitrage, withdrawal strategy) |
| `healthcareEngine.ts` | Comprehensive healthcare cost modeling: pre-Medicare, Medicare/IRMAA, long-term care, ACA subsidies, HSA strategy |
| `rothConversionOptimizer.ts` | Roth Conversion Ladder optimizer for FIRE practitioners -- calculates optimal conversion amounts across low-income years |
| `assetLocationEngine.ts` | Asset location optimizer -- places investments in the most tax-efficient account type for 0.5-1% additional annual alpha |
| `ssOptimizer.ts` | Social Security claiming age optimizer -- compares lifetime benefits at ages 62-70 with breakeven analysis |
| `generationalWealth.ts` | Generational wealth simulation engine with demographic cohort modeling |
| `taxCalculations.ts` | Federal income tax, capital gains tax, NIIT, and state tax calculation utilities |
| `withdrawalTax.ts` | Pro-rata withdrawal tax calculation across taxable, pre-tax, and Roth accounts |
| `selfEmployed2026.ts` | Self-employment and K-1 partner tax calculations for 2026 (SE tax, QBI deduction) |
| `worker/monte-carlo-worker.ts` | Web Worker running N=2000 Monte Carlo simulation paths off the main thread |

### Shared Calculation Primitives (`lib/calculations/shared/`)

| File | Charter |
|---|---|
| `index.ts` | Barrel export of all shared pure functions and constants for main app and worker |
| `constants.ts` | Pure data constants (tax brackets, RMD tables, S&P 500 history) portable to workers |
| `bondAllocation.ts` | Bond allocation percentage calculator based on age and glide path shape |
| `expenses.ts` | Expense calculation utilities shared between engines |
| `returnGenerator.ts` | Investment return generation (fixed, random walk, historical) |
| `rmd.ts` | Required Minimum Distribution calculation from IRS Uniform Lifetime Table |
| `socialSecurity.ts` | PIA calculation and claiming-age benefit adjustments |
| `taxCalculations.ts` | Shared tax bracket calculation functions (ordinary income, LTCG, NIIT) |
| `utils.ts` | Pure math utilities (PRNG, percentile, clamp) for use in workers |
| `withdrawalTax.ts` | Shared withdrawal tax logic for worker and main thread |

### Configuration and Validation

| File | Charter |
|---|---|
| `planConfig.ts` | Zod schema and validation rules for PlanConfig -- defines field constraints and limits |
| `validation.ts` | Input validation utilities with specific error messages for calculator fields |
| `fieldValidation.ts` | Per-field validation functions tied to planConfig validation rules |
| `constants.ts` | Global constants: life expectancy, RMD age, Monte Carlo paths, RMD divisor table, S&P 500 data |
| `constants/tax2026.ts` | 2026 tax year constants (TCJA/OBBBA rates, SE tax, standard deductions, FICA) |

### AI and Onboarding

| File | Charter |
|---|---|
| `ai-onboarding.ts` | Client-side streaming handler for the AI onboarding API endpoint |
| `processAIOnboarding.ts` | Server-side single-call processor: extracts structured data and assumptions from conversation history |
| `processOnboardingClientSide.ts` | Client-side onboarding processing -- generates assumptions locally without API calls |
| `aiOnboardingMapper.ts` | Maps AI-extracted data and assumptions into complete PlanConfig/CalculatorInputs state |

### Export and Sharing

| File | Charter |
|---|---|
| `export.ts` | Multi-format export: PDF, Excel/CSV, JSON backup, Apple Wallet, Google Sheets, print view |
| `pdfReport.ts` | Professional PDF report generator using jsPDF (rivals $2K+ CFP financial plans) |
| `pdf/utils/format.ts` | Currency formatting utilities for PDF report output |
| `walletPass.ts` | Apple Wallet pass data types and request interfaces for legacy wealth cards |
| `shareableLink.ts` | URL-safe compressed shareable links encoding calculator inputs (no server storage) |

### Scenarios and Simulation

| File | Charter |
|---|---|
| `scenarioManager.ts` | Save, load, and compare retirement planning scenarios via localStorage |
| `scenario-cache.ts` | IndexedDB cache for recent scenarios enabling offline access |
| `simulation/bearMarkets.ts` | Historical bear market crash data for stress-testing retirement plans |
| `simulation/inflationShocks.ts` | Historical inflation shock scenarios for stress-testing real wealth accumulation |

### Benchmarks (`lib/benchmarks/`)

| File | Charter |
|---|---|
| `index.ts` | Barrel export for national comparison data and percentile ranking system |
| `nationalData.ts` | Federal Reserve Survey of Consumer Finances (SCF) data by age cohort |
| `percentileCalculations.ts` | Percentile ranking and projected standing calculations against national data |
| `types.ts` | Type definitions for benchmark results and percentile rankings |

### PWA and Offline

| File | Charter |
|---|---|
| `service-worker.ts` | Service worker: caches static assets, calculation results, and enables offline scenario planning |
| `offline-queue.ts` | IndexedDB-backed queue for calculations and actions performed while offline |

### Monitoring

| File | Charter |
|---|---|
| `monitoring/errorTracking.ts` | Centralized error tracking and reporting (Sentry-ready) |
| `monitoring/webVitals.ts` | Core Web Vitals (LCP, FID, CLS) tracking and analytics reporting |

### Utilities

| File | Charter |
|---|---|
| `utils.ts` | General utilities: `cn()` class merger, `fmt()` currency formatter, `realReturn()`, `clampNum()` |
| `formatUtils.tsx` | Text formatting helpers (title case, insight text rendering) extracted from page.tsx |
| `designTokens.ts` | Standardized typography, spacing, and UX pattern constants for visual consistency |
| `bondAllocation.ts` | Bond allocation percentage calculation based on glide path configuration |
| `featureFlags.ts` | Type-safe feature flag system with localStorage persistence, URL overrides, and gradual rollout |
| `sounds.ts` | Web Audio API sound effects synthesizer for subtle financial calculator feedback |
| `gestures.ts` | Touch gesture library: swipe, pinch-to-zoom, long press, double tap, pan for charts |
| `sharedIncomeData.ts` | (Deprecated) Legacy income data store -- migrate to PlanConfig context |

---

## Components

### Calculator (`components/calculator/`)

| File | Charter |
|---|---|
| `ACAOptimizer.tsx` | ACA marketplace subsidy optimization tool |
| `AdvisorFees.tsx` | Advisor fee impact analyzer comparing fee structures |
| `AiInsightBox.tsx` | Displays AI-generated insights and allows Q&A about the plan |
| `AnalyticsDashboard.tsx` | Usage analytics and performance metrics dashboard |
| `AnnualCheckup.tsx` | Yearly plan review checklist and progress tracker |
| `AnnuityAnalyzer.tsx` | Annuity purchase analyzer with income stream comparison |
| `AssetLocationOptimizer.tsx` | UI for asset location optimization across account types |
| `AutoExpenseAnalyzer.tsx` | Automatic expense categorization and analysis |
| `BackdoorRothGuide.tsx` | Step-by-step guide for backdoor Roth IRA conversions |
| `BenchmarkPanel.tsx` | National comparison panel showing percentile rankings vs. peers |
| `BeneficiaryReview.tsx` | Beneficiary designation review and suggestions |
| `BondTent.tsx` | Bond tent / rising equity glide path strategy visualizer |
| `BracketFiller.tsx` | Tax bracket filling optimizer for Roth conversions |
| `BrokerageComparison.tsx` | Brokerage platform comparison tool |
| `CashComparison.tsx` | Cash vs. investment opportunity cost comparison |
| `CatchUpContributions.tsx` | Catch-up contribution calculator for ages 50+ |
| `CharitableGiving.tsx` | Charitable giving tax strategy analyzer (donor-advised funds, QCDs) |
| `ChartAnimations.tsx` | Animation utilities and wrappers for chart transitions |
| `CheckUsTab.tsx` | Quick validation tab to check plan assumptions |
| `CollegePlanner.tsx` | College savings and 529 plan integration |
| `ContributionOrder.tsx` | Optimal contribution order across account types |
| `CouplesFinances.tsx` | Joint financial planning for married couples |
| `CrashSimulator.tsx` | Market crash simulation with historical scenarios |
| `CreditImpact.tsx` | Credit score impact analysis for financial decisions |
| `CyberpunkSplash.tsx` | Themed splash screen / visual effect component |
| `DebtVsInvest.tsx` | Debt payoff vs. investing decision calculator |
| `DisabilityInsurance.tsx` | Disability insurance needs calculator |
| `DynastyTimeline.tsx` | Multi-generation dynasty wealth timeline visualizer |
| `EmergencyFundCalculator.tsx` | Emergency fund sizing calculator based on expenses and risk |
| `EmployerBenefits.tsx` | Employer benefits optimization (401k match, HSA, ESPP) |
| `EstatePlanningBasics.tsx` | Estate planning overview with tax implications |
| `FamilyMeeting.tsx` | Family financial meeting agenda generator |
| `FeeAnalyzer.tsx` | Investment fee analysis showing long-term drag on returns |
| `FIDay.tsx` | Financial Independence day countdown and tracker |
| `FIRECalculator.tsx` | FIRE (Financial Independence, Retire Early) calculator |
| `FirstTimeHomeBuyer.tsx` | First-time home buyer impact on retirement timeline |
| `GenerationalWealthVisual.tsx` | Generational wealth inheritance visualization |
| `HealthcarePlanner.tsx` | Healthcare cost planner spanning pre-Medicare through long-term care |
| `HomeEquityRetirement.tsx` | Home equity utilization strategies in retirement |
| `HSAStrategy.tsx` | HSA triple tax advantage strategy optimizer |
| `IBondStrategy.tsx` | I Bond allocation strategy and inflation protection |
| `IncomeReplacementViz.tsx` | Income replacement ratio visualization |
| `IndexVsActive.tsx` | Index fund vs. active management comparison |
| `InflationCalculator.tsx` | Future purchasing power calculator with inflation adjustments |
| `InflationHistory.tsx` | Historical inflation data visualizer |
| `InflationImpact.tsx` | Inflation impact on retirement spending over time |
| `InheritanceGuide.tsx` | Inheritance planning and SECURE Act 10-year rule guide |
| `InputHelpers.tsx` | Enhanced input components with formatting and validation |
| `InteractivePieChart.tsx` | Interactive pie chart for portfolio allocation |
| `LastCalculatedBadge.tsx` | Timestamp badge showing when calculations last ran |
| `LifeInsuranceCalculator.tsx` | Life insurance needs analysis calculator |
| `LifetimeTaxDashboard.tsx` | Lifetime cumulative tax burden visualization |
| `LumpSumVsDCA.tsx` | Lump sum vs. dollar-cost averaging comparison |
| `MedicareGuide.tsx` | Medicare enrollment guide with Parts A/B/D and IRMAA |
| `MilestoneTracker.tsx` | Financial milestone tracking and progress display |
| `MonteCarloVisualizer.tsx` | Monte Carlo simulation fan chart and percentile visualization |
| `MonteCarloVisualizerWrapper.tsx` | Wrapper handling worker state and loading for Monte Carlo visualizer |
| `MortgageRefi.tsx` | Mortgage refinance break-even calculator |
| `NetWorthProjector.tsx` | Forward-looking net worth projection over time |
| `NetWorthTracker.tsx` | Current net worth tracking and breakdown |
| `NextStepsCard.tsx` | Actionable next steps card based on plan analysis |
| `OptimizationPanel.tsx` | Panel displaying optimization engine recommendations |
| `OptimizationTab.tsx` | Full optimization tab aggregating all optimization tools |
| `PensionCalculator.tsx` | Pension benefit calculator (lump sum vs. annuity) |
| `Plan401kRating.tsx` | 401(k) plan quality rating based on fees and options |
| `PlanSummaryCard.tsx` | Compact plan summary card with key metrics |
| `PrintReport.tsx` | Print-optimized report layout for browser printing |
| `RebalancingGuide.tsx` | Portfolio rebalancing guide with threshold triggers |
| `RecalculateButton.tsx` | Button to trigger recalculation with progress feedback |
| `RentalPropertyAnalyzer.tsx` | Rental property ROI and cash flow analyzer |
| `ResultsSummaryCard.tsx` | Summary card with headline results (success rate, wealth at retirement) |
| `RiskSummaryCard.tsx` | Risk assessment summary with sequence-of-returns analysis |
| `RMDPlanner.tsx` | Required Minimum Distribution planner and projections |
| `RothComparison.tsx` | Traditional vs. Roth IRA/401k comparison analyzer |
| `RothConversionLadder.tsx` | Roth conversion ladder visualization for early retirees |
| `RothConversionOptimizer.tsx` | Roth conversion amount optimizer with tax bracket awareness |
| `SavingsRateImpact.tsx` | Savings rate impact on retirement age calculator |
| `ScenarioComparison.tsx` | Side-by-side scenario comparison chart and table |
| `ScenarioManager.tsx` | Save, load, and manage named retirement scenarios |
| `SemiRetirement.tsx` | Semi-retirement / phased retirement planner |
| `SequenceRisk.tsx` | Sequence-of-returns risk explanation and analysis |
| `SequenceRiskChart.tsx` | Chart visualizing sequence-of-returns risk impact |
| `SideHustleTax.tsx` | Side hustle / gig income tax impact calculator |
| `SocialSecurityOptimizer.tsx` | Social Security claiming age optimizer with breakeven chart |
| `SpendingAnalysis.tsx` | Retirement spending pattern analysis (smile/frown curves) |
| `SpendingFlexibilityChart.tsx` | Spending flexibility guardrails chart |
| `SpousalScenarios.tsx` | Spousal benefit and survivor benefit scenarios |
| `SpouseWorkDecision.tsx` | Spouse work/retire decision financial impact analysis |
| `SSOTTab.tsx` | Single source of truth debug/config tab showing raw PlanConfig |
| `StatCards.tsx` | Collection of stat display cards for key retirement metrics |
| `StateTaxComparison.tsx` | State-by-state tax comparison for retirement relocation |
| `StockCompensation.tsx` | Stock options / RSU tax and exercise strategy |
| `StudentLoanOptimizer.tsx` | Student loan repayment vs. investing optimizer |
| `TabNavigation.tsx` | Main tab navigation bar for calculator sections |
| `TabPanel.tsx` | Tab panel wrapper with lazy-loading and transition support |
| `TargetDateAnalyzer.tsx` | Target-date fund glide path analyzer and comparison |
| `TaxLossHarvesting.tsx` | Tax-loss harvesting strategy guide and calculator |
| `TimelineView.tsx` | Retirement timeline view with key life events |
| `URLTabSync.tsx` | Syncs active tab selection with URL query parameters |
| `W4Optimizer.tsx` | W-4 withholding optimizer to minimize refund / underpayment |
| `WealthTimeline.tsx` | Wealth accumulation timeline with milestones |
| `WhatIfScenarios.tsx` | What-if scenario builder for quick sensitivity testing |
| `WindfallGuide.tsx` | Windfall (inheritance, bonus, lottery) planning guide |
| `WithdrawalSimulator.tsx` | Withdrawal strategy simulator with guardrails |
| `YearEndTax.tsx` | Year-end tax planning checklist and action items |

### Calculator Tabs (`components/calculator/tabs/`)

| File | Charter |
|---|---|
| `ConfigureTab.tsx` | Main configuration tab with all plan input fields |
| `ResultsTab.tsx` | Results display tab with summary cards and primary charts |
| `ResultsVisualizationsSection.tsx` | Visualization section within results tab (wealth charts, Monte Carlo) |
| `ScenariosTab.tsx` | Scenario management tab for saving/comparing plans |
| `MathTab.tsx` | Detailed math/methodology tab showing calculation breakdown |
| `LegacyTab.tsx` | Legacy and estate planning tab |
| `LegacyToolsSection.tsx` | Legacy-focused tools section (dynasty timeline, generational wealth) |
| `OptimizeToolsSection.tsx` | Optimization tools section (Roth conversions, asset location, bracket filling) |
| `StressToolsSection.tsx` | Stress testing tools section (crash simulator, sequence risk, inflation) |
| `PlanningToolsExpanded.tsx` | Expanded planning tools section (healthcare, Social Security, college) |
| `EducationSection.tsx` | Financial education section with explainers and visualizers |
| `GamificationSection.tsx` | Gamification section (achievements, milestones, progress) |

### Calculator Charts (`components/calculator/charts/`)

| File | Charter |
|---|---|
| `WealthAccumulationChart.tsx` | Primary wealth accumulation area/line chart over time |
| `WealthCharts.tsx` | Composite chart component combining multiple wealth visualizations |
| `ScenarioComparisonChart.tsx` | Overlaid chart comparing multiple saved scenarios |

### Onboarding (`components/onboarding/`)

| File | Charter |
|---|---|
| `OnboardingWizard.tsx` | Multi-step onboarding wizard orchestrator |
| `OnboardingWizardPage.tsx` | Page-level wrapper for the onboarding wizard |
| `OnboardingSelector.tsx` | Entry point letting users choose AI console vs. manual wizard |
| `AIConsole.tsx` | Conversational AI onboarding interface using Claude streaming |
| `ConsoleInput.tsx` | Chat-style text input for the AI console |
| `MessageBubble.tsx` | Chat message bubble component for AI conversation display |
| `StreamingMessage.tsx` | Streaming text display for AI responses with typing animation |
| `DataSummaryPanel.tsx` | Side panel showing extracted data as AI conversation progresses |
| `AssumptionsReview.tsx` | Review panel for AI-generated assumptions before finalizing |
| `OnboardingComplete.tsx` | Completion screen after onboarding with transition to calculator |
| `QuickStart.tsx` | Quick-start preset selection for fast onboarding |
| `AppTour.tsx` | Guided app tour overlay for first-time users |

#### Onboarding Steps (`components/onboarding/steps/`)

| File | Charter |
|---|---|
| `BasicsStep.tsx` | Step 1: Age, marital status, and basic demographics |
| `SavingsStep.tsx` | Step 2: Account balances and contribution rates |
| `GoalsStep.tsx` | Step 3: Retirement age, lifestyle goals, and spending targets |
| `ReviewStep.tsx` | Step 4: Review and confirm all inputs before calculation |

### Layout (`components/layout/`)

| File | Charter |
|---|---|
| `Hero.tsx` | Hero section with branding and primary call-to-action |
| `PageHeader.tsx` | Standardized page header with title and breadcrumbs |
| `TopBanner.tsx` | Top announcement/notification banner strip |
| `Section.tsx` | Reusable content section wrapper with consistent spacing |
| `MobileNav.tsx` | Mobile navigation drawer/bottom sheet |

### UI Primitives (`components/ui/`)

| File | Charter |
|---|---|
| `accordion.tsx` | Collapsible accordion sections (shadcn/ui) |
| `alert.tsx` | Alert/notification banners (shadcn/ui) |
| `alert-dialog.tsx` | Confirmation dialog with destructive action support (shadcn/ui) |
| `aspect-ratio.tsx` | Aspect ratio container (shadcn/ui) |
| `avatar.tsx` | User avatar with fallback initials (shadcn/ui) |
| `badge.tsx` | Status and label badges (shadcn/ui) |
| `breadcrumb.tsx` | Breadcrumb navigation (shadcn/ui) |
| `button.tsx` | Button with variant and size props (shadcn/ui) |
| `calendar.tsx` | Date picker calendar (shadcn/ui) |
| `card.tsx` | Card container with header, content, footer (shadcn/ui) |
| `carousel.tsx` | Image/content carousel (shadcn/ui) |
| `chart.tsx` | Recharts wrapper with theme integration (shadcn/ui) |
| `checkbox.tsx` | Checkbox input (shadcn/ui) |
| `collapsible.tsx` | Collapsible container (shadcn/ui) |
| `context-menu.tsx` | Right-click context menu (shadcn/ui) |
| `dialog.tsx` | Modal dialog (shadcn/ui) |
| `drawer.tsx` | Bottom/side drawer (shadcn/ui) |
| `dropdown-menu.tsx` | Dropdown menu (shadcn/ui) |
| `form.tsx` | Form primitives with react-hook-form integration (shadcn/ui) |
| `hover-card.tsx` | Hover card popover (shadcn/ui) |
| `input.tsx` | Text input field (shadcn/ui) |
| `input-otp.tsx` | OTP / code input field (shadcn/ui) |
| `label.tsx` | Form label (shadcn/ui) |
| `menubar.tsx` | Menu bar navigation (shadcn/ui) |
| `pagination.tsx` | Pagination controls (shadcn/ui) |
| `popover.tsx` | Popover container (shadcn/ui) |
| `progress.tsx` | Progress bar (shadcn/ui) |
| `radio-group.tsx` | Radio button group (shadcn/ui) |
| `resizable.tsx` | Resizable panel layout (shadcn/ui) |
| `scroll-area.tsx` | Custom scroll area (shadcn/ui) |
| `select.tsx` | Select dropdown (shadcn/ui) |
| `separator.tsx` | Visual separator line (shadcn/ui) |
| `sheet.tsx` | Slide-out sheet panel (shadcn/ui) |
| `sidebar.tsx` | Sidebar navigation (shadcn/ui) |
| `skeleton.tsx` | Loading skeleton placeholder (shadcn/ui) |
| `slider.tsx` | Range slider input (shadcn/ui) |
| `switch.tsx` | Toggle switch (shadcn/ui) |
| `table.tsx` | Data table (shadcn/ui) |
| `tabs.tsx` | Tabbed interface (shadcn/ui) |
| `textarea.tsx` | Multi-line text input (shadcn/ui) |
| `toast.tsx` | Toast notification component (shadcn/ui) |
| `toaster.tsx` | Toast notification container/manager (shadcn/ui) |
| `toggle.tsx` | Toggle button (shadcn/ui) |
| `toggle-group.tsx` | Toggle button group (shadcn/ui) |
| `tooltip.tsx` | Hover tooltip (shadcn/ui) |

#### Custom UI Components (`components/ui/` -- project-specific)

| File | Charter |
|---|---|
| `AnimatedBackground.tsx` | Animated gradient background effect |
| `AnimatedCounter.tsx` | Counting animation for numeric transitions |
| `AnimatedIcons.tsx` | Animated icon set for financial concepts |
| `AnimatedNumber.tsx` | Smooth number transition animation for stat displays |
| `AnimatedSection.tsx` | Scroll-triggered section entrance animation |
| `Annotations.tsx` | Chart annotation overlays for key data points |
| `BulletChart.tsx` | Bullet chart for comparing metrics against targets |
| `CalculationProgress.tsx` | Progress indicator for long-running calculations |
| `CommandPalette.tsx` | Cmd+K command palette for quick actions |
| `ComparisonTable.tsx` | Side-by-side comparison table component |
| `Confetti.tsx` | Celebration confetti animation for milestones |
| `EmptyStates.tsx` | Empty state placeholders with illustrations |
| `ErrorMessage.tsx` | Styled error message display |
| `Gauge.tsx` | Gauge/dial visualization for scores and percentages |
| `GestureWrapper.tsx` | Wrapper adding touch gesture support to child elements |
| `GlassCard.tsx` | Glassmorphism-styled card variant |
| `GradientText.tsx` | Gradient-colored text effect |
| `InfoTooltip.tsx` | Info icon with explanatory tooltip |
| `InlineIcons.tsx` | Inline icon set for use within text content |
| `KeyboardShortcuts.tsx` | Keyboard shortcuts help modal/overlay |
| `LoadingSpinner.tsx` | Loading spinner animation |
| `MagneticButton.tsx` | Button with magnetic cursor-follow hover effect |
| `MicroInteractions.tsx` | Collection of micro-interaction animations |
| `OfflineIndicator.tsx` | Offline status indicator banner |
| `PageTransition.tsx` | Page-level transition animation wrapper |
| `ParallaxSection.tsx` | Parallax scrolling section effect |
| `PopCard.tsx` | Card with pop/scale entrance animation |
| `ProgressRing.tsx` | Circular progress ring indicator |
| `SaveIndicator.tsx` | Auto-save status indicator |
| `ScrollIndicator.tsx` | Scroll depth progress indicator |
| `SkeletonCard.tsx` | Pre-styled skeleton card for loading states |
| `SmartSkeleton.tsx` | Context-aware skeleton that matches content shape |
| `Sparkline.tsx` | Inline sparkline mini-chart |
| `StepProgress.tsx` | Multi-step progress indicator (wizard steps) |
| `SuccessStates.tsx` | Success state displays with animations |
| `TabGroup.tsx` | Custom tab group component with transition support |
| `ThemeToggle.tsx` | Light/dark mode toggle button |
| `TypewriterText.tsx` | Typewriter text animation effect |
| `UpdateNotification.tsx` | App update notification prompt (PWA) |
| `VoiceInput.tsx` | Voice input using Web Speech API |
| `use-mobile.tsx` | Mobile detection hook (duplicate of hooks/use-mobile) |

### Form Components (`components/form/`)

| File | Charter |
|---|---|
| `CalculateButton.tsx` | Primary calculate action button with loading state |
| `CollapsibleSection.tsx` | Collapsible form section with expand/collapse toggle |
| `NumberInput.tsx` | Formatted number input with currency/percentage modes |
| `NumericInput.tsx` | Numeric-only input with validation constraints |
| `SliderInput.tsx` | Labeled slider with value display and formatted output |

### Forms (`components/forms/`)

| File | Charter |
|---|---|
| `BudgetInput.tsx` | Budget category input form for expense breakdown |

### Other Component Directories

| Directory / File | Charter |
|---|---|
| `a11y/LiveRegion.tsx` | ARIA live region for announcing dynamic content to screen readers |
| `a11y/ScreenReaderOnly.tsx` | Visually hidden text wrapper for screen reader content |
| `a11y/SkipLink.tsx` | Skip-to-main-content keyboard navigation link |
| `ai/AIRebalancer.tsx` | AI-powered portfolio rebalancing suggestions |
| `ai/FinancialCopilot.tsx` | Persistent AI financial copilot chat interface |
| `AIDocumentationMode.tsx` | Toggle for AI documentation mode overlay |
| `AIReviewPanel.tsx` | Panel displaying AI plan review and recommendations |
| `behavioral/Nudges.tsx` | Behavioral nudge notifications to encourage savings actions |
| `brand/AnimatedLogo.tsx` | Animated brand logo component |
| `BrandLoader.tsx` | Branded loading screen for initial app load |
| `budget/SpendingBreakdown.tsx` | Visual spending breakdown by category |
| `calendar/CalendarIntegration.tsx` | Calendar integration for financial deadlines |
| `calendar/TaxCalendar.tsx` | Tax deadline calendar view |
| `countdown/RetirementCountdown.tsx` | Retirement date countdown timer |
| `couples/PartnerMode.tsx` | Partner/couples joint planning mode toggle |
| `CubeStaticMini.tsx` | Miniature decorative 3D cube element |
| `dashboard/NetWorthDashboard.tsx` | Net worth overview dashboard with charts |
| `dev/FeatureFlagProvider.tsx` | Development feature flag control panel |
| `DownloadCardButton.tsx` | Button to download plan summary as image card |
| `DownloadPDFButton.tsx` | Button to generate and download PDF report |
| `education/CompoundGrowthVisualizer.tsx` | Interactive compound growth visualization |
| `education/EducationInfoIcon.tsx` | Info icon linking to educational content |
| `education/EducationModal.tsx` | Educational content modal with topic explanations |
| `education/EducationProgress.tsx` | Financial literacy progress tracker |
| `education/RichPeoplePlaybook.tsx` | Wealth-building strategies explained simply |
| `education/TaxBracketsSimplified.tsx` | Visual tax bracket explainer |
| `education/TaxStrategyExplainer.tsx` | Tax strategy comparison educational content |
| `education/TenYearRuleExplainer.tsx` | SECURE Act 10-year rule explainer |
| `education/WhyRothIsBetter.tsx` | Roth vs. Traditional advantage explainer |
| `ErrorBoundary.tsx` | React error boundary with fallback UI |
| `export/ExportModal.tsx` | Multi-format export modal (PDF, CSV, JSON, Wallet) |
| `FlippingCard.tsx` | Card with 3D flip animation for reveal effects |
| `gamification/Achievements.tsx` | Achievement badges and unlock system |
| `GenerationalResultCard.tsx` | Result card for generational wealth simulation outcomes |
| `goals/GoalDashboard.tsx` | Financial goal tracking dashboard |
| `help/ContextualHelp.tsx` | Context-sensitive help tooltips and panels |
| `history/VersionHistory.tsx` | Plan version history with restore capability |
| `income/DividendTracker.tsx` | Dividend income tracking and projection |
| `income/IncomeCalculatorLayout.tsx` | Shared layout wrapper for income calculator pages |
| `income/IncomeLadder.tsx` | Income ladder visualization across life phases |
| `income/IncomeSourcesBreakdown.tsx` | Retirement income sources breakdown chart |
| `income/PaycheckFlowTable.tsx` | Paycheck deduction and take-home flow table |
| `integrations/PlaidConnect.tsx` | Plaid bank account connection integration |
| `landing/LandingPage.tsx` | Marketing landing page with feature highlights |
| `legacy/LegacyDashboard.tsx` | Legacy planning dashboard with estate projections |
| `LegacyResultCard.tsx` | Legacy simulation result display card |
| `life/LifeEventSimulator.tsx` | Life event impact simulator (marriage, kids, job change) |
| `market/MarketTicker.tsx` | Live market ticker display |
| `mobile/AppShell.tsx` | Mobile app shell layout with bottom navigation |
| `mobile/PullToRefresh.tsx` | Pull-to-refresh gesture handler for mobile |
| `monitoring/ErrorBoundary.tsx` | Error boundary with monitoring integration |
| `notifications/NotificationCenter.tsx` | Notification center for alerts and reminders |
| `print/PrintLayout.tsx` | Print-optimized layout for browser print dialog |
| `Providers.tsx` | Composes all context providers (Theme, Offline, PlanConfig, Budget, Shortcuts) |
| `pwa/InstallPrompt.tsx` | PWA install prompt for add-to-home-screen |
| `pwa/OfflineUI.tsx` | Offline-mode UI overlay and cached data indicator |
| `results/AnimatedStatCard.tsx` | Stat card with animated number entrance |
| `results/ResultsGrid.tsx` | Grid layout for result stat cards |
| `scenarios/ScenarioBuilder.tsx` | Interactive scenario builder for what-if analysis |
| `score/FinancialHealthScore.tsx` | Composite financial health score gauge |
| `social/ShareCard.tsx` | Social sharing card generator (anonymous mode available) |
| `SSOTDebugPanel.tsx` | Debug panel showing raw PlanConfig state for development |
| `stress/StressTest.tsx` | Stress test runner for bear markets and inflation shocks |
| `tax/BracketVisualizer.tsx` | Interactive tax bracket waterfall visualizer |
| `tax/CostBasisOptimizer.tsx` | Tax lot / cost basis optimization for harvesting |
| `UserInputsPrintSummary.tsx` | Print-friendly summary of all user inputs |

### Visualizations (`components/visualizations/`)

| File | Charter |
|---|---|
| `HeatmapCalendar.tsx` | Calendar heatmap for contribution or savings activity |
| `RadarChart.tsx` | Radar/spider chart for multi-dimensional plan scoring |
| `SankeyDiagram.tsx` | Sankey flow diagram for money movement visualization |
| `Treemap.tsx` | Treemap chart for portfolio allocation breakdown |
| `WaterfallChart.tsx` | Waterfall chart for income/expense flow analysis |

---

## Types (`types/`)

| File | Charter |
|---|---|
| `plan-config.ts` | Canonical `PlanConfig` type -- the single source of truth data structure for all retirement plan data, plus `FamilyMember` and `createDefaultPlanConfig()` |
| `calculator.ts` | Comprehensive calculator types: `CalculatorInputs`, `CalculationResult`, `ChartDataPoint`, `BondGlidePath`, `SavedScenario`, `ValidationResult` |
| `planner.ts` | Planner types: `PlanState`, `FilingStatus`, `ReturnMode`, `WalkSeries`, `BatchSummary`, `GuardrailsResult`, `RothConversionResult` |
| `onboarding.ts` | Legacy manual wizard types: `OnboardingBasicsData`, `OnboardingSavingsData`, `OnboardingGoalsData`, `SavingsMode`, `LifestylePreset` |
| `ai-onboarding.ts` | AI onboarding types: `MessageRole`, `ConversationPhase`, `ExtractedData`, `AssumptionWithReasoning`, `StreamEvent`, `AIOnboardingRequest` |
| `ai-defaults.ts` | AI defaults types: `AIDefaultsRequest`, `AIDefaultsResponse`, `AI_DEFAULTS_BOUNDS` |

---

## Workers

| File | Charter |
|---|---|
| `lib/calculations/worker/monte-carlo-worker.ts` | Web Worker running 2000-path Monte Carlo simulations off the main thread using shared calculation primitives |

The worker imports all calculation logic from `lib/calculations/shared/` to ensure deterministic consistency with the main-thread engine. Communication is via `postMessage` with progress callbacks.

---

## Module Dependency Graph

```
                          app/layout.tsx
                               |
                         [Providers.tsx]
                    /     |      |     |      \
          ThemeProvider  OfflineProvider  PlanConfigProvider  BudgetProvider  KeyboardShortcutsProvider
                               |
                          app/page.tsx
                         /     |      \
                        /      |       \
      OnboardingWizard   TabNavigation   Calculator Tabs
      AIConsole               |          (Configure, Results, Scenarios, ...)
           |                  |                |
    ai-onboarding.ts   useCalculation    useWorkerSimulations
    aiOnboardingMapper  usePlanConfigSelectors    |
           |                  |          monte-carlo-worker.ts
           v                  v                |
     PlanConfig <--- plan-config-context.tsx    |
     (SSOT)               |                    v
           \              v           lib/calculations/shared/
            \    retirementEngine.ts  <--- (constants, tax, SS, RMD,
             \          |                   returns, withdrawals, bonds)
              \         v
               useCalculatorResults.ts
                        |
                        v
              Display Components
              (Charts, StatCards, Summary)
```

---

## Key Architectural Decisions

### PlanConfig as Single Source of Truth (SSOT)

All calculator inputs live in a single `PlanConfig` object managed by `PlanConfigProvider`. Components read via `usePlanConfig()` or optimized selectors (`usePlanConfigSelectors`). No parallel state is allowed. This eliminates sync bugs, simplifies persistence (single localStorage key), and makes scenario save/load trivial (serialize one object).

### Web Workers for Monte Carlo Simulations

Monte Carlo simulations (2000 paths) run in a dedicated Web Worker (`monte-carlo-worker.ts`) to avoid blocking the UI thread. The worker imports the same shared calculation primitives (`lib/calculations/shared/`) as the main engine, guaranteeing consistency. Progress updates are streamed back via `postMessage` for real-time UI feedback.

### AI-Powered Onboarding Flow

Users can choose between a traditional step-by-step wizard or a Claude AI-powered conversational onboarding. The AI console (`AIConsole.tsx`) streams responses from the `/api/ai-onboarding` endpoint, progressively extracts structured data, generates reasonable assumptions with confidence levels, and maps everything into PlanConfig via `aiOnboardingMapper.ts`. A client-side fallback (`processOnboardingClientSide.ts`) handles assumption generation without API calls for offline or free-tier usage.

### Shared Calculation Primitives

All core financial math (tax brackets, Social Security PIA, RMD divisors, bond allocation, return generation) lives in `lib/calculations/shared/`. Both the main-thread retirement engine and the Web Worker import from this single source, preventing calculation divergence. These modules are kept free of browser/DOM dependencies to ensure worker compatibility.

### Context Provider Composition

The app wraps all pages in a composed provider stack (`Providers.tsx`): `KeyboardShortcutsProvider > ThemeProvider > OfflineProvider > PlanConfigProvider > BudgetProvider`. This ordering ensures that PlanConfig (which depends on offline awareness for caching) is always available to budget calculations downstream.

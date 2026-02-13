"use client";

import React, { ReactNode } from "react";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBanner } from "@/components/layout/TopBanner";
import { Spinner } from "@/components/calculator/InputHelpers";
import { TrendingUp } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface IncomeCalculatorLayoutProps {
  /** Page title shown in header */
  title: string;
  /** Main card title */
  cardTitle: string;
  /** Main card description */
  cardDescription: string;
  /** Icon to show next to card title */
  cardIcon?: ReactNode;
  /** Children components (form sections) */
  children: ReactNode;
  /** Results section component */
  resultsSection?: ReactNode;
  /** AI Onboarding state */
  aiOnboarding: {
    isFromAIOnboarding: boolean;
    showAIBanner: boolean;
    onClearAIData: () => void;
    onDismissBanner: () => void;
    bannerDescription?: string;
  };
  /** Calculation state */
  calculation: {
    isDirty: boolean;
    isCalculating: boolean;
    error: string | null;
    hasResults: boolean;
    onCalculate: () => void;
    calculateButtonText: string;
    calculateButtonIcon?: ReactNode;
  };
  /** Apply to main plan handler */
  onApplyToMainPlan?: () => void;
  /** Quick navigation links */
  quickNavLinks?: Array<{
    label: string;
    targetId: string;
  }>;
  /** Back to top state */
  backToTop: {
    showButton: boolean;
    onScrollToTop: () => void;
  };
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * AI Onboarding Banner - Shown when data is pre-filled from AI
 */
export const AIOnboardingBanner: React.FC<{
  description?: string;
  onClear: () => void;
  onDismiss: () => void;
}> = ({
  description = "Your income, housing, and estimated monthly expenses have been pre-filled from your onboarding conversation. Review and edit any values below, then calculate to see your projections.",
  onClear,
  onDismiss,
}) => (
  <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-blue-900 dark:text-blue-100 text-base mb-1">
              Pre-filled from AI Onboarding
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              {description}
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
          >
            Clear & Start Fresh
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
            aria-label="Dismiss AI onboarding banner"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
);

/**
 * Quick Navigation Card
 */
export const QuickNavigation: React.FC<{
  links: Array<{ label: string; targetId: string }>;
}> = ({ links }) => (
  <Card className="mb-6">
    <CardContent className="pt-6">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Button
            key={link.targetId}
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(link.targetId)?.scrollIntoView({ behavior: 'smooth' })}
          >
            {link.label}
          </Button>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Recalculation Banner - Shown when inputs have changed
 */
export const RecalculationBanner: React.FC<{
  isCalculating: boolean;
  onRecalculate: () => void;
}> = ({ isCalculating, onRecalculate }) => (
  <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-yellow-600 dark:text-yellow-500">Warning</div>
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">Inputs Modified</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Recalculate to see updated projections</p>
          </div>
        </div>
        <Button onClick={onRecalculate} disabled={isCalculating} variant="default" className="flex items-center gap-2">
          {isCalculating ? (
            <>
              <Spinner className="w-4 h-4" /> Calculating...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" /> Recalculate
            </>
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Calculation Error Card
 */
export const CalculationError: React.FC<{
  error: string;
}> = ({ error }) => (
  <Card className="mb-6 border-destructive">
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <div className="text-destructive">Warning</div>
        <div>
          <p className="font-semibold text-destructive">Calculation Error</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Calculate Actions - Primary action buttons
 */
export const CalculateActions: React.FC<{
  isCalculating: boolean;
  onCalculate: () => void;
  onApplyToMainPlan?: () => void;
  calculateButtonText: string;
  calculateButtonIcon?: ReactNode;
}> = ({
  isCalculating,
  onCalculate,
  onApplyToMainPlan,
  calculateButtonText,
  calculateButtonIcon,
}) => (
  <div className="flex justify-center gap-4 pb-8">
    <Button size="lg" onClick={onCalculate} disabled={isCalculating} className="flex items-center gap-2">
      {isCalculating ? (
        <>
          <Spinner className="w-5 h-5" /> Calculating...
        </>
      ) : (
        <>
          {calculateButtonIcon || <TrendingUp className="w-5 h-5" />}
          {calculateButtonText}
        </>
      )}
    </Button>

    {onApplyToMainPlan && (
      <Button
        size="lg"
        variant="outline"
        onClick={onApplyToMainPlan}
        className="flex items-center gap-2"
        title="Save these values to your main retirement plan"
      >
        <Sparkles className="w-5 h-5" /> Apply to Main Plan
      </Button>
    )}
  </div>
);

/**
 * Back to Top Button
 */
export const BackToTopButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
    aria-label="Back to top"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  </button>
);

/**
 * Section Card - Reusable card for form sections
 */
export const SectionCard: React.FC<{
  id?: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}> = ({ id, icon, title, description, children, className = "mb-6" }) => (
  <Card className={className} id={id}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

/**
 * IncomeCalculatorLayout - Shared layout for income calculators
 *
 * This component provides the common structure for both the W-2 income calculator
 * and the self-employed/K-1 calculator, reducing code duplication while allowing
 * for calculator-specific customization through props and children.
 */
export const IncomeCalculatorLayout: React.FC<IncomeCalculatorLayoutProps> = ({
  title,
  cardTitle,
  cardDescription,
  cardIcon,
  children,
  resultsSection,
  aiOnboarding,
  calculation,
  onApplyToMainPlan,
  quickNavLinks,
  backToTop,
}) => {
  return (
    <div className="min-h-screen bg-background">
      <TopBanner />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Go back to home page">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
          <h1 className="font-semibold text-xl">{title}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* AI Onboarding Banner */}
        {aiOnboarding.showAIBanner && aiOnboarding.isFromAIOnboarding && (
          <AIOnboardingBanner
            description={aiOnboarding.bannerDescription}
            onClear={aiOnboarding.onClearAIData}
            onDismiss={aiOnboarding.onDismissBanner}
          />
        )}

        {/* Main Card Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cardIcon}
              {cardTitle}
            </CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>
        </Card>

        {/* Quick Navigation */}
        {quickNavLinks && quickNavLinks.length > 0 && (
          <QuickNavigation links={quickNavLinks} />
        )}

        {/* Form Sections (children) */}
        {children}

        {/* Calculate Actions */}
        <CalculateActions
          isCalculating={calculation.isCalculating}
          onCalculate={calculation.onCalculate}
          onApplyToMainPlan={onApplyToMainPlan}
          calculateButtonText={calculation.calculateButtonText}
          calculateButtonIcon={calculation.calculateButtonIcon}
        />

        {/* Recalculation Banner */}
        {calculation.isDirty && calculation.hasResults && (
          <RecalculationBanner
            isCalculating={calculation.isCalculating}
            onRecalculate={calculation.onCalculate}
          />
        )}

        {/* Calculation Error */}
        {calculation.error && (
          <CalculationError error={calculation.error} />
        )}

        {/* Results Section */}
        {resultsSection}
      </main>

      {/* Back to Top Button */}
      {backToTop.showButton && (
        <BackToTopButton onClick={backToTop.onScrollToTop} />
      )}
    </div>
  );
};

export default IncomeCalculatorLayout;

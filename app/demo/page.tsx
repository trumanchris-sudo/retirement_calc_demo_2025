"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Hero } from "@/components/layout/Hero";
import { PageHeader } from "@/components/layout/PageHeader";
import { TopBanner } from "@/components/layout/TopBanner";
import { Section } from "@/components/layout/Section";
import { SliderInput } from "@/components/form/SliderInput";
import { NumberInput } from "@/components/form/NumberInput";
import { CollapsibleSection } from "@/components/form/CollapsibleSection";
import { CalculateButton } from "@/components/form/CalculateButton";
import { AnimatedStatCard } from "@/components/results/AnimatedStatCard";
import { ResultsGrid } from "@/components/results/ResultsGrid";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { DollarSign, TrendingUp, PiggyBank, Wallet } from "lucide-react";
import { announceToScreenReader } from "@/components/a11y/LiveRegion";
import { useTheme } from "@/lib/theme-context";

export default function DemoPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const [age, setAge] = useState(35);
  const [balance, setBalance] = useState(500000);
  const [returnRate, setReturnRate] = useState(7.5);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleDarkMode = useCallback(() => {
    toggleTheme();
    // Announce mode change to screen readers
    announceToScreenReader(
      `Switched to ${isDarkMode ? "light" : "dark"} mode`,
      "polite"
    );
  }, [isDarkMode, toggleTheme]);

  // Calculate projected values for demo
  const years = 65 - age;
  const futureValue = balance * Math.pow(1 + returnRate / 100, years);
  const annualWithdrawal = futureValue * 0.04;
  const realValue = futureValue / Math.pow(1.026, years);

  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    // Announce calculation started
    announceToScreenReader("Calculating your retirement projection...", "polite");

    setTimeout(() => {
      setIsCalculating(false);
      setShowResults(true);

      // Announce results to screen readers
      const formattedFutureValue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(futureValue);

      announceToScreenReader(
        `Calculation complete. Your projected balance at age 65 is ${formattedFutureValue}.`,
        "polite"
      );

      // Scroll to results with reduced motion support
      const resultsSection = document.getElementById("results");
      if (resultsSection) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        resultsSection.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
        // Focus on the results section for screen reader users
        resultsSection.focus();
      }
    }, 1500);
  }, [futureValue]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to calculate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && age < 65 && !isCalculating) {
        e.preventDefault();
        handleCalculate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [age, isCalculating, handleCalculate]);

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />

      <PageHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        showActions={showResults}
        onPrint={() => window.print()}
        onShare={() => alert("Share functionality")}
      />

      {/* Main content wrapper with landmark and skip target */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Hero
          title="Retirement Calculator UI Demo"
          subtitle="Explore the new modern components and design system for the retirement planning calculator"
          showScrollIndicator
        />

        <Section
          id="calculator-content"
          title="Interactive Calculator Demo"
          subtitle="Try out the new form components and see the animated results"
          background="muted"
          role="region"
          ariaLabel="Calculator inputs"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Basic Inputs */}
            <fieldset className="rounded-xl border bg-card p-4 sm:p-6 space-y-6">
              <legend className="sr-only">Your Information</legend>
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Your Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <NumberInput
                  id="age-input"
                  label="Current Age"
                  value={age}
                  onChange={setAge}
                  min={18}
                  max={100}
                  suffix="years"
                  description="Your age today"
                  required
                />

                <NumberInput
                  id="balance-input"
                  label="Current Balance"
                  value={balance}
                  onChange={setBalance}
                  prefix="$"
                  min={0}
                  step={1000}
                  description="Total retirement savings"
                  required
                />
              </div>
            </fieldset>

            {/* Collapsible Advanced Options */}
            <CollapsibleSection
              id="advanced-options"
              title="Advanced Assumptions"
              description="Customize your projections"
              badge={`${returnRate}% return`}
            >
              <SliderInput
                id="return-rate-slider"
                label="Expected Return Rate"
                value={returnRate}
                onChange={setReturnRate}
                min={0}
                max={15}
                step={0.5}
                unit="%"
                description="Average annual return on investments"
              />

              <div
                className="text-sm text-slate-600 dark:text-slate-400 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                role="note"
              >
                <span aria-hidden="true">&#128161; </span>
                <strong>Tip:</strong> Historical S&amp;P 500 returns average around 10% annually
              </div>
            </CollapsibleSection>

            {/* Calculate Button */}
            <CalculateButton
              onClick={handleCalculate}
              loading={isCalculating}
              disabled={age >= 65}
              error={age >= 65 ? "Age must be less than 65 for this demo" : undefined}
              disabledHint={age >= 65 ? "Please enter an age below 65 to calculate" : undefined}
            />

            {/* Keyboard shortcut hint */}
            <p className="text-xs text-center text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd>
              {" to calculate"}
            </p>
          </div>
        </Section>

        {/* Results Section */}
        {showResults && (
          <AnimatedSection animation="slide-up" duration={700}>
            <Section
              id="results"
              title="Your Retirement Projection"
              subtitle="Based on your inputs, here's what your future looks like"
              role="region"
              ariaLabel="Calculation results"
            >
              {/* Screen reader summary */}
              <div className="sr-only" role="status" aria-live="polite">
                Retirement projection results: Your projected balance at age 65 is{" "}
                ${futureValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}.
                In today&apos;s dollars, that&apos;s ${realValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}.
                Your annual withdrawal using a 4% rate would be ${annualWithdrawal.toLocaleString("en-US", { maximumFractionDigits: 0 })}.
              </div>

              <AnimatedSection animation="fade-in" delay={200}>
                <ResultsGrid columns={4}>
                  <AnimatedStatCard
                    label="Future Balance"
                    value={futureValue}
                    format="currency"
                    sublabel={`At age 65 (${years} years)`}
                    icon={DollarSign}
                    delay={0}
                  />

                  <AnimatedStatCard
                    label="In Today's Dollars"
                    value={realValue}
                    format="currency"
                    sublabel="Inflation-adjusted value"
                    icon={PiggyBank}
                    delay={100}
                  />

                  <AnimatedStatCard
                    label="Annual Withdrawal"
                    value={annualWithdrawal}
                    format="currency"
                    sublabel="4% withdrawal rate"
                    icon={Wallet}
                    delay={200}
                  />

                  <AnimatedStatCard
                    label="Return Rate"
                    value={returnRate}
                    format="percentage"
                    sublabel="Average annual return"
                    icon={TrendingUp}
                    delay={300}
                    change={returnRate - 7}
                  />
                </ResultsGrid>
              </AnimatedSection>

              <AnimatedSection animation="scale-in" delay={600}>
                <div
                  className="mt-8 sm:mt-12 p-4 sm:p-8 rounded-xl bg-gradient-to-br from-blue-50 via-violet-50/30 to-background dark:from-blue-950/20 dark:via-violet-950/10 dark:to-background border"
                  role="status"
                  aria-label="Summary of your retirement projection"
                >
                  <h3 className="text-xl sm:text-2xl font-bold mb-3">
                    <span aria-hidden="true">&#127881; </span>
                    Looking Great!
                  </h3>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                    Based on your current savings of{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      ${balance.toLocaleString()}
                    </strong>{" "}
                    and an expected return of{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {returnRate}%
                    </strong>
                    , you&apos;re projected to have{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      ${futureValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </strong>{" "}
                    by age 65. That&apos;s{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      ${realValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </strong>{" "}
                    in today&apos;s purchasing power!
                  </p>
                </div>
              </AnimatedSection>
            </Section>
          </AnimatedSection>
        )}

        {/* Component Showcase */}
        <AnimatedSection animation="fade-in">
          <Section
            title="Design System Elements"
            subtitle="All the building blocks for the modern UI"
            background="muted"
            role="complementary"
            ariaLabel="Design system showcase"
          >
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              <AnimatedSection animation="slide-up" delay={200}>
                <article
                  className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] animate-gradient text-white"
                >
                  <h4 className="text-lg sm:text-xl font-bold mb-2">
                    <span aria-hidden="true">&#10024; </span>
                    Animated Gradient Banner
                  </h4>
                  <p className="text-sm sm:text-base">
                    Smooth, eye-catching background animation with pattern overlay
                  </p>
                </article>
              </AnimatedSection>

              <AnimatedSection animation="slide-up" delay={300}>
                <article className="p-4 sm:p-6 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-4">
                    <span aria-hidden="true">&#127912; </span>
                    Gradient Sliders
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Enhanced sliders with gradient track fills and smooth hover effects
                  </p>
                  <SliderInput
                    id="demo-slider"
                    label="Demo Gradient Slider"
                    value={returnRate}
                    onChange={setReturnRate}
                    min={0}
                    max={15}
                    step={0.5}
                    unit="%"
                    description="Watch the gradient track and hover effects!"
                  />
                </article>
              </AnimatedSection>

              <AnimatedSection animation="slide-up" delay={400}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <article
                    className="p-4 sm:p-6 rounded-xl border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500"
                    tabIndex={0}
                  >
                    <h4 className="font-semibold mb-2">
                      <span aria-hidden="true">&#127917; </span>
                      Hover Effects
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Cards lift and glow on hover with smooth transitions
                    </p>
                  </article>

                  <article className="p-4 sm:p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <h4 className="font-semibold mb-2">
                      <span aria-hidden="true">&#127763; </span>
                      Color System
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Full dark mode support with accessible contrast
                    </p>
                  </article>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="scale-in" delay={500}>
                <article className="p-4 sm:p-6 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-2">
                    <span aria-hidden="true">&#127916; </span>
                    Animated Reveals
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Smooth scroll-triggered animations using Intersection Observer API with staggered delays
                  </p>
                </article>
              </AnimatedSection>
            </div>
          </Section>
        </AnimatedSection>
      </main>
    </div>
  );
}

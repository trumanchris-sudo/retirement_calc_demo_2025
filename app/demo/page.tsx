"use client";

import React, { useState } from "react";
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

export default function DemoPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [age, setAge] = useState(35);
  const [balance, setBalance] = useState(500000);
  const [returnRate, setReturnRate] = useState(7.5);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setShowResults(true);
      // Scroll to results
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 1500);
  };

  // Calculate projected values for demo
  const years = 65 - age;
  const futureValue = balance * Math.pow(1 + returnRate / 100, years);
  const annualWithdrawal = futureValue * 0.04;
  const realValue = futureValue / Math.pow(1.026, years);

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
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Basic Inputs */}
          <div className="rounded-xl border bg-card p-6 space-y-6">
            <h3 className="text-xl font-semibold mb-4">Your Information</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <NumberInput
                label="Current Age"
                value={age}
                onChange={setAge}
                min={18}
                max={100}
                suffix="years"
                description="Your age today"
              />

              <NumberInput
                label="Current Balance"
                value={balance}
                onChange={setBalance}
                prefix="$"
                min={0}
                step={1000}
                description="Total retirement savings"
              />
            </div>
          </div>

          {/* Collapsible Advanced Options */}
          <CollapsibleSection
            title="Advanced Assumptions"
            description="Customize your projections"
            badge={`${returnRate}% return`}
          >
            <SliderInput
              label="Expected Return Rate"
              value={returnRate}
              onChange={setReturnRate}
              min={0}
              max={15}
              step={0.5}
              unit="%"
              description="Average annual return on investments"
            />

            <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              💡 <strong>Tip:</strong> Historical S&P 500 returns average around 10% annually
            </div>
          </CollapsibleSection>

          {/* Calculate Button */}
          <CalculateButton
            onClick={handleCalculate}
            loading={isCalculating}
            disabled={age >= 65}
            error={age >= 65 ? "Age must be less than 65 for this demo" : undefined}
          />
        </div>
      </Section>

      {/* Results Section */}
      {showResults && (
        <AnimatedSection animation="slide-up" duration={700}>
          <Section
            id="results"
            title="Your Retirement Projection"
            subtitle="Based on your inputs, here's what your future looks like"
          >
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
              <div className="mt-12 p-8 rounded-xl bg-gradient-to-br from-blue-50 via-violet-50/30 to-background dark:from-blue-950/20 dark:via-violet-950/10 dark:to-background border">
                <h3 className="text-2xl font-bold mb-3">🎉 Looking Great!</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Based on your current savings of <strong className="text-blue-600 dark:text-blue-400">${balance.toLocaleString()}</strong> and
                  an expected return of <strong className="text-blue-600 dark:text-blue-400">{returnRate}%</strong>, you&apos;re projected to have{" "}
                  <strong className="text-blue-600 dark:text-blue-400">${futureValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>{" "}
                  by age 65. That&apos;s <strong className="text-emerald-600 dark:text-emerald-400">${realValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> in
                  today&apos;s purchasing power!
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
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="p-6 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto] animate-gradient text-white">
                <h4 className="text-xl font-bold mb-2">✨ Animated Gradient Banner</h4>
                <p>Smooth, eye-catching background animation with pattern overlay</p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={300}>
              <div className="p-6 rounded-xl border bg-card">
                <h4 className="font-semibold mb-4">🎨 Gradient Sliders</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Enhanced sliders with gradient track fills and smooth hover effects
                </p>
                <SliderInput
                  label="Demo Gradient Slider"
                  value={returnRate}
                  onChange={setReturnRate}
                  min={0}
                  max={15}
                  step={0.5}
                  unit="%"
                  description="Watch the gradient track and hover effects!"
                />
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={400}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <h4 className="font-semibold mb-2">🎭 Hover Effects</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cards lift and glow on hover with smooth transitions
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold mb-2">🌓 Color System</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Full dark mode support with accessible contrast
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="scale-in" delay={500}>
              <div className="p-6 rounded-xl border bg-card">
                <h4 className="font-semibold mb-2">🎬 Animated Reveals</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Smooth scroll-triggered animations using Intersection Observer API with staggered delays
                </p>
              </div>
            </AnimatedSection>
          </div>
        </Section>
      </AnimatedSection>
    </div>
  );
}

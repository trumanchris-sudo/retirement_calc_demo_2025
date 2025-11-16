"use client";

import React from "react";
import "./LegacyResultCard.css";

/* =========================
   Helpers
========================= */
const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const kOrM = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n.toFixed(0)}`;
};

/* Premium Icons - Minimal & Elegant */
const IconDiamond = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M12 2L2 9l10 13L22 9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <path d="M2 9h20M12 2l-3 7h6l-3-7zM7 9l5 13M17 9l-5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCrown = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M3 8l3 10h12l3-10-6 3-3-3-3 3-6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
    <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="21" cy="8" r="1.5" fill="currentColor"/>
  </svg>
);

const IconGeneration = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M12 2v20M8 18l4 4 4-4M8 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);

type LegacyProps = {
  payout: number;
  duration?: number;
  isPerpetual?: boolean;
  currency?: string;
  label?: string;
  variant?: 'platinum' | 'gold' | 'emerald' | 'default';
};

export const LegacyResultCard: React.FC<LegacyProps> = ({
  payout,
  duration = 0,
  isPerpetual = false,
  currency = "USD",
  label,
  variant = 'default'
}) => {
  // Auto-select variant based on outcome if not specified
  const selectedVariant = variant === 'default'
    ? (isPerpetual ? 'platinum' : (duration > 100 ? 'gold' : 'emerald'))
    : variant;

  const headline = isPerpetual ? "Perpetual Legacy" : "Generational Wealth";
  const subheadline = isPerpetual ? "Infinite Horizon" : `${duration} Year Duration`;
  const icon = isPerpetual ? <IconDiamond /> : (duration > 50 ? <IconCrown /> : <IconGeneration />);

  return (
    <div
      className={`legacy-premium-card legacy-premium-card--${selectedVariant} ${isPerpetual ? 'is-perpetual' : 'is-finite'}`}
      role="region"
      aria-label={headline}
    >
      {/* Glassmorphic overlay */}
      <div className="legacy-premium-card__glass" />

      {/* Ambient glow */}
      <div className="legacy-premium-card__glow" />

      {/* Content Container */}
      <div className="legacy-premium-card__content">

        {/* Icon with elegant backdrop */}
        <div className="legacy-premium-card__icon-container">
          <div className="legacy-premium-card__icon-backdrop" />
          {icon}
        </div>

        {/* Main headline */}
        <div className="legacy-premium-card__header">
          <h3 className="legacy-premium-card__headline">{headline}</h3>
          <p className="legacy-premium-card__subheadline">{subheadline}</p>
        </div>

        {/* Divider line */}
        <div className="legacy-premium-card__divider" />

        {/* Primary value - Large, elegant serif font */}
        <div className="legacy-premium-card__value">
          <div className="legacy-premium-card__currency">USD</div>
          <div className="legacy-premium-card__amount">{fmtMoney(payout, currency)}</div>
          <div className="legacy-premium-card__period">per beneficiary / year</div>
        </div>

        {/* Real dollar badge */}
        <div className="legacy-premium-card__badge">
          <svg className="legacy-premium-card__badge-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M3 3h6a1.5 1.5 0 010 3H3M3 6h6a1.5 1.5 0 010 3H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>2025 Real Dollars</span>
        </div>

        {/* Detail text */}
        <p className="legacy-premium-card__detail">
          {label || (isPerpetual
            ? `Portfolio maintains purchasing power across generations, delivering ${kOrM(payout)} annually in today's dollars, indefinitely.`
            : `Supports ${duration} years of distributions, providing approximately ${kOrM(payout)} per beneficiary each year, inflation-adjusted.`)}
        </p>

        {/* Metallic accent line */}
        <div className="legacy-premium-card__accent" />
      </div>
    </div>
  );
};

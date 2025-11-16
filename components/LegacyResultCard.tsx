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
const IconCrown = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M3 8l3 10h12l3-10-6 3-3-3-3 3-6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
    <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="21" cy="8" r="1.5" fill="currentColor"/>
  </svg>
);

const IconShield = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconHourglass = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M8 2h8M8 22h8M6 6h12l-4 6 4 6H6l4-6-4-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <path d="M12 12l-2-2M12 12l2-2M12 12l-2 2M12 12l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWarning = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden className="premium-icon">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1"/>
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type LegacyProps = {
  payout: number;
  duration?: number;
  isPerpetual?: boolean;
  successRate?: number; // 0-100 percentage
  currency?: string;
  label?: string;
};

export const LegacyResultCard: React.FC<LegacyProps> = ({
  payout,
  duration = 0,
  isPerpetual = false,
  successRate = 0,
  currency = "USD",
  label
}) => {
  // Determine variant based on success rate
  // 80-100%: excellent (navy/gold), 50-79%: good (slate/silver), 25-49%: concerning (purple/lavender), 0-24%: warning (burgundy/copper)
  const getVariant = () => {
    if (successRate >= 80) return 'excellent';
    if (successRate >= 50) return 'good';
    if (successRate >= 25) return 'concerning';
    return 'warning';
  };

  const selectedVariant = getVariant();

  // Icon selection based on success rate
  const getIcon = () => {
    if (successRate >= 80) return <IconCrown />;
    if (successRate >= 50) return <IconShield />;
    if (successRate >= 25) return <IconHourglass />;
    return <IconWarning />;
  };

  const icon = getIcon();

  // Subheadline: "PERPETUAL LEGACY" for perpetual, duration for finite
  const subheadline = isPerpetual
    ? 'PERPETUAL LEGACY'
    : `${duration.toLocaleString('en-US')} YEAR DURATION`;

  return (
    <div
      className={`legacy-premium-card legacy-premium-card--${selectedVariant} ${isPerpetual ? 'is-perpetual' : 'is-finite'}`}
      role="region"
      aria-label="Generational Wealth"
    >
      {/* Glassmorphic overlay */}
      <div className="legacy-premium-card__glass" />

      {/* Ambient glow */}
      <div className="legacy-premium-card__glow" />

      {/* Content Container - Vertical Layout */}
      <div className="legacy-premium-card__content">

        {/* Top: Icon */}
        <div className="legacy-premium-card__top">
          <div className="legacy-premium-card__icon-container">
            <div className="legacy-premium-card__icon-backdrop" />
            {icon}
          </div>
        </div>

        {/* Main: All content */}
        <div className="legacy-premium-card__main">

          {/* Header */}
          <div className="legacy-premium-card__header">
            <h3 className="legacy-premium-card__headline">Generational Wealth</h3>
            <p className="legacy-premium-card__subheadline">{subheadline}</p>
          </div>

          {/* Main metrics - vertical stack */}
          <div className="legacy-premium-card__metrics">

            {/* SUCCESS RATE - The hero metric */}
            <div className="legacy-premium-card__success">
              <div className="legacy-premium-card__success-percentage">{Math.round(successRate)}%</div>
              <div className="legacy-premium-card__success-label">SUCCESS RATE</div>
            </div>

            {/* Dollar amount */}
            <div className="legacy-premium-card__value">
              <div className="legacy-premium-card__amount">{fmtMoney(payout, currency)}</div>
              <div className="legacy-premium-card__period">per beneficiary / year</div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

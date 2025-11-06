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

/* Simple, clean infinity glyph */
const IconInfinity = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M18.5 8c-2.1 0-3.8 1.6-6.5 4.5C9.3 15.4 7.6 17 5.5 17 3.6 17 2 15.4 2 13.5S3.6 10 5.5 10c2.1 0 3.8 1.6 6.5 4.5 2.7 2.9 4.4 4.5 6.5 4.5 1.9 0 3.5-1.6 3.5-3.5S20.4 8 18.5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconGenerations = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M3 12h3M18 12h3M12 3v3M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

type LegacyProps = {
  payout: number;           // per beneficiary, per year (real)
  duration?: number;        // years (ignored if isPerpetual)
  isPerpetual?: boolean;
  currency?: string;        // default USD
  label?: string;           // optional subtitle override
};

export const LegacyResultCard: React.FC<LegacyProps> = ({
  payout,
  duration = 0,
  isPerpetual = false,
  currency = "USD",
  label
}) => {
  const headline = isPerpetual ? "Perpetual Legacy" : "Years of Support";
  const big = isPerpetual ? "∞" : String(duration);
  const micro = isPerpetual ? "Inflation-indexed, principal preserved" : "Inflation-indexed support";
  const chip = isPerpetual ? "Real $ / yr" : `${duration} yrs`;
  const payoff = `${fmtMoney(payout, currency)} per beneficiary / year (real)`;

  return (
    <div className={`legacy-card ${isPerpetual ? "is-perpetual" : "is-finite"}`} role="region" aria-label={headline}>
      <div className="legacy-card__icon">{isPerpetual ? <IconInfinity /> : <IconGenerations />}</div>

      <div className="legacy-card__big">{big}</div>
      <div className="legacy-card__headline">{headline}</div>

      <div className="legacy-card__chip" aria-hidden>
        {chip}
      </div>

      <p className="legacy-card__promise">
        <strong>{payoff}</strong>
      </p>

      <p className="legacy-card__detail">
        {label
          ? label
          : isPerpetual
          ? `Sustains approximately ${kOrM(payout)} per beneficiary every year, in today's dollars.`
          : `Delivers about ${kOrM(payout)} per beneficiary each year for ${duration} years, indexed to inflation.`}
      </p>

      <div className="legacy-card__micro">{micro}</div>
    </div>
  );
};

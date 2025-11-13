"use client";

import React from "react";

/* Format currency */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/* Icons */
const IconInfinity = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
    <path d="M18.5 8c-2.1 0-3.8 1.6-6.5 4.5C9.3 15.4 7.6 17 5.5 17 3.6 17 2 15.4 2 13.5S3.6 10 5.5 10c2.1 0 3.8 1.6 6.5 4.5 2.7 2.9 4.4 4.5 6.5 4.5 1.9 0 3.5-1.6 3.5-3.5S20.4 8 18.5 8Z"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTarget = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

type GenerationalResultCardProps = {
  variant: "perpetual" | "finite";
  amountPerBeneficiary: number;
  yearsOfSupport: number | "Infinity";
  percentile10: number | "Infinity";
  percentile50: number | "Infinity";
  percentile90: number | "Infinity";
  probability: number;
  explanationText: string;
};

export const GenerationalResultCard: React.FC<GenerationalResultCardProps> = ({
  variant,
  amountPerBeneficiary,
  yearsOfSupport,
  percentile10,
  percentile50,
  percentile90,
  probability,
  explanationText,
}) => {
  const isPerpetual = variant === "perpetual";

  const gradientClass = isPerpetual
    ? "bg-gradient-to-br from-[#0d3cff] to-[#5b00ff]"
    : "bg-gradient-to-br from-[#6e00a8] to-[#c100ff]";

  const title = isPerpetual ? "Perpetual Legacy" : "Years of Support";
  const icon = isPerpetual ? <IconInfinity /> : <IconTarget />;

  const p10Display = percentile10 === "Infinity" || percentile10 === Infinity
    ? "∞ years (Perpetual)"
    : `${percentile10} years`;
  const p50Display = percentile50 === "Infinity" || percentile50 === Infinity
    ? "∞ years (Perpetual)"
    : `${percentile50} years`;
  const p90Display = percentile90 === "Infinity" || percentile90 === Infinity
    ? "∞ years (Perpetual)"
    : `${percentile90} years`;

  const probabilityDisplay = `~${Math.round(probability * 100)}%`;
  const probabilityLabel = isPerpetual
    ? "Probability of Perpetual Wealth"
    : "Success Rate";

  const microText = isPerpetual
    ? `Supports approximately ${fmt(amountPerBeneficiary)} per beneficiary every year, in today's dollars.`
    : `Delivers about ${fmt(amountPerBeneficiary)} per beneficiary each year for ${yearsOfSupport} years, indexed to inflation.`;

  return (
    <div
      className={`${gradientClass} text-white overflow-hidden`}
      style={{
        borderRadius: '32px',
        padding: '36px 32px 32px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
        maxWidth: '700px',
        margin: '0 auto',
        width: '100%'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ color: 'white' }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.02em', margin: 0 }}>
            {title}
          </h2>
        </div>
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Real $ / yr
        </div>
      </div>

      {/* Primary Value */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        {isPerpetual ? (
          <>
            <div style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: '1.1' }}>
              {fmt(amountPerBeneficiary)}
            </div>
            <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.9 }}>
              per beneficiary / year (real)
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '96px', fontWeight: 'bold', lineHeight: '1', letterSpacing: '-0.03em' }}>
              {yearsOfSupport}
            </div>
            <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.9 }}>
              Years of Support
            </div>
          </>
        )}
      </div>

      {/* Micro Text */}
      <div style={{ fontSize: '14px', opacity: 0.85, marginBottom: '28px', textAlign: 'center', lineHeight: '1.5' }}>
        {microText}
      </div>

      {/* Subcards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {/* Percentile Outcomes */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '16px 20px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', margin: 0 }}>
            Percentile Outcomes
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '1.8', opacity: 0.95 }}>
            <li>10th Percentile: {p10Display}</li>
            <li>50th Percentile: {p50Display}</li>
            <li>90th Percentile: {p90Display}</li>
          </ul>
        </div>

        {/* Probability */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '16px 20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
            {probabilityDisplay}
          </div>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
            {probabilityLabel}
          </p>
        </div>

        {/* What This Means */}
        <details
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '16px 20px',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer'
          }}
        >
          <summary style={{ fontSize: '14px', fontWeight: '600', listStyle: 'none', userSelect: 'none' }}>
            <span>What This Means</span>
          </summary>
          <p style={{ fontSize: '13px', marginTop: '12px', lineHeight: '1.6', opacity: 0.95, margin: '12px 0 0 0' }}>
            {explanationText}
          </p>
        </details>
      </div>
    </div>
  );
};

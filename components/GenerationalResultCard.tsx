"use client";

import React from "react";
import { fmtFull } from "@/lib/utils";

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

  const title = isPerpetual ? "Perpetual Legacy" : "Finite Legacy";
  const icon = isPerpetual ? <IconInfinity /> : <IconTarget />;

  const p10Display = percentile10 === "Infinity" || percentile10 === Infinity ? "∞" : `${percentile10}`;
  const p50Display = percentile50 === "Infinity" || percentile50 === Infinity ? "∞" : `${percentile50}`;
  const p90Display = percentile90 === "Infinity" || percentile90 === Infinity ? "∞" : `${percentile90}`;

  return (
    <div
      className={`${gradientClass} text-white gen-card`}
      style={{
        borderRadius: '24px',
        padding: '32px 28px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        maxWidth: '480px',
        minHeight: '360px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ color: 'white', opacity: 0.95 }}>
          {icon}
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.01em', margin: 0, flex: 1 }}>
          {title}
        </h2>
      </div>

      {/* Primary Value */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: isPerpetual ? '48px' : '72px', fontWeight: 'bold', lineHeight: '1', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          {isPerpetual ? fmtFull(amountPerBeneficiary) : yearsOfSupport}
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
          {isPerpetual ? "per beneficiary / year" : "years of support"}
        </div>
      </div>

      {/* Percentile Table */}
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '12px'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Percentile Outcomes
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.95 }}>
          <span>P10: {p10Display}</span>
          <span>P50: {p50Display}</span>
          <span>P90: {p90Display}</span>
        </div>
      </div>

      {/* Probability */}
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '12px 16px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '2px' }}>
          {Math.round(probability * 100)}%
        </div>
        <div style={{ fontSize: '11px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isPerpetual ? "Perpetual Probability" : "Success Rate"}
        </div>
      </div>

      {/* Footer explanation */}
      <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '16px', lineHeight: '1.4', textAlign: 'center' }}>
        {isPerpetual
          ? `Each beneficiary receives ${fmtFull(amountPerBeneficiary)}/yr (inflation-adjusted).`
          : `Each beneficiary receives ${fmtFull(amountPerBeneficiary)}/yr for ${yearsOfSupport} years.`}
      </div>
    </div>
  );
};

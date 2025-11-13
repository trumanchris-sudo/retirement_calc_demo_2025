"use client";

import React from "react";

/**
 * CubeStaticMini - Always-visible header cube icon
 *
 * CRITICAL: This component must NEVER be wrapped in conditional rendering.
 * It should always render in the header regardless of loading states,
 * dark mode, print mode, or any other application state.
 */
export default function CubeStaticMini() {
  return (
    <div className="cube-mini">
      <div className="cube-mini-inner">
        <svg viewBox="0 0 100 100" className="cube-mini-svg" aria-hidden="true">
          <defs>
            <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8366e8" />
              <stop offset="100%" stopColor="#6b4cd6" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="20" fill="url(#cubeGradient)" />
          <text
            x="50"
            y="68"
            textAnchor="middle"
            fontWeight="700"
            fontSize="56"
            fill="#fff"
            style={{ userSelect: 'none' }}
          >
            R
          </text>
        </svg>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  onComplete?: () => void;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"spin" | "settle" | "handoff" | "hidden">("spin");

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Skip animations for reduced motion
      setPhase("hidden");
      onComplete?.();
      return;
    }

    // Spin phase: 2.6s
    const spinTimer = setTimeout(() => {
      setPhase("settle");
    }, 2600);

    // Settle phase: +0.3s (2.9s total)
    const settleTimer = setTimeout(() => {
      setPhase("handoff");
    }, 2900);

    // Handoff phase: +0.3s (3.2s total)
    const handoffTimer = setTimeout(() => {
      setPhase("hidden");
      onComplete?.();
    }, 3200);

    return () => {
      clearTimeout(spinTimer);
      clearTimeout(settleTimer);
      clearTimeout(handoffTimer);
    };
  }, [onComplete]);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "brand-loader-overlay",
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      )}
      aria-live="polite"
      aria-busy={phase !== "hidden"}
    >
      <div
        className={cn(
          "brand-cube-container",
          "relative",
          phase === "spin" && "animate-brand-spin",
          phase === "settle" && "animate-brand-settle",
          phase === "handoff" && "animate-brand-handoff"
        )}
        style={{
          width: "72px",
          height: "72px",
          perspective: "500px",
          transformStyle: "preserve-3d"
        }}
      >
        <div
          className="brand-cube"
          style={{
            width: "72px",
            height: "72px",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: "translateZ(-36px)"
          }}
        >
          {/* Front face with R */}
          <div
            className="cube-face cube-face-front"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, #6b4cd6 0%, #5a3db8 100%)",
              transform: "translateZ(36px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            {/* Specular shine */}
            <div
              className="animate-shimmer"
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
                pointerEvents: "none"
              }}
            />

            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                fill="white"
                fontSize="36"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                R
              </text>
            </svg>
          </div>

          {/* Back face */}
          <div
            className="cube-face cube-face-back"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "#5a3db8",
              transform: "translateZ(-36px) rotateY(180deg)"
            }}
          />

          {/* Left face */}
          <div
            className="cube-face cube-face-left"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "#4e35a0",
              transform: "translateX(-36px) rotateY(-90deg)"
            }}
          />

          {/* Right face */}
          <div
            className="cube-face cube-face-right"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "#7d5ee6",
              transform: "translateX(36px) rotateY(90deg)"
            }}
          />

          {/* Top face */}
          <div
            className="cube-face cube-face-top"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "#8366e8",
              transform: "translateY(-36px) rotateX(90deg)"
            }}
          />

          {/* Bottom face */}
          <div
            className="cube-face cube-face-bottom"
            style={{
              position: "absolute",
              width: "72px",
              height: "72px",
              background: "#4a329c",
              transform: "translateY(36px) rotateX(-90deg)"
            }}
          />
        </div>
      </div>

      {/* Loading text */}
      <div
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium"
        style={{
          opacity: phase === "handoff" ? 0 : 1,
          transition: "opacity 0.2s ease-out"
        }}
      >
        Loading...
      </div>
    </div>
  );
};

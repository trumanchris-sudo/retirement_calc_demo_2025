"use client";
import React, { useEffect, useRef, useState } from "react";

export const BrandLoader: React.FC<{
  onHandoffStart?: () => void;
  onCubeAppended?: () => void;
  onComplete?: () => void;
}> = ({ onHandoffStart, onCubeAppended, onComplete }) => {
  const [phase, setPhase] = useState<"spin" | "handoff" | "hidden">("spin");

  // Orchestrate timing for spin -> handoff
  useEffect(() => {
    if (phase !== "spin") return;
    const timer = setTimeout(() => {
      setPhase("handoff");
      onHandoffStart?.(); // Notify parent to start fading in UI immediately
    }, 2600);
    return () => clearTimeout(timer);
  }, [phase, onHandoffStart]);

  // Complete the animation sequence
  useEffect(() => {
    if (phase !== "handoff") return;

    // After handoff animation completes, hide loader
    const completeTimer = setTimeout(() => {
      onCubeAppended?.();
      setPhase("hidden");
      onComplete?.();
    }, 600); // Wait for handoff animation to complete

    return () => clearTimeout(completeTimer);
  }, [phase, onCubeAppended, onComplete]);

  // Handle reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced && phase === "spin") {
      setPhase("hidden");
      onCubeAppended?.();
      onComplete?.();
    }
  }, [phase, onCubeAppended, onComplete]);

  if (phase === "hidden") return null;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "#f1f1f3",
        opacity: phase === "handoff" ? 0 : 1,
        transition: "opacity .5s ease",
        pointerEvents: "none",
      }}
    >
      <div className="stage" style={{ width: 72, height: 72, perspective: "900px", perspectiveOrigin: "50% 40%" }}>
        <div
          className={`cube ${!prefersReduced && phase === "spin" ? "spin3d" : ""}`}
          style={{
            width: 72,
            height: 72,
            position: "relative",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Front face with R + subtle shine */}
          <div
            className="face front"
            style={face("#6b4cd6", "translateZ(36px)")}
          >
            <svg viewBox="0 0 100 100" style={{ width: "80%", height: "80%" }} aria-hidden="true">
              <text x="50" y="64" textAnchor="middle" fontWeight="700" fontSize="64" fill="#fff">R</text>
            </svg>
            <div className="specular" />
          </div>

          <div className="face back"   style={face("#5a3db8", "rotateY(180deg) translateZ(36px)")} />
          <div className="face right"  style={face("#7d5ee6", "rotateY(90deg)  translateZ(36px)")} />
          <div className="face left"   style={face("#4e35a0", "rotateY(-90deg) translateZ(36px)")} />
          <div className="face top"    style={face("#8366e8", "rotateX(90deg)  translateZ(36px)")} />
          <div className="face bottom" style={face("#4a329c", "rotateX(-90deg) translateZ(36px)")} />
        </div>
      </div>

      <style jsx>{`
        .spin3d {
          animation: spin3d 2.4s linear infinite;
        }
        @keyframes spin3d {
          to { transform: rotateX(360deg) rotateY(360deg); }
        }
        .face { position:absolute; inset:0; border:1px solid rgba(0,0,0,.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); backface-visibility:hidden; }
        .front { overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .specular {
          position:absolute; inset:-40% -40% auto auto; width:120%; height:120%;
          background: radial-gradient(100% 60% at 80% 20%, rgba(255,255,255,.35), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen;
          animation: shimmer 2.2s ease-in-out infinite alternate;
          pointer-events:none;
        }
        @keyframes shimmer {
          from { opacity:.45; transform: translate(-10%, -10%) rotate(0deg); }
          to   { opacity:.25; transform: translate( 10%,  10%) rotate(5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spin3d { animation: none; }
          .specular { animation: none; opacity:.2; }
        }
      `}</style>
    </div>
  );
};

// tiny helper for face style
function face(bg: string, transform: string): React.CSSProperties {
  return { width: 72, height: 72, background: bg, transform };
}

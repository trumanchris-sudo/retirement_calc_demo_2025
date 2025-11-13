"use client";
import React, { useEffect, useRef, useState } from "react";

export const BrandLoader: React.FC<{
  onHandoffStart?: () => void;
  onCubeAppended?: () => void;
  onComplete?: () => void;
}> = ({ onHandoffStart, onCubeAppended, onComplete }) => {
  const [phase, setPhase] = useState<"spin" | "handoff" | "settled">("spin");

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

    // After handoff animation completes, settle cube in header
    const completeTimer = setTimeout(() => {
      onCubeAppended?.();
      setPhase("settled");
      onComplete?.();
    }, 600); // Wait for handoff animation to complete

    return () => clearTimeout(completeTimer);
  }, [phase, onCubeAppended, onComplete]);

  // Handle reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced && phase === "spin") {
      setPhase("settled");
      onCubeAppended?.();
      onComplete?.();
    }
  }, [phase, onCubeAppended, onComplete]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Calculate position for settled state
  const getSettledStyle = () => {
    if (phase !== "settled") return {};

    // Position in header
    return {
      position: "fixed" as const,
      top: "8px",
      left: "16px",
      zIndex: 60,
      width: "32px",
      height: "32px",
    };
  };

  return (
    <>
      {/* Background overlay - only during spin/handoff */}
      {phase !== "settled" && (
        <div
          aria-hidden="true"
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#f1f1f3",
            opacity: phase === "handoff" ? 0 : 1,
            transition: "opacity .5s ease",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Cube - always visible */}
      <div
        aria-hidden="true"
        role="presentation"
        style={{
          ...(phase === "settled" ? getSettledStyle() : {
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }),
          transition: phase === "handoff" ? "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
        }}
      >
      <div className="stage" style={{
        width: phase === "settled" ? 32 : 72,
        height: phase === "settled" ? 32 : 72,
        perspective: "900px",
        perspectiveOrigin: "50% 40%",
        transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        <div
          className={`cube ${!prefersReduced && phase === "spin" ? "spin3d" : ""}`}
          style={{
            width: phase === "settled" ? 32 : 72,
            height: phase === "settled" ? 32 : 72,
            position: "relative",
            transformStyle: "preserve-3d",
            transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {/* Front face with R + subtle shine */}
          <div
            className="face front"
            style={face("#6b4cd6", phase === "settled" ? "translateZ(16px)" : "translateZ(36px)", phase === "settled" ? 32 : 72)}
          >
            <svg viewBox="0 0 100 100" style={{ width: "80%", height: "80%" }} aria-hidden="true">
              <text x="50" y="64" textAnchor="middle" fontWeight="700" fontSize="64" fill="#fff">R</text>
            </svg>
            <div className="specular" />
          </div>

          <div className="face back"   style={face("#5a3db8", phase === "settled" ? "rotateY(180deg) translateZ(16px)" : "rotateY(180deg) translateZ(36px)", phase === "settled" ? 32 : 72)} />
          <div className="face right"  style={face("#7d5ee6", phase === "settled" ? "rotateY(90deg)  translateZ(16px)" : "rotateY(90deg)  translateZ(36px)", phase === "settled" ? 32 : 72)} />
          <div className="face left"   style={face("#4e35a0", phase === "settled" ? "rotateY(-90deg) translateZ(16px)" : "rotateY(-90deg) translateZ(36px)", phase === "settled" ? 32 : 72)} />
          <div className="face top"    style={face("#8366e8", phase === "settled" ? "rotateX(90deg)  translateZ(16px)" : "rotateX(90deg)  translateZ(36px)", phase === "settled" ? 32 : 72)} />
          <div className="face bottom" style={face("#4a329c", phase === "settled" ? "rotateX(-90deg) translateZ(16px)" : "rotateX(-90deg) translateZ(36px)", phase === "settled" ? 32 : 72)} />
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
    </>
  );
};

// tiny helper for face style
function face(bg: string, transform: string, size: number = 72): React.CSSProperties {
  return { width: size, height: size, background: bg, transform, transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" };
}

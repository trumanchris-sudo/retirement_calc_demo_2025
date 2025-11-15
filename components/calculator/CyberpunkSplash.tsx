"use client";

import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState } from "react";

export interface CyberpunkSplashHandle {
  play: () => void;
}

// Purple color matching UI theme
const PURPLE = "rgb(168, 85, 247)";

/**
 * CyberpunkSplash - Simple diagonal purple bar animation with logo
 *
 * Animation sequence:
 * - Purple bars slide in diagonally from bottom-left and top-right (0.8s)
 * - Logo appears as simple white text
 * - Logo fades out (0.3s)
 * - Bars slide back to origin (0.7s)
 * - Total duration: ~2.5s
 *
 * Imperative API:
 * - play(): Starts the animation sequence
 */
const CyberpunkSplash = forwardRef<CyberpunkSplashHandle>((props, ref) => {
  const [animationPhase, setAnimationPhase] = useState<"idle" | "barsIn" | "logoVisible" | "logoFade" | "barsOut">("idle");
  const timeoutsRef = useRef<number[]>([]);

  // Play animation sequence
  const play = useCallback(() => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Start animation
    setAnimationPhase("barsIn");

    // Animation timeline (2.5s total)
    const timer1 = window.setTimeout(() => setAnimationPhase("logoVisible"), 800); // Bars finish sliding in
    const timer2 = window.setTimeout(() => setAnimationPhase("logoFade"), 1500);   // Logo starts fading
    const timer3 = window.setTimeout(() => setAnimationPhase("barsOut"), 1800);    // Bars start sliding out
    const timer4 = window.setTimeout(() => setAnimationPhase("idle"), 2500);        // Complete animation

    timeoutsRef.current = [timer1, timer2, timer3, timer4];
  }, []);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    play
  }), [play]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  if (animationPhase === "idle") {
    return null;
  }

  // Calculate bar positions based on phase
  const barsVisible = animationPhase !== "idle";
  const barsIn = animationPhase === "barsIn" || animationPhase === "logoVisible" || animationPhase === "logoFade";
  const barsOut = animationPhase === "barsOut";

  // Logo opacity
  const logoOpacity = animationPhase === "logoVisible" ? 1 : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        overflow: "hidden",
        pointerEvents: barsVisible ? "auto" : "none",
      }}
    >
      {/* Bottom-left bar - slides in diagonally from bottom-left */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "150%",
          background: PURPLE,
          transform: barsIn
            ? "translate(0, 0) rotate(-45deg)"
            : barsOut
            ? "translate(-100%, 100%) rotate(-45deg)"
            : "translate(-100%, 100%) rotate(-45deg)",
          transformOrigin: "bottom left",
          transition: barsIn
            ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
            : "transform 0.7s cubic-bezier(0.4, 0, 0.6, 1)",
          left: "-50%",
          bottom: "-50%",
        }}
      />

      {/* Top-right bar - slides in diagonally from top-right */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "150%",
          background: PURPLE,
          transform: barsIn
            ? "translate(0, 0) rotate(-45deg)"
            : barsOut
            ? "translate(100%, -100%) rotate(-45deg)"
            : "translate(100%, -100%) rotate(-45deg)",
          transformOrigin: "top right",
          transition: barsIn
            ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
            : "transform 0.7s cubic-bezier(0.4, 0, 0.6, 1)",
          right: "-50%",
          top: "-50%",
        }}
      />

      {/* Logo - simple white block text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "3rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            opacity: logoOpacity,
            transition: "opacity 0.4s ease",
          }}
        >
          <div>WORK</div>
          <div>DIE</div>
          <div>RETIRE</div>
        </div>
      </div>

      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Running Monte Carlo simulation...
      </div>
    </div>
  );
});

CyberpunkSplash.displayName = 'CyberpunkSplash';

export default CyberpunkSplash;

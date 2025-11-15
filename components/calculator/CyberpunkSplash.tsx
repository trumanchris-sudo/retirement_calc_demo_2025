"use client";

import React, { useRef, useImperativeHandle, forwardRef, useCallback, useState } from "react";

export interface CyberpunkSplashHandle {
  play: () => void;
}

// Purple color matching UI theme
const PURPLE = "rgb(168, 85, 247)";

/**
 * CyberpunkSplash - Five diagonal purple bars animation with logo
 *
 * Animation sequence:
 * - Five thick purple bars slide in diagonally at different speeds (0.8-1.2s)
 * - Logo appears as simple white text
 * - Logo fades out (0.3s)
 * - Bars slide back to origin asynchronously (0.7-1.0s)
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
    const timer1 = window.setTimeout(() => setAnimationPhase("logoVisible"), 1000); // Bars finish sliding in
    const timer2 = window.setTimeout(() => setAnimationPhase("logoFade"), 1600);    // Logo starts fading
    const timer3 = window.setTimeout(() => setAnimationPhase("barsOut"), 1900);     // Bars start sliding out
    const timer4 = window.setTimeout(() => setAnimationPhase("idle"), 2800);         // Complete animation

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

  // Five bars with different timings and positions for async effect
  const bars = [
    {
      width: "180%",
      height: "180%",
      rotation: -35,
      left: "-40%",
      bottom: "-40%",
      inDuration: "0.9s",
      outDuration: "0.8s",
      delay: "0s"
    },
    {
      width: "200%",
      height: "200%",
      rotation: -40,
      left: "-50%",
      bottom: "-50%",
      inDuration: "1.1s",
      outDuration: "0.9s",
      delay: "0.05s"
    },
    {
      width: "220%",
      height: "220%",
      rotation: -45,
      left: "-60%",
      bottom: "-60%",
      inDuration: "1.0s",
      outDuration: "0.85s",
      delay: "0.1s"
    },
    {
      width: "200%",
      height: "200%",
      rotation: -50,
      right: "-50%",
      top: "-50%",
      inDuration: "1.05s",
      outDuration: "0.9s",
      delay: "0.08s"
    },
    {
      width: "220%",
      height: "220%",
      rotation: -38,
      right: "-60%",
      top: "-60%",
      inDuration: "1.15s",
      outDuration: "0.95s",
      delay: "0.12s"
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        overflow: "hidden",
        pointerEvents: barsVisible ? "auto" : "none",
        backgroundColor: "rgba(0, 0, 0, 0.3)", // Slight darkening
      }}
    >
      {/* Five purple bars sliding in from different angles */}
      {bars.map((bar, index) => {
        const isBottomLeft = 'left' in bar && 'bottom' in bar;
        const initialTransform = isBottomLeft
          ? `translate(-100%, 100%) rotate(${bar.rotation}deg)`
          : `translate(100%, -100%) rotate(${bar.rotation}deg)`;
        const finalTransform = `translate(0, 0) rotate(${bar.rotation}deg)`;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              width: bar.width,
              height: bar.height,
              background: PURPLE,
              ...(isBottomLeft ? { left: bar.left, bottom: bar.bottom } : { right: bar.right, top: bar.top }),
              transformOrigin: isBottomLeft ? "bottom left" : "top right",
              transform: barsIn ? finalTransform : initialTransform,
              transition: barsIn
                ? `transform ${bar.inDuration} cubic-bezier(0.4, 0, 0.2, 1) ${bar.delay}`
                : `transform ${bar.outDuration} cubic-bezier(0.4, 0, 0.6, 1)`,
              opacity: 0.95,
            }}
          />
        );
      })}

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
            fontWeight: 900,
            fontSize: "clamp(2rem, 8vw, 4rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            opacity: logoOpacity,
            transition: "opacity 0.4s ease",
            textShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
            WebkitTextStroke: "2px white",
            paintOrder: "stroke fill",
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

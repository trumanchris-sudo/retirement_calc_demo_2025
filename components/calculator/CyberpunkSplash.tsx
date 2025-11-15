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
  // Note: animationPhase can't be "idle" here due to early return above
  const barsIn = animationPhase === "barsIn" || animationPhase === "logoVisible" || animationPhase === "logoFade";
  const barsOut = animationPhase === "barsOut";

  // Logo opacity - show concurrent with bars
  const logoOpacity = (animationPhase === "barsIn" || animationPhase === "logoVisible") ? 1 : 0;

  // Multiple wider diagonal bars with closer positioning for better coverage
  const bars = [
    // Bottom-left diagonal wave (6 bars) - closer positioning, wider bars
    {
      width: "300%",
      height: "28%",
      rotation: -38,
      left: "-50%",
      bottom: "-14%",
      inDuration: "0.85s",
      outDuration: "0.75s",
      delay: "0s"
    },
    {
      width: "310%",
      height: "30%",
      rotation: -40,
      left: "-55%",
      bottom: "-15%",
      inDuration: "0.90s",
      outDuration: "0.78s",
      delay: "0.04s"
    },
    {
      width: "295%",
      height: "26%",
      rotation: -36,
      left: "-48%",
      bottom: "-13%",
      inDuration: "0.95s",
      outDuration: "0.80s",
      delay: "0.08s"
    },
    {
      width: "305%",
      height: "32%",
      rotation: -42,
      left: "-52%",
      bottom: "-16%",
      inDuration: "1.0s",
      outDuration: "0.82s",
      delay: "0.12s"
    },
    {
      width: "298%",
      height: "29%",
      rotation: -39,
      left: "-51%",
      bottom: "-14%",
      inDuration: "1.05s",
      outDuration: "0.85s",
      delay: "0.16s"
    },
    {
      width: "290%",
      height: "27%",
      rotation: -37,
      left: "-47%",
      bottom: "-13%",
      inDuration: "1.10s",
      outDuration: "0.88s",
      delay: "0.20s"
    },
    // Top-right diagonal wave (6 bars) - closer positioning, wider bars
    {
      width: "300%",
      height: "28%",
      rotation: -38,
      right: "-50%",
      top: "-14%",
      inDuration: "0.88s",
      outDuration: "0.76s",
      delay: "0.02s"
    },
    {
      width: "310%",
      height: "30%",
      rotation: -40,
      right: "-55%",
      top: "-15%",
      inDuration: "0.93s",
      outDuration: "0.79s",
      delay: "0.06s"
    },
    {
      width: "295%",
      height: "26%",
      rotation: -36,
      right: "-48%",
      top: "-13%",
      inDuration: "0.98s",
      outDuration: "0.81s",
      delay: "0.10s"
    },
    {
      width: "305%",
      height: "32%",
      rotation: -42,
      right: "-52%",
      top: "-16%",
      inDuration: "1.03s",
      outDuration: "0.83s",
      delay: "0.14s"
    },
    {
      width: "298%",
      height: "29%",
      rotation: -39,
      right: "-51%",
      top: "-14%",
      inDuration: "1.08s",
      outDuration: "0.86s",
      delay: "0.18s"
    },
    {
      width: "290%",
      height: "27%",
      rotation: -37,
      right: "-47%",
      top: "-13%",
      inDuration: "1.13s",
      outDuration: "0.89s",
      delay: "0.22s"
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        overflow: "hidden",
        pointerEvents: "auto",
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

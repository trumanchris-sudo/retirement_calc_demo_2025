"use client";

import React, { useEffect, useState } from "react";

interface SplashProps {
  /** Set true when the user hits Calculate */
  isActive: boolean;
  /** Called after animation completes */
  onComplete?: () => void;
}

// Purple color matching UI theme
const PURPLE = "rgb(168, 85, 247)";

export function FullscreenMonteCarloSplash({ isActive, onComplete }: SplashProps) {
  const [animationPhase, setAnimationPhase] = useState<"idle" | "barsIn" | "logoVisible" | "logoFade" | "barsOut">("idle");

  useEffect(() => {
    if (!isActive) {
      setAnimationPhase("idle");
      return;
    }

    // Animation timeline (2.5s total)
    setAnimationPhase("barsIn");

    const timer1 = setTimeout(() => setAnimationPhase("logoVisible"), 800); // Bars finish sliding in
    const timer2 = setTimeout(() => setAnimationPhase("logoFade"), 1500);   // Logo starts fading
    const timer3 = setTimeout(() => setAnimationPhase("barsOut"), 1800);    // Bars start sliding out
    const timer4 = setTimeout(() => {
      setAnimationPhase("idle");
      if (onComplete) onComplete();
    }, 2500); // Complete animation

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isActive, onComplete]);

  if (!isActive && animationPhase === "idle") {
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
        zIndex: 9999,
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
    </div>
  );
}

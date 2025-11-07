"use client";
import React, { useEffect, useRef } from "react";

export const BrandLoader: React.FC<{
  onComplete?: () => void;
}> = ({ onComplete }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const cube = cubeRef.current;
    if (!overlay || !cube) return;

    // Wait for animation end
    const waitForAnimEnd = (el: Element) =>
      new Promise<void>(resolve => {
        const handler = () => {
          el.removeEventListener("animationend", handler);
          resolve();
        };
        el.addEventListener("animationend", handler, { once: true });
      });

    const run = async () => {
      try {
        // 1) Spin the cube
        cube.classList.add("animate-brand-spin");
        await waitForAnimEnd(cube);
        cube.classList.remove("animate-brand-spin");

        // 2) Fade out the cube
        cube.classList.add("animate-brand-fadeout");
        await waitForAnimEnd(cube);

        // 3) Cleanup - remove overlay
        overlay.remove();
        onComplete?.();
      } catch (error) {
        console.error("Brand loader animation error:", error);
        // Fallback: just remove everything
        overlay?.remove();
        onComplete?.();
      }
    };

    // Handle reduced motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      overlay.remove();
      onComplete?.();
      return;
    }

    run();
  }, [onComplete]);

  return (
    <div
      className="brand-cube-overlay"
      ref={overlayRef}
      aria-hidden="true"
      role="presentation"
    >
      <div className="scene" ref={cubeRef}>
        <div className="cube">
          {/* Front face with R */}
          <div className="cube__face cube__face--front">R</div>
          <div className="cube__face cube__face--back"></div>
          <div className="cube__face cube__face--right"></div>
          <div className="cube__face cube__face--left"></div>
          <div className="cube__face cube__face--top"></div>
          <div className="cube__face cube__face--bottom"></div>
        </div>
      </div>
    </div>
  );
};

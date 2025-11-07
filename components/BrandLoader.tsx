"use client";
import React, { useEffect, useRef } from "react";

export const BrandLoader: React.FC<{
  onHandoffStart?: () => void;
  onCubeAppended?: () => void;
  onComplete?: () => void;
}> = ({ onHandoffStart, onCubeAppended, onComplete }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cubeWrapperRef = useRef<HTMLDivElement>(null);
  const innerCubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const cubeWrapper = cubeWrapperRef.current;
    const innerCube = innerCubeRef.current;
    if (!overlay || !cubeWrapper || !innerCube) return;

    const logo = document.querySelector(".logo-square") as HTMLElement | null;
    if (!logo) {
      console.warn("Logo square not found");
      return;
    }

    // Wait for animation end
    const waitForAnimEnd = (el: Element) =>
      new Promise<void>(resolve => {
        const handler = () => {
          el.removeEventListener("animationend", handler);
          resolve();
        };
        el.addEventListener("animationend", handler, { once: true });
      });

    // Wait for layout to settle (2 RAFs)
    const settleLayout = async () => {
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
    };

    const run = async () => {
      try {
        // 1) Spin phase
        innerCube.classList.add("animate-brand-spin");
        await waitForAnimEnd(innerCube);
        innerCube.classList.remove("animate-brand-spin");

        // 2) Settle phase (face the camera / show the R face)
        innerCube.classList.add("animate-brand-settle");
        await waitForAnimEnd(innerCube);
        innerCube.classList.remove("animate-brand-settle");

        // 3) Compute delta to logo center after layout is stable
        await settleLayout();
        const cubeRect = cubeWrapper.getBoundingClientRect();
        const logoRect = logo.getBoundingClientRect();

        const dx = (logoRect.left + logoRect.width / 2) - (cubeRect.left + cubeRect.width / 2);
        const dy = (logoRect.top + logoRect.height / 2) - (cubeRect.top + cubeRect.height / 2);

        cubeWrapper.style.setProperty("--tx", `${dx}px`);
        cubeWrapper.style.setProperty("--ty", `${dy}px`);

        // 4) Dock to the logo
        cubeWrapper.classList.add("animate-brand-dock");
        await waitForAnimEnd(cubeWrapper);
        cubeWrapper.classList.remove("animate-brand-dock");

        // 5) Reveal 2D square and trigger handoff callbacks
        logo.classList.add("logo-square--reveal");
        onHandoffStart?.();

        // 6) Handoff animation (fade/scale the cube)
        cubeWrapper.classList.add("animate-brand-handoff");
        await waitForAnimEnd(cubeWrapper);

        // 7) Cleanup - remove overlay entirely
        onCubeAppended?.();
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
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      logo.classList.add("logo-square--reveal");
      overlay.remove();
      onComplete?.();
      return;
    }

    run();
  }, [onHandoffStart, onCubeAppended, onComplete]);

  return (
    <div
      className="brand-cube-overlay"
      ref={overlayRef}
      aria-hidden="true"
      role="presentation"
    >
      <div className="brand-cube" ref={cubeWrapperRef}>
        <div className="scene" ref={innerCubeRef}>
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
    </div>
  );
};

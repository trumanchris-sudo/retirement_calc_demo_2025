"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export const BrandLoader: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"spin" | "settle" | "handoff" | "hidden">("spin");
  const rFaceRef = useRef<HTMLDivElement>(null);

  // One-shot guard: if already played this session, skip immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("brandLoaderPlayed") === "1") {
      setPhase("hidden");
      onComplete?.();
    }
  }, [onComplete]);

  // Orchestrate timing (≈3s total)
  useEffect(() => {
    if (phase !== "spin") return;
    const t1 = setTimeout(() => setPhase("settle"), 2600);
    const t2 = setTimeout(() => setPhase("handoff"), 2900);
    const t3 = setTimeout(() => {
      // Safety hide in case transitionend doesn't fire
      if (phase !== "hidden") {
        setPhase("hidden");
        onComplete?.();
      }
    }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase, onComplete]);

  // Handoff: animate front face to #logoSlot, then append it there
  useLayoutEffect(() => {
    if (phase !== "handoff") return;
    const rFace = rFaceRef.current;
    const slot = document.getElementById("logoSlot");
    if (!rFace || !slot) return;

    const from = rFace.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const sx = to.width / from.width;
    const sy = to.height / from.height;

    rFace.style.transition = "transform .35s cubic-bezier(.15,.9,.1,1), box-shadow .35s";
    rFace.style.transformOrigin = "top left";
    rFace.style.willChange = "transform";
    rFace.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    rFace.style.boxShadow = "0 10px 20px rgba(0,0,0,.15)";

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "transform") return;
      rFace.removeEventListener("transitionend", onEnd);
      slot.appendChild(rFace);
      Object.assign(rFace.style, {
        position: "relative",
        left: "0px",
        top: "0px",
        width: "100%",
        height: "100%",
        transform: "none",
        transition: "none",
        boxShadow: "none"
      });
      // Finish
      sessionStorage.setItem("brandLoaderPlayed", "1");
      setPhase("hidden");
      onComplete?.();
    };
    rFace.addEventListener("transitionend", onEnd);
    return () => rFace.removeEventListener("transitionend", onEnd);
  }, [phase, onComplete]);

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
        transition: "opacity .3s ease",
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
            ref={rFaceRef}
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
        .spin3d { animation: spin3d 2.4s linear infinite; }
        @keyframes spin3d {
          to { transform: rotateX(360deg) rotateY(360deg); }
        }
        .face { position:absolute; inset:0; border:1px solid rgba(0,0,0,.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); backface-visibility:hidden; }
        .front { overflow:hidden; }
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

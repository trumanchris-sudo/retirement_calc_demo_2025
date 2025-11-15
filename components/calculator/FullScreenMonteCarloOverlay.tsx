"use client";

import React, { useEffect, useRef } from "react";

interface SplashProps {
  /** Set true when the user hits Calculate */
  isActive: boolean;
  /** Called after lines + text phases complete */
  onComplete?: () => void;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const LINES_DURATION = 1500; // ms before text phase
const TEXT_DURATION = 3000;  // ms text stays up
const NUM_NODES = 220;       // tweak if you want more/less density

export function FullscreenMonteCarloSplash({ isActive, onComplete }: SplashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const phaseRef = useRef<"idle" | "lines" | "text" | "done">("idle");
  const textTimeoutRef = useRef<number | null>(null);

  // Resize canvas to full window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Kick off animation when isActive flips true
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Reset state
    phaseRef.current = "lines";
    startTimeRef.current = null;
    nodesRef.current = initNodes(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ensure overlay is visible
    if (overlayRef.current) {
      overlayRef.current.style.opacity = "1";
      overlayRef.current.style.pointerEvents = "auto";
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const phase = phaseRef.current;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      if (phase === "lines") {
        // No clearRect – strokes accumulate
        stepNodes(nodesRef.current, width, height);
        drawLines(ctx, nodesRef.current, width, height);

        if (elapsed >= LINES_DURATION) {
          phaseRef.current = "text";
          // Start text timer
          if (textTimeoutRef.current) {
            window.clearTimeout(textTimeoutRef.current);
          }
          textTimeoutRef.current = window.setTimeout(() => {
            phaseRef.current = "done";
            if (overlayRef.current) {
              overlayRef.current.style.opacity = "0";
              overlayRef.current.style.pointerEvents = "none";
            }
            if (onComplete) onComplete();
          }, TEXT_DURATION);
        }
      }

      if (phase !== "done") {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (textTimeoutRef.current) {
        window.clearTimeout(textTimeoutRef.current);
      }
    };
  }, [isActive, onComplete]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at center, rgba(20,15,50,0.75), rgba(5,2,20,0.95))",
        display: isActive ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.5s ease",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {/* Center text – only visible in "text" / "done" phases */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          opacity:
            phaseRef.current === "text" || phaseRef.current === "done" ? 1 : 0,
          transition: "opacity 400ms ease",
          textAlign: "center",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 800,
          fontSize: "2.4rem",
          color: "#ffffff",
        }}
      >
        <div>WORK</div>
        <div>DIE</div>
        <div>RETIRE</div>
      </div>
    </div>
  );
}

// --- helpers ----------------------------------------------------

function initNodes(canvas: HTMLCanvasElement): Node[] {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const nodes: Node[] = [];

  for (let i = 0; i < NUM_NODES; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Slightly different speeds
    const speed = 220 + Math.random() * 140; // px/sec
    const angle = Math.random() * Math.PI * 2;

    nodes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  return nodes;
}

function stepNodes(nodes: Node[], width: number, height: number) {
  const dt = 1 / 60; // assume ~60fps; good enough for this splash

  for (const n of nodes) {
    n.x += n.vx * dt;
    n.y += n.vy * dt;

    // Bounce on edges
    if (n.x <= 0 || n.x >= width) {
      n.vx *= -1;
      n.x = clamp(n.x, 0, width);
    }
    if (n.y <= 0 || n.y >= height) {
      n.vy *= -1;
      n.y = clamp(n.y, 0, height);
    }
  }
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  width: number,
  height: number
) {
  ctx.save();
  ctx.lineWidth = 4; // thick lines so it fills fast
  ctx.strokeStyle = "rgba(168, 85, 247, 0.35)"; // purple with some alpha

  // Just draw from each node to its “future” position to create motion streaks.
  // You can tweak this pattern later if you want more structure.
  for (const n of nodes) {
    const trailX = n.x - n.vx * 0.02;
    const trailY = n.y - n.vy * 0.02;

    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
  }

  ctx.restore();
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

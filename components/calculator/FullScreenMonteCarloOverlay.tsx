"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
}

interface FullScreenMonteCarloOverlayProps {
  isActive: boolean;
  calculationComplete?: boolean;
  onComplete: () => void;
}

/**
 * FullScreenMonteCarloOverlay - Cinematic full-screen neural network animation
 *
 * Shows a dramatic neural network visualization while Monte Carlo simulation runs.
 * Features three phases:
 * 1. Neural network fills screen (0-2000ms)
 * 2. "WORK DIE RETIRE" text appears (2000-2600ms)
 * 3. Fade out (2600-3300ms)
 */
export function FullScreenMonteCarloOverlay({
  isActive,
  calculationComplete = false,
  onComplete
}: FullScreenMonteCarloOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const startTimeRef = useRef<number>(0);
  const [phase, setPhase] = useState<'neural' | 'text' | 'fadeout'>('neural');
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Detect device capability for node count
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isLowEnd = typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4;
  const nodeCount = isLowEnd ? 150 : isMobile ? 300 : 600;

  // Initialize canvas and nodes
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full viewport
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const width = window.innerWidth;
    const height = window.innerHeight;

    nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (isMobile ? 0.5 : 1.0), // Faster movement on desktop
      vy: (Math.random() - 0.5) * (isMobile ? 0.5 : 1.0),
      connections: []
    }));

    // Create random connections (more edges for fuller look)
    nodesRef.current.forEach(node => {
      const connectionCount = Math.floor(Math.random() * 4) + 3; // 3-6 connections
      for (let i = 0; i < connectionCount; i++) {
        const targetId = Math.floor(Math.random() * nodeCount);
        if (targetId !== node.id && !node.connections.includes(targetId)) {
          node.connections.push(targetId);
        }
      }
    });

    startTimeRef.current = performance.now();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, nodeCount, isMobile]);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const nodes = nodesRef.current;
    const elapsed = performance.now() - startTimeRef.current;

    // Phase transitions
    if (elapsed > 2000 && phase === 'neural') {
      setPhase('text');
    }
    if (elapsed > 2600 && phase === 'text') {
      setPhase('fadeout');
      setAnimationComplete(true);
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate opacity progression (fade in over first 2 seconds)
    const neuralOpacity = Math.min(1, elapsed / 2000);

    // Use lighter blend mode for glowing effect
    ctx.globalCompositeOperation = 'lighter';

    // Update node positions
    nodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;

      // Bounce off edges
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;

      // Keep within bounds
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    });

    // Draw connections with varying thickness
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes[targetId];

        // Vary line width based on time (thicken progressively)
        const timeProgress = Math.min(1, elapsed / 2000);
        const lineWidth = 0.5 + (timeProgress * 2.5); // 0.5 to 3

        const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y);
        const alpha = neuralOpacity * 0.15; // Semi-transparent
        gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(168, 85, 247, ${alpha * 1.3})`);
        gradient.addColorStop(1, `rgba(139, 92, 246, ${alpha})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });
    });

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168, 85, 247, ${neuralOpacity * 0.6})`;
      ctx.fill();
    });

    if (!animationComplete) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [phase, animationComplete]);

  // Start animation when active
  useEffect(() => {
    if (isActive && !prefersReducedMotion) {
      animate();
    } else if (isActive && prefersReducedMotion) {
      // Skip animation for reduced motion users
      setTimeout(() => onComplete(), 100);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, animate, prefersReducedMotion, onComplete]);

  // Show skip button after 2 seconds
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, [isActive]);

  // Handle fade out when both animation and calculation are complete
  useEffect(() => {
    if (animationComplete && calculationComplete) {
      setOverlayOpacity(0);
      setTimeout(() => {
        onComplete();
      }, 700); // Wait for fade transition
    }
  }, [animationComplete, calculationComplete, onComplete]);

  // Escape key to skip
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isActive, onComplete]);

  // Timeout failsafe (10 seconds max)
  useEffect(() => {
    if (!isActive) return;
    const timeout = setTimeout(() => {
      console.warn('Overlay timeout - forcing completion');
      onComplete();
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <>
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Running Monte Carlo simulation...
      </div>

      {/* Main overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: showSkip ? 'auto' : 'none',
          opacity: overlayOpacity,
          transition: 'opacity 700ms ease-out',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Subtle dark backdrop
        }}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />

        {/* Text overlay */}
        {phase !== 'neural' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              opacity: phase === 'text' ? 1 : 0,
              transition: 'opacity 600ms ease-in-out, transform 400ms ease-out',
              animation: phase === 'text' ? 'scaleIn 400ms ease-out' : 'none',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                fontWeight: 800,
                letterSpacing: '0.15em',
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)',
                lineHeight: 1.2,
              }}
            >
              WORK
              <br />
              DIE
              <br />
              RETIRE
            </div>
          </div>
        )}

        {/* Skip button */}
        {showSkip && (
          <button
            onClick={onComplete}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 200ms ease',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Skip (ESC)
          </button>
        )}
      </div>

      {/* Scale-in animation for text */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

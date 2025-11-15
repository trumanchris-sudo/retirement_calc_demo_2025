"use client";

import React, { useRef, useImperativeHandle, forwardRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
}

export interface FullScreenVisualizerHandle {
  start: () => void;
  stop: () => void;
}

/**
 * FullScreenVisualizer - High-performance neural network animation
 *
 * Optimized for performance:
 * - Downscaled canvas (0.33× DPR) to reduce GPU load
 * - Max 800-1200 particles based on device capability
 * - No React state updates in animation loop (refs only)
 * - Imperative API (start/stop) for external control
 *
 * Three phases:
 * 1. Intro: Fade in (500ms)
 * 2. Animating: Full neural network animation
 * 3. Exit: Fade out (600ms)
 */
const FullScreenVisualizer = forwardRef<FullScreenVisualizerHandle>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const isAnimatingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const phaseRef = useRef<'intro' | 'animating' | 'exit'>('intro');

  // Detect device capability
  const getParticleCount = useCallback(() => {
    if (typeof window === 'undefined') return 800;

    const isMobile = window.innerWidth < 768;
    const isLowEnd = typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4;

    if (isLowEnd) return 800;
    if (isMobile) return 1000;
    return 1200;
  }, []);

  // Initialize particles
  const initializeParticles = useCallback((width: number, height: number) => {
    const particleCount = getParticleCount();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (isMobile ? 0.5 : 1.0),
      vy: (Math.random() - 0.5) * (isMobile ? 0.5 : 1.0),
      connections: []
    }));

    // Create random connections (3-6 per particle)
    particlesRef.current.forEach(particle => {
      const connectionCount = Math.floor(Math.random() * 4) + 3;
      for (let i = 0; i < connectionCount; i++) {
        const targetId = Math.floor(Math.random() * particleCount);
        if (targetId !== particlesRef.current.indexOf(particle) &&
            !particle.connections.includes(targetId)) {
          particle.connections.push(targetId);
        }
      }
    });
  }, [getParticleCount]);

  // Main animation loop (NO React state updates!)
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !isAnimatingRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / 0.33; // Actual render width
    const height = canvas.height / 0.33;
    const particles = particlesRef.current;
    const elapsed = performance.now() - startTimeRef.current;

    // Phase transitions
    if (elapsed > 500 && phaseRef.current === 'intro') {
      phaseRef.current = 'animating';
    }

    // Calculate opacity based on phase
    let opacity = 1;
    if (phaseRef.current === 'intro') {
      opacity = Math.min(1, elapsed / 500); // Fade in over 500ms
    } else if (phaseRef.current === 'exit') {
      const exitTime = elapsed - (startTimeRef.current + 500); // Time since exit started
      opacity = Math.max(0, 1 - (exitTime / 600)); // Fade out over 600ms

      // Update container opacity (only DOM update)
      container.style.opacity = opacity.toString();

      if (opacity <= 0) {
        isAnimatingRef.current = false;
        container.style.display = 'none';
        return;
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update particle positions
    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce off edges
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      // Keep within bounds
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));
    });

    // Use lighter blend mode for glowing effect
    ctx.globalCompositeOperation = 'lighter';

    // Draw connections
    particles.forEach((particle, idx) => {
      particle.connections.forEach(targetId => {
        const target = particles[targetId];
        if (!target) return;

        // Vary line width based on animation progress
        const timeProgress = phaseRef.current === 'intro'
          ? Math.min(1, elapsed / 500)
          : 1;
        const lineWidth = 0.5 + (timeProgress * 2.5); // 0.5 to 3

        const gradient = ctx.createLinearGradient(particle.x, particle.y, target.x, target.y);
        const alpha = opacity * 0.15;
        gradient.addColorStop(0, `rgba(179, 79, 245, ${alpha})`); // #b34ff5
        gradient.addColorStop(0.5, `rgba(79, 237, 245, ${alpha * 1.3})`); // #4fedf5
        gradient.addColorStop(1, `rgba(179, 79, 245, ${alpha})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(179, 79, 245, 0.4)';

        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });
    });

    // Reset shadow and composite mode
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    // Draw particles
    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(79, 237, 245, ${opacity * 0.6})`; // #4fedf5
      ctx.fill();
    });

    // Continue animation
    if (isAnimatingRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Start animation
  const start = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Show container
    container.style.display = 'block';
    container.style.opacity = '1';

    // Setup canvas with downscaled resolution (0.33× DPR for performance)
    const dpr = 0.33;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Initialize particles
    initializeParticles(width, height);

    // Start animation
    isAnimatingRef.current = true;
    startTimeRef.current = performance.now();
    phaseRef.current = 'intro';
    animate();
  }, [initializeParticles, animate]);

  // Stop animation (triggers fade out)
  const stop = useCallback(() => {
    if (!isAnimatingRef.current) return;

    phaseRef.current = 'exit';
    startTimeRef.current = performance.now() - 500; // Adjust so exit starts now
  }, []);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    start,
    stop
  }), [start, stop]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isAnimatingRef.current = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'none',
        backgroundColor: 'rgba(13, 13, 20, 0.4)', // #0d0d14 with transparency
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
});

FullScreenVisualizer.displayName = 'FullScreenVisualizer';

export default FullScreenVisualizer;

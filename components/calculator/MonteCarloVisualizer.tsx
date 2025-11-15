"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
}

interface MonteCarloVisualizerProps {
  isRunning?: boolean;
  visible?: boolean;
}

/**
 * MonteCarloVisualizer - Visual representation of Monte Carlo simulation
 *
 * CRITICAL: This component should always be rendered, not conditionally mounted.
 * Use the 'visible' prop to control visibility via CSS instead of conditional rendering.
 * Conditional mounting/unmounting causes canvas initialization race conditions.
 */
export function MonteCarloVisualizer({ isRunning = false, visible = true }: MonteCarloVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const isMountedRef = useRef(true);
  const isAnimatingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const [pathsCompleted, setPathsCompleted] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeTimeout: number | undefined;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();

      // Guard against zero-width canvas (component not yet visible)
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Reset transform before scaling (canvas resize resets context, but be explicit)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    // Debounced resize handler to prevent rapid context resets
    const handleResize = () => {
      if (resizeTimeout) {
        cancelAnimationFrame(resizeTimeout);
      }
      resizeTimeout = requestAnimationFrame(() => {
        resizeCanvas();
        resizeTimeout = undefined;
      });
    };

    // Initialize nodes (network graph representation)
    // Defer initialization until canvas is sized
    const initializeNodes = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Only initialize if canvas has valid dimensions
      if (width === 0 || height === 0) {
        return false;
      }

      const nodeCount = 100;
      nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        connections: []
      }));

      // Create random connections between nodes (more connections for deeper network)
      nodesRef.current.forEach(node => {
        const connectionCount = Math.floor(Math.random() * 4) + 2; // 2-5 connections per node
        for (let i = 0; i < connectionCount; i++) {
          const targetId = Math.floor(Math.random() * nodeCount);
          if (targetId !== node.id && !node.connections.includes(targetId)) {
            node.connections.push(targetId);
          }
        }
      });

      return true;
    };

    // Use requestAnimationFrame to ensure DOM is ready, then initialize
    requestAnimationFrame(() => {
      resizeCanvas();
      if (initializeNodes()) {
        isInitializedRef.current = true;
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        cancelAnimationFrame(resizeTimeout);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isAnimatingRef.current = false;
      isInitializedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const animateSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Clean up animation state
      isAnimatingRef.current = false;
      if (isMountedRef.current) setIsAnimating(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Clean up animation state
      isAnimatingRef.current = false;
      if (isMountedRef.current) setIsAnimating(false);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Guard against invalid dimensions - retry once if not initialized yet
    if (width === 0 || height === 0) {
      if (!isInitializedRef.current && isMountedRef.current && isAnimatingRef.current) {
        // Canvas might not be ready yet, retry after a frame
        console.warn('MonteCarloVisualizer: Canvas not ready, retrying...');
        requestAnimationFrame(() => {
          if (isAnimatingRef.current && isMountedRef.current) {
            animateSimulation();
          }
        });
      } else {
        console.warn('MonteCarloVisualizer: Canvas has zero dimensions, stopping animation');
        isAnimatingRef.current = false;
        if (isMountedRef.current) setIsAnimating(false);
      }
      return;
    }

    const nodes = nodesRef.current;

    // Guard against uninitialized nodes
    if (!nodes || nodes.length === 0) {
      if (!isInitializedRef.current && isMountedRef.current && isAnimatingRef.current) {
        // Nodes might not be ready yet, retry after a frame
        console.warn('MonteCarloVisualizer: Nodes not ready, retrying...');
        requestAnimationFrame(() => {
          if (isAnimatingRef.current && isMountedRef.current) {
            animateSimulation();
          }
        });
      } else {
        console.warn('MonteCarloVisualizer: Nodes not initialized, stopping animation');
        isAnimatingRef.current = false;
        if (isMountedRef.current) setIsAnimating(false);
      }
      return;
    }

    let frame = 0;
    const maxPaths = 1000;
    let activePaths: Array<{ nodeIndex: number; progress: number; pathId: number }> = [];
    let completedPaths = 0;

    const animate = () => {
      try {
        ctx.clearRect(0, 0, width, height);

      // Update node positions (gentle floating motion)
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

      // Draw connections (dim)
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.1)';
      ctx.lineWidth = 0.3;
      nodes.forEach(node => {
        node.connections.forEach(targetId => {
          const target = nodes[targetId];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        });
      });

      // Add new paths periodically (every 5 frames for slower, more visible animation)
      if (frame % 5 === 0 && completedPaths < maxPaths) {
        const randomNode = Math.floor(Math.random() * nodes.length);
        activePaths.push({
          nodeIndex: randomNode,
          progress: 0,
          pathId: completedPaths
        });
      }

      // Draw and update active paths (glowing connections)
      activePaths = activePaths.filter(path => {
        path.progress += 0.03; // Slower progression for longer visible paths

        if (path.progress >= 1) {
          completedPaths++;
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setPathsCompleted(completedPaths);
          }
          return false; // Remove completed path
        }

        const node = nodes[path.nodeIndex];
        if (node.connections.length === 0) return false;

        const nextNodeId = node.connections[Math.floor(Math.random() * node.connections.length)];
        const nextNode = nodes[nextNodeId];

        // Draw glowing connection
        const gradient = ctx.createLinearGradient(node.x, node.y, nextNode.x, nextNode.y);
        const alpha = Math.sin(path.progress * Math.PI) * 0.6;
        gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 1.2})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, ${alpha})`);

        // Set glow effect before drawing
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(nextNode.x, nextNode.y);
        ctx.stroke();

        // Reset shadow for subsequent draws
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Move to next node occasionally (reduced frequency to prevent excessive looping)
        if (path.progress > 0.9 && Math.random() > 0.85) {
          path.nodeIndex = nextNodeId;
          path.progress = 0;
        }

        return true;
      });

      // Draw nodes
      nodes.forEach(node => {
        const isActive = activePaths.some(p => p.nodeIndex === node.id);

        ctx.beginPath();
        ctx.arc(node.x, node.y, isActive ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? 'rgba(139, 92, 246, 0.9)'
          : 'rgba(100, 116, 139, 0.4)';
        ctx.fill();

        if (isActive) {
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      frame++;

      // Continue animation only if still mounted and animating
      if (completedPaths < maxPaths && isAnimatingRef.current && isMountedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (completedPaths >= maxPaths && isMountedRef.current) {
        isAnimatingRef.current = false;
        setIsAnimating(false);
      }
      } catch (error) {
        console.error('MonteCarloVisualizer animation error:', error);
        // Stop animation on error
        isAnimatingRef.current = false;
        if (isMountedRef.current) {
          setIsAnimating(false);
        }
      }
    };

    animate();
  }, []);

  useEffect(() => {
    if (isRunning) {
      isAnimatingRef.current = true;
      setIsAnimating(true);
      setPathsCompleted(0);
      animateSimulation();
    }
    // Note: Don't stop animation when isRunning becomes false
    // Let the animation complete all 1000 paths naturally
  }, [isRunning, animateSimulation]);

  return (
    <Card style={{ visibility: visible ? 'visible' : 'hidden', position: visible ? 'relative' : 'absolute' }}>
      <CardHeader>
        <CardTitle>Monte Carlo Simulation Visualizer</CardTitle>
        <CardDescription>
          Visual representation of the Monte Carlo simulation complexity - each path represents a simulated retirement scenario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[250px] md:h-[400px] rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
          />
          {isAnimating && (
            <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
              <div className="text-xs font-mono text-muted-foreground">
                Paths simulated: <span className="font-semibold text-foreground">{pathsCompleted}</span> / 1000
              </div>
            </div>
          )}
          {!isAnimating && !isRunning && pathsCompleted === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-muted-foreground text-center">
                Run a Monte Carlo simulation to see the visualization
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

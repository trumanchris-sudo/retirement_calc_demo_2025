"use client";

import React, { useEffect, useRef, useState } from "react";
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
}

export function MonteCarloVisualizer({ isRunning = false }: MonteCarloVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const [pathsCompleted, setPathsCompleted] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes (network graph representation)
    const nodeCount = 150;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      connections: []
    }));

    // Create random connections between nodes
    nodesRef.current.forEach(node => {
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < connectionCount; i++) {
        const targetId = Math.floor(Math.random() * nodeCount);
        if (targetId !== node.id && !node.connections.includes(targetId)) {
          node.connections.push(targetId);
        }
      }
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      setIsAnimating(true);
      setPathsCompleted(0);
      animateSimulation();
    } else {
      setIsAnimating(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRunning]);

  const animateSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const nodes = nodesRef.current;

    let frame = 0;
    const maxPaths = 1000;
    let activePaths: Array<{ nodeIndex: number; progress: number; pathId: number }> = [];
    let completedPaths = 0;

    const animate = () => {
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
      ctx.lineWidth = 0.5;
      nodes.forEach(node => {
        node.connections.forEach(targetId => {
          const target = nodes[targetId];
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        });
      });

      // Add new paths periodically
      if (frame % 3 === 0 && completedPaths < maxPaths) {
        const randomNode = Math.floor(Math.random() * nodes.length);
        activePaths.push({
          nodeIndex: randomNode,
          progress: 0,
          pathId: completedPaths
        });
      }

      // Draw and update active paths (glowing connections)
      activePaths = activePaths.filter(path => {
        path.progress += 0.05;

        if (path.progress >= 1) {
          completedPaths++;
          setPathsCompleted(completedPaths);
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

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(nextNode.x, nextNode.y);
        ctx.stroke();

        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Move to next node occasionally
        if (path.progress > 0.8 && Math.random() > 0.7) {
          path.nodeIndex = nextNodeId;
          path.progress = 0;
        }

        return true;
      });

      // Draw nodes
      nodes.forEach(node => {
        const isActive = activePaths.some(p => p.nodeIndex === node.id);

        ctx.beginPath();
        ctx.arc(node.x, node.y, isActive ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? 'rgba(139, 92, 246, 0.9)'
          : 'rgba(100, 116, 139, 0.4)';
        ctx.fill();

        if (isActive) {
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      frame++;

      if (completedPaths < maxPaths && isAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (completedPaths >= maxPaths) {
        setIsAnimating(false);
      }
    };

    animate();
  };

  return (
    <Card>
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
            className="w-full h-[400px] rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
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

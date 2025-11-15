"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonteCarloVisualizerProps {
  isRunning?: boolean;
  visible?: boolean;
}

/**
 * MINIMAL TEST VERSION - Just renders a simple card to test if basic rendering works
 */
export function MonteCarloVisualizerTest({ isRunning = false, visible = true }: MonteCarloVisualizerProps) {
  console.log('MonteCarloVisualizerTest rendering:', { isRunning, visible });

  return (
    <Card style={{ visibility: visible ? 'visible' : 'hidden', position: visible ? 'relative' : 'absolute' }}>
      <CardHeader>
        <CardTitle>Monte Carlo Simulation Visualizer (TEST VERSION)</CardTitle>
        <CardDescription>
          This is a minimal test version. If you see this, the component is rendering successfully.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-8 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">
            ✓ Component is rendering successfully!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            isRunning: {isRunning ? 'true' : 'false'}<br/>
            visible: {visible ? 'true' : 'false'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

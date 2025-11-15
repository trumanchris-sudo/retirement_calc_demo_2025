"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { MonteCarloVisualizer } from "./MonteCarloVisualizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  isRunning?: boolean;
  visible?: boolean;
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class MonteCarloErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MonteCarloVisualizer Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Monte Carlo Visualizer Error</CardTitle>
            <CardDescription>
              An error occurred while rendering the visualizer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error Details:</h3>
                <pre className="text-xs overflow-auto text-red-700 dark:text-red-300">
                  {this.state.error?.toString()}
                </pre>
              </div>
              {this.state.errorInfo && (
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4 border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Component Stack:</h3>
                  <pre className="text-xs overflow-auto text-orange-700 dark:text-orange-300">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return <MonteCarloVisualizer {...this.props} />;
  }
}

export { MonteCarloErrorBoundary as MonteCarloVisualizer };

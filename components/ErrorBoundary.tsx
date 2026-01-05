/**
 * Error Boundary Component
 * Epic 9.1: Replace crashes with friendly errors
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full border-destructive">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">Something went wrong</CardTitle>
                  <CardDescription className="mt-1">
                    The calculator encountered an unexpected error
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-mono text-sm text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <h4 className="font-semibold">What you can do:</h4>
                <ul>
                  <li>Try reloading the page</li>
                  <li>Check your inputs for invalid values</li>
                  <li>Clear your browser cache and try again</li>
                  <li>If the problem persists, report this issue on GitHub</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReset} variant="default" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="ghost" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                    Developer Info
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto p-4 bg-muted rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==================== Functional Error Boundary Hook ====================

/**
 * Hook to create a local error boundary
 * Usage:
 *   const { error, resetError, ErrorDisplay } = useErrorHandler();
 *   if (error) return <ErrorDisplay />;
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const ErrorDisplay = React.useCallback(() => {
    if (!error) return null;

    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              <Button onClick={resetError} size="sm" variant="outline" className="mt-3">
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [error, resetError]);

  return { error, setError, resetError, ErrorDisplay };
}

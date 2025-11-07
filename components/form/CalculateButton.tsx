"use client";

import React from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";

interface CalculateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onDismissError?: () => void;
  className?: string;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  error,
  onDismissError,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        size="lg"
        className={cn(
          "w-full h-14 text-lg font-semibold",
          "bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_auto]",
          "hover:bg-[position:100%_0%] transition-all duration-500",
          "shadow-lg hover:shadow-xl",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !loading && !disabled && "animate-pulse-subtle"
        )}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" color="text-white" className="mr-2" />
            Calculating...
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5 mr-2" />
            Calculate My Plan
          </>
        )}
      </Button>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={onDismissError}
        />
      )}

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onDismiss,
  className
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 animate-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && (
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm text-red-800 dark:text-red-300">
            {message}
          </p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-6 w-6 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

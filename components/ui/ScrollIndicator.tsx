"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  targetId: string;
  show: boolean;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ targetId, show }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);

    // Auto-hide after 5 seconds
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClick = () => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-bounce no-print"
      aria-label="Scroll to results"
    >
      <span className="text-sm font-medium whitespace-nowrap">View Results</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  );
};

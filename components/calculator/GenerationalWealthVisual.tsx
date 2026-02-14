/**
 * GenerationalWealthVisual
 * Extracted from page.tsx — visual indicator for generational wealth sustainability.
 */
'use client';

import React from 'react';
import { UsersIcon, HourglassIcon } from '@/components/ui/InlineIcons';
import type { GenerationalPayout } from '@/types/calculator';

export const GenerationalWealthVisual: React.FC<{ genPayout: GenerationalPayout }> = ({ genPayout }) => {
  if (!genPayout) return null;

  const isSurviving = genPayout.fundLeftReal > 0;

  if (isSurviving) {
    return (
      <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center" title="Survives indefinitely">
        <span className="relative flex h-12 w-12 text-green-600 dark:text-green-400">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 dark:bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-12 w-12 bg-green-500 dark:bg-green-600 p-2">
            <UsersIcon className="m-auto text-white" size={32} />
          </span>
        </span>
      </div>
    );
  } else {
    return (
      <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center" title={`Exhausts after ${genPayout.years} years`}>
        <span className="relative flex h-12 w-12 text-muted-foreground">
          <HourglassIcon size={48} />
        </span>
      </div>
    );
  }
};

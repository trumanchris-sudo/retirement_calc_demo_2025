'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EducationTopic } from './types';
import { EDUCATION_TOPICS } from './types';
import { EducationModal } from './EducationModal';
import { useEducationProgress } from './useEducationProgress';

interface EducationInfoIconProps {
  topic: EducationTopic;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

/**
 * Info icon that opens an education modal when clicked
 * Shows completion status and provides tooltip preview
 */
export function EducationInfoIcon({
  topic,
  className,
  size = 'md',
  showTooltip = true,
}: EducationInfoIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isCompleted } = useEducationProgress();

  const topicInfo = EDUCATION_TOPICS[topic];
  const completed = isCompleted(topic);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const icon = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsModalOpen(true)}
      className={cn(
        'rounded-full hover:bg-primary/10 transition-colors',
        buttonSizeClasses[size],
        completed && 'text-emerald-600 dark:text-emerald-400',
        className
      )}
      aria-label={`Learn about ${topicInfo.title}`}
    >
      <Info className={cn(sizeClasses[size], 'text-current')} />
      {completed && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
      )}
    </Button>
  );

  return (
    <>
      {showTooltip ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{icon}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">{topicInfo.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{topicInfo.description}</p>
              {completed && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  You have read this
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        icon
      )}

      <EducationModal
        topic={topic}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Inline link that opens education modal
 * For use within text content
 */
interface EducationLinkProps {
  topic: EducationTopic;
  children: React.ReactNode;
  className?: string;
}

export function EducationLink({ topic, children, className }: EducationLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isCompleted } = useEducationProgress();

  const completed = isCompleted(topic);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline',
          completed && 'text-emerald-600 dark:text-emerald-400',
          className
        )}
      >
        {children}
        <Info className="w-3.5 h-3.5" />
      </button>

      <EducationModal
        topic={topic}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

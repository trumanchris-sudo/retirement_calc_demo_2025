'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EducationTopic } from './types';
import { EDUCATION_TOPICS, TOTAL_TOPICS } from './types';
import { useEducationProgress } from './useEducationProgress';
import { EducationModal } from './EducationModal';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface TopicBadgeProps {
  topic: EducationTopic;
  isCompleted: boolean;
  onClick: () => void;
}

function TopicBadge({ topic, isCompleted, onClick }: TopicBadgeProps) {
  const info = EDUCATION_TOPICS[topic];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm',
              'border hover:shadow-sm',
              isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted/50 border-muted-foreground/20 hover:bg-muted'
            )}
          >
            {isCompleted ? (
              <svg
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
            )}
            <span className={cn(!isCompleted && 'text-muted-foreground')}>{info.title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{info.description}</p>
          {isCompleted && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Completed</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Progress tracker showing which education topics have been completed
 * Displays inline progress bar with topic badges
 */
export function EducationProgress() {
  const { completedCount, progressPercent, isCompleted, isLoaded } = useEducationProgress();
  const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);

  if (!isLoaded) {
    return null;
  }

  const topics = Object.keys(EDUCATION_TOPICS) as EducationTopic[];

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Your Learning Progress</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount === TOTAL_TOPICS
                  ? 'Congratulations! You have completed all topics'
                  : `You have learned ${completedCount} of ${TOTAL_TOPICS} key concepts`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{completedCount}</span>
              <span className="text-muted-foreground">/{TOTAL_TOPICS}</span>
            </div>
          </div>

          <Progress value={progressPercent} className="h-2 mb-4" />

          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <TopicBadge
                key={topic}
                topic={topic}
                isCompleted={isCompleted(topic)}
                onClick={() => setSelectedTopic(topic)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <EducationModal
        topic={selectedTopic}
        isOpen={selectedTopic !== null}
        onClose={() => setSelectedTopic(null)}
      />
    </>
  );
}

/**
 * Compact progress indicator for use in headers/navigation
 */
export function EducationProgressCompact() {
  const { completedCount, progressPercent, isLoaded } = useEducationProgress();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);

  const { isCompleted } = useEducationProgress();
  const topics = Object.keys(EDUCATION_TOPICS) as EducationTopic[];

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <div className="relative w-6 h-6">
                <svg className="w-6 h-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground/20"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${(progressPercent / 100) * 62.83} 62.83`}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {completedCount}
                </span>
              </div>
              <span className="text-sm hidden sm:inline">
                {completedCount}/{TOTAL_TOPICS} learned
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to see your learning progress</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isExpanded && (
        <MotionDiv
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="absolute top-full left-0 right-0 mt-2 p-4 bg-background border rounded-lg shadow-lg z-50"
        >
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <TopicBadge
                key={topic}
                topic={topic}
                isCompleted={isCompleted(topic)}
                onClick={() => {
                  setSelectedTopic(topic);
                  setIsExpanded(false);
                }}
              />
            ))}
          </div>
        </MotionDiv>
      )}

      <EducationModal
        topic={selectedTopic}
        isOpen={selectedTopic !== null}
        onClose={() => setSelectedTopic(null)}
      />
    </>
  );
}

/**
 * Achievement celebration when all topics are completed
 */
export function EducationComplete() {
  const { completedCount, isLoaded } = useEducationProgress();

  if (!isLoaded || completedCount < TOTAL_TOPICS) {
    return null;
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30
                 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center"
    >
      <div className="text-4xl mb-3">&#x1F393;</div>
      <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
        Knowledge Unlocked!
      </h3>
      <p className="text-muted-foreground mt-2">
        You have completed all 5 key retirement planning concepts. You are now equipped to make
        informed decisions about your financial future.
      </p>
    </MotionDiv>
  );
}

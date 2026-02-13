'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EducationTopic } from './types';
import { EDUCATION_TOPICS } from './types';
import { useEducationProgress } from './useEducationProgress';

// Lazy load the education components for better performance
const WhyRothIsBetter = dynamic(
  () => import('./WhyRothIsBetter').then((m) => ({ default: m.WhyRothIsBetter })),
  { ssr: false }
);

const TenYearRuleExplainer = dynamic(
  () => import('./TenYearRuleExplainer').then((m) => ({ default: m.TenYearRuleExplainer })),
  { ssr: false }
);

const TaxBracketsSimplified = dynamic(
  () => import('./TaxBracketsSimplified').then((m) => ({ default: m.TaxBracketsSimplified })),
  { ssr: false }
);

const CompoundGrowthVisualizer = dynamic(
  () => import('./CompoundGrowthVisualizer').then((m) => ({ default: m.CompoundGrowthVisualizer })),
  { ssr: false }
);

const RichPeoplePlaybook = dynamic(
  () => import('./RichPeoplePlaybook').then((m) => ({ default: m.RichPeoplePlaybook })),
  { ssr: false }
);

interface EducationModalProps {
  topic: EducationTopic | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete?: () => void;
}

/**
 * Modal wrapper for education explainer components
 * Handles lazy loading, scroll, and completion tracking
 */
export function EducationModal({ topic, isOpen, onClose, onMarkComplete }: EducationModalProps) {
  const { markCompleted, isCompleted } = useEducationProgress();

  const topicInfo = topic ? EDUCATION_TOPICS[topic] : null;
  const completed = topic ? isCompleted(topic) : false;

  // Mark as completed after 30 seconds of viewing
  useEffect(() => {
    if (!isOpen || !topic || completed) return;

    const timer = setTimeout(() => {
      markCompleted(topic);
      onMarkComplete?.();
    }, 30000);

    return () => clearTimeout(timer);
  }, [isOpen, topic, completed, markCompleted, onMarkComplete]);

  const handleMarkComplete = () => {
    if (topic) {
      markCompleted(topic);
      onMarkComplete?.();
    }
  };

  const renderContent = () => {
    switch (topic) {
      case 'roth-vs-traditional':
        return <WhyRothIsBetter />;
      case 'ten-year-rule':
        return <TenYearRuleExplainer />;
      case 'tax-brackets':
        return <TaxBracketsSimplified />;
      case 'compound-growth':
        return <CompoundGrowthVisualizer />;
      case 'wealthy-strategies':
        return <RichPeoplePlaybook />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{topicInfo?.title}</DialogTitle>
              <DialogDescription className="mt-1">{topicInfo?.description}</DialogDescription>
            </div>
            {!completed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkComplete}
                className="ml-4 flex-shrink-0"
              >
                Mark as Read
              </Button>
            )}
            {completed && (
              <div className="ml-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <svg
                  className="w-5 h-5"
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
                Completed
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EducationTopic, EducationProgress } from './types';
import { TOTAL_TOPICS } from './types';

const STORAGE_KEY = 'retirement_calc_education_progress';

const getInitialProgress = (): EducationProgress => ({
  completedTopics: [],
  lastViewedAt: {} as Record<EducationTopic, number>,
});

/**
 * Hook to track education progress across topics
 * Persists to localStorage for continuity across sessions
 */
export function useEducationProgress() {
  const [progress, setProgress] = useState<EducationProgress>(getInitialProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as EducationProgress;
        setProgress(parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore localStorage errors
    }
  }, [progress, isLoaded]);

  const markCompleted = useCallback((topic: EducationTopic) => {
    setProgress((prev) => {
      if (prev.completedTopics.includes(topic)) {
        return {
          ...prev,
          lastViewedAt: { ...prev.lastViewedAt, [topic]: Date.now() },
        };
      }
      return {
        completedTopics: [...prev.completedTopics, topic],
        lastViewedAt: { ...prev.lastViewedAt, [topic]: Date.now() },
      };
    });
  }, []);

  const markViewed = useCallback((topic: EducationTopic) => {
    setProgress((prev) => ({
      ...prev,
      lastViewedAt: { ...prev.lastViewedAt, [topic]: Date.now() },
    }));
  }, []);

  const isCompleted = useCallback(
    (topic: EducationTopic) => progress.completedTopics.includes(topic),
    [progress.completedTopics]
  );

  const completedCount = progress.completedTopics.length;
  const totalCount = TOTAL_TOPICS;
  const progressPercent = (completedCount / totalCount) * 100;

  const resetProgress = useCallback(() => {
    setProgress(getInitialProgress());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    progress,
    markCompleted,
    markViewed,
    isCompleted,
    completedCount,
    totalCount,
    progressPercent,
    resetProgress,
    isLoaded,
  };
}

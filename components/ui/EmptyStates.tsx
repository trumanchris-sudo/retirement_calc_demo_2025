'use client';

import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './button';

// =============================================================================
// Shared Types and Animation Variants
// =============================================================================

interface EmptyStateProps {
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// =============================================================================
// Base Empty State Wrapper
// =============================================================================

interface EmptyStateWrapperProps extends EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

const EmptyStateWrapper: React.FC<EmptyStateWrapperProps> = ({
  className,
  illustration,
  title,
  description,
  onAction,
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
  children,
}) => {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6 sm:py-16 sm:px-8',
        'rounded-2xl',
        'bg-gradient-to-br from-slate-50 to-slate-100/50',
        'dark:from-slate-900/50 dark:to-slate-800/30',
        'border border-slate-200/50 dark:border-slate-700/30',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-6">
        {illustration}
      </motion.div>

      <motion.h3
        variants={itemVariants}
        className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        variants={itemVariants}
        className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-sm mb-6"
      >
        {description}
      </motion.p>

      {children}

      {(onAction || secondaryAction) && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-3"
        >
          {onAction && actionLabel && (
            <Button onClick={onAction} size="lg" className="min-w-[160px]">
              {actionLabel}
            </Button>
          )}
          {secondaryAction && secondaryActionLabel && (
            <Button
              onClick={secondaryAction}
              variant="outline"
              size="lg"
              className="min-w-[160px]"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// =============================================================================
// 1. No Calculations Yet - Friendly invitation to start
// =============================================================================

const CalculatorIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const pathVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.5, ease: 'easeInOut' },
    },
  };

  const floatVariants: Variants = {
    animate: {
      y: [-3, 3, -3],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('overflow-visible', className)}
      variants={floatVariants}
      animate="animate"
    >
      {/* Background glow */}
      <motion.circle
        cx="80"
        cy="80"
        r="70"
        className="fill-emerald-500/10 dark:fill-emerald-400/10"
        variants={pulseVariants}
        animate="animate"
      />

      {/* Calculator body */}
      <motion.rect
        x="40"
        y="30"
        width="80"
        height="100"
        rx="12"
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth="3"
        fill="none"
        variants={pathVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Screen */}
      <motion.rect
        x="50"
        y="42"
        width="60"
        height="24"
        rx="4"
        className="fill-emerald-100 dark:fill-emerald-900/30 stroke-emerald-500/50"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      />

      {/* Dollar sign on screen */}
      <motion.text
        x="80"
        y="60"
        textAnchor="middle"
        className="fill-emerald-600 dark:fill-emerald-400"
        fontSize="16"
        fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.7, 1] }}
        transition={{ delay: 0.8, duration: 2, repeat: Infinity }}
      >
        $0.00
      </motion.text>

      {/* Calculator buttons - row 1 */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={`row1-${i}`}
          x={50 + i * 15}
          y="76"
          width="12"
          height="12"
          rx="3"
          className="fill-slate-200 dark:fill-slate-700"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 400 }}
        />
      ))}

      {/* Calculator buttons - row 2 */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={`row2-${i}`}
          x={50 + i * 15}
          y="92"
          width="12"
          height="12"
          rx="3"
          className="fill-slate-200 dark:fill-slate-700"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 + i * 0.1, type: 'spring', stiffness: 400 }}
        />
      ))}

      {/* Calculator buttons - row 3 */}
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={`row3-${i}`}
          x={50 + i * 15}
          y="108"
          width="12"
          height="12"
          rx="3"
          className="fill-slate-200 dark:fill-slate-700"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 400 }}
        />
      ))}

      {/* Equals button */}
      <motion.rect
        x="95"
        y="108"
        width="12"
        height="12"
        rx="3"
        className="fill-emerald-500 dark:fill-emerald-600"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 400 }}
      />

      {/* Sparkles */}
      <motion.circle
        cx="130"
        cy="40"
        r="4"
        className="fill-amber-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
        transition={{ delay: 1.8, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
      />
      <motion.circle
        cx="35"
        cy="55"
        r="3"
        className="fill-blue-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
        transition={{ delay: 2.2, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
      />
      <motion.circle
        cx="125"
        cy="120"
        r="2.5"
        className="fill-purple-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
        transition={{ delay: 2.5, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
      />
    </motion.svg>
  );
};

export interface NoCalculationsProps extends EmptyStateProps {}

export const NoCalculations: React.FC<NoCalculationsProps> = ({
  className,
  onAction,
  actionLabel = 'Start Planning',
  secondaryAction,
  secondaryActionLabel = 'Learn More',
}) => {
  return (
    <EmptyStateWrapper
      className={className}
      illustration={<CalculatorIllustration />}
      title="Ready to Plan Your Future?"
      description="Enter your financial details to see personalized retirement projections and discover your path to financial freedom."
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />
  );
};

// =============================================================================
// 2. No Saved Scenarios - Encourage saving
// =============================================================================

const BookmarkIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const floatVariants: Variants = {
    animate: {
      y: [-2, 2, -2],
      rotate: [-1, 1, -1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('overflow-visible', className)}
      variants={floatVariants}
      animate="animate"
    >
      {/* Background circle */}
      <motion.circle
        cx="80"
        cy="80"
        r="65"
        className="fill-blue-500/10 dark:fill-blue-400/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Folder base */}
      <motion.path
        d="M35 55 L35 120 C35 125 38 128 43 128 L117 128 C122 128 125 125 125 120 L125 55"
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />

      {/* Folder tab */}
      <motion.path
        d="M35 55 L35 45 C35 40 38 37 43 37 L67 37 L75 47 L117 47 C122 47 125 50 125 55"
        className="stroke-slate-400 dark:stroke-slate-500"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: 'easeInOut' }}
      />

      {/* Documents inside */}
      <motion.rect
        x="50"
        y="65"
        width="40"
        height="50"
        rx="4"
        className="fill-white dark:fill-slate-800 stroke-blue-400 dark:stroke-blue-500"
        strokeWidth="2"
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 65, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
      />

      {/* Document lines */}
      {[0, 1, 2].map((i) => (
        <motion.line
          key={i}
          x1="56"
          y1={78 + i * 12}
          x2="84"
          y2={78 + i * 12}
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
        />
      ))}

      {/* Second document (offset) */}
      <motion.rect
        x="70"
        y="60"
        width="40"
        height="50"
        rx="4"
        className="fill-white dark:fill-slate-800 stroke-blue-300 dark:stroke-blue-600"
        strokeWidth="2"
        initial={{ y: 85, opacity: 0 }}
        animate={{ y: 60, opacity: 0.7 }}
        transition={{ delay: 1.0, duration: 0.5, type: 'spring' }}
      />

      {/* Bookmark ribbon */}
      <motion.path
        d="M100 32 L100 60 L107 52 L114 60 L114 32 Z"
        className="fill-amber-400 dark:fill-amber-500"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.5, type: 'spring', stiffness: 300 }}
      />

      {/* Star on bookmark */}
      <motion.path
        d="M107 40 L108.5 43 L112 43.5 L109.5 46 L110 49.5 L107 48 L104 49.5 L104.5 46 L102 43.5 L105.5 43 Z"
        className="fill-white"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.7, type: 'spring', stiffness: 400 }}
      />

      {/* Plus icon */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 300 }}
      >
        <circle cx="125" cy="115" r="14" className="fill-blue-500 dark:fill-blue-600" />
        <line x1="125" y1="109" x2="125" y2="121" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="119" y1="115" x2="131" y2="115" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  );
};

export interface NoSavedScenariosProps extends EmptyStateProps {}

export const NoSavedScenarios: React.FC<NoSavedScenariosProps> = ({
  className,
  onAction,
  actionLabel = 'Save Current Plan',
  secondaryAction,
  secondaryActionLabel = 'Create New Scenario',
}) => {
  return (
    <EmptyStateWrapper
      className={className}
      illustration={<BookmarkIllustration />}
      title="No Saved Scenarios Yet"
      description="Save different versions of your retirement plan to compare strategies and track how your projections change over time."
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />
  );
};

// =============================================================================
// 3. No Goals Set - Inspire goal setting
// =============================================================================

const GoalsIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const flagWave: Variants = {
    animate: {
      d: [
        'M85 35 Q100 40 95 50 Q90 60 85 55',
        'M85 35 Q95 45 100 50 Q105 55 85 55',
        'M85 35 Q100 40 95 50 Q90 60 85 55',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('overflow-visible', className)}
    >
      {/* Background glow */}
      <motion.circle
        cx="80"
        cy="90"
        r="60"
        className="fill-purple-500/10 dark:fill-purple-400/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Mountain 1 (back) */}
      <motion.path
        d="M20 130 L55 70 L90 130 Z"
        className="fill-slate-300 dark:fill-slate-700"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />

      {/* Mountain 2 (front) */}
      <motion.path
        d="M50 130 L95 55 L140 130 Z"
        className="fill-slate-400 dark:fill-slate-600"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      />

      {/* Snow cap */}
      <motion.path
        d="M95 55 L82 80 L95 75 L108 80 Z"
        className="fill-white dark:fill-slate-300"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring' }}
      />

      {/* Flag pole */}
      <motion.line
        x1="85"
        y1="55"
        x2="85"
        y2="28"
        className="stroke-amber-600 dark:stroke-amber-500"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        style={{ transformOrigin: 'bottom' }}
      />

      {/* Flag (animated wave) */}
      <motion.path
        d="M85 35 Q100 40 95 50 Q90 60 85 55"
        className="fill-amber-400 dark:fill-amber-500"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1 }}
        variants={flagWave}
      />
      <motion.path
        className="fill-amber-400 dark:fill-amber-500"
        variants={flagWave}
        animate="animate"
      />

      {/* Target rings at base */}
      <motion.circle
        cx="80"
        cy="130"
        r="25"
        className="stroke-purple-300 dark:stroke-purple-700"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ delay: 1.3, duration: 0.4 }}
      />
      <motion.circle
        cx="80"
        cy="130"
        r="16"
        className="stroke-purple-400 dark:stroke-purple-600"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.8 }}
        transition={{ delay: 1.4, duration: 0.4 }}
      />
      <motion.circle
        cx="80"
        cy="130"
        r="7"
        className="fill-purple-500 dark:fill-purple-500"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 400 }}
      />

      {/* Path/trail up mountain */}
      <motion.path
        d="M80 130 Q75 110 85 95 Q95 80 90 65"
        className="stroke-purple-400/50 dark:stroke-purple-500/50"
        strokeWidth="2"
        strokeDasharray="4 4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.6, duration: 1.5, ease: 'easeOut' }}
      />

      {/* Stars decoration */}
      <motion.path
        d="M30 50 L31.5 53 L35 53.5 L32.5 56 L33 59.5 L30 58 L27 59.5 L27.5 56 L25 53.5 L28.5 53 Z"
        className="fill-amber-300 dark:fill-amber-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      />
      <motion.path
        d="M130 70 L131 72 L133.5 72.3 L131.8 74 L132.2 76.5 L130 75.3 L127.8 76.5 L128.2 74 L126.5 72.3 L129 72 Z"
        className="fill-blue-300 dark:fill-blue-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
      />
    </motion.svg>
  );
};

export interface NoGoalsSetProps extends EmptyStateProps {}

export const NoGoalsSet: React.FC<NoGoalsSetProps> = ({
  className,
  onAction,
  actionLabel = 'Set Your Goals',
  secondaryAction,
  secondaryActionLabel = 'See Examples',
}) => {
  return (
    <EmptyStateWrapper
      className={className}
      illustration={<GoalsIllustration />}
      title="Set Your Retirement Goals"
      description="Define what financial freedom means to you. Whether it's early retirement, travel, or leaving a legacy - your goals shape your plan."
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />
  );
};

// =============================================================================
// 4. Loading Failed - Friendly error with retry
// =============================================================================

const ErrorIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const shakeVariants: Variants = {
    animate: {
      rotate: [0, -2, 2, -2, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 3,
      },
    },
  };

  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('overflow-visible', className)}
    >
      {/* Background circle */}
      <motion.circle
        cx="80"
        cy="80"
        r="65"
        className="fill-rose-500/10 dark:fill-rose-400/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Cloud shape */}
      <motion.g variants={shakeVariants} animate="animate">
        <motion.path
          d="M45 95 C30 95 25 80 35 70 C35 55 50 45 65 50 C70 35 95 35 105 50 C120 45 135 60 130 75 C145 80 140 100 125 100 L45 100 C40 100 45 95 45 95 Z"
          className="fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />

        {/* Disconnect icon on cloud */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        >
          {/* Broken link left */}
          <path
            d="M65 75 L60 80 C55 85 55 92 60 97"
            className="stroke-rose-500 dark:stroke-rose-400"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Broken link right */}
          <path
            d="M95 75 L100 80 C105 85 105 92 100 97"
            className="stroke-rose-500 dark:stroke-rose-400"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Lightning bolt (disconnect symbol) */}
          <path
            d="M80 72 L77 82 L83 82 L80 92"
            className="fill-amber-400 stroke-amber-500"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </motion.g>
      </motion.g>

      {/* Falling dots animation */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={65 + i * 15}
          cy="120"
          r="4"
          className="fill-slate-400 dark:fill-slate-500"
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: [0, 15, 0],
            opacity: [0.8, 0.3, 0.8],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Retry circular arrow */}
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '125px 130px' }}
      >
        <motion.path
          d="M115 130 A10 10 0 1 1 135 130"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        />
        <motion.path
          d="M135 126 L135 134 L127 130 Z"
          className="fill-blue-500 dark:fill-blue-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        />
      </motion.g>
    </motion.svg>
  );
};

export interface LoadingFailedProps extends EmptyStateProps {
  errorMessage?: string;
}

export const LoadingFailed: React.FC<LoadingFailedProps> = ({
  className,
  errorMessage,
  onAction,
  actionLabel = 'Try Again',
  secondaryAction,
  secondaryActionLabel = 'Contact Support',
}) => {
  return (
    <EmptyStateWrapper
      className={className}
      illustration={<ErrorIllustration />}
      title="Something Went Wrong"
      description={
        errorMessage ||
        "We couldn't load your data. This might be a temporary issue - please try again."
      }
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />
  );
};

// =============================================================================
// 5. Coming Soon - Feature preview
// =============================================================================

const ComingSoonIllustration: React.FC<{ className?: string }> = ({ className }) => {
  const sparkleVariants: Variants = {
    animate: (i: number) => ({
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        delay: i * 0.3,
        repeat: Infinity,
        repeatDelay: 1,
      },
    }),
  };

  return (
    <motion.svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('overflow-visible', className)}
    >
      {/* Background gradient circle */}
      <defs>
        <linearGradient id="comingSoonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="[stop-color:theme(colors.violet.500)] [stop-opacity:0.2]" />
          <stop offset="100%" className="[stop-color:theme(colors.indigo.500)] [stop-opacity:0.1]" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="80"
        cy="80"
        r="65"
        fill="url(#comingSoonGradient)"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Rocket body */}
      <motion.g
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, type: 'spring' }}
      >
        {/* Main body */}
        <path
          d="M80 30 C65 50 60 70 60 90 L80 100 L100 90 C100 70 95 50 80 30 Z"
          className="fill-slate-100 dark:fill-slate-800 stroke-indigo-500 dark:stroke-indigo-400"
          strokeWidth="2.5"
        />

        {/* Window */}
        <circle
          cx="80"
          cy="60"
          r="10"
          className="fill-indigo-100 dark:fill-indigo-900/50 stroke-indigo-400 dark:stroke-indigo-500"
          strokeWidth="2"
        />
        <circle cx="80" cy="60" r="5" className="fill-indigo-400 dark:fill-indigo-500" />

        {/* Left fin */}
        <path
          d="M60 82 L45 100 L60 95"
          className="fill-violet-400 dark:fill-violet-500"
        />

        {/* Right fin */}
        <path
          d="M100 82 L115 100 L100 95"
          className="fill-violet-400 dark:fill-violet-500"
        />

        {/* Stripes */}
        <rect x="72" y="75" width="16" height="3" rx="1.5" className="fill-indigo-300 dark:fill-indigo-600" />
        <rect x="72" y="82" width="16" height="3" rx="1.5" className="fill-indigo-300 dark:fill-indigo-600" />
      </motion.g>

      {/* Exhaust flames */}
      <motion.g
        animate={{
          scaleY: [0.8, 1.2, 0.9, 1.1, 0.8],
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
        }}
        style={{ transformOrigin: '80px 100px' }}
      >
        <path
          d="M70 100 L80 130 L90 100"
          className="fill-amber-400 dark:fill-amber-500"
        />
        <path
          d="M74 100 L80 120 L86 100"
          className="fill-orange-300 dark:fill-orange-400"
        />
      </motion.g>

      {/* Sparkles around rocket */}
      {[
        { x: 35, y: 45 },
        { x: 125, y: 50 },
        { x: 40, y: 110 },
        { x: 120, y: 105 },
        { x: 80, y: 25 },
      ].map((pos, i) => (
        <motion.path
          key={i}
          d={`M${pos.x} ${pos.y - 4} L${pos.x + 1.5} ${pos.y - 1.5} L${pos.x + 4} ${pos.y} L${pos.x + 1.5} ${pos.y + 1.5} L${pos.x} ${pos.y + 4} L${pos.x - 1.5} ${pos.y + 1.5} L${pos.x - 4} ${pos.y} L${pos.x - 1.5} ${pos.y - 1.5} Z`}
          className="fill-amber-300 dark:fill-amber-400"
          variants={sparkleVariants}
          custom={i}
          animate="animate"
        />
      ))}

      {/* Stars */}
      <motion.circle
        cx="30"
        cy="70"
        r="2"
        className="fill-slate-400 dark:fill-slate-500"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx="130"
        cy="75"
        r="1.5"
        className="fill-slate-400 dark:fill-slate-500"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />
      <motion.circle
        cx="45"
        cy="35"
        r="1.5"
        className="fill-slate-400 dark:fill-slate-500"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
      />
    </motion.svg>
  );
};

export interface ComingSoonProps extends EmptyStateProps {
  featureName?: string;
  estimatedDate?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  className,
  featureName,
  estimatedDate,
  onAction,
  actionLabel = 'Get Notified',
  secondaryAction,
  secondaryActionLabel = 'See Roadmap',
}) => {
  return (
    <EmptyStateWrapper
      className={className}
      illustration={<ComingSoonIllustration />}
      title={featureName ? `${featureName} Coming Soon` : 'Coming Soon'}
      description={
        estimatedDate
          ? `We're working hard to bring you this feature. Expected launch: ${estimatedDate}`
          : "We're building something exciting! This feature will be available soon."
      }
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    >
      {estimatedDate && (
        <motion.div
          variants={itemVariants}
          className="mb-4 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full"
        >
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Launching {estimatedDate}
          </span>
        </motion.div>
      )}
    </EmptyStateWrapper>
  );
};

// =============================================================================
// Generic Empty State (customizable)
// =============================================================================

type IllustrationKey = 'calculator' | 'bookmark' | 'goals' | 'error' | 'rocket';

export interface GenericEmptyStateProps extends EmptyStateProps {
  illustration?: IllustrationKey | React.ReactNode;
  title: string;
  description: string;
}

const illustrationMap: Record<IllustrationKey, React.FC<{ className?: string }>> = {
  calculator: CalculatorIllustration,
  bookmark: BookmarkIllustration,
  goals: GoalsIllustration,
  error: ErrorIllustration,
  rocket: ComingSoonIllustration,
};

const isIllustrationKey = (value: unknown): value is IllustrationKey => {
  return typeof value === 'string' && value in illustrationMap;
};

export const GenericEmptyState: React.FC<GenericEmptyStateProps> = ({
  className,
  illustration = 'calculator',
  title,
  description,
  onAction,
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
}) => {
  const renderIllustration = () => {
    if (isIllustrationKey(illustration)) {
      const IllustrationComponent = illustrationMap[illustration];
      return <IllustrationComponent />;
    }
    return <>{illustration}</>;
  };

  return (
    <EmptyStateWrapper
      className={className}
      illustration={renderIllustration()}
      title={title}
      description={description}
      onAction={onAction}
      actionLabel={actionLabel}
      secondaryAction={secondaryAction}
      secondaryActionLabel={secondaryActionLabel}
    />
  );
};

// =============================================================================
// Export all components
// =============================================================================

export const EmptyStates = {
  NoCalculations,
  NoSavedScenarios,
  NoGoalsSet,
  LoadingFailed,
  ComingSoon,
  Generic: GenericEmptyState,
};

export default EmptyStates;

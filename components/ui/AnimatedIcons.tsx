"use client";

import React, { useEffect } from "react";
import { motion, useAnimation, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Common props for all animated icons
interface AnimatedIconProps {
  size?: number;
  className?: string;
  loop?: boolean;
  trigger?: boolean; // External trigger for animation
  delay?: number;
  duration?: number;
  color?: string;
  secondaryColor?: string;
}

// =============================================================================
// 1. MoneyGrow - Dollar sign growing animation
// =============================================================================
export const MoneyGrow: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = true,
  trigger = true,
  delay = 0,
  duration = 2,
  color = "currentColor",
  secondaryColor = "#10B981",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const dollarVariants: Variants = {
    initial: { scale: 0.8, opacity: 0.5 },
    animate: {
      scale: [0.8, 1.1, 1],
      opacity: [0.5, 1, 1],
      transition: {
        duration,
        delay,
        repeat: loop ? Infinity : 0,
        repeatDelay: 1,
        ease: "easeOut",
      },
    },
  };

  const arrowVariants: Variants = {
    initial: { y: 10, opacity: 0 },
    animate: {
      y: [10, -5, 0],
      opacity: [0, 1, 1],
      transition: {
        duration: duration * 0.6,
        delay: delay + 0.3,
        repeat: loop ? Infinity : 0,
        repeatDelay: 1.4,
        ease: "easeOut",
      },
    },
  };

  const sparkleVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: duration * 0.5,
        delay: delay + 0.5,
        repeat: loop ? Infinity : 0,
        repeatDelay: 1.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Dollar sign circle */}
      <motion.circle
        cx="24"
        cy="26"
        r="16"
        stroke={color}
        strokeWidth="2"
        fill="none"
        variants={dollarVariants}
        initial="initial"
        animate={controls}
      />

      {/* Dollar sign */}
      <motion.text
        x="24"
        y="32"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill={color}
        variants={dollarVariants}
        initial="initial"
        animate={controls}
      >
        $
      </motion.text>

      {/* Growth arrow */}
      <motion.path
        d="M36 8 L40 4 L44 8 M40 4 L40 16"
        stroke={secondaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={arrowVariants}
        initial="initial"
        animate={controls}
      />

      {/* Sparkles */}
      <motion.circle
        cx="8"
        cy="12"
        r="2"
        fill={secondaryColor}
        variants={sparkleVariants}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx="14"
        cy="6"
        r="1.5"
        fill={secondaryColor}
        variants={sparkleVariants}
        initial="initial"
        animate={controls}
        style={{ transitionDelay: "0.1s" }}
      />
    </svg>
  );
};

// =============================================================================
// 2. ChartUp - Line chart drawing animation
// =============================================================================
export const ChartUp: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = true,
  trigger = true,
  delay = 0,
  duration = 2,
  color = "currentColor",
  secondaryColor = "#3B82F6",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const pathVariants: Variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration, delay, ease: "easeInOut" },
        opacity: { duration: 0.3, delay },
        repeat: loop ? Infinity : 0,
        repeatDelay: 1,
      },
    },
  };

  const dotVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: delay + (i * duration) / 4,
        repeat: loop ? Infinity : 0,
        repeatDelay: duration + 1,
      },
    }),
  };

  const gridVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 0.3,
      transition: { duration: 0.5, delay },
    },
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Grid lines */}
      <motion.g variants={gridVariants} initial="initial" animate={controls}>
        <line x1="8" y1="12" x2="8" y2="40" stroke={color} strokeWidth="1" />
        <line x1="8" y1="40" x2="40" y2="40" stroke={color} strokeWidth="1" />
        <line x1="8" y1="28" x2="40" y2="28" stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="8" y1="20" x2="40" y2="20" stroke={color} strokeWidth="0.5" strokeDasharray="2 2" />
      </motion.g>

      {/* Chart line */}
      <motion.path
        d="M10 36 L18 28 L26 32 L34 18 L42 10"
        stroke={secondaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={pathVariants}
        initial="initial"
        animate={controls}
      />

      {/* Data points */}
      {[
        { x: 10, y: 36 },
        { x: 18, y: 28 },
        { x: 26, y: 32 },
        { x: 34, y: 18 },
        { x: 42, y: 10 },
      ].map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={secondaryColor}
          variants={dotVariants}
          custom={i}
          initial="initial"
          animate={controls}
        />
      ))}
    </svg>
  );
};

// =============================================================================
// 3. Piggy - Piggy bank filling animation
// =============================================================================
export const Piggy: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = true,
  trigger = true,
  delay = 0,
  duration = 2.5,
  color = "currentColor",
  secondaryColor = "#F59E0B",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const piggyVariants: Variants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.4,
        delay: delay + duration * 0.6,
        repeat: loop ? Infinity : 0,
        repeatDelay: duration + 0.5,
      },
    },
  };

  const coinVariants: Variants = {
    initial: { y: -20, opacity: 0, rotate: 0 },
    animate: {
      y: [-20, 0, 0],
      opacity: [0, 1, 0],
      rotate: [0, 180, 360],
      transition: {
        duration: duration * 0.6,
        delay,
        repeat: loop ? Infinity : 0,
        repeatDelay: duration * 0.4 + 0.5,
        ease: "easeIn",
      },
    },
  };

  const fillVariants: Variants = {
    initial: { scaleY: 0 },
    animate: {
      scaleY: [0, 0.3, 0.5, 0.7, 1],
      transition: {
        duration,
        delay: delay + 0.3,
        repeat: loop ? Infinity : 0,
        repeatDelay: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Coin slot */}
      <rect x="20" y="8" width="8" height="2" rx="1" fill={color} opacity="0.5" />

      {/* Falling coin */}
      <motion.g variants={coinVariants} initial="initial" animate={controls}>
        <circle cx="24" cy="4" r="4" fill={secondaryColor} />
        <text x="24" y="6" textAnchor="middle" fontSize="5" fontWeight="bold" fill={color}>$</text>
      </motion.g>

      {/* Piggy body */}
      <motion.g variants={piggyVariants} initial="initial" animate={controls}>
        {/* Body */}
        <ellipse cx="24" cy="28" rx="16" ry="12" stroke={color} strokeWidth="2" fill="none" />

        {/* Fill level (inside piggy) */}
        <clipPath id="piggyClip">
          <ellipse cx="24" cy="28" rx="14" ry="10" />
        </clipPath>
        <motion.rect
          x="10"
          y="18"
          width="28"
          height="20"
          fill={secondaryColor}
          opacity="0.3"
          clipPath="url(#piggyClip)"
          variants={fillVariants}
          initial="initial"
          animate={controls}
          style={{ transformOrigin: "center bottom" }}
        />

        {/* Snout */}
        <ellipse cx="40" cy="26" rx="4" ry="3" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="39" cy="25" r="1" fill={color} />
        <circle cx="41" cy="25" r="1" fill={color} />

        {/* Ear */}
        <path d="M14 18 Q10 12 16 14" stroke={color} strokeWidth="2" fill="none" />

        {/* Eye */}
        <circle cx="18" cy="24" r="2" fill={color} />

        {/* Legs */}
        <rect x="14" y="38" width="4" height="6" rx="2" fill={color} />
        <rect x="30" y="38" width="4" height="6" rx="2" fill={color} />

        {/* Tail */}
        <path d="M8 26 Q4 22 6 28 Q4 32 8 30" stroke={color} strokeWidth="2" fill="none" />
      </motion.g>
    </svg>
  );
};

// =============================================================================
// 4. Shield - Security shield check animation
// =============================================================================
export const Shield: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = false,
  trigger = true,
  delay = 0,
  duration = 1.5,
  color = "currentColor",
  secondaryColor = "#10B981",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const shieldVariants: Variants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: duration * 0.4,
        delay,
        ease: "backOut",
      },
    },
  };

  const checkVariants: Variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: duration * 0.5,
        delay: delay + duration * 0.4,
        ease: "easeOut",
        repeat: loop ? Infinity : 0,
        repeatDelay: 2,
      },
    },
  };

  const pulseVariants: Variants = {
    initial: { scale: 1, opacity: 0.5 },
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        delay: delay + duration,
        repeat: loop ? Infinity : 0,
        ease: "easeInOut",
      },
    },
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Pulse effect */}
      <motion.path
        d="M24 4 L40 10 L40 24 C40 34 32 42 24 44 C16 42 8 34 8 24 L8 10 Z"
        fill={secondaryColor}
        opacity="0.2"
        variants={pulseVariants}
        initial="initial"
        animate={controls}
      />

      {/* Shield */}
      <motion.path
        d="M24 4 L40 10 L40 24 C40 34 32 42 24 44 C16 42 8 34 8 24 L8 10 Z"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        variants={shieldVariants}
        initial="initial"
        animate={controls}
      />

      {/* Checkmark */}
      <motion.path
        d="M16 24 L22 30 L34 18"
        stroke={secondaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={checkVariants}
        initial="initial"
        animate={controls}
      />
    </svg>
  );
};

// =============================================================================
// 5. Clock - Time passing animation
// =============================================================================
export const Clock: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = true,
  trigger = true,
  delay = 0,
  duration = 3,
  color = "currentColor",
  secondaryColor = "#6366F1",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const clockFaceVariants: Variants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        delay,
        ease: "backOut",
      },
    },
  };

  const hourHandVariants: Variants = {
    initial: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: {
        duration: duration * 4,
        delay,
        repeat: loop ? Infinity : 0,
        ease: "linear",
      },
    },
  };

  const minuteHandVariants: Variants = {
    initial: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: {
        duration,
        delay,
        repeat: loop ? Infinity : 0,
        ease: "linear",
      },
    },
  };

  const tickVariants: Variants = {
    initial: { opacity: 0.3 },
    animate: (i: number) => ({
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 0.5,
        delay: delay + (i * duration) / 12,
        repeat: loop ? Infinity : 0,
        repeatDelay: duration - 0.5,
      },
    }),
  };

  // Generate hour markers
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const innerR = 16;
    const outerR = 18;
    return {
      x1: 24 + innerR * Math.cos(angle),
      y1: 24 + innerR * Math.sin(angle),
      x2: 24 + outerR * Math.cos(angle),
      y2: 24 + outerR * Math.sin(angle),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Clock face */}
      <motion.circle
        cx="24"
        cy="24"
        r="20"
        stroke={color}
        strokeWidth="2"
        fill="none"
        variants={clockFaceVariants}
        initial="initial"
        animate={controls}
      />

      {/* Hour markers */}
      {hourMarkers.map((marker, i) => (
        <motion.line
          key={i}
          x1={marker.x1}
          y1={marker.y1}
          x2={marker.x2}
          y2={marker.y2}
          stroke={secondaryColor}
          strokeWidth={i % 3 === 0 ? "2" : "1"}
          strokeLinecap="round"
          variants={tickVariants}
          custom={i}
          initial="initial"
          animate={controls}
        />
      ))}

      {/* Hour hand */}
      <motion.line
        x1="24"
        y1="24"
        x2="24"
        y2="14"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        variants={hourHandVariants}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "24px 24px" }}
      />

      {/* Minute hand */}
      <motion.line
        x1="24"
        y1="24"
        x2="24"
        y2="8"
        stroke={secondaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        variants={minuteHandVariants}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: "24px 24px" }}
      />

      {/* Center dot */}
      <motion.circle
        cx="24"
        cy="24"
        r="2"
        fill={secondaryColor}
        variants={clockFaceVariants}
        initial="initial"
        animate={controls}
      />
    </svg>
  );
};

// =============================================================================
// 6. Trophy - Achievement unlocked animation
// =============================================================================
export const Trophy: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = false,
  trigger = true,
  delay = 0,
  duration = 2,
  color = "currentColor",
  secondaryColor = "#F59E0B",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const trophyVariants: Variants = {
    initial: { scale: 0, y: 20, opacity: 0 },
    animate: {
      scale: [0, 1.2, 1],
      y: [20, -5, 0],
      opacity: 1,
      transition: {
        duration: duration * 0.5,
        delay,
        ease: "backOut",
      },
    },
  };

  const shineVariants: Variants = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: [0, 0.8, 0],
      x: [-20, 20, 40],
      transition: {
        duration: duration * 0.4,
        delay: delay + duration * 0.5,
        repeat: loop ? Infinity : 0,
        repeatDelay: 2,
      },
    },
  };

  const starVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i: number) => ({
      scale: [0, 1.5, 1, 0],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: duration * 0.5,
        delay: delay + duration * 0.4 + i * 0.15,
        repeat: loop ? Infinity : 0,
        repeatDelay: 2,
      },
    }),
  };

  const starPositions = [
    { x: 8, y: 8 },
    { x: 40, y: 10 },
    { x: 6, y: 24 },
    { x: 42, y: 20 },
    { x: 12, y: 4 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Stars */}
      {starPositions.map((pos, i) => (
        <motion.path
          key={i}
          d={`M${pos.x} ${pos.y - 2} L${pos.x + 0.7} ${pos.y - 0.7} L${pos.x + 2} ${pos.y} L${pos.x + 0.7} ${pos.y + 0.7} L${pos.x} ${pos.y + 2} L${pos.x - 0.7} ${pos.y + 0.7} L${pos.x - 2} ${pos.y} L${pos.x - 0.7} ${pos.y - 0.7} Z`}
          fill={secondaryColor}
          variants={starVariants}
          custom={i}
          initial="initial"
          animate={controls}
        />
      ))}

      {/* Trophy */}
      <motion.g variants={trophyVariants} initial="initial" animate={controls}>
        {/* Cup */}
        <path
          d="M16 12 L16 24 C16 30 20 34 24 34 C28 34 32 30 32 24 L32 12 Z"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Fill */}
        <path
          d="M17 13 L17 24 C17 29 20.5 33 24 33 C27.5 33 31 29 31 24 L31 13 Z"
          fill={secondaryColor}
          opacity="0.3"
        />

        {/* Left handle */}
        <path
          d="M16 14 C10 14 10 22 16 22"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Right handle */}
        <path
          d="M32 14 C38 14 38 22 32 22"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Stem */}
        <rect x="22" y="34" width="4" height="4" fill={color} />

        {/* Base */}
        <path
          d="M18 38 L30 38 L32 44 L16 44 Z"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Star on trophy */}
        <path
          d="M24 18 L25.5 21 L29 21.5 L26.5 24 L27 27.5 L24 26 L21 27.5 L21.5 24 L19 21.5 L22.5 21 Z"
          fill={secondaryColor}
        />
      </motion.g>

      {/* Shine effect */}
      <clipPath id="trophyShineClip">
        <path d="M16 12 L16 24 C16 30 20 34 24 34 C28 34 32 30 32 24 L32 12 Z" />
      </clipPath>
      <motion.rect
        x="-10"
        y="10"
        width="8"
        height="30"
        fill="white"
        opacity="0.6"
        clipPath="url(#trophyShineClip)"
        variants={shineVariants}
        initial="initial"
        animate={controls}
        style={{ transform: "rotate(-20deg)" }}
      />
    </svg>
  );
};

// =============================================================================
// 7. Rocket - Launch/success animation
// =============================================================================
export const Rocket: React.FC<AnimatedIconProps> = ({
  size = 48,
  className,
  loop = true,
  trigger = true,
  delay = 0,
  duration = 2,
  color = "currentColor",
  secondaryColor = "#EF4444",
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start("animate");
    } else {
      controls.start("initial");
    }
  }, [trigger, controls]);

  const rocketVariants: Variants = {
    initial: { y: 20, opacity: 0, rotate: 0 },
    animate: {
      y: [20, -5, 0],
      opacity: 1,
      rotate: [0, -3, 3, 0],
      transition: {
        y: { duration: duration * 0.4, delay, ease: "backOut" },
        opacity: { duration: 0.3, delay },
        rotate: {
          duration: 0.5,
          delay: delay + duration * 0.4,
          repeat: loop ? Infinity : 0,
          repeatType: "reverse",
        },
      },
    },
  };

  const flameVariants: Variants = {
    initial: { scaleY: 0, opacity: 0 },
    animate: {
      scaleY: [0.5, 1, 0.7, 1.2, 0.8],
      opacity: [0.8, 1, 0.9, 1, 0.8],
      transition: {
        duration: 0.3,
        delay: delay + 0.2,
        repeat: loop ? Infinity : 0,
        ease: "easeInOut",
      },
    },
  };

  const smokeVariants: Variants = {
    initial: { scale: 0, opacity: 0, y: 0 },
    animate: (i: number) => ({
      scale: [0, 1, 1.5],
      opacity: [0.6, 0.3, 0],
      y: [0, 10, 20],
      transition: {
        duration: 1.5,
        delay: delay + 0.3 + i * 0.2,
        repeat: loop ? Infinity : 0,
        repeatDelay: 0.5,
      },
    }),
  };

  const starTrailVariants: Variants = {
    initial: { opacity: 0, pathLength: 0 },
    animate: {
      opacity: [0, 1, 0],
      pathLength: [0, 1, 1],
      transition: {
        duration: 1,
        delay: delay + duration * 0.3,
        repeat: loop ? Infinity : 0,
        repeatDelay: 1,
      },
    },
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("overflow-visible", className)}
    >
      {/* Star trails */}
      <motion.path
        d="M8 42 L12 38"
        stroke={secondaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        variants={starTrailVariants}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M6 36 L10 34"
        stroke={secondaryColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        variants={starTrailVariants}
        initial="initial"
        animate={controls}
        style={{ transitionDelay: "0.1s" }}
      />

      {/* Smoke clouds */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={20 + i * 4}
          cy="44"
          r={3 - i * 0.5}
          fill={color}
          opacity="0.3"
          variants={smokeVariants}
          custom={i}
          initial="initial"
          animate={controls}
        />
      ))}

      {/* Rocket body */}
      <motion.g variants={rocketVariants} initial="initial" animate={controls}>
        {/* Main body */}
        <path
          d="M24 4 C18 12 16 20 16 28 L24 32 L32 28 C32 20 30 12 24 4 Z"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Body fill */}
        <path
          d="M24 6 C19 13 17 20 17 27 L24 30.5 L31 27 C31 20 29 13 24 6 Z"
          fill={color}
          opacity="0.1"
        />

        {/* Window */}
        <circle cx="24" cy="16" r="4" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="24" cy="16" r="2" fill={secondaryColor} opacity="0.5" />

        {/* Left fin */}
        <path
          d="M16 26 L10 34 L16 32"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Right fin */}
        <path
          d="M32 26 L38 34 L32 32"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />

        {/* Flames */}
        <motion.g
          variants={flameVariants}
          initial="initial"
          animate={controls}
          style={{ transformOrigin: "24px 32px" }}
        >
          <path
            d="M20 32 L24 44 L28 32"
            fill={secondaryColor}
          />
          <path
            d="M22 32 L24 40 L26 32"
            fill="#FCD34D"
          />
        </motion.g>
      </motion.g>
    </svg>
  );
};

// =============================================================================
// Export all icons as a namespace for convenience
// =============================================================================
export const AnimatedIcons = {
  MoneyGrow,
  ChartUp,
  Piggy,
  Shield,
  Clock,
  Trophy,
  Rocket,
};

export default AnimatedIcons;

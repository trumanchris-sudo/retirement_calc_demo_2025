"use client"

import React from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface InteractiveWithdrawalSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  description?: string
  className?: string
}

export const InteractiveWithdrawalSlider: React.FC<InteractiveWithdrawalSliderProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 8,
  step = 0.1,
  description,
  className
}) => {
  // Convert value (1-8%) to drag position (-200 to 200)
  // We'll map: 1% = -200, 4.5% = 0, 8% = 200
  const valueToDrag = (val: number) => {
    const normalized = (val - min) / (max - min) // 0 to 1
    return (normalized - 0.5) * 400 // -200 to 200
  }

  const dragToValue = (drag: number) => {
    const normalized = (drag + 200) / 400 // 0 to 1
    const val = min + normalized * (max - min)
    return Math.max(min, Math.min(max, Math.round(val / step) * step))
  }

  const x = useMotionValue(valueToDrag(value))

  // Define zones based on withdrawal rate
  // Safe: 1-4% (green), Moderate: 4-5.5% (amber), Risky: 5.5-8% (red)
  const xInput = [-200, -50, 50, 200]

  // Background gradients for each zone
  const background = useTransform(x, xInput, [
    // Safe zone (1-3.5%): Green
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    // Good zone (3.5-4.5%): Blue-green (sweet spot around 4%)
    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    // Moderate zone (4.5-6%): Amber warning
    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    // Risky zone (6-8%): Red warning
    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  ])

  // Icon colors
  const iconColor = useTransform(x, xInput, [
    "rgb(16, 185, 129)", // green
    "rgb(59, 130, 246)", // blue
    "rgb(245, 158, 11)", // amber
    "rgb(239, 68, 68)", // red
  ])

  // Icon visibility based on position
  // Checkmark for safe zone (< -50, which is < ~4%)
  const checkPath = useTransform(x, [-200, -50], [1, 0])

  // Warning icon for moderate zone (-50 to 50, which is 4-5.5%)
  const warningPath = useTransform(x, [-50, 0, 50], [0, 1, 0])

  // X mark for risky zone (> 50, which is > 5.5%)
  const crossPathA = useTransform(x, [50, 150], [0, 1])
  const crossPathB = useTransform(x, [100, 200], [0, 1])

  const handleDrag = () => {
    const newValue = dragToValue(x.get())
    if (newValue !== value) {
      onChange(newValue)
    }
  }

  // Sync x position when value changes externally
  React.useEffect(() => {
    const targetX = valueToDrag(value)
    if (Math.abs(x.get() - targetX) > 1) {
      x.set(targetX)
    }
  }, [value, x])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
          {value.toFixed(1)}%
        </span>
      </div>

      <motion.div
        style={{ background }}
        className="flex justify-center items-center w-full h-40 rounded-xl transition-all"
      >
        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -200, right: 200 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDrag}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="w-24 h-24 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 50 50">
              {/* Circle outline */}
              <motion.path
                fill="none"
                strokeWidth="2.5"
                stroke={iconColor}
                d="M 5, 25 a 20, 20 0 1,0 40,0 a 20, 20 0 1,0 -40,0"
              />

              {/* Checkmark (safe zone) */}
              <motion.path
                fill="none"
                strokeWidth="3"
                stroke={iconColor}
                d="M15,25 L 22,32 L 35,18"
                strokeDasharray="0 1"
                style={{ pathLength: checkPath }}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Warning exclamation mark (moderate zone) */}
              <motion.g style={{ opacity: warningPath }}>
                <motion.path
                  fill="none"
                  strokeWidth="3"
                  stroke={iconColor}
                  d="M25,15 L25,28"
                  strokeLinecap="round"
                />
                <motion.circle
                  fill={iconColor}
                  cx="25"
                  cy="34"
                  r="2"
                />
              </motion.g>

              {/* X mark (risky zone) */}
              <motion.path
                fill="none"
                strokeWidth="3"
                stroke={iconColor}
                d="M18,18 L32,32"
                strokeDasharray="0 1"
                style={{ pathLength: crossPathA }}
                strokeLinecap="round"
              />
              <motion.path
                fill="none"
                strokeWidth="3"
                stroke={iconColor}
                d="M32,18 L18,32"
                strokeDasharray="0 1"
                style={{ pathLength: crossPathB }}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}

      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Safe</span>
        <span className="font-medium">← Drag to adjust →</span>
        <span>Risky</span>
      </div>
    </div>
  )
}

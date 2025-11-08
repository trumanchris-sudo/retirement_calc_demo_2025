"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface PulseGlowProps {
  children: ReactNode
  color?: string
  intensity?: "low" | "medium" | "high"
}

export function PulseGlow({ children, color = "#3b82f6", intensity = "medium" }: PulseGlowProps) {
  const glowIntensity = {
    low: "0 0 10px",
    medium: "0 0 20px",
    high: "0 0 40px",
  }

  return (
    <motion.div
      animate={{
        boxShadow: [
          `${glowIntensity[intensity]} ${color}40`,
          `${glowIntensity[intensity]} ${color}80, 0 0 30px ${color}40`,
          `${glowIntensity[intensity]} ${color}40`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="rounded-xl"
    >
      {children}
    </motion.div>
  )
}

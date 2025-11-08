"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface ShakeEffectProps {
  children: ReactNode
  trigger: boolean
  onComplete?: () => void
}

export function ShakeEffect({ children, trigger, onComplete }: ShakeEffectProps) {
  return (
    <motion.div
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, -5, 5, 0],
        y: [0, -5, 5, -5, 5, -2, 2, 0],
        rotate: [0, -2, 2, -2, 2, -1, 1, 0],
      } : {}}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  )
}

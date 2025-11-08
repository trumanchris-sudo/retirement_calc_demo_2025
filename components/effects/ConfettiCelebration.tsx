"use client"

import { motion, useAnimationFrame } from "framer-motion"
import { useState, useRef } from "react"

interface Confetti {
  id: number
  x: number
  y: number
  rotation: number
  rotationSpeed: number
  color: string
  size: number
  vx: number
  vy: number
}

export function ConfettiCelebration() {
  const [confetti, setConfetti] = useState<Confetti[]>(() => {
    const items: Confetti[] []
    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7", "#a29bfe", "#fd79a8", "#fdcb6e"]

    for (let i = 0; i < 100; i++) {
      items.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 100,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 12,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
      })
    }
    return items
  })

  const frameRef = useRef(0)

  useAnimationFrame(() => {
    frameRef.current++
    if (frameRef.current % 2 !== 0) return // Update every other frame

    setConfetti((prev) =>
      prev.map((c) => ({
        ...c,
        x: c.x + c.vx,
        y: c.y + c.vy,
        rotation: c.rotation + c.rotationSpeed,
        vy: c.vy + 0.1, // Gravity
      })).filter((c) => c.y < window.innerHeight + 50) // Remove off-screen confetti
    )
  })

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            rotate: c.rotation,
          }}
          className="rounded-sm"
        />
      ))}
    </div>
  )
}

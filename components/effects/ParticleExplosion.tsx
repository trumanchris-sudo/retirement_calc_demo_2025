"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
}

interface ParticleExplosionProps {
  x: number
  y: number
  onComplete?: () => void
}

export function ParticleExplosion({ x, y, onComplete }: ParticleExplosionProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Create 50 particles
    const newParticles: Particle[] = []
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50
      const velocity = 3 + Math.random() * 5
      newParticles.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
      })
    }

    setParticles(newParticles)

    // Clean up after animation
    const timer = setTimeout(() => {
      onComplete?.()
    }, 2000)

    return () => clearTimeout(timer)
  }, [x, y, onComplete])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: particle.x + particle.vx * 100,
            y: particle.y + particle.vy * 100 + 200, // Gravity effect
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 2,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            backgroundColor: particle.color,
          }}
        />
      ))}
    </div>
  )
}

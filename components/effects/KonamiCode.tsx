"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
]

interface KonamiCodeProps {
  onActivate?: () => void
}

export function KonamiCode({ onActivate }: KonamiCodeProps) {
  const [keys, setKeys] = useState<string[]>([])
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = [...prev, e.key].slice(-10)

        // Check if matches Konami code
        if (newKeys.join(",") === KONAMI_CODE.join(",")) {
          setActivated(true)
          onActivate?.()
          setTimeout(() => setActivated(false), 5000)
          return []
        }

        return newKeys
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onActivate])

  return (
    <AnimatePresence>
      {activated && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9999]"
        >
          <div className="relative">
            {/* Rainbow rotating background */}
            <motion.div
              animate={{
                rotate: 360,
                background: [
                  "linear-gradient(0deg, #ff0080, #ff8c00, #40e0d0)",
                  "linear-gradient(120deg, #ff8c00, #40e0d0, #ff0080)",
                  "linear-gradient(240deg, #40e0d0, #ff0080, #ff8c00)",
                  "linear-gradient(360deg, #ff0080, #ff8c00, #40e0d0)",
                ],
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                background: { duration: 3, repeat: Infinity, ease: "linear" },
              }}
              className="absolute inset-0 rounded-3xl blur-3xl opacity-80"
              style={{ width: "600px", height: "400px" }}
            />

            {/* Main message */}
            <motion.div
              animate={{
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent"
            >
              <h1 className="text-8xl font-black text-center drop-shadow-2xl">
                🎮 LEGENDARY! 🎮
              </h1>
              <p className="text-3xl text-center mt-4 text-white drop-shadow-lg">
                Konami Code Activated!
              </p>
              <p className="text-xl text-center mt-2 text-white/80">
                +30 Years Added to Portfolio! 💰
              </p>
            </motion.div>

            {/* Floating emoji particles */}
            {["🚀", "💎", "⭐", "🎯", "🏆", "💯", "🔥", "✨"].map((emoji, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 400],
                  y: [0, (Math.random() - 0.5) * 400],
                  opacity: [0, 1, 0],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="absolute text-6xl"
                style={{
                  left: "50%",
                  top: "50%",
                }}
              >
                {emoji}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

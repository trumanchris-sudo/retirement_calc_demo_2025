"use client"

import { motion } from "framer-motion"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"

interface CubeFace {
  position: "front" | "back" | "right" | "left" | "top" | "bottom"
  card: ReactNode
  label: string
}

interface FlippingCardCubeProps {
  faces: CubeFace[]
  className?: string
  size?: number
}

export function FlippingCardCube({ faces, className, size = 400 }: FlippingCardCubeProps) {
  const [currentFace, setCurrentFace] = useState<"front" | "back" | "right" | "left" | "top" | "bottom">("front")
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  const navigateToFace = (face: "front" | "back" | "right" | "left" | "top" | "bottom") => {
    const rotations = {
      front: { x: 0, y: 0 },
      back: { x: 0, y: 180 },
      right: { x: 0, y: -90 },
      left: { x: 0, y: 90 },
      top: { x: -90, y: 0 },
      bottom: { x: 90, y: 0 },
    }
    setRotation(rotations[face])
    setCurrentFace(face)
  }

  const currentFaceIndex = faces.findIndex(f => f.position === currentFace)

  return (
    <div className={cn("relative", className)}>
      {/* Navigation Buttons */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {faces.map((face) => (
          <motion.button
            key={face.position}
            onClick={() => navigateToFace(face.position)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all text-sm",
              currentFace === face.position
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
            )}
          >
            {face.label}
          </motion.button>
        ))}
      </div>

      {/* Cube Container */}
      <div className="flex justify-center items-center py-12">
        <div
          className="cube-scene"
          style={{
            perspective: "1200px",
            width: `${size}px`,
            height: `${size}px`,
          }}
        >
          <motion.div
            className="cube-container"
            animate={{
              rotateX: rotation.x,
              rotateY: rotation.y,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 1,
            }}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              transformStyle: "preserve-3d",
            }}
          >
            {faces.map((face) => (
              <div
                key={face.position}
                className={cn(
                  "cube-face",
                  `cube-face-${face.position}`
                )}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  transform: getFaceTransform(face.position, size / 2),
                }}
              >
                {face.card}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Face Indicator */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Viewing: <span className="font-semibold text-blue-600 dark:text-blue-400">
            {faces[currentFaceIndex]?.label}
          </span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          {currentFaceIndex + 1} of {faces.length}
        </p>
      </div>

      {/* Instruction */}
      <div className="text-center mt-4 text-xs text-slate-500 dark:text-slate-400">
        Click buttons above to rotate cube • Click cards to flip
      </div>
    </div>
  )
}

function getFaceTransform(position: string, translateZ: number): string {
  const transforms = {
    front: `rotateY(0deg) translateZ(${translateZ}px)`,
    back: `rotateY(180deg) translateZ(${translateZ}px)`,
    right: `rotateY(90deg) translateZ(${translateZ}px)`,
    left: `rotateY(-90deg) translateZ(${translateZ}px)`,
    top: `rotateX(90deg) translateZ(${translateZ}px)`,
    bottom: `rotateX(-90deg) translateZ(${translateZ}px)`,
  }
  return transforms[position as keyof typeof transforms] || ""
}

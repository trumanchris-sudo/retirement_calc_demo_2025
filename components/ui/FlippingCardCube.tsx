"use client"

import { motion, useMotionValue } from "framer-motion"
import { ReactNode, useState, SVGProps } from "react"
import { cn } from "@/lib/utils"

interface CubeFace {
  position: "front" | "back" | "right" | "left"
  card: ReactNode
  label: string
}

interface FlippingCardCubeProps {
  faces: CubeFace[]
  className?: string
  size?: number
}

export function FlippingCardCube({ faces, className, size = 400 }: FlippingCardCubeProps) {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Motion value for live rotation during drag
  const liveRotateY = useMotionValue(0)

  const navigateToIndex = (index: number) => {
    const faceRotations = [0, 90, 180, -90] // front, left, back, right
    setRotation(faceRotations[index])
    setCurrentFaceIndex(index)
    liveRotateY.set(faceRotations[index])
  }

  const navigateNext = () => {
    const nextIndex = (currentFaceIndex + 1) % faces.length
    navigateToIndex(nextIndex)
  }

  const navigatePrev = () => {
    const prevIndex = (currentFaceIndex - 1 + faces.length) % faces.length
    navigateToIndex(prevIndex)
  }

  // Snap to nearest face on drag end
  const snapToNearestFace = () => {
    const currentRotY = liveRotateY.get()

    // Normalize rotation to -180 to 180
    const normalizeAngle = (angle: number) => {
      let normalized = angle % 360
      if (normalized > 180) normalized -= 360
      if (normalized < -180) normalized += 360
      return normalized
    }

    const normY = normalizeAngle(currentRotY)

    // Determine closest face based on rotation (Y-axis only)
    let closestIndex = 0
    if (Math.abs(normY) < 45) closestIndex = 0 // front
    else if (normY >= 45 && normY < 135) closestIndex = 1 // left
    else if (Math.abs(normY) >= 135) closestIndex = 2 // back
    else closestIndex = 3 // right

    navigateToIndex(closestIndex)
    setIsDragging(false)
  }

  const handleDrag = (_: any, info: any) => {
    // Convert horizontal drag offset to Y-axis rotation (0.5 degrees per pixel)
    const newRotY = rotation + info.offset.x * 0.5
    liveRotateY.set(newRotY)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Cube Container */}
      <div className="flex justify-center items-center py-12 relative">
        {/* Previous Arrow */}
        <motion.button
          onClick={navigatePrev}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-10"
          aria-label="Previous card"
        >
          <ArrowLeft />
        </motion.button>

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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDrag={handleDrag}
            onDragEnd={snapToNearestFace}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              transformStyle: "preserve-3d",
              rotateY: liveRotateY,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            animate={
              !isDragging
                ? {
                    rotateY: rotation,
                  }
                : undefined
            }
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 1,
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
                  pointerEvents: isDragging ? "none" : "auto",
                }}
              >
                {face.card}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Next Arrow */}
        <motion.button
          onClick={navigateNext}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-10"
          aria-label="Next card"
        >
          <ArrowRight />
        </motion.button>
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
        Drag cube left/right to rotate • Click arrows to navigate • Click cards to flip
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
  }
  return transforms[position as keyof typeof transforms] || ""
}

/**
 * ==============   Icons   ================
 */
const iconsProps: SVGProps<SVGSVGElement> = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
}

function ArrowLeft() {
  return (
    <svg {...iconsProps}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function ArrowRight() {
  return (
    <svg {...iconsProps}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

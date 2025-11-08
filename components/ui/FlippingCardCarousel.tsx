"use client"

import { AnimatePresence, motion, usePresenceData, wrap } from "framer-motion"
import { forwardRef, ReactNode, SVGProps, useState } from "react"
import { cn } from "@/lib/utils"

interface FlippingCardCarouselProps {
  cards: ReactNode[]
  className?: string
}

export function FlippingCardCarousel({ cards, className }: FlippingCardCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  function navigate(newDirection: 1 | -1) {
    const nextIndex = wrap(0, cards.length, selectedIndex + newDirection)
    setSelectedIndex(nextIndex)
    setDirection(newDirection)
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-center gap-4">
        {/* Previous Button */}
        <motion.button
          initial={false}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-10"
          aria-label="Previous card"
        >
          <ArrowLeft />
        </motion.button>

        {/* Card Container */}
        <div className="relative w-full max-w-sm h-auto flex items-center justify-center overflow-visible">
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <CarouselCard key={selectedIndex} direction={direction}>
              {cards[selectedIndex]}
            </CarouselCard>
          </AnimatePresence>
        </div>

        {/* Next Button */}
        <motion.button
          initial={false}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(1)}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-10"
          aria-label="Next card"
        >
          <ArrowRight />
        </motion.button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > selectedIndex ? 1 : -1)
              setSelectedIndex(index)
            }}
            className={cn(
              "h-2 rounded-full transition-all",
              index === selectedIndex
                ? "bg-blue-600 dark:bg-blue-400 w-8"
                : "bg-slate-300 dark:bg-slate-600 w-2"
            )}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>

      {/* Card Counter */}
      <div className="text-center mt-3 text-sm text-slate-600 dark:text-slate-400">
        {selectedIndex + 1} of {cards.length}
      </div>
    </div>
  )
}

const CarouselCard = forwardRef<
  HTMLDivElement,
  { children: ReactNode; direction: number }
>(function CarouselCard({ children }, ref) {
  const direction = usePresenceData()

  return (
    <motion.div
      ref={ref}
      custom={direction}
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: {
          delay: 0.15,
          type: "spring",
          stiffness: 300,
          damping: 30,
        },
      }}
      exit={{ opacity: 0, x: direction * -100 }}
      className="absolute w-full"
    >
      {children}
    </motion.div>
  )
})

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

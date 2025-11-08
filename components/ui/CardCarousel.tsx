"use client"

import { AnimatePresence, motion, usePresenceData, wrap } from "framer-motion"
import { forwardRef, SVGProps, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CarouselCard {
  id: number
  title: string
  description: string
  icon: string
  color: string
  gradient: string
}

const defaultCards: CarouselCard[] = [
  {
    id: 1,
    title: "The 4% Rule",
    description: "Withdraw 4% of your portfolio annually in retirement for a sustainable income that should last 30 years.",
    icon: "📊",
    color: "from-blue-500 to-blue-600",
    gradient: "#3b82f6"
  },
  {
    id: 2,
    title: "Start Early",
    description: "The power of compound interest means starting to save in your 20s can result in 2-3x more wealth than starting in your 30s.",
    icon: "🌱",
    color: "from-green-500 to-emerald-600",
    gradient: "#10b981"
  },
  {
    id: 3,
    title: "Diversify Assets",
    description: "Spread investments across stocks, bonds, and real estate to reduce risk and maximize long-term growth potential.",
    icon: "🎯",
    color: "from-purple-500 to-violet-600",
    gradient: "#8b5cf6"
  },
  {
    id: 4,
    title: "Emergency Fund",
    description: "Keep 6-12 months of expenses in liquid savings before aggressively investing for retirement.",
    icon: "🛡️",
    color: "from-amber-500 to-orange-600",
    gradient: "#f59e0b"
  },
  {
    id: 5,
    title: "Employer Match",
    description: "Always contribute enough to get your full employer 401(k) match—it's free money with guaranteed 100% returns!",
    icon: "💰",
    color: "from-emerald-500 to-teal-600",
    gradient: "#14b8a6"
  },
  {
    id: 6,
    title: "Tax-Advantaged",
    description: "Maximize contributions to IRAs and 401(k)s to reduce taxable income and let investments grow tax-deferred.",
    icon: "🏦",
    color: "from-indigo-500 to-blue-600",
    gradient: "#6366f1"
  }
]

interface CardCarouselProps {
  cards?: CarouselCard[]
  className?: string
}

export function CardCarousel({ cards = defaultCards, className }: CardCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  function navigate(newDirection: 1 | -1) {
    const nextIndex = wrap(0, cards.length, selectedIndex + newDirection)
    setSelectedIndex(nextIndex)
    setDirection(newDirection)
  }

  const currentCard = cards[selectedIndex]

  return (
    <div className={cn("flex items-center justify-center gap-4 p-6", className)}>
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
      <div className="relative w-full max-w-md h-64 flex items-center justify-center">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <CarouselCardComponent
            key={currentCard.id}
            card={currentCard}
            direction={direction}
          />
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

      {/* Pagination Dots */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2 pb-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > selectedIndex ? 1 : -1)
              setSelectedIndex(index)
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === selectedIndex
                ? "bg-blue-600 dark:bg-blue-400 w-6"
                : "bg-slate-300 dark:bg-slate-600"
            )}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

const CarouselCardComponent = forwardRef<
  HTMLDivElement,
  { card: CarouselCard; direction: number }
>(function CarouselCardComponent({ card }, ref) {
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
          delay: 0.2,
          type: "spring",
          stiffness: 300,
          damping: 30,
        },
      }}
      exit={{ opacity: 0, x: direction * -100 }}
      className="absolute w-full"
    >
      <Card className={cn(
        "w-full shadow-xl border-2",
        "bg-gradient-to-br",
        card.color
      )}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{card.icon}</div>
            <CardTitle className="text-white text-2xl">
              {card.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-white/90 text-base leading-relaxed">
            {card.description}
          </CardDescription>
        </CardContent>
      </Card>
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

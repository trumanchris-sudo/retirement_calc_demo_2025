"use client"

import { useAnimationFrame } from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"

interface MetricsCubeProps {
  totalBalance: number
  successRate: number
  withdrawalRate: number
  returnRate: number
  yearsToRetirement: number
  endOfLifeValue: number
  className?: string
}

export function MetricsCube({
  totalBalance,
  successRate,
  withdrawalRate,
  returnRate,
  yearsToRetirement,
  endOfLifeValue,
  className
}: MetricsCubeProps) {
  const ref = useRef<HTMLDivElement>(null)

  useAnimationFrame((t) => {
    if (!ref.current) return

    const rotateX = Math.sin(t / 10000) * 30 + 15  // Gentle tilt
    const rotateY = (t / 50) % 360  // Slow continuous rotation
    const y = (1 + Math.sin(t / 2000)) * -10  // Subtle float

    ref.current.style.transform = `translateY(${y}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  })

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
  }

  const formatPercent = (val: number) => `${val.toFixed(1)}%`

  return (
    <div className={cn("perspective-container", className)}>
      <div className="cube-wrapper" ref={ref}>
        {/* Front: Total Balance */}
        <div className="cube-face front">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">Total Balance</div>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          </div>
        </div>

        {/* Back: Success Rate */}
        <div className="cube-face back">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">Success Rate</div>
            <div className="text-2xl font-bold">{formatPercent(successRate)}</div>
          </div>
        </div>

        {/* Right: Withdrawal Rate */}
        <div className="cube-face right">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">Withdrawal</div>
            <div className="text-2xl font-bold">{formatPercent(withdrawalRate)}</div>
          </div>
        </div>

        {/* Left: Return Rate */}
        <div className="cube-face left">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">Return Rate</div>
            <div className="text-2xl font-bold">{formatPercent(returnRate)}</div>
          </div>
        </div>

        {/* Top: Years to Retirement */}
        <div className="cube-face top">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">Years Left</div>
            <div className="text-2xl font-bold">{yearsToRetirement}</div>
          </div>
        </div>

        {/* Bottom: End of Life Value */}
        <div className="cube-face bottom">
          <div className="face-content">
            <div className="text-xs opacity-70 mb-1">EOL Value</div>
            <div className="text-2xl font-bold">{formatCurrency(endOfLifeValue)}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-container {
          perspective: 800px;
          width: 160px;
          height: 160px;
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          pointer-events: none;
        }

        .cube-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.1s ease-out;
        }

        .cube-face {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
          border: 1px solid hsl(var(--primary) / 0.3);
          border-radius: 8px;
          backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
        }

        .face-content {
          text-align: center;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .front {
          transform: rotateY(0deg) translateZ(80px);
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .back {
          transform: rotateY(180deg) translateZ(80px);
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .right {
          transform: rotateY(90deg) translateZ(80px);
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .left {
          transform: rotateY(-90deg) translateZ(80px);
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .top {
          transform: rotateX(90deg) translateZ(80px);
          background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
        }

        .bottom {
          transform: rotateX(-90deg) translateZ(80px);
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }

        @media (max-width: 768px) {
          .perspective-container {
            width: 120px;
            height: 120px;
            bottom: 16px;
            right: 16px;
          }

          .front { transform: rotateY(0deg) translateZ(60px); }
          .back { transform: rotateY(180deg) translateZ(60px); }
          .right { transform: rotateY(90deg) translateZ(60px); }
          .left { transform: rotateY(-90deg) translateZ(60px); }
          .top { transform: rotateX(90deg) translateZ(60px); }
          .bottom { transform: rotateX(-90deg) translateZ(60px); }

          .face-content {
            font-size: 0.75rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cube-wrapper {
            animation: none !important;
            transform: rotateX(15deg) rotateY(45deg) !important;
          }
        }

        /* Hide cube when printing */
        @media print {
          .perspective-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

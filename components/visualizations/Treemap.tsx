"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Home, ZoomIn, ZoomOut, Layers } from "lucide-react"
import { cn, fmt, fmtPercent } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// Types
// ============================================================================

export type ColorScheme = "accountType" | "assetClass" | "risk" | "performance"

export interface TreemapNode {
  id: string
  name: string
  value: number
  // Optional metadata for coloring
  accountType?: "401k" | "ira" | "roth" | "taxable" | "hsa" | "529" | "pension" | "other"
  assetClass?: "stocks" | "bonds" | "cash" | "realEstate" | "commodities" | "crypto" | "alternatives"
  riskLevel?: "low" | "medium" | "high"
  ytdReturn?: number
  // Children for nested structure
  children?: TreemapNode[]
}

export interface TreemapProps {
  data: TreemapNode
  colorScheme?: ColorScheme
  height?: number
  className?: string
  onNodeClick?: (node: TreemapNode, path: TreemapNode[]) => void
  showLegend?: boolean
  showTooltips?: boolean
  minCellSize?: number
}

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
  node: TreemapNode
  depth: number
}

// ============================================================================
// Color Palettes
// ============================================================================

const ACCOUNT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "401k": { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" },
  ira: { bg: "bg-purple-500", text: "text-white", border: "border-purple-600" },
  roth: { bg: "bg-green-500", text: "text-white", border: "border-green-600" },
  taxable: { bg: "bg-orange-500", text: "text-white", border: "border-orange-600" },
  hsa: { bg: "bg-cyan-500", text: "text-white", border: "border-cyan-600" },
  "529": { bg: "bg-pink-500", text: "text-white", border: "border-pink-600" },
  pension: { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-600" },
  other: { bg: "bg-gray-500", text: "text-white", border: "border-gray-600" },
}

const ASSET_CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stocks: { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" },
  bonds: { bg: "bg-blue-400", text: "text-white", border: "border-blue-500" },
  cash: { bg: "bg-slate-400", text: "text-white", border: "border-slate-500" },
  realEstate: { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" },
  commodities: { bg: "bg-yellow-500", text: "text-black", border: "border-yellow-600" },
  crypto: { bg: "bg-violet-500", text: "text-white", border: "border-violet-600" },
  alternatives: { bg: "bg-rose-500", text: "text-white", border: "border-rose-600" },
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-green-400", text: "text-white", border: "border-green-500" },
  medium: { bg: "bg-yellow-400", text: "text-black", border: "border-yellow-500" },
  high: { bg: "bg-red-500", text: "text-white", border: "border-red-600" },
}

// Performance gradient from red (negative) through yellow (neutral) to green (positive)
const getPerformanceColor = (ytdReturn?: number): { bg: string; text: string; border: string } => {
  if (ytdReturn === undefined) {
    return { bg: "bg-gray-400", text: "text-white", border: "border-gray-500" }
  }
  if (ytdReturn >= 15) return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" }
  if (ytdReturn >= 10) return { bg: "bg-green-500", text: "text-white", border: "border-green-600" }
  if (ytdReturn >= 5) return { bg: "bg-lime-500", text: "text-white", border: "border-lime-600" }
  if (ytdReturn >= 0) return { bg: "bg-yellow-400", text: "text-black", border: "border-yellow-500" }
  if (ytdReturn >= -5) return { bg: "bg-orange-400", text: "text-white", border: "border-orange-500" }
  if (ytdReturn >= -10) return { bg: "bg-red-400", text: "text-white", border: "border-red-500" }
  return { bg: "bg-red-600", text: "text-white", border: "border-red-700" }
}

// ============================================================================
// Treemap Layout Algorithm (Squarified)
// ============================================================================

function squarify(
  nodes: TreemapNode[],
  rect: { x: number; y: number; width: number; height: number },
  depth: number
): LayoutRect[] {
  if (nodes.length === 0) return []

  const totalValue = nodes.reduce((sum, n) => sum + n.value, 0)
  if (totalValue === 0) return []

  // Normalize values to fit in rectangle
  const normalizedNodes = nodes
    .filter(n => n.value > 0)
    .map(n => ({
      ...n,
      normalizedValue: (n.value / totalValue) * rect.width * rect.height
    }))
    .sort((a, b) => b.normalizedValue - a.normalizedValue)

  const results: LayoutRect[] = []
  const currentRect = { ...rect }

  function layout(children: typeof normalizedNodes) {
    if (children.length === 0) return

    // totalArea is used implicitly via children for layout calculations
    const isVertical = currentRect.width >= currentRect.height
    const side = isVertical ? currentRect.height : currentRect.width

    let row: typeof normalizedNodes = []
    let rowArea = 0
    let bestRatio = Infinity

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const testRow = [...row, child]
      const testArea = rowArea + child.normalizedValue
      const testRatio = worstRatio(testRow.map(r => r.normalizedValue), testArea, side)

      if (testRatio <= bestRatio || row.length === 0) {
        row = testRow
        rowArea = testArea
        bestRatio = testRatio
      } else {
        // Layout current row and continue with remaining
        layoutRow(row, rowArea)
        row = [child]
        rowArea = child.normalizedValue
        bestRatio = worstRatio([child.normalizedValue], rowArea, side)
      }
    }

    if (row.length > 0) {
      layoutRow(row, rowArea)
    }
  }

  function worstRatio(rowValues: number[], rowArea: number, side: number): number {
    if (rowValues.length === 0) return Infinity
    const rowWidth = rowArea / side
    let worst = 0
    for (const v of rowValues) {
      const h = v / rowWidth
      const ratio = Math.max(rowWidth / h, h / rowWidth)
      worst = Math.max(worst, ratio)
    }
    return worst
  }

  function layoutRow(row: typeof normalizedNodes, rowArea: number) {
    const isVertical = currentRect.width >= currentRect.height
    const rowWidth = isVertical
      ? rowArea / currentRect.height
      : rowArea / currentRect.width

    let offset = 0
    for (const item of row) {
      const itemLength = item.normalizedValue / rowWidth

      const layoutRect: LayoutRect = isVertical
        ? {
            x: currentRect.x,
            y: currentRect.y + offset,
            width: rowWidth,
            height: itemLength,
            node: item,
            depth
          }
        : {
            x: currentRect.x + offset,
            y: currentRect.y,
            width: itemLength,
            height: rowWidth,
            node: item,
            depth
          }

      results.push(layoutRect)
      offset += itemLength
    }

    // Update remaining rectangle
    if (isVertical) {
      currentRect.x += rowWidth
      currentRect.width -= rowWidth
    } else {
      currentRect.y += rowWidth
      currentRect.height -= rowWidth
    }
  }

  layout(normalizedNodes)
  return results
}

// ============================================================================
// TreemapCell Component
// ============================================================================

interface TreemapCellProps {
  rect: LayoutRect
  colorScheme: ColorScheme
  totalValue: number
  onClick: () => void
  hasChildren: boolean
  showTooltips: boolean
  isHovered: boolean
  onHover: (hovered: boolean) => void
  minCellSize: number
}

const TreemapCell = React.memo(function TreemapCell({
  rect,
  colorScheme,
  totalValue,
  onClick,
  hasChildren,
  showTooltips,
  isHovered,
  onHover,
  minCellSize
}: TreemapCellProps) {
  const { node, x, y, width, height } = rect
  const percentage = totalValue > 0 ? (node.value / totalValue) : 0

  // Get color based on scheme
  const getColor = useCallback(() => {
    switch (colorScheme) {
      case "accountType":
        return ACCOUNT_TYPE_COLORS[node.accountType || "other"] || ACCOUNT_TYPE_COLORS.other
      case "assetClass":
        return ASSET_CLASS_COLORS[node.assetClass || "stocks"] || ASSET_CLASS_COLORS.stocks
      case "risk":
        return RISK_COLORS[node.riskLevel || "medium"] || RISK_COLORS.medium
      case "performance":
        return getPerformanceColor(node.ytdReturn)
      default:
        return ACCOUNT_TYPE_COLORS.other
    }
  }, [colorScheme, node])

  const colors = getColor()

  // Determine what content to show based on cell size
  const showName = width > 60 && height > 30
  const showValue = width > 80 && height > 50
  const showPercentage = width > 100 && height > 70
  const showZoomIndicator = hasChildren && width > 50 && height > 40

  const cellContent = (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: x,
        y: y,
        width: Math.max(width - 2, 0),
        height: Math.max(height - 2, 0)
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }}
      className={cn(
        "absolute rounded-md border-2 cursor-pointer overflow-hidden",
        "transition-all duration-200",
        colors.bg,
        colors.border,
        isHovered ? "ring-2 ring-white ring-offset-2 ring-offset-background z-10 shadow-xl" : "shadow-sm",
        hasChildren && "hover:brightness-110"
      )}
      style={{
        left: 0,
        top: 0,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className={cn(
        "p-2 h-full flex flex-col",
        colors.text
      )}>
        {showName && (
          <div className="font-semibold text-sm truncate flex items-center gap-1">
            {node.name}
            {showZoomIndicator && hasChildren && (
              <ZoomIn className="h-3 w-3 opacity-60" />
            )}
          </div>
        )}
        {showValue && (
          <div className="text-xs opacity-90 font-medium">
            {fmt(node.value)}
          </div>
        )}
        {showPercentage && (
          <div className="text-xs opacity-75 mt-auto">
            {fmtPercent(percentage)}
          </div>
        )}
        {!showName && width >= minCellSize && height >= minCellSize && (
          <div className="text-xs font-bold opacity-90 truncate">
            {fmtPercent(percentage)}
          </div>
        )}
      </div>
    </motion.div>
  )

  if (showTooltips) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">{node.name}</div>
            <div className="text-sm">
              <span className="text-muted-foreground">Value:</span> {fmt(node.value)}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Portfolio:</span> {fmtPercent(percentage)}
            </div>
            {node.accountType && (
              <div className="text-sm">
                <span className="text-muted-foreground">Account:</span> {node.accountType.toUpperCase()}
              </div>
            )}
            {node.assetClass && (
              <div className="text-sm">
                <span className="text-muted-foreground">Asset Class:</span> {node.assetClass}
              </div>
            )}
            {node.ytdReturn !== undefined && (
              <div className="text-sm">
                <span className="text-muted-foreground">YTD Return:</span>{" "}
                <span className={node.ytdReturn >= 0 ? "text-green-500" : "text-red-500"}>
                  {node.ytdReturn >= 0 ? "+" : ""}{node.ytdReturn.toFixed(1)}%
                </span>
              </div>
            )}
            {hasChildren && (
              <div className="text-xs text-muted-foreground italic mt-2">
                Click to zoom in
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return cellContent
})

// ============================================================================
// Legend Component
// ============================================================================

interface LegendProps {
  colorScheme: ColorScheme
  onSchemeChange: (scheme: ColorScheme) => void
}

const Legend = React.memo(function Legend({ colorScheme, onSchemeChange }: LegendProps) {
  const schemes: { value: ColorScheme; label: string }[] = [
    { value: "accountType", label: "Account Type" },
    { value: "assetClass", label: "Asset Class" },
    { value: "risk", label: "Risk Level" },
    { value: "performance", label: "Performance" },
  ]

  const currentLegendItems = useMemo(() => {
    switch (colorScheme) {
      case "accountType":
        return Object.entries(ACCOUNT_TYPE_COLORS).map(([key, colors]) => ({
          key,
          label: key === "401k" ? "401(k)" : key.toUpperCase(),
          ...colors
        }))
      case "assetClass":
        return Object.entries(ASSET_CLASS_COLORS).map(([key, colors]) => ({
          key,
          label: key.replace(/([A-Z])/g, " $1").trim(),
          ...colors
        }))
      case "risk":
        return Object.entries(RISK_COLORS).map(([key, colors]) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          ...colors
        }))
      case "performance":
        return [
          { key: "high", label: ">15%", ...getPerformanceColor(20) },
          { key: "good", label: "5-15%", ...getPerformanceColor(10) },
          { key: "neutral", label: "0-5%", ...getPerformanceColor(2) },
          { key: "low", label: "<0%", ...getPerformanceColor(-5) },
        ]
      default:
        return []
    }
  }, [colorScheme])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Color by:</span>
        {schemes.map(scheme => (
          <Button
            key={scheme.value}
            variant={colorScheme === scheme.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSchemeChange(scheme.value)}
          >
            {scheme.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {currentLegendItems.map(item => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm", item.bg)} />
            <span className="text-xs text-muted-foreground capitalize">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// ============================================================================
// Main Treemap Component
// ============================================================================

export const Treemap = React.memo(function Treemap({
  data,
  colorScheme: initialColorScheme = "accountType",
  height = 500,
  className,
  onNodeClick,
  showLegend = true,
  showTooltips = true,
  minCellSize = 20
}: TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height })
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialColorScheme)
  const [navigationPath, setNavigationPath] = useState<TreemapNode[]>([data])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Current view is the last node in path
  const currentNode = navigationPath[navigationPath.length - 1]

  // Measure container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height })
      }
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [height])

  // Calculate layout
  const layout = useMemo(() => {
    const children = currentNode.children || []
    if (children.length === 0) {
      // Leaf node - show single cell
      return [{
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
        node: currentNode,
        depth: 0
      }]
    }

    return squarify(
      children,
      { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
      0
    )
  }, [currentNode, dimensions])

  // Total value for percentage calculations
  const totalValue = useMemo(() => {
    const children = currentNode.children || []
    if (children.length === 0) return currentNode.value
    return children.reduce((sum, child) => sum + child.value, 0)
  }, [currentNode])

  // Handle cell click - zoom into node
  const handleCellClick = useCallback((node: TreemapNode) => {
    if (node.children && node.children.length > 0) {
      setNavigationPath(prev => [...prev, node])
    }
    onNodeClick?.(node, [...navigationPath, node])
  }, [navigationPath, onNodeClick])

  // Navigate to specific path index
  const navigateToIndex = useCallback((index: number) => {
    setNavigationPath(prev => prev.slice(0, index + 1))
  }, [])

  // Zoom out one level
  const zoomOut = useCallback(() => {
    if (navigationPath.length > 1) {
      setNavigationPath(prev => prev.slice(0, -1))
    }
  }, [navigationPath.length])

  // Reset to root
  const resetView = useCallback(() => {
    setNavigationPath([data])
  }, [data])

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Portfolio Composition
            </CardTitle>
            <CardDescription>
              Hierarchical view of your wealth allocation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {navigationPath.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  className="gap-1"
                >
                  <ZoomOut className="h-4 w-4" />
                  Zoom Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                  className="gap-1"
                >
                  <Home className="h-4 w-4" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {navigationPath.length > 1 && (
          <Breadcrumb className="mt-3">
            <BreadcrumbList>
              {navigationPath.map((node, index) => (
                <React.Fragment key={node.id}>
                  {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>}
                  <BreadcrumbItem>
                    {index === navigationPath.length - 1 ? (
                      <BreadcrumbPage className="flex items-center gap-1">
                        {node.name}
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {fmt(node.value)}
                        </Badge>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          navigateToIndex(index)
                        }}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {index === 0 ? <Home className="h-3 w-3" /> : null}
                        {node.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Legend */}
        {showLegend && (
          <div className="mt-4">
            <Legend colorScheme={colorScheme} onSchemeChange={setColorScheme} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-6">
        {/* Summary Stats */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Value:</span>{" "}
            <span className="font-bold">{fmt(currentNode.value)}</span>
          </div>
          {currentNode.children && (
            <div className="text-sm">
              <span className="text-muted-foreground">Holdings:</span>{" "}
              <span className="font-bold">{currentNode.children.length}</span>
            </div>
          )}
          {currentNode.ytdReturn !== undefined && (
            <div className="text-sm">
              <span className="text-muted-foreground">YTD:</span>{" "}
              <span className={cn(
                "font-bold",
                currentNode.ytdReturn >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {currentNode.ytdReturn >= 0 ? "+" : ""}{currentNode.ytdReturn.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Treemap Visualization */}
        <TooltipProvider delayDuration={0}>
          <div
            ref={containerRef}
            className="relative bg-muted/30 rounded-lg overflow-hidden border"
            style={{ height: `${height}px` }}
          >
            <AnimatePresence mode="wait">
              {layout.map((rect) => (
                <TreemapCell
                  key={`${currentNode.id}-${rect.node.id}`}
                  rect={rect}
                  colorScheme={colorScheme}
                  totalValue={totalValue}
                  onClick={() => handleCellClick(rect.node)}
                  hasChildren={!!(rect.node.children && rect.node.children.length > 0)}
                  showTooltips={showTooltips}
                  isHovered={hoveredId === rect.node.id}
                  onHover={(hovered) => setHoveredId(hovered ? rect.node.id : null)}
                  minCellSize={minCellSize}
                />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {layout.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No holdings data available
              </div>
            )}
          </div>
        </TooltipProvider>

        {/* Interaction Hints */}
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4">
          <span>Click on a category to zoom in</span>
          {showTooltips && <span>Hover for details</span>}
        </div>
      </CardContent>
    </Card>
  )
})

// ============================================================================
// Demo Data Generator
// ============================================================================

export function generateDemoTreemapData(): TreemapNode {
  return {
    id: "portfolio",
    name: "Total Portfolio",
    value: 1250000,
    ytdReturn: 8.5,
    children: [
      {
        id: "retirement",
        name: "Retirement Accounts",
        value: 850000,
        accountType: "401k",
        ytdReturn: 9.2,
        children: [
          {
            id: "401k",
            name: "401(k)",
            value: 520000,
            accountType: "401k",
            ytdReturn: 10.1,
            children: [
              { id: "401k-stocks", name: "US Stocks", value: 312000, accountType: "401k", assetClass: "stocks", riskLevel: "high", ytdReturn: 12.5 },
              { id: "401k-intl", name: "International", value: 104000, accountType: "401k", assetClass: "stocks", riskLevel: "high", ytdReturn: 6.3 },
              { id: "401k-bonds", name: "Bonds", value: 78000, accountType: "401k", assetClass: "bonds", riskLevel: "low", ytdReturn: 2.1 },
              { id: "401k-target", name: "Target Date", value: 26000, accountType: "401k", assetClass: "stocks", riskLevel: "medium", ytdReturn: 8.7 },
            ]
          },
          {
            id: "roth-ira",
            name: "Roth IRA",
            value: 180000,
            accountType: "roth",
            ytdReturn: 11.3,
            children: [
              { id: "roth-growth", name: "Growth ETF", value: 90000, accountType: "roth", assetClass: "stocks", riskLevel: "high", ytdReturn: 15.2 },
              { id: "roth-sp500", name: "S&P 500", value: 72000, accountType: "roth", assetClass: "stocks", riskLevel: "medium", ytdReturn: 9.8 },
              { id: "roth-tech", name: "Technology", value: 18000, accountType: "roth", assetClass: "stocks", riskLevel: "high", ytdReturn: 18.4 },
            ]
          },
          {
            id: "trad-ira",
            name: "Traditional IRA",
            value: 150000,
            accountType: "ira",
            ytdReturn: 5.8,
            children: [
              { id: "ira-balanced", name: "Balanced Fund", value: 75000, accountType: "ira", assetClass: "stocks", riskLevel: "medium", ytdReturn: 6.2 },
              { id: "ira-dividend", name: "Dividend Fund", value: 50000, accountType: "ira", assetClass: "stocks", riskLevel: "low", ytdReturn: 4.8 },
              { id: "ira-bonds", name: "Bond Fund", value: 25000, accountType: "ira", assetClass: "bonds", riskLevel: "low", ytdReturn: 3.1 },
            ]
          }
        ]
      },
      {
        id: "taxable",
        name: "Taxable Brokerage",
        value: 280000,
        accountType: "taxable",
        ytdReturn: 7.4,
        children: [
          { id: "tax-vti", name: "Total Market", value: 140000, accountType: "taxable", assetClass: "stocks", riskLevel: "medium", ytdReturn: 9.2 },
          { id: "tax-bonds", name: "Municipal Bonds", value: 70000, accountType: "taxable", assetClass: "bonds", riskLevel: "low", ytdReturn: 2.8 },
          { id: "tax-reits", name: "REITs", value: 42000, accountType: "taxable", assetClass: "realEstate", riskLevel: "medium", ytdReturn: 4.5 },
          { id: "tax-intl", name: "Intl Developed", value: 28000, accountType: "taxable", assetClass: "stocks", riskLevel: "high", ytdReturn: 5.9 },
        ]
      },
      {
        id: "hsa",
        name: "HSA",
        value: 45000,
        accountType: "hsa",
        ytdReturn: 8.9,
        children: [
          { id: "hsa-stocks", name: "Stock Index", value: 36000, accountType: "hsa", assetClass: "stocks", riskLevel: "medium", ytdReturn: 9.8 },
          { id: "hsa-cash", name: "Cash Reserve", value: 9000, accountType: "hsa", assetClass: "cash", riskLevel: "low", ytdReturn: 4.5 },
        ]
      },
      {
        id: "529",
        name: "529 College Savings",
        value: 75000,
        accountType: "529",
        ytdReturn: 6.2,
        children: [
          { id: "529-aggressive", name: "Age-Based Aggr", value: 45000, accountType: "529", assetClass: "stocks", riskLevel: "high", ytdReturn: 7.8 },
          { id: "529-moderate", name: "Age-Based Mod", value: 30000, accountType: "529", assetClass: "bonds", riskLevel: "medium", ytdReturn: 3.8 },
        ]
      }
    ]
  }
}

export default Treemap

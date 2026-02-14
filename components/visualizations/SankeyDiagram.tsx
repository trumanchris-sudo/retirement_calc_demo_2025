"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import { SANKEY_COLORS } from "@/lib/chartColors";

// ==================== Types ====================

interface IncomeSource {
  id: string;
  label: string;
  amount: number;
  color: string;
}

interface AccountNode {
  id: string;
  label: string;
  type: "401k" | "roth" | "taxable" | "hsa" | "pension";
  inflow: number;
  outflow: number;
  taxLeakage: number;
  color: string;
}

interface SpendingCategory {
  id: string;
  label: string;
  amount: number;
  color: string;
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
  isTaxLeakage?: boolean;
}

interface SankeyDiagramProps {
  incomeSources?: IncomeSource[];
  accounts?: AccountNode[];
  spendingCategories?: SpendingCategory[];
  flows?: FlowLink[];
  className?: string;
  animated?: boolean;
  showParticles?: boolean;
  particleCount?: number;
  particleSpeed?: number;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Particle {
  id: number;
  pathIndex: number;
  progress: number;
  speed: number;
}

// ==================== Default Data ====================

const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  { id: "salary", label: "Salary", amount: 120000, color: SANKEY_COLORS.income.salary },
  { id: "bonus", label: "Bonus", amount: 15000, color: SANKEY_COLORS.income.bonus },
  { id: "investments", label: "Investment Income", amount: 8000, color: SANKEY_COLORS.income.investments },
  { id: "social-security", label: "Social Security", amount: 24000, color: SANKEY_COLORS.income.socialSecurity },
];

const DEFAULT_ACCOUNTS: AccountNode[] = [
  { id: "401k", label: "401(k)", type: "401k", inflow: 50000, outflow: 35000, taxLeakage: 7000, color: SANKEY_COLORS.accounts["401k"] },
  { id: "roth", label: "Roth IRA", type: "roth", inflow: 25000, outflow: 20000, taxLeakage: 0, color: SANKEY_COLORS.accounts.roth },
  { id: "taxable", label: "Taxable", type: "taxable", inflow: 30000, outflow: 25000, taxLeakage: 3750, color: SANKEY_COLORS.accounts.taxable },
  { id: "hsa", label: "HSA", type: "hsa", inflow: 8000, outflow: 6000, taxLeakage: 0, color: SANKEY_COLORS.accounts.hsa },
];

const DEFAULT_SPENDING: SpendingCategory[] = [
  { id: "housing", label: "Housing", amount: 24000, color: SANKEY_COLORS.spending.housing },
  { id: "healthcare", label: "Healthcare", amount: 12000, color: SANKEY_COLORS.spending.healthcare },
  { id: "lifestyle", label: "Lifestyle", amount: 30000, color: SANKEY_COLORS.spending.lifestyle },
  { id: "travel", label: "Travel", amount: 15000, color: SANKEY_COLORS.spending.travel },
  { id: "legacy", label: "Legacy/Gifts", amount: 5000, color: SANKEY_COLORS.spending.legacy },
];

const DEFAULT_FLOWS: FlowLink[] = [
  // Income to Accounts
  { source: "salary", target: "401k", value: 40000 },
  { source: "salary", target: "roth", value: 15000 },
  { source: "salary", target: "taxable", value: 20000 },
  { source: "salary", target: "hsa", value: 8000 },
  { source: "bonus", target: "401k", value: 10000 },
  { source: "bonus", target: "taxable", value: 5000 },
  { source: "investments", target: "taxable", value: 8000 },
  { source: "social-security", target: "roth", value: 10000 },
  { source: "social-security", target: "taxable", value: 14000 },
  // Accounts to Spending
  { source: "401k", target: "housing", value: 12000 },
  { source: "401k", target: "healthcare", value: 8000 },
  { source: "401k", target: "lifestyle", value: 15000 },
  { source: "roth", target: "healthcare", value: 4000 },
  { source: "roth", target: "travel", value: 10000 },
  { source: "roth", target: "lifestyle", value: 6000 },
  { source: "taxable", target: "housing", value: 12000 },
  { source: "taxable", target: "lifestyle", value: 8000 },
  { source: "taxable", target: "legacy", value: 5000 },
  { source: "hsa", target: "healthcare", value: 6000 },
  { source: "hsa", target: "travel", value: 0 },
  // Tax Leakage
  { source: "401k", target: "tax-leak", value: 7000, isTaxLeakage: true },
  { source: "taxable", target: "tax-leak", value: 3750, isTaxLeakage: true },
];

// ==================== Utility Functions ====================

function generateCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number = 0.5
): string {
  const midX = x1 + (x2 - x1) * curvature;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

function getPointOnPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
  curvature: number = 0.5
): { x: number; y: number } {
  const midX = x1 + (x2 - x1) * curvature;

  // Cubic Bezier calculation
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  const x = mt3 * x1 + 3 * mt2 * t * midX + 3 * mt * t2 * midX + t3 * x2;
  const y = mt3 * y1 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y2;

  return { x, y };
}

// ==================== Component ====================

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  incomeSources = DEFAULT_INCOME_SOURCES,
  accounts = DEFAULT_ACCOUNTS,
  spendingCategories = DEFAULT_SPENDING,
  flows = DEFAULT_FLOWS,
  className,
  animated = true,
  showParticles = true,
  particleCount = 30,
  particleSpeed = 0.008,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredFlow, setHoveredFlow] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    content: React.ReactNode;
  } | null>(null);

  // Calculate responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(width, 600),
          height: Math.max(400, Math.min(600, width * 0.6)),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Layout calculations
  const layout = useMemo(() => {
    const { width, height } = dimensions;
    const padding = { left: 40, right: 40, top: 60, bottom: 40 };
    const nodeWidth = 24;
    const columnGap = (width - padding.left - padding.right - nodeWidth * 3) / 2;

    // Column X positions
    const col1X = padding.left;
    const col2X = padding.left + nodeWidth + columnGap;
    const col3X = width - padding.right - nodeWidth;

    // Calculate node positions
    const nodePositions: Record<string, NodePosition> = {};

    // Income sources (left column)
    const incomeHeight = height - padding.top - padding.bottom;
    const incomeNodeGap = 12;
    const totalIncomeNodeHeight = incomeSources.length * 50 + (incomeSources.length - 1) * incomeNodeGap;
    let incomeY = padding.top + (incomeHeight - totalIncomeNodeHeight) / 2;

    incomeSources.forEach((source) => {
      const nodeHeight = Math.max(30, Math.min(80, source.amount / 2000));
      nodePositions[source.id] = {
        x: col1X,
        y: incomeY,
        width: nodeWidth,
        height: nodeHeight,
      };
      incomeY += nodeHeight + incomeNodeGap;
    });

    // Accounts (middle column)
    const accountNodeGap = 16;
    const totalAccountNodeHeight = accounts.length * 60 + (accounts.length - 1) * accountNodeGap;
    let accountY = padding.top + (incomeHeight - totalAccountNodeHeight) / 2;

    accounts.forEach((account) => {
      const nodeHeight = Math.max(40, Math.min(100, account.inflow / 500));
      nodePositions[account.id] = {
        x: col2X,
        y: accountY,
        width: nodeWidth,
        height: nodeHeight,
      };
      accountY += nodeHeight + accountNodeGap;
    });

    // Add tax leakage node
    nodePositions["tax-leak"] = {
      x: col2X + columnGap / 2,
      y: height - padding.bottom - 50,
      width: nodeWidth,
      height: 40,
    };

    // Spending categories (right column)
    const spendingNodeGap = 12;
    const totalSpendingNodeHeight = spendingCategories.length * 45 + (spendingCategories.length - 1) * spendingNodeGap;
    let spendingY = padding.top + (incomeHeight - totalSpendingNodeHeight) / 2;

    spendingCategories.forEach((category) => {
      const nodeHeight = Math.max(25, Math.min(70, category.amount / 600));
      nodePositions[category.id] = {
        x: col3X,
        y: spendingY,
        width: nodeWidth,
        height: nodeHeight,
      };
      spendingY += nodeHeight + spendingNodeGap;
    });

    return { nodePositions, padding, columnGap, col1X, col2X, col3X };
  }, [dimensions, incomeSources, accounts, spendingCategories]);

  // Calculate flow paths with proper vertical positioning
  const flowPaths = useMemo(() => {
    const { nodePositions } = layout;
    const sourceOffsets: Record<string, number> = {};
    const targetOffsets: Record<string, number> = {};

    return flows
      .filter(flow => flow.value > 0)
      .map((flow, index) => {
        const sourcePos = nodePositions[flow.source];
        const targetPos = nodePositions[flow.target];

        if (!sourcePos || !targetPos) return null;

        // Calculate flow thickness based on value
        const maxFlowValue = Math.max(...flows.map(f => f.value));
        const thickness = Math.max(2, Math.min(20, (flow.value / maxFlowValue) * 20));

        // Track offsets for stacking flows vertically
        if (!sourceOffsets[flow.source]) sourceOffsets[flow.source] = 0;
        if (!targetOffsets[flow.target]) targetOffsets[flow.target] = 0;

        const sourceY = sourcePos.y + sourcePos.height / 2 + sourceOffsets[flow.source];
        const targetY = targetPos.y + targetPos.height / 2 + targetOffsets[flow.target];

        sourceOffsets[flow.source] += thickness * 0.3;
        targetOffsets[flow.target] += thickness * 0.3;

        const path = generateCurvedPath(
          sourcePos.x + sourcePos.width,
          sourceY,
          targetPos.x,
          targetY,
          0.5
        );

        return {
          ...flow,
          path,
          thickness,
          sourcePos: { x: sourcePos.x + sourcePos.width, y: sourceY },
          targetPos: { x: targetPos.x, y: targetY },
          index,
        };
      })
      .filter(Boolean);
  }, [flows, layout]);

  // Initialize and animate particles
  useEffect(() => {
    if (!showParticles || !animated) return;

    // Initialize particles
    const initialParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      initialParticles.push({
        id: i,
        pathIndex: Math.floor(Math.random() * flowPaths.length),
        progress: Math.random(),
        speed: particleSpeed * (0.5 + Math.random() * 0.5),
      });
    }
    setParticles(initialParticles);

    // Animation loop
    const animate = () => {
      setParticles(prev =>
        prev.map(particle => {
          let newProgress = particle.progress + particle.speed;
          let newPathIndex = particle.pathIndex;

          if (newProgress >= 1) {
            newProgress = 0;
            newPathIndex = Math.floor(Math.random() * flowPaths.length);
          }

          return {
            ...particle,
            progress: newProgress,
            pathIndex: newPathIndex,
          };
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showParticles, animated, particleCount, particleSpeed, flowPaths.length]);

  // Get related flows for a node
  const getRelatedFlows = useCallback((nodeId: string) => {
    return flowPaths.filter(
      flow => flow && (flow.source === nodeId || flow.target === nodeId)
    );
  }, [flowPaths]);

  // Check if a flow should be highlighted
  const isFlowHighlighted = useCallback((flow: typeof flowPaths[0]) => {
    if (!flow) return false;
    if (hoveredFlow === flow.index) return true;
    if (hoveredNode) {
      return flow.source === hoveredNode || flow.target === hoveredNode;
    }
    return false;
  }, [hoveredNode, hoveredFlow]);

  // Handle node hover
  const handleNodeHover = useCallback((nodeId: string | null, event?: React.MouseEvent) => {
    setHoveredNode(nodeId);

    if (nodeId && event) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const node =
          incomeSources.find(s => s.id === nodeId) ||
          accounts.find(a => a.id === nodeId) ||
          spendingCategories.find(s => s.id === nodeId);

        if (node) {
          const relatedFlows = getRelatedFlows(nodeId);
          const totalIn = relatedFlows
            .filter(f => f && f.target === nodeId)
            .reduce((sum, f) => sum + (f?.value || 0), 0);
          const totalOut = relatedFlows
            .filter(f => f && f.source === nodeId)
            .reduce((sum, f) => sum + (f?.value || 0), 0);

          setTooltipData({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: (
              <div className="space-y-1.5">
                <div className="font-semibold text-sm">{node.label}</div>
                {"amount" in node && (
                  <div className="text-xs text-muted-foreground">
                    Total: {fmt(node.amount)}
                  </div>
                )}
                {"inflow" in node && (
                  <>
                    <div className="text-xs text-green-400">
                      Inflow: {fmt(node.inflow)}
                    </div>
                    <div className="text-xs text-orange-400">
                      Outflow: {fmt(node.outflow)}
                    </div>
                    {node.taxLeakage > 0 && (
                      <div className="text-xs text-red-400">
                        Tax Leakage: {fmt(node.taxLeakage)}
                      </div>
                    )}
                  </>
                )}
                {totalIn > 0 && (
                  <div className="text-xs text-emerald-400">
                    Total In: {fmt(totalIn)}
                  </div>
                )}
                {totalOut > 0 && (
                  <div className="text-xs text-amber-400">
                    Total Out: {fmt(totalOut)}
                  </div>
                )}
              </div>
            ),
          });
        }
      }
    } else {
      setTooltipData(null);
    }
  }, [incomeSources, accounts, spendingCategories, getRelatedFlows]);

  // Handle flow hover
  const handleFlowHover = useCallback((flow: typeof flowPaths[0] | null, event?: React.MouseEvent) => {
    setHoveredFlow(flow?.index ?? null);

    if (flow && event) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const sourceNode =
          incomeSources.find(s => s.id === flow.source) ||
          accounts.find(a => a.id === flow.source);
        const targetNode =
          accounts.find(a => a.id === flow.target) ||
          spendingCategories.find(s => s.id === flow.target);

        setTooltipData({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: (
            <div className="space-y-1.5">
              <div className="font-semibold text-sm">
                {sourceNode?.label} → {targetNode?.label || "Taxes"}
              </div>
              <div className="text-xs">
                Amount: <span className="text-emerald-400">{fmt(flow.value)}</span>
              </div>
              {flow.isTaxLeakage && (
                <div className="text-xs text-red-400 font-medium">
                  Tax Payment
                </div>
              )}
            </div>
          ),
        });
      }
    } else if (!hoveredNode) {
      setTooltipData(null);
    }
  }, [incomeSources, accounts, spendingCategories, hoveredNode]);

  // Render node
  const renderNode = useCallback((
    id: string,
    label: string,
    color: string,
    position: NodePosition,
    isTaxLeak = false
  ) => {
    const isHovered = hoveredNode === id;
    const isRelated = hoveredNode && getRelatedFlows(hoveredNode).some(
      f => f && (f.source === id || f.target === id)
    );
    const opacity = hoveredNode ? (isHovered || isRelated ? 1 : 0.3) : 1;

    return (
      <g key={id}>
        <motion.rect
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx={4}
          fill={isTaxLeak ? SANKEY_COLORS.taxLeak : color}
          stroke={isHovered ? "hsl(var(--background))" : "transparent"}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
          style={{ cursor: "pointer" }}
          onMouseEnter={(e) => handleNodeHover(id, e)}
          onMouseMove={(e) => handleNodeHover(id, e)}
          onMouseLeave={() => handleNodeHover(null)}
        />
        <motion.text
          x={position.x + position.width / 2}
          y={position.y - 8}
          textAnchor="middle"
          fill="currentColor"
          fontSize={11}
          fontWeight={500}
          className="pointer-events-none select-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {label}
        </motion.text>
      </g>
    );
  }, [hoveredNode, getRelatedFlows, handleNodeHover]);

  // Calculate totals for header
  const totals = useMemo(() => {
    const totalIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);
    const totalTaxLeakage = accounts.reduce((sum, a) => sum + a.taxLeakage, 0);
    const totalSpending = spendingCategories.reduce((sum, s) => sum + s.amount, 0);
    return { totalIncome, totalTaxLeakage, totalSpending };
  }, [incomeSources, accounts, spendingCategories]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        "border border-slate-700/50 shadow-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
        <h3 className="text-lg font-semibold text-white mb-2">
          Financial Flow Visualization
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Income: </span>
            <span className="text-emerald-400 font-medium">{fmt(totals.totalIncome)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Tax Leakage: </span>
            <span className="text-red-400 font-medium">{fmt(totals.totalTaxLeakage)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-400">Spending: </span>
            <span className="text-amber-400 font-medium">{fmt(totals.totalSpending)}</span>
          </div>
        </div>
      </div>

      {/* Column Labels */}
      <div className="absolute top-20 left-0 right-0 flex justify-between px-8 text-xs font-medium text-slate-400 uppercase tracking-wider">
        <span>Income Sources</span>
        <span>Accounts</span>
        <span>Retirement Spending</span>
      </div>

      {/* SVG Diagram */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full"
        style={{ minHeight: 400 }}
      >
        <defs>
          {/* Gradient definitions for flows */}
          {flowPaths.map((flow, idx) => {
            if (!flow) return null;
            const sourceNode =
              incomeSources.find(s => s.id === flow.source) ||
              accounts.find(a => a.id === flow.source);
            const targetNode =
              accounts.find(a => a.id === flow.target) ||
              spendingCategories.find(s => s.id === flow.target);

            return (
              <linearGradient
                key={`gradient-${idx}`}
                id={`flow-gradient-${idx}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor={flow.isTaxLeakage ? SANKEY_COLORS.taxLeak : sourceNode?.color || SANKEY_COLORS.neutral}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={flow.isTaxLeakage ? SANKEY_COLORS.taxLeak : targetNode?.color || SANKEY_COLORS.neutral}
                  stopOpacity={0.8}
                />
              </linearGradient>
            );
          })}

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Particle glow */}
          <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render flow paths */}
        {flowPaths.map((flow, idx) => {
          if (!flow) return null;
          const highlighted = isFlowHighlighted(flow);
          const dimmed = (hoveredNode || hoveredFlow !== null) && !highlighted;

          return (
            <motion.path
              key={`flow-${idx}`}
              d={flow.path}
              fill="none"
              stroke={`url(#flow-gradient-${idx})`}
              strokeWidth={flow.thickness}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: dimmed ? 0.15 : highlighted ? 1 : 0.5,
                strokeWidth: highlighted ? flow.thickness * 1.3 : flow.thickness,
              }}
              transition={{
                pathLength: { duration: 1.5, delay: idx * 0.05 },
                opacity: { duration: 0.3 },
                strokeWidth: { duration: 0.2 },
              }}
              filter={highlighted ? "url(#glow)" : undefined}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => handleFlowHover(flow, e)}
              onMouseMove={(e) => handleFlowHover(flow, e)}
              onMouseLeave={() => handleFlowHover(null)}
            />
          );
        })}

        {/* Render animated particles */}
        {showParticles && animated && particles.map((particle) => {
          const flow = flowPaths[particle.pathIndex];
          if (!flow) return null;

          const point = getPointOnPath(
            flow.sourcePos.x,
            flow.sourcePos.y,
            flow.targetPos.x,
            flow.targetPos.y,
            particle.progress,
            0.5
          );

          const isRelatedToHover = hoveredNode && (
            flow.source === hoveredNode || flow.target === hoveredNode
          );

          if (hoveredNode && !isRelatedToHover) return null;

          return (
            <circle
              key={`particle-${particle.id}`}
              cx={point.x}
              cy={point.y}
              r={flow.isTaxLeakage ? 3 : 2.5}
              fill={flow.isTaxLeakage ? SANKEY_COLORS.taxLeak : "hsl(var(--background))"}
              opacity={flow.isTaxLeakage ? 0.9 : 0.7}
              filter="url(#particle-glow)"
            />
          );
        })}

        {/* Render income source nodes */}
        {incomeSources.map((source) => {
          const pos = layout.nodePositions[source.id];
          if (!pos) return null;
          return renderNode(source.id, source.label, source.color, pos);
        })}

        {/* Render account nodes */}
        {accounts.map((account) => {
          const pos = layout.nodePositions[account.id];
          if (!pos) return null;
          return renderNode(account.id, account.label, account.color, pos);
        })}

        {/* Render tax leakage node */}
        {layout.nodePositions["tax-leak"] && (
          renderNode("tax-leak", "Taxes", SANKEY_COLORS.taxLeak, layout.nodePositions["tax-leak"], true)
        )}

        {/* Render spending category nodes */}
        {spendingCategories.map((category) => {
          const pos = layout.nodePositions[category.id];
          if (!pos) return null;
          return renderNode(category.id, category.label, category.color, pos);
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-600 shadow-xl backdrop-blur-sm"
            style={{
              left: tooltipData.x + 15,
              top: tooltipData.y - 10,
              pointerEvents: "none",
            }}
          >
            {tooltipData.content}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded bg-gradient-to-r from-emerald-500 to-blue-500" />
            <span>Income to Accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded bg-gradient-to-r from-blue-500 to-amber-500" />
            <span>Accounts to Spending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded bg-red-500" />
            <span>Tax Leakage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Money Flow</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SankeyDiagram;

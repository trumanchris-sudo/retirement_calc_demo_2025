/**
 * Visualization Component Exports
 *
 * Advanced data visualization components for financial data.
 * Import from: @/components/visualizations
 */

// --- Radar Chart ---
export {
  RadarChart,
  RadarChartDemo,
  createUserProfile,
  createOptimalProfile,
  OPTIMAL_PROFILE,
  type RadarAxis,
  type RadarScenario,
  type RadarChartProps,
  type UserFinancialData
} from "./RadarChart";

// --- Sankey Diagram ---
export { SankeyDiagram } from "./SankeyDiagram";

// --- Heatmap Calendar ---
export {
  HeatmapCalendar,
  type DailyContribution,
  type HeatmapCalendarProps
} from "./HeatmapCalendar";

// --- Treemap ---
export {
  Treemap,
  generateDemoTreemapData,
  type TreemapNode,
  type TreemapProps,
  type ColorScheme
} from "./Treemap";

// --- Waterfall Chart ---
export {
  WaterfallChart,
  generateTaxBreakdownData,
  generateCashFlowData,
  type WaterfallDataPoint,
  type WaterfallChartProps,
  type WaterfallCategory
} from "./WaterfallChart";

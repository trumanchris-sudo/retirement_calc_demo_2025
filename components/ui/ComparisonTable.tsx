"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
import { useIsMobile } from "./use-mobile"

// ============================================================================
// TYPES
// ============================================================================

export interface ComparisonColumn {
  /** Unique identifier for the column */
  id: string
  /** Display label for the column header */
  label: string
  /** Optional description shown in tooltip */
  description?: string
  /** Whether this column can be sorted */
  sortable?: boolean
  /** Custom width (CSS value) */
  width?: string
  /** Format function for cell values */
  format?: (value: CellValue) => React.ReactNode
  /** Alignment of cell content */
  align?: "left" | "center" | "right"
}

export interface ComparisonRow {
  /** Unique identifier for the row */
  id: string
  /** Display label for the row header (first column) */
  label: string
  /** Optional description shown in tooltip */
  description?: string
  /** Data values keyed by column id */
  values: Record<string, CellValue>
  /** Child rows for expand/collapse */
  children?: ComparisonRow[]
  /** Whether this row is a category/group header */
  isCategory?: boolean
  /** Optional icon for the row */
  icon?: React.ReactNode
}

export type CellValue = string | number | boolean | null | undefined

export type SortDirection = "asc" | "desc" | null

export interface SortState {
  columnId: string | null
  direction: SortDirection
}

export interface ComparisonTableProps {
  /** Column definitions */
  columns: ComparisonColumn[]
  /** Row data */
  rows: ComparisonRow[]
  /** Title for the table */
  title?: string
  /** Description below the title */
  description?: string
  /** Whether to highlight cells with different values across columns */
  highlightDifferences?: boolean
  /** Custom function to determine if values are different */
  differenceChecker?: (values: CellValue[]) => boolean
  /** Initial sort state */
  initialSort?: SortState
  /** Callback when sort changes */
  onSortChange?: (sort: SortState) => void
  /** Initially expanded row IDs */
  initialExpandedRows?: string[]
  /** Callback when expanded rows change */
  onExpandedRowsChange?: (expandedRows: string[]) => void
  /** Whether to show export button */
  showExport?: boolean
  /** Custom export filename (without extension) */
  exportFilename?: string
  /** Additional CSS classes */
  className?: string
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Max height for scrollable table area */
  maxHeight?: string
  /** Whether to use card view on mobile (default: true) */
  mobileCardView?: boolean
}

// ============================================================================
// ICONS
// ============================================================================

const ChevronDown = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ArrowUpDown = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
)

const ArrowUp = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
)

const ArrowDown = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Download = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
)

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Default difference checker - returns true if not all values are equal
 */
function defaultDifferenceChecker(values: CellValue[]): boolean {
  const validValues = values.filter((v) => v !== null && v !== undefined)
  if (validValues.length <= 1) return false

  const firstValue = validValues[0]
  return validValues.some((v) => v !== firstValue)
}

/**
 * Format a cell value for display
 */
function formatCellValue(
  value: CellValue,
  formatter?: (value: CellValue) => React.ReactNode
): React.ReactNode {
  if (formatter) return formatter(value)
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    // Format numbers with commas and limit decimals
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value)
  }
  return String(value)
}

/**
 * Compare values for sorting
 */
function compareValues(a: CellValue, b: CellValue, direction: SortDirection): number {
  if (a === b) return 0
  if (a === null || a === undefined) return direction === "asc" ? 1 : -1
  if (b === null || b === undefined) return direction === "asc" ? -1 : 1

  let comparison = 0
  if (typeof a === "number" && typeof b === "number") {
    comparison = a - b
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    comparison = a === b ? 0 : a ? -1 : 1
  } else {
    comparison = String(a).localeCompare(String(b))
  }

  return direction === "asc" ? comparison : -comparison
}

/**
 * Convert table data to CSV string
 */
function tableToCSV(columns: ComparisonColumn[], rows: ComparisonRow[]): string {
  const headers = ["Feature", ...columns.map((col) => col.label)]
  const csvRows = [headers.join(",")]

  const flattenRows = (rowList: ComparisonRow[], depth = 0): void => {
    rowList.forEach((row) => {
      const indent = "  ".repeat(depth)
      const rowValues = [
        `"${indent}${row.label.replace(/"/g, '""')}"`,
        ...columns.map((col) => {
          const value = row.values[col.id]
          if (value === null || value === undefined) return '"-"'
          if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
          return `"${value}"`
        }),
      ]
      csvRows.push(rowValues.join(","))

      if (row.children) {
        flattenRows(row.children, depth + 1)
      }
    })
  }

  flattenRows(rows)
  return csvRows.join("\n")
}

/**
 * Download a string as a file
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface SortButtonProps {
  column: ComparisonColumn
  sortState: SortState
  onSort: (columnId: string) => void
}

function SortButton({ column, sortState, onSort }: SortButtonProps) {
  if (!column.sortable) return null

  const isActive = sortState.columnId === column.id
  const direction = sortState.direction

  return (
    <button
      onClick={() => onSort(column.id)}
      className={cn(
        "ml-1 p-0.5 rounded hover:bg-muted/50 transition-colors inline-flex items-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={`Sort by ${column.label}`}
    >
      {!isActive && <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
      {isActive && direction === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
      {isActive && direction === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
    </button>
  )
}

interface ExpandButtonProps {
  isExpanded: boolean
  onClick: () => void
  hasChildren: boolean
}

function ExpandButton({ isExpanded, onClick, hasChildren }: ExpandButtonProps) {
  if (!hasChildren) {
    return <span className="w-5 inline-block" aria-hidden="true" />
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-0.5 rounded hover:bg-muted/50 transition-all inline-flex items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse row" : "Expand row"}
    >
      <span
        className={cn(
          "transition-transform duration-200",
          isExpanded ? "rotate-0" : "-rotate-90"
        )}
      >
        <ChevronDown className="h-4 w-4" />
      </span>
    </button>
  )
}

interface DifferenceBadgeProps {
  hasDifference: boolean
}

function DifferenceBadge({ hasDifference }: DifferenceBadgeProps) {
  if (!hasDifference) return null

  return (
    <Badge
      variant="outline"
      className="ml-2 px-1.5 py-0 text-[10px] font-medium border-amber-500/50 text-amber-600 dark:text-amber-400"
    >
      DIFF
    </Badge>
  )
}

// ============================================================================
// MOBILE CARD VIEW
// ============================================================================

interface MobileCardViewProps {
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
  expandedRows: Set<string>
  toggleRow: (rowId: string) => void
  highlightDifferences: boolean
  differenceChecker: (values: CellValue[]) => boolean
}

function MobileCardView({
  columns,
  rows,
  expandedRows,
  toggleRow,
  highlightDifferences,
  differenceChecker,
}: MobileCardViewProps) {
  const renderRow = (row: ComparisonRow, depth = 0) => {
    const isExpanded = expandedRows.has(row.id)
    const hasChildren = !!(row.children && row.children.length > 0)
    const values = columns.map((col) => row.values[col.id])
    const hasDifference = highlightDifferences && differenceChecker(values)

    return (
      <React.Fragment key={row.id}>
        <Card
          className={cn(
            "mb-3 transition-all",
            depth > 0 && "ml-4 border-l-4 border-l-muted",
            row.isCategory && "bg-muted/30",
            hasDifference && "ring-1 ring-amber-500/30"
          )}
        >
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <ExpandButton
                    isExpanded={isExpanded}
                    onClick={() => toggleRow(row.id)}
                    hasChildren={hasChildren}
                  />
                )}
                {row.icon && <span className="flex-shrink-0">{row.icon}</span>}
                <CardTitle className="text-sm font-medium">
                  {row.label}
                  {hasDifference && <DifferenceBadge hasDifference />}
                </CardTitle>
              </div>
            </div>
            {row.description && (
              <p className="text-xs text-muted-foreground mt-1">{row.description}</p>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col) => {
                const value = row.values[col.id]
                return (
                  <div key={col.id} className="space-y-0.5">
                    <dt className="text-xs text-muted-foreground truncate">
                      {col.label}
                    </dt>
                    <dd
                      className={cn(
                        "text-sm font-medium",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {formatCellValue(value, col.format)}
                    </dd>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {row.children!.map((child) => renderRow(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    )
  }

  return <div className="space-y-2">{rows.map((row) => renderRow(row))}</div>
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComparisonTable({
  columns,
  rows,
  title,
  description,
  highlightDifferences = true,
  differenceChecker = defaultDifferenceChecker,
  initialSort = { columnId: null, direction: null },
  onSortChange,
  initialExpandedRows = [],
  onExpandedRowsChange,
  showExport = true,
  exportFilename = "comparison-export",
  className,
  ariaLabel = "Comparison table",
  maxHeight = "600px",
  mobileCardView = true,
}: ComparisonTableProps) {
  const isMobile = useIsMobile()
  const tableRef = React.useRef<HTMLDivElement>(null)

  // State
  const [sortState, setSortState] = React.useState<SortState>(initialSort)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set(initialExpandedRows)
  )

  // Handlers
  const handleSort = React.useCallback(
    (columnId: string) => {
      setSortState((prev) => {
        let newDirection: SortDirection = "asc"
        if (prev.columnId === columnId) {
          if (prev.direction === "asc") newDirection = "desc"
          else if (prev.direction === "desc") newDirection = null
        }

        const newState = {
          columnId: newDirection ? columnId : null,
          direction: newDirection,
        }
        onSortChange?.(newState)
        return newState
      })
    },
    [onSortChange]
  )

  const toggleRow = React.useCallback(
    (rowId: string) => {
      setExpandedRows((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(rowId)) {
          newSet.delete(rowId)
        } else {
          newSet.add(rowId)
        }
        onExpandedRowsChange?.(Array.from(newSet))
        return newSet
      })
    },
    [onExpandedRowsChange]
  )

  const expandAll = React.useCallback(() => {
    const allRowIds: string[] = []
    const collectIds = (rowList: ComparisonRow[]) => {
      rowList.forEach((row) => {
        if (row.children && row.children.length > 0) {
          allRowIds.push(row.id)
          collectIds(row.children)
        }
      })
    }
    collectIds(rows)
    const newSet = new Set(allRowIds)
    setExpandedRows(newSet)
    onExpandedRowsChange?.(allRowIds)
  }, [rows, onExpandedRowsChange])

  const collapseAll = React.useCallback(() => {
    setExpandedRows(new Set())
    onExpandedRowsChange?.([])
  }, [onExpandedRowsChange])

  const handleExport = React.useCallback(() => {
    const csv = tableToCSV(columns, rows)
    downloadCSV(csv, exportFilename)
  }, [columns, rows, exportFilename])

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (!sortState.columnId || !sortState.direction) return rows

    const sortRows = (rowList: ComparisonRow[]): ComparisonRow[] => {
      const sorted = [...rowList].sort((a, b) => {
        const aValue = a.values[sortState.columnId!]
        const bValue = b.values[sortState.columnId!]
        return compareValues(aValue, bValue, sortState.direction)
      })

      return sorted.map((row) => ({
        ...row,
        children: row.children ? sortRows(row.children) : undefined,
      }))
    }

    return sortRows(rows)
  }, [rows, sortState])

  // Check if any rows have children
  const hasExpandableRows = React.useMemo(() => {
    const check = (rowList: ComparisonRow[]): boolean => {
      return rowList.some(
        (row) => (row.children && row.children.length > 0) || (row.children && check(row.children))
      )
    }
    return check(rows)
  }, [rows])

  // Render table row recursively
  const renderTableRow = (row: ComparisonRow, depth = 0): React.ReactNode => {
    const isExpanded = expandedRows.has(row.id)
    const hasChildren = !!(row.children && row.children.length > 0)
    const values = columns.map((col) => row.values[col.id])
    const hasDifference = highlightDifferences && differenceChecker(values)

    return (
      <React.Fragment key={row.id}>
        <tr
          className={cn(
            "border-b transition-colors hover:bg-muted/50",
            row.isCategory && "bg-muted/30 font-medium",
            hasDifference && "bg-amber-50/50 dark:bg-amber-950/20"
          )}
        >
          {/* Sticky first column - row label */}
          <td
            className={cn(
              "sticky left-0 z-10 bg-inherit p-2 sm:p-3",
              "border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
              "min-w-[160px] sm:min-w-[200px]"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex items-center gap-1.5">
              <ExpandButton
                isExpanded={isExpanded}
                onClick={() => toggleRow(row.id)}
                hasChildren={hasChildren}
              />
              {row.icon && <span className="flex-shrink-0">{row.icon}</span>}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate cursor-default">
                      {row.label}
                      {hasDifference && <DifferenceBadge hasDifference />}
                    </span>
                  </TooltipTrigger>
                  {row.description && (
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{row.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </td>

          {/* Data columns */}
          {columns.map((col) => {
            const value = row.values[col.id]
            const otherValues = columns
              .filter((c) => c.id !== col.id)
              .map((c) => row.values[c.id])
            const isDifferent =
              highlightDifferences &&
              differenceChecker([value, ...otherValues])

            return (
              <td
                key={col.id}
                className={cn(
                  "p-2 sm:p-3 whitespace-nowrap",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  isDifferent && "font-medium"
                )}
                style={{ width: col.width }}
              >
                {formatCellValue(value, col.format)}
              </td>
            )
          })}
        </tr>

        {/* Render children if expanded */}
        {hasChildren &&
          isExpanded &&
          row.children!.map((child) => renderTableRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  // Mobile card view
  if (isMobile && mobileCardView) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        {(title || showExport) && (
          <div className="flex items-center justify-between gap-4">
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasExpandableRows && (
                <>
                  <Button variant="ghost" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll}>
                    Collapse
                  </Button>
                </>
              )}
              {showExport && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Cards */}
        <MobileCardView
          columns={columns}
          rows={sortedRows}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          highlightDifferences={highlightDifferences}
          differenceChecker={differenceChecker}
        />
      </div>
    )
  }

  // Desktop table view
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      {(title || showExport) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasExpandableRows && (
              <>
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              </>
            )}
            {showExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {highlightDifferences && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700" />
            <span>Rows with differences</span>
          </div>
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-medium border-amber-500/50 text-amber-600 dark:text-amber-400"
          >
            DIFF
          </Badge>
          <span>indicates values differ across columns</span>
        </div>
      )}

      {/* Table container with sticky positioning */}
      <div
        ref={tableRef}
        className="relative border rounded-lg overflow-hidden"
        style={{ maxHeight }}
      >
        <div className="overflow-auto" style={{ maxHeight }}>
          <table
            className="w-full border-collapse text-sm"
            aria-label={ariaLabel}
          >
            {/* Sticky header */}
            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
              <tr>
                {/* Sticky first column header */}
                <th
                  className={cn(
                    "sticky left-0 z-30 bg-muted/95 backdrop-blur-sm",
                    "p-2 sm:p-3 text-left font-medium text-muted-foreground",
                    "border-b border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                    "min-w-[160px] sm:min-w-[200px]"
                  )}
                >
                  Feature
                </th>

                {/* Data column headers */}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      "p-2 sm:p-3 font-medium text-muted-foreground border-b whitespace-nowrap",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      !col.align && "text-left"
                    )}
                    style={{ width: col.width }}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center cursor-default">
                            {col.label}
                            <SortButton
                              column={col}
                              sortState={sortState}
                              onSort={handleSort}
                            />
                          </span>
                        </TooltipTrigger>
                        {col.description && (
                          <TooltipContent>
                            <p>{col.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table body */}
            <tbody>
              {sortedRows.map((row) => renderTableRow(row))}
            </tbody>
          </table>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No data to compare
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Pre-configured column for displaying currency values
 */
export function currencyColumn(
  id: string,
  label: string,
  options?: Partial<ComparisonColumn>
): ComparisonColumn {
  return {
    id,
    label,
    sortable: true,
    align: "right",
    format: (value) => {
      if (value === null || value === undefined) return "-"
      if (typeof value !== "number") return String(value)
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    },
    ...options,
  }
}

/**
 * Pre-configured column for displaying percentage values
 */
export function percentColumn(
  id: string,
  label: string,
  options?: Partial<ComparisonColumn>
): ComparisonColumn {
  return {
    id,
    label,
    sortable: true,
    align: "right",
    format: (value) => {
      if (value === null || value === undefined) return "-"
      if (typeof value !== "number") return String(value)
      return `${(value * 100).toFixed(1)}%`
    },
    ...options,
  }
}

/**
 * Pre-configured column for yes/no boolean values
 */
export function booleanColumn(
  id: string,
  label: string,
  options?: Partial<ComparisonColumn>
): ComparisonColumn {
  return {
    id,
    label,
    sortable: true,
    align: "center",
    format: (value) => {
      if (value === null || value === undefined) return "-"
      if (typeof value !== "boolean") return String(value)
      return value ? (
        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
      ) : (
        <span className="text-muted-foreground">No</span>
      )
    },
    ...options,
  }
}

// ============================================================================
// EXAMPLE USAGE DATA
// ============================================================================

export const exampleScenarioComparison = {
  columns: [
    { id: "conservative", label: "Conservative", sortable: true },
    { id: "moderate", label: "Moderate", sortable: true },
    { id: "aggressive", label: "Aggressive", sortable: true },
  ] as ComparisonColumn[],
  rows: [
    {
      id: "success-rate",
      label: "Success Rate",
      description: "Probability of not running out of money",
      values: { conservative: "85%", moderate: "92%", aggressive: "78%" },
    },
    {
      id: "portfolio-allocation",
      label: "Portfolio Allocation",
      isCategory: true,
      values: { conservative: "", moderate: "", aggressive: "" },
      children: [
        {
          id: "stocks",
          label: "Stocks",
          values: { conservative: "40%", moderate: "60%", aggressive: "80%" },
        },
        {
          id: "bonds",
          label: "Bonds",
          values: { conservative: "50%", moderate: "35%", aggressive: "15%" },
        },
        {
          id: "cash",
          label: "Cash",
          values: { conservative: "10%", moderate: "5%", aggressive: "5%" },
        },
      ],
    },
    {
      id: "estimated-balance",
      label: "Estimated Balance at 85",
      values: { conservative: "$1.2M", moderate: "$1.8M", aggressive: "$2.5M" },
    },
  ] as ComparisonRow[],
}

export default ComparisonTable

"use client";

import { useCallback, useRef, useEffect } from "react";

/**
 * Keyboard Navigation Hook
 *
 * Provides keyboard navigation support for lists, grids, and composite widgets.
 * Implements WAI-ARIA keyboard interaction patterns.
 *
 * Usage:
 * ```tsx
 * const { handleKeyDown, setFocusedIndex } = useKeyboardNavigation({
 *   itemCount: items.length,
 *   onSelect: (index) => console.log(`Selected item ${index}`),
 * });
 *
 * return (
 *   <ul role="listbox" onKeyDown={handleKeyDown}>
 *     {items.map((item, index) => (
 *       <li
 *         key={item.id}
 *         role="option"
 *         tabIndex={index === focusedIndex ? 0 : -1}
 *       >
 *         {item.name}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */

export interface UseKeyboardNavigationOptions {
  /** Total number of items */
  itemCount: number;
  /** Callback when an item is selected (Enter/Space) */
  onSelect?: (index: number) => void;
  /** Callback when focused index changes */
  onFocusChange?: (index: number) => void;
  /** Initial focused index */
  initialIndex?: number;
  /** Navigation orientation: horizontal uses Left/Right, vertical uses Up/Down */
  orientation?: "horizontal" | "vertical" | "both";
  /** Whether to wrap around at the ends */
  wrap?: boolean;
  /** Whether to select on focus change (roving tabindex) */
  selectOnFocus?: boolean;
  /** Ref map for focusing DOM elements */
  itemRefs?: React.MutableRefObject<Map<number, HTMLElement>>;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onFocusChange,
  initialIndex = 0,
  orientation = "both",
  wrap = true,
  selectOnFocus = false,
  itemRefs,
}: UseKeyboardNavigationOptions) {
  const focusedIndexRef = useRef(initialIndex);

  // Focus the element at the given index
  const focusItem = useCallback((index: number) => {
    if (itemRefs?.current) {
      const element = itemRefs.current.get(index);
      element?.focus();
    }
    focusedIndexRef.current = index;
    onFocusChange?.(index);
    if (selectOnFocus) {
      onSelect?.(index);
    }
  }, [itemRefs, onFocusChange, onSelect, selectOnFocus]);

  // Navigate to previous item
  const goToPrevious = useCallback(() => {
    const currentIndex = focusedIndexRef.current;
    let newIndex: number;

    if (currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (wrap) {
      newIndex = itemCount - 1;
    } else {
      return; // At start, no wrap
    }

    focusItem(newIndex);
  }, [itemCount, wrap, focusItem]);

  // Navigate to next item
  const goToNext = useCallback(() => {
    const currentIndex = focusedIndexRef.current;
    let newIndex: number;

    if (currentIndex < itemCount - 1) {
      newIndex = currentIndex + 1;
    } else if (wrap) {
      newIndex = 0;
    } else {
      return; // At end, no wrap
    }

    focusItem(newIndex);
  }, [itemCount, wrap, focusItem]);

  // Navigate to first item
  const goToFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  // Navigate to last item
  const goToLast = useCallback(() => {
    focusItem(itemCount - 1);
  }, [itemCount, focusItem]);

  // Select current item
  const selectCurrent = useCallback(() => {
    onSelect?.(focusedIndexRef.current);
  }, [onSelect]);

  // Set focused index programmatically
  const setFocusedIndex = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      focusItem(index);
    }
  }, [itemCount, focusItem]);

  // Main keyboard handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key } = event;

    // Determine if we should handle this key based on orientation
    const isHorizontalKey = key === "ArrowLeft" || key === "ArrowRight";
    const isVerticalKey = key === "ArrowUp" || key === "ArrowDown";

    const shouldHandle =
      orientation === "both" ||
      (orientation === "horizontal" && isHorizontalKey) ||
      (orientation === "vertical" && isVerticalKey) ||
      key === "Home" ||
      key === "End" ||
      key === "Enter" ||
      key === " ";

    if (!shouldHandle) return;

    switch (key) {
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        goToPrevious();
        break;
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        goToNext();
        break;
      case "Home":
        event.preventDefault();
        goToFirst();
        break;
      case "End":
        event.preventDefault();
        goToLast();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectCurrent();
        break;
    }
  }, [orientation, goToPrevious, goToNext, goToFirst, goToLast, selectCurrent]);

  // Get tabIndex for an item (for roving tabindex pattern)
  const getTabIndex = useCallback((index: number): 0 | -1 => {
    return index === focusedIndexRef.current ? 0 : -1;
  }, []);

  return {
    handleKeyDown,
    setFocusedIndex,
    getFocusedIndex: () => focusedIndexRef.current,
    getTabIndex,
    goToPrevious,
    goToNext,
    goToFirst,
    goToLast,
    selectCurrent,
  };
}

/**
 * Type-ahead search for listboxes and menus
 * Allows users to type to jump to items starting with those characters
 */
export function useTypeAhead({
  items,
  getItemLabel,
  onMatch,
  timeout = 500,
}: {
  items: unknown[];
  getItemLabel: (item: unknown, index: number) => string;
  onMatch: (index: number) => void;
  timeout?: number;
}) {
  const searchStringRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const char = event.key;

    // Only handle printable characters
    if (char.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    event.preventDefault();

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Add character to search string
    searchStringRef.current += char.toLowerCase();

    // Find matching item
    const searchString = searchStringRef.current;
    const matchIndex = items.findIndex((item, index) => {
      const label = getItemLabel(item, index).toLowerCase();
      return label.startsWith(searchString);
    });

    if (matchIndex !== -1) {
      onMatch(matchIndex);
    }

    // Clear search string after timeout
    timeoutRef.current = setTimeout(() => {
      searchStringRef.current = "";
    }, timeout);
  }, [items, getItemLabel, onMatch, timeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleKeyDown };
}

/**
 * Grid navigation hook for 2D keyboard navigation
 */
export function useGridNavigation({
  rows,
  columns,
  onSelect,
  onFocusChange,
  wrap = true,
}: {
  rows: number;
  columns: number;
  onSelect?: (row: number, col: number) => void;
  onFocusChange?: (row: number, col: number) => void;
  wrap?: boolean;
}) {
  const positionRef = useRef({ row: 0, col: 0 });

  const moveTo = useCallback((row: number, col: number) => {
    positionRef.current = { row, col };
    onFocusChange?.(row, col);
  }, [onFocusChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { row, col } = positionRef.current;
    let newRow = row;
    let newCol = col;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (row > 0) {
          newRow = row - 1;
        } else if (wrap) {
          newRow = rows - 1;
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (row < rows - 1) {
          newRow = row + 1;
        } else if (wrap) {
          newRow = 0;
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (col > 0) {
          newCol = col - 1;
        } else if (wrap) {
          newCol = columns - 1;
        }
        break;
      case "ArrowRight":
        event.preventDefault();
        if (col < columns - 1) {
          newCol = col + 1;
        } else if (wrap) {
          newCol = 0;
        }
        break;
      case "Home":
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = 0;
        }
        newCol = 0;
        break;
      case "End":
        event.preventDefault();
        if (event.ctrlKey) {
          newRow = rows - 1;
        }
        newCol = columns - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect?.(row, col);
        return;
      default:
        return;
    }

    moveTo(newRow, newCol);
  }, [rows, columns, wrap, moveTo, onSelect]);

  return {
    handleKeyDown,
    getPosition: () => positionRef.current,
    setPosition: moveTo,
    getTabIndex: (row: number, col: number) =>
      row === positionRef.current.row && col === positionRef.current.col ? 0 : -1,
  };
}

export default useKeyboardNavigation;

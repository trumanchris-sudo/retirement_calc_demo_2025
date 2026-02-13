"use client"

// Enhanced toast hook with premium features
// Inspired by react-hot-toast library
import * as React from "react"
import type { LucideIcon } from "lucide-react"

import type {
  ToastActionElement,
  ToastPosition,
  ToastVariant,
  ToastAction as ToastActionType,
} from "@/components/ui/toast"

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 300 // Animation duration before removal

// ============================================================================
// TYPES
// ============================================================================

export type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  /** Toast variant for styling */
  variant?: ToastVariant
  /** Custom icon (Lucide icon or React element) */
  icon?: LucideIcon | React.ReactNode
  /** Whether to show the default variant icon */
  showIcon?: boolean
  /** Auto-dismiss duration in ms (0 = persistent) */
  duration?: number
  /** Mark as persistent (won't auto-dismiss) */
  persistent?: boolean
  /** Show progress bar */
  showProgress?: boolean
  /** Action buttons */
  actions?: ToastActionType[]
  /** Position override for this specific toast */
  position?: ToastPosition
  /** Open state */
  open?: boolean
  /** Callback when open state changes (used for auto-dismiss) */
  onOpenChange?: (open: boolean) => void
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Callback when an action is clicked */
  onAction?: (actionIndex: number) => void
  /** Custom className */
  className?: string
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// ============================================================================
// TOAST FUNCTION
// ============================================================================

type ToastInput = Omit<ToasterToast, "id">

interface ToastReturn {
  id: string
  dismiss: () => void
  update: (props: Partial<ToasterToast>) => void
}

function toast(props: ToastInput): ToastReturn {
  const id = genId()

  const update = (updateProps: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...updateProps, id },
    })

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return { id, dismiss, update }
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Show a success toast
 */
toast.success = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "variant">
): ToastReturn => {
  return toast({ title, variant: "success", ...options })
}

/**
 * Show an error/destructive toast
 */
toast.error = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "variant">
): ToastReturn => {
  return toast({ title, variant: "destructive", ...options })
}

/**
 * Show a warning toast
 */
toast.warning = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "variant">
): ToastReturn => {
  return toast({ title, variant: "warning", ...options })
}

/**
 * Show an info toast
 */
toast.info = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "variant">
): ToastReturn => {
  return toast({ title, variant: "info", ...options })
}

/**
 * Show a loading toast (persistent by default)
 */
toast.loading = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "variant">
): ToastReturn => {
  return toast({
    title,
    variant: "loading",
    persistent: true,
    showProgress: false,
    ...options,
  })
}

/**
 * Show a persistent/critical toast that won't auto-dismiss
 */
toast.persistent = (
  title: React.ReactNode,
  options?: Omit<ToastInput, "title" | "persistent">
): ToastReturn => {
  return toast({ title, persistent: true, showProgress: false, ...options })
}

/**
 * Show a toast with action buttons
 */
toast.action = (
  title: React.ReactNode,
  actions: ToastActionType[],
  options?: Omit<ToastInput, "title" | "actions">
): ToastReturn => {
  return toast({ title, actions, ...options })
}

/**
 * Promise-based toast that updates based on promise state
 */
toast.promise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: React.ReactNode
    success: React.ReactNode | ((data: T) => React.ReactNode)
    error: React.ReactNode | ((err: unknown) => React.ReactNode)
  },
  options?: Omit<ToastInput, "title" | "variant">
): Promise<T> => {
  const { id, update } = toast.loading(messages.loading, options)

  promise
    .then((data) => {
      const successMessage =
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success

      update({
        title: successMessage,
        variant: "success",
        persistent: false,
        showProgress: true,
        duration: 3000,
      })
    })
    .catch((err) => {
      const errorMessage =
        typeof messages.error === "function" ? messages.error(err) : messages.error

      update({
        title: errorMessage,
        variant: "destructive",
        persistent: false,
        showProgress: true,
        duration: 5000,
      })
    })

  return promise
}

/**
 * Dismiss a specific toast or all toasts
 */
toast.dismiss = (toastId?: string) => {
  dispatch({ type: "DISMISS_TOAST", toastId })
}

/**
 * Remove a toast immediately (no animation)
 */
toast.remove = (toastId?: string) => {
  dispatch({ type: "REMOVE_TOAST", toastId })
}

// ============================================================================
// HOOK
// ============================================================================

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

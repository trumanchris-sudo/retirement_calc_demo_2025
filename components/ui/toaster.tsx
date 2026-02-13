"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastConfig,
  type ToastPosition,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

interface ToasterProps {
  /** Global toast configuration */
  config?: ToastConfig
  /** Default position for all toasts */
  position?: ToastPosition
}

export function Toaster({ config, position }: ToasterProps) {
  const { toasts } = useToast()

  // Merge position into config if provided
  const mergedConfig: ToastConfig = {
    ...config,
    ...(position && { position }),
  }

  return (
    <ToastProvider config={mergedConfig}>
      {toasts.map(
        ({
          id,
          title,
          description,
          action,
          variant,
          icon,
          showIcon,
          duration,
          persistent,
          showProgress,
          actions,
          onDismiss,
          className,
          ...props
        }) => (
          <Toast
            key={id}
            variant={variant}
            icon={icon}
            showIcon={showIcon}
            duration={duration}
            persistent={persistent}
            showProgress={showProgress}
            actions={actions}
            onDismiss={onDismiss}
            className={className}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      )}
      <ToastViewport />
    </ToastProvider>
  )
}

// ============================================================================
// MULTI-POSITION TOASTER
// ============================================================================

/**
 * A Toaster that renders viewports at multiple positions.
 * Toasts are automatically routed to their specified position.
 */
interface MultiPositionToasterProps {
  /** Global toast configuration */
  config?: Omit<ToastConfig, "position">
  /** Positions to render viewports for */
  positions?: ToastPosition[]
}

export function MultiPositionToaster({
  config,
  positions = ["bottom-right", "top-right", "top-center"],
}: MultiPositionToasterProps) {
  const { toasts } = useToast()

  // Group toasts by position
  const toastsByPosition = positions.reduce(
    (acc, pos) => {
      acc[pos] = toasts.filter((t) => (t.position || "bottom-right") === pos)
      return acc
    },
    {} as Record<ToastPosition, typeof toasts>
  )

  return (
    <ToastProvider config={config}>
      {positions.map((position) => (
        <div key={position}>
          {toastsByPosition[position]?.map(
            ({
              id,
              title,
              description,
              action,
              variant,
              icon,
              showIcon,
              duration,
              persistent,
              showProgress,
              actions,
              onDismiss,
              className,
              ...props
            }) => (
              <Toast
                key={id}
                variant={variant}
                icon={icon}
                showIcon={showIcon}
                duration={duration}
                persistent={persistent}
                showProgress={showProgress}
                actions={actions}
                onDismiss={onDismiss}
                className={className}
                {...props}
              >
                <div className="grid gap-1">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action}
                <ToastClose />
              </Toast>
            )
          )}
          <ToastViewport position={position} />
        </div>
      ))}
    </ToastProvider>
  )
}

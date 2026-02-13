"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Settings,
  Calendar,
  TrendingUp,
  Target,
  AlertTriangle,
  ChevronRight,
  Mail,
  Smartphone,
  Clock,
  Trash2,
  RotateCcw,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type NotificationType =
  | "tax_deadline"
  | "rebalancing"
  | "goal_achieved"
  | "market_alert";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationAction {
  id: string;
  label: string;
  variant?: "default" | "primary" | "destructive";
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: NotificationPriority;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
  groupId?: string;
}

export interface NotificationGroup {
  id: string;
  type: NotificationType;
  title: string;
  notifications: Notification[];
  latestTimestamp: Date;
}

export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  emailDigest: "none" | "daily" | "weekly" | "monthly";
  types: {
    tax_deadline: boolean;
    rebalancing: boolean;
    goal_achieved: boolean;
    market_alert: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
  };
}

interface NotificationCenterProps {
  notifications?: Notification[];
  preferences?: NotificationPreferences;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  onPreferencesChange?: (preferences: NotificationPreferences) => void;
  onPushNotificationSetup?: () => Promise<boolean>;
  className?: string;
}

// ============================================================================
// Default Data
// ============================================================================

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  pushEnabled: false,
  emailDigest: "weekly",
  types: {
    tax_deadline: true,
    rebalancing: true,
    goal_achieved: true,
    market_alert: true,
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

const sampleNotifications: Notification[] = [
  {
    id: "1",
    type: "tax_deadline",
    title: "Tax Filing Deadline Approaching",
    message:
      "Your estimated tax payment for Q1 2025 is due on April 15th. Consider making your payment soon to avoid penalties.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    priority: "urgent",
    actions: [
      { id: "view", label: "View Details", onClick: () => {} },
      { id: "remind", label: "Remind Later", variant: "default", onClick: () => {} },
    ],
    groupId: "tax",
  },
  {
    id: "2",
    type: "tax_deadline",
    title: "IRA Contribution Deadline",
    message:
      "You have until April 15th to make IRA contributions for the 2024 tax year. You can contribute up to $7,000.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    priority: "high",
    actions: [
      { id: "contribute", label: "Make Contribution", variant: "primary", onClick: () => {} },
    ],
    groupId: "tax",
  },
  {
    id: "3",
    type: "rebalancing",
    title: "Portfolio Rebalancing Recommended",
    message:
      "Your stock allocation has drifted 5% above your target. Consider rebalancing to maintain your risk profile.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: false,
    priority: "medium",
    actions: [
      { id: "rebalance", label: "Review Portfolio", variant: "primary", onClick: () => {} },
      { id: "dismiss", label: "Dismiss", onClick: () => {} },
    ],
    groupId: "rebalancing",
  },
  {
    id: "4",
    type: "goal_achieved",
    title: "Milestone Reached!",
    message:
      "Congratulations! You've reached your $100,000 emergency fund goal. Great work on your financial journey!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    read: true,
    priority: "low",
    actions: [
      { id: "celebrate", label: "View Achievement", variant: "primary", onClick: () => {} },
      { id: "next", label: "Set New Goal", onClick: () => {} },
    ],
    groupId: "goals",
  },
  {
    id: "5",
    type: "market_alert",
    title: "Market Volatility Alert",
    message:
      "The S&P 500 has dropped 3% today. This may be a good time to review your investment strategy.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
    priority: "medium",
    actions: [
      { id: "analyze", label: "View Analysis", onClick: () => {} },
    ],
    groupId: "market",
  },
  {
    id: "6",
    type: "market_alert",
    title: "Interest Rate Update",
    message:
      "The Federal Reserve has announced a 0.25% rate cut. This may affect your bond portfolio and mortgage rates.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    read: false,
    priority: "medium",
    groupId: "market",
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

const getNotificationIcon = (type: NotificationType) => {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "tax_deadline":
      return <Calendar className={cn(iconClass, "text-orange-500")} />;
    case "rebalancing":
      return <TrendingUp className={cn(iconClass, "text-blue-500")} />;
    case "goal_achieved":
      return <Target className={cn(iconClass, "text-green-500")} />;
    case "market_alert":
      return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
  }
};

const getTypeLabel = (type: NotificationType): string => {
  const labels: Record<NotificationType, string> = {
    tax_deadline: "Tax Deadlines",
    rebalancing: "Rebalancing",
    goal_achieved: "Goals Achieved",
    market_alert: "Market Alerts",
  };
  return labels[type];
};

const getTypeDescription = (type: NotificationType): string => {
  const descriptions: Record<NotificationType, string> = {
    tax_deadline: "Important tax filing and contribution deadlines",
    rebalancing: "Portfolio drift and rebalancing recommendations",
    goal_achieved: "Milestone celebrations and goal completions",
    market_alert: "Market volatility and economic updates",
  };
  return descriptions[type];
};

const getPriorityColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
  }
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const groupNotifications = (
  notifications: Notification[]
): NotificationGroup[] => {
  const groups = new Map<string, NotificationGroup>();

  notifications.forEach((notification) => {
    const groupKey = notification.groupId || notification.id;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.notifications.push(notification);
      if (notification.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = notification.timestamp;
      }
    } else {
      groups.set(groupKey, {
        id: groupKey,
        type: notification.type,
        title: getTypeLabel(notification.type),
        notifications: [notification],
        latestTimestamp: notification.timestamp,
      });
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime()
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-3 rounded-lg transition-all duration-200",
        "hover:bg-accent/50",
        !notification.read && "bg-accent/30",
        compact && "p-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Priority indicator */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-opacity",
          getPriorityColor(notification.priority),
          notification.read && "opacity-40"
        )}
      />

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 mt-0.5",
          notification.read && "opacity-60"
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "text-sm font-medium leading-tight",
              notification.read && "text-muted-foreground"
            )}
          >
            {notification.title}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>

        <p
          className={cn(
            "text-xs text-muted-foreground mt-1 line-clamp-2",
            compact && "line-clamp-1"
          )}
        >
          {notification.message}
        </p>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && !compact && (
          <div className="flex gap-2 mt-2">
            {notification.actions.map((action) => (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                  action.variant === "primary" &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                  action.variant === "destructive" &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  (!action.variant || action.variant === "default") &&
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions on hover */}
      <div
        className={cn(
          "absolute right-2 top-2 flex gap-1 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="p-1 rounded hover:bg-accent"
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1 rounded hover:bg-destructive/10"
          title="Delete"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

interface NotificationGroupItemProps {
  group: NotificationGroup;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  defaultExpanded?: boolean;
}

function NotificationGroupItem({
  group,
  onMarkAsRead,
  onDelete,
  defaultExpanded = false,
}: NotificationGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const unreadCount = group.notifications.filter((n) => !n.read).length;

  // If only one notification in group, render it directly
  if (group.notifications.length === 1) {
    return (
      <NotificationItem
        notification={group.notifications[0]}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors",
          unreadCount > 0 && "bg-accent/30"
        )}
      >
        <div className="flex-shrink-0">
          {getNotificationIcon(group.type)}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{group.title}</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {group.notifications.length} notifications
          </p>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-background/50">
          {group.notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PreferencesPanelProps {
  preferences: NotificationPreferences;
  onChange: (preferences: NotificationPreferences) => void;
  onPushSetup?: () => Promise<boolean>;
  onBack: () => void;
}

function PreferencesPanel({
  preferences,
  onChange,
  onPushSetup,
  onBack,
}: PreferencesPanelProps) {
  const [isPushLoading, setIsPushLoading] = useState(false);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && onPushSetup) {
      setIsPushLoading(true);
      try {
        const success = await onPushSetup();
        onChange({ ...preferences, pushEnabled: success });
      } catch {
        onChange({ ...preferences, pushEnabled: false });
      } finally {
        setIsPushLoading(false);
      }
    } else {
      onChange({ ...preferences, pushEnabled: enabled });
    }
  };

  const handleTypeToggle = (type: NotificationType, enabled: boolean) => {
    onChange({
      ...preferences,
      types: { ...preferences.types, [type]: enabled },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <h3 className="font-semibold">Notification Preferences</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Enable Notifications
              </label>
              <p className="text-xs text-muted-foreground">
                Receive important updates about your finances
              </p>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(enabled) =>
                onChange({ ...preferences, enabled })
              }
            />
          </div>

          {preferences.enabled && (
            <>
              {/* Notification channels */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Notification Channels
                </h4>

                {/* Push notifications */}
                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <label className="text-sm">Push Notifications</label>
                    <p className="text-xs text-muted-foreground">
                      Receive real-time alerts on your device
                    </p>
                  </div>
                  <Switch
                    checked={preferences.pushEnabled}
                    onCheckedChange={handlePushToggle}
                    disabled={isPushLoading}
                  />
                </div>

                {/* Email digest */}
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm">Email Digest</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["none", "daily", "weekly", "monthly"] as const).map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() =>
                            onChange({ ...preferences, emailDigest: option })
                          }
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-md border transition-colors",
                            preferences.emailDigest === option
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent border-border"
                          )}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Notification types */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Notification Types
                </h4>

                {(Object.keys(preferences.types) as NotificationType[]).map(
                  (type) => (
                    <div
                      key={type}
                      className="flex items-center justify-between pl-6"
                    >
                      <div className="flex items-center gap-3">
                        {getNotificationIcon(type)}
                        <div className="space-y-0.5">
                          <label className="text-sm">{getTypeLabel(type)}</label>
                          <p className="text-xs text-muted-foreground">
                            {getTypeDescription(type)}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.types[type]}
                        onCheckedChange={(enabled) =>
                          handleTypeToggle(type, enabled)
                        }
                      />
                    </div>
                  )
                )}
              </div>

              {/* Quiet hours */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quiet Hours
                </h4>

                <div className="flex items-center justify-between pl-6">
                  <div className="space-y-0.5">
                    <label className="text-sm">Enable Quiet Hours</label>
                    <p className="text-xs text-muted-foreground">
                      Pause notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    checked={preferences.quietHours.enabled}
                    onCheckedChange={(enabled) =>
                      onChange({
                        ...preferences,
                        quietHours: { ...preferences.quietHours, enabled },
                      })
                    }
                  />
                </div>

                {preferences.quietHours.enabled && (
                  <div className="flex gap-4 pl-6">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Start
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) =>
                          onChange({
                            ...preferences,
                            quietHours: {
                              ...preferences.quietHours,
                              start: e.target.value,
                            },
                          })
                        }
                        className="block px-2 py-1 text-sm border rounded bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        End
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) =>
                          onChange({
                            ...preferences,
                            quietHours: {
                              ...preferences.quietHours,
                              end: e.target.value,
                            },
                          })
                        }
                        className="block px-2 py-1 text-sm border rounded bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationCenter({
  notifications: externalNotifications,
  preferences: externalPreferences,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onPreferencesChange,
  onPushNotificationSetup,
  className,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"notifications" | "preferences">(
    "notifications"
  );
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Use external state or internal state with sample data
  const [internalNotifications, setInternalNotifications] = useState<
    Notification[]
  >(sampleNotifications);
  const [internalPreferences, setInternalPreferences] =
    useState<NotificationPreferences>(defaultPreferences);

  const notifications = externalNotifications ?? internalNotifications;
  const preferences = externalPreferences ?? internalPreferences;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by read status
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    }

    // Filter by enabled types
    filtered = filtered.filter((n) => preferences.types[n.type]);

    return filtered;
  }, [notifications, filter, preferences.types]);

  // Group notifications
  const groupedNotifications = useMemo(
    () => groupNotifications(filteredNotifications),
    [filteredNotifications]
  );

  // Counts
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && preferences.types[n.type]).length,
    [notifications, preferences.types]
  );

  // Handlers
  const handleMarkAsRead = useCallback(
    (id: string) => {
      if (onMarkAsRead) {
        onMarkAsRead(id);
      } else {
        setInternalNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    },
    [onMarkAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    } else {
      setInternalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, [onMarkAllAsRead]);

  const handleDelete = useCallback(
    (id: string) => {
      if (onDelete) {
        onDelete(id);
      } else {
        setInternalNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    },
    [onDelete]
  );

  const handleClearAll = useCallback(() => {
    if (onClearAll) {
      onClearAll();
    } else {
      setInternalNotifications([]);
    }
  }, [onClearAll]);

  const handlePreferencesChange = useCallback(
    (newPreferences: NotificationPreferences) => {
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      } else {
        setInternalPreferences(newPreferences);
      }
    },
    [onPreferencesChange]
  );

  // Reset view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setView("notifications");
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-lg transition-colors",
            "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            preferences.enabled ? "text-foreground" : "text-muted-foreground",
            className
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {preferences.enabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}

          {/* Badge */}
          {unreadCount > 0 && preferences.enabled && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 text-[10px] font-bold",
                "bg-destructive text-destructive-foreground rounded-full",
                "animate-in zoom-in-50 duration-200"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-0 overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {view === "preferences" ? (
          <PreferencesPanel
            preferences={preferences}
            onChange={handlePreferencesChange}
            onPushSetup={onPushNotificationSetup}
            onBack={() => setView("notifications")}
          />
        ) : (
          <div className="flex flex-col h-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1.5 rounded hover:bg-accent transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setView("preferences")}
                  className="p-1.5 rounded hover:bg-accent transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  filter === "all"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  filter === "unread"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({unreadCount})
                  </span>
                )}
              </button>
            </div>

            {/* Notification list */}
            <ScrollArea className="flex-1">
              {groupedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {filter === "unread"
                      ? "No unread notifications"
                      : "No notifications yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    We'll notify you about important updates
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {groupedNotifications.map((group) => (
                    <NotificationGroupItem
                      key={group.id}
                      group={group}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      defaultExpanded={group.notifications.length <= 2}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between p-2 border-t bg-muted/30">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </button>
                <button
                  onClick={() => setInternalNotifications(sampleNotifications)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset sample notifications"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default NotificationCenter;
export type {
  NotificationCenterProps,
  NotificationItemProps,
  NotificationGroupItemProps,
  PreferencesPanelProps,
};

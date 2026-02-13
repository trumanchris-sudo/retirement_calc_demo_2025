/**
 * Collaboration System for Retirement Calculator
 *
 * Enables multiplayer cursor presence for couples planning together.
 * Uses localStorage/sessionStorage for demo purposes with architecture
 * designed for easy WebSocket upgrade.
 *
 * Features:
 * - Real-time cursor position tracking
 * - User presence with names and colors
 * - "X is viewing..." indicators
 * - Selection highlighting
 * - Cross-tab communication via BroadcastChannel
 */

// ==================== Types ====================

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface UserSelection {
  elementId: string | null;
  fieldName: string | null;
  startOffset?: number;
  endOffset?: number;
}

export interface CollaboratorPresence {
  id: string;
  name: string;
  color: string;
  cursor: CursorPosition | null;
  selection: UserSelection | null;
  viewingSection: string | null;
  isActive: boolean;
  lastSeen: number;
}

export interface CollaborationState {
  sessionId: string;
  userId: string;
  collaborators: Map<string, CollaboratorPresence>;
}

export interface CollaborationMessage {
  type: 'cursor' | 'selection' | 'presence' | 'leave' | 'heartbeat' | 'viewing';
  userId: string;
  sessionId: string;
  payload: CursorPosition | UserSelection | CollaboratorPresence | string | null;
  timestamp: number;
}

// Transport interface for easy WebSocket upgrade
export interface CollaborationTransport {
  send: (message: CollaborationMessage) => void;
  subscribe: (callback: (message: CollaborationMessage) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

// ==================== Constants ====================

const STORAGE_KEY = 'retirement-calc-collab';
const CHANNEL_NAME = 'retirement-calc-collab-channel';
const HEARTBEAT_INTERVAL = 2000; // 2 seconds
const PRESENCE_TIMEOUT = 5000; // 5 seconds before considered inactive
const CURSOR_THROTTLE = 50; // ms between cursor updates

// Predefined colors for collaborators (couples-friendly palette)
export const COLLABORATOR_COLORS = [
  '#8B5CF6', // Purple (You)
  '#EC4899', // Pink (Partner)
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const;

// Friendly default names
export const DEFAULT_NAMES = [
  'You',
  'Partner',
  'Guest 1',
  'Guest 2',
  'Guest 3',
  'Guest 4',
] as const;

// ==================== Utility Functions ====================

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a session ID (shared between collaborators)
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create user ID from storage
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return generateUserId();

  let userId = sessionStorage.getItem(`${STORAGE_KEY}-user-id`);
  if (!userId) {
    userId = generateUserId();
    sessionStorage.setItem(`${STORAGE_KEY}-user-id`, userId);
  }
  return userId;
}

/**
 * Get user's display name from storage or default
 */
export function getUserName(): string {
  if (typeof window === 'undefined') return DEFAULT_NAMES[0];
  return localStorage.getItem(`${STORAGE_KEY}-user-name`) || DEFAULT_NAMES[0];
}

/**
 * Set user's display name
 */
export function setUserName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}-user-name`, name);
}

/**
 * Get color for a user based on their index
 */
export function getColorForUser(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}

/**
 * Throttle function for cursor updates
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle = false;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

// ==================== BroadcastChannel Transport ====================

/**
 * LocalStorage + BroadcastChannel transport for demo purposes
 * Can be swapped out for WebSocket transport in production
 */
export function createBroadcastTransport(sessionId: string): CollaborationTransport {
  let channel: BroadcastChannel | null = null;
  const subscribers: Set<(message: CollaborationMessage) => void> = new Set();

  return {
    connect() {
      if (typeof window === 'undefined') return;

      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => {
          const message = event.data as CollaborationMessage;
          // Only process messages from the same session
          if (message.sessionId === sessionId) {
            subscribers.forEach(callback => callback(message));
          }
        };
      } catch (error) {
        console.warn('[Collaboration] BroadcastChannel not supported:', error);
      }
    },

    disconnect() {
      channel?.close();
      channel = null;
      subscribers.clear();
    },

    send(message: CollaborationMessage) {
      if (channel) {
        channel.postMessage(message);
      }
      // Also store in sessionStorage for new tabs
      try {
        const stored = sessionStorage.getItem(`${STORAGE_KEY}-messages`) || '[]';
        const messages = JSON.parse(stored) as CollaborationMessage[];
        messages.push(message);
        // Keep only last 100 messages
        const trimmed = messages.slice(-100);
        sessionStorage.setItem(`${STORAGE_KEY}-messages`, JSON.stringify(trimmed));
      } catch {
        // Storage might be full
      }
    },

    subscribe(callback: (message: CollaborationMessage) => void) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
}

// ==================== WebSocket Transport (Future) ====================

/**
 * WebSocket transport for production use
 * Stub implementation - replace with actual WebSocket logic
 */
export function createWebSocketTransport(
  _sessionId: string,
  _wsUrl: string
): CollaborationTransport {
  // This is a stub for future WebSocket implementation
  // In production, this would connect to a WebSocket server

  return {
    connect() {
      console.log('[Collaboration] WebSocket transport not implemented - using broadcast');
    },
    disconnect() {},
    send(_message: CollaborationMessage) {},
    subscribe(_callback: (message: CollaborationMessage) => void) {
      return () => {};
    },
  };
}

// ==================== Collaboration Manager ====================

export interface CollaborationManager {
  // State
  getState: () => CollaborationState;
  getCollaborators: () => CollaboratorPresence[];

  // User actions
  updateCursor: (position: CursorPosition) => void;
  updateSelection: (selection: UserSelection) => void;
  updateViewing: (sectionName: string | null) => void;
  setUserName: (name: string) => void;

  // Lifecycle
  join: () => void;
  leave: () => void;

  // Events
  onCollaboratorsChange: (callback: (collaborators: CollaboratorPresence[]) => void) => () => void;
}

/**
 * Create a collaboration manager instance
 */
export function createCollaborationManager(
  sessionId: string,
  transport?: CollaborationTransport
): CollaborationManager {
  const userId = getOrCreateUserId();
  const collaborators = new Map<string, CollaboratorPresence>();
  const changeListeners = new Set<(collaborators: CollaboratorPresence[]) => void>();

  let heartbeatInterval: NodeJS.Timeout | null = null;
  let cleanupInterval: NodeJS.Timeout | null = null;

  // Use provided transport or create default
  const activeTransport = transport || createBroadcastTransport(sessionId);

  // Get user's color based on join order
  const getMyColor = () => {
    const sortedIds = Array.from(collaborators.keys()).sort();
    const myIndex = sortedIds.indexOf(userId);
    return getColorForUser(myIndex >= 0 ? myIndex : 0);
  };

  // Create my presence object
  const createMyPresence = (): CollaboratorPresence => ({
    id: userId,
    name: getUserName(),
    color: getMyColor(),
    cursor: null,
    selection: null,
    viewingSection: null,
    isActive: true,
    lastSeen: Date.now(),
  });

  // Notify listeners of changes
  const notifyChange = () => {
    const list = Array.from(collaborators.values())
      .filter(c => c.id !== userId) // Exclude self
      .filter(c => c.isActive || Date.now() - c.lastSeen < PRESENCE_TIMEOUT);
    changeListeners.forEach(cb => cb(list));
  };

  // Handle incoming messages
  const handleMessage = (message: CollaborationMessage) => {
    if (message.userId === userId) return; // Ignore own messages

    const existing = collaborators.get(message.userId);

    switch (message.type) {
      case 'cursor':
        if (existing) {
          existing.cursor = message.payload as CursorPosition;
          existing.lastSeen = message.timestamp;
          existing.isActive = true;
        }
        break;

      case 'selection':
        if (existing) {
          existing.selection = message.payload as UserSelection;
          existing.lastSeen = message.timestamp;
        }
        break;

      case 'viewing':
        if (existing) {
          existing.viewingSection = message.payload as string | null;
          existing.lastSeen = message.timestamp;
        }
        break;

      case 'presence':
        const presence = message.payload as CollaboratorPresence;
        collaborators.set(message.userId, {
          ...presence,
          lastSeen: message.timestamp,
          isActive: true,
        });
        break;

      case 'heartbeat':
        if (existing) {
          existing.lastSeen = message.timestamp;
          existing.isActive = true;
        }
        break;

      case 'leave':
        if (existing) {
          existing.isActive = false;
        }
        break;
    }

    notifyChange();
  };

  // Cleanup stale collaborators
  const cleanupStale = () => {
    const now = Date.now();
    let changed = false;

    collaborators.forEach((collab, id) => {
      if (id !== userId && now - collab.lastSeen > PRESENCE_TIMEOUT) {
        collab.isActive = false;
        changed = true;
      }
    });

    if (changed) {
      notifyChange();
    }
  };

  // Throttled cursor update
  const throttledCursorUpdate = throttle((position: CursorPosition) => {
    activeTransport.send({
      type: 'cursor',
      userId,
      sessionId,
      payload: position,
      timestamp: Date.now(),
    });
  }, CURSOR_THROTTLE);

  return {
    getState() {
      return {
        sessionId,
        userId,
        collaborators,
      };
    },

    getCollaborators() {
      return Array.from(collaborators.values())
        .filter(c => c.id !== userId && c.isActive);
    },

    updateCursor(position: CursorPosition) {
      const me = collaborators.get(userId);
      if (me) {
        me.cursor = position;
        me.lastSeen = Date.now();
      }
      throttledCursorUpdate(position);
    },

    updateSelection(selection: UserSelection) {
      const me = collaborators.get(userId);
      if (me) {
        me.selection = selection;
      }
      activeTransport.send({
        type: 'selection',
        userId,
        sessionId,
        payload: selection,
        timestamp: Date.now(),
      });
    },

    updateViewing(sectionName: string | null) {
      const me = collaborators.get(userId);
      if (me) {
        me.viewingSection = sectionName;
      }
      activeTransport.send({
        type: 'viewing',
        userId,
        sessionId,
        payload: sectionName,
        timestamp: Date.now(),
      });
    },

    setUserName(name: string) {
      setUserName(name);
      const me = collaborators.get(userId);
      if (me) {
        me.name = name;
      }
      // Broadcast presence update
      activeTransport.send({
        type: 'presence',
        userId,
        sessionId,
        payload: createMyPresence(),
        timestamp: Date.now(),
      });
    },

    join() {
      // Connect transport
      activeTransport.connect();

      // Subscribe to messages
      activeTransport.subscribe(handleMessage);

      // Add self to collaborators
      collaborators.set(userId, createMyPresence());

      // Announce presence
      activeTransport.send({
        type: 'presence',
        userId,
        sessionId,
        payload: createMyPresence(),
        timestamp: Date.now(),
      });

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        activeTransport.send({
          type: 'heartbeat',
          userId,
          sessionId,
          payload: null,
          timestamp: Date.now(),
        });
      }, HEARTBEAT_INTERVAL);

      // Start cleanup interval
      cleanupInterval = setInterval(cleanupStale, PRESENCE_TIMEOUT / 2);
    },

    leave() {
      // Announce departure
      activeTransport.send({
        type: 'leave',
        userId,
        sessionId,
        payload: null,
        timestamp: Date.now(),
      });

      // Stop intervals
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }

      // Disconnect transport
      activeTransport.disconnect();

      // Clear local state
      collaborators.clear();
      changeListeners.clear();
    },

    onCollaboratorsChange(callback: (collaborators: CollaboratorPresence[]) => void) {
      changeListeners.add(callback);
      // Immediately call with current state
      callback(Array.from(collaborators.values()).filter(c => c.id !== userId && c.isActive));
      return () => changeListeners.delete(callback);
    },
  };
}

// ==================== Session Management ====================

/**
 * Get or create a collaboration session ID
 * Stored in URL hash for easy sharing
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();

  // Check URL hash first
  const hash = window.location.hash;
  if (hash.startsWith('#collab=')) {
    return hash.slice(8);
  }

  // Check sessionStorage
  let sessionId = sessionStorage.getItem(`${STORAGE_KEY}-session-id`);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(`${STORAGE_KEY}-session-id`, sessionId);
  }

  return sessionId;
}

/**
 * Create a shareable collaboration link
 */
export function createCollabLink(sessionId: string): string {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.href);
  url.hash = `collab=${sessionId}`;
  return url.toString();
}

/**
 * Join an existing collaboration session from a link
 */
export function joinSessionFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (hash.startsWith('#collab=')) {
    const sessionId = hash.slice(8);
    sessionStorage.setItem(`${STORAGE_KEY}-session-id`, sessionId);
    return sessionId;
  }

  return null;
}

// ==================== React Hook Helpers ====================

/**
 * Section names for "X is viewing..." indicator
 */
export const SECTION_NAMES: Record<string, string> = {
  'personal': 'Personal Info',
  'income': 'Income & Contributions',
  'investments': 'Investment Settings',
  'social-security': 'Social Security',
  'results': 'Results',
  'timeline': 'Timeline',
  'monte-carlo': 'Monte Carlo',
  'optimization': 'Optimization',
} as const;

/**
 * Get human-readable section name
 */
export function getSectionDisplayName(sectionId: string): string {
  return SECTION_NAMES[sectionId] || sectionId;
}

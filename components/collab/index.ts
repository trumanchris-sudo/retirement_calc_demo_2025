/**
 * Collaboration Components
 *
 * Multiplayer cursor presence for couples planning together.
 *
 * Usage:
 * ```tsx
 * import {
 *   CollaborationProvider,
 *   CollaborationBar,
 *   ViewingIndicator,
 *   SelectionHighlight,
 *   useSectionTracker,
 * } from '@/components/collab';
 *
 * // Wrap your app with the provider
 * <CollaborationProvider>
 *   <App />
 * </CollaborationProvider>
 *
 * // Add the collaboration bar to show who's online
 * <CollaborationBar />
 *
 * // Show "X is viewing..." indicators
 * <ViewingIndicator />
 *
 * // Track which section users are viewing
 * function MySection() {
 *   const ref = useSectionTracker('my-section');
 *   return <section ref={ref}>...</section>;
 * }
 *
 * // Highlight fields that others are editing
 * <SelectionHighlight elementId="income-field" fieldName="income">
 *   <input ... />
 * </SelectionHighlight>
 * ```
 */

export {
  // Provider
  CollaborationProvider,
  // Hooks
  useCollaboration,
  useSectionTracker,
  // Components
  CollaborationBar,
  ViewingIndicator,
  SelectionHighlight,
  PresenceAvatars,
  LiveCursors,
  CursorWithLabel,
  // Context
  CollaborationContext,
} from './LiveCursor';

export type {
  CollaborationContextType,
  CollaborationProviderProps,
  LiveCursorsProps,
  CursorWithLabelProps,
  ViewingIndicatorProps,
  SelectionHighlightProps,
  PresenceAvatarsProps,
  CollaborationBarProps,
} from './LiveCursor';

// Re-export collaboration utilities
export {
  // Types
  type CursorPosition,
  type UserSelection,
  type CollaboratorPresence,
  type CollaborationState,
  type CollaborationMessage,
  type CollaborationTransport,
  type CollaborationManager,
  // Constants
  COLLABORATOR_COLORS,
  DEFAULT_NAMES,
  SECTION_NAMES,
  // Utility functions
  generateUserId,
  generateSessionId,
  getOrCreateUserId,
  getUserName,
  setUserName,
  getColorForUser,
  // Transport
  createBroadcastTransport,
  createWebSocketTransport,
  // Manager
  createCollaborationManager,
  // Session
  getOrCreateSessionId,
  createCollabLink,
  joinSessionFromUrl,
  getSectionDisplayName,
} from '@/lib/collaboration';

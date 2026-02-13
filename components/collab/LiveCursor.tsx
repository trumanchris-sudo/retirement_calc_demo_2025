'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CollaboratorPresence,
  CollaborationManager,
  createCollaborationManager,
  getOrCreateSessionId,
  createCollabLink,
  getSectionDisplayName,
  getUserName,
  COLLABORATOR_COLORS,
} from '@/lib/collaboration';

// ==================== Context ====================

interface CollaborationContextType {
  sessionId: string;
  collaborators: CollaboratorPresence[];
  isConnected: boolean;
  collabLink: string;
  updateViewing: (sectionId: string | null) => void;
  setMyName: (name: string) => void;
  myName: string;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

// ==================== Provider ====================

interface CollaborationProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function CollaborationProvider({
  children,
  enabled = true,
}: CollaborationProviderProps) {
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myName, setMyNameState] = useState(() => getUserName());
  const managerRef = useRef<CollaborationManager | null>(null);

  // Initialize collaboration manager
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const manager = createCollaborationManager(sessionId);
    managerRef.current = manager;

    // Subscribe to collaborator changes
    const unsubscribe = manager.onCollaboratorsChange(setCollaborators);

    // Join the session
    manager.join();
    setIsConnected(true);

    return () => {
      unsubscribe();
      manager.leave();
      setIsConnected(false);
    };
  }, [sessionId, enabled]);

  // Track cursor movement
  useEffect(() => {
    if (!enabled || !managerRef.current || typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      managerRef.current?.updateCursor({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      });
    };

    // Track selection changes
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        managerRef.current?.updateSelection({
          elementId: null,
          fieldName: null,
        });
        return;
      }

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.ELEMENT_NODE
        ? container as Element
        : container.parentElement;

      if (element) {
        const fieldName = element.closest('[data-field-name]')?.getAttribute('data-field-name');
        const elementId = element.id || element.closest('[id]')?.id || null;

        managerRef.current?.updateSelection({
          elementId,
          fieldName,
          startOffset: range.startOffset,
          endOffset: range.endOffset,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [enabled]);

  const updateViewing = useCallback((sectionId: string | null) => {
    managerRef.current?.updateViewing(sectionId);
  }, []);

  const setMyName = useCallback((name: string) => {
    setMyNameState(name);
    managerRef.current?.setUserName(name);
  }, []);

  const collabLink = createCollabLink(sessionId);

  const value: CollaborationContextType = {
    sessionId,
    collaborators,
    isConnected,
    collabLink,
    updateViewing,
    setMyName,
    myName,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
      {enabled && <LiveCursors collaborators={collaborators} />}
    </CollaborationContext.Provider>
  );
}

// ==================== Live Cursors Overlay ====================

interface LiveCursorsProps {
  collaborators: CollaboratorPresence[];
}

function LiveCursors({ collaborators }: LiveCursorsProps) {
  const activeCursors = collaborators.filter(
    (c) => c.isActive && c.cursor !== null
  );

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    >
      <AnimatePresence>
        {activeCursors.map((collaborator) => (
          <CursorWithLabel
            key={collaborator.id}
            collaborator={collaborator}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ==================== Individual Cursor ====================

interface CursorWithLabelProps {
  collaborator: CollaboratorPresence;
}

function CursorWithLabel({ collaborator }: CursorWithLabelProps) {
  const { cursor, name, color } = collaborator;

  if (!cursor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: cursor.x,
        y: cursor.y,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 400,
        mass: 0.5,
      }}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
        style={{
          filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`,
        }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.85 2.29a.5.5 0 0 0-.35.92z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-5 top-5 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: color }}
      >
        {name}
      </motion.div>
    </motion.div>
  );
}

// ==================== Viewing Indicator ====================

interface ViewingIndicatorProps {
  className?: string;
}

export function ViewingIndicator({ className }: ViewingIndicatorProps) {
  const { collaborators } = useCollaboration();

  // Group collaborators by section they're viewing
  const viewingBySection = collaborators.reduce((acc, collab) => {
    if (collab.viewingSection && collab.isActive) {
      if (!acc[collab.viewingSection]) {
        acc[collab.viewingSection] = [];
      }
      acc[collab.viewingSection].push(collab);
    }
    return acc;
  }, {} as Record<string, CollaboratorPresence[]>);

  const sections = Object.entries(viewingBySection);

  if (sections.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <AnimatePresence mode="popLayout">
        {sections.map(([sectionId, viewers]) => (
          <motion.div
            key={sectionId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1.5 px-2 py-1 bg-muted/80 backdrop-blur-sm rounded-full text-xs"
          >
            <div className="flex -space-x-1">
              {viewers.slice(0, 3).map((viewer) => (
                <div
                  key={viewer.id}
                  className="w-4 h-4 rounded-full border-2 border-background"
                  style={{ backgroundColor: viewer.color }}
                  title={viewer.name}
                />
              ))}
            </div>
            <span className="text-muted-foreground">
              {viewers.length === 1
                ? `${viewers[0].name} is viewing`
                : `${viewers.length} people viewing`}{' '}
              <span className="font-medium text-foreground">
                {getSectionDisplayName(sectionId)}
              </span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ==================== Selection Highlight ====================

interface SelectionHighlightProps {
  elementId: string;
  fieldName?: string;
  children: ReactNode;
  className?: string;
}

export function SelectionHighlight({
  elementId,
  fieldName,
  children,
  className,
}: SelectionHighlightProps) {
  const { collaborators } = useCollaboration();

  // Find collaborators selecting this element
  const selectors = collaborators.filter(
    (c) =>
      c.isActive &&
      c.selection &&
      (c.selection.elementId === elementId ||
        c.selection.fieldName === fieldName)
  );

  const hasSelection = selectors.length > 0;
  const primaryColor = selectors[0]?.color || COLLABORATOR_COLORS[1];

  return (
    <div
      id={elementId}
      data-field-name={fieldName}
      className={cn('relative transition-all duration-200', className)}
      style={{
        boxShadow: hasSelection
          ? `0 0 0 2px ${primaryColor}40, inset 0 0 0 1px ${primaryColor}30`
          : undefined,
        borderRadius: hasSelection ? '4px' : undefined,
      }}
    >
      {children}

      {/* Selection indicator badge */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {selectors.map((s) => s.name).join(', ')} editing
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== Presence Avatars ====================

interface PresenceAvatarsProps {
  className?: string;
  maxVisible?: number;
}

export function PresenceAvatars({
  className,
  maxVisible = 5,
}: PresenceAvatarsProps) {
  const { collaborators, myName } = useCollaboration();

  const allUsers = [
    { id: 'me', name: myName, color: COLLABORATOR_COLORS[0], isActive: true },
    ...collaborators,
  ];

  const visible = allUsers.slice(0, maxVisible);
  const overflow = allUsers.length - maxVisible;

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-2">
        {visible.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'relative w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white',
              !user.isActive && 'opacity-50'
            )}
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
            {user.isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
            )}
          </motion.div>
        ))}
      </div>

      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-1 text-xs text-muted-foreground"
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
}

// ==================== Collaboration Header Bar ====================

interface CollaborationBarProps {
  className?: string;
  onShareClick?: () => void;
}

export function CollaborationBar({
  className,
  onShareClick,
}: CollaborationBarProps) {
  const { collaborators, isConnected, collabLink, myName, setMyName } =
    useCollaboration();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(myName);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(collabLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setMyName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2 bg-muted/50 border-b',
        className
      )}
    >
      {/* Left: Presence avatars and status */}
      <div className="flex items-center gap-3">
        <PresenceAvatars maxVisible={4} />

        <div className="text-sm">
          {isConnected ? (
            <span className="text-muted-foreground">
              {collaborators.length === 0 ? (
                'Planning solo'
              ) : collaborators.length === 1 ? (
                <>
                  Planning with{' '}
                  <span className="font-medium text-foreground">
                    {collaborators[0].name}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {collaborators.length + 1}
                  </span>{' '}
                  people planning together
                </>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Connecting...</span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Edit name */}
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            className="px-2 py-1 text-sm border rounded-md w-32 bg-background"
            placeholder="Your name"
            maxLength={20}
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {myName}
          </button>
        )}

        {/* Share button */}
        <button
          onClick={onShareClick || handleCopyLink}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            copied
              ? 'bg-green-500/10 text-green-600'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4" />
              Invite Partner
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== Section Tracker Hook ====================

/**
 * Hook to track which section the user is viewing
 * Use this on section containers to update the "X is viewing..." indicator
 */
export function useSectionTracker(sectionId: string) {
  const { updateViewing } = useCollaboration();

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              updateViewing(sectionId);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(node);

      return () => observer.disconnect();
    },
    [sectionId, updateViewing]
  );

  return ref;
}

// ==================== Icons ====================

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ==================== Exports ====================

export {
  CollaborationContext,
  LiveCursors,
  CursorWithLabel,
};

export type {
  CollaborationContextType,
  CollaborationProviderProps,
  LiveCursorsProps,
  CursorWithLabelProps,
  ViewingIndicatorProps,
  SelectionHighlightProps,
  PresenceAvatarsProps,
  CollaborationBarProps,
};

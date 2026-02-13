"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cva, type VariantProps } from "class-variance-authority"
import {
  StickyNote as StickyNoteIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Highlighter,
  Trash2,
  Pin,
  PinOff,
  MessageCircle,
  Clock,
  User,
  Users,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  X,
  Edit3,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export type NoteColor = "yellow" | "blue" | "green" | "pink" | "orange" | "purple"
export type NoteAuthor = "user" | "spouse" | "shared"

export interface Annotation {
  id: string
  fieldId: string
  content: string
  rawContent: string // Plain text version for PDF export
  color: NoteColor
  author: NoteAuthor
  authorName?: string
  createdAt: Date
  updatedAt: Date
  isPinned: boolean
  isWhyReminder: boolean // "Why did I choose this?" type note
  replies?: AnnotationReply[]
}

export interface AnnotationReply {
  id: string
  content: string
  author: NoteAuthor
  authorName?: string
  createdAt: Date
}

export interface AnnotationsContextValue {
  annotations: Annotation[]
  addAnnotation: (annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  addReply: (annotationId: string, reply: Omit<AnnotationReply, "id" | "createdAt">) => void
  getAnnotationsForField: (fieldId: string) => Annotation[]
  exportAnnotations: () => AnnotationExport
  currentUser: NoteAuthor
  setCurrentUser: (user: NoteAuthor) => void
  currentUserName: string
  setCurrentUserName: (name: string) => void
}

export interface AnnotationExport {
  exportedAt: Date
  annotations: Array<{
    fieldId: string
    fieldLabel?: string
    content: string
    author: string
    createdAt: string
    updatedAt: string
    isWhyReminder: boolean
    replies: Array<{
      content: string
      author: string
      createdAt: string
    }>
  }>
}

// ============================================================================
// CONTEXT
// ============================================================================

const AnnotationsContext = React.createContext<AnnotationsContextValue | null>(null)

export function useAnnotations() {
  const context = React.useContext(AnnotationsContext)
  if (!context) {
    throw new Error("useAnnotations must be used within an AnnotationsProvider")
  }
  return context
}

export function useAnnotationsOptional() {
  return React.useContext(AnnotationsContext)
}

// ============================================================================
// PROVIDER
// ============================================================================

interface AnnotationsProviderProps {
  children: React.ReactNode
  initialAnnotations?: Annotation[]
  onAnnotationsChange?: (annotations: Annotation[]) => void
  storageKey?: string
}

export function AnnotationsProvider({
  children,
  initialAnnotations = [],
  onAnnotationsChange,
  storageKey = "retirement-calc-annotations",
}: AnnotationsProviderProps) {
  const [annotations, setAnnotations] = React.useState<Annotation[]>(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          return parsed.map((a: Annotation) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
            replies: a.replies?.map((r: AnnotationReply) => ({
              ...r,
              createdAt: new Date(r.createdAt),
            })),
          }))
        }
      } catch {
        // Ignore parse errors
      }
    }
    return initialAnnotations
  })

  const [currentUser, setCurrentUser] = React.useState<NoteAuthor>("user")
  const [currentUserName, setCurrentUserName] = React.useState("Me")

  // Persist to localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined" && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(annotations))
    }
    onAnnotationsChange?.(annotations)
  }, [annotations, storageKey, onAnnotationsChange])

  const addAnnotation = React.useCallback(
    (annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date()
      const newAnnotation: Annotation = {
        ...annotation,
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        replies: [],
      }
      setAnnotations((prev) => [...prev, newAnnotation])
    },
    []
  )

  const updateAnnotation = React.useCallback(
    (id: string, updates: Partial<Annotation>) => {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
        )
      )
    },
    []
  )

  const deleteAnnotation = React.useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const addReply = React.useCallback(
    (annotationId: string, reply: Omit<AnnotationReply, "id" | "createdAt">) => {
      const newReply: AnnotationReply = {
        ...reply,
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
      }
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? {
                ...a,
                replies: [...(a.replies || []), newReply],
                updatedAt: new Date(),
              }
            : a
        )
      )
    },
    []
  )

  const getAnnotationsForField = React.useCallback(
    (fieldId: string) => {
      return annotations.filter((a) => a.fieldId === fieldId)
    },
    [annotations]
  )

  const exportAnnotations = React.useCallback((): AnnotationExport => {
    return {
      exportedAt: new Date(),
      annotations: annotations.map((a) => ({
        fieldId: a.fieldId,
        content: a.rawContent,
        author: a.authorName || a.author,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        isWhyReminder: a.isWhyReminder,
        replies: (a.replies || []).map((r) => ({
          content: r.content,
          author: r.authorName || r.author,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    }
  }, [annotations])

  return (
    <AnnotationsContext.Provider
      value={{
        annotations,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        addReply,
        getAnnotationsForField,
        exportAnnotations,
        currentUser,
        setCurrentUser,
        currentUserName,
        setCurrentUserName,
      }}
    >
      {children}
    </AnnotationsContext.Provider>
  )
}

// ============================================================================
// STICKY NOTE COLOR VARIANTS
// ============================================================================

const noteColorVariants: Record<NoteColor, { bg: string; border: string; text: string }> = {
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-900 dark:text-yellow-100",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-100",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-900 dark:text-green-100",
  },
  pink: {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-900 dark:text-pink-100",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-900 dark:text-orange-100",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-100",
  },
}

const authorIcons: Record<NoteAuthor, React.ReactNode> = {
  user: <User className="w-3 h-3" />,
  spouse: <Users className="w-3 h-3" />,
  shared: <Users className="w-3 h-3" />,
}

// ============================================================================
// RICH TEXT EDITOR (Simplified)
// ============================================================================

interface RichTextEditorProps {
  value: string
  onChange: (html: string, rawText: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Add your note...",
  className,
  minHeight = 80,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      const rawText = editorRef.current.innerText
      onChange(html, rawText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault()
      execCommand("bold")
    }
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault()
      execCommand("italic")
    }
    // Ctrl/Cmd + U for underline
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault()
      execCommand("underline")
    }
  }

  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("Enter URL:")
            if (url) execCommand("createLink", url)
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Insert Link"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("hiliteColor", "#fef08a")}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-auto prose prose-sm dark:prose-invert max-w-none",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground",
          "[&:empty]:before:pointer-events-none",
          className
        )}
        style={{ minHeight }}
      />
    </div>
  )
}

// ============================================================================
// STICKY NOTE COMPONENT
// ============================================================================

interface StickyNoteProps {
  annotation: Annotation
  onUpdate: (updates: Partial<Annotation>) => void
  onDelete: () => void
  onAddReply: (reply: Omit<AnnotationReply, "id" | "createdAt">) => void
  currentUser: NoteAuthor
  currentUserName: string
  isExpanded?: boolean
  onToggleExpand?: () => void
  className?: string
}

function StickyNote({
  annotation,
  onUpdate,
  onDelete,
  onAddReply,
  currentUser,
  currentUserName,
  isExpanded = false,
  onToggleExpand,
  className,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(annotation.content)
  const [editRawContent, setEditRawContent] = React.useState(annotation.rawContent)
  const [replyContent, setReplyContent] = React.useState("")
  const [showReplies, setShowReplies] = React.useState(false)
  const colorStyles = noteColorVariants[annotation.color]

  const handleSave = () => {
    onUpdate({ content: editContent, rawContent: editRawContent })
    setIsEditing(false)
  }

  const handleAddReply = () => {
    if (replyContent.trim()) {
      onAddReply({
        content: replyContent,
        author: currentUser,
        authorName: currentUserName,
      })
      setReplyContent("")
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div
      className={cn(
        "rounded-lg border-2 shadow-md transition-all duration-200",
        colorStyles.bg,
        colorStyles.border,
        colorStyles.text,
        annotation.isPinned && "ring-2 ring-primary ring-offset-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-current/10">
        <div className="flex items-center gap-2 text-xs">
          {annotation.isWhyReminder && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-current/10">
              <HelpCircle className="w-3 h-3" />
              Why?
            </span>
          )}
          <span className="flex items-center gap-1">
            {authorIcons[annotation.author]}
            {annotation.authorName || annotation.author}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ isPinned: !annotation.isPinned })}
            className="p-1 rounded hover:bg-current/10 transition-colors"
            title={annotation.isPinned ? "Unpin note" : "Pin note"}
          >
            {annotation.isPinned ? (
              <PinOff className="w-3.5 h-3.5" />
            ) : (
              <Pin className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded hover:bg-current/10 transition-colors"
            title="Edit note"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editContent}
              onChange={(html, raw) => {
                setEditContent(html)
                setEditRawContent(raw)
              }}
              minHeight={60}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditContent(annotation.content)
                  setIsEditing(false)
                }}
                className="px-2 py-1 text-xs rounded hover:bg-current/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: annotation.content }}
          />
        )}
      </div>

      {/* Footer with timestamp */}
      <div className="px-3 pb-2 flex items-center justify-between text-[10px] opacity-60">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(annotation.updatedAt)}
        </span>
        {annotation.createdAt.getTime() !== annotation.updatedAt.getTime() && (
          <span>(edited)</span>
        )}
      </div>

      {/* Replies Section */}
      {(annotation.replies?.length ?? 0) > 0 && (
        <div className="border-t border-current/10">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-current/5"
          >
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {annotation.replies?.length} {annotation.replies?.length === 1 ? "reply" : "replies"}
            </span>
            {showReplies ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showReplies && (
            <div className="px-3 pb-3 space-y-2">
              {annotation.replies?.map((reply) => (
                <div
                  key={reply.id}
                  className="pl-3 border-l-2 border-current/20 text-xs"
                >
                  <div className="flex items-center gap-1 mb-1 opacity-70">
                    {authorIcons[reply.author]}
                    <span>{reply.authorName || reply.author}</span>
                    <span className="mx-1">-</span>
                    <span>{formatDate(reply.createdAt)}</span>
                  </div>
                  <p>{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Reply */}
      {isExpanded && (
        <div className="border-t border-current/10 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddReply()}
              placeholder="Add a reply..."
              className="flex-1 px-2 py-1 text-xs rounded border border-current/20 bg-white/50 dark:bg-black/20"
            />
            <button
              onClick={handleAddReply}
              disabled={!replyContent.trim()}
              className="px-2 py-1 text-xs rounded bg-current/10 hover:bg-current/20 disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ANNOTATION TRIGGER (Attach to any field)
// ============================================================================

interface AnnotationTriggerProps {
  fieldId: string
  fieldLabel?: string
  children?: React.ReactNode
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
}

export function AnnotationTrigger({
  fieldId,
  fieldLabel,
  children,
  className,
  side = "right",
  align = "start",
}: AnnotationTriggerProps) {
  const {
    getAnnotationsForField,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addReply,
    currentUser,
    currentUserName,
  } = useAnnotations()

  const [isOpen, setIsOpen] = React.useState(false)
  const [showNewNote, setShowNewNote] = React.useState(false)
  const [newNoteContent, setNewNoteContent] = React.useState("")
  const [newNoteRawContent, setNewNoteRawContent] = React.useState("")
  const [newNoteColor, setNewNoteColor] = React.useState<NoteColor>("yellow")
  const [isWhyReminder, setIsWhyReminder] = React.useState(false)

  const annotations = getAnnotationsForField(fieldId)
  const hasAnnotations = annotations.length > 0
  const hasPinnedNotes = annotations.some((a) => a.isPinned)

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addAnnotation({
        fieldId,
        content: newNoteContent,
        rawContent: newNoteRawContent,
        color: newNoteColor,
        author: currentUser,
        authorName: currentUserName,
        isPinned: false,
        isWhyReminder,
        replies: [],
      })
      setNewNoteContent("")
      setNewNoteRawContent("")
      setShowNewNote(false)
      setIsWhyReminder(false)
    }
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        {children || (
          <button
            className={cn(
              "relative p-1.5 rounded-md transition-all duration-200",
              "hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hasAnnotations
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-muted-foreground opacity-50 hover:opacity-100",
              className
            )}
            title={hasAnnotations ? `${annotations.length} note(s)` : "Add note"}
          >
            <StickyNoteIcon className="w-4 h-4" />
            {hasAnnotations && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-yellow-500 text-white">
                {annotations.length}
              </span>
            )}
            {hasPinnedNotes && (
              <Pin className="absolute -bottom-1 -right-1 w-3 h-3 text-primary" />
            )}
          </button>
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            "z-50 w-80 max-h-[70vh] overflow-auto rounded-lg border bg-popover",
            "shadow-xl animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-popover">
            <div className="flex items-center gap-2">
              <StickyNoteIcon className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-sm">
                {fieldLabel ? `Notes: ${fieldLabel}` : "Notes"}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notes List */}
          <div className="p-3 space-y-3">
            {annotations.length === 0 && !showNewNote && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes yet. Add one to remember your reasoning!
              </p>
            )}

            {/* Existing Notes */}
            {annotations.map((annotation) => (
              <StickyNote
                key={annotation.id}
                annotation={annotation}
                onUpdate={(updates) => updateAnnotation(annotation.id, updates)}
                onDelete={() => deleteAnnotation(annotation.id)}
                onAddReply={(reply) => addReply(annotation.id, reply)}
                currentUser={currentUser}
                currentUserName={currentUserName}
                isExpanded
              />
            ))}

            {/* New Note Form */}
            {showNewNote && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Note</span>
                  <button
                    onClick={() => setShowNewNote(false)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Color Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Color:</span>
                  {(Object.keys(noteColorVariants) as NoteColor[]).map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewNoteColor(color)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform",
                        noteColorVariants[color].bg,
                        noteColorVariants[color].border,
                        newNoteColor === color && "scale-125 ring-2 ring-primary ring-offset-1"
                      )}
                      title={color}
                    />
                  ))}
                </div>

                {/* Why Reminder Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWhyReminder}
                    onChange={(e) => setIsWhyReminder(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Why did I choose this?
                  </span>
                </label>

                {/* Editor */}
                <RichTextEditor
                  value={newNoteContent}
                  onChange={(html, raw) => {
                    setNewNoteContent(html)
                    setNewNoteRawContent(raw)
                  }}
                  placeholder="Why did you choose this value? What's your reasoning?"
                />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    Save Note
                  </button>
                  <button
                    onClick={() => setShowNewNote(false)}
                    className="px-3 py-1.5 text-xs rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add Note Button */}
            {!showNewNote && (
              <button
                onClick={() => setShowNewNote(true)}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
              >
                <StickyNoteIcon className="w-4 h-4" />
                Add Note
              </button>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// ============================================================================
// ANNOTATIONS EXPORT PANEL
// ============================================================================

interface AnnotationsExportPanelProps {
  className?: string
  onExportPDF?: (data: AnnotationExport) => void
}

export function AnnotationsExportPanel({
  className,
  onExportPDF,
}: AnnotationsExportPanelProps) {
  const { annotations, exportAnnotations } = useAnnotations()
  const [copied, setCopied] = React.useState(false)

  const handleExport = () => {
    const data = exportAnnotations()
    if (onExportPDF) {
      onExportPDF(data)
    } else {
      // Default: copy to clipboard as formatted text
      const text = formatAnnotationsForExport(data)
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAnnotationsForExport = (data: AnnotationExport): string => {
    let output = `RETIREMENT PLAN NOTES\n`
    output += `Exported: ${data.exportedAt.toLocaleDateString()}\n`
    output += `${"=".repeat(50)}\n\n`

    data.annotations.forEach((a, index) => {
      output += `[${index + 1}] ${a.fieldLabel || a.fieldId}\n`
      output += `-`.repeat(30) + `\n`
      if (a.isWhyReminder) {
        output += `(Why did I choose this?)\n`
      }
      output += `${a.content}\n`
      output += `\nBy: ${a.author} | Created: ${new Date(a.createdAt).toLocaleDateString()}\n`

      if (a.replies.length > 0) {
        output += `\nReplies:\n`
        a.replies.forEach((r) => {
          output += `  - ${r.author}: ${r.content}\n`
        })
      }
      output += `\n`
    })

    return output
  }

  if (annotations.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-muted/50 border",
        className
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">
          {annotations.length} {annotations.length === 1 ? "note" : "notes"} saved
        </p>
        <p className="text-xs text-muted-foreground">
          Export your notes to include with your retirement plan
        </p>
      </div>
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export Notes
          </>
        )}
      </button>
    </div>
  )
}

// ============================================================================
// COLLABORATIVE USER SELECTOR
// ============================================================================

interface UserSelectorProps {
  className?: string
}

export function UserSelector({ className }: UserSelectorProps) {
  const { currentUser, setCurrentUser, currentUserName, setCurrentUserName } =
    useAnnotations()
  const [isEditing, setIsEditing] = React.useState(false)
  const [tempName, setTempName] = React.useState(currentUserName)

  const handleSaveName = () => {
    setCurrentUserName(tempName)
    setIsEditing(false)
  }

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-muted/30", className)}>
      <span className="text-xs text-muted-foreground">Adding notes as:</span>

      <div className="flex items-center gap-2">
        <select
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value as NoteAuthor)}
          className="text-xs px-2 py-1 rounded border bg-background"
        >
          <option value="user">Individual</option>
          <option value="spouse">Spouse/Partner</option>
          <option value="shared">Shared Note</option>
        </select>

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="w-24 text-xs px-2 py-1 rounded border bg-background"
              placeholder="Your name"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="p-1 rounded hover:bg-muted"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setTempName(currentUserName)
              setIsEditing(true)
            }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted"
          >
            {authorIcons[currentUser]}
            <span>{currentUserName}</span>
            <Edit3 className="w-3 h-3 ml-1 opacity-50" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ALL ANNOTATIONS VIEW (For sidebar or modal)
// ============================================================================

interface AllAnnotationsViewProps {
  className?: string
  filterByAuthor?: NoteAuthor
  showOnlyPinned?: boolean
  showOnlyWhyReminders?: boolean
}

export function AllAnnotationsView({
  className,
  filterByAuthor,
  showOnlyPinned = false,
  showOnlyWhyReminders = false,
}: AllAnnotationsViewProps) {
  const {
    annotations,
    updateAnnotation,
    deleteAnnotation,
    addReply,
    currentUser,
    currentUserName,
  } = useAnnotations()

  let filteredAnnotations = [...annotations]

  if (filterByAuthor) {
    filteredAnnotations = filteredAnnotations.filter(
      (a) => a.author === filterByAuthor
    )
  }
  if (showOnlyPinned) {
    filteredAnnotations = filteredAnnotations.filter((a) => a.isPinned)
  }
  if (showOnlyWhyReminders) {
    filteredAnnotations = filteredAnnotations.filter((a) => a.isWhyReminder)
  }

  // Sort by pinned first, then by date
  filteredAnnotations.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  if (filteredAnnotations.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <StickyNoteIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No notes to display</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {filteredAnnotations.map((annotation) => (
        <div key={annotation.id}>
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Field: {annotation.fieldId}
          </p>
          <StickyNote
            annotation={annotation}
            onUpdate={(updates) => updateAnnotation(annotation.id, updates)}
            onDelete={() => deleteAnnotation(annotation.id)}
            onAddReply={(reply) => addReply(annotation.id, reply)}
            currentUser={currentUser}
            currentUserName={currentUserName}
            isExpanded
          />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PDF EXPORT HELPER
// ============================================================================

export function generateAnnotationsPDFContent(data: AnnotationExport): string {
  // Returns HTML content suitable for PDF generation
  let html = `
    <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Retirement Plan Notes</h1>
      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
        Exported on ${data.exportedAt.toLocaleDateString()} at ${data.exportedAt.toLocaleTimeString()}
      </p>
  `

  data.annotations.forEach((annotation, index) => {
    html += `
      <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fefce8;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${annotation.fieldLabel || annotation.fieldId}</strong>
          ${annotation.isWhyReminder ? '<span style="font-size: 12px; color: #666; background: #fef08a; padding: 2px 8px; border-radius: 4px;">Why did I choose this?</span>' : ''}
        </div>
        <div style="font-size: 14px; line-height: 1.6;">${annotation.content}</div>
        <div style="margin-top: 12px; font-size: 12px; color: #666;">
          By ${annotation.author} | Created ${new Date(annotation.createdAt).toLocaleDateString()}
        </div>
    `

    if (annotation.replies.length > 0) {
      html += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5;">
          <strong style="font-size: 12px;">Replies:</strong>
      `
      annotation.replies.forEach((reply) => {
        html += `
          <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #d4d4d4;">
            <span style="font-size: 12px; color: #666;">${reply.author}:</span>
            <span style="font-size: 12px;">${reply.content}</span>
          </div>
        `
      })
      html += `</div>`
    }

    html += `</div>`
  })

  html += `</div>`
  return html
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  StickyNote as AnnotationNote,
  RichTextEditor,
  noteColorVariants,
  authorIcons,
}

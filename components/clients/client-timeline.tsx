'use client'

// Client Communication Hub - Timeline Component
// Vertical timeline with icons, color coding, type filters, inline note creation,
// and pinned notes at top.

import { useState, useTransition, memo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Calendar,
  Mail,
  DollarSign,
  StickyNote,
  FileText,
  Users,
  MessageSquare,
  Filter,
  Pin,
  Plus,
} from '@/components/ui/icons'
import type { TimelineItem, TimelineItemType } from '@/lib/clients/communication-actions'
import { addCommunicationNote } from '@/lib/clients/communication-actions'

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TimelineItemType,
  {
    label: string
    icon: typeof Calendar
    dotColor: string
    badgeBg: string
    badgeText: string
  }
> = {
  event: {
    label: 'Event',
    icon: Calendar,
    dotColor: 'bg-brand-500',
    badgeBg: 'bg-brand-100',
    badgeText: 'text-brand-400',
  },
  inquiry: {
    label: 'Inquiry',
    icon: MessageSquare,
    dotColor: 'bg-violet-500',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
  },
  email: {
    label: 'Email',
    icon: Mail,
    dotColor: 'bg-brand-500',
    badgeBg: 'bg-brand-100',
    badgeText: 'text-brand-700',
  },
  note: {
    label: 'Note',
    icon: StickyNote,
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  quote: {
    label: 'Quote',
    icon: FileText,
    dotColor: 'bg-teal-500',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
  },
  payment: {
    label: 'Payment',
    icon: DollarSign,
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  referral: {
    label: 'Referral',
    icon: Users,
    dotColor: 'bg-pink-500',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
  },
}

const ALL_TYPES: TimelineItemType[] = [
  'event',
  'inquiry',
  'email',
  'note',
  'quote',
  'payment',
  'referral',
]

// ── Props ────────────────────────────────────────────────────────────────────

interface ClientTimelineProps {
  clientId: string
  initialItems: TimelineItem[]
  totalCount: number
}

// ── Component ────────────────────────────────────────────────────────────────

export function ClientTimeline({ clientId, initialItems, totalCount }: ClientTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>(initialItems)
  const [activeFilters, setActiveFilters] = useState<Set<TimelineItemType>>(new Set(ALL_TYPES))
  const [showFilters, setShowFilters] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Separate pinned notes
  const pinnedNotes = items.filter(
    (i) => i.type === 'note' && i.metadata?.pinned && activeFilters.has('note')
  )

  // Filtered items (excluding pinned notes which show at top)
  const pinnedNoteIds = new Set(pinnedNotes.map((n) => n.id))
  const filteredItems = items.filter((i) => activeFilters.has(i.type) && !pinnedNoteIds.has(i.id))

  const toggleFilter = (type: TimelineItemType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleAddNote = async (content: string, pinned: boolean) => {
    const previousItems = items
    startTransition(async () => {
      try {
        const newItem = await addCommunicationNote(clientId, content, pinned)
        setItems((prev) => [newItem, ...prev])
        setShowNoteForm(false)
        toast.success('Note added')
      } catch (err) {
        setItems(previousItems)
        console.error('[client-timeline] Failed to add note', err)
        toast.error('Failed to add note')
      }
    })
  }

  return (
    <div className="border border-stone-700 rounded-xl bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-stone-100">Communication Timeline</h3>
          <span className="text-xs text-stone-400">{totalCount} interactions</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              showFilters ? 'text-brand-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-stone-800 bg-stone-800/50">
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const cfg = TYPE_CONFIG[type]
              const active = activeFilters.has(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    active ? `${cfg.badgeBg} ${cfg.badgeText}` : 'bg-stone-700 text-stone-500'
                  }`}
                >
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Inline note form */}
      {showNoteForm && (
        <div className="px-5 py-3 border-b border-stone-800 bg-stone-800">
          <InlineNoteForm
            onSubmit={handleAddNote}
            onCancel={() => setShowNoteForm(false)}
            submitting={isPending}
          />
        </div>
      )}

      {/* Pinned notes section */}
      {pinnedNotes.length > 0 && (
        <div className="px-5 py-3 border-b border-stone-800 bg-stone-850">
          <div className="flex items-center gap-1.5 mb-2">
            <Pin className="w-3 h-3 text-amber-500" />
            <span className="text-xxs font-semibold text-amber-500 uppercase tracking-wide">
              Pinned
            </span>
          </div>
          <div className="space-y-2">
            {pinnedNotes.map((item) => (
              <div
                key={item.id}
                className="text-sm text-stone-200 bg-stone-800 rounded-lg px-3 py-2"
              >
                <p className="text-stone-200">{item.description}</p>
                <p className="text-xxs text-stone-500 mt-1">
                  {formatTimeLabel(item.date)}
                  {item.metadata?.category && item.metadata.category !== 'general' && (
                    <span className="ml-1.5 text-stone-400">({item.metadata.category})</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-5 py-3">
        {filteredItems.length === 0 ? (
          <div className="text-sm text-stone-400 py-4 text-center">
            {items.length === 0 ? 'No activity recorded yet' : 'No items match the current filters'}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-3 bottom-3 w-px bg-stone-700" aria-hidden="true" />

            <div className="space-y-0">
              {filteredItems.map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Timeline Row ─────────────────────────────────────────────────────────────

// Memoized: rendered in .map() for each timeline entry. Receives stable data objects.
const TimelineRow = memo(function TimelineRow({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type]
  const IconComponent = cfg.icon
  const timeLabel = formatTimeLabel(item.date)

  const inner = (
    <div className="flex items-start gap-3 py-2 pl-8 pr-2 rounded-md hover:bg-stone-800 transition-colors group relative">
      {/* Icon dot */}
      <div
        className={`absolute left-1 mt-[2px] w-5 h-5 rounded-full flex items-center justify-center ${cfg.dotColor}`}
        aria-hidden="true"
      >
        <IconComponent className="w-3 h-3 text-white" weight="bold" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            {cfg.label}
          </span>
          <span className="text-xs text-stone-300 truncate">{item.title}</span>
          {item.status && <span className="text-xxs text-stone-500">({item.status})</span>}
        </div>
        {item.description && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{item.description}</p>
        )}
      </div>

      <span className="text-xs-tight text-stone-500 shrink-0 mt-0.5">{timeLabel}</span>
    </div>
  )

  if (item.linkUrl) {
    return <Link href={item.linkUrl}>{inner}</Link>
  }
  return inner
})

// ── Inline Note Form ─────────────────────────────────────────────────────────

function InlineNoteForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (content: string, pinned: boolean) => Promise<void>
  onCancel: () => void
  submitting: boolean
}) {
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const MAX_CHARS = 2000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    await onSubmit(content.trim(), pinned)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Write a note..."
        rows={2}
        autoFocus
        className="w-full text-sm bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-stone-200 placeholder:text-stone-500"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded border-stone-600 text-brand-600 focus:ring-brand-500 bg-stone-900"
            />
            <span className="text-xs text-stone-400">Pin this note</span>
          </label>
          <span className="text-xxs text-stone-500">
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Save
          </button>
        </div>
      </div>
    </form>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  })
}

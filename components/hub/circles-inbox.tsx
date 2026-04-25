'use client'

import { useState, useTransition, memo, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { ChefCircleSummary, PipelineStage } from '@/lib/hub/chef-circle-actions'
import { archiveCircle, createDinnerClub } from '@/lib/hub/chef-circle-actions'

// ---------------------------------------------------------------------------
// Pipeline stage config
// ---------------------------------------------------------------------------

const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; bg: string }> = {
  new_inquiry:     { label: 'New',         color: 'text-blue-300',   bg: 'bg-blue-500/20' },
  awaiting_client: { label: 'Waiting',     color: 'text-amber-300',  bg: 'bg-amber-500/20' },
  awaiting_chef:   { label: 'Action',      color: 'text-red-300',    bg: 'bg-red-500/20' },
  quoted:          { label: 'Quoted',       color: 'text-violet-300', bg: 'bg-violet-500/20' },
  accepted:        { label: 'Accepted',     color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  paid:            { label: 'Paid',         color: 'text-green-300',  bg: 'bg-green-500/20' },
  confirmed:       { label: 'Confirmed',    color: 'text-green-300',  bg: 'bg-green-500/20' },
  in_progress:     { label: 'Live',         color: 'text-orange-300', bg: 'bg-orange-500/20' },
  completed:       { label: 'Done',         color: 'text-stone-400',  bg: 'bg-stone-500/20' },
  cancelled:       { label: 'Cancelled',    color: 'text-stone-500',  bg: 'bg-stone-600/20' },
  declined:        { label: 'Declined',     color: 'text-stone-500',  bg: 'bg-stone-600/20' },
  expired:         { label: 'Expired',      color: 'text-stone-500',  bg: 'bg-stone-600/20' },
  active:          { label: 'Active',       color: 'text-purple-300', bg: 'bg-purple-500/20' },
}

type FilterKey = 'all' | 'attention' | 'pipeline' | 'completed'

const PIPELINE_ACTIVE_STAGES: PipelineStage[] = [
  'new_inquiry', 'awaiting_client', 'awaiting_chef', 'quoted', 'accepted', 'paid', 'confirmed', 'in_progress',
]

const PIPELINE_DONE_STAGES: PipelineStage[] = ['completed', 'cancelled', 'declined', 'expired']

interface CirclesInboxProps {
  circles: ChefCircleSummary[]
}

export function CirclesInbox({ circles }: CirclesInboxProps) {
  const [items, setItems] = useState(circles)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showCreate, setShowCreate] = useState(false)

  const counts = useMemo(() => {
    const attention = items.filter((c) => c.needs_attention).length
    const pipeline = items.filter((c) => PIPELINE_ACTIVE_STAGES.includes(c.pipeline_stage)).length
    const done = items.filter((c) => PIPELINE_DONE_STAGES.includes(c.pipeline_stage)).length
    return { attention, pipeline, done, all: items.length }
  }, [items])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'attention':
        return items.filter((c) => c.needs_attention)
      case 'pipeline':
        return items.filter((c) => PIPELINE_ACTIVE_STAGES.includes(c.pipeline_stage))
      case 'completed':
        return items.filter((c) => PIPELINE_DONE_STAGES.includes(c.pipeline_stage))
      default:
        return items
    }
  }, [items, filter])

  const handleArchive = async (groupId: string) => {
    const prev = items
    setItems((items) => items.filter((c) => c.id !== groupId))
    try {
      await archiveCircle(groupId)
    } catch {
      setItems(prev)
      toast.error('Failed to archive circle')
    }
  }

  const emptyState = items.length === 0 && !showCreate

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <FilterPill
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={counts.all}
          />
          <FilterPill
            active={filter === 'attention'}
            onClick={() => setFilter('attention')}
            label="Needs Action"
            count={counts.attention}
            accent={counts.attention > 0}
          />
          <FilterPill
            active={filter === 'pipeline'}
            onClick={() => setFilter('pipeline')}
            label="Pipeline"
            count={counts.pipeline}
          />
          <FilterPill
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            label="Past"
            count={counts.done}
          />
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Link
            href="/hub/circles"
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-600"
          >
            Browse
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            + Circle
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateDinnerClubForm
          onCreated={(token) => {
            setShowCreate(false)
            window.open(`/hub/g/${token}`, '_blank')
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {emptyState && (
        <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-12 text-center">
          <div className="mb-3 text-4xl">💬</div>
          <h3 className="text-lg font-semibold text-stone-200">No circles yet</h3>
          <p className="mt-1 text-sm text-stone-400">
            Circles auto-create from inquiries and events. Each one is a private coordination
            channel with your guests for menus, dietary info, quotes, and updates.
          </p>
        </div>
      )}

      {/* Circle list */}
      <div className="space-y-2">
        {filtered.map((circle) => (
          <CircleRow key={circle.id} circle={circle} onArchive={handleArchive} />
        ))}

        {filtered.length === 0 && items.length > 0 && (
          <div className="py-8 text-center text-sm text-stone-500">
            {filter === 'attention' ? 'Nothing needs your attention right now.' : 'No circles match this filter.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter pill
// ---------------------------------------------------------------------------

function FilterPill({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-stone-700 text-stone-100'
          : 'text-stone-400 hover:text-stone-200'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
          accent && !active
            ? 'bg-red-500/30 text-red-300'
            : active
              ? 'bg-stone-600 text-stone-300'
              : 'bg-stone-800 text-stone-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Circle row (enriched with pipeline data)
// ---------------------------------------------------------------------------

const CircleRow = memo(function CircleRow({
  circle,
  onArchive,
}: {
  circle: ChefCircleSummary
  onArchive: (id: string) => void
}) {
  const timeAgo = circle.last_message_at ? formatTimeAgo(circle.last_message_at) : 'No messages'
  const stage = STAGE_CONFIG[circle.pipeline_stage]
  const eventDateStr = circle.event_date
    ? formatEventDate(circle.event_date)
    : null

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-stone-800/60 ${
        circle.needs_attention
          ? 'border-amber-500/30 bg-stone-800/50'
          : 'border-stone-700/50 bg-stone-800/30'
      }`}
    >
      {/* Emoji avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-lg">
        {circle.emoji || '💬'}
      </div>

      {/* Content */}
      <Link href={`/circles/${circle.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-stone-200">
            {circle.client_name
              ? `${circle.client_name}`
              : circle.name}
          </span>

          {/* Pipeline stage badge */}
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.bg} ${stage.color}`}>
            {stage.label}
          </span>

          {circle.group_type === 'dinner_club' && (
            <span className="flex-shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
              Club
            </span>
          )}

          {circle.group_type === 'crew' && (
            <span className="flex-shrink-0 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
              Crew
            </span>
          )}

          {circle.unread_count > 0 && (
            <span className="flex-shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {circle.unread_count}
            </span>
          )}
        </div>

        {/* Second line: context */}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-400">
          {circle.client_name && circle.name !== circle.client_name && (
            <span className="truncate">{circle.name}</span>
          )}
          {!circle.client_name && (
            <span className="truncate">
              {circle.last_message_preview || 'No messages yet'}
            </span>
          )}
        </div>

        {/* Attention reason */}
        {circle.needs_attention && circle.attention_reason && (
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            {circle.attention_reason}
          </div>
        )}

        {circle.response_gap_hours != null && circle.response_gap_hours >= 12 && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-red-400/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/70" />
            Client waiting{' '}
            {circle.response_gap_hours >= 24
              ? `${Math.round(circle.response_gap_hours / 24)}d`
              : `${circle.response_gap_hours}h`}
          </div>
        )}
      </Link>

      {/* Meta column */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {circle.urgency_score >= 60 && (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
            Urgent
          </span>
        )}
        {circle.urgency_score >= 30 && circle.urgency_score < 60 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
            Soon
          </span>
        )}
        <span className="text-xs text-stone-500">{timeAgo}</span>
        {eventDateStr && (
          <span className="text-[10px] text-stone-500">{eventDateStr}</span>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-stone-600">
          {circle.guest_count != null && (
            <span>{circle.guest_count} guests</span>
          )}
          {circle.estimated_value_cents != null && circle.estimated_value_cents > 0 && (
            <span className="text-emerald-400/70">
              ${Math.round(circle.estimated_value_cents / 100).toLocaleString()}
            </span>
          )}
          {circle.guest_count != null && circle.member_count > 0 && (
            <span className="text-stone-700">|</span>
          )}
          <span>{circle.member_count} in circle</span>
        </div>
      </div>

      {/* Archive button (hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onArchive(circle.id)
        }}
        className="flex-shrink-0 rounded p-1 text-stone-600 opacity-0 transition-opacity hover:text-stone-300 group-hover:opacity-100"
        title="Archive circle"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </button>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Create dinner club form
// ---------------------------------------------------------------------------

function CreateDinnerClubForm({
  onCreated,
  onCancel,
}: {
  onCreated: (groupToken: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await createDinnerClub({
          name: name.trim(),
          description: description.trim() || undefined,
          emoji,
        })
        onCreated(result.groupToken)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create circle'
        setError(message)
        toast.error(message)
      }
    })
  }

  const emojiOptions = ['🍽️', '🥘', '🍷', '🎉', '🏠', '👨‍🍳', '🌮', '🍕', '🥂', '🎊', '☕', '🍰']

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-stone-200">New Dinner Club</h4>
      <div className="mb-3 flex gap-2">
        <div className="flex flex-wrap gap-1">
          {emojiOptions.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`rounded-lg p-1.5 text-lg ${emoji === e ? 'bg-stone-600 ring-1 ring-brand-500' : 'hover:bg-stone-700'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Circle name (e.g. Friday Night Dinners)"
        className="mb-2 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-brand-500"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="mb-3 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-brand-500"
      />
      {error && (
        <div className="mb-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-300">{error}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="flex-1 rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white disabled:opacity-30"
        >
          {isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-stone-700 px-4 py-2 text-xs text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays}d`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

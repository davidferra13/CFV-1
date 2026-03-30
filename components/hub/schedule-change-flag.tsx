'use client'

import { useState, useTransition } from 'react'
import type { ScheduleChange } from '@/lib/hub/meal-board-actions'
import {
  postScheduleChange,
  acknowledgeScheduleChange,
  resolveScheduleChange,
} from '@/lib/hub/meal-board-actions'

// ---------------------------------------------------------------------------
// Change type metadata
// ---------------------------------------------------------------------------

const CHANGE_TYPES = [
  { value: 'extra_guests', label: 'Extra guests', icon: '👥+' },
  { value: 'fewer_guests', label: 'Fewer guests', icon: '👥-' },
  { value: 'skip_day', label: 'Skip day', icon: '⏭️' },
  { value: 'skip_meal', label: 'Skip meal', icon: '🚫' },
  { value: 'time_change', label: 'Time change', icon: '🕐' },
  { value: 'location_change', label: 'Location change', icon: '📍' },
  { value: 'other', label: 'Other', icon: '📝' },
] as const

type ChangeType = (typeof CHANGE_TYPES)[number]['value']

function getChangeIcon(type: string): string {
  return CHANGE_TYPES.find((t) => t.value === type)?.icon ?? '📝'
}

// ---------------------------------------------------------------------------
// Schedule Change Badge (shown on day header)
// ---------------------------------------------------------------------------

interface ScheduleChangeBadgeProps {
  changes: ScheduleChange[]
  dateStr: string
  groupId: string
  profileToken: string | null
  isChefOrAdmin: boolean
  onUpdate: () => void
}

export function ScheduleChangeBadge({
  changes,
  dateStr,
  groupId,
  profileToken,
  isChefOrAdmin,
  onUpdate,
}: ScheduleChangeBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const dayChanges = changes.filter((c) => c.change_date === dateStr)
  const unacknowledged = dayChanges.filter((c) => !c.acknowledged_at)

  const handleAcknowledge = (changeId: string) => {
    if (!profileToken) return
    startTransition(async () => {
      try {
        await acknowledgeScheduleChange({ changeId, profileToken })
        onUpdate()
      } catch {
        // non-blocking
      }
    })
  }

  const handleResolve = (changeId: string) => {
    if (!profileToken) return
    startTransition(async () => {
      try {
        await resolveScheduleChange({ changeId, profileToken })
        onUpdate()
      } catch {
        // non-blocking
      }
    })
  }

  return (
    <>
      {/* Inline badge for unacknowledged changes */}
      {dayChanges.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
            unacknowledged.length > 0
              ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70'
              : 'bg-stone-700/50 text-stone-400 hover:bg-stone-700/70'
          }`}
          title={`${dayChanges.length} schedule change${dayChanges.length > 1 ? 's' : ''}`}
        >
          {unacknowledged.length > 0 ? '⚠' : '✓'} {dayChanges.length} change
          {dayChanges.length > 1 ? 's' : ''}
        </button>
      )}

      {/* "Flag a change" button (visible for all members) */}
      {profileToken && !showForm && dayChanges.length === 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="text-[10px] text-stone-600 hover:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Flag a schedule change"
        >
          🏴 Flag
        </button>
      )}

      {/* Add another change when some exist */}
      {profileToken && !showForm && dayChanges.length > 0 && expanded && (
        <button
          onClick={() => setShowForm(true)}
          className="text-[10px] text-stone-500 hover:text-stone-300"
        >
          + Add change
        </button>
      )}

      {/* Expanded change details */}
      {expanded && dayChanges.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {dayChanges.map((change) => (
            <div
              key={change.id}
              className={`rounded-lg border p-2 text-xs ${
                !change.acknowledged_at
                  ? 'border-amber-800/50 bg-amber-950/30'
                  : 'border-stone-700/50 bg-stone-800/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="font-medium text-stone-200">
                    {getChangeIcon(change.change_type)} {change.description}
                  </span>
                  {change.posted_by?.display_name && (
                    <span className="ml-1 text-stone-500">- {change.posted_by.display_name}</span>
                  )}
                </div>

                {/* Chef actions */}
                {isChefOrAdmin && profileToken && (
                  <div className="flex shrink-0 gap-1">
                    {!change.acknowledged_at && (
                      <button
                        onClick={() => handleAcknowledge(change.id)}
                        disabled={isPending}
                        className="rounded bg-stone-700 px-1.5 py-0.5 text-[10px] text-stone-300 hover:bg-stone-600 disabled:opacity-50"
                        title="Mark as seen"
                      >
                        Ack
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(change.id)}
                      disabled={isPending}
                      className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-900/70 disabled:opacity-50"
                      title="Mark as resolved"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>

              {change.acknowledged_at && (
                <span className="mt-0.5 block text-[10px] text-stone-600">
                  Acknowledged{' '}
                  {new Date(change.acknowledged_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New change form */}
      {showForm && (
        <ScheduleChangeForm
          groupId={groupId}
          dateStr={dateStr}
          profileToken={profileToken!}
          onSaved={() => {
            setShowForm(false)
            setExpanded(true)
            onUpdate()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Inline form for posting a schedule change
// ---------------------------------------------------------------------------

function ScheduleChangeForm({
  groupId,
  dateStr,
  profileToken,
  onSaved,
  onCancel,
}: {
  groupId: string
  dateStr: string
  profileToken: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [changeType, setChangeType] = useState<ChangeType>('other')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!description.trim()) return

    startTransition(async () => {
      try {
        const result = await postScheduleChange({
          groupId,
          profileToken,
          changeDate: dateStr,
          changeType,
          description: description.trim(),
        })
        if (result.success) {
          onSaved()
        } else {
          setError(result.error ?? 'Failed to post')
        }
      } catch {
        setError('Failed to post schedule change')
      }
    })
  }

  return (
    <div className="mt-1.5 rounded-lg border border-stone-700 bg-stone-800/80 p-2.5">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
        Flag Schedule Change
      </p>

      {/* Change type selector */}
      <div className="mb-1.5 flex flex-wrap gap-1">
        {CHANGE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setChangeType(t.value)}
            className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
              changeType === t.value
                ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's changing? (e.g., 3 extra guests for dinner)"
        className="mb-1.5 w-full rounded bg-stone-700 px-2 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
        maxLength={500}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && description.trim()) handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
      />

      {error && <p className="mb-1 text-[10px] text-red-400">{error}</p>}

      <div className="flex gap-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!description.trim() || isPending}
          className="rounded bg-[var(--hub-primary,#e88f47)] px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Posting...' : 'Post'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-stone-700 px-2.5 py-1 text-xs text-stone-400 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

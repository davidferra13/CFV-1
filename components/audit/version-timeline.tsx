'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { fetchEntityTimeline } from '@/lib/audit/actions'
import { formatRelativeTime, formatExactTimestamp } from '@/lib/time/format-relative-time'
import type { EntityType, OperationLogEntry, OperationDiff } from '@/lib/audit/types'

type VersionTimelineProps = {
  entityType: EntityType
  entityId: string
  /** Max entries to show initially */
  pageSize?: number
}

const OPERATION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  transition: 'Status changed',
  archive: 'Archived',
  restore: 'Restored',
  duplicate: 'Duplicated',
  assign: 'Reassigned',
  link: 'Linked',
  unlink: 'Unlinked',
}

const OPERATION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  transition: 'bg-amber-500',
  archive: 'bg-zinc-400',
  restore: 'bg-emerald-400',
  duplicate: 'bg-purple-500',
  assign: 'bg-indigo-500',
  link: 'bg-cyan-500',
  unlink: 'bg-orange-500',
}

export function VersionTimeline({ entityType, entityId, pageSize = 20 }: VersionTimelineProps) {
  const [entries, setEntries] = useState<OperationLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(
    (offset = 0) => {
      startTransition(async () => {
        try {
          const result = await fetchEntityTimeline(entityType, entityId, {
            limit: pageSize,
            offset,
          })
          if (offset === 0) {
            setEntries(result.entries)
          } else {
            setEntries((prev) => [...prev, ...result.entries])
          }
          setTotal(result.total)
          setError(null)
        } catch (err) {
          setError('Failed to load history')
          console.error('[VersionTimeline]', err)
        }
      })
    },
    [entityType, entityId, pageSize]
  )

  useEffect(() => {
    load(0)
  }, [load])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!loading && entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        No history recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium text-zinc-700">
          Change History
          {total > 0 && (
            <span className="ml-1.5 text-xs font-normal text-zinc-400">
              ({total} {total === 1 ? 'entry' : 'entries'})
            </span>
          )}
        </h3>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200" />

        <div className="space-y-0">
          {entries.map((entry) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              isExpanded={expanded.has(entry.id)}
              onToggle={() => toggleExpand(entry.id)}
            />
          ))}
        </div>
      </div>

      {entries.length < total && (
        <button
          onClick={() => load(entries.length)}
          disabled={loading}
          className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Show more (${total - entries.length} remaining)`}
        </button>
      )}
    </div>
  )
}

// ─── Single entry ────────────────────────────────────────────────────────────

function TimelineEntry({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: OperationLogEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const label = OPERATION_LABELS[entry.operation] ?? entry.operation
  const dotColor = OPERATION_COLORS[entry.operation] ?? 'bg-zinc-400'
  const hasDiff = entry.diff && Object.keys(entry.diff).length > 0
  const actionName = entry.metadata?.action as string | undefined

  return (
    <div className="relative flex gap-3 py-1.5 pl-0">
      {/* Dot */}
      <div className="relative z-10 mt-1.5 flex-shrink-0">
        <div className={`h-[15px] w-[15px] rounded-full border-2 border-white ${dotColor}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-800">{label}</span>
          {actionName && <span className="text-xs text-zinc-400 font-mono">{actionName}</span>}
          <span
            className="ml-auto flex-shrink-0 text-xs text-zinc-400"
            title={formatExactTimestamp(entry.created_at)}
          >
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>

        {/* Transition summary */}
        {entry.diff?.from && entry.diff?.to && (
          <div className="mt-0.5 text-xs text-zinc-500">
            <span className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{entry.diff.from}</span>
            <span className="mx-1">&rarr;</span>
            <span className="rounded bg-zinc-100 px-1 py-0.5 font-mono">{entry.diff.to}</span>
          </div>
        )}

        {/* Expandable diff */}
        {hasDiff && !entry.diff?.from && (
          <button onClick={onToggle} className="mt-0.5 text-xs text-blue-500 hover:text-blue-700">
            {isExpanded ? 'Hide changes' : 'Show changes'}
          </button>
        )}

        {isExpanded && entry.diff?.changes && <DiffDisplay changes={entry.diff.changes} />}

        {isExpanded && entry.diff?.created && (
          <div className="mt-1 rounded border border-zinc-100 bg-zinc-50 p-2">
            <div className="text-xs font-medium text-zinc-500 mb-1">Initial state</div>
            <dl className="space-y-0.5">
              {Object.entries(entry.diff.created).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <dt className="font-mono text-zinc-400 min-w-[100px]">{key}</dt>
                  <dd className="text-zinc-700 truncate">{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Diff display ────────────────────────────────────────────────────────────

function DiffDisplay({ changes }: { changes: NonNullable<OperationDiff['changes']> }) {
  return (
    <div className="mt-1 rounded border border-zinc-100 bg-zinc-50 p-2 space-y-1">
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="text-xs">
          <span className="font-mono text-zinc-500">{field}:</span>
          <span className="ml-1 text-red-600 line-through">{formatValue(oldVal)}</span>
          <span className="mx-1 text-zinc-300">&rarr;</span>
          <span className="text-emerald-700">{formatValue(newVal)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    if (val.length > 80) return val.slice(0, 80) + '...'
    return val
  }
  try {
    const json = JSON.stringify(val)
    if (json.length > 80) return json.slice(0, 80) + '...'
    return json
  } catch {
    return String(val)
  }
}

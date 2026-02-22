'use client'

import {
  Check,
  X,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { RemyTaskResult } from '@/lib/ai/remy-types'

interface RemyTaskCardProps {
  task: RemyTaskResult
  onApprove?: (taskId: string, taskType: string, data: unknown) => void
  onReject?: (taskId: string) => void
  onSave?: (taskId: string, taskType: string, taskName: string, data: unknown) => void
  saved?: boolean
}

export function RemyTaskCard({ task, onApprove, onReject, onSave, saved }: RemyTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const errorText: string | null = task.status === 'error' && task.error ? task.error : null
  const holdText: string | null = task.status === 'held' && task.holdReason ? task.holdReason : null

  const tierColors = {
    done: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950',
    pending: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    held: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
  }

  const statusIcons = {
    done: <Check className="h-3.5 w-3.5 text-emerald-600" />,
    pending: <Clock className="h-3.5 w-3.5 text-amber-600" />,
    held: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
    error: <X className="h-3.5 w-3.5 text-red-600" />,
  }

  const statusLabels = {
    done: 'Completed',
    pending: 'Awaiting approval',
    held: 'Needs clarification',
    error: 'Error',
  }

  return (
    <div className={`rounded-lg border p-3 text-sm ${tierColors[task.status]}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcons[task.status]}
          <span className="font-medium text-stone-900 dark:text-stone-100">{task.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {statusLabels[task.status]}
          </span>
          {task.status !== 'error' && onSave && (
            <button
              onClick={() => onSave(task.taskId, task.taskType, task.name, task.data)}
              className={`p-0.5 rounded transition-colors ${
                saved
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-stone-400 hover:text-brand-600 dark:text-stone-500 dark:hover:text-brand-400'
              }`}
              title={saved ? 'Saved' : 'Save to Remy history'}
              disabled={saved}
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorText !== null ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errorText}</p>
      ) : null}

      {/* Hold reason */}
      {holdText !== null ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{holdText}</p>
      ) : null}

      {/* Data preview */}
      {task.data !== undefined && task.status !== 'error' && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && (
            <div className="mt-2 rounded bg-white/60 dark:bg-stone-800/60 p-2">
              <TaskDataRenderer taskType={task.taskType} data={task.data} />
            </div>
          )}
        </>
      )}

      {/* Approve / Reject buttons for tier 2 (pending) */}
      {task.status === 'pending' && (
        <div className="mt-2 flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove?.(task.taskId, task.taskType, task.data)}
          >
            <Check className="h-3 w-3 mr-1" />
            Approve
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onReject?.(task.taskId)}>
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Data Renderers ─────────────────────────────────────────────────────────

function TaskDataRenderer({ taskType, data }: { taskType: string; data: unknown }) {
  switch (taskType) {
    case 'client.search':
    case 'client.list_recent': {
      const d = data as { clients: Array<{ name: string; email?: string }> }
      if (!d.clients?.length) return <p className="text-xs text-stone-500">No clients found.</p>
      return (
        <ul className="space-y-1">
          {d.clients.map((c, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{c.name}</span>
              {c.email && <span className="text-stone-400 ml-1">({c.email})</span>}
            </li>
          ))}
        </ul>
      )
    }

    case 'client.details': {
      const d = data as {
        found: boolean
        client?: {
          name: string
          email: string
          phone: string
          status: string
          dietaryRestrictions: string
        }
      }
      if (!d.found || !d.client) return <p className="text-xs text-stone-500">Client not found.</p>
      return (
        <div className="space-y-0.5 text-xs">
          <p>
            <span className="font-medium">Name:</span> {d.client.name}
          </p>
          {d.client.email && (
            <p>
              <span className="font-medium">Email:</span> {d.client.email}
            </p>
          )}
          {d.client.phone && (
            <p>
              <span className="font-medium">Phone:</span> {d.client.phone}
            </p>
          )}
          <p>
            <span className="font-medium">Status:</span> {d.client.status}
          </p>
          {d.client.dietaryRestrictions && (
            <p>
              <span className="font-medium">Dietary:</span> {d.client.dietaryRestrictions}
            </p>
          )}
        </div>
      )
    }

    case 'calendar.availability': {
      const d = data as {
        date: string
        available: boolean
        conflicts?: Array<{ occasion: string; time: string }>
      }
      return (
        <div className="text-xs">
          <p>
            {d.date}: {d.available ? 'Available' : 'Not available'}
          </p>
          {d.conflicts?.map((c, i) => (
            <p key={i} className="text-stone-500 ml-2">
              • {c.occasion} at {c.time}
            </p>
          ))}
        </div>
      )
    }

    case 'event.list_upcoming':
    case 'event.list_by_status': {
      const d = data as {
        events: Array<{
          occasion: string | null
          date: string | null
          clientName: string
          status: string
        }>
      }
      if (!d.events?.length) return <p className="text-xs text-stone-500">No events found.</p>
      return (
        <ul className="space-y-1">
          {d.events.map((e, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{e.occasion ?? 'Event'}</span>
              <span className="text-stone-400">
                {' '}
                — {e.date ?? 'no date'} for {e.clientName} ({e.status})
              </span>
            </li>
          ))}
        </ul>
      )
    }

    case 'event.details': {
      const d = data as {
        found: boolean
        event?: {
          occasion: string
          date: string
          status: string
          guestCount: number
          clientName: string
        }
      }
      if (!d.found || !d.event) return <p className="text-xs text-stone-500">Event not found.</p>
      return (
        <div className="space-y-0.5 text-xs">
          <p>
            <span className="font-medium">Event:</span> {d.event.occasion}
          </p>
          <p>
            <span className="font-medium">Date:</span> {d.event.date}
          </p>
          <p>
            <span className="font-medium">Client:</span> {d.event.clientName}
          </p>
          <p>
            <span className="font-medium">Guests:</span> {d.event.guestCount ?? '?'}
          </p>
          <p>
            <span className="font-medium">Status:</span> {d.event.status}
          </p>
        </div>
      )
    }

    case 'inquiry.list_open': {
      const d = data as {
        inquiries: Array<{ status: string; eventType: string | null; clientName: string }>
      }
      if (!d.inquiries?.length) return <p className="text-xs text-stone-500">No open inquiries.</p>
      return (
        <ul className="space-y-1">
          {d.inquiries.map((inq, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{inq.clientName}</span>
              <span className="text-stone-400">
                {' '}
                — {inq.eventType ?? 'inquiry'} ({inq.status})
              </span>
            </li>
          ))}
        </ul>
      )
    }

    case 'finance.summary':
    case 'finance.monthly_snapshot': {
      const d = data as {
        totalRevenueCents?: number
        netRevenueCents?: number
        totalTipsCents?: number
        eventCount?: number
        completedCount?: number
      }
      return (
        <div className="space-y-0.5 text-xs">
          {d.totalRevenueCents !== undefined && (
            <p>
              <span className="font-medium">Revenue:</span> $
              {(d.totalRevenueCents / 100).toFixed(2)}
            </p>
          )}
          {d.netRevenueCents !== undefined && (
            <p>
              <span className="font-medium">Net Revenue:</span> $
              {(d.netRevenueCents / 100).toFixed(2)}
            </p>
          )}
          {d.totalTipsCents !== undefined && d.totalTipsCents > 0 && (
            <p>
              <span className="font-medium">Tips:</span> ${(d.totalTipsCents / 100).toFixed(2)}
            </p>
          )}
          {d.eventCount !== undefined && (
            <p>
              <span className="font-medium">Events:</span> {d.eventCount}
              {d.completedCount !== undefined ? ` (${d.completedCount} completed)` : ''}
            </p>
          )}
        </div>
      )
    }

    case 'recipe.search': {
      const d = data as { recipes: Array<{ name: string; category: string; timesCooked: number }> }
      if (!d.recipes?.length) return <p className="text-xs text-stone-500">No recipes found.</p>
      return (
        <ul className="space-y-1">
          {d.recipes.map((r, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{r.name}</span>
              <span className="text-stone-400">
                {' '}
                — {r.category} (cooked {r.timesCooked}x)
              </span>
            </li>
          ))}
        </ul>
      )
    }

    case 'menu.list': {
      const d = data as { menus: Array<{ name: string; status: string }> }
      if (!d.menus?.length) return <p className="text-xs text-stone-500">No menus found.</p>
      return (
        <ul className="space-y-1">
          {d.menus.map((m, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{m.name}</span>
              <span className="text-stone-400"> ({m.status})</span>
            </li>
          ))}
        </ul>
      )
    }

    case 'email.followup': {
      const d = data as { clientName: string; draftText: string }
      return (
        <div className="text-xs">
          <p className="font-medium mb-1">Draft for {d.clientName}:</p>
          <pre className="whitespace-pre-wrap font-sans text-stone-600 dark:text-stone-300 bg-white/50 dark:bg-stone-900/50 rounded p-2">
            {d.draftText}
          </pre>
        </div>
      )
    }

    case 'scheduling.next_available': {
      const d = data as { nextAvailable: string | null; daysFromStart?: number; message?: string }
      if (!d.nextAvailable)
        return <p className="text-xs text-stone-500">{d.message ?? 'No availability found.'}</p>
      return (
        <p className="text-xs">
          <span className="font-medium">Next available:</span> {d.nextAvailable}
          {d.daysFromStart !== undefined && d.daysFromStart > 0 && ` (${d.daysFromStart} days out)`}
        </p>
      )
    }

    default:
      return (
        <pre className="whitespace-pre-wrap font-mono text-xs text-stone-500 max-h-32 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
  }
}

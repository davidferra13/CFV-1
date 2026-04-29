'use client'

import { Check, X, AlertTriangle, Clock, ChevronDown, ChevronUp } from '@/components/ui/icons'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { RemyTaskResult } from '@/lib/ai/remy-types'
import { AgentConfirmationCard } from '@/components/ai/agent-confirmation-card'
import {
  buildSignificantApprovalPhrase,
  isLegacySignificantTaskType,
  normalizeSignificantApprovalInput,
} from '@/lib/ai/remy-significant-approval'

interface RemyTaskCardProps {
  task: RemyTaskResult
  onApprove?: (
    taskId: string,
    taskType: string,
    data: unknown,
    approvalConfirmation?: string
  ) => void
  onReject?: (taskId: string) => void
}

export function RemyTaskCard({ task, onApprove, onReject }: RemyTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [legacyApprovalText, setLegacyApprovalText] = useState('')
  const errorText: string | null = task.status === 'error' && task.error ? task.error : null
  const holdText: string | null = task.status === 'held' && task.holdReason ? task.holdReason : null
  const isLegacySignificantPending =
    task.status === 'pending' && !task.preview && isLegacySignificantTaskType(task.taskType)
  const expectedLegacyPhrase = isLegacySignificantPending
    ? buildSignificantApprovalPhrase(task.taskType)
    : ''
  const legacyConfirmationMatches =
    !isLegacySignificantPending ||
    normalizeSignificantApprovalInput(legacyApprovalText) === expectedLegacyPhrase
  const showLegacyPhraseMismatch =
    isLegacySignificantPending && legacyApprovalText.trim().length > 0 && !legacyConfirmationMatches

  const tierColors = {
    done: 'border-emerald-200 bg-emerald-950 dark:border-emerald-800 dark:bg-emerald-950',
    pending: 'border-amber-200 bg-amber-950 dark:border-amber-800 dark:bg-amber-950',
    held: 'border-red-200 bg-red-950 dark:border-red-800 dark:bg-red-950',
    error: 'border-red-200 bg-red-950 dark:border-red-800 dark:bg-red-950',
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
          <span className="font-medium text-stone-100 dark:text-stone-100">{task.name}</span>
        </div>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {statusLabels[task.status]}
        </span>
      </div>

      {/* Error message */}
      {errorText !== null ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errorText}</p>
      ) : null}

      {/* Hold reason */}
      {holdText !== null ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{holdText}</p>
      ) : null}

      {/* Agent action confirmation card */}
      {task.preview && (task.status === 'pending' || task.status === 'held') ? (
        <div className="mt-2">
          <AgentConfirmationCard
            preview={task.preview}
            taskId={task.taskId}
            taskType={task.taskType}
            data={task.data}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      ) : (
        <>
          {/* Legacy data preview */}
          {task.data !== undefined && task.status !== 'error' && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 dark:text-stone-400 dark:hover:text-stone-200"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Hide details' : 'Show details'}
              </button>
              {expanded && (
                <div className="mt-2 rounded bg-stone-900/60 dark:bg-stone-800/60 p-2">
                  <TaskDataRenderer taskType={task.taskType} data={task.data} />
                </div>
              )}
            </>
          )}

          {/* Legacy approve / reject buttons for tier 2 (pending) without preview */}
          {task.status === 'pending' && !task.preview && (
            <div className="mt-2 space-y-2">
              {isLegacySignificantPending && (
                <div className="rounded-md border border-amber-800/70 bg-amber-950/40 p-2">
                  <p className="text-xs text-amber-200">
                    This is a significant action. Type{' '}
                    <span className="font-mono text-amber-100">{expectedLegacyPhrase}</span> to
                    confirm.
                  </p>
                  <input
                    type="text"
                    value={legacyApprovalText}
                    onChange={(event) => setLegacyApprovalText(event.target.value)}
                    className="mt-1.5 w-full rounded-md border border-amber-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder={expectedLegacyPhrase}
                    aria-label="Approval confirmation phrase"
                  />
                  {showLegacyPhraseMismatch && (
                    <p className="mt-1 text-xs-tight text-amber-300">Phrase does not match yet.</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    onApprove?.(task.taskId, task.taskType, task.data, legacyApprovalText)
                  }
                  disabled={!legacyConfirmationMatches}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onReject?.(task.taskId)}>
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </>
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
                - {e.date ?? 'no date'} for {e.clientName} ({e.status})
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
                - {inq.eventType ?? 'inquiry'} ({inq.status})
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
                - {r.category} (cooked {r.timesCooked}x)
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
          <pre className="whitespace-pre-wrap font-sans text-stone-400 dark:text-stone-300 bg-stone-900/50 dark:bg-stone-900/50 rounded p-2">
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

    case 'radar.latest':
    case 'radar.safety':
    case 'radar.opportunities': {
      const d = data as {
        matches: Array<{
          id: string
          title: string
          category: string
          severity: string
          sourceName: string
          sourceUrl: string
          matchedReason: string
          impactSummary: string
          route?: string
        }>
        count: number
        unavailable?: boolean
        error?: string
        sourceFreshness?: string
        unavailableSources?: string[]
      }
      if (d.unavailable) {
        return <p className="text-xs text-amber-500">{d.error ?? 'Culinary Radar unavailable.'}</p>
      }
      if (!d.matches?.length) {
        return <p className="text-xs text-stone-500">No active Culinary Radar matches found.</p>
      }
      return (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">
            {d.count} Radar match{d.count === 1 ? '' : 'es'}
            {d.sourceFreshness ? ` - ${d.sourceFreshness}` : ''}
          </p>
          {d.matches.map((match) => (
            <div key={match.id} className="text-xs border-l-2 border-amber-400/60 pl-2">
              <a
                href={match.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {match.title}
              </a>
              <p className="mt-0.5 text-stone-500 dark:text-stone-400">
                {match.severity} - {match.category} - {match.sourceName}
              </p>
              <p className="mt-0.5 text-stone-500 dark:text-stone-400 line-clamp-2">
                {match.matchedReason}
              </p>
              <p className="mt-0.5 text-stone-400 dark:text-stone-300 line-clamp-2">
                {match.impactSummary}
              </p>
            </div>
          ))}
          {d.unavailableSources && d.unavailableSources.length > 0 && (
            <p className="text-xxs text-amber-500">
              Degraded sources: {d.unavailableSources.join(', ')}
            </p>
          )}
        </div>
      )
    }

    case 'radar.explain_item': {
      const d = data as {
        found: boolean
        message?: string
        match?: {
          title: string
          severity: string
          sourceName: string
          sourceUrl: string
          matchedReason: string
          impactSummary: string
        }
        reasons?: string[]
        recommendedActions?: string[]
      }
      if (!d.found || !d.match) {
        return <p className="text-xs text-stone-500">{d.message ?? 'Radar item not found.'}</p>
      }
      return (
        <div className="space-y-2 text-xs">
          <a
            href={d.match.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            {d.match.title}
          </a>
          <p className="text-stone-500">
            {d.match.severity} from {d.match.sourceName}
          </p>
          <ul className="list-disc pl-4 text-stone-500 dark:text-stone-400">
            {(d.reasons ?? [d.match.matchedReason]).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {(d.recommendedActions ?? []).length > 0 && (
            <p className="text-stone-400 dark:text-stone-300">
              Next: {(d.recommendedActions ?? []).join(' ')}
            </p>
          )}
        </div>
      )
    }

    case 'web.search': {
      const d = data as {
        query: string
        results: Array<{ title: string; snippet: string; url: string }>
      }
      if (!d.results?.length) return <p className="text-xs text-stone-500">No web results found.</p>
      return (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">Results for &quot;{d.query}&quot;</p>
          {d.results.map((r, i) => (
            <div key={i} className="text-xs border-l-2 border-brand-400/50 pl-2">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {r.title}
              </a>
              <p className="text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">{r.snippet}</p>
              <p className="text-stone-300 dark:text-stone-400 text-xxs truncate">{r.url}</p>
            </div>
          ))}
        </div>
      )
    }

    case 'web.read': {
      const d = data as { url: string; title: string; summary: string }
      return (
        <div className="text-xs">
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            {d.title}
          </a>
          <p className="text-stone-400 dark:text-stone-300 mt-1 whitespace-pre-wrap line-clamp-6">
            {d.summary}
          </p>
        </div>
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

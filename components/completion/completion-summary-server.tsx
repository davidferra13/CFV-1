// Server-side wrapper for CompletionSummaryWidget
// Fetches data during SSR to avoid client-side server action hanging issues.

import { requireChef } from '@/lib/auth/get-user'
import { evaluateCompletion } from '@/lib/completion/engine'
import { pgClient } from '@/lib/db/index'
import Link from 'next/link'

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#b15c26'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function MiniRing({ score }: { score: number }) {
  const r = 12
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="32" height="32" className="shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(120,113,108,0.2)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 16 16)"
      />
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-stone-300"
        style={{ fontSize: '9px', fontWeight: 600 }}
      >
        {score}
      </text>
    </svg>
  )
}

function statusLabel(status: string): { text: string; cls: string } {
  if (status === 'complete') return { text: 'Ready', cls: 'text-emerald-400' }
  if (status === 'partial') return { text: 'In progress', cls: 'text-amber-400' }
  return { text: 'Needs work', cls: 'text-red-400' }
}

export async function CompletionSummaryWidgetServer() {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const events = await pgClient<
    { id: string; occasion: string | null; event_date: string | null }[]
  >`
    SELECT id, occasion, event_date
    FROM events
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('completed', 'cancelled')
      AND event_date >= CURRENT_DATE
      AND event_date <= CURRENT_DATE + INTERVAL '30 days'
      AND deleted_at IS NULL
    ORDER BY event_date ASC
    LIMIT 10
  `

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-2">Event Readiness</h3>
        <p className="text-xs text-stone-500">No upcoming events in the next 30 days</p>
      </div>
    )
  }

  const results: {
    eventId: string
    eventName: string
    eventDate: string | null
    score: number
    status: string
    nextAction: { label: string; url: string } | null
  }[] = []

  for (const ev of events) {
    try {
      const result = await evaluateCompletion('event', ev.id, tenantId, { shallow: true })
      if (result) {
        results.push({
          eventId: ev.id,
          eventName: ev.occasion || 'Untitled event',
          eventDate: ev.event_date,
          score: result.score,
          status: result.status,
          nextAction: result.nextAction,
        })
      }
    } catch (err) {
      console.error(`[Completion] dashboard event ${ev.id} failed:`, err)
    }
  }

  results.sort((a, b) => a.score - b.score)

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-2">Event Readiness</h3>
        <p className="text-xs text-stone-500">Could not evaluate upcoming events</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3">Event Readiness</h3>
      <div className="space-y-2">
        {results.map((ev) => {
          const sl = statusLabel(ev.status)
          return (
            <div key={ev.eventId} className="flex items-center gap-3 py-1">
              <MiniRing score={ev.score} />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/events/${ev.eventId}`}
                  className="text-xs font-medium text-stone-200 hover:text-stone-100 truncate block"
                >
                  {ev.eventName}
                </Link>
                <div className="flex items-center gap-2">
                  {ev.eventDate && (
                    <span className="text-[10px] text-stone-500">
                      {new Date(ev.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  <span className={`text-[10px] ${sl.cls}`}>{sl.text}</span>
                </div>
              </div>
              {ev.nextAction && (
                <Link
                  href={ev.nextAction.url}
                  className="text-[10px] text-brand-400 hover:text-brand-300 shrink-0"
                >
                  {ev.nextAction.label}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

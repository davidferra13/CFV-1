// Engagement scoring — computes a client's engagement level from their activity history.
// Pure function: no DB writes, no server imports. Call it after fetching activity events.

import type { ActivityEvent, ActivityEventType } from './types'

export type EngagementLevel = 'hot' | 'warm' | 'cold' | 'none'

export type EngagementScore = {
  level: EngagementLevel
  score: number          // 0–100
  signals: string[]      // Human-readable reasons (e.g. "Visited payment page")
  lastActivityAt: string | null
  sessionCount: number
}

// Score weight per event type. Higher = more intent signal.
const EVENT_WEIGHTS: Partial<Record<ActivityEventType, number>> = {
  payment_page_visited: 40,
  proposal_viewed:      30,
  quote_viewed:         20,
  invoice_viewed:       15,
  event_viewed:         15,
  chat_opened:          10,
  chat_message_sent:    10,
  portal_login:          5,
  rewards_viewed:        5,
  events_list_viewed:    3,
  quotes_list_viewed:    3,
  document_downloaded:   8,
  rsvp_submitted:       12,
  form_submitted:        8,
  session_heartbeat:     2,
  page_viewed:           2,
}

// Human-readable signal labels for surfacing in UI tooltips
const SIGNAL_LABELS: Partial<Record<ActivityEventType, string>> = {
  payment_page_visited: 'Visited payment page',
  proposal_viewed:      'Viewed your proposal',
  quote_viewed:         'Reviewed a quote',
  invoice_viewed:       'Viewed an invoice',
  event_viewed:         'Viewed event details',
  chat_message_sent:    'Sent a message',
  document_downloaded:  'Downloaded a document',
  rsvp_submitted:       'Submitted RSVP',
}

// Session detection: events < 30 minutes apart are the same session
const SESSION_GAP_MS = 30 * 60 * 1000

function countSessions(events: ActivityEvent[]): number {
  if (events.length === 0) return 0
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  let sessions = 1
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      new Date(sorted[i].created_at).getTime() -
      new Date(sorted[i - 1].created_at).getTime()
    if (gap > SESSION_GAP_MS) sessions++
  }
  return sessions
}

/**
 * Compute an engagement score for a client from their recent activity.
 *
 * @param events - Array of activity events (from getClientTimeline or getActivityFeed)
 * @param windowDays - How far back to look (default: 14 days)
 */
export function computeEngagementScore(
  events: ActivityEvent[],
  windowDays = 14
): EngagementScore {
  if (events.length === 0) {
    return { level: 'none', score: 0, signals: [], lastActivityAt: null, sessionCount: 0 }
  }

  const now = Date.now()
  const windowMs = windowDays * 24 * 60 * 60 * 1000

  // Only count events within the window
  const recent = events.filter(
    e => now - new Date(e.created_at).getTime() < windowMs
  )

  if (recent.length === 0) {
    return { level: 'none', score: 0, signals: [], lastActivityAt: null, sessionCount: 0 }
  }

  let rawScore = 0
  const triggeredLabels = new Set<string>()

  for (const event of recent) {
    const ageMs = now - new Date(event.created_at).getTime()
    // Recency multiplier: 1.0 for brand-new, 0.1 at the edge of the window
    const recencyMultiplier = Math.max(0.1, 1 - ageMs / windowMs)
    const weight = EVENT_WEIGHTS[event.event_type] ?? 1
    rawScore += weight * recencyMultiplier

    const label = SIGNAL_LABELS[event.event_type]
    if (label) triggeredLabels.add(label)
  }

  const score = Math.min(100, Math.round(rawScore))
  const level: EngagementLevel =
    score >= 60 ? 'hot' :
    score >= 25 ? 'warm' :
    score >  0  ? 'cold' : 'none'

  // Most recent event timestamp
  const lastActivityAt = recent
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    ?.created_at ?? null

  return {
    level,
    score,
    signals: Array.from(triggeredLabels),
    lastActivityAt,
    sessionCount: countSessions(recent),
  }
}

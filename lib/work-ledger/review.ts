interface SessionWindow {
  actor_type: string
  activity_type: string
  event_id: string | null
  client_id: string | null
  project_key: string | null
  started_at: string | null
  ended_at: string | null
  duration_kind: string
  confidence_tier: string
  summary: string
}

function minutes(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60_000)
}

export function splitSessionWindow(session: SessionWindow, splitAt: string) {
  if (!session.started_at || !session.ended_at) {
    throw new Error('Only bounded sessions can be split')
  }
  if (splitAt <= session.started_at || splitAt >= session.ended_at) {
    throw new Error('Split point must be inside the session')
  }
  return [
    {
      ...session,
      ended_at: splitAt,
      duration_minutes: minutes(session.started_at, splitAt),
      summary: `${session.summary} (part 1)`,
    },
    {
      ...session,
      started_at: splitAt,
      duration_minutes: minutes(splitAt, session.ended_at),
      summary: `${session.summary} (part 2)`,
    },
  ]
}

export function mergeSessionWindows(sessions: [SessionWindow, SessionWindow]) {
  const [first, second] = [...sessions].sort((a, b) =>
    (a.started_at ?? '').localeCompare(b.started_at ?? '')
  )
  if (!first.started_at || !first.ended_at || !second.started_at || !second.ended_at) {
    throw new Error('Only bounded sessions can be merged')
  }
  if (first.actor_type !== second.actor_type || first.activity_type !== second.activity_type) {
    throw new Error('Merged sessions must have the same actor and activity')
  }
  const gap = minutes(first.ended_at, second.started_at)
  if (gap < 0) throw new Error('Overlapping sessions require correction before merge')
  return {
    ...first,
    ended_at: second.ended_at,
    duration_minutes: minutes(first.started_at, second.ended_at),
    duration_kind: gap > 0 ? 'inferred' : first.duration_kind,
    confidence_tier: 'corroborated',
    boundary_gap: gap > 0 ? `${gap} minute gap retained in merged interpretation.` : null,
    summary: `${first.summary}; ${second.summary}`,
  }
}

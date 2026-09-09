import type { InferredWorkSession, WorkEvidenceInput } from './types'

function durationMinutes(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return null
  const value = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000)
  return Number.isFinite(value) && value >= 0 ? value : null
}

function evidenceToSession(evidence: WorkEvidenceInput): InferredWorkSession {
  const startedAt = evidence.intervalStart ?? evidence.sourceCreatedAt ?? null
  const endedAt = evidence.intervalEnd ?? null
  const minutes = durationMinutes(startedAt, endedAt)
  const needsIndependentSignal = evidence.signalType === 'location_visit'

  return {
    actorType: evidence.actorType,
    activityType: evidence.activityHint ?? 'other_business',
    startedAt,
    endedAt,
    durationMinutes: minutes,
    durationKind: minutes === null ? 'unknown' : 'observed_window',
    status: minutes === null || needsIndependentSignal ? 'review_required' : 'proposed',
    confidenceTier: minutes === null ? 'unknown' : 'observed',
    creationMode: 'forward_inference',
    summary:
      minutes === null
        ? `${evidence.sourceType} activity anchor; duration is not known`
        : `${evidence.sourceType} observed activity window`,
    evidenceIds: [evidence.id],
    sourceTypes: [evidence.sourceType],
    eventId: evidence.eventId ?? null,
    clientId: evidence.clientId ?? null,
    projectKey: evidence.projectKey ?? null,
    boundaryGap:
      minutes === null
        ? 'Only one timestamp is available.'
        : needsIndependentSignal
          ? 'Location context needs an independent signal before proposal.'
          : null,
  }
}

export function inferWorkSessions(evidence: WorkEvidenceInput[]): InferredWorkSession[] {
  const ordered = [...evidence]
    .sort((a, b) => {
      const aTime = a.intervalStart ?? a.sourceCreatedAt ?? ''
      const bTime = b.intervalStart ?? b.sourceCreatedAt ?? ''
      return aTime.localeCompare(bTime) || a.id.localeCompare(b.id)
    })
    .map(evidenceToSession)

  return ordered.reduce<InferredWorkSession[]>((sessions, current) => {
    const previous = sessions.at(-1)
    const gap =
      previous?.endedAt && current.startedAt
        ? (Date.parse(current.startedAt) - Date.parse(previous.endedAt)) / 60_000
        : null
    const sameContext =
      previous &&
      previous.actorType === current.actorType &&
      previous.activityType === current.activityType &&
      previous.eventId === current.eventId &&
      previous.clientId === current.clientId &&
      previous.projectKey === current.projectKey

    if (sameContext && gap !== null && gap <= 10 && previous.startedAt && current.endedAt) {
      const latestEnd =
        previous.endedAt && previous.endedAt > current.endedAt ? previous.endedAt : current.endedAt
      previous.endedAt = latestEnd
      previous.durationMinutes = durationMinutes(previous.startedAt, latestEnd)
      previous.durationKind = gap > 0 ? 'inferred' : 'observed_window'
      previous.confidenceTier = 'corroborated'
      previous.evidenceIds.push(...current.evidenceIds)
      previous.sourceTypes = [...new Set([...previous.sourceTypes, ...current.sourceTypes])]
      if (previous.activityType === 'travel' && previous.sourceTypes.length >= 2) {
        previous.status = 'proposed'
      }
      previous.summary = `${previous.activityType} supported by ${previous.evidenceIds.length} signals`
      previous.boundaryGap = gap > 0 ? `${gap} minute gap bridged by the merge rule.` : null
      return sessions
    }

    sessions.push(current)
    return sessions
  }, [])
}

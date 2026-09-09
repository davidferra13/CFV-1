import type { WorkActorType, WorkSessionStatus } from './types'

interface SummarizableSession {
  actorType: WorkActorType
  status: WorkSessionStatus
  durationMinutes: number | null
}

export type ApprovedWorkSummary = Record<WorkActorType, number>

export function summarizeApprovedWork(sessions: SummarizableSession[]): ApprovedWorkSummary {
  const totals: ApprovedWorkSummary = {
    david_active: 0,
    david_supervisory: 0,
    ai_agent_runtime: 0,
    staff: 0,
    system: 0,
  }

  for (const session of sessions) {
    if (session.status !== 'approved' || session.durationMinutes === null) continue
    totals[session.actorType] += session.durationMinutes
  }

  return totals
}

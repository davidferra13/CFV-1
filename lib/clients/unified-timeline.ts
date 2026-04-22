'use server'

import { getClientInteractionLedger } from './interaction-ledger'
import { projectInteractionLedgerToUnifiedTimeline } from './interaction-ledger-core'
import type { TimelineItemSource } from './unified-timeline-utils'

export type { TimelineItemSource } from './unified-timeline-utils'

export type UnifiedTimelineItem = {
  id: string
  source: TimelineItemSource
  timestamp: string
  summary: string
  detail?: string
  href?: string
  actor?: 'chef' | 'client' | 'system'
  badges?: string[]
  explanation?: string
}

export async function getUnifiedClientTimeline(
  clientId: string,
  limit = 60
): Promise<UnifiedTimelineItem[]> {
  const ledger = await getClientInteractionLedger(clientId, limit)
  return projectInteractionLedgerToUnifiedTimeline(ledger, limit)
}

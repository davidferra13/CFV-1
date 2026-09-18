import 'server-only'

import { pgClient } from '@/lib/db'
import {
  buildAppetiteMarketSnapshot,
  getAppetiteTag,
  type AppetiteEvidence,
  type AppetiteEvidenceAction,
  type AppetiteMarketSnapshot,
  type AppetiteSupplyObservation,
} from '@/lib/discovery/appetite-engine'

type AppetiteInteractionRow = {
  item_value: string
  created_at: string | Date
  event_context: Record<string, unknown> | null
}

const APPETITE_ACTIONS = new Set<AppetiteEvidenceAction>([
  'spin_seen',
  'lock',
  'unlock',
  'reject',
  'result_open',
  'shortlist',
  'conversion',
  'repeat',
])

function parseAppetiteAction(value: unknown): AppetiteEvidenceAction | null {
  return typeof value === 'string' && APPETITE_ACTIONS.has(value as AppetiteEvidenceAction)
    ? (value as AppetiteEvidenceAction)
    : null
}

function rowToEvidence(row: AppetiteInteractionRow): AppetiteEvidence | null {
  if (!getAppetiteTag(row.item_value)) return null
  const context = row.event_context
  if (!context || typeof context !== 'object') return null

  const action = parseAppetiteAction(context.appetite_action)
  if (!action) return null

  return {
    tagId: row.item_value,
    action,
    occurredAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    decisionId:
      typeof context.decision_id === 'string' && context.decision_id
        ? context.decision_id
        : undefined,
  }
}

export async function getAppetiteMarketSnapshot(input: {
  days?: number
  limit?: number
  supply?: readonly AppetiteSupplyObservation[]
} = {}): Promise<AppetiteMarketSnapshot> {
  const days = Math.min(365, Math.max(1, Math.floor(input.days ?? 30)))
  const limit = Math.min(20_000, Math.max(100, Math.floor(input.limit ?? 10_000)))

  const rows = await pgClient<AppetiteInteractionRow[]>`
    SELECT item_value, created_at, event_context
    FROM discovery_interactions
    WHERE item_type = 'culinary_signal'
      AND event_context ->> 'source' = 'eat_appetite'
      AND created_at >= now() - (${days} * interval '1 day')
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const evidence = rows
    .map(rowToEvidence)
    .filter((item): item is AppetiteEvidence => Boolean(item))

  return buildAppetiteMarketSnapshot(evidence, input.supply ?? [])
}
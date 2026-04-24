'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientHealthScores, type ClientHealthScore } from './health-score'
import { getClientInteractionLedger } from './interaction-ledger'
import {
  buildClientInteractionSignalSnapshot,
  type ClientInteractionSignalSnapshot,
  type ClientMilestoneRecord,
} from './interaction-signal-utils'

export type {
  ClientInteractionSignal,
  ClientInteractionSignalReason,
  ClientInteractionSignalSnapshot,
  ClientInteractionSignalType,
} from './interaction-signal-utils'

export async function getClientInteractionSignals(
  clientId: string
): Promise<ClientInteractionSignalSnapshot> {
  const signalMap = await getClientInteractionSignalMap([clientId])
  return (
    signalMap.get(clientId) ?? {
      clientId,
      ordered: [],
      byType: {},
    }
  )
}

export async function getClientInteractionSignalMap(
  clientIds: string[],
  options?: {
    healthScoreByClientId?: Map<string, ClientHealthScore>
    milestoneByClientId?: Map<string, ClientMilestoneRecord>
  }
): Promise<Map<string, ClientInteractionSignalSnapshot>> {
  const uniqueClientIds = [...new Set(clientIds.filter(Boolean))]
  const empty = new Map<string, ClientInteractionSignalSnapshot>()

  if (uniqueClientIds.length === 0) {
    return empty
  }

  let healthScoreByClientId = options?.healthScoreByClientId
  let milestoneByClientId = options?.milestoneByClientId

  if (!healthScoreByClientId || !milestoneByClientId) {
    const user = await requireChef()
    const db: any = createServerClient()
    const tenantId = user.tenantId!

    const [{ scores }, { data: clientRows }] = await Promise.all([
      healthScoreByClientId
        ? Promise.resolve({ scores: Array.from(healthScoreByClientId.values()) })
        : getClientHealthScores(),
      milestoneByClientId
        ? Promise.resolve({ data: [] })
        : db
            .from('clients')
            .select('id, birthday, anniversary')
            .eq('tenant_id', tenantId)
            .in('id', uniqueClientIds),
    ])

    if (!healthScoreByClientId) {
      healthScoreByClientId = new Map(scores.map((score) => [score.clientId, score]))
    }

    if (!milestoneByClientId) {
      milestoneByClientId = new Map(
        (
          (clientRows ?? []) as Array<{
            id: string
            birthday: string | null
            anniversary: string | null
          }>
        ).map((row) => [
          row.id,
          {
            birthday: row.birthday ?? null,
            anniversary: row.anniversary ?? null,
          },
        ])
      )
    }
  }

  const ledgers = await Promise.all(
    uniqueClientIds.map(
      async (clientId) => [clientId, await getClientInteractionLedger(clientId)] as const
    )
  )

  for (const [clientId, ledger] of ledgers) {
    empty.set(
      clientId,
      buildClientInteractionSignalSnapshot({
        clientId,
        ledger,
        healthScore: healthScoreByClientId?.get(clientId) ?? null,
        milestones: milestoneByClientId?.get(clientId) ?? {
          birthday: null,
          anniversary: null,
        },
      })
    )
  }

  return empty
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { HandoffTimelineSchema } from './schemas'
import { handoffEventsTable, handoffRecipientsTable, handoffsTable } from './tables'
import { expireOverdueHandoffsForChef, getChefCardsById } from './helpers'
import type { CollabHandoffTimelineEvent } from './types'

export async function getCollabHandoffTimeline(
  input: z.infer<typeof HandoffTimelineSchema>
): Promise<CollabHandoffTimelineEvent[]> {
  const user = await requireChef()
  const validated = HandoffTimelineSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeLimit = validated.limit ?? 40

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')

  let canView = handoff.from_chef_id === user.entityId
  if (!canView) {
    const { data: recipientRow } = await handoffRecipientsTable(db)
      .select('id')
      .eq('handoff_id', validated.handoffId)
      .eq('recipient_chef_id', user.entityId)
      .maybeSingle()
    canView = Boolean(recipientRow)
  }

  if (!canView) throw new Error('Access denied for this handoff timeline.')

  const { data: timelineRows } = await handoffEventsTable(db)
    .select('id, handoff_id, actor_chef_id, event_type, metadata, created_at')
    .eq('handoff_id', validated.handoffId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const actorIds = Array.from(
    new Set(((timelineRows ?? []) as any[]).map((row) => row.actor_chef_id).filter(Boolean))
  )
  const actorMap = await getChefCardsById(db, actorIds)

  return ((timelineRows ?? []) as any[]).map((row) => ({
    id: row.id,
    handoff_id: row.handoff_id,
    event_type: row.event_type,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    actor: row.actor_chef_id ? (actorMap.get(row.actor_chef_id) ?? null) : null,
  }))
}

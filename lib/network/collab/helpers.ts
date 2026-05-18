import { deriveHandoffStatusFromRecipientStatuses as deriveHandoffStatusFromRecipients } from '@/lib/network/collab-logic'
import {
  chefConnectionsTable,
  handoffEventsTable,
  handoffRecipientsTable,
  handoffsTable,
  socialNotificationsTable,
} from './tables'
import type {
  CollabChefCard,
  CollabSocialNotificationType,
  HandoffEventType,
  HandoffRecipientStatus,
} from './types'

export async function getConnectedChefIds(db: any, chefId: string): Promise<Set<string>> {
  const { data } = await chefConnectionsTable(db)
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${chefId},addressee_id.eq.${chefId}`)

  const connectedIds = new Set<string>()
  for (const row of (data ?? []) as any[]) {
    connectedIds.add(row.requester_id === chefId ? row.addressee_id : row.requester_id)
  }
  return connectedIds
}

export async function getChefCardsById(
  db: any,
  chefIds: string[]
): Promise<Map<string, CollabChefCard>> {
  const uniqueIds = Array.from(new Set(chefIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map()

  const { data } = await db
    .from('chefs')
    .select(
      `id, display_name, business_name, profile_image_url,
       chef_preferences!chef_preferences_chef_id_fkey(home_city, home_state)`
    )
    .in('id', uniqueIds)

  const map = new Map<string, CollabChefCard>()
  for (const row of (data ?? []) as any[]) {
    const prefs = Array.isArray(row.chef_preferences)
      ? row.chef_preferences[0]
      : row.chef_preferences
    map.set(row.id, {
      chef_id: row.id,
      display_name: row.display_name ?? null,
      business_name: row.business_name ?? 'Unknown',
      profile_image_url: row.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
    })
  }
  return map
}

export async function logHandoffEvent(
  db: any,
  input: {
    handoffId: string
    actorChefId: string
    eventType: HandoffEventType
    metadata?: Record<string, any>
  }
) {
  await handoffEventsTable(db).insert({
    handoff_id: input.handoffId,
    actor_chef_id: input.actorChefId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  })
}

export async function createCollabSocialNotifications(
  db: any,
  input: {
    recipients: string[]
    actorChefId: string
    notificationType: CollabSocialNotificationType
    handoffId: string
  }
) {
  if (input.recipients.length === 0) return
  try {
    const rows = input.recipients
      .filter((recipientId) => recipientId !== input.actorChefId)
      .map((recipientId) => ({
        recipient_chef_id: recipientId,
        actor_chef_id: input.actorChefId,
        notification_type: input.notificationType,
        entity_type: 'handoff',
        entity_id: input.handoffId,
      }))

    if (rows.length === 0) return
    await socialNotificationsTable(db).insert(rows)
  } catch (error) {
    console.error('[createCollabSocialNotifications] Non-blocking error:', error)
  }
}

export async function recomputeHandoffStatus(
  db: any,
  handoffId: string,
  actorChefId: string
): Promise<void> {
  const { data: handoff } = await handoffsTable(db).select('status').eq('id', handoffId).single()
  if (!handoff) return
  if (handoff.status === 'cancelled' || handoff.status === 'expired') return

  const { data: recipients } = await handoffRecipientsTable(db)
    .select('status')
    .eq('handoff_id', handoffId)

  const statuses: HandoffRecipientStatus[] = (recipients ?? []).map(
    (row: any) => row.status as HandoffRecipientStatus
  )
  const nextStatus = deriveHandoffStatusFromRecipients(statuses)

  if (handoff.status !== nextStatus) {
    await handoffsTable(db).update({ status: nextStatus }).eq('id', handoffId)
    await logHandoffEvent(db, {
      handoffId,
      actorChefId,
      eventType: 'status_recomputed',
      metadata: { status: nextStatus },
    })
  }
}

function chunkValues<T>(values: T[], size: number): T[][] {
  if (values.length === 0) return []
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

async function getExpiredHandoffIdsByCandidateIds(
  db: any,
  candidateIds: string[],
  nowIso: string
): Promise<string[]> {
  const uniqueIds = Array.from(new Set(candidateIds.filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const expiredIds: string[] = []
  for (const idBatch of chunkValues(uniqueIds, 200)) {
    const { data, error } = await handoffsTable(db)
      .select('id')
      .in('id', idBatch)
      .in('status', ['open', 'partially_accepted'])
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)

    if (error) {
      console.error('[getExpiredHandoffIdsByCandidateIds] Error:', error)
      continue
    }
    expiredIds.push(...((data ?? []) as any[]).map((row) => row.id))
  }

  return Array.from(new Set(expiredIds))
}

export async function expireOverdueHandoffsForChef(
  db: any,
  chefId: string
): Promise<{ expiredIds: string[] }> {
  const nowIso = new Date().toISOString()
  const expiredCandidateIds = new Set<string>()

  const { data: authoredHandoffs, error: authoredError } = await handoffsTable(db)
    .select('id')
    .eq('from_chef_id', chefId)
    .in('status', ['open', 'partially_accepted'])
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)

  if (authoredError) {
    console.error('[expireOverdueHandoffsForChef] authored query error:', authoredError)
  } else {
    for (const row of (authoredHandoffs ?? []) as any[]) expiredCandidateIds.add(row.id)
  }

  const { data: recipientRows, error: recipientError } = await handoffRecipientsTable(db)
    .select('handoff_id')
    .eq('recipient_chef_id', chefId)

  if (recipientError) {
    console.error('[expireOverdueHandoffsForChef] recipient query error:', recipientError)
  } else {
    const recipientHandoffIds = ((recipientRows ?? []) as any[]).map((row) => row.handoff_id)
    const recipientExpiredIds = await getExpiredHandoffIdsByCandidateIds(
      db,
      recipientHandoffIds,
      nowIso
    )
    for (const handoffId of recipientExpiredIds) expiredCandidateIds.add(handoffId)
  }

  const candidateList = Array.from(expiredCandidateIds)
  if (candidateList.length === 0) return { expiredIds: [] }

  const { data: expiredRows, error: expireError } = await handoffsTable(db)
    .update({ status: 'expired' })
    .in('id', candidateList)
    .in('status', ['open', 'partially_accepted'])
    .select('id')

  if (expireError) {
    console.error('[expireOverdueHandoffsForChef] status update error:', expireError)
    return { expiredIds: [] }
  }

  const expiredIds = ((expiredRows ?? []) as any[]).map((row) => row.id)
  if (expiredIds.length === 0) return { expiredIds: [] }

  const { error: recipientWithdrawError } = await handoffRecipientsTable(db)
    .update({ status: 'withdrawn', responded_at: nowIso })
    .in('handoff_id', expiredIds)
    .in('status', ['sent', 'viewed'])

  if (recipientWithdrawError) {
    console.error('[expireOverdueHandoffsForChef] recipient update error:', recipientWithdrawError)
  }

  for (const handoffId of expiredIds) {
    await logHandoffEvent(db, {
      handoffId,
      actorChefId: chefId,
      eventType: 'status_recomputed',
      metadata: { status: 'expired', reason: 'expires_at_passed' },
    })
  }

  return { expiredIds }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computeCollabMetrics, type CollabMetrics } from '@/lib/network/collab-metrics'
import { handoffRecipientsTable, handoffsTable } from './tables'
import { expireOverdueHandoffsForChef } from './helpers'
import type { HandoffRecipientStatus, HandoffStatus } from './types'

export async function getCollabUnreadCount(): Promise<number> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { count, error } = await handoffRecipientsTable(db)
    .select('*', { count: 'exact', head: true })
    .eq('recipient_chef_id', user.entityId)
    .eq('status', 'sent')

  if (error) {
    console.error('[getCollabUnreadCount] Error:', error)
    return 0
  }

  return count ?? 0
}

export async function getCollabMetrics(windowDays = 90): Promise<CollabMetrics> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeWindowDays = Math.min(Math.max(windowDays, 7), 365)
  const since = new Date()
  since.setDate(since.getDate() - safeWindowDays)
  const sinceIso = since.toISOString()

  const { data: outgoingHandoffs, error: outgoingError } = await handoffsTable(db)
    .select('id, status, created_at')
    .eq('from_chef_id', user.entityId)
    .gte('created_at', sinceIso)

  if (outgoingError) {
    console.error('[getCollabMetrics] outgoing query error:', outgoingError)
  }

  const outgoingIds = ((outgoingHandoffs ?? []) as any[]).map((row) => row.id)
  const { data: outgoingRecipients, error: recipientError } =
    outgoingIds.length === 0
      ? { data: [] as any[], error: null }
      : await handoffRecipientsTable(db)
          .select('handoff_id, status, responded_at')
          .in('handoff_id', outgoingIds)

  if (recipientError) {
    console.error('[getCollabMetrics] outgoing recipients query error:', recipientError)
  }

  const { data: incomingRecipients, error: incomingError } = await handoffRecipientsTable(db)
    .select('status')
    .eq('recipient_chef_id', user.entityId)
    .gte('created_at', sinceIso)

  if (incomingError) {
    console.error('[getCollabMetrics] incoming recipients query error:', incomingError)
  }

  return computeCollabMetrics({
    windowDays: safeWindowDays,
    outgoingHandoffs: ((outgoingHandoffs ?? []) as any[]).map((row) => ({
      id: row.id,
      status: row.status as HandoffStatus,
      created_at: row.created_at,
    })),
    outgoingRecipients: ((outgoingRecipients ?? []) as any[]).map((row) => ({
      handoff_id: row.handoff_id,
      status: row.status as HandoffRecipientStatus,
      responded_at: row.responded_at ?? null,
    })),
    incomingRecipients: ((incomingRecipients ?? []) as any[]).map((row) => ({
      status: row.status as HandoffRecipientStatus,
    })),
  })
}

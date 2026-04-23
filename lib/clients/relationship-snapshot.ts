'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getClientIntelligenceContext, type ClientIntelligenceContext } from '@/lib/intelligence/client-intelligence-context'
import { getClientOutreachHistory } from '@/lib/marketing/actions'
import { getClientHistory, type ClientHistoryEntry } from './client-history'
import { getRepeatClientIntelligence, type RepeatClientIntelligence } from './intelligence'
import { getClientNextBestAction, type NextBestAction } from './next-best-action'
import { getClientPatterns, learnClientPreferences, type ClientPattern } from './preference-learning-actions'
import {
  buildClientRelationshipSignalSnapshot,
  type ClientRelationshipSignalSnapshot,
} from './relationship-signals'

type RelationshipClientRecord = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  preferred_contact_method: string | null
  birthday: string | null
  anniversary: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  favorite_cuisines: string[] | null
  updated_at: string | null
}

export interface ClientRelationshipSnapshot {
  client: RelationshipClientRecord
  completedEvents: number
  nextAction: NextBestAction | null
  outreachHistory: Array<Record<string, unknown>>
  history: ClientHistoryEntry[]
  relationshipHealth: ClientIntelligenceContext | null
  repeat: RepeatClientIntelligence | null
  signals: ClientRelationshipSignalSnapshot
  generatedAt: string
}

async function getRelationshipPatterns(clientId: string): Promise<ClientPattern[]> {
  const existing = await getClientPatterns(clientId).catch(() => [])
  if (existing.length > 0) return existing
  return learnClientPreferences(clientId, { revalidate: false }).catch(() => [])
}

export async function getClientRelationshipSnapshot(
  clientId: string
): Promise<ClientRelationshipSnapshot | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select(
      'id, full_name, email, phone, preferred_contact_method, birthday, anniversary, dietary_restrictions, allergies, favorite_cuisines, updated_at'
    )
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return null

  const [
    nextAction,
    outreachHistory,
    relationshipHistory,
    relationshipHealth,
    repeat,
    patterns,
    completedEventsResponse,
  ] = await Promise.all([
    getClientNextBestAction(clientId).catch(() => null),
    getClientOutreachHistory(clientId).catch(() => []),
    getClientHistory(clientId, 8).catch(() => []),
    getClientIntelligenceContext(clientId).catch(() => null),
    getRepeatClientIntelligence(clientId).catch(() => null),
    getRelationshipPatterns(clientId),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .eq('status', 'completed'),
  ])

  return {
    client: client as RelationshipClientRecord,
    completedEvents: Number((completedEventsResponse as { count?: number } | null)?.count ?? 0),
    nextAction,
    outreachHistory: (outreachHistory as Array<Record<string, unknown>>) ?? [],
    history: relationshipHistory,
    relationshipHealth,
    repeat,
    signals: buildClientRelationshipSignalSnapshot(client as RelationshipClientRecord, patterns),
    generatedAt: new Date().toISOString(),
  }
}

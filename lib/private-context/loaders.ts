// Behind-the-Scenes data loaders for event detail pages
// Fetches private contexts, secrets, comp items, and suggestions in parallel

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ChefPrivateContext,
  EventSecret,
  ComplimentaryItem,
  ComplimentarySuggestion,
} from './types'

export interface BehindTheScenesData {
  privateContexts: ChefPrivateContext[]
  secrets: EventSecret[]
  compItems: ComplimentaryItem[]
  compSuggestions: ComplimentarySuggestion[]
}

/**
 * Load all behind-the-scenes data for an event.
 * Single call for the event detail page to minimize waterfalls.
 */
export async function loadBehindTheScenes(eventId: string): Promise<BehindTheScenesData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId

  const [contextsRes, secretsRes, compItemsRes, suggestionsRes] = await Promise.all([
    db
      .from('chef_private_context')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
      .eq('archived', false)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    db
      .from('event_secrets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    db
      .from('complimentary_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    db
      .from('complimentary_suggestions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .in('status', ['pending'])
      .order('confidence_score', { ascending: false }),
  ])

  return {
    privateContexts: (contextsRes.data ?? []) as ChefPrivateContext[],
    secrets: (secretsRes.data ?? []) as EventSecret[],
    compItems: (compItemsRes.data ?? []) as ComplimentaryItem[],
    compSuggestions: (suggestionsRes.data ?? []) as ComplimentarySuggestion[],
  }
}

/**
 * Load private contexts for any entity type (client, menu, recipe, etc.).
 */
export async function loadEntityPrivateContexts(
  entityType: 'event' | 'client' | 'menu' | 'circle' | 'dish' | 'recipe',
  entityId: string
): Promise<ChefPrivateContext[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_private_context')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('archived', false)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  return (data ?? []) as ChefPrivateContext[]
}

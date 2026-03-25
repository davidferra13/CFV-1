// Client Preference History Server Actions
// Tracks liked/disliked dishes, ingredients, cuisines, and techniques per client.
// Builds a cumulative taste profile over time (SevenRooms pattern).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type PreferenceRating = 'loved' | 'liked' | 'neutral' | 'disliked'
export type PreferenceItemType = 'dish' | 'ingredient' | 'cuisine' | 'technique'

export type ClientPreference = {
  id: string
  tenantId: string
  clientId: string
  itemType: PreferenceItemType
  itemName: string
  itemId: string | null
  rating: PreferenceRating
  notes: string | null
  eventId: string | null
  observedAt: string
  createdAt: string
}

export type TasteProfile = {
  loved: ClientPreference[]
  liked: ClientPreference[]
  disliked: ClientPreference[]
  neutral: ClientPreference[]
  byCuisine: ClientPreference[]
  byIngredient: ClientPreference[]
  byDish: ClientPreference[]
  byTechnique: ClientPreference[]
  avoidItems: ClientPreference[]
  topItems: ClientPreference[]
}

// --- Schemas ---

const RatingEnum = z.enum(['loved', 'liked', 'neutral', 'disliked'])
const ItemTypeEnum = z.enum(['dish', 'ingredient', 'cuisine', 'technique'])

const AddPreferenceSchema = z.object({
  itemType: ItemTypeEnum,
  itemName: z.string().min(1, 'Item name is required'),
  itemId: z.string().uuid().nullable().optional(),
  rating: RatingEnum,
  notes: z.string().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  observedAt: z.string().optional(),
})

const PostEventFeedbackItemSchema = z.object({
  dishName: z.string().min(1),
  rating: RatingEnum,
  notes: z.string().nullable().optional(),
})

// --- Helpers ---

function mapRow(row: any): ClientPreference {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    itemType: row.item_type,
    itemName: row.item_name,
    itemId: row.item_id,
    rating: row.rating,
    notes: row.notes,
    eventId: row.event_id,
    observedAt: row.observed_at,
    createdAt: row.created_at,
  }
}

// --- Actions ---

/**
 * Add a new preference observation for a client.
 */
export async function addPreference(
  clientId: string,
  data: z.infer<typeof AddPreferenceSchema>
): Promise<ClientPreference> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validClientId = z.string().uuid().parse(clientId)
  const validated = AddPreferenceSchema.parse(data)

  // Verify client belongs to this tenant
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id')
    .eq('id', validClientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientErr || !client) {
    throw new Error('Client not found')
  }

  const { data: pref, error } = await db
    .from('client_preferences')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validClientId,
      item_type: validated.itemType,
      item_name: validated.itemName,
      item_id: validated.itemId ?? null,
      rating: validated.rating,
      notes: validated.notes ?? null,
      event_id: validated.eventId ?? null,
      observed_at: validated.observedAt ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[addPreference] Error:', error)
    throw new Error('Failed to add preference')
  }

  revalidatePath(`/clients/${validClientId}`)
  return mapRow(pref)
}

/**
 * Get all preferences for a client, optionally filtered by item type.
 */
export async function getClientPreferences(
  clientId: string,
  itemType?: PreferenceItemType
): Promise<ClientPreference[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validClientId = z.string().uuid().parse(clientId)

  let query = db
    .from('client_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', validClientId)
    .order('observed_at', { ascending: false })

  if (itemType) {
    query = query.eq('item_type', ItemTypeEnum.parse(itemType))
  }

  const { data, error } = await query

  if (error) {
    console.error('[getClientPreferences] Error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

/**
 * Get an aggregated taste profile for a client.
 * Groups preferences by rating and by type, plus highlights top loved and avoid items.
 */
export async function getClientTasteProfile(clientId: string): Promise<TasteProfile> {
  const all = await getClientPreferences(clientId)

  const loved = all.filter((p) => p.rating === 'loved')
  const liked = all.filter((p) => p.rating === 'liked')
  const disliked = all.filter((p) => p.rating === 'disliked')
  const neutral = all.filter((p) => p.rating === 'neutral')

  const byCuisine = all.filter((p) => p.itemType === 'cuisine')
  const byIngredient = all.filter((p) => p.itemType === 'ingredient')
  const byDish = all.filter((p) => p.itemType === 'dish')
  const byTechnique = all.filter((p) => p.itemType === 'technique')

  // Avoid items: anything rated disliked
  const avoidItems = disliked

  // Top items: loved first, then liked, limited to 10
  const topItems = [...loved, ...liked].slice(0, 10)

  return {
    loved,
    liked,
    disliked,
    neutral,
    byCuisine,
    byIngredient,
    byDish,
    byTechnique,
    avoidItems,
    topItems,
  }
}

/**
 * Record feedback for all dishes from a completed event in bulk.
 */
export async function recordPostEventFeedback(
  eventId: string,
  clientId: string,
  feedback: Array<z.infer<typeof PostEventFeedbackItemSchema>>
): Promise<ClientPreference[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validEventId = z.string().uuid().parse(eventId)
  const validClientId = z.string().uuid().parse(clientId)
  const validFeedback = z.array(PostEventFeedbackItemSchema).min(1).parse(feedback)

  // Verify event and client belong to this tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, client_id')
    .eq('id', validEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventErr || !event) {
    throw new Error('Event not found')
  }

  if (event.client_id !== validClientId) {
    throw new Error('Client does not match event')
  }

  const rows = validFeedback.map((item) => ({
    tenant_id: user.tenantId!,
    client_id: validClientId,
    item_type: 'dish' as const,
    item_name: item.dishName,
    rating: item.rating,
    notes: item.notes ?? null,
    event_id: validEventId,
    observed_at: new Date().toISOString(),
  }))

  const { data, error } = await db.from('client_preferences').insert(rows).select()

  if (error) {
    console.error('[recordPostEventFeedback] Error:', error)
    throw new Error('Failed to record feedback')
  }

  revalidatePath(`/clients/${validClientId}`)
  revalidatePath(`/events/${validEventId}`)
  return (data || []).map(mapRow)
}

/**
 * Get items rated 'disliked' that should be avoided in future menus.
 */
export async function suggestAvoidItems(clientId: string): Promise<ClientPreference[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validClientId = z.string().uuid().parse(clientId)

  const { data, error } = await db
    .from('client_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', validClientId)
    .eq('rating', 'disliked')
    .order('item_type')
    .order('item_name')

  if (error) {
    console.error('[suggestAvoidItems] Error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

/**
 * Delete a preference by ID.
 */
export async function deletePreference(preferenceId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validId = z.string().uuid().parse(preferenceId)

  // Verify preference belongs to this tenant before deleting
  const { data: pref, error: fetchErr } = await db
    .from('client_preferences')
    .select('id, client_id')
    .eq('id', validId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !pref) {
    throw new Error('Preference not found')
  }

  const { error } = await db
    .from('client_preferences')
    .delete()
    .eq('id', validId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deletePreference] Error:', error)
    throw new Error('Failed to delete preference')
  }

  revalidatePath(`/clients/${pref.client_id}`)
}

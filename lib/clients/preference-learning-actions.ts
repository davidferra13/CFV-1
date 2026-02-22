// Client Preference Learning Server Actions
// Analyzes client event history to extract preference patterns.
// Table: client_preference_patterns — chef_id FK, client_id FK (CASCADE),
//   pattern_type TEXT, pattern_value TEXT, confidence NUMERIC(3,2),
//   occurrences INT, last_seen_at TIMESTAMPTZ,
//   UNIQUE(chef_id, client_id, pattern_type, pattern_value)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ClientPattern = {
  id: string
  chefId: string
  clientId: string
  patternType: string
  patternValue: string
  confidence: number
  occurrences: number
  lastSeenAt: string
}

// --- Schemas ---

const ClientIdSchema = z.string().uuid()

// --- Actions ---

/**
 * Analyze a client's past events to extract preference patterns.
 * Identifies: favorite cuisines, dietary needs, typical guest count,
 * preferred day of week, common occasions, and service style preferences.
 * Upserts findings into client_preference_patterns.
 */
export async function learnClientPreferences(clientId: string): Promise<ClientPattern[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const validatedClientId = ClientIdSchema.parse(clientId)

  // Verify client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id, dietary_restrictions, allergies, favorite_cuisines, favorite_dishes')
    .eq('id', validatedClientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Fetch all events for this client (non-cancelled)
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, guest_count, occasion, service_style, serve_time, status')
    .eq('client_id', validatedClientId)
    .eq('tenant_id', user.tenantId!)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) {
    return []
  }

  const totalEvents = events.length
  const now = new Date().toISOString()

  // Build pattern maps: patternType -> { patternValue -> count }
  const patterns: Map<string, Map<string, number>> = new Map()

  function addPattern(type: string, value: string | null | undefined) {
    if (!value || !value.trim()) return
    const normalized = value.trim().toLowerCase()
    if (!patterns.has(type)) {
      patterns.set(type, new Map())
    }
    const typeMap = patterns.get(type)!
    typeMap.set(normalized, (typeMap.get(normalized) || 0) + 1)
  }

  for (const event of events) {
    // Day of week preference
    const eventDate = new Date(event.event_date + 'T12:00:00')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    addPattern('preferred_day', dayNames[eventDate.getDay()])

    // Guest count range
    const gc = event.guest_count || 0
    if (gc <= 4) addPattern('guest_count_range', 'intimate (1-4)')
    else if (gc <= 8) addPattern('guest_count_range', 'small (5-8)')
    else if (gc <= 15) addPattern('guest_count_range', 'medium (9-15)')
    else if (gc <= 30) addPattern('guest_count_range', 'large (16-30)')
    else addPattern('guest_count_range', 'very large (30+)')

    // Occasion type
    addPattern('occasion_type', event.occasion)

    // Service style
    addPattern('service_style', event.service_style)

    // Serve time preference (bucket into time ranges)
    if (event.serve_time) {
      const hour = parseInt(event.serve_time.split(':')[0], 10)
      if (hour < 12) addPattern('time_preference', 'morning/brunch')
      else if (hour < 15) addPattern('time_preference', 'lunch')
      else if (hour < 18) addPattern('time_preference', 'afternoon')
      else addPattern('time_preference', 'dinner')
    }
  }

  // Add patterns from client profile directly
  const favCuisines = (client.favorite_cuisines as string[]) || []
  for (const cuisine of favCuisines) {
    addPattern('favorite_cuisine', cuisine)
  }

  const dietaryRestrictions = (client.dietary_restrictions as string[]) || []
  for (const restriction of dietaryRestrictions) {
    addPattern('dietary_need', restriction)
  }

  const clientAllergies = (client.allergies as string[]) || []
  for (const allergy of clientAllergies) {
    addPattern('allergy', allergy)
  }

  // Convert patterns to upsert payloads
  const upsertPayloads: Array<{
    chef_id: string
    client_id: string
    pattern_type: string
    pattern_value: string
    confidence: number
    occurrences: number
    last_seen_at: string
  }> = []

  for (const [patternType, valueMap] of patterns) {
    for (const [patternValue, occurrences] of valueMap) {
      // Confidence = occurrences / total events (capped at 1.0)
      // For profile-derived patterns (cuisine, allergy), set confidence = 1.0
      const isProfileDerived = ['favorite_cuisine', 'dietary_need', 'allergy'].includes(patternType)
      const confidence = isProfileDerived
        ? 1.0
        : Math.min(parseFloat((occurrences / totalEvents).toFixed(2)), 1.0)

      upsertPayloads.push({
        chef_id: user.tenantId!,
        client_id: validatedClientId,
        pattern_type: patternType,
        pattern_value: patternValue,
        confidence,
        occurrences: isProfileDerived ? 1 : occurrences,
        last_seen_at: now,
      })
    }
  }

  if (upsertPayloads.length === 0) {
    return []
  }

  // Upsert all patterns
  const { data: upserted, error } = await supabase
    .from('client_preference_patterns')
    .upsert(upsertPayloads, {
      onConflict: 'chef_id,client_id,pattern_type,pattern_value',
    })
    .select()

  if (error) {
    console.error('[learnClientPreferences] Error:', error)
    throw new Error('Failed to save client preference patterns')
  }

  revalidatePath(`/clients/${validatedClientId}`)

  return (upserted || []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    clientId: row.client_id,
    patternType: row.pattern_type,
    patternValue: row.pattern_value,
    confidence: parseFloat(row.confidence),
    occurrences: row.occurrences,
    lastSeenAt: row.last_seen_at,
  }))
}

/**
 * Get all preference patterns for a client, sorted by confidence descending.
 */
export async function getClientPatterns(clientId: string): Promise<ClientPattern[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const validatedClientId = ClientIdSchema.parse(clientId)

  const { data, error } = await supabase
    .from('client_preference_patterns')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', validatedClientId)
    .order('confidence', { ascending: false })

  if (error) {
    console.error('[getClientPatterns] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    clientId: row.client_id,
    patternType: row.pattern_type,
    patternValue: row.pattern_value,
    confidence: parseFloat(row.confidence),
    occurrences: row.occurrences,
    lastSeenAt: row.last_seen_at,
  }))
}

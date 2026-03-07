'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getOrCreateClientHubProfile } from './client-hub-actions'
import { createHubGroup } from './group-actions'
import { requirePro } from '@/lib/billing/require-pro'

// ---------------------------------------------------------------------------
// Open Tables - Social Dining Discovery Server Actions
// ---------------------------------------------------------------------------

// ---- Schemas ----

const OpenTableMetadataSchema = z.object({
  display_area: z.string().min(1).max(100),
  display_vibe: z.array(z.string()).max(10).optional(),
  dietary_theme: z.array(z.string()).max(10).optional(),
  open_seats: z.number().int().min(1).max(50),
  max_group_size: z.number().int().min(1).max(20).optional(),
  closes_at: z.string().datetime().optional(),
  description: z.string().max(200).optional(),
})

const JoinRequestSchema = z.object({
  group_id: z.string().uuid(),
  group_size: z.number().int().min(1).max(20),
  message: z.string().max(500).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
})

const ReviewRequestSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['approved', 'declined']),
  review_note: z.string().max(500).optional(),
  decline_message: z.string().max(500).optional(),
})

// ---- Dinner Circle Management ----

/**
 * Ensure a client has a dinner circle (hub_group). Creates one if missing.
 * Called on client creation and on client portal load.
 */
export async function ensureDinnerCircle(): Promise<{ groupId: string; groupToken: string }> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Check if client already has a dinner circle
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, dinner_circle_group_id, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client) throw new Error('Client not found')

  if (client.dinner_circle_group_id) {
    // Already has a circle, return its token
    const { data: group } = await supabase
      .from('hub_groups')
      .select('id, group_token')
      .eq('id', client.dinner_circle_group_id)
      .single()

    if (group) return { groupId: group.id, groupToken: group.group_token }
  }

  // Get or create hub profile for this client
  const profile = await getOrCreateClientHubProfile()

  // Create the dinner circle
  const group = await createHubGroup({
    name: `${client.full_name}'s Dinner Circle`,
    description: null,
    created_by_profile_id: profile.id,
    tenant_id: client.tenant_id,
    group_type: 'circle',
  })

  // Link circle to client
  await supabase.from('clients').update({ dinner_circle_group_id: group.id }).eq('id', client.id)

  return { groupId: group.id, groupToken: group.group_token }
}

// ---- Toggle Discovery ----

/**
 * Toggle the client's dinner circle discoverability.
 * When turning ON: sets is_open_table = true, visibility stays private until consent.
 * When turning OFF: immediately hides (no confirmation needed).
 */
export async function toggleOpenTable(
  enabled: boolean,
  metadata?: z.infer<typeof OpenTableMetadataSchema>
): Promise<{ success: boolean; consent_status?: string }> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Get client's dinner circle
  const { data: client } = await supabase
    .from('clients')
    .select('id, dinner_circle_group_id, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client?.dinner_circle_group_id) {
    throw new Error('No dinner circle found. Please try again.')
  }

  const groupId = client.dinner_circle_group_id

  if (!enabled) {
    // Turning OFF: instant, no confirmation
    await supabase
      .from('hub_groups')
      .update({
        is_open_table: false,
        visibility: 'private',
        consent_status: null,
      })
      .eq('id', groupId)

    revalidatePath('/my-hub')
    revalidatePath('/my-settings')
    return { success: true }
  }

  // Turning ON: validate metadata
  if (!metadata) throw new Error('Display metadata required when enabling Open Tables')
  const validated = OpenTableMetadataSchema.parse(metadata)

  // Update group with Open Table metadata
  await supabase
    .from('hub_groups')
    .update({
      is_open_table: true,
      display_area: validated.display_area,
      display_vibe: validated.display_vibe || [],
      dietary_theme: validated.dietary_theme || [],
      open_seats: validated.open_seats,
      max_group_size: validated.max_group_size || null,
      closes_at: validated.closes_at || null,
      description: validated.description || null,
      // Don't set visibility to public yet. Consent flow determines that.
      consent_status: 'pending',
    })
    .eq('id', groupId)

  // Check if there are other members who need to consent
  const { data: members } = await supabase
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', groupId)

  const profile = await getOrCreateClientHubProfile()
  const otherMembers = (members || []).filter((m) => m.profile_id !== profile.id)

  if (otherMembers.length === 0) {
    // Solo circle, no consent needed. Go straight to ready.
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'ready', visibility: 'public' })
      .eq('id', groupId)

    revalidatePath('/my-hub')
    revalidatePath('/my-settings')
    return { success: true, consent_status: 'ready' }
  }

  // Create consent requests for each other member
  const consentRows = otherMembers.map((m) => ({
    group_id: groupId,
    profile_id: m.profile_id,
    requested_by_profile_id: profile.id,
  }))

  await supabase.from('open_table_consents').upsert(consentRows, {
    onConflict: 'group_id,profile_id',
  })

  revalidatePath('/my-hub')
  revalidatePath('/my-settings')
  return { success: true, consent_status: 'pending' }
}

// ---- Consent Flow ----

/**
 * Respond to a consent request. Called by group members.
 */
export async function respondToConsent(
  groupId: string,
  consented: boolean
): Promise<{ success: boolean }> {
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const now = new Date().toISOString()

  if (consented) {
    await supabase
      .from('open_table_consents')
      .update({ consented: true, consented_at: now, revoked_at: null })
      .eq('group_id', groupId)
      .eq('profile_id', profile.id)
  } else {
    await supabase
      .from('open_table_consents')
      .update({ consented: false, revoked_at: now })
      .eq('group_id', groupId)
      .eq('profile_id', profile.id)

    // Immediately block the table
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'blocked', visibility: 'private' })
      .eq('id', groupId)

    revalidatePath('/my-hub')
    return { success: true }
  }

  // Check if all consents are now in
  await recalculateConsentStatus(groupId)

  revalidatePath('/my-hub')
  return { success: true }
}

/**
 * Revoke consent. Any member can do this at any time. Immediately hides the table.
 */
export async function revokeConsent(groupId: string): Promise<{ success: boolean }> {
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  await supabase
    .from('open_table_consents')
    .update({ consented: false, revoked_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)

  // Immediately hide
  await supabase
    .from('hub_groups')
    .update({ consent_status: 'blocked', visibility: 'private' })
    .eq('id', groupId)

  revalidatePath('/my-hub')
  return { success: true }
}

/**
 * Recalculate consent_status for a group and update visibility accordingly.
 */
async function recalculateConsentStatus(groupId: string): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: consents } = await supabase
    .from('open_table_consents')
    .select('consented')
    .eq('group_id', groupId)

  if (!consents || consents.length === 0) {
    // No consents needed (solo circle)
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'ready', visibility: 'public' })
      .eq('id', groupId)
      .eq('is_open_table', true)
    return
  }

  const allConsented = consents.every((c) => c.consented === true)
  const anyBlocked = consents.some((c) => c.consented === false)

  if (anyBlocked) {
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'blocked', visibility: 'private' })
      .eq('id', groupId)
  } else if (allConsented) {
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'ready', visibility: 'public' })
      .eq('id', groupId)
      .eq('is_open_table', true)
  } else {
    // Some still pending
    await supabase
      .from('hub_groups')
      .update({ consent_status: 'pending', visibility: 'private' })
      .eq('id', groupId)
  }
}

// ---- Discovery ----

/**
 * Browse open tables for the current client's chef network.
 */
export async function getOpenTables(filters?: {
  area?: string
  vibe?: string
  minSeats?: number
}): Promise<OpenTableCard[]> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  let query = supabase
    .from('hub_groups')
    .select(
      `
      id, name, description, display_area, display_vibe, dietary_theme,
      open_seats, emoji, group_token, closes_at,
      hub_group_events!inner(event_id, events!inner(event_date, occasion, location_city))
    `
    )
    .eq('is_open_table', true)
    .eq('visibility', 'public')
    .eq('consent_status', 'ready')
    .eq('is_active', true)
    .eq('tenant_id', user.tenantId)

  if (filters?.area) {
    query = query.ilike('display_area', `%${filters.area}%`)
  }

  if (filters?.minSeats) {
    query = query.gte('open_seats', filters.minSeats)
  }

  const { data, error } = await query

  if (error) {
    console.error('[open-tables] Discovery query failed:', error.message)
    return []
  }

  return (data || []).map((g: Record<string, unknown>) => {
    const events = g.hub_group_events as Array<{
      event_id: string
      events: { event_date: string; occasion: string | null; location_city: string }
    }>
    const event = events?.[0]?.events

    return {
      groupId: g.id as string,
      name: g.name as string,
      description: g.description as string | null,
      displayArea: g.display_area as string,
      displayVibe: (g.display_vibe as string[]) || [],
      dietaryTheme: (g.dietary_theme as string[]) || [],
      openSeats: g.open_seats as number,
      emoji: g.emoji as string | null,
      groupToken: g.group_token as string,
      eventDate: event?.event_date || null,
      occasion: event?.occasion || null,
      closesAt: g.closes_at as string | null,
    }
  })
}

export type OpenTableCard = {
  groupId: string
  name: string
  description: string | null
  displayArea: string
  displayVibe: string[]
  dietaryTheme: string[]
  openSeats: number
  emoji: string | null
  groupToken: string
  eventDate: string | null
  occasion: string | null
  closesAt: string | null
}

// ---- Join Requests ----

/**
 * Submit a join request for an open table.
 */
export async function submitJoinRequest(
  input: z.infer<typeof JoinRequestSchema>
): Promise<{ success: boolean; requestId: string }> {
  const validated = JoinRequestSchema.parse(input)
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  // Verify the group is open and discoverable
  const { data: group } = await supabase
    .from('hub_groups')
    .select('id, tenant_id, is_open_table, visibility, consent_status, open_seats, max_group_size')
    .eq('id', validated.group_id)
    .single()

  if (
    !group ||
    !group.is_open_table ||
    group.visibility !== 'public' ||
    group.consent_status !== 'ready'
  ) {
    throw new Error('This table is not currently accepting requests.')
  }

  if (group.open_seats !== null && validated.group_size > group.open_seats) {
    throw new Error(`This table only has ${group.open_seats} open seats.`)
  }

  if (group.max_group_size && validated.group_size > group.max_group_size) {
    throw new Error(`Maximum group size for this table is ${group.max_group_size}.`)
  }

  // Check for duplicate request
  const { data: existing } = await supabase
    .from('open_table_requests')
    .select('id, status')
    .eq('group_id', validated.group_id)
    .eq('requester_profile_id', profile.id)
    .in('status', ['pending'])
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('You already have a pending request for this table.')
  }

  const { data: request, error } = await supabase
    .from('open_table_requests')
    .insert({
      group_id: validated.group_id,
      tenant_id: group.tenant_id,
      requester_profile_id: profile.id,
      group_size: validated.group_size,
      message: validated.message || null,
      dietary_restrictions: validated.dietary_restrictions || [],
      allergies: validated.allergies || [],
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to submit request: ${error.message}`)

  revalidatePath('/my-hub')
  return { success: true, requestId: request.id }
}

/**
 * Chef reviews a join request (approve or decline).
 */
export async function reviewJoinRequest(
  input: z.infer<typeof ReviewRequestSchema>
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  await requirePro('social-dining')
  const validated = ReviewRequestSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Verify the request belongs to this chef's tenant
  const { data: request } = await supabase
    .from('open_table_requests')
    .select('id, group_id, tenant_id, requester_profile_id, group_size, status')
    .eq('id', validated.request_id)
    .single()

  if (!request) throw new Error('Request not found')
  if (request.tenant_id !== chef.tenantId) throw new Error('Unauthorized')
  if (request.status !== 'pending') throw new Error('Request already reviewed')

  const now = new Date().toISOString()

  await supabase
    .from('open_table_requests')
    .update({
      status: validated.action,
      reviewed_at: now,
      review_note: validated.review_note || null,
      decline_message: validated.decline_message || null,
      updated_at: now,
    })
    .eq('id', validated.request_id)

  if (validated.action === 'approved') {
    // Add requester as group member
    await supabase.from('hub_group_members').upsert(
      {
        group_id: request.group_id,
        profile_id: request.requester_profile_id,
        role: 'member',
        can_post: true,
        can_invite: false,
        can_pin: false,
      },
      { onConflict: 'group_id,profile_id' }
    )

    // Decrease open seats
    const { data: group } = await supabase
      .from('hub_groups')
      .select('open_seats')
      .eq('id', request.group_id)
      .single()

    if (group && group.open_seats !== null) {
      const newSeats = Math.max(0, group.open_seats - request.group_size)
      await supabase.from('hub_groups').update({ open_seats: newSeats }).eq('id', request.group_id)

      // Auto-close if full
      if (newSeats === 0) {
        await supabase
          .from('hub_groups')
          .update({ is_open_table: false, visibility: 'private' })
          .eq('id', request.group_id)
      }
    }

    // Post system message (non-blocking)
    try {
      const { data: profile } = await supabase
        .from('hub_guest_profiles')
        .select('display_name')
        .eq('id', request.requester_profile_id)
        .single()

      await supabase.from('hub_messages').insert({
        group_id: request.group_id,
        author_profile_id: request.requester_profile_id,
        message_type: 'system',
        system_event_type: 'member_joined',
        system_metadata: { display_name: profile?.display_name ?? 'Someone', via: 'open_table' },
      })
    } catch {
      // Non-blocking
    }
  }

  revalidatePath('/(chef)/open-tables', 'page')
  revalidatePath('/my-hub')
  return { success: true }
}

// ---- Chef Dashboard ----

/**
 * Get all open tables for the chef's dashboard.
 */
export async function getChefOpenTables(): Promise<ChefOpenTableView[]> {
  const chef = await requireChef()
  await requirePro('social-dining')
  const supabase = createServerClient({ admin: true })

  const { data: groups } = await supabase
    .from('hub_groups')
    .select(
      `
      id, name, description, display_area, display_vibe, open_seats,
      consent_status, visibility, is_open_table, closes_at, emoji,
      created_at
    `
    )
    .eq('tenant_id', chef.tenantId)
    .eq('is_open_table', true)
    .order('created_at', { ascending: false })

  if (!groups) return []

  // Get pending request counts for each group
  const groupIds = groups.map((g) => g.id)
  const { data: requests } = await supabase
    .from('open_table_requests')
    .select('group_id, status')
    .in('group_id', groupIds)
    .eq('status', 'pending')

  const pendingCounts: Record<string, number> = {}
  for (const r of requests || []) {
    pendingCounts[r.group_id] = (pendingCounts[r.group_id] || 0) + 1
  }

  return groups.map((g) => ({
    groupId: g.id,
    name: g.name,
    displayArea: g.display_area,
    displayVibe: g.display_vibe || [],
    openSeats: g.open_seats,
    consentStatus: g.consent_status,
    visibility: g.visibility,
    closesAt: g.closes_at,
    emoji: g.emoji,
    pendingRequests: pendingCounts[g.id] || 0,
    createdAt: g.created_at,
  }))
}

export type ChefOpenTableView = {
  groupId: string
  name: string
  displayArea: string | null
  displayVibe: string[]
  openSeats: number | null
  consentStatus: string | null
  visibility: string
  closesAt: string | null
  emoji: string | null
  pendingRequests: number
  createdAt: string
}

/**
 * Get pending join requests for a chef's open tables.
 */
export async function getPendingRequests(): Promise<JoinRequestView[]> {
  const chef = await requireChef()
  await requirePro('social-dining')
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('open_table_requests')
    .select(
      `
      id, group_id, group_size, message, dietary_restrictions, allergies,
      status, created_at,
      hub_guest_profiles!open_table_requests_requester_profile_id_fkey(
        display_name, email, bio
      ),
      hub_groups!open_table_requests_group_id_fkey(
        name, display_area
      )
    `
    )
    .eq('tenant_id', chef.tenantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!data) return []

  return data.map((r: Record<string, unknown>) => {
    const profile = r.hub_guest_profiles as {
      display_name: string
      email: string | null
      bio: string | null
    } | null
    const group = r.hub_groups as { name: string; display_area: string | null } | null

    return {
      requestId: r.id as string,
      groupId: r.group_id as string,
      groupName: group?.name || 'Unknown',
      groupArea: group?.display_area || null,
      requesterName: profile?.display_name || 'Unknown',
      requesterEmail: profile?.email || null,
      requesterBio: profile?.bio || null,
      groupSize: r.group_size as number,
      message: r.message as string | null,
      dietaryRestrictions: (r.dietary_restrictions as string[]) || [],
      allergies: (r.allergies as string[]) || [],
      createdAt: r.created_at as string,
    }
  })
}

export type JoinRequestView = {
  requestId: string
  groupId: string
  groupName: string
  groupArea: string | null
  requesterName: string
  requesterEmail: string | null
  requesterBio: string | null
  groupSize: number
  message: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  createdAt: string
}

// ---- Onboarding ----

/**
 * Mark the Open Tables intro as seen for the current client.
 */
export async function markOpenTablesIntroSeen(interested?: boolean): Promise<void> {
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  await supabase
    .from('hub_guest_profiles')
    .update({
      open_tables_intro_seen: true,
      open_tables_interested: interested ?? null,
    })
    .eq('id', profile.id)
}

/**
 * Toggle Open Tables notifications for the current client.
 */
export async function toggleOpenTablesNotify(enabled: boolean): Promise<void> {
  const profile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  await supabase
    .from('hub_guest_profiles')
    .update({ open_tables_notify: enabled })
    .eq('id', profile.id)
}

// ---------------------------------------------------------------------------
// Phase 2 - Chef Matchmaker Suggestions
// ---------------------------------------------------------------------------

export type MatchSuggestion = {
  groupA: { id: string; name: string; area: string | null; vibes: string[]; dietary: string[] }
  groupB: { id: string; name: string; area: string | null; vibes: string[]; dietary: string[] }
  compatibilityScore: number
  reasons: string[]
}

/**
 * Generate match suggestions between open tables.
 * Uses deterministic scoring (Formula > AI): area match, vibe overlap, dietary compatibility.
 */
export async function getMatchSuggestions(): Promise<MatchSuggestion[]> {
  const chef = await requireChef()
  await requirePro('social-dining')
  const supabase = createServerClient({ admin: true })

  const { data: groups } = await supabase
    .from('hub_groups')
    .select('id, name, display_area, display_vibe, dietary_theme, open_seats, consent_status')
    .eq('tenant_id', chef.tenantId)
    .eq('is_open_table', true)
    .eq('is_active', true)
    .eq('consent_status', 'ready')

  if (!groups || groups.length < 2) return []

  const suggestions: MatchSuggestion[] = []

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i]
      const b = groups[j]

      let score = 0
      const reasons: string[] = []

      // Area match (40 points)
      if (
        a.display_area &&
        b.display_area &&
        a.display_area.toLowerCase() === b.display_area.toLowerCase()
      ) {
        score += 40
        reasons.push(`Same area: ${a.display_area}`)
      }

      // Vibe overlap (up to 40 points)
      const vibesA = new Set((a.display_vibe ?? []).map((v: string) => v.toLowerCase()))
      const vibesB = new Set((b.display_vibe ?? []).map((v: string) => v.toLowerCase()))
      const vibeOverlap = [...vibesA].filter((v) => vibesB.has(v))
      if (vibeOverlap.length > 0) {
        score += Math.min(vibeOverlap.length * 15, 40)
        reasons.push(`Shared vibes: ${vibeOverlap.join(', ')}`)
      }

      // Dietary compatibility (20 points if no conflicts)
      const dietA = new Set((a.dietary_theme ?? []).map((d: string) => d.toLowerCase()))
      const dietB = new Set((b.dietary_theme ?? []).map((d: string) => d.toLowerCase()))
      const dietOverlap = [...dietA].filter((d) => dietB.has(d))
      if (dietOverlap.length > 0) {
        score += 20
        reasons.push(`Dietary match: ${dietOverlap.join(', ')}`)
      } else if (dietA.size === 0 && dietB.size === 0) {
        score += 10
        reasons.push('No dietary restrictions')
      }

      if (score >= 30 && reasons.length > 0) {
        suggestions.push({
          groupA: {
            id: a.id,
            name: a.name,
            area: a.display_area,
            vibes: a.display_vibe ?? [],
            dietary: a.dietary_theme ?? [],
          },
          groupB: {
            id: b.id,
            name: b.name,
            area: b.display_area,
            vibes: b.display_vibe ?? [],
            dietary: b.dietary_theme ?? [],
          },
          compatibilityScore: Math.min(score, 100),
          reasons,
        })
      }
    }
  }

  return suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore).slice(0, 10)
}

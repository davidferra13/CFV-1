'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const GuestInfoSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  email: z.string().email().max(320).transform((s) => s.toLowerCase().trim()),
  phone: z.string().max(30).optional().transform((s) => s?.trim() || undefined),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(): string {
  // URL-safe, 22 chars, collision-resistant
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 22)
}

// ---------------------------------------------------------------------------
// Create persistent join token (chef's permanent QR)
// ---------------------------------------------------------------------------

export async function createPersistentJoinToken(tenantId: string, circleId: string) {
  const user = await requireChef()
  if (user.tenantId !== tenantId) throw new Error('Unauthorized')

  const db: any = createServerClient()
  const token = generateToken()

  const { data, error } = await db
    .from('circle_join_tokens')
    .insert({
      tenant_id: tenantId,
      circle_id: circleId,
      token,
      token_type: 'persistent',
      expires_at: null,
      max_uses: null,
    })
    .select('id, token')
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id, token: data.token }
}

// ---------------------------------------------------------------------------
// Create event-specific join token
// ---------------------------------------------------------------------------

export async function createEventJoinToken(
  tenantId: string,
  circleId: string,
  eventId: string,
  expiresInHours = 72
) {
  const user = await requireChef()
  if (user.tenantId !== tenantId) throw new Error('Unauthorized')

  const db: any = createServerClient()
  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('circle_join_tokens')
    .insert({
      tenant_id: tenantId,
      circle_id: circleId,
      token,
      token_type: 'event',
      event_id: eventId,
      expires_at: expiresAt,
      max_uses: null,
    })
    .select('id, token, expires_at')
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id, token: data.token, expiresAt: data.expires_at }
}

// ---------------------------------------------------------------------------
// Resolve token (public, no auth)
// ---------------------------------------------------------------------------

export async function resolveJoinToken(token: string) {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('circle_join_tokens')
    .select(`
      id,
      tenant_id,
      circle_id,
      token_type,
      event_id,
      expires_at,
      max_uses,
      use_count
    `)
    .eq('token', token)
    .single()

  if (error || !data) return { valid: false as const, reason: 'invalid' as const }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false as const, reason: 'expired' as const, tenantId: data.tenant_id }
  }

  // Check max uses
  if (data.max_uses !== null && data.use_count >= data.max_uses) {
    return { valid: false as const, reason: 'maxed' as const, tenantId: data.tenant_id }
  }

  // Fetch chef info for display
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, slug')
    .eq('id', data.tenant_id)
    .single()

  // Fetch event info if event token
  let eventInfo: { title: string; eventDate: string | null } | null = null
  if (data.event_id) {
    const { data: event } = await db
      .from('events')
      .select('title, event_date')
      .eq('id', data.event_id)
      .single()
    if (event) {
      eventInfo = { title: event.title, eventDate: event.event_date }
    }
  }

  return {
    valid: true as const,
    tokenId: data.id,
    tenantId: data.tenant_id,
    circleId: data.circle_id,
    tokenType: data.token_type as 'persistent' | 'event',
    eventId: data.event_id,
    chefName: chef?.display_name || chef?.business_name || 'Chef',
    chefSlug: chef?.slug || null,
    event: eventInfo,
  }
}

// ---------------------------------------------------------------------------
// Join circle via token (public, no auth)
// ---------------------------------------------------------------------------

export async function joinCircleViaToken(
  token: string,
  rawGuest: { name: string; email: string; phone?: string }
) {
  const guest = GuestInfoSchema.parse(rawGuest)
  const db: any = createServerClient({ admin: true })

  // Re-validate token
  const resolved = await resolveJoinToken(token)
  if (!resolved.valid) {
    return { success: false, reason: resolved.reason }
  }

  // Get or create hub guest profile
  const { data: existingProfile } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token')
    .ilike('email', guest.email)
    .maybeSingle()

  let profileId: string
  let profileToken: string

  if (existingProfile) {
    profileId = existingProfile.id
    profileToken = existingProfile.profile_token
  } else {
    const { data: newProfile, error: profileError } = await db
      .from('hub_guest_profiles')
      .insert({
        display_name: guest.name,
        email: guest.email,
      })
      .select('id, profile_token')
      .single()

    if (profileError) throw new Error(profileError.message)
    profileId = newProfile.id
    profileToken = newProfile.profile_token
  }

  // Check if already a member of this circle
  const { data: existingMember } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', resolved.circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existingMember) {
    return { success: true, alreadyMember: true, chefName: resolved.chefName, profileToken }
  }

  // Add to circle
  const { error: joinError } = await db
    .from('hub_group_members')
    .insert({
      group_id: resolved.circleId,
      profile_id: profileId,
      role: 'member',
    })

  if (joinError) {
    // Duplicate join (race condition); treat as success
    if (joinError.code === '23505') {
      return { success: true, alreadyMember: true, chefName: resolved.chefName }
    }
    throw new Error(joinError.message)
  }

  // Increment use_count atomically via raw SQL
  await db.rpc('exec_sql', {
    query: `UPDATE circle_join_tokens SET use_count = use_count + 1, updated_at = now() WHERE token = $1`,
    params: [token],
  }).catch(async () => {
    // Fallback: non-atomic increment if rpc not available
    const { data: current } = await db
      .from('circle_join_tokens')
      .select('use_count')
      .eq('token', token)
      .single()
    if (current) {
      await db
        .from('circle_join_tokens')
        .update({
          use_count: (current.use_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('token', token)
    }
  })

  revalidatePath(`/join/${token}`)

  return {
    success: true,
    alreadyMember: false,
    chefName: resolved.chefName,
    profileToken,
  }
}

// ---------------------------------------------------------------------------
// List tokens for a circle (chef-only)
// ---------------------------------------------------------------------------

export async function getJoinTokensForCircle(tenantId: string, circleId: string) {
  const user = await requireChef()
  if (user.tenantId !== tenantId) throw new Error('Unauthorized')

  const db: any = createServerClient()

  const { data, error } = await db
    .from('circle_join_tokens')
    .select('id, token, token_type, event_id, expires_at, max_uses, use_count, created_at')
    .eq('tenant_id', tenantId)
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

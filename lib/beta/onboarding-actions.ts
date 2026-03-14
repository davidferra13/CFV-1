'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BetaChecklistStep =
  | 'taste_profile'
  | 'circle_created'
  | 'circle_members_invited'
  | 'first_event_booked'
  | 'post_event_review'

export type BetaChecklist = {
  id: string
  tenantId: string
  clientId: string
  tasteProfileCompletedAt: string | null
  circleCreatedAt: string | null
  circleMembersInvitedAt: string | null
  firstEventBookedAt: string | null
  postEventReviewAt: string | null
  primaryCircleId: string | null
  allStepsCompletedAt: string | null
  dismissedAt: string | null
}

export type BetaClientSummary = {
  clientId: string
  clientName: string
  clientEmail: string
  isBetaTester: boolean
  betaEnrolledAt: string | null
  betaDiscountPercent: number
  checklist: BetaChecklist | null
  stepsCompleted: number
  totalSteps: number
}

// ---------------------------------------------------------------------------
// Chef/Admin actions: manage beta testers
// ---------------------------------------------------------------------------

/**
 * Flag a client as a beta tester. Creates their onboarding checklist.
 */
export async function enrollBetaTester(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient({ admin: true })

  // Flag the client
  const { error: clientErr } = await supabase
    .from('clients')
    .update({
      is_beta_tester: true,
      beta_enrolled_at: new Date().toISOString(),
      beta_discount_percent: 30,
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (clientErr) throw new Error(`Failed to enroll beta tester: ${clientErr.message}`)

  // Create checklist if it doesn't exist
  const { error: checklistErr } = await supabase.from('beta_onboarding_checklist').upsert(
    {
      tenant_id: tenantId,
      client_id: clientId,
    },
    { onConflict: 'tenant_id,client_id' }
  )

  if (checklistErr) throw new Error(`Failed to create checklist: ${checklistErr.message}`)

  revalidatePath('/clients')
  revalidatePath('/admin/beta')
  return { success: true }
}

/**
 * Remove beta tester flag from a client.
 */
export async function unenrollBetaTester(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('clients')
    .update({
      is_beta_tester: false,
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to unenroll: ${error.message}`)

  revalidatePath('/clients')
  revalidatePath('/admin/beta')
  return { success: true }
}

/**
 * Get all beta testers with their checklist progress (chef view).
 */
export async function getBetaTesters(): Promise<BetaClientSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient({ admin: true })

  const { data: clients, error } = await supabase
    .from('clients')
    .select(
      `
      id, full_name, email, is_beta_tester, beta_enrolled_at, beta_discount_percent,
      beta_onboarding_checklist(*)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('is_beta_tester', true)
    .is('deleted_at', null)
    .order('beta_enrolled_at', { ascending: false })

  if (error) throw new Error(`Failed to load beta testers: ${error.message}`)

  return (clients ?? []).map((c) => {
    const checklist = Array.isArray(c.beta_onboarding_checklist)
      ? c.beta_onboarding_checklist[0]
      : c.beta_onboarding_checklist
    const mapped = checklist ? mapChecklist(checklist) : null

    return {
      clientId: c.id,
      clientName: c.full_name ?? 'Unknown',
      clientEmail: c.email ?? '',
      isBetaTester: c.is_beta_tester ?? false,
      betaEnrolledAt: c.beta_enrolled_at,
      betaDiscountPercent: c.beta_discount_percent ?? 30,
      checklist: mapped,
      stepsCompleted: mapped ? countCompleted(mapped) : 0,
      totalSteps: 5,
    }
  })
}

// ---------------------------------------------------------------------------
// Client actions: read/update own checklist
// ---------------------------------------------------------------------------

/**
 * Get the current client's beta checklist. Returns null if not a beta tester.
 */
export async function getMyBetaChecklist(): Promise<{
  isBetaTester: boolean
  discountPercent: number
  checklist: BetaChecklist | null
  stepsCompleted: number
  totalSteps: number
} | null> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Get client record
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, is_beta_tester, beta_discount_percent')
    .eq('auth_user_id', user.authUserId)
    .is('deleted_at', null)
    .maybeSingle()

  if (clientErr || !client) return null
  if (!client.is_beta_tester) return null

  // Get checklist
  const { data: row } = await supabase
    .from('beta_onboarding_checklist')
    .select('*')
    .eq('client_id', client.id)
    .maybeSingle()

  const checklist = row ? mapChecklist(row) : null

  return {
    isBetaTester: true,
    discountPercent: client.beta_discount_percent ?? 30,
    checklist,
    stepsCompleted: checklist ? countCompleted(checklist) : 0,
    totalSteps: 5,
  }
}

/**
 * Mark a checklist step as completed for the current client.
 */
export async function completeBetaStep(step: BetaChecklistStep, metadata?: { circleId?: string }) {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Get client
  const { data: client } = await supabase
    .from('clients')
    .select('id, tenant_id, is_beta_tester')
    .eq('auth_user_id', user.authUserId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client?.is_beta_tester) return { success: false, reason: 'not_beta_tester' }

  const now = new Date().toISOString()
  const columnMap: Record<BetaChecklistStep, string> = {
    taste_profile: 'taste_profile_completed_at',
    circle_created: 'circle_created_at',
    circle_members_invited: 'circle_members_invited_at',
    first_event_booked: 'first_event_booked_at',
    post_event_review: 'post_event_review_at',
  }

  const updates: Record<string, unknown> = {
    [columnMap[step]]: now,
    updated_at: now,
  }

  if (step === 'circle_created' && metadata?.circleId) {
    updates.primary_circle_id = metadata.circleId
  }

  // Update the step (don't overwrite if already completed)
  const { error } = await supabase
    .from('beta_onboarding_checklist')
    .update(updates)
    .eq('client_id', client.id)
    .eq('tenant_id', client.tenant_id)
    .is(columnMap[step], null) // only set if not already completed

  if (error) throw new Error(`Failed to complete step: ${error.message}`)

  // Check if all steps are now complete
  const { data: updated } = await supabase
    .from('beta_onboarding_checklist')
    .select('*')
    .eq('client_id', client.id)
    .maybeSingle()

  if (updated) {
    const mapped = mapChecklist(updated)
    if (countCompleted(mapped) === 5 && !mapped.allStepsCompletedAt) {
      await supabase
        .from('beta_onboarding_checklist')
        .update({ all_steps_completed_at: now })
        .eq('id', updated.id)
    }
  }

  revalidatePath('/my-events')
  return { success: true }
}

/**
 * Dismiss the beta checklist (client doesn't want to see it anymore).
 */
export async function dismissBetaChecklist() {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  const { data: client } = await supabase
    .from('clients')
    .select('id, tenant_id')
    .eq('auth_user_id', user.authUserId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return { success: false }

  await supabase
    .from('beta_onboarding_checklist')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('client_id', client.id)
    .eq('tenant_id', client.tenant_id)

  revalidatePath('/my-events')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Auto-detection: check if client has completed steps implicitly
// ---------------------------------------------------------------------------

/**
 * Auto-detect completed steps based on existing data.
 * Call this when the client dashboard loads to catch implicit completions.
 */
export async function syncBetaChecklistProgress() {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  const { data: client } = await supabase
    .from('clients')
    .select('id, tenant_id, is_beta_tester, dietary_restrictions, allergies, favorite_cuisines')
    .eq('auth_user_id', user.authUserId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client?.is_beta_tester) return null

  const { data: checklist } = await supabase
    .from('beta_onboarding_checklist')
    .select('*')
    .eq('client_id', client.id)
    .eq('tenant_id', client.tenant_id)
    .maybeSingle()

  if (!checklist) return null

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  // Step 1: Taste profile - check if dietary/allergies/cuisines are filled
  if (!checklist.taste_profile_completed_at) {
    const hasDietary = (client.dietary_restrictions?.length ?? 0) > 0
    const hasAllergies = (client.allergies?.length ?? 0) > 0
    const hasCuisines = (client.favorite_cuisines?.length ?? 0) > 0
    if (hasDietary || hasAllergies || hasCuisines) {
      updates.taste_profile_completed_at = now
    }
  }

  // Step 2: Circle created - check if client has created any hub group
  if (!checklist.circle_created_at) {
    // Find hub_guest_profile for this client
    const { data: profile } = await supabase
      .from('hub_guest_profiles')
      .select('id')
      .eq('client_id', client.id)
      .maybeSingle()

    if (profile) {
      const { data: ownedGroups } = await supabase
        .from('hub_group_members')
        .select('group_id')
        .eq('profile_id', profile.id)
        .eq('role', 'owner')
        .limit(1)

      if (ownedGroups && ownedGroups.length > 0) {
        updates.circle_created_at = now
        updates.primary_circle_id = ownedGroups[0].group_id
      }
    }
  }

  // Step 3: Circle members invited - check if primary circle has >1 member
  if (
    !checklist.circle_members_invited_at &&
    (checklist.primary_circle_id || updates.primary_circle_id)
  ) {
    const circleId = (updates.primary_circle_id ?? checklist.primary_circle_id) as string
    const { count } = await supabase
      .from('hub_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', circleId)

    if (count && count > 1) {
      updates.circle_members_invited_at = now
    }
  }

  // Step 4: First event booked - check if client has any events
  if (!checklist.first_event_booked_at) {
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('client_id', client.id)
      .eq('tenant_id', client.tenant_id)
      .limit(1)

    if (events && events.length > 0) {
      updates.first_event_booked_at = now
    }
  }

  // Step 5: Post-event review - check if client has left any review
  if (!checklist.post_event_review_at) {
    const { data: reviews } = await supabase
      .from('client_reviews')
      .select('id')
      .eq('client_id', client.id)
      .limit(1)

    if (reviews && reviews.length > 0) {
      updates.post_event_review_at = now
    }
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    updates.updated_at = now

    await supabase.from('beta_onboarding_checklist').update(updates).eq('id', checklist.id)

    // Check if all complete now
    const allComplete =
      (checklist.taste_profile_completed_at || updates.taste_profile_completed_at) &&
      (checklist.circle_created_at || updates.circle_created_at) &&
      (checklist.circle_members_invited_at || updates.circle_members_invited_at) &&
      (checklist.first_event_booked_at || updates.first_event_booked_at) &&
      (checklist.post_event_review_at || updates.post_event_review_at)

    if (allComplete && !checklist.all_steps_completed_at) {
      await supabase
        .from('beta_onboarding_checklist')
        .update({ all_steps_completed_at: now })
        .eq('id', checklist.id)
    }

    revalidatePath('/my-events')
  }

  // Return current state
  const { data: final } = await supabase
    .from('beta_onboarding_checklist')
    .select('*')
    .eq('id', checklist.id)
    .single()

  return final ? mapChecklist(final) : null
}

// ---------------------------------------------------------------------------
// Beta discount computation
// ---------------------------------------------------------------------------

export type BetaDiscountResult = {
  applied: boolean
  discountPercent: number
  discountCents: number
  adjustedServiceCents: number
}

/**
 * Compute the beta discount for an event.
 * Call this during invoice generation to layer beta discount on top of loyalty.
 */
export async function computeBetaDiscount(
  serviceCents: number,
  isBetaTester: boolean,
  discountPercent: number = 30
): Promise<BetaDiscountResult> {
  if (!isBetaTester || discountPercent <= 0) {
    return {
      applied: false,
      discountPercent: 0,
      discountCents: 0,
      adjustedServiceCents: serviceCents,
    }
  }

  const discountCents = Math.round(serviceCents * (discountPercent / 100))
  return {
    applied: true,
    discountPercent,
    discountCents,
    adjustedServiceCents: serviceCents - discountCents,
  }
}

// ---------------------------------------------------------------------------
// Dietary rollup for an event's guest list
// ---------------------------------------------------------------------------

export type DietaryRollup = {
  restrictions: { label: string; count: number }[]
  allergies: { label: string; count: number }[]
  totalGuests: number
  guestsWithInfo: number
}

/**
 * Aggregate dietary info from all circle members linked to an event.
 */
export async function getDietaryRollupForEvent(eventId: string): Promise<DietaryRollup> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient({ admin: true })

  // Get event guests
  const { data: guests } = await supabase
    .from('event_guests')
    .select('dietary_restrictions, allergies')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  // Get client dietary info
  const { data: event } = await supabase
    .from('events')
    .select('client_id')
    .eq('id', eventId)
    .single()

  let clientDietary: string[] = []
  let clientAllergies: string[] = []

  if (event?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('dietary_restrictions, allergies')
      .eq('id', event.client_id)
      .single()

    if (client) {
      clientDietary = client.dietary_restrictions ?? []
      clientAllergies = client.allergies ?? []
    }
  }

  // Also check hub group members linked to this event
  const { data: hubGroupEvents } = await supabase
    .from('hub_group_events')
    .select('group_id')
    .eq('event_id', eventId)

  let memberDietary: string[][] = []
  let memberAllergies: string[][] = []

  if (hubGroupEvents && hubGroupEvents.length > 0) {
    const groupIds = hubGroupEvents.map((g) => g.group_id)
    const { data: members } = await supabase
      .from('hub_group_members')
      .select('profile_id, hub_guest_profiles(known_dietary, known_allergies)')
      .in('group_id', groupIds)

    if (members) {
      for (const m of members) {
        const profile = m.hub_guest_profiles as {
          known_dietary: string[]
          known_allergies: string[]
        } | null
        if (profile) {
          memberDietary.push(profile.known_dietary ?? [])
          memberAllergies.push(profile.known_allergies ?? [])
        }
      }
    }
  }

  // Aggregate
  const allRestrictions = [
    ...clientDietary,
    ...(guests ?? []).flatMap((g) => g.dietary_restrictions ?? []),
    ...memberDietary.flat(),
  ]

  const allAllergies = [
    ...clientAllergies,
    ...(guests ?? []).flatMap((g) => g.allergies ?? []),
    ...memberAllergies.flat(),
  ]

  const totalGuests = (guests?.length ?? 0) + 1 + memberDietary.length // +1 for client
  const guestsWithInfo =
    (clientDietary.length > 0 || clientAllergies.length > 0 ? 1 : 0) +
    (guests ?? []).filter(
      (g) => (g.dietary_restrictions?.length ?? 0) > 0 || (g.allergies?.length ?? 0) > 0
    ).length +
    memberDietary.filter((d, i) => d.length > 0 || (memberAllergies[i]?.length ?? 0) > 0).length

  return {
    restrictions: tally(allRestrictions),
    allergies: tally(allAllergies),
    totalGuests,
    guestsWithInfo,
  }
}

// ---------------------------------------------------------------------------
// Referral tracking
// ---------------------------------------------------------------------------

/**
 * Record referral source when a guest upgrades to a client.
 */
export async function recordReferralSource(
  newClientId: string,
  referredByClientId: string | null,
  fromGroupId: string | null
) {
  const supabase = createServerClient({ admin: true })

  const updates: Record<string, unknown> = {}
  if (referredByClientId) updates.referred_by_client_id = referredByClientId
  if (fromGroupId) updates.referred_from_group_id = fromGroupId

  if (Object.keys(updates).length > 0) {
    await supabase.from('clients').update(updates).eq('id', newClientId)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapChecklist(row: Record<string, unknown>): BetaChecklist {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    clientId: row.client_id as string,
    tasteProfileCompletedAt: row.taste_profile_completed_at as string | null,
    circleCreatedAt: row.circle_created_at as string | null,
    circleMembersInvitedAt: row.circle_members_invited_at as string | null,
    firstEventBookedAt: row.first_event_booked_at as string | null,
    postEventReviewAt: row.post_event_review_at as string | null,
    primaryCircleId: row.primary_circle_id as string | null,
    allStepsCompletedAt: row.all_steps_completed_at as string | null,
    dismissedAt: row.dismissed_at as string | null,
  }
}

function countCompleted(checklist: BetaChecklist): number {
  let count = 0
  if (checklist.tasteProfileCompletedAt) count++
  if (checklist.circleCreatedAt) count++
  if (checklist.circleMembersInvitedAt) count++
  if (checklist.firstEventBookedAt) count++
  if (checklist.postEventReviewAt) count++
  return count
}

function tally(items: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const normalized = item.trim().toLowerCase()
    if (!normalized) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

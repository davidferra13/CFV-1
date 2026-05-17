'use server'

import { createServerClient } from '@/lib/db/server'
import { requireClient } from '@/lib/auth/get-user'
import { getClientCannabisAccessStatus } from '@/lib/cannabis/client-portal-guards'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { notifyCannabisRequestSubmitted } from '@/lib/cannabis/notifications'

const SubmitCannabisRequestSchema = z.object({
  preferredDate: z.string().optional(),
  guestCount: z.number().int().positive().max(50).optional(),
  locationNotes: z.string().max(500).optional(),
  formatPreference: z.string().max(200).optional(),
  menuPreferences: z.string().max(1000).optional(),
  cannabisExperienceGoal: z.string().max(500).optional(),
  desiredIntensity: z.enum(['micro', 'light', 'moderate', 'full', 'custom']).optional(),
  guestOnboardingNeeded: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  priorEventReference: z.string().uuid().optional(),
})

export async function getClientCannabisPortalData() {
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)

  if (!accessStatus.canAccessPortal) {
    return { authorized: false as const }
  }

  const db: any = createServerClient()

  const [eventsResult, requestsResult, statsResult] = await Promise.all([
    db
      .from('events')
      .select(
        'id, event_date, serve_time, occasion, guest_count, status, quoted_price_cents, location_city, location_state'
      )
      .eq('client_id', user.entityId)
      .eq('cannabis_preference', true)
      .order('event_date', { ascending: false })
      .limit(20),
    db
      .from('cannabis_dinner_requests')
      .select('id, status, preferred_date, guest_count, desired_intensity, created_at, reviewed_at')
      .eq('auth_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('events')
      .select('id, guest_count, quoted_price_cents, status')
      .eq('client_id', user.entityId)
      .eq('cannabis_preference', true),
  ])

  const events = eventsResult.data ?? []
  const requests = requestsResult.data ?? []
  const allCannabisEvents = statsResult.data ?? []

  const completedEvents = allCannabisEvents.filter((e: any) => e.status === 'completed')
  const totalCannabisSpend = completedEvents.reduce(
    (sum: number, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )
  const totalCannabisCovers = completedEvents.reduce(
    (sum: number, e: any) => sum + (e.guest_count ?? 0),
    0
  )

  return {
    authorized: true as const,
    accessStatus,
    events,
    requests,
    stats: {
      totalCannabisEvents: completedEvents.length,
      upcomingCannabisEvents: allCannabisEvents.filter(
        (e: any) => !['completed', 'cancelled'].includes(e.status)
      ).length,
      totalCannabisSpendCents: totalCannabisSpend,
      totalCannabisCovers,
    },
  }
}

export async function submitCannabisRequest(input: z.infer<typeof SubmitCannabisRequestSchema>) {
  const validated = SubmitCannabisRequestSchema.parse(input)
  const user = await requireClient()

  const accessStatus = await getClientCannabisAccessStatus(user.id)
  if (!accessStatus.canAccessPortal) {
    throw new Error('Cannabis portal access required')
  }

  const db: any = createServerClient()

  const { data: clientRow } = await db
    .from('clients')
    .select('id, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!clientRow) throw new Error('Client record not found')

  const { data: inserted, error } = await db
    .from('cannabis_dinner_requests')
    .insert({
      auth_user_id: user.id,
      client_id: clientRow.id,
      tenant_id: clientRow.tenant_id,
      preferred_date: validated.preferredDate ?? null,
      guest_count: validated.guestCount ?? null,
      location_notes: validated.locationNotes ?? null,
      format_preference: validated.formatPreference ?? null,
      menu_preferences: validated.menuPreferences ?? null,
      cannabis_experience_goal: validated.cannabisExperienceGoal ?? null,
      desired_intensity: validated.desiredIntensity ?? null,
      guest_onboarding_needed: validated.guestOnboardingNeeded ?? true,
      notes: validated.notes ?? null,
      prior_event_reference: validated.priorEventReference ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error('Failed to submit cannabis dinner request')

  // Fire-and-forget: notify the chef that a cannabis request was submitted
  try {
    const { data: chef } = await db
      .from('chefs')
      .select('auth_user_id')
      .eq('id', clientRow.tenant_id)
      .single()

    if (chef?.auth_user_id) {
      await notifyCannabisRequestSubmitted({
        recipientId: chef.auth_user_id,
        tenantId: clientRow.tenant_id,
        requestId: inserted?.id ?? 'unknown',
      })
    }
  } catch (notifErr) {
    console.error('[CANNABIS] Non-blocking: request submitted notification failed:', notifErr)
  }

  revalidatePath('/my-cannabis')
  return { success: true }
}

export async function getClientCannabisEventHistory() {
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)
  if (!accessStatus.canAccessPortal) return []

  const db: any = createServerClient()

  const { data } = await db
    .from('events')
    .select(
      `
      id,
      event_date,
      serve_time,
      occasion,
      guest_count,
      location_city,
      location_state,
      status,
      quoted_price_cents,
      cannabis_event_details(cannabis_category)
    `
    )
    .eq('client_id', user.entityId)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: false })

  return data ?? []
}

export async function submitAgeAttestation() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('cannabis_age_permissions')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing && ['approved', 'manually_verified', 'self_attested'].includes(existing.status)) {
    return { success: true, alreadyApproved: true }
  }

  if (existing && existing.status === 'blocked') {
    throw new Error('Age permission has been blocked by admin')
  }

  const payload = {
    auth_user_id: user.id,
    status: 'self_attested',
    verification_method: 'self_attestation',
    approved_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }

  if (existing) {
    const { error } = await db
      .from('cannabis_age_permissions')
      .update(payload)
      .eq('auth_user_id', user.id)
  } else {
    const { error } = await db.from('cannabis_age_permissions').insert(payload)
  }

  revalidatePath('/my-cannabis')
  return { success: true }
}

export async function renewAgeAttestation() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('cannabis_age_permissions')
    .select('id, status')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!existing) {
    throw new Error('No age attestation found to renew')
  }

  if (!['approved', 'self_attested', 'manually_verified'].includes(existing.status)) {
    throw new Error('Only approved attestations can be renewed')
  }

  const { error } = await db
    .from('cannabis_age_permissions')
    .update({
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date().toISOString(),
    })
    .eq('auth_user_id', user.id)

  if (error) throw new Error('Failed to renew age attestation')

  revalidatePath('/my-cannabis')
  return { success: true }
}

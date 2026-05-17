import 'server-only'

import { createServerClient } from '@/lib/db/server'

export type CannabisTransitionBlock = {
  blocked: boolean
  reason: string | null
  missingGates: string[]
}

export async function checkCannabisReadinessForTransition(
  eventId: string,
  tenantId: string,
  targetStatus: string
): Promise<CannabisTransitionBlock> {
  const notBlocking: CannabisTransitionBlock = {
    blocked: false,
    reason: null,
    missingGates: [],
  }

  if (!['confirmed', 'in_progress'].includes(targetStatus)) {
    return notBlocking
  }

  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, cannabis_preference')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.cannabis_preference) return notBlocking

  const missingGates: string[] = []

  const { data: agreement } = await db
    .from('cannabis_host_agreements')
    .select('id')
    .eq(
      'host_user_id',
      (
        await db
          .from('user_roles')
          .select('auth_user_id')
          .eq('entity_id', tenantId)
          .eq('role', 'chef')
          .limit(1)
          .single()
      ).data?.auth_user_id
    )
    .limit(1)
    .maybeSingle()

  if (!agreement) {
    missingGates.push('host_agreement_signed')
  }

  const { data: guests } = await db
    .from('event_guests')
    .select('guest_token')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (guests && guests.length > 0) {
    const tokens = guests.map((g: any) => g.guest_token)
    const { data: profiles } = await db
      .from('guest_event_profile')
      .select('guest_token, age_confirmed, final_confirmation, cannabis_participation')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .in('guest_token', tokens)

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.guest_token, p]))

    const allIntakeComplete = tokens.every((token: string) => {
      const p = profileMap.get(token) as any
      return p && p.final_confirmation === true
    })

    if (!allIntakeComplete) {
      missingGates.push('guest_intake_complete')
    }

    const participating = (profiles ?? []).filter(
      (p: any) => p.cannabis_participation === 'participate'
    )
    const allAgeConfirmed = participating.every((p: any) => p.age_confirmed === true)

    if (participating.length > 0 && !allAgeConfirmed) {
      missingGates.push('guest_age_clearance')
    }
  }

  if (targetStatus === 'in_progress') {
    const { data: details } = await db
      .from('cannabis_event_details')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!details) {
      missingGates.push('cannabis_event_details_set')
    }
  }

  if (missingGates.length === 0) return notBlocking

  return {
    blocked: true,
    reason: `Cannabis readiness incomplete: ${missingGates.join(', ')}`,
    missingGates,
  }
}

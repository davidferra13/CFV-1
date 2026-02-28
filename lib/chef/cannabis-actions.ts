'use server'

// Chef Cannabis Actions
// Used by chef portal pages in app/(chef)/cannabis/

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

function parseEventDateTime(eventDate: string, timeValue?: string | null) {
  const safeTime = timeValue && /^\d{2}:\d{2}/.test(timeValue) ? timeValue.slice(0, 5) : '18:00'
  return new Date(`${eventDate}T${safeTime}:00`)
}

function parseEditCutoff(
  eventDate: string,
  arrivalTime?: string | null,
  serveTime?: string | null
) {
  return parseEventDateTime(eventDate, arrivalTime || serveTime || '18:00')
}

function deriveAttendingStatus(rsvpStatus: string) {
  if (rsvpStatus === 'attending') return 'yes'
  if (rsvpStatus === 'declined') return 'no'
  return null
}

const UpdateChefCannabisGuestSchema = z.object({
  eventId: z.string().uuid(),
  guestId: z.string().uuid(),
  attendingStatus: z.enum(['yes', 'no']).optional(),
  cannabisParticipation: z.enum(['participate', 'not_consume', 'undecided']).optional(),
  familiarityLevel: z
    .enum(['first_time', 'occasional', 'experienced', 'regular', 'new', 'light', 'moderate'])
    .optional()
    .nullable(),
  consumptionStyle: z
    .array(
      z.enum([
        'smoking',
        'edibles',
        'tincture',
        'other',
        'infused_course',
        'paired_noninfused',
        'skip_infusion',
        'unsure',
      ])
    )
    .optional(),
  edibleFamiliarity: z
    .enum(['yes', 'no', 'unsure', 'none', 'low', 'moderate', 'high'])
    .optional()
    .nullable(),
  preferredDoseNote: z.string().optional().nullable(),
  comfortNotes: z.string().optional().nullable(),
  dietaryNotes: z.string().optional().nullable(),
  accessibilityNotes: z.string().optional().nullable(),
  discussInPersonFlag: z.boolean().optional(),
  additionalNote: z.string().optional().nullable(),
})

// ─── Access Check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given auth user ID has an active cannabis tier.
 * Admins always have access — no manual grant required.
 * Used by the chef layout to conditionally show the cannabis nav section.
 */
export async function hasCannabisAccess(authUserId: string): Promise<boolean> {
  try {
    // Admins always have cannabis tier access
    const adminCheck = await isAdmin().catch(() => false)
    if (adminCheck) return true

    const supabase: any = createServerClient()
    const { data, error } = await supabase
      .from('cannabis_tier_users')
      .select('status')
      .eq('auth_user_id', authUserId)
      .single()

    if (error || !data) return false
    return data.status === 'active'
  } catch {
    return false
  }
}

// ─── Cannabis Events ──────────────────────────────────────────────────────────

/**
 * Get all events for this chef that have cannabis_preference = true,
 * along with their cannabis_event_details if present.
 */
export async function getCannabisEvents() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      event_date,
      serve_time,
      occasion,
      guest_count,
      location_address,
      location_city,
      location_state,
      status,
      quoted_price_cents,
      client_id,
      clients!inner(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: false })

  if (error) throw new Error('Failed to fetch cannabis events: ' + error.message)

  // Also fetch cannabis_event_details for these events
  const eventIds = (data ?? []).map((e: any) => e.id)
  let details: any[] = []

  if (eventIds.length > 0) {
    const { data: detailData } = await supabase
      .from('cannabis_event_details')
      .select('*')
      .in('event_id', eventIds)

    details = detailData ?? []
  }

  const detailsByEventId = Object.fromEntries(details.map((d: any) => [d.event_id, d]))

  return (data ?? []).map((event: any) => ({
    ...event,
    cannabis_details: detailsByEventId[event.id] ?? null,
  }))
}

// ─── Cannabis Event Details CRUD ──────────────────────────────────────────────

export async function getCannabisEventDetails(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('cannabis_event_details')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error('Failed to fetch cannabis event details')
  return data ?? null
}

export async function upsertCannabisEventDetails(input: {
  eventId: string
  cannabisCategory?: 'cannabis_friendly' | 'infused_menu' | 'cbd_only' | 'micro_dose'
  guestConsentConfirmed?: boolean
  complianceNotes?: string
  compliancePlaceholderAcknowledged?: boolean
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('cannabis_event_details').upsert(
    {
      event_id: input.eventId,
      tenant_id: user.tenantId!,
      cannabis_category: input.cannabisCategory ?? 'cannabis_friendly',
      guest_consent_confirmed: input.guestConsentConfirmed ?? false,
      compliance_notes: input.complianceNotes ?? null,
      compliance_placeholder_acknowledged: input.compliancePlaceholderAcknowledged ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )

  if (error) throw new Error('Failed to save cannabis event details: ' + error.message)
  revalidatePath('/cannabis')
  return { success: true }
}

// ─── Cannabis Ledger ──────────────────────────────────────────────────────────

/**
 * Get ledger entries for all cannabis events owned by this chef.
 */
export async function getCannabisLedger() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // First get all cannabis event IDs
  const { data: cannabisEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date, occasion, clients!inner(full_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)

  if (eventsError) throw new Error('Failed to fetch cannabis events for ledger')

  const eventIds = (cannabisEvents ?? []).map((e: any) => e.id)
  if (eventIds.length === 0)
    return { events: [], entries: [], totals: { revenue: 0, expenses: 0, profit: 0 } }

  // Fetch ledger entries for those events
  const { data: entries, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)
    .order('received_at', { ascending: false })

  if (ledgerError) throw new Error('Failed to fetch cannabis ledger entries')

  const allEntries = entries ?? []

  // Compute totals
  const revenue = allEntries
    .filter(
      (e: any) =>
        !e.is_refund &&
        ['payment', 'deposit', 'installment', 'final_payment', 'tip'].includes(e.entry_type)
    )
    .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

  const expenses = allEntries
    .filter((e: any) => e.entry_type === 'adjustment' && e.amount_cents < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount_cents ?? 0), 0)

  const refunds = allEntries
    .filter((e: any) => e.is_refund)
    .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

  const eventMap = Object.fromEntries((cannabisEvents ?? []).map((e: any) => [e.id, e]))

  return {
    events: cannabisEvents ?? [],
    entries: allEntries.map((e: any) => ({
      ...e,
      event_info: eventMap[e.event_id] ?? null,
    })),
    totals: {
      revenue,
      expenses,
      profit: revenue - expenses - refunds,
    },
  }
}

// ─── Send Invite (routes to admin approval queue) ─────────────────────────────

export async function sendCannabisInvite(input: {
  inviteeEmail: string
  inviteeName?: string
  personalNote?: string
}) {
  const user = await requireChef()
  // Must have cannabis access to send invites
  const hasAccess = await hasCannabisAccess(user.id)
  if (!hasAccess) throw new Error('Cannabis tier access required to send invites')

  const supabase: any = createServerClient()

  // Check if an invite for this email is already pending or approved
  const { data: existing } = await supabase
    .from('cannabis_tier_invitations')
    .select('id, admin_approval_status, claimed_at')
    .eq('invitee_email', input.inviteeEmail.toLowerCase())
    .in('admin_approval_status', ['pending', 'approved'])
    .is('claimed_at', null)
    .maybeSingle()

  if (existing) {
    if (existing.admin_approval_status === 'pending') {
      throw new Error('An invite for this email is already awaiting admin approval.')
    }
    throw new Error('An active invite for this email already exists.')
  }

  const { error } = await supabase.from('cannabis_tier_invitations').insert({
    invited_by_auth_user_id: user.id,
    invited_by_user_type: 'chef',
    invitee_email: input.inviteeEmail.toLowerCase(),
    invitee_name: input.inviteeName ?? null,
    personal_note: input.personalNote ?? null,
    admin_approval_status: 'pending',
  })

  if (error) throw new Error('Failed to submit invite: ' + error.message)

  revalidatePath('/cannabis/invite')
  return { success: true }
}

// ─── My Sent Invites ──────────────────────────────────────────────────────────

export async function getMySentCannabisInvites() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('cannabis_tier_invitations')
    .select('*')
    .eq('invited_by_auth_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch sent invites')
  return (data ?? []) as {
    id: string
    invitee_email: string
    invitee_name: string | null
    personal_note: string | null
    admin_approval_status: string
    claimed_at: string | null
    created_at: string
  }[]
}

// RSVP Dashboard (chef-facing cannabis intake overview)
export async function getCannabisRSVPDashboardData(selectedEventId?: string | null) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: eventRows, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date, serve_time, arrival_time, occasion, status, guest_count')
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: true })

  if (eventsError) {
    throw new Error('Failed to load cannabis RSVP events')
  }

  const events = (eventRows ?? []) as {
    id: string
    event_date: string
    serve_time: string | null
    arrival_time: string | null
    occasion: string | null
    status: string | null
    guest_count: number | null
  }[]

  if (events.length === 0) {
    return {
      events: [],
      selectedEvent: null,
      summary: null,
      guests: [],
      editCutoffIso: null,
      editWindowOpen: false,
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter(
    (event) =>
      event.event_date >= today && !['completed', 'cancelled'].includes((event.status ?? '').trim())
  )

  const selectedEvent =
    (selectedEventId ? events.find((event) => event.id === selectedEventId) : null) ||
    upcoming[0] ||
    events[0]

  const editCutoff = parseEditCutoff(
    selectedEvent.event_date,
    selectedEvent.arrival_time,
    selectedEvent.serve_time
  )
  const editWindowOpen = new Date() <= editCutoff

  const { data: guestRows, error: guestsError } = await supabase
    .from('event_guests')
    .select(
      'id, full_name, rsvp_status, guest_token, dietary_restrictions, notes, created_at, updated_at'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', selectedEvent.id)
    .order('created_at', { ascending: true })

  if (guestsError) {
    throw new Error('Failed to load event guests')
  }

  const guests = (guestRows ?? []) as {
    id: string
    full_name: string
    rsvp_status: string
    guest_token: string
    dietary_restrictions: string[] | null
    notes: string | null
    created_at: string
    updated_at: string
  }[]

  let profiles: any[] = []
  const guestTokens = guests.map((guest) => guest.guest_token)

  if (guestTokens.length > 0) {
    const { data: profileRows, error: profileError } = await (supabase
      .from('guest_event_profile' as any)
      .select('*')
      .eq('event_id', selectedEvent.id)
      .in('guest_token', guestTokens) as any)

    if (profileError) {
      throw new Error('Failed to load guest intake profiles')
    }

    profiles = profileRows ?? []
  }

  const profileByToken = Object.fromEntries(
    profiles
      .filter((row) => typeof row?.guest_token === 'string')
      .map((row) => [row.guest_token as string, row])
  )

  const normalizedGuests = guests.map((guest) => {
    const profile = profileByToken[guest.guest_token] ?? null
    const attendingStatus =
      profile?.attending_status ?? deriveAttendingStatus(guest.rsvp_status) ?? 'no_response'
    const participation =
      profile?.cannabis_participation ??
      (guest.rsvp_status === 'pending' ? 'no_response' : 'undecided')
    const lastUpdated = profile?.updated_at ?? guest.updated_at ?? guest.created_at

    return {
      id: guest.id,
      fullName: guest.full_name,
      attendingStatus,
      cannabisParticipation: participation,
      familiarityLevel: profile?.familiarity_level ?? null,
      edibleFamiliarity: profile?.edible_familiarity ?? null,
      preferredDoseNote: profile?.preferred_dose_note ?? null,
      dietaryNotes: profile?.dietary_notes ?? guest.dietary_restrictions?.join(', ') ?? null,
      accessibilityNotes: profile?.accessibility_notes ?? null,
      discussInPerson: !!profile?.discuss_in_person_flag,
      additionalNote: profile?.additional_note ?? guest.notes ?? null,
      comfortNotes: profile?.comfort_notes ?? null,
      consumptionStyle: profile?.consumption_style ?? [],
      updatedAt: lastUpdated,
      hasResponded:
        guest.rsvp_status !== 'pending' &&
        profile?.final_confirmation !== false &&
        profile !== null,
      profileRaw: profile,
      isEditable: editWindowOpen,
    }
  })

  const summary = {
    totalInvited: normalizedGuests.length,
    totalAttending: normalizedGuests.filter((guest) => guest.attendingStatus === 'yes').length,
    participating: normalizedGuests.filter((guest) => guest.cannabisParticipation === 'participate')
      .length,
    notConsuming: normalizedGuests.filter((guest) => guest.cannabisParticipation === 'not_consume')
      .length,
    undecided: normalizedGuests.filter((guest) => guest.cannabisParticipation === 'undecided')
      .length,
    missingResponses: normalizedGuests.filter(
      (guest) => guest.cannabisParticipation === 'no_response' || !guest.hasResponded
    ).length,
  }

  return {
    events: events.map((event) => ({
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      status: event.status,
    })),
    selectedEvent: {
      id: selectedEvent.id,
      occasion: selectedEvent.occasion,
      event_date: selectedEvent.event_date,
      serve_time: selectedEvent.serve_time,
      status: selectedEvent.status,
    },
    summary,
    guests: normalizedGuests,
    editCutoffIso: editCutoff.toISOString(),
    editWindowOpen,
  }
}

export async function updateChefCannabisGuestProfile(
  input: z.infer<typeof UpdateChefCannabisGuestSchema>
) {
  const validated = UpdateChefCannabisGuestSchema.parse(input)
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_date, serve_time, arrival_time, tenant_id, cannabis_preference')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  const cutoff = parseEditCutoff(event.event_date, event.arrival_time, event.serve_time)
  if (new Date() > cutoff) {
    throw new Error('This guest intake is now read-only.')
  }

  const { data: guest, error: guestError } = await supabase
    .from('event_guests')
    .select('id, event_id, tenant_id, guest_token, rsvp_status')
    .eq('id', validated.guestId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (guestError || !guest) {
    throw new Error('Guest not found for this event')
  }

  const guestUpdatePayload: Record<string, unknown> = {}
  if (validated.attendingStatus) {
    guestUpdatePayload.rsvp_status = validated.attendingStatus === 'yes' ? 'attending' : 'declined'
  }
  if (validated.additionalNote !== undefined) {
    guestUpdatePayload.notes = validated.additionalNote || null
  }
  if (validated.dietaryNotes !== undefined) {
    guestUpdatePayload.dietary_restrictions = (validated.dietaryNotes || '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 25)
  }

  if (Object.keys(guestUpdatePayload).length > 0) {
    const { error: guestUpdateError } = await supabase
      .from('event_guests')
      .update(guestUpdatePayload)
      .eq('id', guest.id)
      .eq('tenant_id', user.tenantId!)

    if (guestUpdateError) {
      throw new Error('Failed to update guest RSVP')
    }
  }

  const { data: existingProfile } = await (supabase
    .from('guest_event_profile' as any)
    .select('*')
    .eq('event_id', validated.eventId)
    .eq('guest_token', guest.guest_token)
    .maybeSingle() as any)

  const profilePayload = {
    event_id: validated.eventId,
    guest_token: guest.guest_token,
    attending_status:
      validated.attendingStatus ??
      existingProfile?.attending_status ??
      deriveAttendingStatus(guest.rsvp_status) ??
      'yes',
    cannabis_participation:
      validated.cannabisParticipation ?? existingProfile?.cannabis_participation ?? 'undecided',
    familiarity_level:
      validated.familiarityLevel === undefined
        ? (existingProfile?.familiarity_level ?? null)
        : validated.familiarityLevel,
    consumption_style:
      validated.consumptionStyle === undefined
        ? (existingProfile?.consumption_style ?? [])
        : validated.consumptionStyle,
    edible_familiarity:
      validated.edibleFamiliarity === undefined
        ? (existingProfile?.edible_familiarity ?? null)
        : validated.edibleFamiliarity,
    preferred_dose_note:
      validated.preferredDoseNote === undefined
        ? (existingProfile?.preferred_dose_note ?? null)
        : validated.preferredDoseNote || null,
    comfort_notes:
      validated.comfortNotes === undefined
        ? (existingProfile?.comfort_notes ?? null)
        : validated.comfortNotes || null,
    dietary_notes:
      validated.dietaryNotes === undefined
        ? (existingProfile?.dietary_notes ?? null)
        : validated.dietaryNotes || null,
    accessibility_notes:
      validated.accessibilityNotes === undefined
        ? (existingProfile?.accessibility_notes ?? null)
        : validated.accessibilityNotes || null,
    discuss_in_person_flag:
      validated.discussInPersonFlag === undefined
        ? !!existingProfile?.discuss_in_person_flag
        : validated.discussInPersonFlag,
    additional_note:
      validated.additionalNote === undefined
        ? (existingProfile?.additional_note ?? null)
        : validated.additionalNote || null,
    age_confirmed: existingProfile?.age_confirmed ?? false,
    final_confirmation: existingProfile?.final_confirmation ?? false,
    voluntary_acknowledgment: existingProfile?.voluntary_acknowledgment ?? false,
    alcohol_acknowledgment: existingProfile?.alcohol_acknowledgment ?? false,
    transportation_acknowledgment: existingProfile?.transportation_acknowledgment ?? false,
  }

  const { error: profileError } = await (supabase
    .from('guest_event_profile' as any)
    .upsert(profilePayload, { onConflict: 'event_id,guest_token' }) as any)

  if (profileError) {
    throw new Error('Failed to update guest intake profile')
  }

  revalidatePath('/cannabis/rsvps')
  return { success: true }
}

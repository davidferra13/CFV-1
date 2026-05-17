'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CircleEventHub,
  CircleUpdate,
  CircleUpdateAuthorType,
  CircleDietarySummary,
  CircleGuestView,
  CircleOverview,
  CircleEventDetails,
  CircleHubSettings,
  CircleGuestEntry,
} from './event-hub-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PostUpdateSchema = z.object({
  circleId: z.string().uuid(),
  content: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) => s.trim()),
  pinned: z.boolean().optional().default(false),
  revealAt: z.string().datetime().nullable().optional().default(null),
})

const UpdateSettingsSchema = z.object({
  circleId: z.string().uuid(),
  settings: z.object({
    occasion: z.string().max(200).nullable().optional(),
    theme: z.string().max(200).nullable().optional(),
    dressCode: z.string().max(200).nullable().optional(),
    vibe: z.string().max(200).nullable().optional(),
    chatEnabled: z.boolean().optional(),
    guestPhotosEnabled: z.boolean().optional(),
    guestListVisible: z.boolean().optional(),
    hiddenSections: z.array(z.string()).optional(),
  }),
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VEGETARIAN_KEYWORDS = ['vegetarian', 'veggie', 'no meat']
const VEGAN_KEYWORDS = ['vegan', 'plant-based', 'plant based']
const GLUTEN_FREE_KEYWORDS = ['gluten-free', 'gluten free', 'celiac', 'coeliac']

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function matchesCategory(items: string[], keywords: string[]): boolean {
  return items.some((item) => {
    const lower = item.toLowerCase()
    return keywords.some((kw) => lower.includes(kw))
  })
}

async function assertCircleOwner(db: any, circleId: string, tenantId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) throw new Error('Circle not found or unauthorized')
}

async function fetchCircleWithEvent(db: any, circleId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select(
      `
      id,
      name,
      event_id,
      tenant_id,
      description,
      planning_brief
    `
    )
    .eq('id', circleId)
    .single()

  if (!circle) return null

  let event: any = null
  if (circle.event_id) {
    const { data: ev } = await db
      .from('events')
      .select(
        `
        id,
        event_date,
        serve_time,
        arrival_time,
        occasion,
        guest_count,
        location_address,
        location_city,
        location_state,
        location_zip,
        location_notes,
        access_instructions,
        special_requests,
        dietary_restrictions,
        allergies,
        status
      `
      )
      .eq('id', circle.event_id)
      .single()
    event = ev
  }

  let chefName = 'Chef'
  if (circle.tenant_id) {
    const { data: chef } = await db
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', circle.tenant_id)
      .single()
    if (chef) {
      chefName = chef.display_name || chef.business_name || 'Chef'
    }
  }

  return { circle, event, chefName }
}

function buildSettings(planningBrief: any): CircleHubSettings {
  const brief = planningBrief ?? {}
  return {
    occasion: brief.occasion ?? null,
    theme: brief.theme ?? null,
    dressCode: brief.dressCode ?? brief.dress_code ?? null,
    vibe: brief.vibe ?? null,
    chatEnabled: brief.chatEnabled ?? true,
    guestPhotosEnabled: brief.guestPhotosEnabled ?? false,
    guestListVisible: brief.guestListVisible ?? false,
    hiddenSections: brief.hiddenSections ?? [],
  }
}

function buildOverview(
  circle: any,
  event: any,
  chefName: string,
  settings: CircleHubSettings,
  guestCount: number
): CircleOverview {
  return {
    circleName: circle.name,
    eventDate: event?.event_date ?? null,
    serveTime: event?.serve_time ?? null,
    occasion: settings.occasion ?? event?.occasion ?? null,
    theme: settings.theme,
    dressCode: settings.dressCode,
    vibe: settings.vibe,
    chefName,
    guestCount: event?.guest_count ?? guestCount,
    locationCity: event?.location_city ?? null,
    locationState: event?.location_state ?? null,
  }
}

function buildDetails(event: any, settings: CircleHubSettings): CircleEventDetails {
  return {
    locationAddress: event?.location_address ?? null,
    locationCity: event?.location_city ?? null,
    locationState: event?.location_state ?? null,
    locationZip: event?.location_zip ?? null,
    locationNotes: event?.location_notes ?? null,
    accessInstructions: event?.access_instructions ?? null,
    eventDate: event?.event_date ?? null,
    serveTime: event?.serve_time ?? null,
    arrivalTime: event?.arrival_time ?? null,
    dressCode: settings.dressCode,
    specialRequests: event?.special_requests ?? null,
  }
}

// ---------------------------------------------------------------------------
// getCircleEventHub - Full hub data (chef/host view)
// ---------------------------------------------------------------------------

export async function getCircleEventHub(circleId: string): Promise<CircleEventHub | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const result = await fetchCircleWithEvent(db, circleId)
  if (!result) return null

  const { circle, event, chefName } = result
  const settings = buildSettings(circle.planning_brief)

  // Fetch members
  const { data: members } = await db
    .from('hub_group_members')
    .select(
      `
      id,
      profile_id,
      role,
      joined_at
    `
    )
    .eq('group_id', circleId)
    .order('joined_at', { ascending: true })

  const memberRows = (members ?? []) as Array<{
    id: string
    profile_id: string
    role: string
    joined_at: string
  }>

  // Fetch profiles for members
  const profileIds = memberRows.map((m) => m.profile_id)
  let profileMap = new Map<
    string,
    { displayName: string; dietary: string[]; allergies: string[] }
  >()

  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, known_dietary, known_allergies')
      .in('id', profileIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        displayName: p.display_name,
        dietary: (p.known_dietary ?? []).filter(Boolean),
        allergies: (p.known_allergies ?? []).filter(Boolean),
      })
    }
  }

  // Build guest list
  const guests: CircleGuestEntry[] = memberRows.map((m) => {
    const profile = profileMap.get(m.profile_id)
    return {
      profileId: m.profile_id,
      displayName: profile?.displayName ?? 'Guest',
      role: m.role,
      joinedAt: m.joined_at,
      dietaryRestrictions: profile?.dietary ?? [],
      allergies: profile?.allergies ?? [],
    }
  })

  // Fetch updates
  const updates = await fetchCircleUpdates(db, circleId)

  // Build dietary summary (also uses event_guests if event is linked)
  const dietarySummary = await buildDietarySummary(
    db,
    circleId,
    event?.id,
    user.tenantId!,
    profileMap
  )

  const overview = buildOverview(circle, event, chefName, settings, guests.length)
  const details = buildDetails(event, settings)

  return {
    circleId: circle.id,
    eventId: circle.event_id,
    tenantId: circle.tenant_id,
    overview,
    details,
    settings,
    guests,
    updates,
    dietarySummary,
  }
}

// ---------------------------------------------------------------------------
// postCircleUpdate - Chef/host posts an update to the circle feed
// ---------------------------------------------------------------------------

export async function postCircleUpdate(
  circleId: string,
  content: string,
  options?: { pinned?: boolean; revealAt?: string | null }
): Promise<CircleUpdate> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const validated = PostUpdateSchema.parse({
    circleId,
    content,
    pinned: options?.pinned,
    revealAt: options?.revealAt,
  })

  const { data, error } = await db
    .from('circle_updates')
    .insert({
      circle_id: validated.circleId,
      tenant_id: user.tenantId,
      author_type: 'chef' as CircleUpdateAuthorType,
      author_name: user.email,
      content: validated.content,
      pinned: validated.pinned,
      reveal_at: validated.revealAt,
    })
    .select('id, circle_id, author_type, author_name, content, pinned, reveal_at, created_at')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/circle/${circleId}`)

  return {
    id: data.id,
    circleId: data.circle_id,
    authorType: data.author_type,
    authorName: data.author_name,
    content: data.content,
    pinned: data.pinned,
    revealAt: data.reveal_at,
    createdAt: data.created_at,
  }
}

// ---------------------------------------------------------------------------
// getCircleUpdates - Timeline of updates
// ---------------------------------------------------------------------------

export async function getCircleUpdates(circleId: string): Promise<CircleUpdate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  return fetchCircleUpdates(db, circleId)
}

async function fetchCircleUpdates(db: any, circleId: string): Promise<CircleUpdate[]> {
  const { data, error } = await db
    .from('circle_updates')
    .select('id, circle_id, author_type, author_name, content, pinned, reveal_at, created_at')
    .eq('circle_id', circleId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    authorType: row.author_type,
    authorName: row.author_name,
    content: row.content,
    pinned: row.pinned ?? false,
    revealAt: row.reveal_at,
    createdAt: row.created_at,
  }))
}

// ---------------------------------------------------------------------------
// getCircleDietarySummary - Aggregated dietary needs
// ---------------------------------------------------------------------------

export async function getCircleDietarySummary(circleId: string): Promise<CircleDietarySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  // Get circle to find linked event
  const { data: circle } = await db
    .from('hub_groups')
    .select('event_id')
    .eq('id', circleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!circle) throw new Error('Circle not found')

  // Fetch member profiles
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)

  const profileIds = ((members ?? []) as any[]).map((m: any) => m.profile_id)
  const profileMap = new Map<
    string,
    { displayName: string; dietary: string[]; allergies: string[] }
  >()

  if (profileIds.length > 0) {
    const { data: profiles } = await db
      .from('hub_guest_profiles')
      .select('id, display_name, known_dietary, known_allergies')
      .in('id', profileIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        displayName: p.display_name,
        dietary: (p.known_dietary ?? []).filter(Boolean),
        allergies: (p.known_allergies ?? []).filter(Boolean),
      })
    }
  }

  return buildDietarySummary(db, circleId, circle.event_id, user.tenantId!, profileMap)
}

async function buildDietarySummary(
  db: any,
  circleId: string,
  eventId: string | null,
  tenantId: string,
  profileMap: Map<string, { displayName: string; dietary: string[]; allergies: string[] }>
): Promise<CircleDietarySummary> {
  const guestEntries: Array<{
    name: string
    restrictions: string[]
    allergies: string[]
    hasResponded: boolean
  }> = []

  // From hub_guest_profiles (circle members)
  for (const [, profile] of profileMap) {
    const hasInfo = profile.dietary.length > 0 || profile.allergies.length > 0
    guestEntries.push({
      name: profile.displayName,
      restrictions: profile.dietary,
      allergies: profile.allergies,
      hasResponded: hasInfo,
    })
  }

  // Also pull from event_guests if an event is linked (may have more data)
  if (eventId) {
    const { data: eventGuests } = await db
      .from('event_guests')
      .select('full_name, dietary_restrictions, allergies, rsvp_status')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    for (const eg of eventGuests ?? []) {
      const restrictions = (eg.dietary_restrictions ?? []).filter(Boolean)
      const allergies = (eg.allergies ?? []).filter(Boolean)
      // Avoid duplicates: if a name already exists in the list, skip
      const alreadyListed = guestEntries.some(
        (g) => g.name.toLowerCase() === (eg.full_name ?? '').toLowerCase()
      )
      if (!alreadyListed) {
        guestEntries.push({
          name: eg.full_name,
          restrictions,
          allergies,
          hasResponded: eg.rsvp_status !== 'pending',
        })
      }
    }
  }

  // Aggregate counts
  const counts = {
    allergies: 0,
    vegetarian: 0,
    vegan: 0,
    glutenFree: 0,
    noRestrictions: 0,
    other: 0,
  }

  let responded = 0
  for (const guest of guestEntries) {
    if (guest.hasResponded) responded++
    if (guest.allergies.length > 0) counts.allergies++
    if (matchesCategory(guest.restrictions, VEGAN_KEYWORDS)) counts.vegan++
    else if (matchesCategory(guest.restrictions, VEGETARIAN_KEYWORDS)) counts.vegetarian++
    if (matchesCategory(guest.restrictions, GLUTEN_FREE_KEYWORDS)) counts.glutenFree++

    const hasAnyInfo = guest.restrictions.length > 0 || guest.allergies.length > 0
    if (!hasAnyInfo && guest.hasResponded) {
      counts.noRestrictions++
    } else if (
      hasAnyInfo &&
      !matchesCategory(guest.restrictions, [
        ...VEGETARIAN_KEYWORDS,
        ...VEGAN_KEYWORDS,
        ...GLUTEN_FREE_KEYWORDS,
      ]) &&
      guest.allergies.length === 0
    ) {
      counts.other++
    }
  }

  return {
    totalGuests: guestEntries.length,
    responded,
    counts,
    guests: guestEntries,
  }
}

// ---------------------------------------------------------------------------
// getCircleGuestView - Personalized view for a specific guest
// ---------------------------------------------------------------------------

export async function getCircleGuestView(
  circleId: string,
  profileToken: string
): Promise<CircleGuestView | null> {
  // No auth required; this is a public guest endpoint gated by profile token
  const db: any = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name, known_dietary, known_allergies, profile_token')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return null

  // Verify membership
  const { data: membership } = await db
    .from('hub_group_members')
    .select('id, role')
    .eq('group_id', circleId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) return null

  // Fetch circle + event
  const result = await fetchCircleWithEvent(db, circleId)
  if (!result) return null

  const { circle, event, chefName } = result
  const settings = buildSettings(circle.planning_brief)

  // Check guest count from members
  const { data: memberCount } = await db
    .from('hub_group_members')
    .select('id', { count: 'exact' })
    .eq('group_id', circleId)

  const guestCount = memberCount?.length ?? 0
  const overview = buildOverview(circle, event, chefName, settings, guestCount)
  const details = buildDetails(event, settings)

  const dietary = (profile.known_dietary ?? []).filter(Boolean)
  const allergies = (profile.known_allergies ?? []).filter(Boolean)
  const hasInfo = dietary.length > 0 || allergies.length > 0

  return {
    profileId: profile.id,
    displayName: profile.display_name,
    dietaryStatus: hasInfo ? 'submitted' : 'pending',
    dietaryRestrictions: dietary,
    allergies,
    rsvpStatus: null, // Could be wired to event_guests rsvp_status if linked
    role: membership.role,
    overview,
    details,
    settings,
  }
}

// ---------------------------------------------------------------------------
// updateCircleSettings - Update circle hub settings (chef only)
// ---------------------------------------------------------------------------

export async function updateCircleSettings(
  circleId: string,
  settingsPatch: Partial<CircleHubSettings>
): Promise<CircleHubSettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validated = UpdateSettingsSchema.parse({
    circleId,
    settings: settingsPatch,
  })

  await assertCircleOwner(db, validated.circleId, user.tenantId!)

  // Read current planning_brief
  const { data: circle } = await db
    .from('hub_groups')
    .select('planning_brief')
    .eq('id', validated.circleId)
    .single()

  if (!circle) throw new Error('Circle not found')

  const currentBrief = circle.planning_brief ?? {}
  const merged = { ...currentBrief, ...validated.settings }

  const { error } = await db
    .from('hub_groups')
    .update({
      planning_brief: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.circleId)

  if (error) throw new Error(error.message)

  revalidatePath(`/circle/${validated.circleId}`)

  return buildSettings(merged)
}

// ---------------------------------------------------------------------------
// pinCircleUpdate / unpinCircleUpdate
// ---------------------------------------------------------------------------

export async function pinCircleUpdate(circleId: string, updateId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { error } = await db
    .from('circle_updates')
    .update({ pinned: true })
    .eq('id', updateId)
    .eq('circle_id', circleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/circle/${circleId}`)
}

export async function unpinCircleUpdate(circleId: string, updateId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { error } = await db
    .from('circle_updates')
    .update({ pinned: false })
    .eq('id', updateId)
    .eq('circle_id', circleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/circle/${circleId}`)
}

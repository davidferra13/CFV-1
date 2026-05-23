'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireChef, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS,
  buildDinnerCircleArrivalGuideReadiness,
  filterDinnerCircleArrivalGuideForViewer,
  normalizeDinnerCircleArrivalGuide,
} from './arrival-guide'
import { normalizeDinnerCircleConfig } from './event-circle'
import type {
  DinnerCircleArrivalGuide,
  DinnerCircleArrivalGuideSection,
  DinnerCircleArrivalGuideSectionKey,
  DinnerCircleArrivalGuideVisibility,
  DinnerCircleConfig,
} from './types'

const SECTION_KEYS = DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.map((section) => section.key) as [
  DinnerCircleArrivalGuideSectionKey,
  ...DinnerCircleArrivalGuideSectionKey[],
]

const VISIBILITIES = [
  'attendee_visible',
  'host_and_chef',
  'chef_only',
  'host_only',
] as const satisfies DinnerCircleArrivalGuideVisibility[]

const CircleSchema = z.object({
  circleId: z.string().uuid(),
  printSafe: z.boolean().optional(),
})

const ArrivalGuideSectionInputSchema = z.object({
  key: z.enum(SECTION_KEYS),
  body: z
    .string()
    .max(2400)
    .transform((value) => value.trim()),
  visibility: z.enum(VISIBILITIES),
  chefRelevant: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  expiresAt: z.string().datetime().nullable().optional(),
})

const SaveArrivalGuideSchema = z.object({
  circleId: z.string().uuid(),
  status: z.enum(['draft', 'published']).default('draft'),
  notifyAttendees: z.boolean().default(false),
  sections: z.array(ArrivalGuideSectionInputSchema).max(SECTION_KEYS.length),
})

const SaveChefAccessSchema = z.object({
  circleId: z.string().uuid(),
  sections: z.array(ArrivalGuideSectionInputSchema).max(SECTION_KEYS.length),
})

type CircleContext = {
  id: string
  event_id: string | null
  tenant_id: string
  group_token?: string | null
}

type CallerContext =
  | {
      user: AuthUser
      tenantId: string
      viewerRole: 'chef'
      profileId: null
      profileName: string
      isHost: true
    }
  | {
      user: AuthUser
      tenantId: string
      viewerRole: 'host' | 'attendee'
      profileId: string
      profileName: string
      isHost: boolean
    }

function getTenantId(user: AuthUser): string {
  if (user.role === 'chef') return user.entityId
  if (!user.tenantId) throw new Error('Missing tenant context')
  return user.tenantId
}

async function getCircleContext(
  db: any,
  circleId: string,
  tenantId: string
): Promise<CircleContext> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, event_id, tenant_id, group_token')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!circle) throw new Error('Circle not found or unauthorized')
  if (!circle.tenant_id) throw new Error('Circle missing tenant context')
  return circle as CircleContext
}

async function getCallerProfile(db: any, user: AuthUser) {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .or(`auth_user_id.eq.${user.id},client_id.eq.${user.entityId}`)
    .maybeSingle()

  if (!profile) throw new Error('Hub profile not found')
  return {
    id: profile.id as string,
    displayName: (profile.display_name as string | null) || user.email || 'Participant',
  }
}

async function getCallerContext(
  db: any,
  user: AuthUser,
  circle: CircleContext
): Promise<CallerContext> {
  const tenantId = getTenantId(user)

  if (user.role === 'chef') {
    if (user.entityId !== circle.tenant_id) throw new Error('Unauthorized')
    return {
      user,
      tenantId,
      viewerRole: 'chef',
      profileId: null,
      profileName: user.email || 'Chef',
      isHost: true,
    }
  }

  const profile = await getCallerProfile(db, user)
  const { data: member } = await db
    .from('hub_group_members')
    .select('role, is_co_host')
    .eq('group_id', circle.id)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!member) throw new Error('You are not a member of this circle')

  const isHost = ['owner', 'host', 'co_host'].includes(member.role) || member.is_co_host === true

  return {
    user,
    tenantId,
    viewerRole: isHost ? 'host' : 'attendee',
    profileId: profile.id,
    profileName: profile.displayName,
    isHost,
  }
}

async function getCircleConfigForEvent(
  db: any,
  eventId: string,
  tenantId: string
): Promise<{ rowId: string | null; config: DinnerCircleConfig }> {
  const { data: share } = await db
    .from('event_share_settings')
    .select('id, circle_config')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    rowId: (share?.id as string | undefined) ?? null,
    config: normalizeDinnerCircleConfig(share?.circle_config ?? null),
  }
}

async function saveCircleConfigForEvent(
  db: any,
  eventId: string,
  tenantId: string,
  rowId: string | null,
  config: DinnerCircleConfig
) {
  const updatedAt = new Date().toISOString()

  if (rowId) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: config, updated_at: updatedAt })
      .eq('id', rowId)
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Failed to save arrival guide: ${error.message}`)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: updatedAt,
  })
  if (error) throw new Error(`Failed to create arrival guide: ${error.message}`)
}

function requireLinkedEvent(circle: CircleContext): string {
  if (!circle.event_id) throw new Error('This circle is not linked to an event yet')
  return circle.event_id
}

function revalidateCircle(circle: CircleContext) {
  if (circle.group_token) revalidatePath(`/my-hub/g/${circle.group_token}`)
  if (circle.event_id) revalidatePath(`/events/${circle.event_id}`)
}

function sectionLabel(key: DinnerCircleArrivalGuideSectionKey) {
  return (
    DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.find((section) => section.key === key)?.label ??
    'Arrival guide'
  )
}

function toStoredGuide(
  input: z.infer<typeof SaveArrivalGuideSchema>,
  authorName: string,
  existing: DinnerCircleArrivalGuide
): DinnerCircleArrivalGuide {
  const now = new Date().toISOString()
  const sections: DinnerCircleArrivalGuide['sections'] = { ...existing.sections }

  for (const section of input.sections) {
    if (!section.body) continue
    const previous = existing.sections[section.key]
    sections[section.key] = {
      key: section.key,
      label: sectionLabel(section.key),
      body: section.body,
      visibility: section.visibility,
      chefRelevant: section.chefRelevant,
      sensitive: section.sensitive,
      expiresAt: section.expiresAt ?? null,
      updatedAt: previous?.body === section.body ? previous.updatedAt : now,
      updatedByName: authorName,
    }
  }

  return normalizeDinnerCircleArrivalGuide({
    status: input.status,
    publishedAt:
      input.status === 'published' ? (existing.publishedAt ?? now) : (existing.publishedAt ?? null),
    updatedAt: now,
    notifyAttendeesAt: input.notifyAttendees ? now : (existing.notifyAttendeesAt ?? null),
    sections,
  })
}

function withArrivalGuide(
  config: DinnerCircleConfig,
  arrivalGuide: DinnerCircleArrivalGuide
): DinnerCircleConfig {
  return normalizeDinnerCircleConfig({
    ...config,
    arrivalGuide,
  })
}

async function notifyArrivalGuideUpdated(
  db: any,
  circle: CircleContext,
  tenantId: string,
  senderProfileId: string | null
) {
  if (!senderProfileId) return

  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circle.id)

  const recipients = ((members ?? []) as Array<{ profile_id: string | null }>)
    .map((member) => member.profile_id)
    .filter((profileId): profileId is string => Boolean(profileId))

  const { data: broadcast } = await db
    .from('dinner_circle_broadcasts')
    .insert({
      circle_id: circle.id,
      sender_id: senderProfileId,
      audience_type: 'all',
      audience_filter: null,
      message:
        'The arrival guide was updated. Review parking, entry, access, and timing details before you leave.',
      template_key: 'arrival_guide_updated',
      channel: 'in_app',
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length,
      tenant_id: tenantId,
    })
    .select('id')
    .maybeSingle()

  if (!broadcast?.id || recipients.length === 0) return

  await db.from('dinner_circle_broadcast_deliveries').insert(
    recipients.map((recipientId) => ({
      broadcast_id: broadcast.id,
      circle_id: circle.id,
      recipient_id: recipientId,
      tenant_id: tenantId,
    }))
  )
}

export async function getDinnerCircleArrivalGuide(input: z.infer<typeof CircleSchema>) {
  const user = await requireAuth()
  const validated = CircleSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)
  const eventId = requireLinkedEvent(circle)
  const { config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const guide = normalizeDinnerCircleArrivalGuide(config.arrivalGuide)
  const viewer =
    caller.viewerRole === 'chef'
      ? ({ role: 'chef' } as const)
      : caller.viewerRole === 'host'
        ? ({ role: 'host', profileId: caller.profileId } as const)
        : ({ role: 'attendee', profileId: caller.profileId } as const)

  return {
    success: true,
    viewerRole: caller.viewerRole,
    isHost: caller.isHost,
    guide: filterDinnerCircleArrivalGuideForViewer(guide, viewer, {
      printSafe: validated.printSafe,
    }),
    safeShareGuide: filterDinnerCircleArrivalGuideForViewer(guide, viewer, { printSafe: true }),
    readiness: caller.viewerRole === 'chef' ? buildDinnerCircleArrivalGuideReadiness(guide) : null,
    canEdit: caller.isHost,
  }
}

export async function saveDinnerCircleArrivalGuide(input: z.infer<typeof SaveArrivalGuideSchema>) {
  const user = await requireAuth()
  const validated = SaveArrivalGuideSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)
  if (!caller.isHost) throw new Error('Only a host or chef can publish arrival instructions')

  const eventId = requireLinkedEvent(circle)
  const { rowId, config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const existing = normalizeDinnerCircleArrivalGuide(config.arrivalGuide)
  const nextGuide = toStoredGuide(validated, caller.profileName, existing)

  await saveCircleConfigForEvent(db, eventId, tenantId, rowId, withArrivalGuide(config, nextGuide))

  if (validated.notifyAttendees) {
    await notifyArrivalGuideUpdated(db, circle, tenantId, caller.profileId)
  }

  revalidateCircle(circle)
  return { success: true, guide: nextGuide }
}

export async function saveDinnerCircleChefAccessDetails(
  input: z.infer<typeof SaveChefAccessSchema>
) {
  const user = await requireChef()
  const validated = SaveChefAccessSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = user.entityId
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const eventId = requireLinkedEvent(circle)
  const { rowId, config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const existing = normalizeDinnerCircleArrivalGuide(config.arrivalGuide)
  const now = new Date().toISOString()
  const sections = { ...existing.sections }

  for (const section of validated.sections) {
    if (!section.body) continue
    sections[section.key] = {
      key: section.key,
      label: sectionLabel(section.key),
      body: section.body,
      visibility: section.visibility === 'attendee_visible' ? 'host_and_chef' : section.visibility,
      chefRelevant: true,
      sensitive: section.sensitive,
      expiresAt: section.expiresAt ?? null,
      updatedAt: now,
      updatedByName: user.email || 'Chef',
    }
  }

  const nextGuide = normalizeDinnerCircleArrivalGuide({
    ...existing,
    updatedAt: now,
    sections,
  })

  await saveCircleConfigForEvent(db, eventId, tenantId, rowId, withArrivalGuide(config, nextGuide))

  revalidateCircle(circle)
  return { success: true, readiness: buildDinnerCircleArrivalGuideReadiness(nextGuide) }
}

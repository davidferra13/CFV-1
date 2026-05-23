'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth, requireChef, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildDinnerCircleAccommodationReadiness,
  filterDinnerCircleAccommodationIntakeForViewer,
  normalizeDinnerCircleAccommodationIntake,
} from './accommodation-intake'
import { normalizeDinnerCircleConfig } from './event-circle'
import type {
  DinnerCircleAccommodationCategory,
  DinnerCircleAccommodationIntake,
  DinnerCircleAccommodationNote,
  DinnerCircleConfig,
} from './types'

const AccommodationNoteInputSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum([
    'mobility',
    'seating_access',
    'sensory',
    'language',
    'service_preference',
    'health_food',
  ]),
  note: z
    .string()
    .max(1200)
    .transform((value) => value.trim()),
  visibility: z.enum(['chef_only', 'host_only', 'host_and_chef', 'attendee_visible']),
  chefRelevant: z.boolean().default(true),
})

const SaveAccommodationNotesSchema = z.object({
  circleId: z.string().uuid(),
  notes: z.array(AccommodationNoteInputSchema).max(12),
})

const CircleSchema = z.object({
  circleId: z.string().uuid(),
})

const DeleteAccommodationNoteSchema = z.object({
  circleId: z.string().uuid(),
  noteId: z.string().uuid(),
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
      viewerRole: 'host' | 'member'
      profileId: string
      profileName: string
      isHost: boolean
    }

function getTenantId(user: AuthUser): string {
  const tenantId = user.role === 'chef' ? user.entityId : user.tenantId
  if (!tenantId) throw new Error('Missing tenant context')
  return tenantId
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
    viewerRole: isHost ? 'host' : 'member',
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
    if (error) throw new Error(`Failed to save accommodations: ${error.message}`)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: updatedAt,
  })
  if (error) throw new Error(`Failed to create accommodation record: ${error.message}`)
}

function requireLinkedEvent(circle: CircleContext): string {
  if (!circle.event_id) throw new Error('This circle is not linked to an event yet')
  return circle.event_id
}

function withAccommodationIntake(
  config: DinnerCircleConfig,
  intake: DinnerCircleAccommodationIntake
): DinnerCircleConfig {
  return normalizeDinnerCircleConfig({
    ...config,
    accommodations: normalizeDinnerCircleAccommodationIntake(intake),
  })
}

function toStoredNotes(
  inputNotes: z.infer<typeof AccommodationNoteInputSchema>[],
  existingOwnNotes: DinnerCircleAccommodationNote[],
  caller: Extract<CallerContext, { profileId: string }>
): DinnerCircleAccommodationNote[] {
  const now = new Date().toISOString()
  const existingById = new Map(existingOwnNotes.map((note) => [note.id, note]))

  return inputNotes
    .filter((note) => note.note.length > 0)
    .map((note) => {
      const previous = note.id ? existingById.get(note.id) : null
      return {
        id: previous?.id ?? note.id ?? crypto.randomUUID(),
        category: note.category as DinnerCircleAccommodationCategory,
        note: note.note,
        visibility: note.visibility,
        chefRelevant: note.chefRelevant,
        submittedByProfileId: caller.profileId,
        submittedByName: caller.profileName,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }
    })
}

function revalidateCircle(circle: CircleContext) {
  if (circle.group_token) revalidatePath(`/my-hub/g/${circle.group_token}`)
  if (circle.event_id) revalidatePath(`/events/${circle.event_id}`)
}

export async function getDinnerCircleAccommodationIntake(input: z.infer<typeof CircleSchema>) {
  const user = await requireAuth()
  const validated = CircleSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)
  const eventId = requireLinkedEvent(circle)
  const { config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const intake = normalizeDinnerCircleAccommodationIntake(config.accommodations)

  const viewer =
    caller.viewerRole === 'chef'
      ? ({ role: 'chef' } as const)
      : caller.viewerRole === 'host'
        ? ({ role: 'host', profileId: caller.profileId } as const)
        : ({ role: 'member', profileId: caller.profileId } as const)

  return {
    success: true,
    viewerRole: caller.viewerRole,
    isHost: caller.isHost,
    profileId: caller.profileId,
    intake: filterDinnerCircleAccommodationIntakeForViewer(intake, viewer),
    readiness:
      caller.viewerRole === 'chef' ? buildDinnerCircleAccommodationReadiness(intake) : null,
  }
}

export async function saveDinnerCircleAccommodationNotes(
  input: z.infer<typeof SaveAccommodationNotesSchema>
) {
  const user = await requireAuth()
  const validated = SaveAccommodationNotesSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)

  if (caller.viewerRole === 'chef' || !caller.profileId) {
    throw new Error('Only circle members can submit personal accommodation notes')
  }

  const eventId = requireLinkedEvent(circle)
  const { rowId, config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const intake = normalizeDinnerCircleAccommodationIntake(config.accommodations)
  const ownNotes = intake.notes.filter((note) => note.submittedByProfileId === caller.profileId)
  const nextOwnNotes = toStoredNotes(validated.notes, ownNotes, caller)
  const nextIntake = normalizeDinnerCircleAccommodationIntake({
    ...intake,
    notes: [
      ...intake.notes.filter((note) => note.submittedByProfileId !== caller.profileId),
      ...nextOwnNotes,
    ],
  })

  await saveCircleConfigForEvent(
    db,
    eventId,
    tenantId,
    rowId,
    withAccommodationIntake(config, nextIntake)
  )

  revalidateCircle(circle)
  return { success: true, intake: nextIntake }
}

export async function deleteDinnerCircleAccommodationNote(
  input: z.infer<typeof DeleteAccommodationNoteSchema>
) {
  const user = await requireAuth()
  const validated = DeleteAccommodationNoteSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)

  if (caller.viewerRole === 'chef' || !caller.profileId) {
    throw new Error('Only the submitter can delete an accommodation note')
  }

  const eventId = requireLinkedEvent(circle)
  const { rowId, config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const intake = normalizeDinnerCircleAccommodationIntake(config.accommodations)
  const note = intake.notes.find((entry) => entry.id === validated.noteId)
  if (!note) throw new Error('Accommodation note not found')
  if (note.submittedByProfileId !== caller.profileId) {
    throw new Error('Only the submitter can delete this accommodation note')
  }

  const nextIntake = normalizeDinnerCircleAccommodationIntake({
    ...intake,
    notes: intake.notes.filter((entry) => entry.id !== validated.noteId),
  })

  await saveCircleConfigForEvent(
    db,
    eventId,
    tenantId,
    rowId,
    withAccommodationIntake(config, nextIntake)
  )

  revalidateCircle(circle)
  return { success: true }
}

export async function requestDinnerCircleAccommodationUpdates(input: z.infer<typeof CircleSchema>) {
  const user = await requireAuth()
  const validated = CircleSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = getTenantId(user)
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const caller = await getCallerContext(db, user, circle)
  if (!caller.isHost) throw new Error('Only a host or chef can request accommodation updates')

  const eventId = requireLinkedEvent(circle)
  const { rowId, config } = await getCircleConfigForEvent(db, eventId, tenantId)
  const intake = normalizeDinnerCircleAccommodationIntake(config.accommodations)
  const nextIntake = normalizeDinnerCircleAccommodationIntake({
    ...intake,
    requestedAt: new Date().toISOString(),
    requestedByProfileId: caller.profileId,
    requestedByName: caller.profileName,
  })

  await saveCircleConfigForEvent(
    db,
    eventId,
    tenantId,
    rowId,
    withAccommodationIntake(config, nextIntake)
  )

  revalidateCircle(circle)
  return { success: true, requestedAt: nextIntake.requestedAt }
}

export async function getDinnerCircleAccommodationReadiness(input: z.infer<typeof CircleSchema>) {
  const user = await requireChef()
  const validated = CircleSchema.parse(input)
  const db: any = createServerClient()
  const tenantId = user.entityId
  const circle = await getCircleContext(db, validated.circleId, tenantId)
  const eventId = requireLinkedEvent(circle)
  const { config } = await getCircleConfigForEvent(db, eventId, tenantId)

  return {
    success: true,
    readiness: buildDinnerCircleAccommodationReadiness(config.accommodations),
  }
}

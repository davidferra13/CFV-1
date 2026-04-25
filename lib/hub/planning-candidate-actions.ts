'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@/lib/db/server'
import { createHubGroup } from './group-actions'
import { getOrCreateProfile } from './profile-actions'
import { normalizeCandidateSnapshot, normalizePlanningBrief } from './planning-brief'
import type {
  CandidateSnapshot,
  HubGroupCandidate,
  HubGuestProfile,
  PlanningBrief,
  PlanningCandidateType,
} from './types'

const CandidateTypeSchema = z.enum(['chef', 'listing', 'menu', 'package', 'meal_prep_item'])

const PlanningBriefSchema = z.record(z.string(), z.unknown()).optional().nullable()

const CreatePlanningGroupSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().optional().nullable(),
  planningBrief: PlanningBriefSchema,
})

const AddCandidateSchema = z.object({
  groupToken: z.string().uuid().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  profileToken: z.string().uuid(),
  candidateType: CandidateTypeSchema,
  sourceId: z.string().uuid(),
  snapshot: z.record(z.string(), z.unknown()),
  notes: z.string().trim().max(500).optional().nullable(),
})

const UpdateBriefSchema = z.object({
  groupToken: z.string().uuid(),
  profileToken: z.string().uuid(),
  planningBrief: PlanningBriefSchema,
})

type ActionResult<T> =
  | ({ success: true } & T)
  | {
      success: false
      error: string
    }

async function rateLimitPublicPlanning(key: string) {
  const headerStore = headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  await checkRateLimit(`planning:${key}:${ip}`, 20, 15 * 60 * 1000)
}

function candidateForeignKey(candidateType: PlanningCandidateType) {
  if (candidateType === 'chef') return 'chef_id'
  if (candidateType === 'listing') return 'directory_listing_id'
  if (candidateType === 'menu') return 'menu_id'
  if (candidateType === 'package') return 'experience_package_id'
  return 'meal_prep_item_id'
}

async function requirePlanningMember(input: {
  groupToken?: string | null
  groupId?: string | null
  profileToken: string
}) {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token, display_name, email, avatar_url')
    .eq('profile_token', input.profileToken)
    .maybeSingle()

  if (!profile) {
    throw new Error('Invalid profile token')
  }

  let groupQuery = db.from('hub_groups').select('id, group_token, group_type, planning_brief, name')

  if (input.groupToken) {
    groupQuery = groupQuery.eq('group_token', input.groupToken)
  } else if (input.groupId) {
    groupQuery = groupQuery.eq('id', input.groupId)
  } else {
    throw new Error('Planning group is required')
  }

  const { data: group } = await groupQuery.maybeSingle()
  if (!group || group.group_type !== 'planning') {
    throw new Error('Planning group not found')
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!membership) {
    throw new Error('Join this planning group before editing it')
  }

  return { db, profile: profile as HubGuestProfile, group }
}

export async function createPlanningGroupFromDiscovery(input: unknown): Promise<
  ActionResult<{
    groupId: string
    groupToken: string
    profileId: string
    profileToken: string
    planningBrief: PlanningBrief
  }>
> {
  try {
    await rateLimitPublicPlanning('create')
    const validated = CreatePlanningGroupSchema.parse(input)
    const planningBrief = normalizePlanningBrief(validated.planningBrief)

    let profile = await getOrCreateProfile({
      displayName: validated.displayName,
      email: validated.email ?? null,
    })

    if (profile.is_existing && !profile.profile_token) {
      profile = await getOrCreateProfile({
        displayName: validated.displayName,
        email: null,
      })
    }

    const group = await createHubGroup({
      name: planningBrief.occasion ? `${planningBrief.occasion} shortlist` : 'Dinner shortlist',
      description: 'Shared planning space for comparing chefs, menus, and food options.',
      emoji: null,
      created_by_profile_id: profile.id,
      group_type: 'planning',
      visibility: 'private',
      planning_brief: planningBrief as Record<string, unknown>,
    })

    if (profile.profile_token) {
      cookies().set('hub_profile_token', profile.profile_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }

    revalidatePath(`/hub/g/${group.group_token}`)

    return {
      success: true,
      groupId: group.id,
      groupToken: group.group_token,
      profileId: profile.id,
      profileToken: profile.profile_token,
      planningBrief,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not create planning group',
    }
  }
}

export async function addPlanningCandidate(
  input: unknown
): Promise<ActionResult<{ candidate: HubGroupCandidate; groupToken: string }>> {
  try {
    await rateLimitPublicPlanning('candidate')
    const validated = AddCandidateSchema.parse(input)
    const { db, profile, group } = await requirePlanningMember({
      groupToken: validated.groupToken,
      groupId: validated.groupId,
      profileToken: validated.profileToken,
    })
    const snapshot = normalizeCandidateSnapshot(validated.snapshot)
    const fkColumn = candidateForeignKey(validated.candidateType)

    const { data: existing } = await db
      .from('hub_group_candidates')
      .select('*')
      .eq('group_id', group.id)
      .eq('candidate_type', validated.candidateType)
      .eq(fkColumn, validated.sourceId)
      .maybeSingle()

    if (existing) {
      const { data: updated, error } = await db
        .from('hub_group_candidates')
        .update({
          snapshot,
          notes: validated.notes ?? existing.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      revalidatePath(`/hub/g/${group.group_token}`)

      return {
        success: true,
        candidate: {
          ...(updated as HubGroupCandidate),
          added_by: profile,
          snapshot: snapshot as CandidateSnapshot,
        },
        groupToken: group.group_token,
      }
    }

    const { data: currentCandidates } = await db
      .from('hub_group_candidates')
      .select('id')
      .eq('group_id', group.id)

    const insertPayload = {
      group_id: group.id,
      added_by_profile_id: profile.id,
      candidate_type: validated.candidateType,
      [fkColumn]: validated.sourceId,
      snapshot,
      notes: validated.notes ?? null,
      sort_order: currentCandidates?.length ?? 0,
    }

    const { data: created, error } = await db
      .from('hub_group_candidates')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`/hub/g/${group.group_token}`)

    return {
      success: true,
      candidate: {
        ...(created as HubGroupCandidate),
        added_by: profile,
        snapshot: snapshot as CandidateSnapshot,
      },
      groupToken: group.group_token,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not add this option',
    }
  }
}

export async function updatePlanningBrief(
  input: unknown
): Promise<ActionResult<{ planningBrief: PlanningBrief }>> {
  try {
    await rateLimitPublicPlanning('brief')
    const validated = UpdateBriefSchema.parse(input)
    const { db, group } = await requirePlanningMember({
      groupToken: validated.groupToken,
      profileToken: validated.profileToken,
    })
    const planningBrief = normalizePlanningBrief(validated.planningBrief)

    const { error } = await db
      .from('hub_groups')
      .update({
        planning_brief: planningBrief,
        updated_at: new Date().toISOString(),
      })
      .eq('id', group.id)

    if (error) throw new Error(error.message)

    revalidatePath(`/hub/g/${group.group_token}`)
    return { success: true, planningBrief }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not update planning brief',
    }
  }
}

export async function getPlanningCandidates(groupId: string): Promise<HubGroupCandidate[]> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_group_candidates')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load planning candidates: ${error.message}`)
  const candidates = (data ?? []) as HubGroupCandidate[]
  const profileIds = [...new Set(candidates.map((candidate) => candidate.added_by_profile_id))]

  if (profileIds.length === 0) return candidates

  const { data: profiles } = await db
    .from('hub_guest_profiles')
    .select(
      'id, email, email_normalized, display_name, avatar_url, bio, profile_token, auth_user_id, client_id, known_allergies, known_dietary, notifications_enabled, created_at, updated_at'
    )
    .in('id', profileIds)

  const profileById = new Map(
    ((profiles ?? []) as HubGuestProfile[]).map((profile) => [profile.id, profile])
  )

  return candidates.map((candidate) => ({
    ...candidate,
    added_by: profileById.get(candidate.added_by_profile_id),
  }))
}

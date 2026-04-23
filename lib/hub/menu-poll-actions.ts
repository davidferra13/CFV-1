'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ensureEventDinnerCircle } from './integration-actions'
import { getCircleForContext, getChefHubProfileId } from './circle-lookup'
import {
  aggregateMenuPollOptions,
  buildDefaultLockSelections,
  pickLeadingMenuPollOption,
  type MenuPollOptionAggregate,
  type MenuPollOptionInput,
  type MenuPollType,
  type MenuPollVoteInput,
} from './menu-polling-core'
import { materializeCanonicalDishIntoMenu } from '@/lib/menus/canonical-dish-menu-core'

const MenuCourseSchema = z.object({
  course_number: z.number().int().positive(),
  course_name: z.string().min(1).max(120),
  question: z.string().min(1).max(300).optional(),
  poll_type: z.enum(['single_choice', 'multi_choice', 'ranked_choice']).default('single_choice'),
  allow_opt_out: z.boolean().default(true),
  max_selections: z.number().int().positive().max(10).optional(),
  dish_index_ids: z.array(z.string().uuid()).min(2).max(10),
})

const CreateDinnerCircleMenuPollIterationSchema = z.object({
  eventId: z.string().uuid(),
  courses: z.array(MenuCourseSchema).min(1).max(12),
})

const LockDinnerCircleMenuSelectionsSchema = z.object({
  eventId: z.string().uuid(),
  profileToken: z.string().uuid(),
  selections: z
    .array(
      z.object({
        pollId: z.string().uuid(),
        optionId: z.string().uuid().optional().nullable(),
        overrideReason: z.string().max(500).optional().nullable(),
      })
    )
    .default([]),
})

async function verifyGroupAccess(groupId: string, groupToken: string | undefined): Promise<void> {
  if (!groupToken) {
    throw new Error('Access denied')
  }

  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', groupId)
    .eq('group_token', groupToken)
    .single()

  if (!data) {
    throw new Error('Access denied')
  }
}

async function ensureEventMenuDraft(input: {
  db: any
  event: any
  actorUserId: string | null
}): Promise<{ id: string; status: string; name: string }> {
  const { db, event, actorUserId } = input
  const now = new Date().toISOString()

  let menu: any | null = null

  if (event.menu_id) {
    const { data } = await db
      .from('menus')
      .select('id, status, name')
      .eq('id', event.menu_id)
      .eq('tenant_id', event.tenant_id)
      .is('deleted_at', null)
      .maybeSingle()
    menu = data ?? null
  }

  if (!menu) {
    const { data } = await db
      .from('menus')
      .select('id, status, name')
      .eq('event_id', event.id)
      .eq('tenant_id', event.tenant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    menu = data ?? null
  }

  if (!menu) {
    const menuName = `${event.occasion ?? 'Dinner'} menu`
    const { data: created, error } = await db
      .from('menus')
      .insert({
        tenant_id: event.tenant_id,
        event_id: event.id,
        name: menuName,
        status: 'draft',
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select('id, status, name')
      .single()

    if (error || !created) {
      throw new Error(`Failed to initialize event menu: ${error?.message ?? 'unknown error'}`)
    }

    menu = created

    await db.from('menu_state_transitions').insert({
      tenant_id: event.tenant_id,
      menu_id: menu.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: actorUserId,
      reason: 'Initialized for Dinner Circle menu polling',
    })
  }

  if (menu.status === 'locked' || menu.status === 'archived') {
    await db
      .from('menus')
      .update({
        status: 'draft',
        locked_at: null,
        archived_at: null,
        updated_at: now,
        updated_by: actorUserId,
      })
      .eq('id', menu.id)
      .eq('tenant_id', event.tenant_id)

    await db.from('menu_state_transitions').insert({
      tenant_id: event.tenant_id,
      menu_id: menu.id,
      from_status: menu.status,
      to_status: 'draft',
      transitioned_by: actorUserId,
      reason: 'Reopened for Dinner Circle menu polling iteration',
    })

    menu = { ...menu, status: 'draft' }
  }

  if (event.menu_id !== menu.id) {
    await db
      .from('events')
      .update({
        menu_id: menu.id,
        updated_at: now,
      })
      .eq('id', event.id)
      .eq('tenant_id', event.tenant_id)
  }

  return menu
}

async function setMenuLockedState(input: {
  db: any
  menuId: string
  tenantId: string
  actorUserId: string | null
  reason: string
}): Promise<void> {
  const { db, menuId, tenantId, actorUserId, reason } = input
  const now = new Date().toISOString()

  const { data: menu } = await db
    .from('menus')
    .select('id, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) {
    throw new Error('Menu not found while locking Dinner Circle selections')
  }

  let currentStatus = menu.status as string

  if (currentStatus === 'archived') {
    await db
      .from('menus')
      .update({
        status: 'draft',
        archived_at: null,
        updated_at: now,
        updated_by: actorUserId,
      })
      .eq('id', menuId)
      .eq('tenant_id', tenantId)

    await db.from('menu_state_transitions').insert({
      tenant_id: tenantId,
      menu_id: menuId,
      from_status: 'archived',
      to_status: 'draft',
      transitioned_by: actorUserId,
      reason,
    })

    currentStatus = 'draft'
  }

  if (currentStatus === 'draft') {
    await db
      .from('menus')
      .update({
        status: 'shared',
        shared_at: now,
        updated_at: now,
        updated_by: actorUserId,
      })
      .eq('id', menuId)
      .eq('tenant_id', tenantId)

    await db.from('menu_state_transitions').insert({
      tenant_id: tenantId,
      menu_id: menuId,
      from_status: 'draft',
      to_status: 'shared',
      transitioned_by: actorUserId,
      reason,
    })

    currentStatus = 'shared'
  }

  if (currentStatus !== 'locked') {
    await db
      .from('menus')
      .update({
        status: 'locked',
        locked_at: now,
        updated_at: now,
        updated_by: actorUserId,
      })
      .eq('id', menuId)
      .eq('tenant_id', tenantId)

    await db.from('menu_state_transitions').insert({
      tenant_id: tenantId,
      menu_id: menuId,
      from_status: currentStatus,
      to_status: 'locked',
      transitioned_by: actorUserId,
      reason,
    })
  }
}

async function resolveTenantActorUserId(input: {
  db: any
  tenantId: string
}): Promise<string | null> {
  const { data: chef } = await input.db
    .from('chefs')
    .select('auth_user_id')
    .eq('id', input.tenantId)
    .single()

  return chef?.auth_user_id ?? null
}

async function loadDishIndexOptions(input: {
  db: any
  tenantId: string
  dishIndexIds: string[]
}): Promise<Map<string, any>> {
  const { db, tenantId, dishIndexIds } = input
  const { data: dishes, error } = await db
    .from('dish_index')
    .select('id, name, course, description, dietary_tags, allergen_flags, linked_recipe_id')
    .in('id', dishIndexIds)
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to load canonical dishes: ${error.message}`)
  }

  return new Map((dishes ?? []).map((dish: any) => [dish.id, dish]))
}

async function loadDishIndexComponents(input: {
  db: any
  tenantId: string
  dishIndexIds: string[]
}): Promise<Map<string, any[]>> {
  const { db, tenantId, dishIndexIds } = input
  const { data: components } = await input.db
    .from('dish_index_components')
    .select('id, dish_id, recipe_id, name, category, description, sort_order')
    .in('dish_id', dishIndexIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  const byDish = new Map<string, any[]>()
  for (const component of components ?? []) {
    const bucket = byDish.get(component.dish_id) ?? []
    bucket.push(component)
    byDish.set(component.dish_id, bucket)
  }

  return byDish
}

function buildMenuPollSnapshot(input: {
  menuId: string
  eventId: string
  courses: Array<z.infer<typeof MenuCourseSchema>>
  dishesById: Map<string, any>
  componentsByDishId: Map<string, any[]>
}) {
  return {
    source: 'dinner_circle_menu_polling',
    menu_id: input.menuId,
    event_id: input.eventId,
    courses: input.courses.map((course) => ({
      course_number: course.course_number,
      course_name: course.course_name,
      question: course.question ?? null,
      poll_type: course.poll_type,
      allow_opt_out: course.allow_opt_out,
      max_selections: course.max_selections ?? null,
      options: course.dish_index_ids.map((dishIndexId) => {
        const dish = input.dishesById.get(dishIndexId)
        const components = input.componentsByDishId.get(dishIndexId) ?? []

        return {
          dish_index_id: dish.id,
          name: dish.name,
          course: dish.course,
          description: dish.description ?? null,
          dietary_tags: dish.dietary_tags ?? [],
          allergen_flags: dish.allergen_flags ?? [],
          linked_recipe_id: dish.linked_recipe_id ?? null,
          components: components.map((component) => ({
            id: component.id,
            name: component.name,
            category: component.category,
            recipe_id: component.recipe_id ?? null,
          })),
        }
      }),
    })),
  }
}

async function createMenuRevisionSnapshot(input: {
  db: any
  eventId: string
  menuId: string
  tenantId: string
  createdBy: string | null
  snapshot: Record<string, unknown>
  changesSummary: string
}) {
  const { db, eventId, menuId, tenantId, createdBy, snapshot, changesSummary } = input

  const { data: latest } = await db
    .from('menu_revisions')
    .select('version')
    .eq('menu_id', menuId)
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const version = Number(latest?.version ?? 0) + 1

  const { data: revision, error } = await db
    .from('menu_revisions')
    .insert({
      menu_id: menuId,
      event_id: eventId,
      tenant_id: tenantId,
      version,
      revision_type: 'chef_update',
      snapshot,
      changes_summary: changesSummary,
      created_by: createdBy,
    })
    .select('id, version')
    .single()

  if (error || !revision) {
    throw new Error(`Failed to write menu revision snapshot: ${error?.message ?? 'unknown error'}`)
  }

  return revision
}

type AggregatedPollCourse = {
  pollId: string
  question: string
  pollType: MenuPollType
  courseNumber: number | null
  courseName: string | null
  isClosed: boolean
  allowOptOut: boolean
  maxSelections: number | null
  createdAt: string
  lockedOptionId: string | null
  lockedAt: string | null
  lockReason: string | null
  totalResponses: number
  optOutResponses: number
  options: Array<
    MenuPollOptionAggregate & {
      metadata: Record<string, unknown> | null
      votedByMe: boolean
      myRank: number | null
      isLeading: boolean
      isLocked: boolean
    }
  >
}

type DinnerCircleMenuPollingIteration = {
  revisionId: string
  createdAt: string
  menuId: string | null
  courseCount: number
  lockedCourseCount: number
  closedCourseCount: number
  isCurrent: boolean
}

async function buildMenuPollingIterationHistory(input: {
  db: any
  groupId: string
  eventId: string
  currentRevisionId?: string | null
}): Promise<DinnerCircleMenuPollingIteration[]> {
  const { db, groupId, eventId, currentRevisionId } = input
  const { data: polls } = await db
    .from('hub_polls')
    .select('source_revision_id, source_menu_id, created_at, locked_option_id, is_closed')
    .eq('group_id', groupId)
    .eq('event_id', eventId)
    .eq('poll_scope', 'menu_course')
    .not('source_revision_id', 'is', null)
    .order('created_at', { ascending: false })

  const historyByRevision = new Map<string, DinnerCircleMenuPollingIteration>()

  for (const poll of polls ?? []) {
    if (!poll.source_revision_id) {
      continue
    }

    const existing = historyByRevision.get(poll.source_revision_id)
    if (!existing) {
      historyByRevision.set(poll.source_revision_id, {
        revisionId: poll.source_revision_id,
        createdAt: poll.created_at,
        menuId: poll.source_menu_id ?? null,
        courseCount: 1,
        lockedCourseCount: poll.locked_option_id ? 1 : 0,
        closedCourseCount: poll.is_closed ? 1 : 0,
        isCurrent: poll.source_revision_id === currentRevisionId,
      })
      continue
    }

    if (poll.created_at < existing.createdAt) {
      existing.createdAt = poll.created_at
    }

    existing.courseCount += 1
    existing.lockedCourseCount += poll.locked_option_id ? 1 : 0
    existing.closedCourseCount += poll.is_closed ? 1 : 0
    existing.isCurrent = existing.isCurrent || poll.source_revision_id === currentRevisionId
  }

  return Array.from(historyByRevision.values()).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )
}

async function buildCurrentMenuPollingState(input: {
  db: any
  groupId: string
  eventId: string
  viewerProfileId?: string | null
}) {
  const { db, groupId, eventId, viewerProfileId } = input

  const { data: latestPoll } = await db
    .from('hub_polls')
    .select('source_revision_id')
    .eq('group_id', groupId)
    .eq('event_id', eventId)
    .eq('poll_scope', 'menu_course')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestPoll?.source_revision_id) {
    return {
      revisionId: null as string | null,
      menuId: null as string | null,
      courses: [] as AggregatedPollCourse[],
      isFullyLocked: false,
    }
  }

  const { data: polls } = await db
    .from('hub_polls')
    .select(
      'id, question, poll_type, is_closed, created_at, course_number, course_name, allow_opt_out, max_selections, locked_option_id, locked_at, lock_reason, source_menu_id'
    )
    .eq('group_id', groupId)
    .eq('event_id', eventId)
    .eq('poll_scope', 'menu_course')
    .eq('source_revision_id', latestPoll.source_revision_id)
    .order('course_number', { ascending: true })
    .order('created_at', { ascending: true })

  const pollIds = (polls ?? []).map((poll: any) => poll.id)
  if (pollIds.length === 0) {
    return {
      revisionId: latestPoll.source_revision_id,
      menuId: null as string | null,
      courses: [] as AggregatedPollCourse[],
      isFullyLocked: false,
    }
  }

  const [{ data: options }, { data: votes }] = await Promise.all([
    db
      .from('hub_poll_options')
      .select('id, poll_id, label, metadata, sort_order, option_type, dish_index_id')
      .in('poll_id', pollIds)
      .order('sort_order', { ascending: true }),
    db
      .from('hub_poll_votes')
      .select('poll_id, option_id, profile_id, rank')
      .in('poll_id', pollIds)
      .is('revoked_at', null),
  ])

  const optionsByPoll = new Map<string, any[]>()
  for (const option of options ?? []) {
    const bucket = optionsByPoll.get(option.poll_id) ?? []
    bucket.push(option)
    optionsByPoll.set(option.poll_id, bucket)
  }

  const votesByPoll = new Map<string, any[]>()
  for (const vote of votes ?? []) {
    const bucket = votesByPoll.get(vote.poll_id) ?? []
    bucket.push(vote)
    votesByPoll.set(vote.poll_id, bucket)
  }

  const courses: AggregatedPollCourse[] = (polls ?? []).map((poll: any) => {
    const optionInputs: MenuPollOptionInput[] = (optionsByPoll.get(poll.id) ?? []).map(
      (option: any) => ({
        id: option.id,
        label: option.label,
        optionType: option.option_type === 'opt_out' ? 'opt_out' : 'standard',
        dishIndexId: option.dish_index_id ?? null,
      })
    )

    const voteInputs: MenuPollVoteInput[] = (votesByPoll.get(poll.id) ?? []).map((vote: any) => ({
      optionId: vote.option_id,
      profileId: vote.profile_id,
      rank: vote.rank ?? null,
    }))

    const aggregated = aggregateMenuPollOptions({
      pollType: poll.poll_type as MenuPollType,
      options: optionInputs,
      votes: voteInputs,
    })

    const leader = pickLeadingMenuPollOption(poll.poll_type as MenuPollType, aggregated)
    const optionRows = optionsByPoll.get(poll.id) ?? []
    const myVotes = new Map<string, number | null>()
    const responders = new Set<string>()

    for (const vote of votesByPoll.get(poll.id) ?? []) {
      responders.add(vote.profile_id)
      if (viewerProfileId && vote.profile_id === viewerProfileId) {
        myVotes.set(vote.option_id, vote.rank ?? null)
      }
    }

    const enrichedOptions = aggregated.map((option) => {
      const raw = optionRows.find((row: any) => row.id === option.id)
      return {
        ...option,
        metadata: (raw?.metadata as Record<string, unknown> | null) ?? null,
        votedByMe: myVotes.has(option.id),
        myRank: myVotes.get(option.id) ?? null,
        isLeading: leader?.id === option.id,
        isLocked: poll.locked_option_id === option.id,
      }
    })

    return {
      pollId: poll.id,
      question: poll.question,
      pollType: poll.poll_type as MenuPollType,
      courseNumber: poll.course_number ?? null,
      courseName: poll.course_name ?? null,
      isClosed: Boolean(poll.is_closed),
      allowOptOut: Boolean(poll.allow_opt_out),
      maxSelections: poll.max_selections ?? null,
      createdAt: poll.created_at,
      lockedOptionId: poll.locked_option_id ?? null,
      lockedAt: poll.locked_at ?? null,
      lockReason: poll.lock_reason ?? null,
      totalResponses: responders.size,
      optOutResponses: enrichedOptions
        .filter((option) => option.optionType === 'opt_out')
        .reduce((sum, option) => sum + option.responseCount, 0),
      options: enrichedOptions,
    }
  })

  return {
    revisionId: latestPoll.source_revision_id,
    menuId: polls?.[0]?.source_menu_id ?? null,
    courses,
    isFullyLocked: courses.length > 0 && courses.every((course) => Boolean(course.lockedOptionId)),
  }
}

async function resolveManagerForEvent(input: { db: any; eventId: string; profileToken: string }) {
  const { db, eventId, profileToken } = input
  const circle = await getCircleForContext({ eventId })
  if (!circle) {
    throw new Error('No Dinner Circle found for this event')
  }

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) {
    throw new Error('Invalid profile token')
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circle.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !['owner', 'admin', 'chef'].includes(membership.role)) {
    throw new Error('Only Dinner Circle owners, admins, or chefs can finalize menu selections')
  }

  return { circle, profileId: profile.id, role: membership.role as string }
}

async function materializeMenuCourseSelection(input: {
  db: any
  tenantId: string
  menuId: string
  courseNumber: number
  courseName: string
  dishIndexId: string
  actorUserId: string | null
}) {
  const materialized = await materializeCanonicalDishIntoMenu({
    db: input.db,
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    menuId: input.menuId,
    dishId: input.dishIndexId,
    mode: 'reference',
    courseNumber: input.courseNumber,
    courseName: input.courseName,
    replaceExistingCourse: true,
  })

  return {
    menuDishId: materialized.menuDishId,
    dishIndexId: materialized.dishIndexId,
    name: materialized.name,
  }
}

export type DinnerCircleMenuPollingState = {
  eventId: string
  groupId: string
  revisionId: string | null
  menuId: string | null
  isFullyLocked: boolean
  courses: AggregatedPollCourse[]
  iterations: DinnerCircleMenuPollingIteration[]
}

export async function getDinnerCircleMenuPollingState(input: {
  groupId: string
  eventId: string
  groupToken?: string
  viewerProfileId?: string | null
}): Promise<DinnerCircleMenuPollingState> {
  await verifyGroupAccess(input.groupId, input.groupToken)
  const db: any = createServerClient({ admin: true })

  const state = await buildCurrentMenuPollingState({
    db,
    groupId: input.groupId,
    eventId: input.eventId,
    viewerProfileId: input.viewerProfileId ?? null,
  })
  const iterations = await buildMenuPollingIterationHistory({
    db,
    groupId: input.groupId,
    eventId: input.eventId,
    currentRevisionId: state.revisionId,
  })

  return {
    eventId: input.eventId,
    groupId: input.groupId,
    revisionId: state.revisionId,
    menuId: state.menuId,
    isFullyLocked: state.isFullyLocked,
    courses: state.courses,
    iterations,
  }
}

export async function createDinnerCircleMenuPollIteration(
  input: z.infer<typeof CreateDinnerCircleMenuPollIterationSchema>
) {
  const user = await requireChef()
  const validated = CreateDinnerCircleMenuPollIterationSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, menu_id, occasion, course_count')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  await ensureEventDinnerCircle({
    eventId: event.id,
    tenantId: user.tenantId!,
    eventTitle: event.occasion ?? 'Dinner Circle',
  })

  const circle = await getCircleForContext({ eventId: event.id })
  if (!circle) {
    throw new Error('Failed to resolve Dinner Circle for this event')
  }

  const chefProfileId = await getChefHubProfileId(user.tenantId!)
  if (!chefProfileId) {
    throw new Error('Chef Dinner Circle profile not found')
  }

  const menu = await ensureEventMenuDraft({
    db,
    event,
    actorUserId: user.id,
  })

  const dishIndexIds = [...new Set(validated.courses.flatMap((course) => course.dish_index_ids))]
  const dishesById = await loadDishIndexOptions({
    db,
    tenantId: user.tenantId!,
    dishIndexIds,
  })
  const componentsByDishId = await loadDishIndexComponents({
    db,
    tenantId: user.tenantId!,
    dishIndexIds,
  })

  for (const course of validated.courses) {
    for (const dishIndexId of course.dish_index_ids) {
      const dish = dishesById.get(dishIndexId)
      if (!dish) {
        throw new Error(`Dish ${dishIndexId} does not belong to this chef`)
      }

      const componentCount = componentsByDishId.get(dishIndexId)?.length ?? 0
      if (!dish.linked_recipe_id && componentCount === 0) {
        throw new Error(
          `${dish.name} cannot be published for Dinner Circle polling until it has a linked recipe or canonical components`
        )
      }
    }
  }

  const revisionSnapshot = buildMenuPollSnapshot({
    menuId: menu.id,
    eventId: event.id,
    courses: validated.courses,
    dishesById,
    componentsByDishId,
  })

  const revision = await createMenuRevisionSnapshot({
    db,
    eventId: event.id,
    menuId: menu.id,
    tenantId: user.tenantId!,
    createdBy: user.id,
    snapshot: revisionSnapshot,
    changesSummary: `Dinner Circle poll iteration published with ${validated.courses.length} course option set(s).`,
  })

  await db
    .from('hub_polls')
    .update({ is_closed: true })
    .eq('group_id', circle.groupId)
    .eq('event_id', event.id)
    .eq('poll_scope', 'menu_course')
    .eq('is_closed', false)

  const now = new Date().toISOString()
  const createdPollIds: string[] = []

  for (const course of validated.courses) {
    const question = course.question?.trim() || `Choose the ${course.course_name.toLowerCase()}`
    const maxSelections =
      course.poll_type === 'single_choice'
        ? 1
        : (course.max_selections ?? course.dish_index_ids.length)

    const { data: poll, error: pollError } = await db
      .from('hub_polls')
      .insert({
        group_id: circle.groupId,
        created_by_profile_id: chefProfileId,
        question,
        poll_type: course.poll_type,
        poll_scope: 'menu_course',
        event_id: event.id,
        source_menu_id: menu.id,
        source_revision_id: revision.id,
        course_number: course.course_number,
        course_name: course.course_name,
        allow_opt_out: course.allow_opt_out,
        max_selections: maxSelections,
        created_at: now,
      })
      .select('id')
      .single()

    if (pollError || !poll) {
      throw new Error(
        `Failed to create Dinner Circle poll: ${pollError?.message ?? 'unknown error'}`
      )
    }

    const optionRows: Array<{
      poll_id: string
      label: string
      sort_order: number
      option_type: 'standard' | 'opt_out'
      dish_index_id: string | null
      metadata: Record<string, unknown>
    }> = course.dish_index_ids.map((dishIndexId, index) => {
      const dish = dishesById.get(dishIndexId)
      const components = componentsByDishId.get(dishIndexId) ?? []

      return {
        poll_id: poll.id,
        label: dish.name,
        sort_order: index,
        option_type: 'standard',
        dish_index_id: dish.id,
        metadata: {
          option_type: 'standard',
          dish_index_id: dish.id,
          description: dish.description ?? null,
          course: dish.course,
          dietary_tags: dish.dietary_tags ?? [],
          allergen_flags: dish.allergen_flags ?? [],
          linked_recipe_id: dish.linked_recipe_id ?? null,
          component_names: components.map((component) => component.name),
        },
      }
    })

    if (course.allow_opt_out) {
      optionRows.push({
        poll_id: poll.id,
        label: `Opt out of ${course.course_name.toLowerCase()}`,
        sort_order: optionRows.length,
        option_type: 'opt_out',
        dish_index_id: null,
        metadata: {
          option_type: 'opt_out',
          opt_out: true,
          course_name: course.course_name,
        },
      })
    }

    const { error: optionError } = await db.from('hub_poll_options').insert(optionRows)
    if (optionError) {
      throw new Error(`Failed to create Dinner Circle poll options: ${optionError.message}`)
    }

    const { data: message } = await db
      .from('hub_messages')
      .insert({
        group_id: circle.groupId,
        author_profile_id: chefProfileId,
        message_type: 'poll',
        body: question,
        system_metadata: {
          poll_id: poll.id,
          poll_scope: 'menu_course',
          course_number: course.course_number,
          course_name: course.course_name,
          source_revision_id: revision.id,
          event_id: event.id,
        },
      })
      .select('id')
      .single()

    if (message?.id) {
      await db.from('hub_polls').update({ message_id: message.id }).eq('id', poll.id)
    }

    createdPollIds.push(poll.id)
  }

  await db
    .from('events')
    .update({
      course_count: validated.courses.length,
      menu_revision_count: revision.version,
      updated_at: now,
    })
    .eq('id', event.id)
    .eq('tenant_id', user.tenantId!)

  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    system_event_type: 'menu_poll_iteration_published',
    body: `New menu options are live. Vote by course so we can finalize the menu.`,
    system_metadata: {
      event_id: event.id,
      source_revision_id: revision.id,
      poll_ids: createdPollIds,
    },
  })

  revalidatePath(`/events/${event.id}`)
  revalidatePath(`/events/${event.id}/menu-polling`)
  revalidatePath(`/events/${event.id}/menu-approval`)

  return {
    success: true,
    groupId: circle.groupId,
    revisionId: revision.id,
    pollIds: createdPollIds,
  }
}

export async function lockDinnerCircleMenuSelections(
  input: z.infer<typeof LockDinnerCircleMenuSelectionsSchema>
) {
  const validated = LockDinnerCircleMenuSelectionsSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const [{ circle, profileId }, { data: event }] = await Promise.all([
    resolveManagerForEvent({
      db,
      eventId: validated.eventId,
      profileToken: validated.profileToken,
    }),
    db
      .from('events')
      .select('id, tenant_id, menu_id, occasion')
      .eq('id', validated.eventId)
      .single(),
  ])

  if (!event) {
    throw new Error('Event not found')
  }

  const actorUserId = await resolveTenantActorUserId({
    db,
    tenantId: event.tenant_id,
  })

  const state = await buildCurrentMenuPollingState({
    db,
    groupId: circle.groupId,
    eventId: event.id,
  })

  if (state.courses.length === 0) {
    throw new Error('No menu course polls are available to lock')
  }

  const selectionByPollId = new Map(
    validated.selections.map((selection) => [selection.pollId, selection])
  )

  const selectedOptionIds = new Set<string>()
  const materializedSelections: Array<{
    pollId: string
    courseNumber: number
    courseName: string
    optionId: string
    dishIndexId: string
    overrideReason: string | null
  }> = []

  for (const course of state.courses) {
    const chosen = selectionByPollId.get(course.pollId)
    const optionId = chosen?.optionId ?? buildDefaultLockSelections(course.pollType, course.options)

    if (!optionId) {
      throw new Error(
        `No canonical dish option is available for ${course.courseName ?? 'this course'}`
      )
    }

    const option = course.options.find((candidate) => candidate.id === optionId)
    if (!option || option.optionType !== 'standard' || !option.dishIndexId) {
      throw new Error(
        `Finalized selection for ${course.courseName ?? 'this course'} must map to a canonical dish`
      )
    }

    if (selectedOptionIds.has(optionId)) {
      throw new Error('Duplicate poll option selected while locking the final menu')
    }

    selectedOptionIds.add(optionId)

    materializedSelections.push({
      pollId: course.pollId,
      courseNumber: course.courseNumber ?? materializedSelections.length + 1,
      courseName: course.courseName ?? `Course ${materializedSelections.length + 1}`,
      optionId,
      dishIndexId: option.dishIndexId,
      overrideReason: chosen?.overrideReason?.trim() || null,
    })
  }

  const menu = await ensureEventMenuDraft({
    db,
    event,
    actorUserId,
  })

  const finalSelections = []
  for (const selection of materializedSelections) {
    const materialized = await materializeMenuCourseSelection({
      db,
      tenantId: event.tenant_id,
      menuId: menu.id,
      courseNumber: selection.courseNumber,
      courseName: selection.courseName,
      dishIndexId: selection.dishIndexId,
      actorUserId,
    })

    finalSelections.push({
      poll_id: selection.pollId,
      course_number: selection.courseNumber,
      course_name: selection.courseName,
      option_id: selection.optionId,
      dish_index_id: selection.dishIndexId,
      menu_dish_id: materialized.menuDishId,
      dish_name: materialized.name,
      override_reason: selection.overrideReason,
    })

    await db
      .from('hub_polls')
      .update({
        locked_option_id: selection.optionId,
        locked_at: new Date().toISOString(),
        locked_by_profile_id: profileId,
        lock_reason: selection.overrideReason,
        is_closed: true,
      })
      .eq('id', selection.pollId)
      .eq('group_id', circle.groupId)
  }

  const revision = await createMenuRevisionSnapshot({
    db,
    eventId: event.id,
    menuId: menu.id,
    tenantId: event.tenant_id,
    createdBy: actorUserId,
    snapshot: {
      source: 'dinner_circle_menu_finalization',
      event_id: event.id,
      menu_id: menu.id,
      selections: finalSelections,
    },
    changesSummary: `Dinner Circle locked final menu selections across ${finalSelections.length} course(s).`,
  })

  await db
    .from('events')
    .update({
      menu_id: menu.id,
      course_count: finalSelections.length,
      menu_approval_status: 'approved',
      menu_approved_at: new Date().toISOString(),
      menu_modified_after_approval: false,
      menu_revision_count: revision.version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id)
    .eq('tenant_id', event.tenant_id)

  await setMenuLockedState({
    db,
    menuId: menu.id,
    tenantId: event.tenant_id,
    actorUserId,
    reason: 'Dinner Circle final menu selections locked',
  })

  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: profileId,
    message_type: 'system',
    system_event_type: 'menu_locked',
    body: 'Final menu selections are locked. The event menu is now ready for costing, prep, and service planning.',
    system_metadata: {
      event_id: event.id,
      menu_id: menu.id,
      source_revision_id: revision.id,
      selections: finalSelections,
    },
  })

  revalidatePath(`/events/${event.id}`)
  revalidatePath(`/events/${event.id}/menu-polling`)
  revalidatePath(`/events/${event.id}/menu-approval`)
  revalidatePath(`/my-events/${event.id}`)

  return {
    success: true,
    menuId: menu.id,
    revisionId: revision.id,
    lockedCourses: finalSelections.length,
  }
}

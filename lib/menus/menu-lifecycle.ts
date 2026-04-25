import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import type { Database } from '@/types/database'

type MenuStatus = Database['public']['Enums']['menu_status']

type MenuTransitionSource = 'chef_action' | 'dinner_circle_menu_polling'

export type MenuTransitionSideEffects = {
  revalidate?: boolean
  activityLog?: boolean
  circleNotifications?: boolean
  dishIndexBridge?: boolean
}

export type TransitionMenuWithContextInput = {
  db: any
  menuId: string
  tenantId: string
  actorUserId: string | null
  toStatus: MenuStatus
  reason?: string
  source?: MenuTransitionSource
  sideEffects?: MenuTransitionSideEffects
}

const VALID_MENU_TRANSITIONS: Record<MenuStatus, MenuStatus[]> = {
  draft: ['shared', 'archived'],
  shared: ['locked', 'draft', 'archived'],
  locked: ['archived'],
  archived: ['draft'],
}

function resolveSideEffects(
  input: {
    source?: MenuTransitionSource
    sideEffects?: MenuTransitionSideEffects
  },
  defaults: MenuTransitionSideEffects = {}
) {
  return {
    revalidate: input.sideEffects?.revalidate ?? defaults.revalidate ?? true,
    activityLog: input.sideEffects?.activityLog ?? defaults.activityLog ?? true,
    circleNotifications:
      input.sideEffects?.circleNotifications ?? defaults.circleNotifications ?? true,
    // Dinner Circle finalization materializes dishes from dish_index references. Re-indexing those
    // rows during the same lifecycle transition can double-count appearances, and the bridge
    // currently requires an authenticated chef session.
    dishIndexBridge:
      input.sideEffects?.dishIndexBridge ??
      defaults.dishIndexBridge ??
      input.source !== 'dinner_circle_menu_polling',
  }
}

async function runMenuTransitionSideEffects(input: {
  menuId: string
  tenantId: string
  actorUserId: string | null
  fromStatus: MenuStatus
  toStatus: MenuStatus
  reason?: string
  source: MenuTransitionSource
  sideEffects: ReturnType<typeof resolveSideEffects>
}) {
  const { menuId, tenantId, actorUserId, fromStatus, toStatus, reason, source, sideEffects } = input

  if (sideEffects.revalidate) {
    revalidatePath('/menus')
    revalidatePath(`/menus/${menuId}`)
  }

  if (sideEffects.activityLog && actorUserId) {
    try {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId,
        actorId: actorUserId,
        action: 'menu_transitioned',
        domain: 'menu',
        entityType: 'menu',
        entityId: menuId,
        summary: `Menu moved from ${fromStatus} to ${toStatus}`,
        context: { from_status: fromStatus, to_status: toStatus, reason, source },
      })
    } catch (err) {
      console.error('[menu-lifecycle] Activity log failed (non-blocking):', err)
    }
  }

  if (sideEffects.circleNotifications && (toStatus === 'shared' || toStatus === 'locked')) {
    try {
      const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
      const adminSupa = createServerClient({ admin: true })
      const { data: menuData } = await adminSupa
        .from('menus')
        .select('name, event_id')
        .eq('id', menuId)
        .single()

      let inquiryId: string | null = null
      if (menuData?.event_id) {
        const { data: inq } = await adminSupa
          .from('inquiries')
          .select('id')
          .eq('converted_to_event_id', menuData.event_id)
          .limit(1)
          .maybeSingle()
        inquiryId = inq?.id ?? null
      }

      const menuName = menuData?.name || 'Menu'
      const finalized = toStatus === 'locked'
      await circleFirstNotify({
        eventId: menuData?.event_id ?? null,
        inquiryId,
        notificationType: 'menu_shared',
        body: finalized
          ? `Menu finalized: ${menuName}. The meal plan is set!`
          : `Menu shared: ${menuName}. Take a look and let me know what you think!`,
        metadata: {
          menu_id: menuId,
          menu_name: menuName,
          ...(finalized ? { finalized: true } : {}),
        },
        actionUrl: menuData?.event_id ? `/my-events/${menuData.event_id}` : undefined,
        actionLabel: 'View Menu',
      })
    } catch (err) {
      console.error('[menu-lifecycle] Circle-first notify failed (non-blocking):', err)
    }
  }

  if (sideEffects.dishIndexBridge && toStatus === 'locked' && actorUserId) {
    try {
      const { indexDishesFromMenu } = await import('@/lib/menus/dish-index-bridge')
      await indexDishesFromMenu(menuId, tenantId, actorUserId)
    } catch (err) {
      console.error('[menu-lifecycle] Dish index bridge failed (non-blocking):', err)
    }
  }
}

export async function transitionMenuWithContext(input: TransitionMenuWithContextInput) {
  const { db, menuId, tenantId, actorUserId, toStatus, reason, source = 'chef_action' } = input
  const sideEffects = resolveSideEffects(input)

  const { data: menu } = await (db
    .from('menus')
    .select('status, deleted_at')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .single() as any)

  if (!menu || menu.deleted_at) {
    throw new UnknownAppError('Menu not found')
  }

  const currentStatus = menu.status as MenuStatus
  const allowedTransitions = VALID_MENU_TRANSITIONS[currentStatus] || []

  if (!allowedTransitions.includes(toStatus)) {
    throw new UnknownAppError(`Cannot transition menu from '${currentStatus}' to '${toStatus}'`)
  }

  if (toStatus === 'shared' || toStatus === 'locked') {
    const { data: dishes } = await db
      .from('dishes')
      .select('id')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!dishes || dishes.length === 0) {
      throw new UnknownAppError(
        'Cannot share or lock a menu with no dishes. Add at least one dish first.'
      )
    }
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    updated_by: actorUserId,
    updated_at: now,
  }

  if (toStatus === 'shared') {
    updatePayload.shared_at = now
  } else if (toStatus === 'locked') {
    updatePayload.locked_at = now
  } else if (toStatus === 'archived') {
    updatePayload.archived_at = now
  }

  const { error: updateError } = await db
    .from('menus')
    .update(updatePayload)
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)

  if (updateError) {
    console.error('[transitionMenuWithContext] Error:', updateError)
    throw new UnknownAppError('Failed to transition menu')
  }

  await db.from('menu_state_transitions').insert({
    tenant_id: tenantId,
    menu_id: menuId,
    from_status: currentStatus,
    to_status: toStatus,
    transitioned_by: actorUserId,
    reason,
    metadata: { source },
  })

  await runMenuTransitionSideEffects({
    menuId,
    tenantId,
    actorUserId,
    fromStatus: currentStatus,
    toStatus,
    reason,
    source,
    sideEffects,
  })

  return { success: true, fromStatus: currentStatus, toStatus }
}

export async function reopenMenuDraftWithContext({
  db,
  menuId,
  tenantId,
  actorUserId,
  reason,
  source,
  sideEffects: sideEffectInput,
}: {
  db: any
  menuId: string
  tenantId: string
  actorUserId: string | null
  reason: string
  source: 'dinner_circle_menu_polling'
  sideEffects?: MenuTransitionSideEffects
}) {
  const sideEffects = resolveSideEffects(
    { source, sideEffects: sideEffectInput },
    { circleNotifications: false, dishIndexBridge: false }
  )

  const { data: menu } = await (db
    .from('menus')
    .select('status, deleted_at')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .single() as any)

  if (!menu || menu.deleted_at) {
    throw new UnknownAppError('Menu not found')
  }

  const currentStatus = menu.status as MenuStatus
  if (currentStatus !== 'locked' && currentStatus !== 'archived') {
    throw new UnknownAppError(`Cannot reopen menu from '${currentStatus}' to 'draft'`)
  }

  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('menus')
    .update({
      status: 'draft',
      locked_at: null,
      archived_at: null,
      updated_by: actorUserId,
      updated_at: now,
    })
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)

  if (updateError) {
    console.error('[reopenMenuDraftWithContext] Error:', updateError)
    throw new UnknownAppError('Failed to reopen menu draft')
  }

  await db.from('menu_state_transitions').insert({
    tenant_id: tenantId,
    menu_id: menuId,
    from_status: currentStatus,
    to_status: 'draft',
    transitioned_by: actorUserId,
    reason,
    metadata: { source },
  })

  await runMenuTransitionSideEffects({
    menuId,
    tenantId,
    actorUserId,
    fromStatus: currentStatus,
    toStatus: 'draft',
    reason,
    source,
    sideEffects,
  })

  return { success: true, fromStatus: currentStatus, toStatus: 'draft' as const }
}

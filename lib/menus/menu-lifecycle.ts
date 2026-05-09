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
  emailClient?: boolean
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
    emailClient: input.sideEffects?.emailClient ?? defaults.emailClient ?? true,
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
      const { mapToFOHMenuData } = await import('@/lib/menus/foh-menu-data')
      const { getChefLayoutData } = await import('@/lib/chef/layout-cache')
      const adminSupa = createServerClient({ admin: true })

      // Fetch menu with dishes, event, and chef data in parallel
      const [menuResult, dishesResult] = await Promise.all([
        adminSupa
          .from('menus')
          .select(
            'name, event_id, service_style, cuisine_type, target_guest_count, notes, description'
          )
          .eq('id', menuId)
          .single(),
        adminSupa
          .from('dishes')
          .select(
            'course_name, course_number, name, description, dietary_tags, allergen_flags, beverage_pairing'
          )
          .eq('menu_id', menuId)
          .order('course_number', { ascending: true }),
      ])

      const menuRow = menuResult.data
      const dishes = dishesResult.data ?? []

      // Fetch event + inquiry + chef layout in parallel
      let eventData: {
        occasion: string | null
        event_date: string | null
        guest_count: number | null
        client_name: string | null
      } | null = null
      let inquiryId: string | null = null

      if (menuRow?.event_id) {
        const [eventResult, inqResult] = await Promise.all([
          adminSupa
            .from('events')
            .select('occasion, event_date, guest_count, client_id, clients(full_name)')
            .eq('id', menuRow.event_id)
            .single(),
          adminSupa
            .from('inquiries')
            .select('id')
            .eq('converted_to_event_id', menuRow.event_id)
            .limit(1)
            .maybeSingle(),
        ])
        if (eventResult.data) {
          const ev = eventResult.data as any
          eventData = {
            occasion: ev.occasion ?? null,
            event_date: ev.event_date ?? null,
            guest_count: ev.guest_count ?? null,
            client_name: (ev.clients as any)?.full_name ?? null,
          }
        }
        inquiryId = inqResult.data?.id ?? null
      }

      let chefName: string | null = null
      try {
        const chefData = await getChefLayoutData(tenantId)
        chefName = chefData?.business_name ?? null
      } catch {
        // Non-blocking
      }

      // Build FOH data for rich card
      const fohData = mapToFOHMenuData({
        menu: { ...menuRow!, dishes } as any,
        event: eventData,
        chefName,
      })

      const menuName = menuRow?.name || 'Menu'
      const finalized = toStatus === 'locked'

      // Build compact course list for metadata
      const courseList = fohData.courses.map((c) => ({
        label: c.label,
        dishName: c.dishName,
        description: c.description,
        dietaryTags: c.dietaryTags.length > 0 ? c.dietaryTags : undefined,
      }))

      await circleFirstNotify({
        eventId: menuRow?.event_id ?? null,
        inquiryId,
        notificationType: 'menu_shared',
        body: finalized
          ? `Menu finalized: ${menuName}. The meal plan is set!`
          : `Menu shared: ${menuName}. Take a look and let me know what you think!`,
        metadata: {
          menu_id: menuId,
          menu_name: menuName,
          ...(finalized ? { finalized: true } : {}),
          // Rich menu card data
          foh_menu: {
            title: fohData.title,
            date: fohData.date,
            chefName: fohData.chefName,
            serviceStyle: fohData.serviceStyle,
            courses: courseList,
          },
          course_count: fohData.courses.length,
        },
        actionUrl: menuRow?.event_id ? `/my-events/${menuRow.event_id}` : undefined,
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

  // Fire-and-forget: email the FOH menu to the client on shared/locked
  if (sideEffects.emailClient && (toStatus === 'shared' || toStatus === 'locked')) {
    sendFOHMenuEmailToClient(menuId, tenantId).catch((err) => {
      console.error('[menu-lifecycle] FOH menu email failed (non-blocking):', err)
    })
  }
}

/**
 * Sends the FOH menu email to the event's client (if one exists with an email).
 * Fetches all needed data internally using admin client. Non-blocking, fire-and-forget.
 */
async function sendFOHMenuEmailToClient(menuId: string, tenantId: string): Promise<void> {
  const adminSupa = createServerClient({ admin: true })

  // Get menu with event_id
  const { data: menuRow } = await adminSupa
    .from('menus')
    .select('name, event_id, service_style, cuisine_type, target_guest_count, notes, description')
    .eq('id', menuId)
    .single()

  if (!menuRow?.event_id) return // No event linked, no client to email

  // Fetch event with client info (including email)
  const { data: eventRow } = await adminSupa
    .from('events')
    .select('occasion, event_date, guest_count, client_id, clients(full_name, email)')
    .eq('id', menuRow.event_id)
    .single()

  if (!eventRow) return

  const client = (eventRow as any).clients as { full_name?: string; email?: string } | null
  if (!client?.email) return // No client email, skip

  // Fetch dishes + chef data in parallel
  const [dishesResult, chefData] = await Promise.all([
    adminSupa
      .from('dishes')
      .select(
        'course_name, course_number, name, description, dietary_tags, allergen_flags, beverage_pairing'
      )
      .eq('menu_id', menuId)
      .order('course_number', { ascending: true }),
    (async () => {
      try {
        const { getChefLayoutData } = await import('@/lib/chef/layout-cache')
        return await getChefLayoutData(tenantId)
      } catch {
        return null
      }
    })(),
  ])

  const dishes = dishesResult.data ?? []
  if (dishes.length === 0) return // No dishes, nothing to show

  // Build FOH data
  const { mapToFOHMenuData } = await import('@/lib/menus/foh-menu-data')
  const fohData = mapToFOHMenuData({
    menu: { ...menuRow, dishes } as any,
    event: {
      occasion: (eventRow as any).occasion ?? null,
      event_date: (eventRow as any).event_date ?? null,
      guest_count: (eventRow as any).guest_count ?? null,
      client_name: client.full_name ?? null,
    },
    chefName: chefData?.business_name ?? null,
    tagline: chefData?.tagline ?? null,
  })

  // Build public menu URL (placeholder; will use real token system when Stream 2 lands)
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const publicMenuUrl = `${siteUrl}/my-events/${menuRow.event_id}`

  // Send the email
  const { sendEmail } = await import('@/lib/email/send')
  const { FOHMenuEmail, getMenuEmailSubject } = await import('@/lib/email/templates/foh-menu-email')
  const { createElement } = await import('react')

  const subject = getMenuEmailSubject(fohData)

  await sendEmail({
    to: client.email,
    subject,
    react: createElement(FOHMenuEmail, {
      data: fohData,
      publicMenuUrl,
      chefBusinessName: chefData?.business_name ?? undefined,
    }),
  })
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

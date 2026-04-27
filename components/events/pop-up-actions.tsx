'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  createCompTicket,
  createTicketType,
  createWalkInTicket,
  updateTicketType,
} from '@/lib/tickets/actions'
import {
  normalizePopUpConfig,
  normalizeStringList,
  type PopUpConfig,
  type PopUpMenuItemPlan,
  type PopUpOrderSource,
} from './pop-up-model'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'

function mergePopUpConfig(current: PopUpConfig, patch: Partial<PopUpConfig>): PopUpConfig {
  return normalizePopUpConfig({
    ...current,
    ...patch,
    locationProfile:
      patch.locationProfile === undefined
        ? current.locationProfile
        : { ...(current.locationProfile ?? {}), ...patch.locationProfile },
    closeout:
      patch.closeout === undefined
        ? current.closeout
        : { ...(current.closeout ?? {}), ...patch.closeout },
    menuItems: patch.menuItems ?? current.menuItems,
  })
}

async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) throw new Error('Event not found')
}

async function getRawCircleConfig(db: any, eventId: string) {
  const { data } = await db
    .from('event_share_settings')
    .select('id, circle_config')
    .eq('event_id', eventId)
    .maybeSingle()

  return {
    id: data?.id as string | undefined,
    circleConfig:
      data?.circle_config && typeof data.circle_config === 'object'
        ? (data.circle_config as Record<string, unknown>)
        : {},
  }
}

async function writePopUpConfig(db: any, eventId: string, tenantId: string, config: PopUpConfig) {
  const current = await getRawCircleConfig(db, eventId)
  const nextCircleConfig = {
    ...current.circleConfig,
    popUp: config,
  }
  const updatedAt = new Date().toISOString()

  if (current.id) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: nextCircleConfig, updated_at: updatedAt })
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: nextCircleConfig,
    updated_at: updatedAt,
  })
  if (error) throw new Error(error.message)
}

async function getCurrentPopUpConfig(db: any, eventId: string) {
  const raw = await getRawCircleConfig(db, eventId)
  return normalizePopUpConfig((raw.circleConfig as any).popUp ?? null)
}

export async function updatePopUpConfigAction(input: {
  eventId: string
  patch: Partial<PopUpConfig>
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  await assertEventOwner(db, input.eventId, user.tenantId!)
  const current = await getCurrentPopUpConfig(db, input.eventId)
  const next = mergePopUpConfig(current, input.patch)
  await writePopUpConfig(db, input.eventId, user.tenantId!, next)
  revalidatePath(`/events/${input.eventId}`)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'event_share_settings',
      action: 'update',
      reason: 'Pop-up config updated',
    })
  } catch {}
  return { success: true, config: next }
}

export async function addProductToPopUpAction(input: {
  eventId: string
  dishIndexId: string
  plannedUnits?: number
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  await assertEventOwner(db, input.eventId, user.tenantId!)

  const { data: summary } = await db
    .from('dish_index_summary')
    .select(
      'id, name, course, linked_recipe_id, recipe_name, per_portion_cost_cents, prep_complexity, season_affinity, tags, times_served, avg_rating'
    )
    .eq('id', input.dishIndexId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  const { data: dish } = await db
    .from('dish_index')
    .select('special_equipment, dna')
    .eq('id', input.dishIndexId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!summary) throw new Error('Product not found')

  const current = await getCurrentPopUpConfig(db, input.eventId)
  const existing = current.menuItems.some((item) => item.dishIndexId === input.dishIndexId)
  if (existing) return { success: true, config: current }

  const nextItem: PopUpMenuItemPlan = {
    dishIndexId: String(summary.id),
    recipeId: summary.linked_recipe_id ?? null,
    name: summary.name ?? 'Untitled product',
    plannedUnits: Math.max(1, Math.round(input.plannedUnits ?? 24)),
    batchSize: 12,
    unitCostCents:
      summary.per_portion_cost_cents === null || summary.per_portion_cost_cents === undefined
        ? null
        : Number(summary.per_portion_cost_cents),
    priceCents: null,
    prepLeadHours:
      summary.prep_complexity === 'intensive'
        ? 36
        : summary.prep_complexity === 'moderate'
          ? 18
          : 8,
    productionStatus: 'not_started',
    equipmentNeeded: normalizeStringList(dish?.special_equipment),
    constraints: normalizeStringList((dish?.dna as any)?.popUpConstraints),
    notes: [summary.course, summary.recipe_name ? `Recipe: ${summary.recipe_name}` : null]
      .filter(Boolean)
      .join(' | '),
  }

  const next = mergePopUpConfig(current, {
    menuItems: [...current.menuItems, nextItem],
    stage: current.stage === 'concept' ? 'menu_build' : current.stage,
  })
  await writePopUpConfig(db, input.eventId, user.tenantId!, next)
  revalidatePath(`/events/${input.eventId}`)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'event_share_settings',
      action: 'update',
      reason: 'Pop-up product added',
    })
  } catch {}
  return { success: true, config: next }
}

export async function syncPopUpMenuItemToTicketTypeAction(input: {
  eventId: string
  itemName: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  await assertEventOwner(db, input.eventId, user.tenantId!)

  const current = await getCurrentPopUpConfig(db, input.eventId)
  const item = current.menuItems.find((entry) => entry.name === input.itemName)
  if (!item) throw new Error('Menu item not found')

  const priceCents = Math.max(0, Math.round(item.priceCents ?? 0))
  const capacity = Math.max(1, Math.round(item.plannedUnits || 1))
  const description = [item.notes, item.dishIndexId ? `Dish index: ${item.dishIndexId}` : null]
    .filter(Boolean)
    .join('\n')

  let ticketTypeId = item.ticketTypeId ?? null
  if (ticketTypeId) {
    await updateTicketType({
      id: ticketTypeId,
      eventId: input.eventId,
      name: item.name,
      description,
      priceCents,
      capacity,
      isActive: true,
    })
  } else {
    const ticketType = await createTicketType({
      eventId: input.eventId,
      name: item.name,
      description,
      priceCents,
      capacity,
      sortOrder: current.menuItems.findIndex((entry) => entry.name === item.name),
    })
    ticketTypeId = ticketType.id
  }

  const next = mergePopUpConfig(current, {
    menuItems: current.menuItems.map((entry) =>
      entry.name === item.name ? { ...entry, ticketTypeId, priceCents } : entry
    ),
  })
  await writePopUpConfig(db, input.eventId, user.tenantId!, next)
  revalidatePath(`/events/${input.eventId}`)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'event_share_settings',
      action: 'update',
      reason: 'Pop-up menu item synced to ticket type',
    })
  } catch {}
  return { success: true, config: next }
}

export async function createManualPopUpOrderAction(input: {
  eventId: string
  ticketTypeId: string
  buyerName: string
  buyerEmail?: string
  quantity: number
  paidCents: number
  source: PopUpOrderSource
  notes?: string
}) {
  const user = await requireChef()
  const sourceNote = `Pop-Up source: ${input.source}${input.notes ? ` | ${input.notes}` : ''}`
  const quantity = Math.max(1, Math.round(input.quantity))
  const paidCents = Math.max(0, Math.round(input.paidCents))

  if (input.source === 'comp' || paidCents === 0) {
    await createCompTicket({
      eventId: input.eventId,
      ticketTypeId: input.ticketTypeId,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail || 'comp@cheflowhq.com',
      quantity,
      notes: sourceNote,
    })
  } else {
    await createWalkInTicket({
      eventId: input.eventId,
      ticketTypeId: input.ticketTypeId,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      quantity,
      paidCents,
      notes: sourceNote,
    })
  }

  revalidatePath(`/events/${input.eventId}`)
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'tickets',
      action: 'insert',
      reason: 'Pop-up manual order created',
    })
  } catch {}
  return { success: true }
}

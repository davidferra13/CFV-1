'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getDinnerCircleConfig,
  normalizeDinnerCircleConfig,
  normalizePopUpConfig,
} from '@/lib/dinner-circles/event-circle'
import type { DinnerCircleConfig } from '@/lib/dinner-circles/types'
import { buildPopUpOperatingSnapshot } from './snapshot'
import type {
  PopUpCloseoutItem,
  PopUpConfig,
  PopUpMenuItemPlan,
  PopUpOperatingSnapshot,
  PopUpOrderSource,
} from './types'

const PopUpOrderSourceSchema = z.enum([
  'online',
  'dm',
  'comment',
  'word_of_mouth',
  'form',
  'walkup',
  'comp',
])

const PopUpMenuItemPlanSchema = z.object({
  ticketTypeId: z.string().uuid().nullable().optional(),
  dishIndexId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(180),
  plannedUnits: z.number().int().min(0),
  suggestedUnits: z.number().int().min(0).nullable().optional(),
  bufferPercent: z.number().min(0).max(100).nullable().optional(),
  batchSize: z.number().int().min(0).nullable().optional(),
  unitCostCents: z.number().int().min(0).nullable().optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  targetMarginPercent: z.number().min(0).max(100).nullable().optional(),
  prepLeadHours: z.number().int().min(0).nullable().optional(),
  productionStatus: z
    .enum(['not_started', 'prep_started', 'batched', 'packed', 'ready'])
    .optional(),
  equipmentNeeded: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
})

const UpdatePopUpConfigSchema = z.object({
  eventId: z.string().uuid(),
  patch: z.record(z.string(), z.unknown()),
})

const AddProductSchema = z.object({
  eventId: z.string().uuid(),
  dishIndexId: z.string().uuid(),
  plannedUnits: z.number().int().min(0).optional(),
})

const SyncMenuItemSchema = z.object({
  eventId: z.string().uuid(),
  item: PopUpMenuItemPlanSchema,
})

const ManualOrderSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  buyerName: z.string().min(1).max(180),
  buyerEmail: z.string().email().optional(),
  quantity: z.number().int().positive(),
  paidCents: z.number().int().min(0),
  source: PopUpOrderSourceSchema,
  notes: z.string().max(2000).optional(),
})

const CloseoutItemSchema = z.object({
  name: z.string().min(1).max(180),
  plannedUnits: z.number().int().min(0),
  producedUnits: z.number().int().min(0),
  soldUnits: z.number().int().min(0),
  wastedUnits: z.number().int().min(0),
  soldOutAt: z.string().nullable().optional(),
  revenueCents: z.number().int().min(0),
  estimatedCostCents: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
})

const CaptureCloseoutSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(CloseoutItemSchema),
  notes: z.string().max(4000).optional(),
})

async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data: event, error } = await db
    .from('events')
    .select(
      'id, title, occasion, event_date, status, location, location_address, location_city, location_state, guest_count'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) throw new Error('Event not found')
  return event
}

async function upsertCircleConfig(
  db: any,
  eventId: string,
  tenantId: string,
  config: DinnerCircleConfig
) {
  const { data: existing } = await db
    .from('event_share_settings')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  const updatedAt = new Date().toISOString()
  if (existing) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: config, updated_at: updatedAt })
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: updatedAt,
  })
  if (error) throw new Error(error.message)
}

function mergePopUpConfig(current: PopUpConfig, patch: Partial<PopUpConfig>): PopUpConfig {
  return normalizePopUpConfig({
    ...current,
    ...patch,
    locationProfile:
      patch.locationProfile === undefined
        ? current.locationProfile
        : { ...(current.locationProfile ?? {}), ...(patch.locationProfile ?? {}) },
    closeout:
      patch.closeout === undefined
        ? current.closeout
        : { ...(current.closeout ?? {}), ...(patch.closeout ?? {}) },
  })
}

function sourceNotes(source: PopUpOrderSource, notes?: string) {
  return [`[popup_source:${source}]`, notes?.trim()].filter(Boolean).join('\n')
}

function historicalDemandFromConfigs(
  rows: Array<{ event_id: string; circle_config: any }>,
  eventId: string
) {
  return rows.flatMap((row) => {
    if (row.event_id === eventId) return []
    const config = normalizeDinnerCircleConfig(row.circle_config ?? null)
    return (config.popUp?.closeout?.itemResults ?? []).flatMap((result) => {
      const planned = config.popUp?.menuItems.find((item) => item.name === result.name)
      return planned?.dishIndexId
        ? [{ dishIndexId: planned.dishIndexId, soldUnits: result.soldUnits }]
        : []
    })
  })
}

export async function getPopUpOperatingSnapshot(eventId: string): Promise<PopUpOperatingSnapshot> {
  const user = await requireChef()
  const db: any = createServerClient()
  const event = await assertEventOwner(db, eventId, user.tenantId!)
  const config = (await getDinnerCircleConfig(eventId)).popUp ?? normalizePopUpConfig(null)

  const [{ data: ticketTypes }, { data: tickets }] = await Promise.all([
    db
      .from('event_ticket_types')
      .select('id, name, price_cents, capacity, sold_count, is_active')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true }),
    db
      .from('event_tickets')
      .select(
        'id, ticket_type_id, quantity, total_cents, payment_status, source, notes, created_at'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .neq('payment_status', 'cancelled')
      .order('created_at', { ascending: false }),
  ])

  const dishIds = [
    ...new Set(config.menuItems.map((item) => item.dishIndexId).filter(Boolean)),
  ] as string[]
  const { data: dishSummaries } = dishIds.length
    ? await db
        .from('dish_index_summary')
        .select(
          'id, name, linked_recipe_id, times_served, per_portion_cost_cents, recipe_cost_cents'
        )
        .in('id', dishIds)
        .eq('tenant_id', user.tenantId!)
    : { data: [] }

  const { data: historicalConfigs } = await db
    .from('event_share_settings')
    .select('event_id, circle_config')
    .eq('tenant_id', user.tenantId!)

  return buildPopUpOperatingSnapshot({
    event,
    config,
    ticketTypes: ticketTypes ?? [],
    tickets: tickets ?? [],
    dishSummaries: dishSummaries ?? [],
    historicalDemand: historicalDemandFromConfigs(historicalConfigs ?? [], eventId),
  })
}

export async function updatePopUpConfig(input: { eventId: string; patch: Partial<PopUpConfig> }) {
  const user = await requireChef()
  const validated = UpdatePopUpConfigSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const current = await getDinnerCircleConfig(validated.eventId)
  const next = normalizeDinnerCircleConfig({
    ...current,
    popUp: mergePopUpConfig(
      current.popUp ?? normalizePopUpConfig(null),
      validated.patch as Partial<PopUpConfig>
    ),
  })

  await upsertCircleConfig(db, validated.eventId, user.tenantId!, next)
  revalidatePath(`/events/${validated.eventId}`)
  return { success: true, config: next.popUp }
}

export async function addProductToPopUp(input: {
  eventId: string
  dishIndexId: string
  plannedUnits?: number
}) {
  const user = await requireChef()
  const validated = AddProductSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const { data: dish, error } = await db
    .from('dish_index_summary')
    .select('id, name, linked_recipe_id, times_served, per_portion_cost_cents')
    .eq('id', validated.dishIndexId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !dish) throw new Error('Product not found')

  const current = await getDinnerCircleConfig(validated.eventId)
  const currentPopUp = current.popUp ?? normalizePopUpConfig(null)
  const existingIndex = currentPopUp.menuItems.findIndex((item) => item.dishIndexId === dish.id)
  const item: PopUpMenuItemPlan = {
    ...(existingIndex >= 0 ? currentPopUp.menuItems[existingIndex] : {}),
    dishIndexId: dish.id,
    recipeId: dish.linked_recipe_id ?? null,
    name: dish.name,
    plannedUnits:
      validated.plannedUnits ?? currentPopUp.menuItems[existingIndex]?.plannedUnits ?? 24,
    unitCostCents: dish.per_portion_cost_cents ?? null,
    productionStatus: currentPopUp.menuItems[existingIndex]?.productionStatus ?? 'not_started',
  }
  const menuItems =
    existingIndex >= 0
      ? currentPopUp.menuItems.map((existing, index) => (index === existingIndex ? item : existing))
      : [...currentPopUp.menuItems, item]
  const next = normalizeDinnerCircleConfig({
    ...current,
    popUp: normalizePopUpConfig({ ...currentPopUp, stage: 'menu_build', menuItems }),
  })

  await upsertCircleConfig(db, validated.eventId, user.tenantId!, next)
  revalidatePath(`/events/${validated.eventId}`)
  return {
    success: true,
    item: normalizePopUpConfig(next.popUp).menuItems.find((entry) => entry.dishIndexId === dish.id),
  }
}

export async function syncPopUpMenuItemToTicketType(input: {
  eventId: string
  item: PopUpMenuItemPlan
}) {
  const user = await requireChef()
  const validated = SyncMenuItemSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const item = normalizePopUpConfig({ menuItems: [validated.item] }).menuItems[0]
  const capacity = Math.max(0, item.plannedUnits)
  let ticketType: any = null

  if (item.ticketTypeId) {
    const { data: existing } = await db
      .from('event_ticket_types')
      .select('id, sold_count')
      .eq('id', item.ticketTypeId)
      .eq('event_id', validated.eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (!existing) throw new Error('Ticket type not found')
    if ((existing.sold_count ?? 0) > capacity) {
      throw new Error(`Cannot set capacity below ${existing.sold_count} sold units`)
    }
    const { data, error } = await db
      .from('event_ticket_types')
      .update({
        name: item.name,
        price_cents: item.priceCents ?? 0,
        capacity,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.ticketTypeId)
      .eq('event_id', validated.eventId)
      .eq('tenant_id', user.tenantId!)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    ticketType = data
  } else {
    const { data, error } = await db
      .from('event_ticket_types')
      .insert({
        event_id: validated.eventId,
        tenant_id: user.tenantId!,
        name: item.name,
        description: item.notes ?? null,
        price_cents: item.priceCents ?? 0,
        capacity,
        is_active: true,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    ticketType = data
  }

  const current = await getDinnerCircleConfig(validated.eventId)
  const currentPopUp = current.popUp ?? normalizePopUpConfig(null)
  const nextItem = {
    ...item,
    ticketTypeId: ticketType.id,
    priceCents: ticketType.price_cents,
    plannedUnits: ticketType.capacity ?? item.plannedUnits,
  }
  const found = currentPopUp.menuItems.findIndex(
    (entry) =>
      (entry.ticketTypeId && entry.ticketTypeId === item.ticketTypeId) ||
      (entry.dishIndexId && entry.dishIndexId === item.dishIndexId) ||
      entry.name === item.name
  )
  const menuItems =
    found >= 0
      ? currentPopUp.menuItems.map((entry, index) => (index === found ? nextItem : entry))
      : [...currentPopUp.menuItems, nextItem]
  const next = normalizeDinnerCircleConfig({
    ...current,
    popUp: normalizePopUpConfig({ ...currentPopUp, menuItems }),
  })

  await upsertCircleConfig(db, validated.eventId, user.tenantId!, next)
  await db
    .from('event_share_settings')
    .update({ tickets_enabled: true })
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${validated.eventId}`)
  return { success: true, ticketType, item: nextItem }
}

export async function createManualPopUpOrder(input: {
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
  const validated = ManualOrderSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('id, capacity, sold_count, price_cents')
    .eq('id', validated.ticketTypeId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ticketType) throw new Error('Ticket type not found')
  if (
    ticketType.capacity !== null &&
    ticketType.sold_count + validated.quantity > ticketType.capacity
  ) {
    throw new Error('Sold out for this ticket type')
  }

  const { data: reserved, error: reserveError } = await db
    .from('event_ticket_types')
    .update({
      sold_count: ticketType.sold_count + validated.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.ticketTypeId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('sold_count', ticketType.sold_count)
    .select('id')
    .maybeSingle()

  if (reserveError || !reserved) {
    throw new Error('Capacity changed while adding this order. Please try again.')
  }

  const ledgerSource = validated.source === 'comp' || validated.paidCents === 0 ? 'comp' : 'walkin'
  const buyerEmail =
    validated.buyerEmail?.toLowerCase().trim() ||
    `${ledgerSource}-${Date.now()}@manual.cheflow.local`
  const { data, error } = await db
    .from('event_tickets')
    .insert({
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      ticket_type_id: validated.ticketTypeId,
      buyer_name: validated.buyerName.trim(),
      buyer_email: buyerEmail,
      quantity: validated.quantity,
      unit_price_cents: Math.round(validated.paidCents / validated.quantity),
      total_cents: validated.paidCents,
      payment_status: 'paid',
      source: ledgerSource,
      notes: sourceNotes(validated.source, validated.notes),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${validated.eventId}`)
  return { success: true, ticket: data }
}

export async function capturePopUpCloseout(input: {
  eventId: string
  items: PopUpCloseoutItem[]
  notes?: string
}) {
  const user = await requireChef()
  const validated = CaptureCloseoutSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const current = await getDinnerCircleConfig(validated.eventId)
  const currentPopUp = current.popUp ?? normalizePopUpConfig(null)
  const nextPopUp = normalizePopUpConfig({
    ...currentPopUp,
    stage: 'closed',
    closeout: {
      ...(currentPopUp.closeout ?? {}),
      itemResults: validated.items,
      overallNotes: validated.notes ?? currentPopUp.closeout?.overallNotes,
    },
  })
  const next = normalizeDinnerCircleConfig({ ...current, popUp: nextPopUp })

  await upsertCircleConfig(db, validated.eventId, user.tenantId!, next)
  await writeOutcomeDishRows(db, validated.eventId, user.tenantId!, nextPopUp)
  revalidatePath(`/events/${validated.eventId}`)
  return { success: true, closeout: nextPopUp.closeout }
}

async function writeOutcomeDishRows(
  db: any,
  eventId: string,
  tenantId: string,
  popUp: PopUpConfig
) {
  const { data: outcome } = await db
    .from('event_outcomes')
    .upsert(
      {
        event_id: eventId,
        tenant_id: tenantId,
        capture_status: 'captured',
        planned_menu_snapshot: popUp.menuItems,
        planned_dish_count: popUp.menuItems.length,
        actual_dish_count: popUp.closeout?.itemResults.length ?? 0,
        chef_capture_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' }
    )
    .select('id')
    .single()

  if (!outcome) return

  for (const result of popUp.closeout?.itemResults ?? []) {
    const planned = popUp.menuItems.find((item) => item.name === result.name)
    await db.from('event_outcome_dishes').insert({
      event_outcome_id: outcome.id,
      tenant_id: tenantId,
      event_id: eventId,
      dish_index_id: planned?.dishIndexId ?? null,
      recipe_id: planned?.recipeId ?? null,
      planned_name: result.name,
      actual_name: result.name,
      outcome_status: result.soldUnits > 0 ? 'planned_served' : 'planned',
      was_served: result.soldUnits > 0,
      issue_flags: result.wastedUnits > 0 ? ['waste'] : [],
      chef_notes: result.notes ?? null,
    })
  }
}

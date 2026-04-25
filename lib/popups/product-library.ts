import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { PopUpMenuItemPlan, PopUpOrderSource } from '@/lib/dinner-circles/types'
import type { EventTicket, TicketSource } from '@/lib/tickets/types'
import {
  checkTicketTypeCapacity,
  createCompTicket,
  createWalkInTicket,
} from '@/lib/tickets/actions'

type ProductLibraryRow = {
  id: string
  tenant_id: string
  name: string
  course: string | null
  description: string | null
  dietary_tags: unknown
  allergen_flags: unknown
  times_served: number | null
  is_signature: boolean | null
  rotation_status: string | null
  linked_recipe_id: string | null
  prep_complexity: string | null
  tags: unknown
  season_affinity: unknown
  archived: boolean | null
  recipe_name: string | null
  recipe_cost_cents: number | null
  per_portion_cost_cents: number | null
  avg_rating: number | string | null
  feedback_count: number | null
}

export type PopUpProductSellThrough = {
  historicalEvents: number
  plannedUnits: number
  soldUnits: number
  medianSoldUnits: number | null
  sellThroughPercent: number | null
}

export type PopUpProductLibraryItem = {
  id: string
  name: string
  course: string | null
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
  linkedRecipeId: string | null
  recipeName: string | null
  seasonTags: string[]
  tags: string[]
  specialEquipment: string[]
  prepComplexity: string | null
  timesServed: number
  avgRating: number | null
  feedbackCount: number
  recipeCostCents: number | null
  recipeCostPerPortionCents: number | null
  isSignature: boolean
  rotationStatus: string | null
  historicalSellThrough: PopUpProductSellThrough
}

export type PopUpTicketTypeDraft = {
  name: string
  description: string | null
  priceCents: number
  capacity: number
  sortOrder: number
  menuItem: PopUpMenuItemPlan
}

export function calculatePopUpTicketCapacity(input: {
  capacity: number | null
  soldCount: number
  quantity: number
  label?: string
}) {
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) {
    return { ok: false, remaining: input.capacity, error: 'Quantity must be greater than zero' }
  }

  if (input.capacity === null) {
    return { ok: true, remaining: null }
  }

  const remaining = Math.max(0, input.capacity - input.soldCount)
  if (input.quantity > remaining) {
    const label = input.label || 'ticket type'
    return {
      ok: false,
      remaining,
      error:
        remaining > 0 ? `Only ${remaining} unit(s) remaining for ${label}` : `${label} is sold out`,
    }
  }

  return { ok: true, remaining }
}

const ProductLibraryQuerySchema = z.object({
  search: z.string().trim().optional(),
  course: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

const AddProductFromLibrarySchema = z.object({
  eventId: z.string().uuid(),
  dishIndexId: z.string().uuid(),
  plannedUnits: z.number().int().min(1).max(5000).optional(),
  priceCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
})

const ManualPopUpOrderSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  buyerName: z.string().trim().min(1).max(200),
  buyerEmail: z.string().trim().email().optional().or(z.literal('')),
  quantity: z.number().int().min(1).max(500),
  paidCents: z.number().int().min(0),
  source: z.enum(['online', 'dm', 'comment', 'word_of_mouth', 'form', 'walkup', 'comp']),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
})

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toCents(value: unknown): number | null {
  const parsed = toNumber(value)
  return parsed !== null && parsed >= 0 ? Math.round(parsed) : null
}

export function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return normalizeTextArray(parsed)
  } catch {
    // Fall through to comma splitting.
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

export function buildHistoricalSellThrough(
  ticketTypes: Array<{ name: string; capacity: number | null; sold_count: number | null }>
): PopUpProductSellThrough {
  const plannedUnits = ticketTypes.reduce((sum, ticketType) => sum + (ticketType.capacity ?? 0), 0)
  const soldUnits = ticketTypes.reduce((sum, ticketType) => sum + (ticketType.sold_count ?? 0), 0)

  return {
    historicalEvents: ticketTypes.length,
    plannedUnits,
    soldUnits,
    medianSoldUnits: median(ticketTypes.map((ticketType) => ticketType.sold_count ?? 0)),
    sellThroughPercent: plannedUnits > 0 ? Math.round((soldUnits / plannedUnits) * 100) : null,
  }
}

export function normalizeProductLibraryItem(input: {
  row: ProductLibraryRow
  detail?: { special_equipment?: unknown; dna?: unknown } | null
  history?: PopUpProductSellThrough
}): PopUpProductLibraryItem {
  const dna =
    input.detail?.dna && typeof input.detail.dna === 'object' ? (input.detail.dna as any) : {}

  return {
    id: input.row.id,
    name: input.row.name,
    course: input.row.course ?? null,
    description: input.row.description ?? null,
    dietaryTags: normalizeTextArray(input.row.dietary_tags),
    allergenFlags: normalizeTextArray(input.row.allergen_flags),
    linkedRecipeId: input.row.linked_recipe_id ?? null,
    recipeName: input.row.recipe_name ?? null,
    seasonTags: normalizeTextArray(input.row.season_affinity),
    tags: normalizeTextArray(input.row.tags),
    specialEquipment: normalizeTextArray(input.detail?.special_equipment ?? dna.specialEquipment),
    prepComplexity: input.row.prep_complexity ?? null,
    timesServed: Number(input.row.times_served ?? 0),
    avgRating: toNumber(input.row.avg_rating),
    feedbackCount: Number(input.row.feedback_count ?? 0),
    recipeCostCents: toCents(input.row.recipe_cost_cents),
    recipeCostPerPortionCents: toCents(input.row.per_portion_cost_cents),
    isSignature: input.row.is_signature === true,
    rotationStatus: input.row.rotation_status ?? null,
    historicalSellThrough: input.history ?? buildHistoricalSellThrough([]),
  }
}

export function buildPopUpTicketTypeDraft(input: {
  product: PopUpProductLibraryItem
  plannedUnits?: number
  priceCents?: number
  sortOrder?: number
}): PopUpTicketTypeDraft {
  const plannedUnits = Math.max(1, Math.round(input.plannedUnits ?? 24))
  const unitCost = input.product.recipeCostPerPortionCents
  const priceCents = Math.max(0, Math.round(input.priceCents ?? 0))

  return {
    name: input.product.name,
    description: input.product.description,
    priceCents,
    capacity: plannedUnits,
    sortOrder: input.sortOrder ?? 0,
    menuItem: {
      dishIndexId: input.product.id,
      recipeId: input.product.linkedRecipeId,
      name: input.product.name,
      plannedUnits,
      suggestedUnits: input.product.historicalSellThrough.medianSoldUnits ?? plannedUnits,
      unitCostCents: unitCost,
      priceCents,
      prepLeadHours: null,
      prepComplexity: input.product.prepComplexity,
      equipmentNeeded: input.product.specialEquipment,
      productionStatus: 'not_started',
      constraints: unitCost === null ? ['Missing recipe cost'] : [],
      notes: input.product.description ?? undefined,
    } as PopUpMenuItemPlan,
  }
}

export function mapPopUpOrderSourceToTicketSource(source: PopUpOrderSource): TicketSource {
  if (source === 'comp') return 'comp'
  if (source === 'online') return 'chefflow'
  return 'walkin'
}

export function buildManualOrderNotes(input: {
  source: PopUpOrderSource
  notes?: string | null
}): string {
  return [`Pop-up source: ${input.source}`, input.notes?.trim() || null].filter(Boolean).join('\n')
}

async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')
}

async function getDishDetailsById(db: any, tenantId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, any>()

  const { data } = await db
    .from('dish_index')
    .select('id, special_equipment, dna')
    .eq('tenant_id', tenantId)
    .in('id', ids)

  return new Map((data ?? []).map((row: any) => [row.id, row]))
}

async function getHistoryByName(db: any, tenantId: string, names: string[]) {
  if (names.length === 0) return new Map<string, PopUpProductSellThrough>()

  const { data } = await db
    .from('event_ticket_types')
    .select('name, capacity, sold_count')
    .eq('tenant_id', tenantId)
    .in('name', names)

  const grouped = new Map<
    string,
    Array<{ name: string; capacity: number | null; sold_count: number | null }>
  >()
  for (const row of data ?? []) {
    const key = normalizeName(row.name)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }

  return new Map(
    Array.from(grouped.entries()).map(([key, ticketTypes]) => [
      key,
      buildHistoricalSellThrough(ticketTypes),
    ])
  )
}

async function getProductById(db: any, tenantId: string, dishIndexId: string) {
  const { data: row, error } = await db
    .from('dish_index_summary')
    .select(
      'id, tenant_id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, rotation_status, linked_recipe_id, prep_complexity, tags, season_affinity, archived, recipe_name, recipe_cost_cents, per_portion_cost_cents, avg_rating, feedback_count'
    )
    .eq('tenant_id', tenantId)
    .eq('id', dishIndexId)
    .eq('archived', false)
    .single()

  if (error || !row) throw new Error('Product library item not found')

  const details = await getDishDetailsById(db, tenantId, [dishIndexId])
  const history = await getHistoryByName(db, tenantId, [row.name])
  return normalizeProductLibraryItem({
    row,
    detail: details.get(dishIndexId) ?? null,
    history: history.get(normalizeName(row.name)),
  })
}

function upsertPopUpMenuItem(configValue: unknown, item: PopUpMenuItemPlan) {
  const config = configValue && typeof configValue === 'object' ? { ...(configValue as any) } : {}
  const popUp = config.popUp && typeof config.popUp === 'object' ? { ...config.popUp } : {}
  const menuItems = Array.isArray(popUp.menuItems) ? [...popUp.menuItems] : []
  const existingIndex = menuItems.findIndex(
    (candidate: any) =>
      (item.dishIndexId && candidate?.dishIndexId === item.dishIndexId) ||
      (item.ticketTypeId && candidate?.ticketTypeId === item.ticketTypeId)
  )

  if (existingIndex >= 0) {
    menuItems[existingIndex] = { ...menuItems[existingIndex], ...item }
  } else {
    menuItems.push(item)
  }

  return {
    ...config,
    popUp: {
      stage: popUp.stage ?? 'menu_build',
      dropType: popUp.dropType ?? 'other',
      pickupWindows: popUp.pickupWindows ?? [],
      orderSources: popUp.orderSources ?? [
        'online',
        'dm',
        'comment',
        'word_of_mouth',
        'form',
        'walkup',
        'comp',
      ],
      ...popUp,
      menuItems,
    },
  }
}

async function persistPopUpMenuItem(
  db: any,
  eventId: string,
  tenantId: string,
  item: PopUpMenuItemPlan
) {
  const { data: share } = await db
    .from('event_share_settings')
    .select('id, circle_config')
    .eq('event_id', eventId)
    .maybeSingle()

  const circleConfig = upsertPopUpMenuItem(share?.circle_config ?? null, item)
  const updatedAt = new Date().toISOString()

  if (share?.id) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: circleConfig, updated_at: updatedAt })
      .eq('id', share.id)
    if (error) throw new Error(`Failed to update pop-up config: ${error.message}`)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: circleConfig,
    updated_at: updatedAt,
  })
  if (error) throw new Error(`Failed to create pop-up config: ${error.message}`)
}

export async function getPopUpProductLibrary(
  input: z.infer<typeof ProductLibraryQuerySchema> = {}
): Promise<PopUpProductLibraryItem[]> {
  'use server'

  const user = await requireChef()
  const tenantId = user.tenantId!
  const filters = ProductLibraryQuerySchema.parse(input)
  const db: any = createServerClient()

  let query = db
    .from('dish_index_summary')
    .select(
      'id, tenant_id, name, course, description, dietary_tags, allergen_flags, times_served, is_signature, rotation_status, linked_recipe_id, prep_complexity, tags, season_affinity, archived, recipe_name, recipe_cost_cents, per_portion_cost_cents, avg_rating, feedback_count'
    )
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('times_served', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  if (filters.course) query = query.eq('course', filters.course)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load product library: ${error.message}`)

  const rows = (data ?? []) as ProductLibraryRow[]
  const details = await getDishDetailsById(
    db,
    tenantId,
    rows.map((row) => row.id)
  )
  const histories = await getHistoryByName(
    db,
    tenantId,
    rows.map((row) => row.name)
  )

  return rows.map((row) =>
    normalizeProductLibraryItem({
      row,
      detail: details.get(row.id) ?? null,
      history: histories.get(normalizeName(row.name)),
    })
  )
}

export async function addProductLibraryItemToPopUp(
  input: z.infer<typeof AddProductFromLibrarySchema>
) {
  'use server'

  const user = await requireChef()
  const tenantId = user.tenantId!
  const validated = AddProductFromLibrarySchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, tenantId)
  const product = await getProductById(db, tenantId, validated.dishIndexId)
  const draft = buildPopUpTicketTypeDraft({
    product,
    plannedUnits: validated.plannedUnits,
    priceCents: validated.priceCents,
    sortOrder: validated.sortOrder,
  })

  const { data: existing } = await db
    .from('event_ticket_types')
    .select('id, sold_count')
    .eq('event_id', validated.eventId)
    .eq('tenant_id', tenantId)
    .eq('name', draft.name)
    .maybeSingle()

  let ticketType: any
  if (existing) {
    if (draft.capacity < Number(existing.sold_count ?? 0)) {
      throw new Error(
        `Cannot set planned units to ${draft.capacity}; ${existing.sold_count} already sold`
      )
    }

    const { data, error } = await db
      .from('event_ticket_types')
      .update({
        description: draft.description,
        price_cents: draft.priceCents,
        capacity: draft.capacity,
        sort_order: draft.sortOrder,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update ticket type: ${error.message}`)
    ticketType = data
  } else {
    const { data, error } = await db
      .from('event_ticket_types')
      .insert({
        event_id: validated.eventId,
        tenant_id: tenantId,
        name: draft.name,
        description: draft.description,
        price_cents: draft.priceCents,
        capacity: draft.capacity,
        sort_order: draft.sortOrder,
        is_active: true,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create ticket type: ${error.message}`)
    ticketType = data
  }

  const menuItem = {
    ...draft.menuItem,
    ticketTypeId: ticketType.id,
    plannedUnits: ticketType.capacity ?? draft.capacity,
    priceCents: ticketType.price_cents,
  }

  await persistPopUpMenuItem(db, validated.eventId, tenantId, menuItem)
  revalidatePath(`/events/${validated.eventId}`)

  return { product, ticketType, menuItem }
}

export async function addProductFromLibraryToPopUp(
  input: z.infer<typeof AddProductFromLibrarySchema>
) {
  'use server'

  return addProductLibraryItemToPopUp(input)
}

export async function checkManualPopUpOrderCapacity(input: {
  eventId: string
  ticketTypeId: string
  quantity: number
}) {
  'use server'

  return checkTicketTypeCapacity(input)
}

export async function createManualPopUpOrder(
  input: z.infer<typeof ManualPopUpOrderSchema>
): Promise<EventTicket> {
  'use server'

  const validated = ManualPopUpOrderSchema.parse(input)
  const ticketSource = mapPopUpOrderSourceToTicketSource(validated.source)
  const notes = buildManualOrderNotes({ source: validated.source, notes: validated.notes })

  if (ticketSource === 'comp' || validated.paidCents === 0) {
    return createCompTicket({
      eventId: validated.eventId,
      ticketTypeId: validated.ticketTypeId,
      buyerName: validated.buyerName,
      buyerEmail: validated.buyerEmail || 'comp@cheflowhq.com',
      quantity: validated.quantity,
      notes,
    })
  }

  return createWalkInTicket({
    eventId: validated.eventId,
    ticketTypeId: validated.ticketTypeId,
    buyerName: validated.buyerName,
    buyerEmail: validated.buyerEmail || undefined,
    quantity: validated.quantity,
    paidCents: validated.paidCents,
    notes,
  })
}

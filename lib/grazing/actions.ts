'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildGrazingPlan,
  calculateGrazingPricingEstimateFromCosts,
  DEFAULT_GRAZING_COMPONENT_MIX,
} from './scaling-engine'
import { DEFAULT_GRAZING_COMPONENTS, DEFAULT_GRAZING_TEMPLATES } from './seed-data'
import {
  GRAZING_COMPONENT_CATEGORIES,
  GRAZING_DENSITIES,
  GRAZING_FORMATS,
  GRAZING_SERVICE_STYLES,
  type GrazingClientConfirmation,
  type GrazingComponent,
  type GrazingComponentCategory,
  type GrazingDensity,
  type GrazingEdibleCategory,
  type GrazingItem,
  type GrazingMultiEventSnapshot,
  type GrazingPlan,
  type GrazingPlanInput,
  type GrazingPlanStatus,
  type GrazingPrepChecklistGroup,
  type GrazingQuantityLine,
  type GrazingSourcingPlan,
  type GrazingTemplate,
} from './types'

const ComponentMixSchema = z
  .object({
    cheese: z.number().min(0).optional(),
    charcuterie: z.number().min(0).optional(),
    fruit: z.number().min(0).optional(),
    crackers_bread: z.number().min(0).optional(),
    nuts: z.number().min(0).optional(),
    dips_spreads: z.number().min(0).optional(),
    garnish: z.number().min(0).optional(),
  })
  .partial()

const InspirationAssetSchema = z.object({
  url: z.string().url(),
  name: z.string().trim().max(200).optional(),
  type: z.string().trim().max(80).optional(),
})

const UpsertGrazingPlanSchema = z.object({
  eventId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  guestCount: z.number().int().positive().max(1000),
  eventFormat: z.enum([...GRAZING_FORMATS]),
  serviceStyle: z.enum([...GRAZING_SERVICE_STYLES]),
  density: z.enum([...GRAZING_DENSITIES]),
  tableLengthFt: z.number().positive().max(500).nullable().optional(),
  tableWidthFt: z.number().positive().max(100).nullable().optional(),
  budgetCents: z.number().int().nonnegative().nullable().optional(),
  targetMarginPercent: z.number().min(1).max(95).optional(),
  aestheticTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  inspirationNotes: z.string().trim().max(3000).nullable().optional(),
  inspirationAssets: z.array(InspirationAssetSchema).max(20).optional(),
  componentMix: ComponentMixSchema.optional(),
})

const CreateGrazingTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  format: z.enum([...GRAZING_FORMATS]),
  serviceStyle: z.enum([...GRAZING_SERVICE_STYLES]),
  aestheticTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  defaultDensity: z.enum([...GRAZING_DENSITIES]).optional(),
  layoutZones: z.array(z.unknown()).optional(),
  componentMix: ComponentMixSchema.optional(),
  active: z.boolean().optional(),
})

const ListGrazingComponentsSchema = z
  .object({
    category: z.enum([...GRAZING_COMPONENT_CATEGORIES]).optional(),
    active: z.boolean().optional(),
    aestheticTag: z.string().trim().min(1).max(60).optional(),
    seasonTag: z.string().trim().min(1).max(60).optional(),
    dietaryTag: z.string().trim().min(1).max(60).optional(),
  })
  .optional()

const CreateGrazingComponentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum([...GRAZING_COMPONENT_CATEGORIES]),
  aestheticTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  seasonTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  dietaryTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  defaultUnit: z.string().trim().min(1).max(40).optional(),
  defaultVendorId: z.string().uuid().nullable().optional(),
  costPerUnitCents: z.number().int().nonnegative().nullable().optional(),
  clientDescription: z.string().trim().max(500).nullable().optional(),
  prepNotes: z.string().trim().max(1000).nullable().optional(),
  storageNotes: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional(),
})

const UpdateGrazingItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().positive().max(100000).optional(),
  unit: z.string().trim().min(1).max(40).optional(),
  estimatedCostCents: z.number().int().nonnegative().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  clientVisible: z.boolean().optional(),
  substitutionAllowed: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
})

const MultiEventSnapshotSchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .optional()

export type UpsertGrazingPlanInput = z.infer<typeof UpsertGrazingPlanSchema>
export type CreateGrazingTemplateInput = z.infer<typeof CreateGrazingTemplateSchema>
export type ListGrazingComponentsFilters = z.infer<typeof ListGrazingComponentsSchema>
export type CreateGrazingComponentInput = z.infer<typeof CreateGrazingComponentSchema>
export type UpdateGrazingItemInput = z.infer<typeof UpdateGrazingItemSchema>

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

function toSnakeTemplate(input: CreateGrazingTemplateInput, tenantId: string) {
  return {
    tenant_id: tenantId,
    name: input.name,
    format: input.format,
    service_style: input.serviceStyle,
    aesthetic_tags: input.aestheticTags ?? [],
    default_density: input.defaultDensity ?? 'standard',
    layout_zones: JSON.stringify(input.layoutZones ?? []),
    component_mix: JSON.stringify(input.componentMix ?? DEFAULT_GRAZING_COMPONENT_MIX),
    active: input.active ?? true,
  }
}

function toTemplate(row: any): GrazingTemplate {
  return {
    id: String(row.id),
    tenantId: row.tenant_id ? String(row.tenant_id) : undefined,
    name: String(row.name),
    format: row.format,
    serviceStyle: row.service_style,
    aestheticTags: row.aesthetic_tags ?? [],
    defaultDensity: row.default_density,
    layoutZones: parseJson(row.layout_zones, []),
    componentMix: parseJson(row.component_mix, DEFAULT_GRAZING_COMPONENT_MIX),
    active: row.active !== false,
  }
}

function toSnakeComponent(input: CreateGrazingComponentInput, tenantId: string) {
  return {
    tenant_id: tenantId,
    name: input.name,
    category: input.category,
    aesthetic_tags: input.aestheticTags ?? [],
    season_tags: input.seasonTags ?? [],
    dietary_tags: input.dietaryTags ?? [],
    default_unit: input.defaultUnit ?? 'oz',
    default_vendor_id: input.defaultVendorId ?? null,
    cost_per_unit_cents: input.costPerUnitCents ?? null,
    client_description: input.clientDescription ?? null,
    prep_notes: input.prepNotes ?? null,
    storage_notes: input.storageNotes ?? null,
    active: input.active ?? true,
  }
}

function toComponent(row: any): GrazingComponent {
  return {
    id: String(row.id),
    tenantId: row.tenant_id ? String(row.tenant_id) : undefined,
    name: String(row.name),
    category: row.category,
    aestheticTags: row.aesthetic_tags ?? [],
    seasonTags: row.season_tags ?? [],
    dietaryTags: row.dietary_tags ?? [],
    defaultUnit: row.default_unit ?? 'oz',
    defaultVendorId: row.default_vendor_id ?? null,
    costPerUnitCents: row.cost_per_unit_cents ?? null,
    clientDescription: row.client_description ?? null,
    prepNotes: row.prep_notes ?? null,
    storageNotes: row.storage_notes ?? null,
    active: row.active !== false,
  }
}

function toItem(row: any): GrazingItem {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    tenantId: String(row.tenant_id),
    componentId: row.component_id ?? null,
    category: String(row.category),
    name: String(row.name),
    quantity: asNumber(row.quantity),
    unit: String(row.unit),
    estimatedCostCents: Math.round(asNumber(row.estimated_cost_cents)),
    vendorId: row.vendor_id ?? null,
    displayOrder: Math.round(asNumber(row.display_order)),
    clientVisible: row.client_visible !== false,
    substitutionAllowed: row.substitution_allowed !== false,
    notes: row.notes ?? null,
  }
}

function toPlan(row: any, items: GrazingItem[] = []): GrazingPlan {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    tenantId: String(row.tenant_id),
    templateId: row.template_id ?? null,
    status: row.status,
    eventFormat: row.event_format,
    serviceStyle: row.service_style,
    guestCount: Math.round(asNumber(row.guest_count)),
    tableLengthFt: asNullableNumber(row.table_length_ft),
    tableWidthFt: asNullableNumber(row.table_width_ft),
    density: row.density,
    budgetCents: row.budget_cents ?? null,
    targetMarginPercent: asNumber(row.target_margin_percent),
    aestheticTags: row.aesthetic_tags ?? [],
    inspirationNotes: row.inspiration_notes ?? null,
    inspirationAssets: parseJson(row.inspiration_assets, []),
    layoutPlan: parseJson(row.layout_plan, {}),
    quantityPlan: parseJson(row.quantity_plan, {}),
    pricingSnapshot: parseJson(row.pricing_snapshot, {}),
    sourcingSnapshot: parseJson(row.sourcing_snapshot, {}),
    clientConfirmationSnapshot: parseJson(row.client_confirmation_snapshot, {}),
    lockedAt: row.locked_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    items,
  }
}

function initialItemsFromQuantityPlan(
  planId: string,
  tenantId: string,
  quantityPlan: GrazingQuantityLine[]
) {
  return quantityPlan.map((line) => ({
    plan_id: planId,
    tenant_id: tenantId,
    component_id: null,
    category: line.category,
    name: line.label,
    quantity: line.quantity,
    unit: line.unit,
    estimated_cost_cents: line.estimatedCostCents,
    vendor_id: null,
    display_order: line.displayOrder,
    client_visible: line.category !== 'props',
    substitution_allowed: line.category !== 'props',
    notes: line.notes,
  }))
}

function revalidateGrazingEvent(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}?tab=grazing`)
}

async function requireEventForTenant(db: any, eventId: string, tenantId: string) {
  const { data, error } = await db
    .from('events')
    .select('id, tenant_id, occasion, event_date, guest_count, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load event: ${error.message}`)
  if (!data) throw new Error('Event not found')
  return data
}

async function getPlanRowForTenant(db: any, eventId: string, tenantId: string) {
  const { data, error } = await db
    .from('event_grazing_plans')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load grazing plan: ${error.message}`)
  return data
}

async function getItemsForPlan(db: any, planId: string, tenantId: string): Promise<GrazingItem[]> {
  const { data, error } = await db
    .from('event_grazing_items')
    .select('*')
    .eq('plan_id', planId)
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })

  if (error) throw new Error(`Failed to load grazing items: ${error.message}`)
  return (data ?? []).map(toItem)
}

function buildPrepChecklist(): GrazingPrepChecklistGroup[] {
  return [
    {
      offset: 'T-7',
      title: 'Confirm scope',
      items: ['Confirm final guest count', 'Confirm table size', 'Confirm rental and prop needs'],
    },
    {
      offset: 'T-5',
      title: 'Specialty ordering',
      items: ['Order specialty cheese', 'Order charcuterie', 'Confirm vendor pickup windows'],
    },
    {
      offset: 'T-3',
      title: 'Dry goods',
      items: ['Purchase crackers and breads', 'Purchase nuts', 'Pack shelf-stable props'],
    },
    {
      offset: 'T-2',
      title: 'Fresh sourcing',
      items: ['Order produce', 'Source floral or garnish', 'Confirm substitutions'],
    },
    {
      offset: 'T-1',
      title: 'Pack prep',
      items: ['Wash and prep fruit', 'Portion dips', 'Pack props', 'Label containers'],
    },
    {
      offset: 'Day-of',
      title: 'Execution',
      items: [
        'Pickup fresh items',
        'Transport cold',
        'Set table',
        'Quality check',
        'Client handoff',
      ],
    },
  ]
}

function derivePlanInput(plan: GrazingPlan): GrazingPlanInput {
  const quantityPlan = Array.isArray(plan.quantityPlan) ? plan.quantityPlan : []
  const componentMix = quantityPlan
    .filter((line) => line.category !== 'props')
    .reduce(
      (acc, line) => {
        acc[line.category as GrazingEdibleCategory] = line.edibleOz
        return acc
      },
      {} as Partial<Record<GrazingEdibleCategory, number>>
    )

  return {
    guestCount: plan.guestCount,
    eventFormat: plan.eventFormat,
    serviceStyle: plan.serviceStyle,
    density: plan.density,
    tableLengthFt: plan.tableLengthFt,
    tableWidthFt: plan.tableWidthFt,
    budgetCents: plan.budgetCents,
    targetMarginPercent: plan.targetMarginPercent,
    componentMix: Object.keys(componentMix).length > 0 ? componentMix : undefined,
  }
}

export async function getGrazingPlan(eventId: string): Promise<GrazingPlan | null> {
  const eventIdValue = z.string().uuid().parse(eventId)
  const user = await requireChef()
  const db: any = createServerClient()
  await requireEventForTenant(db, eventIdValue, user.tenantId!)
  const row = await getPlanRowForTenant(db, eventIdValue, user.tenantId!)
  if (!row) return null
  const items = await getItemsForPlan(db, row.id, user.tenantId!)
  return toPlan(row, items)
}

export async function upsertGrazingPlan(input: UpsertGrazingPlanInput): Promise<GrazingPlan> {
  const data = UpsertGrazingPlanSchema.parse(input)
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await requireEventForTenant(db, data.eventId, tenantId)
  const existing = await getPlanRowForTenant(db, data.eventId, tenantId)
  if (existing?.status === 'locked') throw new Error('Grazing plan is locked')

  let componentMix = data.componentMix
  if (!componentMix && data.templateId) {
    const { data: template, error } = await db
      .from('grazing_templates')
      .select('component_mix')
      .eq('id', data.templateId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load grazing template: ${error.message}`)
    componentMix = parseJson(template?.component_mix, undefined)
  }

  const generated = buildGrazingPlan({
    guestCount: data.guestCount,
    eventFormat: data.eventFormat,
    serviceStyle: data.serviceStyle,
    density: data.density,
    tableLengthFt: data.tableLengthFt ?? null,
    tableWidthFt: data.tableWidthFt ?? null,
    budgetCents: data.budgetCents ?? null,
    targetMarginPercent: data.targetMarginPercent ?? 65,
    componentMix,
  })

  const payload = {
    event_id: data.eventId,
    tenant_id: tenantId,
    template_id: data.templateId ?? null,
    status: existing?.status ?? 'draft',
    event_format: data.eventFormat,
    service_style: data.serviceStyle,
    guest_count: data.guestCount,
    table_length_ft: data.tableLengthFt ?? null,
    table_width_ft: data.tableWidthFt ?? null,
    density: data.density,
    budget_cents: data.budgetCents ?? null,
    target_margin_percent: data.targetMarginPercent ?? 65,
    aesthetic_tags: data.aestheticTags ?? [],
    inspiration_notes: data.inspirationNotes ?? null,
    inspiration_assets: JSON.stringify(data.inspirationAssets ?? []),
    layout_plan: generated.layoutPlan,
    quantity_plan: generated.quantityPlan,
    pricing_snapshot: generated.pricingEstimate,
    sourcing_snapshot: {},
    client_confirmation_snapshot: existing?.client_confirmation_snapshot ?? {},
    locked_at: null,
  }

  const { data: saved, error } = await db
    .from('event_grazing_plans')
    .upsert(payload, { onConflict: 'event_id' })
    .select()
    .single()

  if (error || !saved)
    throw new Error(`Failed to save grazing plan: ${error?.message ?? 'unknown'}`)

  await db.from('event_grazing_items').delete().eq('plan_id', saved.id).eq('tenant_id', tenantId)
  const itemsPayload = initialItemsFromQuantityPlan(saved.id, tenantId, generated.quantityPlan)
  if (itemsPayload.length > 0) {
    const { error: itemError } = await db.from('event_grazing_items').insert(itemsPayload)
    if (itemError) throw new Error(`Failed to save grazing items: ${itemError.message}`)
  }

  revalidateGrazingEvent(data.eventId)
  const items = await getItemsForPlan(db, saved.id, tenantId)
  return toPlan(saved, items)
}

export async function regenerateGrazingPlan(eventId: string): Promise<GrazingPlan> {
  const existing = await getGrazingPlan(eventId)
  if (!existing) throw new Error('Grazing plan not found')
  if (existing.status === 'locked') throw new Error('Grazing plan is locked')

  return upsertGrazingPlan({
    eventId: existing.eventId,
    templateId: existing.templateId,
    guestCount: existing.guestCount,
    eventFormat: existing.eventFormat,
    serviceStyle: existing.serviceStyle,
    density: existing.density,
    tableLengthFt: existing.tableLengthFt,
    tableWidthFt: existing.tableWidthFt,
    budgetCents: existing.budgetCents,
    targetMarginPercent: existing.targetMarginPercent,
    aestheticTags: existing.aestheticTags,
    inspirationNotes: existing.inspirationNotes,
    inspirationAssets: existing.inspirationAssets,
    componentMix: derivePlanInput(existing).componentMix,
  })
}

export async function listGrazingTemplates(): Promise<GrazingTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data, error } = await db
    .from('grazing_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to list grazing templates: ${error.message}`)
  const rows = (data ?? []).map(toTemplate)
  return rows.length > 0 ? rows : DEFAULT_GRAZING_TEMPLATES
}

export async function createGrazingTemplate(
  input: CreateGrazingTemplateInput
): Promise<GrazingTemplate> {
  const data = CreateGrazingTemplateSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()
  const { data: saved, error } = await db
    .from('grazing_templates')
    .insert(toSnakeTemplate(data, user.tenantId!))
    .select()
    .single()

  if (error || !saved)
    throw new Error(`Failed to create grazing template: ${error?.message ?? 'unknown'}`)
  return toTemplate(saved)
}

export async function listGrazingComponents(
  filters?: ListGrazingComponentsFilters
): Promise<GrazingComponent[]> {
  const data = ListGrazingComponentsSchema.parse(filters)
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('grazing_components')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (data?.category) query = query.eq('category', data.category)
  if (data?.active !== undefined) query = query.eq('active', data.active)
  else query = query.eq('active', true)
  if (data?.aestheticTag) query = query.contains('aesthetic_tags', [data.aestheticTag])
  if (data?.seasonTag) query = query.contains('season_tags', [data.seasonTag])
  if (data?.dietaryTag) query = query.contains('dietary_tags', [data.dietaryTag])

  const { data: rows, error } = await query
  if (error) throw new Error(`Failed to list grazing components: ${error.message}`)

  const components = (rows ?? []).map(toComponent)
  if (components.length > 0) return components

  return DEFAULT_GRAZING_COMPONENTS.filter((component) => {
    if (data?.category && component.category !== data.category) return false
    if (data?.active !== undefined && component.active !== data.active) return false
    if (data?.aestheticTag && !component.aestheticTags.includes(data.aestheticTag)) return false
    if (data?.seasonTag && !component.seasonTags.includes(data.seasonTag)) return false
    if (data?.dietaryTag && !component.dietaryTags.includes(data.dietaryTag)) return false
    return true
  })
}

export async function createGrazingComponent(
  input: CreateGrazingComponentInput
): Promise<GrazingComponent> {
  const data = CreateGrazingComponentSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()
  const { data: saved, error } = await db
    .from('grazing_components')
    .insert(toSnakeComponent(data, user.tenantId!))
    .select()
    .single()

  if (error || !saved)
    throw new Error(`Failed to create grazing component: ${error?.message ?? 'unknown'}`)
  return toComponent(saved)
}

export async function updateGrazingItem(input: UpdateGrazingItemInput): Promise<GrazingPlan> {
  const data = UpdateGrazingItemSchema.parse(input)
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: existing, error: existingError } = await db
    .from('event_grazing_items')
    .select('*')
    .eq('id', data.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existingError) throw new Error(`Failed to load grazing item: ${existingError.message}`)
  if (!existing) throw new Error('Grazing item not found')

  const { data: planRow, error: planError } = await db
    .from('event_grazing_plans')
    .select('*')
    .eq('id', existing.plan_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (planError) throw new Error(`Failed to load grazing plan: ${planError.message}`)
  if (!planRow) throw new Error('Grazing plan not found')
  if (planRow.status === 'locked') throw new Error('Grazing plan is locked')

  const updatePayload: Record<string, unknown> = {}
  if (data.quantity !== undefined) updatePayload.quantity = data.quantity
  if (data.unit !== undefined) updatePayload.unit = data.unit
  if (data.estimatedCostCents !== undefined)
    updatePayload.estimated_cost_cents = data.estimatedCostCents
  if (data.vendorId !== undefined) updatePayload.vendor_id = data.vendorId
  if (data.clientVisible !== undefined) updatePayload.client_visible = data.clientVisible
  if (data.substitutionAllowed !== undefined)
    updatePayload.substitution_allowed = data.substitutionAllowed
  if (data.notes !== undefined) updatePayload.notes = data.notes
  if (data.name !== undefined) updatePayload.name = data.name

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await db
      .from('event_grazing_items')
      .update(updatePayload)
      .eq('id', data.id)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Failed to update grazing item: ${error.message}`)
  }

  const items = await getItemsForPlan(db, existing.plan_id, tenantId)
  const pricing = calculateGrazingPricingEstimateFromCosts({
    guestCount: Math.round(asNumber(planRow.guest_count)),
    estimatedFoodCostCents: items
      .filter((item) => item.category !== 'props')
      .reduce((sum, item) => sum + item.estimatedCostCents, 0),
    estimatedPropsCostCents: items
      .filter((item) => item.category === 'props')
      .reduce((sum, item) => sum + item.estimatedCostCents, 0),
    targetMarginPercent: asNumber(planRow.target_margin_percent),
  })

  const { data: updatedPlan, error: pricingError } = await db
    .from('event_grazing_plans')
    .update({ pricing_snapshot: pricing })
    .eq('id', existing.plan_id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (pricingError || !updatedPlan) {
    throw new Error(`Failed to update grazing pricing: ${pricingError?.message ?? 'unknown'}`)
  }

  revalidateGrazingEvent(updatedPlan.event_id)
  return toPlan(updatedPlan, items)
}

export async function lockGrazingPlan(eventId: string): Promise<GrazingPlan> {
  const eventIdValue = z.string().uuid().parse(eventId)
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  await requireEventForTenant(db, eventIdValue, tenantId)
  const lockedAt = new Date().toISOString()
  const { data, error } = await db
    .from('event_grazing_plans')
    .update({ status: 'locked', locked_at: lockedAt })
    .eq('event_id', eventIdValue)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to lock grazing plan: ${error?.message ?? 'unknown'}`)
  const items = await getItemsForPlan(db, data.id, tenantId)
  revalidateGrazingEvent(eventIdValue)
  return toPlan(data, items)
}

export async function buildGrazingClientConfirmation(
  eventId: string
): Promise<GrazingClientConfirmation> {
  const plan = await getGrazingPlan(eventId)
  if (!plan) throw new Error('Grazing plan not found')
  const user = await requireChef()
  const db: any = createServerClient()

  const includedCategories = plan.items
    .filter((item) => item.clientVisible)
    .reduce((groups, item) => {
      const group = groups.get(item.category) ?? []
      group.push(item.name)
      groups.set(item.category, group)
      return groups
    }, new Map<string, string[]>())

  const confirmation: GrazingClientConfirmation = {
    eventId: plan.eventId,
    status: plan.status,
    guestCount: plan.guestCount,
    eventFormat: plan.eventFormat,
    serviceStyle: plan.serviceStyle,
    aestheticTags: plan.aestheticTags,
    includedCategories: Array.from(includedCategories.entries()).map(([category, items]) => ({
      category,
      items,
    })),
    substitutionNotes: plan.items
      .filter((item) => item.clientVisible && item.substitutionAllowed)
      .map((item) => `${item.name}: comparable substitutions may be used based on freshness.`),
    setupAssumptions: [
      plan.tableLengthFt && plan.tableWidthFt
        ? `Client provides approximately ${plan.tableLengthFt} ft x ${plan.tableWidthFt} ft of table surface.`
        : 'Client provides suitable table surface before setup.',
      'Final presentation follows the approved aesthetic direction and seasonal availability.',
    ],
    dietaryAllergenDisclaimer:
      'Prepared in a kitchen that may handle major allergens. Guests with severe allergies should notify the chef before final sourcing.',
    priceSummary:
      'suggestedQuoteCents' in plan.pricingSnapshot
        ? {
            suggestedQuoteCents: Number(plan.pricingSnapshot.suggestedQuoteCents),
            quotePerGuestCents: Number(plan.pricingSnapshot.quotePerGuestCents),
          }
        : null,
    builtAt: new Date().toISOString(),
  }

  const { error } = await db
    .from('event_grazing_plans')
    .update({ client_confirmation_snapshot: confirmation })
    .eq('event_id', plan.eventId)
    .eq('tenant_id', user.tenantId!)
  if (error) throw new Error(`Failed to save grazing confirmation: ${error.message}`)
  revalidateGrazingEvent(plan.eventId)
  return confirmation
}

export async function buildGrazingSourcingPlan(eventId: string): Promise<GrazingSourcingPlan> {
  const plan = await getGrazingPlan(eventId)
  if (!plan) throw new Error('Grazing plan not found')
  const user = await requireChef()
  const db: any = createServerClient()

  const vendorIds = Array.from(new Set(plan.items.map((item) => item.vendorId).filter(Boolean)))
  const vendorNameById = new Map<string, string>()
  if (vendorIds.length > 0) {
    const { data: vendors } = await db
      .from('vendors')
      .select('id, name')
      .eq('chef_id', user.tenantId!)
      .in('id', vendorIds)
    for (const vendor of vendors ?? []) vendorNameById.set(vendor.id, vendor.name)
  }

  const groups = new Map<
    string,
    { vendorId: string | null; vendorName: string; items: GrazingItem[] }
  >()
  for (const item of plan.items) {
    const key = item.vendorId ?? 'unassigned'
    const existing = groups.get(key) ?? {
      vendorId: item.vendorId,
      vendorName: item.vendorId
        ? (vendorNameById.get(item.vendorId) ?? 'Linked vendor')
        : 'Unassigned',
      items: [],
    }
    existing.items.push(item)
    groups.set(key, existing)
  }

  const sourcingPlan: GrazingSourcingPlan = {
    eventId: plan.eventId,
    vendorGroups: Array.from(groups.values()).map((group) => ({
      ...group,
      subtotalCents: group.items.reduce((sum, item) => sum + item.estimatedCostCents, 0),
    })),
    checklist: buildPrepChecklist(),
    builtAt: new Date().toISOString(),
  }

  const { error } = await db
    .from('event_grazing_plans')
    .update({ sourcing_snapshot: sourcingPlan })
    .eq('event_id', plan.eventId)
    .eq('tenant_id', user.tenantId!)
  if (error) throw new Error(`Failed to save grazing sourcing plan: ${error.message}`)
  revalidateGrazingEvent(plan.eventId)
  return sourcingPlan
}

export async function getGrazingMultiEventSnapshot(input?: {
  from?: string
  to?: string
}): Promise<GrazingMultiEventSnapshot> {
  const data = MultiEventSnapshotSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date()
  const defaultFrom = today.toISOString().slice(0, 10)
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)
    .toISOString()
    .slice(0, 10)
  const from = data?.from ?? defaultFrom
  const to = data?.to ?? defaultTo

  const { data: events, error: eventError } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', from)
    .lte('event_date', to)
    .order('event_date', { ascending: true })
  if (eventError) throw new Error(`Failed to load grazing events: ${eventError.message}`)

  const eventRows = (events ?? []) as any[]
  const eventIds = eventRows.map((event) => event.id)
  if (eventIds.length === 0) {
    return {
      dateRange: { from, to },
      events: [],
      sharedPurchasing: [],
      prepPressure: [],
      lockedOrApprovedPlans: [],
    }
  }

  const { data: plans, error: planError } = await db
    .from('event_grazing_plans')
    .select('id, event_id, status, pricing_snapshot')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)
  if (planError) throw new Error(`Failed to load grazing plans: ${planError.message}`)

  const planRows = (plans ?? []) as any[]
  const planIds = planRows.map((plan) => plan.id)
  const { data: items, error: itemError } =
    planIds.length > 0
      ? await db
          .from('event_grazing_items')
          .select('*')
          .eq('tenant_id', user.tenantId!)
          .in('plan_id', planIds)
      : { data: [], error: null }
  if (itemError) throw new Error(`Failed to load grazing items: ${itemError.message}`)

  const itemRows = (items ?? []) as any[]
  const eventById = new Map<string, any>(eventRows.map((event) => [event.id, event]))
  const planById = new Map<string, any>(planRows.map((plan) => [plan.id, plan]))

  const purchasing = new Map<
    string,
    {
      category: string
      name: string
      quantity: number
      unit: string
      events: Set<string>
      estimatedCostCents: number
    }
  >()

  for (const row of itemRows) {
    const item = toItem(row)
    const plan = planById.get(item.planId)
    const eventId = plan?.event_id
    const key = `${item.category}|${item.name}|${item.unit}`
    const existing = purchasing.get(key) ?? {
      category: item.category,
      name: item.name,
      quantity: 0,
      unit: item.unit,
      events: new Set<string>(),
      estimatedCostCents: 0,
    }
    existing.quantity += item.quantity
    existing.estimatedCostCents += item.estimatedCostCents
    if (eventId) existing.events.add(eventId)
    purchasing.set(key, existing)
  }

  const prepByDate = new Map<string, number>()
  for (const plan of planRows) {
    const event = eventById.get(plan.event_id)
    if (!event?.event_date) continue
    prepByDate.set(event.event_date, (prepByDate.get(event.event_date) ?? 0) + 1)
  }

  return {
    dateRange: { from, to },
    events: planRows.map((plan) => {
      const event = eventById.get(plan.event_id)
      const pricing = parseJson(plan.pricing_snapshot, {})
      return {
        id: plan.event_id,
        occasion: event?.occasion ?? 'Grazing event',
        eventDate: event?.event_date ?? '',
        guestCount: Math.round(asNumber(event?.guest_count)),
        planStatus: plan.status as GrazingPlanStatus,
        estimatedCostCents: Math.round(asNumber((pricing as any).estimatedTotalCostCents)),
      }
    }),
    sharedPurchasing: Array.from(purchasing.values())
      .filter((item) => item.events.size > 0)
      .map((item) => ({
        category: item.category,
        name: item.name,
        quantity: Math.round(item.quantity * 100) / 100,
        unit: item.unit,
        eventCount: item.events.size,
        estimatedCostCents: item.estimatedCostCents,
      })),
    prepPressure: Array.from(prepByDate.entries()).map(([date, eventCount]) => ({
      date,
      eventCount,
      warnings:
        eventCount > 1 ? [`${eventCount} grazing events share prep or setup pressure.`] : [],
    })),
    lockedOrApprovedPlans: planRows
      .filter((plan) => ['locked', 'client_approved'].includes(plan.status))
      .map((plan) => ({
        eventId: plan.event_id,
        status: plan.status,
        eventDate: eventById.get(plan.event_id)?.event_date ?? '',
      })),
  }
}

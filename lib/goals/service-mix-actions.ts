'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import type {
  ServiceType,
  CreateServiceTypeInput,
  ServiceSlotClientMatch,
  RevenuePathData,
} from './types'
import { computeEffectivePrice, computeAutoSuggestMix } from './service-mix-utils'
import { getActiveGoals } from './actions'
import { isRevenueGoal } from './engine'

// ── Validation ────────────────────────────────────────────────────────────────

const ServiceTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(100, 'Name too long'),
  description: z.string().max(500).nullable().optional(),
  pricingModel: z.enum(['flat_rate', 'per_person', 'hybrid']),
  basePriceCents: z.number().int().min(0),
  perPersonCents: z.number().int().min(0),
  typicalGuestCount: z.number().int().min(1),
  minGuests: z.number().int().min(1).nullable().optional(),
  maxGuests: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

// ── Row mapper ────────────────────────────────────────────────────────────────

function mapServiceTypeRow(row: Record<string, unknown>): ServiceType {
  const model = row.pricing_model as ServiceType['pricingModel']
  const base = (row.base_price_cents as number) ?? 0
  const perPerson = (row.per_person_cents as number) ?? 0
  const guestCount = (row.typical_guest_count as number) ?? 2

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    pricingModel: model,
    basePriceCents: base,
    perPersonCents: perPerson,
    typicalGuestCount: guestCount,
    minGuests: (row.min_guests as number | null) ?? null,
    maxGuests: (row.max_guests as number | null) ?? null,
    isActive: row.is_active as boolean,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    effectivePriceCents: computeEffectivePrice(model, base, perPerson, guestCount),
  }
}

// ── CRUD: Service Types ───────────────────────────────────────────────────────

export async function getServiceTypes(): Promise<ServiceType[]> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  const { data, error } = await supabase
    .from('chef_service_types')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load service types: ${error.message}`)
  return ((data ?? []) as Record<string, unknown>[]).map(mapServiceTypeRow)
}

export async function createServiceType(input: CreateServiceTypeInput): Promise<{ id: string }> {
  const user = await requireChef()
  const parsed = ServiceTypeSchema.parse(input)
  const supabase = createServerClient() as any

  const { data, error } = await supabase
    .from('chef_service_types')
    .insert({
      tenant_id: user.tenantId,
      name: parsed.name,
      description: parsed.description ?? null,
      pricing_model: parsed.pricingModel,
      base_price_cents: parsed.basePriceCents,
      per_person_cents: parsed.perPersonCents,
      typical_guest_count: parsed.typicalGuestCount,
      min_guests: parsed.minGuests ?? null,
      max_guests: parsed.maxGuests ?? null,
      is_active: parsed.isActive,
      sort_order: parsed.sortOrder,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create service type: ${error.message}`)
  revalidatePath('/goals/revenue-path')
  return { id: data.id as string }
}

export async function updateServiceType(
  id: string,
  input: Partial<CreateServiceTypeInput>
): Promise<void> {
  const user = await requireChef()
  const parsed = ServiceTypeSchema.partial().parse(input)
  const supabase = createServerClient() as any

  const updates: Record<string, unknown> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.pricingModel !== undefined) updates.pricing_model = parsed.pricingModel
  if (parsed.basePriceCents !== undefined) updates.base_price_cents = parsed.basePriceCents
  if (parsed.perPersonCents !== undefined) updates.per_person_cents = parsed.perPersonCents
  if (parsed.typicalGuestCount !== undefined) updates.typical_guest_count = parsed.typicalGuestCount
  if (parsed.minGuests !== undefined) updates.min_guests = parsed.minGuests
  if (parsed.maxGuests !== undefined) updates.max_guests = parsed.maxGuests
  if (parsed.isActive !== undefined) updates.is_active = parsed.isActive
  if (parsed.sortOrder !== undefined) updates.sort_order = parsed.sortOrder

  const { error } = await supabase
    .from('chef_service_types')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to update service type: ${error.message}`)
  revalidatePath('/goals/revenue-path')
}

export async function deleteServiceType(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  const { error } = await supabase
    .from('chef_service_types')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to delete service type: ${error.message}`)
  revalidatePath('/goals/revenue-path')
}

export async function reorderServiceTypes(orderedIds: string[]): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  // Update each row's sort_order sequentially
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from('chef_service_types')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('tenant_id', user.tenantId)
  }

  revalidatePath('/goals/revenue-path')
}

// ── Revenue path data ─────────────────────────────────────────────────────────

export async function getRevenuePath(goalId: string): Promise<RevenuePathData> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  // Fetch the goal (verify it belongs to this tenant)
  const { data: goalRow, error: goalError } = await supabase
    .from('chef_goals')
    .select('*')
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (goalError || !goalRow) throw new Error('Goal not found')

  const goal = {
    id: goalRow.id as string,
    tenantId: goalRow.tenant_id as string,
    goalType: goalRow.goal_type as string,
    label: goalRow.label as string,
    status: goalRow.status as string,
    targetValue: goalRow.target_value as number,
    periodStart: goalRow.period_start as string,
    periodEnd: goalRow.period_end as string,
    nudgeEnabled: goalRow.nudge_enabled as boolean,
    nudgeLevel: goalRow.nudge_level as string,
    notes: goalRow.notes as string | null,
    createdAt: goalRow.created_at as string,
    updatedAt: goalRow.updated_at as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  // Fetch service types
  const serviceTypes = await getServiceTypes()

  // Sum already-booked revenue for this goal's period
  // Counts events in confirmed/active states — not draft or cancelled
  const { data: eventRows } = await supabase
    .from('events')
    .select('quoted_price_cents')
    .eq('tenant_id', user.tenantId)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])
    .gte('event_date', goal.periodStart)
    .lte('event_date', goal.periodEnd)

  const alreadyBookedCents = ((eventRows ?? []) as { quoted_price_cents: number }[]).reduce(
    (sum, row) => sum + (row.quoted_price_cents ?? 0),
    0
  )
  const alreadyBookedCount = (eventRows ?? []).length
  const gapCents = Math.max(0, goal.targetValue - alreadyBookedCents)
  const targetMonth = goal.periodStart.slice(0, 7) // 'YYYY-MM'

  return {
    goal,
    serviceTypes,
    alreadyBookedCents,
    alreadyBookedCount,
    gapCents,
    targetMonth,
  }
}

// ── Client matching for a service type ───────────────────────────────────────
// Uses heuristic scoring only — no LLM, no parseWithOllama.
// Client data stays server-side and is not sent externally.

export async function getClientMatchesForServiceType(
  serviceTypeId: string,
  limit = 3
): Promise<ServiceSlotClientMatch[]> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  // Verify service type belongs to tenant and get its effective price
  const { data: stRow, error: stError } = await supabase
    .from('chef_service_types')
    .select('*')
    .eq('id', serviceTypeId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (stError || !stRow) return []

  const serviceType = mapServiceTypeRow(stRow as Record<string, unknown>)

  // Fetch financial summary for all clients (not filtered by dormancy)
  const { data: summaryRows } = await supabase
    .from('client_financial_summary')
    .select('client_id, lifetime_value_cents, average_spend_per_event, days_since_last_event')
    .eq('tenant_id', user.tenantId)
    .not('client_id', 'is', null)
    .order('lifetime_value_cents', { ascending: false })
    .limit(50)

  type SummaryRow = {
    client_id: string
    lifetime_value_cents: number | null
    average_spend_per_event: number | null
    days_since_last_event: number | null
  }
  const rows = (summaryRows ?? []) as SummaryRow[]
  if (rows.length === 0) return []

  const clientIds = rows.map((r) => r.client_id)

  // Fetch client names + last event date
  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId)
    .in('id', clientIds)

  type ClientRow = { id: string; full_name: string }
  const clientMap = new Map<string, ClientRow>(
    ((clientRows ?? []) as ClientRow[]).map((c) => [c.id, c])
  )

  // Compute LTV median for tier scoring
  const ltvValues = rows
    .map((r) => r.lifetime_value_cents ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  const median = ltvValues.length > 0 ? ltvValues[Math.floor(ltvValues.length / 2)] : 0

  // Score and rank each client for this service type
  const scored = rows
    .map((row) => {
      const client = clientMap.get(row.client_id)
      if (!client) return null

      const avgSpend = row.average_spend_per_event ?? 0
      const ltv = row.lifetime_value_cents ?? 0
      const days = row.days_since_last_event ?? 999

      // Recency bonus (0–30)
      let score = 0
      if (days <= 30) score += 30
      else if (days <= 60) score += 25
      else if (days <= 90) score += 20
      else if (days <= 180) score += 12
      else if (days <= 365) score += 5

      // Spend proximity bonus: within 50% of the service effective price
      const effectivePrice = serviceType.effectivePriceCents
      if (effectivePrice > 0 && avgSpend > 0) {
        const ratio = avgSpend / effectivePrice
        if (ratio >= 0.5 && ratio <= 1.5) score += 10
      }

      // LTV tier bonus
      if (median > 0) {
        if (ltv >= median * 2) score += 10
        else if (ltv >= median) score += 5
      }

      // Build match reason
      let matchReason: string
      const dollarAvg =
        avgSpend > 0 ? `avg $${Math.round(avgSpend / 100).toLocaleString('en-US')}` : null
      const effectivePrice2 = serviceType.effectivePriceCents
      const avgSpend2 = avgSpend
      const withinRange =
        effectivePrice2 > 0 &&
        avgSpend2 > 0 &&
        avgSpend2 / effectivePrice2 >= 0.5 &&
        avgSpend2 / effectivePrice2 <= 1.5
      if (withinRange && dollarAvg) {
        matchReason = `${dollarAvg} — fits this service`
      } else if (days <= 180 && dollarAvg) {
        matchReason = `Active client — ${dollarAvg}`
      } else {
        matchReason = dollarAvg ? `Past client — ${dollarAvg}` : 'Past client'
      }

      return {
        clientId: row.client_id,
        clientName: client.full_name,
        healthScore: score,
        lastEventDate: null,
        avgSpendCents: avgSpend,
        lifetimeValueCents: ltv,
        matchReason,
      } as ServiceSlotClientMatch
    })
    .filter(Boolean) as ServiceSlotClientMatch[]

  return scored.sort((a, b) => b.healthScore - a.healthScore).slice(0, limit)
}

// ── Auto-suggest ──────────────────────────────────────────────────────────────
// Pure greedy algorithm, no AI, no client data. Returns suggested quantities per service type.

export async function autoSuggestMix(
  goalId: string
): Promise<Array<{ serviceTypeId: string; quantity: number }>> {
  const pathData = await getRevenuePath(goalId)
  const { gapCents, serviceTypes } = pathData

  const suggestMap = computeAutoSuggestMix(serviceTypes, gapCents)
  return Object.entries(suggestMap).map(([serviceTypeId, quantity]) => ({
    serviceTypeId,
    quantity,
  }))
}

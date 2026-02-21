'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type DepreciationScheduleRow = {
  id: string
  equipmentItemId: string
  equipmentName: string
  taxYear: number
  depreciationMethod: 'section_179' | 'straight_line'
  depreciableBasisCents: number
  annualDepreciationCents: number
  cumulativeDepreciationCents: number
  claimed: boolean
  claimedAt: string | null
  notes: string | null
}

export type DepreciationYearSummary = {
  items: DepreciationScheduleRow[]
  totalSection179Cents: number
  totalStraightLineCents: number
  totalDepreciationCents: number
}

export type EquipmentWithDepreciation = {
  id: string
  name: string
  category: string
  purchasePriceCents: number | null
  purchaseDate: string | null
  depreciationMethod: 'section_179' | 'straight_line' | null
  usefulLifeYears: number | null
  salvageValueCents: number
  taxYearPlacedInService: number | null
  currentYearSchedule: DepreciationScheduleRow | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const SetMethodSchema = z.object({
  equipmentItemId: z.string().uuid(),
  depreciationMethod: z.enum(['section_179', 'straight_line']),
  usefulLifeYears: z.number().int().min(1).nullable().optional(),
  salvageValueCents: z.number().int().min(0).default(0),
  taxYearPlacedInService: z.number().int().min(2010).max(2035),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function setDepreciationMethod(input: z.infer<typeof SetMethodSchema>): Promise<void> {
  const user = await requireChef()
  const parsed = SetMethodSchema.parse(input)
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('equipment_items')
    .update({
      depreciation_method: parsed.depreciationMethod,
      useful_life_years: parsed.usefulLifeYears ?? null,
      salvage_value_cents: parsed.salvageValueCents,
      tax_year_placed_in_service: parsed.taxYearPlacedInService,
    })
    .eq('id', parsed.equipmentItemId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to set depreciation method: ${error.message}`)

  // Auto-generate the schedule after setting method
  await generateDepreciationSchedule(parsed.equipmentItemId)
  revalidatePath('/finance/tax/depreciation')
  revalidatePath('/operations/equipment')
}

export async function generateDepreciationSchedule(
  equipmentItemId: string
): Promise<DepreciationScheduleRow[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the equipment item
  const { data: item, error: itemError } = await (supabase as any)
    .from('equipment_items')
    .select(
      'id, name, purchase_price_cents, depreciation_method, useful_life_years, salvage_value_cents, tax_year_placed_in_service'
    )
    .eq('id', equipmentItemId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (itemError || !item) throw new Error('Equipment item not found')
  if (!item.depreciation_method) throw new Error('Depreciation method not set')
  if (!item.purchase_price_cents) throw new Error('Purchase price required for depreciation')

  const purchasePriceCents: number = item.purchase_price_cents
  const salvageValueCents: number = item.salvage_value_cents ?? 0
  const depreciableBasis: number = Math.max(0, purchasePriceCents - salvageValueCents)
  const yearPlaced: number = item.tax_year_placed_in_service ?? new Date().getFullYear()

  const scheduleRows: {
    equipment_item_id: string
    chef_id: string
    tax_year: number
    depreciation_method: string
    depreciable_basis_cents: number
    annual_depreciation_cents: number
    cumulative_depreciation_cents: number
  }[] = []

  if (item.depreciation_method === 'section_179') {
    // Full deduction in year placed in service
    scheduleRows.push({
      equipment_item_id: equipmentItemId,
      chef_id: user.tenantId!,
      tax_year: yearPlaced,
      depreciation_method: 'section_179',
      depreciable_basis_cents: depreciableBasis,
      annual_depreciation_cents: depreciableBasis,
      cumulative_depreciation_cents: depreciableBasis,
    })
  } else if (item.depreciation_method === 'straight_line') {
    const usefulLife: number = item.useful_life_years ?? 5
    const annualAmount = Math.floor(depreciableBasis / usefulLife)
    let cumulative = 0

    for (let i = 0; i < usefulLife; i++) {
      // Last year gets any remainder due to floor rounding
      const isLastYear = i === usefulLife - 1
      const yearAmount = isLastYear ? depreciableBasis - cumulative : annualAmount
      cumulative += yearAmount

      scheduleRows.push({
        equipment_item_id: equipmentItemId,
        chef_id: user.tenantId!,
        tax_year: yearPlaced + i,
        depreciation_method: 'straight_line',
        depreciable_basis_cents: depreciableBasis,
        annual_depreciation_cents: yearAmount,
        cumulative_depreciation_cents: cumulative,
      })
    }
  }

  // Delete existing schedule rows for this item, then re-insert
  await (supabase as any)
    .from('equipment_depreciation_schedules')
    .delete()
    .eq('equipment_item_id', equipmentItemId)
    .eq('chef_id', user.tenantId!)

  if (scheduleRows.length > 0) {
    const { error: insertError } = await (supabase as any)
      .from('equipment_depreciation_schedules')
      .insert(scheduleRows)

    if (insertError) throw new Error(`Failed to generate schedule: ${insertError.message}`)
  }

  return getScheduleForItem(equipmentItemId)
}

async function getScheduleForItem(equipmentItemId: string): Promise<DepreciationScheduleRow[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('equipment_depreciation_schedules')
    .select('*, equipment_items(name)')
    .eq('equipment_item_id', equipmentItemId)
    .eq('chef_id', user.tenantId!)
    .order('tax_year', { ascending: true })

  if (error) throw new Error(`Failed to fetch schedule: ${error.message}`)

  return (data || []).map((r: any) => ({
    id: r.id,
    equipmentItemId: r.equipment_item_id,
    equipmentName: r.equipment_items?.name || '',
    taxYear: r.tax_year,
    depreciationMethod: r.depreciation_method,
    depreciableBasisCents: r.depreciable_basis_cents,
    annualDepreciationCents: r.annual_depreciation_cents,
    cumulativeDepreciationCents: r.cumulative_depreciation_cents,
    claimed: r.claimed,
    claimedAt: r.claimed_at,
    notes: r.notes,
  }))
}

export async function getDepreciationForYear(taxYear: number): Promise<DepreciationYearSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('equipment_depreciation_schedules')
    .select('*, equipment_items(name)')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)
    .order('annual_depreciation_cents', { ascending: false })

  if (error) throw new Error(`Failed to fetch depreciation: ${error.message}`)

  const items: DepreciationScheduleRow[] = (data || []).map((r: any) => ({
    id: r.id,
    equipmentItemId: r.equipment_item_id,
    equipmentName: r.equipment_items?.name || '',
    taxYear: r.tax_year,
    depreciationMethod: r.depreciation_method,
    depreciableBasisCents: r.depreciable_basis_cents,
    annualDepreciationCents: r.annual_depreciation_cents,
    cumulativeDepreciationCents: r.cumulative_depreciation_cents,
    claimed: r.claimed,
    claimedAt: r.claimed_at,
    notes: r.notes,
  }))

  const totalSection179Cents = items
    .filter((i) => i.depreciationMethod === 'section_179')
    .reduce((s, i) => s + i.annualDepreciationCents, 0)

  const totalStraightLineCents = items
    .filter((i) => i.depreciationMethod === 'straight_line')
    .reduce((s, i) => s + i.annualDepreciationCents, 0)

  return {
    items,
    totalSection179Cents,
    totalStraightLineCents,
    totalDepreciationCents: totalSection179Cents + totalStraightLineCents,
  }
}

export async function markDepreciationClaimed(scheduleId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('equipment_depreciation_schedules')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark claimed: ${error.message}`)
  revalidatePath('/finance/tax/depreciation')
}

export async function getEquipmentWithDepreciation(
  taxYear: number
): Promise<EquipmentWithDepreciation[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: items, error } = await (supabase as any)
    .from('equipment_items')
    .select(
      'id, name, category, purchase_price_cents, purchase_date, depreciation_method, useful_life_years, salvage_value_cents, tax_year_placed_in_service'
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch equipment: ${error.message}`)

  // Fetch current-year schedules
  const { data: schedules } = await (supabase as any)
    .from('equipment_depreciation_schedules')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('tax_year', taxYear)

  const scheduleByItem: Record<string, any> = {}
  for (const s of schedules || []) {
    scheduleByItem[s.equipment_item_id] = s
  }

  return (items || []).map((item: any) => {
    const s = scheduleByItem[item.id]
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      purchasePriceCents: item.purchase_price_cents,
      purchaseDate: item.purchase_date,
      depreciationMethod: item.depreciation_method,
      usefulLifeYears: item.useful_life_years,
      salvageValueCents: item.salvage_value_cents ?? 0,
      taxYearPlacedInService: item.tax_year_placed_in_service,
      currentYearSchedule: s
        ? {
            id: s.id,
            equipmentItemId: s.equipment_item_id,
            equipmentName: item.name,
            taxYear: s.tax_year,
            depreciationMethod: s.depreciation_method,
            depreciableBasisCents: s.depreciable_basis_cents,
            annualDepreciationCents: s.annual_depreciation_cents,
            cumulativeDepreciationCents: s.cumulative_depreciation_cents,
            claimed: s.claimed,
            claimedAt: s.claimed_at,
            notes: s.notes,
          }
        : null,
    }
  })
}

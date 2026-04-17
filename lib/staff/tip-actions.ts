// Tip Management - Server Actions
// CRUD for tip entries, pool configs, and distribution computation.
// Tables: tip_entries, tip_pool_configs, tip_distributions

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type TipPoolMethod = 'equal' | 'hours_based' | 'points_based'

export type TipEntry = {
  id: string
  staffMemberId: string
  staffName: string
  staffRole: string
  shiftDate: string
  cashTipsCents: number
  cardTipsCents: number
  totalTipsCents: number
  hoursWorked: number | null
  poolEligible: boolean
  notes: string | null
}

export type TipPoolConfig = {
  id: string
  name: string
  poolMethod: TipPoolMethod
  includedRoles: string[]
  isActive: boolean
}

export type TipDistributionEntry = {
  staffMemberId: string
  staffName: string
  staffRole: string
  hoursWorked: number
  shareCents: number
  sharePercent: number
}

export type TipDistributionPreview = {
  date: string
  poolConfigId: string
  poolConfigName: string
  method: TipPoolMethod
  totalPoolCents: number
  entries: TipDistributionEntry[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const TipEntrySchema = z.object({
  staffMemberId: z.string().uuid(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cashTipsCents: z.number().int().min(0),
  cardTipsCents: z.number().int().min(0),
  hoursWorked: z.number().min(0).nullable().optional(),
  poolEligible: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

const PoolConfigSchema = z.object({
  name: z.string().min(1).max(100),
  poolMethod: z.enum(['equal', 'hours_based', 'points_based']),
  includedRoles: z.array(z.string()).min(1),
})

// ─── Tip Entry CRUD ──────────────────────────────────────────────

export async function createTipEntry(input: z.infer<typeof TipEntrySchema>) {
  const user = await requireChef()
  const parsed = TipEntrySchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_entries')
    .insert({
      tenant_id: user.tenantId!,
      staff_member_id: parsed.staffMemberId,
      shift_date: parsed.shiftDate,
      cash_tips_cents: parsed.cashTipsCents,
      card_tips_cents: parsed.cardTipsCents,
      hours_worked: parsed.hoursWorked ?? null,
      pool_eligible: parsed.poolEligible ?? true,
      notes: parsed.notes ?? null,
    } as any)
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to create tip entry: ${error.message}`)

  revalidatePath('/staff/tips')
  return { id: data.id }
}

export async function updateTipEntry(
  entryId: string,
  input: Partial<z.infer<typeof TipEntrySchema>>
) {
  const user = await requireChef()
  z.string().uuid().parse(entryId)
  const db: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.cashTipsCents !== undefined) updates.cash_tips_cents = input.cashTipsCents
  if (input.cardTipsCents !== undefined) updates.card_tips_cents = input.cardTipsCents
  if (input.hoursWorked !== undefined) updates.hours_worked = input.hoursWorked
  if (input.poolEligible !== undefined) updates.pool_eligible = input.poolEligible
  if (input.notes !== undefined) updates.notes = input.notes

  if (Object.keys(updates).length === 0) return

  const { error } = await (db
    .from('tip_entries')
    .update(updates as any)
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update tip entry: ${error.message}`)

  revalidatePath('/staff/tips')
}

export async function deleteTipEntry(entryId: string) {
  const user = await requireChef()
  z.string().uuid().parse(entryId)
  const db: any = createServerClient()

  const { error } = await (db
    .from('tip_entries')
    .delete()
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to delete tip entry: ${error.message}`)

  revalidatePath('/staff/tips')
}

export async function getTipEntriesForDate(shiftDate: string): Promise<TipEntry[]> {
  const user = await requireChef()
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(shiftDate)
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_entries')
    .select(
      'id, staff_member_id, shift_date, cash_tips_cents, card_tips_cents, total_tips_cents, hours_worked, pool_eligible, notes, staff_members (name, role)'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('shift_date', shiftDate)
    .order('created_at') as any)

  if (error) throw new Error(`Failed to load tip entries: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_members?.name ?? 'Unknown',
    staffRole: row.staff_members?.role ?? 'other',
    shiftDate: row.shift_date,
    cashTipsCents: row.cash_tips_cents,
    cardTipsCents: row.card_tips_cents,
    totalTipsCents: row.total_tips_cents,
    hoursWorked: row.hours_worked ? Number(row.hours_worked) : null,
    poolEligible: row.pool_eligible,
    notes: row.notes,
  }))
}

// ─── Pool Config CRUD ────────────────────────────────────────────

export async function createTipPoolConfig(input: z.infer<typeof PoolConfigSchema>) {
  const user = await requireChef()
  const parsed = PoolConfigSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_pool_configs')
    .insert({
      tenant_id: user.tenantId!,
      name: parsed.name,
      pool_method: parsed.poolMethod,
      included_roles: parsed.includedRoles,
      is_active: true,
    } as any)
    .select('id')
    .single() as any)

  if (error) throw new Error(`Failed to create tip pool config: ${error.message}`)

  revalidatePath('/staff/tips')
  return { id: data.id }
}

export async function updateTipPoolConfig(
  configId: string,
  input: Partial<z.infer<typeof PoolConfigSchema>> & { isActive?: boolean }
) {
  const user = await requireChef()
  z.string().uuid().parse(configId)
  const db: any = createServerClient()

  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.poolMethod !== undefined) updates.pool_method = input.poolMethod
  if (input.includedRoles !== undefined) updates.included_roles = input.includedRoles
  if (input.isActive !== undefined) updates.is_active = input.isActive
  updates.updated_at = new Date().toISOString()

  const { error } = await (db
    .from('tip_pool_configs')
    .update(updates as any)
    .eq('id', configId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update tip pool config: ${error.message}`)

  revalidatePath('/staff/tips')
}

export async function listTipPoolConfigs(): Promise<TipPoolConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_pool_configs')
    .select('id, name, pool_method, included_roles, is_active')
    .eq('tenant_id', user.tenantId!)
    .order('created_at') as any)

  if (error) throw new Error(`Failed to load tip pool configs: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    poolMethod: row.pool_method,
    includedRoles: row.included_roles ?? [],
    isActive: row.is_active,
  }))
}

// ─── Tip Distribution Computation ────────────────────────────────

/**
 * Preview tip distribution for a given date and pool config.
 * Does NOT persist - call finalizeTipDistribution to save.
 *
 * Three methods:
 * - equal: split total pool evenly among eligible staff
 * - hours_based: split proportional to hours worked
 * - points_based: split proportional to hours * role multiplier
 */
export async function previewTipDistribution(
  shiftDate: string,
  poolConfigId: string
): Promise<TipDistributionPreview> {
  const user = await requireChef()
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(shiftDate)
  z.string().uuid().parse(poolConfigId)
  const db: any = createServerClient()

  // Fetch pool config
  const { data: config, error: configErr } = await (db
    .from('tip_pool_configs')
    .select('id, name, pool_method, included_roles')
    .eq('id', poolConfigId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (configErr || !config) throw new Error('Tip pool config not found')

  // Fetch all eligible tip entries for this date
  const entries = await getTipEntriesForDate(shiftDate)
  const eligible = entries.filter(
    (e) => e.poolEligible && config.included_roles.includes(e.staffRole)
  )

  const totalPoolCents = eligible.reduce((sum, e) => sum + e.totalTipsCents, 0)

  if (eligible.length === 0 || totalPoolCents === 0) {
    return {
      date: shiftDate,
      poolConfigId: config.id,
      poolConfigName: config.name,
      method: config.pool_method,
      totalPoolCents: 0,
      entries: [],
    }
  }

  // Compute hours for each eligible staff (from clock entries if tip entry hours is null)
  const staffHours = new Map<string, number>()
  for (const e of eligible) {
    if (e.hoursWorked != null) {
      staffHours.set(e.staffMemberId, (staffHours.get(e.staffMemberId) ?? 0) + e.hoursWorked)
    }
  }

  // For staff missing hours on tip entries, fall back to clock entries
  const missingHoursStaffIds = eligible
    .filter((e) => e.hoursWorked == null && !staffHours.has(e.staffMemberId))
    .map((e) => e.staffMemberId)

  if (missingHoursStaffIds.length > 0) {
    const uniqueIds = [...new Set(missingHoursStaffIds)]
    const { data: clockData } = await (db
      .from('staff_clock_entries')
      .select('staff_member_id, total_minutes')
      .eq('chef_id', user.tenantId!)
      .in('staff_member_id', uniqueIds)
      .gte('clock_in_at', `${shiftDate}T00:00:00Z`)
      .lt('clock_in_at', `${shiftDate}T23:59:59Z`) as any)

    for (const row of clockData ?? []) {
      const mins = (row as any).total_minutes ?? 0
      const id = (row as any).staff_member_id
      staffHours.set(id, (staffHours.get(id) ?? 0) + mins / 60)
    }
  }

  // Distribute based on method
  const distribution: TipDistributionEntry[] = computeDistribution(
    config.pool_method as TipPoolMethod,
    eligible,
    totalPoolCents,
    staffHours
  )

  return {
    date: shiftDate,
    poolConfigId: config.id,
    poolConfigName: config.name,
    method: config.pool_method,
    totalPoolCents,
    entries: distribution,
  }
}

// Role point multipliers for points_based distribution
const ROLE_POINTS: Record<string, number> = {
  server: 1.0,
  bartender: 1.0,
  busser: 0.5,
  host: 0.5,
  food_runner: 0.65,
  barback: 0.5,
  manager: 0.0, // managers typically excluded or get fixed cut
  chef: 0.0,
  cook: 0.0,
  dishwasher: 0.3,
  other: 0.5,
}

function computeDistribution(
  method: TipPoolMethod,
  eligible: TipEntry[],
  totalPoolCents: number,
  staffHours: Map<string, number>
): TipDistributionEntry[] {
  // Deduplicate by staffMemberId (a staff member may have multiple tip entries)
  const staffMap = new Map<string, { staffName: string; staffRole: string; totalHours: number }>()
  for (const e of eligible) {
    const existing = staffMap.get(e.staffMemberId)
    if (existing) {
      existing.totalHours = staffHours.get(e.staffMemberId) ?? existing.totalHours
    } else {
      staffMap.set(e.staffMemberId, {
        staffName: e.staffName,
        staffRole: e.staffRole,
        totalHours: staffHours.get(e.staffMemberId) ?? 0,
      })
    }
  }

  const staffList = [...staffMap.entries()]

  switch (method) {
    case 'equal': {
      const share = Math.floor(totalPoolCents / staffList.length)
      const remainder = totalPoolCents - share * staffList.length
      return staffList.map(([id, s], i) => ({
        staffMemberId: id,
        staffName: s.staffName,
        staffRole: s.staffRole,
        hoursWorked: s.totalHours,
        shareCents: share + (i < remainder ? 1 : 0), // distribute remainder pennies
        sharePercent: staffList.length > 0 ? Math.round(10000 / staffList.length) / 100 : 0,
      }))
    }

    case 'hours_based': {
      const totalHours = staffList.reduce((sum, [, s]) => sum + s.totalHours, 0)
      if (totalHours === 0) {
        // Fall back to equal if no hours data
        return computeDistribution('equal', eligible, totalPoolCents, staffHours)
      }
      let allocated = 0
      const result = staffList.map(([id, s], i) => {
        const ratio = s.totalHours / totalHours
        const isLast = i === staffList.length - 1
        const share = isLast ? totalPoolCents - allocated : Math.round(totalPoolCents * ratio)
        allocated += share
        return {
          staffMemberId: id,
          staffName: s.staffName,
          staffRole: s.staffRole,
          hoursWorked: s.totalHours,
          shareCents: share,
          sharePercent: Math.round(ratio * 10000) / 100,
        }
      })
      return result
    }

    case 'points_based': {
      const totalPoints = staffList.reduce((sum, [, s]) => {
        const multiplier = ROLE_POINTS[s.staffRole] ?? 0.5
        return sum + s.totalHours * multiplier
      }, 0)
      if (totalPoints === 0) {
        return computeDistribution('equal', eligible, totalPoolCents, staffHours)
      }
      let allocated = 0
      const result = staffList.map(([id, s], i) => {
        const multiplier = ROLE_POINTS[s.staffRole] ?? 0.5
        const points = s.totalHours * multiplier
        const ratio = points / totalPoints
        const isLast = i === staffList.length - 1
        const share = isLast ? totalPoolCents - allocated : Math.round(totalPoolCents * ratio)
        allocated += share
        return {
          staffMemberId: id,
          staffName: s.staffName,
          staffRole: s.staffRole,
          hoursWorked: s.totalHours,
          shareCents: share,
          sharePercent: Math.round(ratio * 10000) / 100,
        }
      })
      return result
    }
  }
}

// ─── Finalize Distribution ───────────────────────────────────────

/**
 * Persist a tip distribution. Idempotent per date+config (deletes existing first).
 */
export async function finalizeTipDistribution(
  shiftDate: string,
  poolConfigId: string
): Promise<{ distributionCount: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const preview = await previewTipDistribution(shiftDate, poolConfigId)

  if (preview.entries.length === 0) {
    return { distributionCount: 0 }
  }

  // Delete existing distributions for this date+config (idempotent re-run)
  await (db
    .from('tip_distributions')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('distribution_date', shiftDate)
    .eq('pool_config_id', poolConfigId) as any)

  // Insert new distributions
  const rows = preview.entries.map((entry) => ({
    tenant_id: user.tenantId!,
    distribution_date: shiftDate,
    pool_config_id: poolConfigId,
    total_pool_cents: preview.totalPoolCents,
    staff_member_id: entry.staffMemberId,
    share_cents: entry.shareCents,
    method_used: preview.method,
  }))

  const { error } = await (db.from('tip_distributions').insert(rows as any) as any)

  if (error) throw new Error(`Failed to finalize tip distribution: ${error.message}`)

  revalidatePath('/staff/tips')
  return { distributionCount: preview.entries.length }
}

// ─── Get Finalized Distributions ─────────────────────────────────

export async function getDistributionsForDate(shiftDate: string) {
  const user = await requireChef()
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(shiftDate)
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_distributions')
    .select(
      'id, distribution_date, pool_config_id, total_pool_cents, staff_member_id, share_cents, method_used, staff_members (name, role), tip_pool_configs (name)'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('distribution_date', shiftDate)
    .order('share_cents', { ascending: false }) as any)

  if (error) throw new Error(`Failed to load distributions: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    distributionDate: row.distribution_date,
    poolConfigName: row.tip_pool_configs?.name ?? 'Unknown',
    totalPoolCents: row.total_pool_cents,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_members?.name ?? 'Unknown',
    staffRole: row.staff_members?.role ?? 'other',
    shareCents: row.share_cents,
    methodUsed: row.method_used,
  }))
}

// ─── Tip Summary for Period ──────────────────────────────────────

export async function getTipSummaryForPeriod(startDate: string, endDate: string) {
  const user = await requireChef()
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(startDate)
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(endDate)
  const db: any = createServerClient()

  const { data, error } = await (db
    .from('tip_entries')
    .select(
      'staff_member_id, cash_tips_cents, card_tips_cents, total_tips_cents, shift_date, staff_members (name, role)'
    )
    .eq('tenant_id', user.tenantId!)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate) as any)

  if (error) throw new Error(`Failed to load tip summary: ${error.message}`)

  // Aggregate by staff
  const byStaff = new Map<
    string,
    {
      staffName: string
      staffRole: string
      totalCashCents: number
      totalCardCents: number
      totalTipsCents: number
      shiftCount: number
    }
  >()

  for (const row of data ?? []) {
    const id = (row as any).staff_member_id
    const existing = byStaff.get(id)
    if (existing) {
      existing.totalCashCents += (row as any).cash_tips_cents
      existing.totalCardCents += (row as any).card_tips_cents
      existing.totalTipsCents += (row as any).total_tips_cents
      existing.shiftCount += 1
    } else {
      byStaff.set(id, {
        staffName: (row as any).staff_members?.name ?? 'Unknown',
        staffRole: (row as any).staff_members?.role ?? 'other',
        totalCashCents: (row as any).cash_tips_cents,
        totalCardCents: (row as any).card_tips_cents,
        totalTipsCents: (row as any).total_tips_cents,
        shiftCount: 1,
      })
    }
  }

  const entries = [...byStaff.entries()].map(([id, s]) => ({
    staffMemberId: id,
    ...s,
    avgTipPerShiftCents: s.shiftCount > 0 ? Math.round(s.totalTipsCents / s.shiftCount) : 0,
  }))

  const grandTotalCents = entries.reduce((sum, e) => sum + e.totalTipsCents, 0)

  return {
    startDate,
    endDate,
    entries: entries.sort((a, b) => b.totalTipsCents - a.totalTipsCents),
    grandTotalCents,
    staffCount: entries.length,
  }
}

// ─── Auto-Import Tips from Register ──────────────────────────────

/**
 * Import tip data from commerce_payments for a given date.
 * Creates tip_entries from card tips recorded at checkout.
 * Requires a register session to identify the cashier/server.
 */
export async function importTipsFromRegister(shiftDate: string): Promise<{
  imported: number
  totalCents: number
}> {
  const user = await requireChef()
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(shiftDate)
  const db: any = createServerClient()

  // Get card tips from sales on this date
  const { data: sales } = await (db
    .from('sales')
    .select('id, tip_cents, created_by')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${shiftDate}T00:00:00Z`)
    .lt('created_at', `${shiftDate}T23:59:59Z`)
    .gt('tip_cents', 0)
    .in('status', ['captured', 'settled']) as any)

  if (!sales || sales.length === 0) return { imported: 0, totalCents: 0 }

  // Group tips by created_by (the cashier/server who rang it up)
  const tipsByStaff = new Map<string, number>()
  for (const sale of sales) {
    const staffId = (sale as any).created_by
    if (!staffId) continue
    tipsByStaff.set(staffId, (tipsByStaff.get(staffId) ?? 0) + (sale as any).tip_cents)
  }

  // Map auth user IDs to staff member IDs
  const authUserIds = [...tipsByStaff.keys()]
  const { data: staffMembers } = await (db
    .from('staff_members')
    .select('id, user_id')
    .eq('chef_id', user.tenantId!)
    .in('user_id', authUserIds) as any)

  const authToStaffId = new Map<string, string>()
  for (const sm of staffMembers ?? []) {
    if ((sm as any).user_id) {
      authToStaffId.set((sm as any).user_id, sm.id)
    }
  }

  let imported = 0
  let totalCents = 0

  for (const [authUserId, tipCents] of tipsByStaff) {
    const staffMemberId = authToStaffId.get(authUserId)
    if (!staffMemberId) continue

    // Check for existing entry to avoid duplicates
    const { data: existing } = await (db
      .from('tip_entries')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('staff_member_id', staffMemberId)
      .eq('shift_date', shiftDate)
      .limit(1) as any)

    if (existing && existing.length > 0) continue

    await (db.from('tip_entries').insert({
      tenant_id: user.tenantId!,
      staff_member_id: staffMemberId,
      shift_date: shiftDate,
      cash_tips_cents: 0,
      card_tips_cents: tipCents,
      pool_eligible: true,
      notes: 'Auto-imported from register',
    } as any) as any)

    imported++
    totalCents += tipCents
  }

  revalidatePath('/staff/tips')
  return { imported, totalCents }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────

export interface StaffTipEntry {
  id: string
  tenantId: string
  shiftDate: string
  staffMemberId: string
  staffName?: string
  staffRole?: string
  cashTipsCents: number
  cardTipsCents: number
  totalTipsCents: number
  hoursWorked: number | null
  poolEligible: boolean
  notes: string | null
  createdAt: string
}

export interface TipPoolConfig {
  id: string
  tenantId: string
  name: string
  poolMethod: 'equal' | 'hours_based' | 'points_based'
  includedRoles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TipDistribution {
  id: string
  tenantId: string
  distributionDate: string
  poolConfigId: string
  totalPoolCents: number
  staffMemberId: string
  staffName?: string
  shareCents: number
  methodUsed: string
  createdAt: string
}

export interface DistributionPreview {
  staffMemberId: string
  staffName: string
  shareCents: number
  hoursWorked: number | null
  tipContributionCents: number
}

export interface StaffTipSummary {
  staffMemberId: string
  staffName: string
  totalCashCents: number
  totalCardCents: number
  totalTipsCents: number
  totalDistributedCents: number
  shiftCount: number
}

// ── Tip Entry CRUD ────────────────────────────────────────────────

export async function recordStaffTips(
  staffMemberId: string,
  shiftDate: string,
  cashCents: number,
  cardCents: number,
  hoursWorked?: number | null,
  notes?: string | null
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase.from('tip_entries').insert({
    tenant_id: user.tenantId!,
    staff_member_id: staffMemberId,
    shift_date: shiftDate,
    cash_tips_cents: cashCents,
    card_tips_cents: cardCents,
    hours_worked: hoursWorked ?? null,
    pool_eligible: true,
    notes: notes ?? null,
  })
}

export async function updateStaffTipEntry(
  id: string,
  updates: {
    cashTipsCents?: number
    cardTipsCents?: number
    hoursWorked?: number | null
    poolEligible?: boolean
    notes?: string | null
  }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const patch: Record<string, unknown> = {}
  if (updates.cashTipsCents !== undefined) patch.cash_tips_cents = updates.cashTipsCents
  if (updates.cardTipsCents !== undefined) patch.card_tips_cents = updates.cardTipsCents
  if (updates.hoursWorked !== undefined) patch.hours_worked = updates.hoursWorked
  if (updates.poolEligible !== undefined) patch.pool_eligible = updates.poolEligible
  if (updates.notes !== undefined) patch.notes = updates.notes

  await supabase.from('tip_entries').update(patch).eq('id', id).eq('tenant_id', user.tenantId!)
}

export async function deleteStaffTipEntry(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase.from('tip_entries').delete().eq('id', id).eq('tenant_id', user.tenantId!)
}

export async function getStaffTipsForDate(date: string): Promise<StaffTipEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tip_entries')
    .select('*, staff_members(name, role)')
    .eq('tenant_id', user.tenantId!)
    .eq('shift_date', date)
    .order('created_at')

  return (data || []).map(mapTipEntry)
}

export async function getStaffTipsForPeriod(start: string, end: string): Promise<StaffTipEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tip_entries')
    .select('*, staff_members(name, role)')
    .eq('tenant_id', user.tenantId!)
    .gte('shift_date', start)
    .lte('shift_date', end)
    .order('shift_date', { ascending: false })

  return (data || []).map(mapTipEntry)
}

export async function getStaffMemberTipSummary(
  staffMemberId: string,
  start: string,
  end: string
): Promise<StaffTipSummary | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries } = await supabase
    .from('tip_entries')
    .select('*, staff_members(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .gte('shift_date', start)
    .lte('shift_date', end)

  const rows: any[] = entries || []
  if (rows.length === 0) return null

  const { data: distributions } = await supabase
    .from('tip_distributions')
    .select('share_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('staff_member_id', staffMemberId)
    .gte('distribution_date', start)
    .lte('distribution_date', end)

  const distRows: any[] = distributions || []

  return {
    staffMemberId,
    staffName: rows[0]?.staff_members?.name ?? 'Unknown',
    totalCashCents: rows.reduce((s: number, r: any) => s + (r.cash_tips_cents || 0), 0),
    totalCardCents: rows.reduce((s: number, r: any) => s + (r.card_tips_cents || 0), 0),
    totalTipsCents: rows.reduce(
      (s: number, r: any) => s + (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
      0
    ),
    totalDistributedCents: distRows.reduce((s: number, r: any) => s + (r.share_cents || 0), 0),
    shiftCount: rows.length,
  }
}

// ── Tip Report (period summary by staff member) ───────────────────

export async function getStaffTipReport(start: string, end: string): Promise<StaffTipSummary[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries } = await supabase
    .from('tip_entries')
    .select('*, staff_members(name)')
    .eq('tenant_id', user.tenantId!)
    .gte('shift_date', start)
    .lte('shift_date', end)

  const rows: any[] = entries || []

  const { data: distributions } = await supabase
    .from('tip_distributions')
    .select('staff_member_id, share_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('distribution_date', start)
    .lte('distribution_date', end)

  const distRows: any[] = distributions || []

  // Group by staff member
  const byStaff = new Map<string, { name: string; cash: number; card: number; count: number }>()
  for (const r of rows) {
    const key = r.staff_member_id
    const existing = byStaff.get(key) || {
      name: r.staff_members?.name ?? 'Unknown',
      cash: 0,
      card: 0,
      count: 0,
    }
    existing.cash += r.cash_tips_cents || 0
    existing.card += r.card_tips_cents || 0
    existing.count += 1
    byStaff.set(key, existing)
  }

  // Group distributions by staff
  const distByStaff = new Map<string, number>()
  for (const d of distRows) {
    distByStaff.set(d.staff_member_id, (distByStaff.get(d.staff_member_id) || 0) + d.share_cents)
  }

  const results: StaffTipSummary[] = []
  for (const [staffId, data] of byStaff) {
    results.push({
      staffMemberId: staffId,
      staffName: data.name,
      totalCashCents: data.cash,
      totalCardCents: data.card,
      totalTipsCents: data.cash + data.card,
      totalDistributedCents: distByStaff.get(staffId) || 0,
      shiftCount: data.count,
    })
  }

  return results.sort((a, b) => b.totalTipsCents - a.totalTipsCents)
}

// ── Pool Config CRUD ──────────────────────────────────────────────

export async function createTipPoolConfig(input: {
  name: string
  poolMethod: 'equal' | 'hours_based' | 'points_based'
  includedRoles: string[]
}): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase.from('tip_pool_configs').insert({
    tenant_id: user.tenantId!,
    name: input.name,
    pool_method: input.poolMethod,
    included_roles: input.includedRoles,
    is_active: true,
  })
}

export async function updateTipPoolConfig(
  id: string,
  updates: {
    name?: string
    poolMethod?: 'equal' | 'hours_based' | 'points_based'
    includedRoles?: string[]
    isActive?: boolean
  }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.poolMethod !== undefined) patch.pool_method = updates.poolMethod
  if (updates.includedRoles !== undefined) patch.included_roles = updates.includedRoles
  if (updates.isActive !== undefined) patch.is_active = updates.isActive

  await supabase.from('tip_pool_configs').update(patch).eq('id', id).eq('tenant_id', user.tenantId!)
}

export async function deleteTipPoolConfig(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase.from('tip_pool_configs').delete().eq('id', id).eq('tenant_id', user.tenantId!)
}

export async function getTipPoolConfigs(): Promise<TipPoolConfig[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('tip_pool_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('name')

  return (data || []).map(mapPoolConfig)
}

// ── Tip Distribution Calculation ──────────────────────────────────

export async function calculateTipDistribution(
  date: string,
  poolConfigId: string
): Promise<DistributionPreview[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get pool config
  const { data: configData } = await supabase
    .from('tip_pool_configs')
    .select('*')
    .eq('id', poolConfigId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!configData) throw new Error('Pool config not found')

  const config = mapPoolConfig(configData)

  // Get all pool-eligible tip entries for the date
  const { data: entries } = await supabase
    .from('tip_entries')
    .select('*, staff_members(name, role)')
    .eq('tenant_id', user.tenantId!)
    .eq('shift_date', date)
    .eq('pool_eligible', true)

  const rows: any[] = entries || []
  if (rows.length === 0) return []

  // Filter by included roles if configured
  const eligible =
    config.includedRoles.length > 0
      ? rows.filter((r: any) => config.includedRoles.includes(r.staff_members?.role ?? ''))
      : rows

  if (eligible.length === 0) return []

  // Total pool amount
  const totalPoolCents = eligible.reduce(
    (s: number, r: any) => s + (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
    0
  )

  if (totalPoolCents === 0) return []

  // Calculate shares based on pool method
  const previews: DistributionPreview[] = []

  if (config.poolMethod === 'equal') {
    const shareEach = Math.floor(totalPoolCents / eligible.length)
    const remainder = totalPoolCents - shareEach * eligible.length

    eligible.forEach((r: any, i: number) => {
      previews.push({
        staffMemberId: r.staff_member_id,
        staffName: r.staff_members?.name ?? 'Unknown',
        shareCents: shareEach + (i < remainder ? 1 : 0),
        hoursWorked: r.hours_worked ? parseFloat(r.hours_worked) : null,
        tipContributionCents: (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
      })
    })
  } else {
    // hours_based or points_based (points_based falls back to hours for now)
    const totalHours = eligible.reduce(
      (s: number, r: any) => s + (r.hours_worked ? parseFloat(r.hours_worked) : 0),
      0
    )

    if (totalHours === 0) {
      // Fall back to equal split if no hours recorded
      const shareEach = Math.floor(totalPoolCents / eligible.length)
      const remainder = totalPoolCents - shareEach * eligible.length

      eligible.forEach((r: any, i: number) => {
        previews.push({
          staffMemberId: r.staff_member_id,
          staffName: r.staff_members?.name ?? 'Unknown',
          shareCents: shareEach + (i < remainder ? 1 : 0),
          hoursWorked: null,
          tipContributionCents: (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
        })
      })
    } else {
      let distributed = 0
      eligible.forEach((r: any, i: number) => {
        const hours = r.hours_worked ? parseFloat(r.hours_worked) : 0
        const isLast = i === eligible.length - 1
        const share = isLast
          ? totalPoolCents - distributed
          : Math.floor(totalPoolCents * (hours / totalHours))

        distributed += share

        previews.push({
          staffMemberId: r.staff_member_id,
          staffName: r.staff_members?.name ?? 'Unknown',
          shareCents: share,
          hoursWorked: hours || null,
          tipContributionCents: (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
        })
      })
    }
  }

  return previews
}

export async function saveTipDistribution(
  date: string,
  poolConfigId: string,
  distributions: { staffMemberId: string; shareCents: number }[]
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get pool config for method name
  const { data: configData } = await supabase
    .from('tip_pool_configs')
    .select('pool_method')
    .eq('id', poolConfigId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const method = configData?.pool_method ?? 'equal'
  const totalPoolCents = distributions.reduce((s, d) => s + d.shareCents, 0)

  const rows = distributions.map((d) => ({
    tenant_id: user.tenantId!,
    distribution_date: date,
    pool_config_id: poolConfigId,
    total_pool_cents: totalPoolCents,
    staff_member_id: d.staffMemberId,
    share_cents: d.shareCents,
    method_used: method,
  }))

  await supabase.from('tip_distributions').insert(rows)
}

export async function getTipDistributionHistory(days = 30): Promise<TipDistribution[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data } = await supabase
    .from('tip_distributions')
    .select('*, staff_members(name)')
    .eq('tenant_id', user.tenantId!)
    .gte('distribution_date', cutoffStr)
    .order('distribution_date', { ascending: false })

  return (data || []).map(mapDistribution)
}

// ── Mappers ───────────────────────────────────────────────────────

function mapTipEntry(r: any): StaffTipEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    shiftDate: r.shift_date,
    staffMemberId: r.staff_member_id,
    staffName: r.staff_members?.name ?? undefined,
    staffRole: r.staff_members?.role ?? undefined,
    cashTipsCents: r.cash_tips_cents,
    cardTipsCents: r.card_tips_cents,
    totalTipsCents: (r.cash_tips_cents || 0) + (r.card_tips_cents || 0),
    hoursWorked: r.hours_worked ? parseFloat(r.hours_worked) : null,
    poolEligible: r.pool_eligible,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

function mapPoolConfig(r: any): TipPoolConfig {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    poolMethod: r.pool_method,
    includedRoles: r.included_roles || [],
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapDistribution(r: any): TipDistribution {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    distributionDate: r.distribution_date,
    poolConfigId: r.pool_config_id,
    totalPoolCents: r.total_pool_cents,
    staffMemberId: r.staff_member_id,
    staffName: r.staff_members?.name ?? undefined,
    shareCents: r.share_cents,
    methodUsed: r.method_used,
    createdAt: r.created_at,
  }
}

import { createServerClient } from '@/lib/db/server'

// -- Types --------------------------------------------------------------------

export type MilestoneStatus = 'active' | 'triggered' | 'completed' | 'dismissed'

export type MilestoneTriggerType =
  | 'event_count'
  | 'revenue_monthly'
  | 'revenue_quarterly'
  | 'client_count'
  | 'repeat_client_count'
  | 'custom'

export interface MilestoneTrigger {
  type: MilestoneTriggerType
  threshold: number
  /** For revenue triggers, consecutive months at or above threshold */
  consecutiveMonths?: number
}

export interface MilestoneAction {
  description: string
  /** Optional: commitment domain to auto-activate when triggered */
  commitmentDomain?: string
  /** Optional: commitment rule to auto-create when triggered */
  commitmentRule?: Record<string, any>
}

export interface Milestone {
  id: string
  tenantId: string
  title: string
  trigger: MilestoneTrigger
  action: MilestoneAction
  status: MilestoneStatus
  currentValue: number | null
  triggeredAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MilestoneProgress {
  milestone: Milestone
  percentComplete: number
  currentValue: number
  remaining: number
  estimatedTriggerDate: Date | null
}

// -- Helpers ------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapRow(row: any): Milestone {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    trigger: typeof row.trigger === 'string' ? JSON.parse(row.trigger) : row.trigger,
    action: typeof row.action === 'string' ? JSON.parse(row.action) : row.action,
    status: row.status,
    currentValue: row.current_value,
    triggeredAt: row.triggered_at ? new Date(row.triggered_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// -- Core Functions -----------------------------------------------------------

/**
 * Get all milestones for a tenant.
 */
export async function getMilestones(
  tenantId: string,
  statusFilter?: MilestoneStatus
): Promise<Milestone[]> {
  const client = createServerClient()

  let query = client
    .from('commitment_milestones' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data } = await query
  return (data ?? []).map(mapRow)
}

/**
 * Create a new milestone commitment.
 * Example: "At 100 events, hire sous chef" or "At $10K/month for 3 months, raise floor."
 */
export async function createMilestone(
  tenantId: string,
  milestone: {
    title: string
    trigger: MilestoneTrigger
    action: MilestoneAction
  }
): Promise<Milestone> {
  const client = createServerClient()
  const now = new Date().toISOString()
  const id = generateId()

  const row = {
    id,
    tenant_id: tenantId,
    title: milestone.title,
    trigger: milestone.trigger,
    action: milestone.action,
    status: 'active',
    current_value: null,
    triggered_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  }

  await client.from('commitment_milestones' as any).insert(row)

  return {
    id,
    tenantId,
    title: milestone.title,
    trigger: milestone.trigger,
    action: milestone.action,
    status: 'active',
    currentValue: null,
    triggeredAt: null,
    completedAt: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }
}

/**
 * Check whether any milestones have been triggered based on current metrics.
 * Returns milestones that just crossed their threshold.
 */
export async function checkMilestoneTriggered(tenantId: string): Promise<Milestone[]> {
  const client = createServerClient()
  const activeMilestones = await getMilestones(tenantId, 'active')

  if (activeMilestones.length === 0) return []

  const triggered: Milestone[] = []

  for (const milestone of activeMilestones) {
    const currentValue = await getCurrentValueForTrigger(tenantId, milestone.trigger)

    await client
      .from('commitment_milestones' as any)
      .update({ current_value: currentValue, updated_at: new Date().toISOString() })
      .eq('id', milestone.id)

    if (currentValue >= milestone.trigger.threshold) {
      if (milestone.trigger.consecutiveMonths && milestone.trigger.consecutiveMonths > 1) {
        const meetsStreak = await checkConsecutiveMonthStreak(
          tenantId,
          milestone.trigger.threshold,
          milestone.trigger.consecutiveMonths
        )
        if (!meetsStreak) continue
      }

      await client
        .from('commitment_milestones' as any)
        .update({
          status: 'triggered',
          triggered_at: new Date().toISOString(),
          current_value: currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id)

      milestone.status = 'triggered'
      milestone.triggeredAt = new Date()
      milestone.currentValue = currentValue
      triggered.push(milestone)
    }
  }

  return triggered
}

/**
 * Get progress toward each active milestone.
 */
export async function getMilestoneProgress(tenantId: string): Promise<MilestoneProgress[]> {
  const activeMilestones = await getMilestones(tenantId, 'active')
  const progress: MilestoneProgress[] = []

  for (const milestone of activeMilestones) {
    const currentValue = await getCurrentValueForTrigger(tenantId, milestone.trigger)
    const remaining = Math.max(0, milestone.trigger.threshold - currentValue)
    const percentComplete =
      milestone.trigger.threshold > 0
        ? Math.min(100, Math.round((currentValue / milestone.trigger.threshold) * 100))
        : 0

    progress.push({
      milestone,
      percentComplete,
      currentValue,
      remaining,
      estimatedTriggerDate: null,
    })
  }

  progress.sort((a, b) => b.percentComplete - a.percentComplete)
  return progress
}

// -- Internal Helpers ---------------------------------------------------------

async function getCurrentValueForTrigger(
  tenantId: string,
  trigger: MilestoneTrigger
): Promise<number> {
  const client = createServerClient()

  switch (trigger.type) {
    case 'event_count': {
      const { count } = await client
        .from('events' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
      return count ?? 0
    }

    case 'client_count': {
      const { count } = await client
        .from('clients' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      return count ?? 0
    }

    case 'revenue_monthly': {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data } = await client
        .from('ledger_entries' as any)
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('type', 'payment')
        .gte('created_at', startOfMonth.toISOString())
      return (data ?? []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    }

    case 'revenue_quarterly': {
      const now = new Date()
      const q = Math.ceil((now.getMonth() + 1) / 3)
      const startOfQuarter = new Date(now.getFullYear(), (q - 1) * 3, 1)
      const { data } = await client
        .from('ledger_entries' as any)
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('type', 'payment')
        .gte('created_at', startOfQuarter.toISOString())
      return (data ?? []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    }

    case 'repeat_client_count': {
      const { data } = await client
        .from('events' as any)
        .select('client_id')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
      if (!data) return 0
      const clientCounts: Record<string, number> = {}
      for (const row of data) {
        const cid = (row as any).client_id
        if (cid) clientCounts[cid] = (clientCounts[cid] ?? 0) + 1
      }
      return Object.values(clientCounts).filter((c) => c >= 2).length
    }

    default:
      return 0
  }
}

async function checkConsecutiveMonthStreak(
  tenantId: string,
  threshold: number,
  months: number
): Promise<boolean> {
  const client = createServerClient()
  const now = new Date()

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

    const { data } = await client
      .from('ledger_entries' as any)
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('type', 'payment')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    const total = (data ?? []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    if (total < threshold) return false
  }

  return true
}

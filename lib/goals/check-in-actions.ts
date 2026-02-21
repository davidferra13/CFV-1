'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import type { GoalCheckIn, ChefGoal } from './types'

// ── Log a manual check-in ─────────────────────────────────────────────────────

const LogCheckInSchema = z.object({
  goalId: z.string().uuid(),
  loggedValue: z.number().int().min(1, 'Value must be at least 1'),
  notes: z.string().max(500).nullable().optional(),
})

export async function logGoalCheckIn(input: {
  goalId: string
  loggedValue: number
  notes?: string | null
}): Promise<{ checkInId: string }> {
  const user = await requireChef()
  const parsed = LogCheckInSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const supabase = createServerClient() as any

  // Verify the goal belongs to this tenant
  const { data: goal } = await supabase
    .from('chef_goals')
    .select('id, tracking_method')
    .eq('id', parsed.data.goalId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!goal) throw new Error('Goal not found')
  if ((goal as { tracking_method: string }).tracking_method !== 'manual_count') {
    throw new Error('This goal is auto-tracked and does not accept manual check-ins')
  }

  const { data, error } = await supabase
    .from('goal_check_ins')
    .insert({
      tenant_id: user.tenantId,
      goal_id: parsed.data.goalId,
      logged_value: parsed.data.loggedValue,
      notes: parsed.data.notes ?? null,
      logged_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to log check-in')

  revalidatePath('/goals')
  return { checkInId: (data as { id: string }).id }
}

// ── Get recent check-ins for a goal ──────────────────────────────────────────

export async function getGoalCheckIns(goalId: string, limit = 5): Promise<GoalCheckIn[]> {
  const user = await requireChef()
  const supabase = createServerClient() as any

  // Verify ownership
  const { data: goal } = await supabase
    .from('chef_goals')
    .select('id')
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!goal) throw new Error('Goal not found')

  const { data, error } = await supabase
    .from('goal_check_ins')
    .select('*')
    .eq('goal_id', goalId)
    .eq('tenant_id', user.tenantId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    goalId: row.goal_id as string,
    tenantId: row.tenant_id as string,
    loggedValue: row.logged_value as number,
    notes: (row.notes as string | null) ?? null,
    loggedAt: row.logged_at as string,
  }))
}

// ── Compute current value for a manual_count goal ─────────────────────────────
// Sum of all check-ins with logged_at within [goal.periodStart, goal.periodEnd].
// Called internally from actions.ts during dashboard computation.

export async function getManualGoalCurrentValue(
  supabase: { from: (table: string) => unknown },
  tenantId: string,
  goal: ChefGoal
): Promise<number> {
  const { data } = await (supabase as any)
    .from('goal_check_ins')
    .select('logged_value')
    .eq('goal_id', goal.id)
    .eq('tenant_id', tenantId)
    .gte('logged_at', `${goal.periodStart}T00:00:00.000Z`)
    .lte('logged_at', `${goal.periodEnd}T23:59:59.999Z`)

  const rows = (data || []) as Array<{ logged_value: number }>
  return rows.reduce((sum, r) => sum + (r.logged_value ?? 0), 0)
}

// ── Get recent check-ins for admin use (no auth check — caller must scope) ────

export async function getManualGoalRecentCheckIns(
  supabase: { from: (table: string) => unknown },
  tenantId: string,
  goalId: string,
  limit = 3
): Promise<GoalCheckIn[]> {
  const { data } = await (supabase as any)
    .from('goal_check_ins')
    .select('*')
    .eq('goal_id', goalId)
    .eq('tenant_id', tenantId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    goalId: row.goal_id as string,
    tenantId: row.tenant_id as string,
    loggedValue: row.logged_value as number,
    notes: (row.notes as string | null) ?? null,
    loggedAt: row.logged_at as string,
  }))
}

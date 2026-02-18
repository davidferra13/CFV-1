// Chef Activity Log — Query Server Actions
// Reads from chef_activity_log for the activity feed and dashboard.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { ChefActivityEntry, ChefActivityDomain } from './chef-types'

// ─── Get Chef Activity Feed ─────────────────────────────────────────────────

export async function getChefActivity(options?: {
  limit?: number
  domain?: ChefActivityDomain
  clientId?: string
  daysBack?: number
}): Promise<ChefActivityEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const limit = options?.limit ?? 50
  const daysBack = options?.daysBack ?? 30

  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('chef_activity_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options?.domain) {
    query = query.eq('domain', options.domain)
  }

  if (options?.clientId) {
    query = query.eq('client_id', options.clientId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getChefActivity] Error:', error)
    return []
  }

  return (data || []) as unknown as ChefActivityEntry[]
}

// ─── Get Chef Activity for Dashboard (compact) ─────────────────────────────

export async function getChefActivitySummary(limit = 5): Promise<ChefActivityEntry[]> {
  return getChefActivity({ limit, daysBack: 7 })
}

// ─── Get Client-Scoped Chef Activity ────────────────────────────────────────

export async function getClientChefActivity(clientId: string, limit = 30): Promise<ChefActivityEntry[]> {
  return getChefActivity({ clientId, limit, daysBack: 90 })
}

// ─── Get Activity Counts by Domain (for filter badges) ─────────────────────

export async function getActivityCountsByDomain(daysBack = 7): Promise<Partial<Record<ChefActivityDomain, number>>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('chef_activity_log' as any)
    .select('domain')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', since)

  if (error) {
    console.error('[getActivityCountsByDomain] Error:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of (data || []) as any[]) {
    counts[row.domain] = (counts[row.domain] || 0) + 1
  }

  return counts as Partial<Record<ChefActivityDomain, number>>
}

'use server'

import { createServerClient } from '@/lib/db/server'

export type DeletionBlocker = {
  type: 'active_events' | 'outstanding_payments' | 'active_retainers' | 'active_subscription'
  message: string
  count?: number
}

/**
 * Run pre-deletion checks to identify blockers that must be resolved
 * before account deletion can proceed.
 */
export async function runPreDeletionChecks(chefId: string): Promise<DeletionBlocker[]> {
  // Tenant isolation: verify chefId matches session when called from user context
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && chefId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db: any = createServerClient({ admin: true })
  const blockers: DeletionBlocker[] = []

  // 1. Check for active events (not completed or cancelled)
  const { data: activeEvents, error: eventsError } = await db
    .from('events')
    .select('id', { count: 'exact' })
    .eq('tenant_id', chefId)
    .not('status', 'in', '("completed","cancelled")')

  if (!eventsError && activeEvents && activeEvents.length > 0) {
    blockers.push({
      type: 'active_events',
      message: `You have ${activeEvents.length} active event${activeEvents.length === 1 ? '' : 's'} that must be completed or cancelled first.`,
      count: activeEvents.length,
    })
  }

  // 2. Check for outstanding payments via event_financial_summary view
  try {
    const { data: unpaidEvents } = await db
      .from('event_financial_summary')
      .select('event_id, total_quoted, total_paid')
      .eq('tenant_id', chefId)

    if (unpaidEvents) {
      const withBalance = unpaidEvents.filter(
        (e: any) => (e.total_quoted || 0) > (e.total_paid || 0) && (e.total_quoted || 0) > 0
      )
      if (withBalance.length > 0) {
        blockers.push({
          type: 'outstanding_payments',
          message: `You have ${withBalance.length} event${withBalance.length === 1 ? '' : 's'} with outstanding payment balances.`,
          count: withBalance.length,
        })
      }
    }
  } catch {
    // View may not exist - skip this check
  }

  // 3. Check for active retainers
  try {
    const { data: activeRetainers } = await db
      .from('retainers')
      .select('id', { count: 'exact' })
      .eq('tenant_id', chefId)
      .eq('status', 'active')

    if (activeRetainers && activeRetainers.length > 0) {
      blockers.push({
        type: 'active_retainers',
        message: `You have ${activeRetainers.length} active retainer${activeRetainers.length === 1 ? '' : 's'} that must be cancelled first.`,
        count: activeRetainers.length,
      })
    }
  } catch {
    // Table may not exist - skip
  }

  // 4. Check for active SaaS subscription
  const { data: chef } = await db
    .from('chefs')
    .select('stripe_subscription_id')
    .eq('id', chefId)
    .single()

  if (chef?.stripe_subscription_id) {
    blockers.push({
      type: 'active_subscription',
      message: 'Your ChefFlow subscription must be cancelled before deleting your account.',
    })
  }

  return blockers
}

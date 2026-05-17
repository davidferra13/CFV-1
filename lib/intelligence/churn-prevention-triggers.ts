'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getChurnPreventionTriggersForTenant } from './churn-prevention-triggers-internal'

// ─── Types (re-exported from internal module) ────────────────────────────────

export type {
  ChurnRiskClient,
  ChurnTrigger,
  ChurnPreventionResult,
} from './churn-prevention-triggers-internal'

import type { ChurnPreventionResult } from './churn-prevention-triggers-internal'

// ─── Main Action (auth-gated wrapper) ────────────────────────────────────────

/**
 * Get churn prevention triggers for the current authenticated chef.
 * This is the 'use server' wrapper; core logic lives in
 * churn-prevention-triggers-internal.ts so it can also be called
 * from cron jobs and CIL scanners without auth context.
 */
export async function getChurnPreventionTriggers(): Promise<ChurnPreventionResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  return getChurnPreventionTriggersForTenant(tenantId)
}

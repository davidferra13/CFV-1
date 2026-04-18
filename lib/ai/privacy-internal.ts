// AI Privacy - Internal helpers (no 'use server')
// Functions here are NOT callable from the browser.
// Used by background processes (cron, scheduled jobs) that have a tenantId but no user session.

import { createServerClient } from '@/lib/db/server'

/**
 * Check if Remy is enabled for a given tenant.
 * Returns false if Remy is disabled or preferences don't exist.
 * No auth check - intended for background processes with a known tenantId.
 */
export async function isAiEnabledForTenant(tenantId: string): Promise<boolean> {
  const db: any = createServerClient()
  const { data } = await db
    .from('ai_preferences')
    .select('remy_enabled')
    .eq('tenant_id', tenantId)
    .single()

  // No preferences row = not onboarded = not enabled
  if (!data) return false
  return data.remy_enabled === true
}

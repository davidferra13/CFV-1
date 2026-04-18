// Automation Settings - Internal helpers (no 'use server')
// Functions here are NOT callable from the browser.
// Used by cron routes to read settings for any tenant.

import { createServerClient } from '@/lib/db/server'
import { DEFAULT_AUTOMATION_SETTINGS } from './types'
import type { ChefAutomationSettings } from './types'

/**
 * Fetch automation settings for a tenant without auth check.
 * Used by cron routes that iterate across all tenants.
 */
export async function getAutomationSettingsForTenant(
  tenantId: string
): Promise<Omit<ChefAutomationSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> {
  const db = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_automation_settings' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return DEFAULT_AUTOMATION_SETTINGS
  return data as unknown as ChefAutomationSettings
}

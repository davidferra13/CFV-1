// Automation Settings Server Actions
// Chef-facing get/update for built-in automation preferences.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ChefAutomationSettings } from './types'
import { DEFAULT_AUTOMATION_SETTINGS } from './types'

// ─── Validation Schema ────────────────────────────────────────────────────

const UpdateSettingsSchema = z.object({
  follow_up_reminders_enabled: z.boolean().optional(),
  follow_up_reminder_interval_hours: z.number().int().min(1).max(336).optional(),
  no_response_alerts_enabled: z.boolean().optional(),
  no_response_threshold_days: z.number().int().min(1).max(30).optional(),
  event_approaching_alerts_enabled: z.boolean().optional(),
  event_approaching_hours: z.number().int().min(1).max(168).optional(),
  inquiry_auto_expiry_enabled: z.boolean().optional(),
  inquiry_expiry_days: z.number().int().min(7).max(365).optional(),
  quote_auto_expiry_enabled: z.boolean().optional(),
  client_event_reminders_enabled: z.boolean().optional(),
  time_tracking_reminders_enabled: z.boolean().optional(),
})

export type UpdateAutomationSettingsInput = z.infer<typeof UpdateSettingsSchema>

// ─── Get Settings ─────────────────────────────────────────────────────────
// Returns the chef's settings row, or a default object if none exists yet.
// Does not create the row — upsert happens on first save.

export async function getAutomationSettings(): Promise<ChefAutomationSettings> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_automation_settings' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[getAutomationSettings] Query failed:', error)
  }

  if (!data) {
    // Return defaults — no row in DB yet
    return {
      id: '',
      tenant_id: user.tenantId!,
      ...DEFAULT_AUTOMATION_SETTINGS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return data as unknown as ChefAutomationSettings
}

// ─── Update Settings ──────────────────────────────────────────────────────
// Upserts the chef's settings row (creates on first save, updates thereafter).

export async function updateAutomationSettings(input: UpdateAutomationSettingsInput) {
  const user = await requireChef()
  const validated = UpdateSettingsSchema.parse(input)
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_automation_settings' as any)
    .upsert(
      {
        tenant_id: user.tenantId!,
        ...validated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )

  if (error) {
    console.error('[updateAutomationSettings] Upsert failed:', error)
    throw new Error('Failed to save automation settings')
  }

  revalidatePath('/settings/automations')
  return { success: true }
}

// ─── Admin helper: fetch settings for a tenant (no auth check) ───────────
// Used by cron routes to read settings for any tenant.

export async function getAutomationSettingsForTenant(
  tenantId: string
): Promise<Omit<ChefAutomationSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('chef_automation_settings' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return DEFAULT_AUTOMATION_SETTINGS
  return data as unknown as ChefAutomationSettings
}

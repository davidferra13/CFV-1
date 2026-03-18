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
  receipt_upload_reminders_enabled: z.boolean().optional(),
  closure_deadline_alerts_enabled: z.boolean().optional(),
  closure_deadline_days: z.number().int().min(1).max(30).optional(),
  weekly_summary_enabled: z.boolean().optional(),
  inquiry_auto_response_template: z.string().max(2000).nullable().optional(),
  auto_response_template_enabled: z.boolean().optional(),
  // Deposit default preferences
  default_deposit_enabled: z.boolean().optional(),
  default_deposit_type: z.enum(['percentage', 'fixed']).optional(),
  default_deposit_percentage: z.number().int().min(0).max(100).optional(),
  default_deposit_amount_cents: z.number().int().min(0).optional(),
  // Pre-event reminder interval toggles
  event_reminder_30d_enabled: z.boolean().optional(),
  event_reminder_14d_enabled: z.boolean().optional(),
  event_reminder_7d_enabled: z.boolean().optional(),
  event_reminder_2d_enabled: z.boolean().optional(),
  event_reminder_1d_enabled: z.boolean().optional(),
})

export type UpdateAutomationSettingsInput = z.infer<typeof UpdateSettingsSchema>

// ─── Get Settings ─────────────────────────────────────────────────────────
// Returns the chef's settings row, or a default object if none exists yet.
// Does not create the row - upsert happens on first save.

export async function getAutomationSettings(): Promise<ChefAutomationSettings> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_automation_settings' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[getAutomationSettings] Query failed:', error)
  }

  if (!data) {
    // Return defaults - no row in DB yet
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
  const supabase: any = createServerClient()

  const { error } = await supabase.from('chef_automation_settings' as any).upsert(
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

// ─── Get Deposit Defaults ─────────────────────────────────────────────────
// Returns the chef's deposit default preferences for auto-filling event forms.

export async function getDepositDefaults(): Promise<{
  enabled: boolean
  type: 'percentage' | 'fixed'
  percentage: number
  amountCents: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_automation_settings' as any)
    .select(
      'default_deposit_enabled, default_deposit_type, default_deposit_percentage, default_deposit_amount_cents'
    )
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!data || !(data as any).default_deposit_enabled) {
    return { enabled: false, type: 'percentage', percentage: 0, amountCents: 0 }
  }

  return {
    enabled: (data as any).default_deposit_enabled,
    type: (data as any).default_deposit_type ?? 'percentage',
    percentage: (data as any).default_deposit_percentage ?? 0,
    amountCents: (data as any).default_deposit_amount_cents ?? 0,
  }
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

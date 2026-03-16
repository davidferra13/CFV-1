'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Types and pure functions live in business-hours-utils.ts (no server deps, safe for tests)
export type { DaySchedule, WeekSchedule, BusinessHoursConfig } from './business-hours-utils'

import type { BusinessHoursConfig, WeekSchedule } from './business-hours-utils'

// ==========================================
// QUERIES
// ==========================================

export async function getBusinessHoursConfig(): Promise<BusinessHoursConfig | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('business_hours_config')
    .select('*')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[business-hours] Failed to load config:', error.message)
    return null
  }

  return data ? { ...data, schedule: data.schedule as unknown as WeekSchedule } : null
}

// Non-authenticated version for checking hours from cron/system contexts
export async function getBusinessHoursForChef(chefId: string): Promise<BusinessHoursConfig | null> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('business_hours_config')
    .select('*')
    .eq('chef_id', chefId)
    .maybeSingle()

  return data ? { ...data, schedule: data.schedule as unknown as WeekSchedule } : null
}

// ==========================================
// MUTATIONS
// ==========================================

const BusinessHoursUpdateSchema = z.object({
  timezone: z.string().min(1),
  schedule: z.record(
    z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ),
  outside_hours_message: z.string().max(500),
  emergency_enabled: z.boolean(),
  emergency_window_hours: z.number().int().min(1).max(72),
})

export async function updateBusinessHoursConfig(
  input: z.infer<typeof BusinessHoursUpdateSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = BusinessHoursUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid configuration.' }
  }

  const supabase = createServerClient()

  const { error } = await supabase.from('business_hours_config').upsert(
    {
      chef_id: user.entityId,
      timezone: parsed.data.timezone,
      schedule: parsed.data.schedule,
      outside_hours_message: parsed.data.outside_hours_message,
      emergency_enabled: parsed.data.emergency_enabled,
      emergency_window_hours: parsed.data.emergency_window_hours,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    console.error('[business-hours] Failed to update config:', error.message)
    return { success: false, error: 'Failed to save business hours.' }
  }

  revalidatePath('/settings/communication')
  return { success: true }
}

// Pure functions (isWithinBusinessHours, isEmergencyContext, getNextBusinessHoursStart)
// are in ./business-hours-utils.ts and re-exported above.

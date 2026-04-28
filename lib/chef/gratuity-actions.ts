'use server'

// Gratuity mode server actions
// Manages how gratuity/service charges are presented on proposals and quotes.
// Modes: discretionary (client decides), auto_service_fee (automatic %), included_in_rate, none

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import { z } from 'zod'
import type { GratuitySettings } from '@/lib/chef/gratuity-types'

const GratuitySettingsSchema = z.object({
  gratuity_mode: z.enum(['discretionary', 'auto_service_fee', 'included_in_rate', 'none']),
  gratuity_service_fee_pct: z.number().min(0).max(100).nullable().optional(),
  gratuity_display_label: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .optional()
    .transform((value) => value || null),
})

export async function getGratuitySettings(): Promise<GratuitySettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chefs')
    .select('gratuity_mode, gratuity_service_fee_pct, gratuity_display_label')
    .eq('id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getGratuitySettings] Error:', error)
    throw new Error('Failed to load gratuity settings')
  }

  return {
    gratuity_mode: (data as any)?.gratuity_mode ?? 'discretionary',
    gratuity_service_fee_pct: (data as any)?.gratuity_service_fee_pct ?? null,
    gratuity_display_label: (data as any)?.gratuity_display_label ?? null,
  }
}

export async function updateGratuitySettings(
  input: GratuitySettings
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = GratuitySettingsSchema.safeParse(input)

  if (!validated.success) {
    return { success: false, error: 'Invalid gratuity settings' }
  }

  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      gratuity_mode: validated.data.gratuity_mode,
      gratuity_service_fee_pct: validated.data.gratuity_service_fee_pct ?? null,
      gratuity_display_label: validated.data.gratuity_display_label ?? null,
    } as any)
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[updateGratuitySettings] Error:', error)
    throw new Error('Failed to save gratuity settings')
  }

  revalidatePath('/settings')

  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'chefs',
      action: 'update',
      reason: 'Gratuity settings updated',
    })
  } catch (err) {
    console.warn('[non-blocking] Gratuity settings broadcast failed', err)
  }

  return { success: true }
}

'use server'

// Gratuity mode server actions
// Manages how gratuity/service charges are presented on proposals and quotes.
// Modes: discretionary (client decides), auto_service_fee (automatic %), included_in_rate, none

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import { z } from 'zod'

const GratuitySettingsSchema = z.object({
  gratuity_mode: z.enum(['discretionary', 'auto_service_fee', 'included_in_rate', 'none']),
  gratuity_service_fee_pct: z.number().min(0).max(100).nullable().optional(),
  gratuity_display_label: z.string().max(80).nullable().optional(),
})

export type GratuitySettings = {
  gratuity_mode: 'discretionary' | 'auto_service_fee' | 'included_in_rate' | 'none'
  gratuity_service_fee_pct: number | null
  gratuity_display_label: string | null
}

export async function getGratuitySettings(): Promise<GratuitySettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select('gratuity_mode, gratuity_service_fee_pct, gratuity_display_label')
    .eq('id', user.tenantId!)
    .single()

  return {
    gratuity_mode: (data as any)?.gratuity_mode ?? 'discretionary',
    gratuity_service_fee_pct: (data as any)?.gratuity_service_fee_pct ?? null,
    gratuity_display_label: (data as any)?.gratuity_display_label ?? null,
  }
}

export async function updateGratuitySettings(
  input: GratuitySettings
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = GratuitySettingsSchema.parse(input)

  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      gratuity_mode: validated.gratuity_mode,
      gratuity_service_fee_pct: validated.gratuity_service_fee_pct ?? null,
      gratuity_display_label: validated.gratuity_display_label ?? null,
    } as any)
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[updateGratuitySettings] Error:', error)
    throw new Error('Failed to save gratuity settings')
  }

  revalidatePath('/settings')

  try { broadcastTenantMutation(user.tenantId!, { entity: 'chefs', action: 'update', reason: 'Gratuity settings updated' }) } catch {}

  return { success: true }
}

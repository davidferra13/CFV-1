'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  extractTakeAChefIntegrationSettings,
  mergeTakeAChefIntegrationSettings,
  normalizeTakeAChefCommissionPercent,
  type TakeAChefIntegrationSettings,
} from './take-a-chef-defaults'

const UpdateTakeAChefSettingsSchema = z.object({
  defaultCommissionPercent: z.number().min(0).max(50),
})

export async function getTakeAChefIntegrationSettings(): Promise<TakeAChefIntegrationSettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('tenant_settings')
    .select('integration_connection_settings')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  return extractTakeAChefIntegrationSettings(data?.integration_connection_settings ?? null)
}

export async function updateTakeAChefIntegrationSettings(input: {
  defaultCommissionPercent: number
}) {
  const user = await requireChef()
  const validated = UpdateTakeAChefSettingsSchema.parse(input)
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('tenant_settings')
    .select('integration_connection_settings')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  const mergedSettings = mergeTakeAChefIntegrationSettings({
    existingSettings: existing?.integration_connection_settings ?? null,
    updates: {
      defaultCommissionPercent: normalizeTakeAChefCommissionPercent(
        validated.defaultCommissionPercent
      ),
    },
  })

  const { error } = await db.from('tenant_settings').upsert(
    {
      tenant_id: user.tenantId!,
      integration_connection_settings: mergedSettings,
      integration_updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    throw new Error(`Failed to save Take a Chef settings: ${error.message}`)
  }

  revalidatePath('/settings/integrations')
  revalidatePath('/import')

  return {
    success: true,
    settings: extractTakeAChefIntegrationSettings(mergedSettings),
  }
}

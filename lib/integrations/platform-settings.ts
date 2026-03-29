'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { MARKETPLACE_PLATFORMS } from '@/lib/marketplace/platforms'
import {
  extractTakeAChefIntegrationSettings,
  mergeTakeAChefIntegrationSettings,
  normalizeTakeAChefCommissionPercent,
} from './take-a-chef-defaults'

// ---- Types ----

export type PlatformConfig = {
  active: boolean
  commissionPercent: number
  customSlaHours?: number
}

export type ChefPlatformSettings = {
  platforms: Record<string, PlatformConfig>
}

// ---- Helpers ----

function parseSettings(raw: unknown): ChefPlatformSettings {
  const root = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >
  const platformsRaw = (
    root.platforms && typeof root.platforms === 'object' && !Array.isArray(root.platforms)
      ? root.platforms
      : {}
  ) as Record<string, unknown>

  const platforms: Record<string, PlatformConfig> = {}

  for (const p of MARKETPLACE_PLATFORMS) {
    const entry = platformsRaw[p.channel]
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const e = entry as Record<string, unknown>
      platforms[p.channel] = {
        active: e.active === true,
        commissionPercent:
          typeof e.commissionPercent === 'number'
            ? Math.min(50, Math.max(0, e.commissionPercent))
            : p.defaultCommissionPercent,
        customSlaHours:
          typeof e.customSlaHours === 'number' ? Math.max(1, e.customSlaHours) : undefined,
      }
    } else {
      // Backward compat: check if take_a_chef has old-style settings
      if (p.channel === 'take_a_chef' && root.take_a_chef) {
        const tac = extractTakeAChefIntegrationSettings(raw)
        platforms[p.channel] = {
          active: true,
          commissionPercent: tac.defaultCommissionPercent,
        }
      } else {
        platforms[p.channel] = {
          active: false,
          commissionPercent: p.defaultCommissionPercent,
        }
      }
    }
  }

  return { platforms }
}

function computeActivePlatforms(platforms: Record<string, PlatformConfig>): string[] {
  return Object.entries(platforms)
    .filter(([, cfg]) => cfg.active)
    .map(([ch]) => ch)
}

// ---- Server Actions ----

export async function getChefPlatformSettings(): Promise<ChefPlatformSettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('tenant_settings')
    .select('integration_connection_settings')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  return parseSettings(data?.integration_connection_settings ?? null)
}

export async function updateChefPlatformSettings(input: {
  channel: string
  active?: boolean
  commissionPercent?: number
  customSlaHours?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate channel
  const platform = MARKETPLACE_PLATFORMS.find((p) => p.channel === input.channel)
  if (!platform) {
    return { success: false, error: 'Unknown platform' }
  }

  // Read current settings
  const { data: existing } = await db
    .from('tenant_settings')
    .select('integration_connection_settings')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  const currentRaw = (existing?.integration_connection_settings ?? {}) as Record<string, unknown>
  const current = parseSettings(currentRaw)

  // Update the specific platform
  const currentPlatform = current.platforms[input.channel] || {
    active: false,
    commissionPercent: platform.defaultCommissionPercent,
  }

  const updated: PlatformConfig = {
    active: input.active ?? currentPlatform.active,
    commissionPercent:
      input.commissionPercent != null
        ? Math.min(50, Math.max(0, input.commissionPercent))
        : currentPlatform.commissionPercent,
    customSlaHours: input.customSlaHours ?? currentPlatform.customSlaHours,
  }

  current.platforms[input.channel] = updated
  const activePlatforms = computeActivePlatforms(current.platforms)

  // Build merged settings (preserve all existing JSONB keys)
  const mergedSettings = {
    ...currentRaw,
    platforms: Object.fromEntries(Object.entries(current.platforms).map(([ch, cfg]) => [ch, cfg])),
  }

  // Backward compat: also update take_a_chef nested key
  if (input.channel === 'take_a_chef') {
    const tacMerged = mergeTakeAChefIntegrationSettings({
      existingSettings: currentRaw,
      updates: { defaultCommissionPercent: updated.commissionPercent },
    })
    Object.assign(mergedSettings, { take_a_chef: tacMerged.take_a_chef })
  }

  const { error } = await db.from('tenant_settings').upsert(
    {
      tenant_id: user.tenantId!,
      integration_connection_settings: mergedSettings,
      active_platforms: activePlatforms,
      integration_updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/integrations')
  return { success: true }
}

export async function getActivePlatforms(): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('tenant_settings')
    .select('active_platforms')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  return data?.active_platforms ?? []
}

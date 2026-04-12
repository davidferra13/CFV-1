import { cache } from 'react'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export const CHEF_FEATURE_FLAGS = {
  developerTools: 'developer_tools',
} as const

export type ChefFeatureFlag = (typeof CHEF_FEATURE_FLAGS)[keyof typeof CHEF_FEATURE_FLAGS]

async function loadFeatureFlagsForChef(
  db: ReturnType<typeof createServerClient>,
  chefId: string
): Promise<Record<string, boolean>> {
  const { data, error } = await db
    .from('chef_feature_flags')
    .select('flag_name, enabled')
    .eq('chef_id', chefId)

  if (error) {
    console.error('[features] Failed to load chef feature flags:', error)
    return {}
  }

  return Object.fromEntries((data ?? []).map((row: any) => [row.flag_name, row.enabled === true]))
}

const getFeatureFlagsForChef = cache(async (chefId: string): Promise<Record<string, boolean>> => {
  const db: any = createServerClient()
  return loadFeatureFlagsForChef(db, chefId)
})

export async function hasChefFeatureFlag(
  flagName: ChefFeatureFlag,
  chefId?: string
): Promise<boolean> {
  const resolvedChefId = chefId ?? (await requireChef()).entityId
  const flags = await getFeatureFlagsForChef(resolvedChefId)
  return flags[flagName] === true
}

export async function hasChefFeatureFlagWithDb(
  db: ReturnType<typeof createServerClient>,
  chefId: string,
  flagName: ChefFeatureFlag
): Promise<boolean> {
  const flags = await loadFeatureFlagsForChef(db, chefId)
  return flags[flagName] === true
}

export async function requireChefFeatureFlag(flagName: ChefFeatureFlag): Promise<AuthUser> {
  const user = await requireChef()

  if (!(await hasChefFeatureFlag(flagName, user.entityId))) {
    throw new Error('This feature is not enabled for this account.')
  }

  return user
}

'use server'

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { isAdminPreviewActive } from '@/lib/auth/admin-preview'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { getAccessLevelForAuthUser, type AdminAccessLevel } from '@/lib/auth/admin-access'

export type AdminDebugState = {
  isAdmin: boolean
  accessLevel: AdminAccessLevel | null
  previewActive: boolean
  effectiveAdmin: boolean
  focusMode: boolean
  enabledModules: string[]
  ownerChefId: string | null
  ownerAuthUserId: string | null
  ownerWarnings: string[]
}

export async function getAdminDebugState(): Promise<AdminDebugState> {
  const admin = await requireAdmin()
  const previewActive = isAdminPreviewActive()
  const db: any = createAdminClient()

  const [ownerIdentity, accessLevel] = await Promise.all([
    resolveOwnerIdentity(db),
    getAccessLevelForAuthUser(admin.id),
  ])

  let focusMode = false
  let enabledModules: string[] = []

  const { data: chefRole } = await db
    .from('user_roles')
    .select('entity_id')
    .eq('auth_user_id', admin.id)
    .eq('role', 'chef')
    .maybeSingle()

  if (chefRole?.entity_id) {
    const { data: chefPrefs } = await db
      .from('chef_preferences')
      .select('focus_mode, enabled_modules')
      .eq('chef_id', chefRole.entity_id)
      .maybeSingle()

    focusMode = chefPrefs?.focus_mode === true
    enabledModules = Array.isArray(chefPrefs?.enabled_modules)
      ? (chefPrefs.enabled_modules as string[])
      : []
  }

  return {
    isAdmin: true,
    accessLevel,
    previewActive,
    effectiveAdmin: !previewActive,
    focusMode,
    enabledModules,
    ownerChefId: ownerIdentity.ownerChefId,
    ownerAuthUserId: ownerIdentity.ownerAuthUserId,
    ownerWarnings: ownerIdentity.warnings,
  }
}

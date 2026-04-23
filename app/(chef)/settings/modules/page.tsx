import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getEnabledModules } from '@/lib/billing/module-actions'
import { getTierForChef } from '@/lib/billing/tier'
import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { isEffectiveAdmin, isEffectivePrivileged } from '@/lib/auth/admin-preview'
import { ModulesClient } from './modules-client'

export const metadata: Metadata = { title: 'Modules' }

export default async function ModulesPage() {
  const user = await requireChef()
  const [enabledModules, tierStatus, focusMode, userIsAdmin, userIsPrivileged] = await Promise.all([
    getEnabledModules(),
    getTierForChef(user.entityId),
    isFocusModeEnabled(),
    isEffectiveAdmin().catch(() => false),
    isEffectivePrivileged().catch(() => false),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100 dark:text-stone-100">Modules</h1>
        <p className="text-stone-400 dark:text-stone-400 mt-1">
          Choose which areas stay visible in your workspace. Focus Mode trims shell clutter to core
          work, and module changes affect navigation visibility, not your data.
        </p>
      </div>
      <ModulesClient
        enabledModules={enabledModules}
        tier={tierStatus.tier}
        isGrandfathered={tierStatus.isGrandfathered}
        focusMode={focusMode}
        isAdmin={userIsAdmin}
        isPrivileged={userIsPrivileged}
      />
    </div>
  )
}

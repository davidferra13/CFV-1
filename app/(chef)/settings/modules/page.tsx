import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getEnabledModules } from '@/lib/billing/module-actions'
import { getTierForChef } from '@/lib/billing/tier'
import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { isEffectiveAdmin } from '@/lib/auth/admin-preview'
import { ModulesClient } from './modules-client'

export const metadata: Metadata = { title: 'Modules' }

export default async function ModulesPage() {
  const user = await requireChef()
  const [enabledModules, tierStatus, focusMode, userIsAdmin] = await Promise.all([
    getEnabledModules(),
    getTierForChef(user.entityId),
    isFocusModeEnabled(),
    isEffectiveAdmin().catch(() => false),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100 dark:text-stone-100">Modules</h1>
        <p className="text-stone-400 dark:text-stone-400 mt-1">
          Choose which features appear in your sidebar. Toggle modules on or off to keep your
          workspace focused on what you need.
        </p>
      </div>
      <ModulesClient
        enabledModules={enabledModules}
        tier={tierStatus.tier}
        isGrandfathered={tierStatus.isGrandfathered}
        focusMode={focusMode}
        isAdmin={userIsAdmin}
      />
    </div>
  )
}

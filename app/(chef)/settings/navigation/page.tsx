import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { MobileTabForm } from '@/components/settings/mobile-tab-form'
import { ArchetypePicker } from '@/components/settings/archetype-picker'
import { getChefArchetype, hasCustomNavDefault } from '@/lib/archetypes/actions'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { ShellDiagnosticsCard } from '@/components/settings/shell-diagnostics-card'

export const metadata: Metadata = { title: 'Navigation Settings' }

export default async function NavigationSettingsPage() {
  const user = await requireChef()
  const [layoutData, currentArchetype, hasCustom, isPrivileged] = await Promise.all([
    getChefLayoutData(user.entityId),
    getChefArchetype(),
    hasCustomNavDefault(),
    getCachedIsPrivileged(user.id).catch(() => false),
  ])
  const enabledModules =
    layoutData.enabled_modules.length > 0 ? layoutData.enabled_modules : DEFAULT_ENABLED_MODULES
  const privilegedBypassEnabled = isPrivileged || process.env.DEMO_MODE_ENABLED === 'true'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Navigation Settings</h1>
          <p className="mt-1 text-stone-400">
            Review chef shell behavior and customize mobile bottom tabs without changing access,
            billing, or enabled modules.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      {/* Archetype presets + custom default */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6">
        <ArchetypePicker currentArchetype={currentArchetype} hasCustomDefault={hasCustom} />
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Desktop Sidebar</h2>
        <p className="mt-2 text-sm text-stone-400">
          Desktop quick actions, grouped sections, and ordering stay fixed so the outer chef shell
          feels stable across routes. Focus Mode, permissions, billing, and enabled modules still
          control what appears.
        </p>
      </div>

      <ShellDiagnosticsCard
        focusMode={layoutData.focus_mode}
        privilegedBypassEnabled={privilegedBypassEnabled}
        enabledModuleCount={enabledModules.length}
        savedMobileTabHrefs={layoutData.mobile_tab_hrefs}
      />

      {/* Mobile bottom tab customization */}
      <MobileTabForm initialMobileTabHrefs={layoutData.mobile_tab_hrefs} />
    </div>
  )
}

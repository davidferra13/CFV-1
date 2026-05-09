import type { ReactNode } from 'react'
import { hasChefFeatureFlag, CHEF_FEATURE_FLAGS } from '@/lib/features/chef-feature-flags'
import { SettingsSidebar } from '@/components/settings/settings-sidebar'
import { SettingsSearch } from '@/components/settings/settings-search'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const developerToolsEnabled = await hasChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools).catch(
    () => false
  )

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar - desktop only */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-stone-800 md:bg-stone-900/50">
        <div className="sticky top-0 flex flex-col overflow-y-auto h-[calc(100vh-64px)]">
          <div className="p-3">
            <SettingsSearch />
          </div>
          <SettingsSidebar developerToolsEnabled={developerToolsEnabled} />
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile search - visible below md */}
        <div className="md:hidden border-b border-stone-800 p-3">
          <SettingsSearch />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

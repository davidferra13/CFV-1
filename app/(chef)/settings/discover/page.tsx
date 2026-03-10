import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getModuleCatalogGrouped } from '@/lib/archetypes/discovery-actions'
import { ModuleDiscoveryGrid } from '@/components/settings/module-discovery-grid'

export const metadata: Metadata = { title: 'Discover Features - ChefFlow' }

export default async function DiscoverPage() {
  await requireChef()
  const groups = await getModuleCatalogGrouped()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Discover Features</h1>
        <p className="text-stone-400 mt-1">
          Browse all available modules organized by the six dimensions of your food business. Toggle
          any module on or off to customize your workspace.
        </p>
      </div>
      <ModuleDiscoveryGrid initialGroups={groups} />
    </div>
  )
}

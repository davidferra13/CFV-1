import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { TAXONOMY_CATEGORIES } from '@/lib/taxonomy/types'
import TaxonomySettings from '@/components/settings/taxonomy-settings'

export const metadata: Metadata = { title: 'Taxonomy & Categories - ChefFlow' }

export default async function TaxonomySettingsPage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Taxonomy &amp; Categories</h1>
        <p className="text-stone-400 mt-1">
          Add custom cuisines, occasions, seasons, course types, stations, and more beyond the
          system defaults. Hide defaults you don&apos;t use.
        </p>
      </div>
      <TaxonomySettings categories={TAXONOMY_CATEGORIES} />
    </div>
  )
}

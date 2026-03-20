import { requireChef } from '@/lib/auth/require-chef'
import { TAXONOMY_CATEGORIES } from '@/lib/taxonomy/types'
import TaxonomySettings from '@/components/settings/taxonomy-settings'

export default async function TaxonomySettingsPage() {
  await requireChef()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Lists</h1>
        <p className="text-muted-foreground">
          Add custom options to dropdowns and pickers throughout ChefFlow. Hide system defaults you
          don&apos;t use.
        </p>
      </div>
      <TaxonomySettings categories={TAXONOMY_CATEGORIES} />
    </div>
  )
}

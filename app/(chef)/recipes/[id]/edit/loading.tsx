import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function RecipeEditLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-recipes-edit" size="sm" />
      <FormPageSkeleton fields={6} />
    </div>
  )
}

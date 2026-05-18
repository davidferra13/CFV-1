import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function RecipeImportLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-recipes-import" size="sm" />
      <FormPageSkeleton fields={4} />
    </div>
  )
}

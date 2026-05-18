import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function RecipeDumpLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-recipes-dump" size="sm" />
      <FormPageSkeleton fields={3} />
    </div>
  )
}

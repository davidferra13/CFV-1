import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function RecipeSprintLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-recipes-sprint" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

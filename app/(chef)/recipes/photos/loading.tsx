import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function RecipePhotosLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-recipes-photos" size="sm" />
      <GridPageSkeleton cards={8} />
    </div>
  )
}

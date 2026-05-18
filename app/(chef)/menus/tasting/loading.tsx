import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function MenusTastingLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-menus-tasting" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function MenusDishesLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-menus-dishes" size="sm" />
      <ListPageSkeleton rows={8} />
    </div>
  )
}

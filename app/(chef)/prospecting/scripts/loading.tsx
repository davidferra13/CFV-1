import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function ProspectingScriptsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-prospecting-scripts" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

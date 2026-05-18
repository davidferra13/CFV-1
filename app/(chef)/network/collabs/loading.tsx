import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NetworkCollabsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-network-collabs" size="sm" />
      <GridPageSkeleton cards={6} />
    </div>
  )
}

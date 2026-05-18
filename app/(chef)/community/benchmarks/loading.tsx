import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CommunityBenchmarksLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-community-benchmarks" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

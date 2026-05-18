import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function OpsPerformanceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-ops-performance" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

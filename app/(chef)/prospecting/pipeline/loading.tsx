import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function ProspectingPipelineLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-prospecting-pipeline" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

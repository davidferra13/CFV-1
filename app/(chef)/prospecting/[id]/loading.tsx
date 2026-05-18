import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function ProspectDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-prospecting-detail" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

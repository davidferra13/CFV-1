import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NetworkCollabSpaceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-network-collab-space" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

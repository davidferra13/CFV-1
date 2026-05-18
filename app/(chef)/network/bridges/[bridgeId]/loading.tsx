import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NetworkBridgeLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-network-bridge" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

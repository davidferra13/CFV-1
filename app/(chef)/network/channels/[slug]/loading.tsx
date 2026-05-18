import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NetworkChannelLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-network-channel" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

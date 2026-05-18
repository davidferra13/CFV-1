import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function EventControlPacketLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-event-control-packet" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

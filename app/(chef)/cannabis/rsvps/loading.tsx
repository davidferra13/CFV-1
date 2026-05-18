import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisRsvpsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-rsvps" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisUnlockLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-unlock" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CommunityProfileLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-community-profile" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

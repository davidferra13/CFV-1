import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CampaignDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-detail" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

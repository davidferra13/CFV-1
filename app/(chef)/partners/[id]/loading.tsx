import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function PartnerDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-partners-detail" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

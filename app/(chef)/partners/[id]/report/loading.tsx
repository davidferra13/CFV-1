import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function PartnerReportLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-partners-report" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

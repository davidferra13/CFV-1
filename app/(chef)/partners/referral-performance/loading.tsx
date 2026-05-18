import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function PartnersReferralPerformanceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-partners-referral-performance" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

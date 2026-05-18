import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function OnboardingLoyaltyLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-onboarding-loyalty" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function OnboardingHelpLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-onboarding-help" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialPlannerMonthLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-planner-month" size="sm" />
      <GridPageSkeleton cards={8} />
    </div>
  )
}

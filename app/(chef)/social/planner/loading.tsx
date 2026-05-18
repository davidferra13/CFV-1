import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialPlannerLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-planner" size="sm" />
      <GridPageSkeleton cards={8} />
    </div>
  )
}

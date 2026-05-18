import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialHubOverviewLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-hub-overview" size="sm" />
      <GridPageSkeleton cards={6} />
    </div>
  )
}

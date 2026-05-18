import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialConnectionsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-social-connections" size="sm" />
      <ListPageSkeleton rows={5} />
    </div>
  )
}

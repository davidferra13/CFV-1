import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CommunityDirectoryLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-community-directory" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

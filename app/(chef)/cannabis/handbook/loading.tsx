import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisHandbookLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-handbook" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

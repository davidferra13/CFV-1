import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function PushDinnerDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-push-dinner-detail" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

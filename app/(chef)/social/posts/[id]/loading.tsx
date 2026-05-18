import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialPostDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-post" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

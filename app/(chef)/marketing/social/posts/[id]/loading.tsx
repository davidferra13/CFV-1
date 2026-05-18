import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialPostLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-social-post" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

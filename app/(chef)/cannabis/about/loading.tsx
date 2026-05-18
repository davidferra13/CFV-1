import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisAboutLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-about" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

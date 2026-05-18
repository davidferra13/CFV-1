import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NetworkChefProfileLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-network-chef-profile" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

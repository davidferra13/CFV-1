import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisAgreementLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-agreement" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

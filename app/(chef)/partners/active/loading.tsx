import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function PartnersActiveLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-partners-active" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

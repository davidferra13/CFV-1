import { ContextLoader } from '@/components/ui/context-loader'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'

export default function AuditDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader
        contextId="nav-inventory-audit-detail"
        size="sm"
        className="py-0 items-start"
      />
      <DetailPageSkeleton />
    </div>
  )
}

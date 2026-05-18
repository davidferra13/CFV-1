import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function OpsEquipmentLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-ops-equipment" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

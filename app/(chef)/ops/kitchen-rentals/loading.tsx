import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function OpsKitchenRentalsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-ops-kitchen-rentals" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

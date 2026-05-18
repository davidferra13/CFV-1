import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisLedgerLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-ledger" size="sm" />
      <ListPageSkeleton rows={8} />
    </div>
  )
}

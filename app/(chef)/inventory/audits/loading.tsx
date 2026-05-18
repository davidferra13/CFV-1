import { ContextLoader } from '@/components/ui/context-loader'
import { ListPageSkeleton } from '@/components/ui/page-skeleton'

export default function AuditsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inventory-audits" size="sm" className="py-0 items-start" />
      <ListPageSkeleton rows={5} />
    </div>
  )
}

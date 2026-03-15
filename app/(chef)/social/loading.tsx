import { ContextLoader } from '@/components/ui/context-loader'
import { ListPageSkeleton } from '@/components/ui/page-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing" size="sm" className="py-0 items-start" />
      <ListPageSkeleton />
    </div>
  )
}

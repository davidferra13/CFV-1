import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function StaffLiveLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-staff-live" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

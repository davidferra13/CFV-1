import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function StaffAvailabilityLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-staff-availability" size="sm" />
      <GridPageSkeleton cards={4} />
    </div>
  )
}

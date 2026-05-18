import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function StaffScheduleLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-staff-schedule" size="sm" />
      <GridPageSkeleton cards={5} />
    </div>
  )
}

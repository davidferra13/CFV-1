import { ContextLoader } from '@/components/ui/context-loader'
import { ListPageSkeleton } from '@/components/ui/page-skeleton'

export default function StaffMealsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-staff-meals" size="sm" className="py-0 items-start" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

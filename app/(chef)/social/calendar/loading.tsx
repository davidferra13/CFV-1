import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialCalendarLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-calendar" size="sm" />
      <GridPageSkeleton cards={8} />
    </div>
  )
}

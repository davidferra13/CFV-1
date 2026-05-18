import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialMonthLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-social-month" size="sm" />
      <GridPageSkeleton cards={8} />
    </div>
  )
}

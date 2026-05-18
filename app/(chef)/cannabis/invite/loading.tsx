import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function CannabisInviteLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-invite" size="sm" />
      <FormPageSkeleton fields={3} />
    </div>
  )
}

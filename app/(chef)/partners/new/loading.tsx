import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function NewPartnerLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-partners-new" size="sm" />
      <FormPageSkeleton fields={5} />
    </div>
  )
}

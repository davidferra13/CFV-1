import { ContextLoader } from '@/components/ui/context-loader'
import { FormPageSkeleton } from '@/components/ui/page-skeleton'

export default function NewAuditLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inventory-audits-new" size="sm" className="py-0 items-start" />
      <FormPageSkeleton fields={4} />
    </div>
  )
}

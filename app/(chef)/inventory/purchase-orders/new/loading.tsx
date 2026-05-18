import { ContextLoader } from '@/components/ui/context-loader'
import { FormPageSkeleton } from '@/components/ui/page-skeleton'

export default function CreatePOLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-purchase-orders-new" size="sm" className="py-0 items-start" />
      <FormPageSkeleton fields={5} />
    </div>
  )
}

import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function ControlPacketTemplateLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-cannabis-control-packet-template" size="sm" />
      <FormPageSkeleton fields={5} />
    </div>
  )
}

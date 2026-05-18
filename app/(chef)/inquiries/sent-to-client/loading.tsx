import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function InquiriesSentToClientLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inquiries-sent-to-client" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

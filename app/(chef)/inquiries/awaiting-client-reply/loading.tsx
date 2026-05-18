import { ListPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function InquiriesAwaitingClientReplyLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inquiries-awaiting-client-reply" size="sm" />
      <ListPageSkeleton rows={6} />
    </div>
  )
}

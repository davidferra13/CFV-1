import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SafetyBackupChefLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-safety-backup-chef" size="sm" />
      <DetailPageSkeleton />
    </div>
  )
}

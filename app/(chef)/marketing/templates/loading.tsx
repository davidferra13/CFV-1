import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-marketing-templates" size="sm" />
      <GridPageSkeleton cards={6} />
    </div>
  )
}

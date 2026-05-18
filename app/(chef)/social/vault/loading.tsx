import { GridPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialVaultLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-vault" size="sm" />
      <GridPageSkeleton cards={6} />
    </div>
  )
}

import { FormPageSkeleton } from '@/components/ui/page-skeleton'
import { ContextLoader } from '@/components/ui/context-loader'

export default function SocialComposeEventLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-social-compose" size="sm" />
      <FormPageSkeleton fields={4} />
    </div>
  )
}

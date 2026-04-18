import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'

// Cannabis portal: invitation-only, admin-gated tier.
// Layout is the single access gate for all /cannabis/* pages.
export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  const user = await requireChef()
  const hasAccess = await hasCannabisAccess(user.id)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return <>{children}</>
}

import { redirect } from 'next/navigation'
import { requirePro } from '@/lib/billing/require-pro'
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'

// Cannabis portal: dual-gated.
// 1. requirePro('cannabis-portal') checks billing tier (redirects to billing if unpaid)
// 2. hasCannabisAccess() checks cannabis_tier_users table (invitation-only)
export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePro('cannabis-portal')
  const hasAccess = await hasCannabisAccess(user.id)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return <>{children}</>
}

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { RemovalRequestList } from '@/components/protection/removal-request-list'

export default async function PortfolioRemovalPage() {
  const chef = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_portfolio_removal_requests')
    .select('*, clients(display_name)')
    .eq('tenant_id', chef.tenantId!)
    .order('request_date', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Portfolio Removal Requests</h1>
        <p className="text-sm text-stone-500 mt-1">
          Track and manage requests to remove content from your portfolio.
        </p>
      </div>
      <RemovalRequestList requests={data ?? []} />
    </div>
  )
}

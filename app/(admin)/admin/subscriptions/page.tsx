// Admin Subscriptions Dashboard - Revenue, MRR, subscription health across all chefs

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CreditCard } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type SubscriptionRow = {
  id: string
  business_name: string | null
  email: string | null
  subscription_status: string | null
  stripe_account_id: string | null
  stripe_subscription_id: string | null
  subscription_current_period_end: string | null
  trial_ends_at: string | null
  created_at: string
}

async function getSubscriptionData() {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select(
      'id, business_name, email, subscription_status, stripe_account_id, stripe_subscription_id, subscription_current_period_end, trial_ends_at, created_at'
    )
    .order('created_at', { ascending: false })

  return (chefs ?? []) as SubscriptionRow[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-400',
  grandfathered: 'bg-green-900 text-green-400',
  trialing: 'bg-yellow-900 text-yellow-400',
  past_due: 'bg-red-900 text-red-400',
  canceled: 'bg-stone-800 text-stone-400',
  incomplete: 'bg-orange-900 text-orange-400',
}

function getTier(status: string | null): string {
  if (status === 'active' || status === 'grandfathered') return 'Pro'
  if (status === 'trialing') return 'Trial'
  return 'Free'
}

export default async function AdminSubscriptionsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const chefs = await getSubscriptionData()

  const proCount = chefs.filter(
    (c) => c.subscription_status === 'active' || c.subscription_status === 'grandfathered'
  ).length
  const trialCount = chefs.filter((c) => c.subscription_status === 'trialing').length
  const freeCount = chefs.length - proCount - trialCount
  const stripeConnected = chefs.filter((c) => c.stripe_account_id).length

  // Trial expiring within 7 days
  const now = new Date()
  const sevenDays = new Date(now.getTime() + 7 * 86400000)
  const expiringTrials = chefs.filter((c) => {
    if (c.subscription_status !== 'trialing' || !c.trial_ends_at) return false
    const end = new Date(c.trial_ends_at)
    return end <= sevenDays && end >= now
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-950 rounded-lg">
          <CreditCard size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subscriptions & Revenue</h1>
          <p className="text-sm text-stone-500">
            {chefs.length} chef{chefs.length !== 1 ? 's' : ''} · {proCount} Pro · {trialCount} Trial
            · {freeCount} Free
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Pro Chefs</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{proCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">On Trial</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{trialCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Free Tier</p>
          <p className="text-2xl font-bold text-stone-400 mt-1">{freeCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Stripe Connected</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stripeConnected}</p>
        </div>
      </div>

      {expiringTrials.length > 0 && (
        <div className="bg-yellow-950/50 border border-yellow-900 rounded-xl px-4 py-3 text-sm text-yellow-400">
          <strong>
            {expiringTrials.length} trial{expiringTrials.length !== 1 ? 's' : ''} expiring within 7
            days:
          </strong>{' '}
          {expiringTrials.map((c) => c.business_name ?? c.email).join(', ')}
        </div>
      )}

      <div className="flex justify-end">
        <CsvExportButton
          data={chefs}
          filename="admin-subscriptions"
          columns={[
            { header: 'Chef', accessor: (c) => c.business_name },
            { header: 'Email', accessor: (c) => c.email },
            { header: 'Tier', accessor: (c) => getTier(c.subscription_status) },
            { header: 'Status', accessor: (c) => c.subscription_status },
            { header: 'Stripe Connected', accessor: (c) => (c.stripe_account_id ? 'Yes' : 'No') },
            { header: 'Trial Ends', accessor: (c) => c.trial_ends_at },
            { header: 'Period End', accessor: (c) => c.subscription_current_period_end },
            { header: 'Signed Up', accessor: (c) => c.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Chef
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Tier
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Stripe
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Trial / Period End
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Signed Up
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chefs.map((chef) => {
                const tier = getTier(chef.subscription_status)
                const endDate =
                  chef.subscription_status === 'trialing'
                    ? chef.trial_ends_at
                    : chef.subscription_current_period_end
                return (
                  <tr key={chef.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-xs">
                        {chef.business_name ?? 'Unnamed'}
                      </p>
                      <p className="text-stone-500 text-xs">{chef.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tier === 'Pro' ? 'bg-purple-900 text-purple-400' : tier === 'Trial' ? 'bg-yellow-900 text-yellow-400' : 'bg-stone-800 text-stone-400'}`}
                      >
                        {tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[chef.subscription_status ?? ''] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {chef.subscription_status ?? 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {chef.stripe_account_id ? (
                        <span className="text-green-400 text-xs font-bold">Connected</span>
                      ) : (
                        <span className="text-stone-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {endDate
                        ? new Date(endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {new Date(chef.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={chef.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

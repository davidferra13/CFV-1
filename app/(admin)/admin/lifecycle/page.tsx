// Admin Tenant Lifecycle View - When chefs signed up, onboarded, lifecycle stage

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TrendingUp } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type LifecycleRow = {
  id: string
  business_name: string | null
  email: string | null
  tier: string
  created_at: string
  onboarding_completed_at: string | null
  account_status: string | null
  daysSinceSignup: number
  stage: 'new' | 'onboarding' | 'active' | 'established' | 'dormant' | 'churned'
  hasEvents: boolean
  hasClients: boolean
}

async function getLifecycleData(): Promise<LifecycleRow[]> {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select(
      'id, business_name, email, subscription_status, created_at, onboarding_completed_at, account_status'
    )
    .order('created_at', { ascending: false })

  if (!chefs || chefs.length === 0) return []

  const chefIds = chefs.map((c: any) => c.id)

  const [eventsRes, clientsRes] = await Promise.all([
    supabase.from('events').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('clients').select('tenant_id').in('tenant_id', chefIds),
  ])

  const hasEvents = new Set((eventsRes.data ?? []).map((e: any) => e.tenant_id))
  const hasClients = new Set((clientsRes.data ?? []).map((c: any) => c.tenant_id))

  const now = Date.now()

  return chefs.map((chef: any) => {
    const daysSinceSignup = Math.floor((now - new Date(chef.created_at).getTime()) / 86400000)
    const hasEvt = hasEvents.has(chef.id)
    const hasCli = hasClients.has(chef.id)

    const status = chef.subscription_status
    let tier = 'Free'
    if (status === 'active' || status === 'grandfathered') tier = 'Pro'
    else if (status === 'trialing') tier = 'Trial'

    // Determine lifecycle stage
    let stage: LifecycleRow['stage'] = 'new'
    if (chef.account_status === 'churned' || chef.account_status === 'deactivated') {
      stage = 'churned'
    } else if (daysSinceSignup > 30 && !hasEvt && !hasCli) {
      stage = 'dormant'
    } else if (daysSinceSignup > 60 && hasEvt) {
      stage = 'established'
    } else if (hasEvt || hasCli) {
      stage = 'active'
    } else if (chef.onboarding_completed_at || daysSinceSignup > 3) {
      stage = 'onboarding'
    }

    return {
      id: chef.id,
      business_name: chef.business_name,
      email: chef.email,
      tier,
      created_at: chef.created_at,
      onboarding_completed_at: chef.onboarding_completed_at,
      account_status: chef.account_status,
      daysSinceSignup,
      stage,
      hasEvents: hasEvt,
      hasClients: hasCli,
    }
  })
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-900 text-blue-400',
  onboarding: 'bg-cyan-900 text-cyan-400',
  active: 'bg-green-900 text-green-400',
  established: 'bg-purple-900 text-purple-400',
  dormant: 'bg-yellow-900 text-yellow-400',
  churned: 'bg-red-900 text-red-400',
}

export default async function AdminLifecyclePage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const data = await getLifecycleData()

  const stages = {
    new: data.filter((d) => d.stage === 'new').length,
    onboarding: data.filter((d) => d.stage === 'onboarding').length,
    active: data.filter((d) => d.stage === 'active').length,
    established: data.filter((d) => d.stage === 'established').length,
    dormant: data.filter((d) => d.stage === 'dormant').length,
    churned: data.filter((d) => d.stage === 'churned').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-950 rounded-lg">
          <TrendingUp size={18} className="text-indigo-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tenant Lifecycle</h1>
          <p className="text-sm text-stone-500">
            {data.length} chef{data.length !== 1 ? 's' : ''} across all stages
          </p>
        </div>
      </div>

      {/* Stage funnel */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(stages).map(([stage, count]) => (
          <div
            key={stage}
            className="bg-stone-900 rounded-xl border border-slate-200 p-3 text-center"
          >
            <p className="text-xs text-stone-500 uppercase tracking-wide">{stage}</p>
            <p className="text-xl font-bold text-stone-200 mt-1">{count}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={data}
          filename="admin-lifecycle"
          columns={[
            { header: 'Chef', accessor: (d) => d.business_name },
            { header: 'Email', accessor: (d) => d.email },
            { header: 'Tier', accessor: (d) => d.tier },
            { header: 'Stage', accessor: (d) => d.stage },
            { header: 'Days Since Signup', accessor: (d) => d.daysSinceSignup },
            { header: 'Has Events', accessor: (d) => (d.hasEvents ? 'Yes' : 'No') },
            { header: 'Has Clients', accessor: (d) => (d.hasClients ? 'Yes' : 'No') },
            { header: 'Signed Up', accessor: (d) => d.created_at },
            { header: 'Onboarded', accessor: (d) => d.onboarding_completed_at },
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
                  Stage
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Days
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Events
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Clients
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Signed Up
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr
                  key={d.id}
                  className={`hover:bg-slate-50 transition-colors ${d.stage === 'churned' ? 'bg-red-950/20' : d.stage === 'dormant' ? 'bg-yellow-950/20' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {d.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{d.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.tier === 'Pro' ? 'bg-purple-900 text-purple-400' : d.tier === 'Trial' ? 'bg-yellow-900 text-yellow-400' : 'bg-stone-800 text-stone-400'}`}
                    >
                      {d.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[d.stage]}`}
                    >
                      {d.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">
                    {d.daysSinceSignup}d
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    {d.hasEvents ? (
                      <span className="text-green-400 font-bold">Yes</span>
                    ) : (
                      <span className="text-stone-500">No</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    {d.hasClients ? (
                      <span className="text-green-400 font-bold">Yes</span>
                    ) : (
                      <span className="text-stone-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {new Date(d.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ViewAsChefButton chefId={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

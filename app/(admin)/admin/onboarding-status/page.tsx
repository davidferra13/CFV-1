// Admin Onboarding Status — Per-chef setup completeness

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ListChecks } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type ChefOnboarding = {
  id: string
  business_name: string | null
  email: string | null
  hasStripe: boolean
  hasRecipes: boolean
  hasClients: boolean
  hasEvents: boolean
  hasGmail: boolean
  hasProfile: boolean
  completeness: number // 0-100
  tier: string
}

async function getOnboardingStatus(): Promise<ChefOnboarding[]> {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, stripe_account_id, subscription_status, phone, bio')
    .order('created_at', { ascending: false })

  if (!chefs || chefs.length === 0) return []

  const chefIds = chefs.map((c: any) => c.id)

  // Parallel lookups for setup status
  const [recipesResult, clientsResult, eventsResult, gmailResult] = await Promise.all([
    supabase.from('recipes').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('clients').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('events').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('gmail_sync_log').select('tenant_id').in('tenant_id', chefIds),
  ])

  const hasRecipes = new Set((recipesResult.data ?? []).map((r: any) => r.tenant_id))
  const hasClients = new Set((clientsResult.data ?? []).map((c: any) => c.tenant_id))
  const hasEvents = new Set((eventsResult.data ?? []).map((e: any) => e.tenant_id))
  const hasGmail = new Set((gmailResult.data ?? []).map((g: any) => g.tenant_id))

  return chefs.map((chef: any) => {
    const checks = {
      hasStripe: !!chef.stripe_account_id,
      hasRecipes: hasRecipes.has(chef.id),
      hasClients: hasClients.has(chef.id),
      hasEvents: hasEvents.has(chef.id),
      hasGmail: hasGmail.has(chef.id),
      hasProfile: !!(chef.business_name && chef.phone),
    }
    const completed = Object.values(checks).filter(Boolean).length
    const total = Object.keys(checks).length

    // Tier from subscription_status
    const status = chef.subscription_status
    let tier = 'Free'
    if (status === 'active' || status === 'grandfathered') tier = 'Pro'
    else if (status === 'trialing') tier = 'Trial'

    return {
      id: chef.id,
      business_name: chef.business_name,
      email: chef.email,
      ...checks,
      completeness: Math.round((completed / total) * 100),
      tier,
    }
  })
}

function CompletenessBar({ pct }: { pct: number }) {
  let color = 'bg-red-600'
  if (pct >= 80) color = 'bg-green-600'
  else if (pct >= 50) color = 'bg-yellow-600'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-400">{pct}%</span>
    </div>
  )
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-green-600 text-xs font-bold">Yes</span>
  ) : (
    <span className="text-red-500 text-xs">No</span>
  )
}

export default async function AdminOnboardingPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const statuses = await getOnboardingStatus()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-950 rounded-lg">
          <ListChecks size={18} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chef Onboarding Status</h1>
          <p className="text-sm text-stone-500">
            {statuses.length} chef{statuses.length !== 1 ? 's' : ''} ·{' '}
            {statuses.filter((s) => s.completeness === 100).length} fully set up
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={statuses}
          filename="admin-onboarding"
          columns={[
            { header: 'Chef', accessor: (s) => s.business_name },
            { header: 'Email', accessor: (s) => s.email },
            { header: 'Tier', accessor: (s) => s.tier },
            { header: 'Completeness', accessor: (s) => `${s.completeness}%` },
            { header: 'Profile', accessor: (s) => (s.hasProfile ? 'Yes' : 'No') },
            { header: 'Stripe', accessor: (s) => (s.hasStripe ? 'Yes' : 'No') },
            { header: 'Recipes', accessor: (s) => (s.hasRecipes ? 'Yes' : 'No') },
            { header: 'Clients', accessor: (s) => (s.hasClients ? 'Yes' : 'No') },
            { header: 'Events', accessor: (s) => (s.hasEvents ? 'Yes' : 'No') },
            { header: 'Gmail', accessor: (s) => (s.hasGmail ? 'Yes' : 'No') },
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
                  Setup
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Profile
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Stripe
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Recipes
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Clients
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Events
                </th>
                <th className="text-center px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Gmail
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statuses.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {s.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{s.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.tier === 'Pro' ? 'bg-purple-900 text-purple-200' : s.tier === 'Trial' ? 'bg-yellow-900 text-yellow-200' : 'bg-stone-800 text-stone-400'}`}
                    >
                      {s.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CompletenessBar pct={s.completeness} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasProfile} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasStripe} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasRecipes} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasClients} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasEvents} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Check ok={s.hasGmail} />
                  </td>
                  <td className="px-4 py-3">
                    <ViewAsChefButton chefId={s.id} />
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

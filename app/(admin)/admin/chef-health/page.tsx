// Admin Chef Health Scoring - Composite health score per chef based on activity signals

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Activity } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type ChefHealth = {
  id: string
  business_name: string | null
  email: string | null
  tier: string
  eventCount: number
  clientCount: number
  recipeCount: number
  recentEvents: number // last 30 days
  lastActivity: string | null
  healthScore: number // 0-100
  risk: 'healthy' | 'warning' | 'at-risk' | 'inactive'
}

async function getChefHealthData(): Promise<ChefHealth[]> {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, subscription_status, created_at')
    .order('created_at', { ascending: false })

  if (!chefs || chefs.length === 0) return []

  const chefIds = chefs.map((c: any) => c.id)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [eventsRes, clientsRes, recipesRes, recentEventsRes, activityRes] = await Promise.all([
    supabase.from('events').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('clients').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('recipes').select('tenant_id').in('tenant_id', chefIds),
    supabase
      .from('events')
      .select('tenant_id')
      .in('tenant_id', chefIds)
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('activity_events')
      .select('tenant_id, created_at')
      .in('tenant_id', chefIds)
      .order('created_at', { ascending: false })
      .limit(2000),
  ])

  // Count by tenant
  const countByTenant = (rows: any[]) => {
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + 1)
    }
    return map
  }

  const eventCounts = countByTenant(eventsRes.data ?? [])
  const clientCounts = countByTenant(clientsRes.data ?? [])
  const recipeCounts = countByTenant(recipesRes.data ?? [])
  const recentEventCounts = countByTenant(recentEventsRes.data ?? [])

  // Last activity per tenant
  const lastActivityMap = new Map<string, string>()
  for (const a of activityRes.data ?? []) {
    if (!lastActivityMap.has(a.tenant_id)) {
      lastActivityMap.set(a.tenant_id, a.created_at)
    }
  }

  return chefs.map((chef: any) => {
    const events = eventCounts.get(chef.id) ?? 0
    const clients = clientCounts.get(chef.id) ?? 0
    const recipes = recipeCounts.get(chef.id) ?? 0
    const recent = recentEventCounts.get(chef.id) ?? 0
    const lastAct = lastActivityMap.get(chef.id) ?? null

    // Health score: weighted composite
    let score = 0
    if (events > 0) score += 20
    if (events >= 5) score += 10
    if (clients > 0) score += 15
    if (clients >= 3) score += 10
    if (recipes > 0) score += 15
    if (recent > 0) score += 20
    if (lastAct) {
      const daysSince = (Date.now() - new Date(lastAct).getTime()) / 86400000
      if (daysSince < 3) score += 10
      else if (daysSince < 7) score += 5
    }
    score = Math.min(100, score)

    let risk: ChefHealth['risk'] = 'healthy'
    if (score < 25) risk = 'inactive'
    else if (score < 50) risk = 'at-risk'
    else if (score < 70) risk = 'warning'

    const status = chef.subscription_status
    let tier = 'Free'
    if (status === 'active' || status === 'grandfathered') tier = 'Pro'
    else if (status === 'trialing') tier = 'Trial'

    return {
      id: chef.id,
      business_name: chef.business_name,
      email: chef.email,
      tier,
      eventCount: events,
      clientCount: clients,
      recipeCount: recipes,
      recentEvents: recent,
      lastActivity: lastAct,
      healthScore: score,
      risk,
    }
  })
}

const RISK_COLORS: Record<string, string> = {
  healthy: 'bg-green-900 text-green-400',
  warning: 'bg-yellow-900 text-yellow-400',
  'at-risk': 'bg-orange-900 text-orange-400',
  inactive: 'bg-red-900 text-red-400',
}

function HealthBar({ score }: { score: number }) {
  let color = 'bg-red-600'
  if (score >= 70) color = 'bg-green-600'
  else if (score >= 50) color = 'bg-yellow-600'
  else if (score >= 25) color = 'bg-orange-600'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-stone-400">{score}</span>
    </div>
  )
}

export default async function AdminChefHealthPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const health = await getChefHealthData()
  const sorted = [...health].sort((a, b) => a.healthScore - b.healthScore) // worst first

  const healthyCount = health.filter((h) => h.risk === 'healthy').length
  const atRiskCount = health.filter((h) => h.risk === 'at-risk' || h.risk === 'inactive').length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-950 rounded-lg">
          <Activity size={18} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chef Health Scores</h1>
          <p className="text-sm text-stone-500">
            {health.length} chef{health.length !== 1 ? 's' : ''} · {healthyCount} healthy ·{' '}
            {atRiskCount} need attention
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={sorted}
          filename="admin-chef-health"
          columns={[
            { header: 'Chef', accessor: (h) => h.business_name },
            { header: 'Email', accessor: (h) => h.email },
            { header: 'Tier', accessor: (h) => h.tier },
            { header: 'Health Score', accessor: (h) => h.healthScore },
            { header: 'Risk', accessor: (h) => h.risk },
            { header: 'Events', accessor: (h) => h.eventCount },
            { header: 'Clients', accessor: (h) => h.clientCount },
            { header: 'Recipes', accessor: (h) => h.recipeCount },
            { header: 'Recent Events (30d)', accessor: (h) => h.recentEvents },
            { header: 'Last Activity', accessor: (h) => h.lastActivity },
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
                  Health
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Risk
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Events
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Clients
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Recent
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Last Active
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((h) => (
                <tr
                  key={h.id}
                  className={`hover:bg-slate-50 transition-colors ${h.risk === 'inactive' ? 'bg-red-950/20' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {h.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{h.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${h.tier === 'Pro' ? 'bg-purple-900 text-purple-400' : h.tier === 'Trial' ? 'bg-yellow-900 text-yellow-400' : 'bg-stone-800 text-stone-400'}`}
                    >
                      {h.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <HealthBar score={h.healthScore} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[h.risk]}`}
                    >
                      {h.risk}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{h.eventCount}</td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{h.clientCount}</td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{h.recentEvents}</td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {h.lastActivity
                      ? new Date(h.lastActivity).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <ViewAsChefButton chefId={h.id} />
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

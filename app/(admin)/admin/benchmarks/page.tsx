// Admin Tenant Comparison / Benchmarks - Cross-tenant metrics comparison

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BarChart3 } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type BenchmarkRow = {
  id: string
  business_name: string | null
  email: string | null
  tier: string
  eventCount: number
  clientCount: number
  recipeCount: number
  quoteCount: number
  inquiryCount: number
  revenueCents: number
  avgEventRevenueCents: number
  conversionRate: number // inquiries to events %
}

async function getBenchmarkData(): Promise<BenchmarkRow[]> {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, subscription_status')
    .order('business_name', { ascending: true })

  if (!chefs || chefs.length === 0) return []

  const chefIds = chefs.map((c: any) => c.id)

  const [eventsRes, clientsRes, recipesRes, quotesRes, inquiriesRes, ledgerRes] = await Promise.all(
    [
      supabase.from('events').select('tenant_id').in('tenant_id', chefIds),
      supabase.from('clients').select('tenant_id').in('tenant_id', chefIds),
      supabase.from('recipes').select('tenant_id').in('tenant_id', chefIds),
      supabase.from('quotes').select('tenant_id, total_cents').in('tenant_id', chefIds),
      supabase.from('inquiries').select('tenant_id').in('tenant_id', chefIds),
      supabase
        .from('ledger_entries')
        .select('tenant_id, amount_cents, entry_type')
        .in('tenant_id', chefIds)
        .eq('entry_type', 'payment'),
    ]
  )

  const countByTenant = (rows: any[]) => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + 1)
    return map
  }

  const sumByTenant = (rows: any[], field: string) => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + (r[field] ?? 0))
    return map
  }

  const eventCounts = countByTenant(eventsRes.data ?? [])
  const clientCounts = countByTenant(clientsRes.data ?? [])
  const recipeCounts = countByTenant(recipesRes.data ?? [])
  const quoteCounts = countByTenant(quotesRes.data ?? [])
  const inquiryCounts = countByTenant(inquiriesRes.data ?? [])
  const revenueSums = sumByTenant(ledgerRes.data ?? [], 'amount_cents')

  return chefs.map((chef: any) => {
    const events = eventCounts.get(chef.id) ?? 0
    const inquiries = inquiryCounts.get(chef.id) ?? 0
    const revenue = revenueSums.get(chef.id) ?? 0

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
      clientCount: clientCounts.get(chef.id) ?? 0,
      recipeCount: recipeCounts.get(chef.id) ?? 0,
      quoteCount: quoteCounts.get(chef.id) ?? 0,
      inquiryCount: inquiries,
      revenueCents: revenue,
      avgEventRevenueCents: events > 0 ? Math.round(revenue / events) : 0,
      conversionRate: inquiries > 0 ? Math.round((events / inquiries) * 100) : 0,
    }
  })
}

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminBenchmarksPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const data = await getBenchmarkData()
  const sorted = [...data].sort((a, b) => b.revenueCents - a.revenueCents)

  // Platform averages
  const active = data.filter((d) => d.eventCount > 0)
  const avgEvents =
    active.length > 0 ? Math.round(active.reduce((s, d) => s + d.eventCount, 0) / active.length) : 0
  const avgRevenue =
    active.length > 0
      ? Math.round(active.reduce((s, d) => s + d.revenueCents, 0) / active.length)
      : 0
  const avgConversion =
    active.length > 0
      ? Math.round(active.reduce((s, d) => s + d.conversionRate, 0) / active.length)
      : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-950 rounded-lg">
          <BarChart3 size={18} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tenant Benchmarks</h1>
          <p className="text-sm text-stone-500">
            Cross-tenant comparison · {data.length} chef{data.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Platform averages */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">
            Avg Events (active chefs)
          </p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{avgEvents}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Avg Revenue</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCents(avgRevenue)}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Avg Conversion</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{avgConversion}%</p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={sorted}
          filename="admin-benchmarks"
          columns={[
            { header: 'Chef', accessor: (d) => d.business_name },
            { header: 'Tier', accessor: (d) => d.tier },
            { header: 'Events', accessor: (d) => d.eventCount },
            { header: 'Clients', accessor: (d) => d.clientCount },
            { header: 'Recipes', accessor: (d) => d.recipeCount },
            { header: 'Quotes', accessor: (d) => d.quoteCount },
            { header: 'Inquiries', accessor: (d) => d.inquiryCount },
            { header: 'Revenue', accessor: (d) => (d.revenueCents / 100).toFixed(2) },
            { header: 'Avg Event Rev', accessor: (d) => (d.avgEventRevenueCents / 100).toFixed(2) },
            { header: 'Conversion %', accessor: (d) => d.conversionRate },
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
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Tier
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Revenue
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Events
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Clients
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Inquiries
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Conv %
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Avg/Event
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {d.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{d.email ?? ''}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.tier === 'Pro' ? 'bg-purple-900 text-purple-400' : d.tier === 'Trial' ? 'bg-yellow-900 text-yellow-400' : 'bg-stone-800 text-stone-400'}`}
                    >
                      {d.tier}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-green-400 text-xs">
                    {formatCents(d.revenueCents)}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{d.eventCount}</td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{d.clientCount}</td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">{d.inquiryCount}</td>
                  <td className="px-3 py-3 text-right text-xs">
                    <span
                      className={
                        d.conversionRate >= avgConversion
                          ? 'text-green-400'
                          : d.conversionRate > 0
                            ? 'text-yellow-400'
                            : 'text-stone-500'
                      }
                    >
                      {d.conversionRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-stone-400">
                    {formatCents(d.avgEventRevenueCents)}
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

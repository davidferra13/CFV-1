// Admin GDPR & Data Tools - Data export, tenant data overview, privacy compliance

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ShieldCheck } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type TenantDataRow = {
  id: string
  business_name: string | null
  email: string | null
  clientCount: number
  eventCount: number
  recipeCount: number
  documentCount: number
  created_at: string
}

async function getTenantDataOverview(): Promise<TenantDataRow[]> {
  const supabase: any = createAdminClient()

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, created_at')
    .order('business_name', { ascending: true })

  if (!chefs || chefs.length === 0) return []

  const chefIds = chefs.map((c: any) => c.id)

  const [clientsRes, eventsRes, recipesRes, docsRes] = await Promise.all([
    supabase.from('clients').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('events').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('recipes').select('tenant_id').in('tenant_id', chefIds),
    supabase.from('chef_documents').select('tenant_id').in('tenant_id', chefIds),
  ])

  const countByTenant = (rows: any[]) => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + 1)
    return map
  }

  const clientCounts = countByTenant(clientsRes.data ?? [])
  const eventCounts = countByTenant(eventsRes.data ?? [])
  const recipeCounts = countByTenant(recipesRes.data ?? [])
  const docCounts = countByTenant(docsRes.data ?? [])

  return chefs.map((chef: any) => ({
    id: chef.id,
    business_name: chef.business_name,
    email: chef.email,
    clientCount: clientCounts.get(chef.id) ?? 0,
    eventCount: eventCounts.get(chef.id) ?? 0,
    recipeCount: recipeCounts.get(chef.id) ?? 0,
    documentCount: docCounts.get(chef.id) ?? 0,
    created_at: chef.created_at,
  }))
}

export default async function AdminDataToolsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const tenants = await getTenantDataOverview()

  const totalClients = tenants.reduce((s, t) => s + t.clientCount, 0)
  const totalEvents = tenants.reduce((s, t) => s + t.eventCount, 0)
  const totalRecords = tenants.reduce(
    (s, t) => s + t.clientCount + t.eventCount + t.recipeCount + t.documentCount,
    0
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-950 rounded-lg">
          <ShieldCheck size={18} className="text-teal-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">GDPR & Data Tools</h1>
          <p className="text-sm text-stone-500">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · {totalRecords} total records
            · {totalClients} clients · {totalEvents} events
          </p>
        </div>
      </div>

      <div className="bg-blue-950/50 border border-blue-900 rounded-xl px-4 py-3 text-sm text-blue-400">
        <strong>Data privacy compliance tools.</strong> Use CSV export for data portability requests
        (GDPR Art. 20). For data deletion requests, contact the developer. All data is tenant-scoped
        via RLS.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Tenants</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{tenants.length}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Clients (PII)</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{totalClients}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Events</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{totalEvents}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Total Records</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{totalRecords}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={tenants}
          filename="admin-tenant-data-inventory"
          columns={[
            { header: 'Chef', accessor: (t) => t.business_name },
            { header: 'Email', accessor: (t) => t.email },
            { header: 'Clients', accessor: (t) => t.clientCount },
            { header: 'Events', accessor: (t) => t.eventCount },
            { header: 'Recipes', accessor: (t) => t.recipeCount },
            { header: 'Documents', accessor: (t) => t.documentCount },
            { header: 'Signed Up', accessor: (t) => t.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Tenant
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Clients
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Events
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Recipes
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Docs
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Since
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {t.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{t.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">{t.clientCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">{t.eventCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">{t.recipeCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">{t.documentCount}</td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {new Date(t.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ViewAsChefButton chefId={t.id} />
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

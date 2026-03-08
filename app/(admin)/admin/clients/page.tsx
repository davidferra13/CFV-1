// Admin Client List — all clients across every chef tenant

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformClientList, type PlatformClientRow } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { UserCheck, AlertCircle } from '@/components/ui/icons'
import { ViewAsClientButton } from '@/components/admin/view-as-client-button'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default async function AdminClientListPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let clients: PlatformClientRow[] = []
  let error = null
  try {
    clients = await getPlatformClientList()
  } catch (err) {
    error = 'Failed to load client list'
    console.error('[Admin] Client list error:', err)
  }

  const totalLTV = clients.reduce((s, c) => s + c.ltvCents, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-950 rounded-lg">
          <UserCheck size={18} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">
            {clients.length} client{clients.length !== 1 ? 's' : ''} across all tenants ·{' '}
            {formatCents(totalLTV)} total LTV
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <CsvExportButton
          data={clients}
          filename="admin-clients"
          columns={[
            { header: 'Name', accessor: (c) => c.name },
            { header: 'Email', accessor: (c) => c.email },
            { header: 'Chef', accessor: (c) => c.chefBusinessName },
            { header: 'Events', accessor: (c) => c.eventCount },
            {
              header: 'LTV ($)',
              accessor: (c) => (c.ltvCents ? (c.ltvCents / 100).toFixed(2) : '0'),
            },
            { header: 'Joined', accessor: (c) => c.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {clients.length === 0 && !error ? (
          <div className="py-12 text-center text-slate-400 text-sm">No clients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Chef / Tenant
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Events
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    LTV
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{client.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{client.email ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {client.chefBusinessName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{client.eventCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCents(client.ltvCents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(client.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ViewAsClientButton clientId={client.id} />
                        {client.tenant_id && <ViewAsChefButton chefId={client.tenant_id} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

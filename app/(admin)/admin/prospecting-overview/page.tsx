// Admin Prospecting Overview — All chefs' prospect pipelines in one view

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminProspects } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Target } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-blue-900 text-blue-700',
  contacted: 'bg-yellow-900 text-yellow-700',
  meeting: 'bg-purple-900 text-purple-700',
  proposal: 'bg-indigo-900 text-indigo-700',
  won: 'bg-green-900 text-green-700',
  lost: 'bg-red-900 text-red-700',
  nurture: 'bg-stone-800 text-stone-400',
}

export default async function AdminProspectingPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const prospects = await getAdminProspects().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-950 rounded-lg">
          <Target size={18} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Prospects</h1>
          <p className="text-sm text-stone-500">
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={prospects}
          filename="admin-prospects"
          columns={[
            { header: 'Business', accessor: (p) => p.business_name },
            { header: 'Contact', accessor: (p) => p.contact_name },
            { header: 'Chef', accessor: (p) => p.chefBusinessName },
            { header: 'Stage', accessor: (p) => p.stage },
            { header: 'Score', accessor: (p) => p.score },
            { header: 'Added', accessor: (p) => p.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {prospects.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No prospects found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Business
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Added
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.business_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{p.contact_name ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {p.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[p.stage ?? ''] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {p.stage ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">{p.score ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={p.chef_id} />
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

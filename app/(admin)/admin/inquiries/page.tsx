// Admin Inquiries — All inquiries across every chef (with GOLDMINE lead scores)

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminInquiries } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Inbox } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-900 text-blue-700',
  contacted: 'bg-yellow-900 text-yellow-700',
  qualified: 'bg-purple-900 text-purple-700',
  converted: 'bg-green-900 text-green-700',
  lost: 'bg-red-900 text-red-700',
  archived: 'bg-stone-800 text-stone-500',
}

function LeadScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-stone-600 text-xs">-</span>
  let color = 'bg-stone-800 text-stone-400'
  if (score >= 70) color = 'bg-green-900 text-green-700'
  else if (score >= 40) color = 'bg-yellow-900 text-yellow-700'
  else color = 'bg-red-900 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {score}
    </span>
  )
}

export default async function AdminInquiriesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const inquiries = await getAdminInquiries().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-950 rounded-lg">
          <Inbox size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Inquiries</h1>
          <p className="text-sm text-stone-500">
            {inquiries.length} inquir{inquiries.length !== 1 ? 'ies' : 'y'} across all chefs
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={inquiries}
          filename="admin-inquiries"
          columns={[
            { header: 'Client', accessor: (i) => i.client_name },
            { header: 'Email', accessor: (i) => i.client_email },
            { header: 'Chef', accessor: (i) => i.chefBusinessName },
            { header: 'Occasion', accessor: (i) => i.occasion },
            { header: 'Status', accessor: (i) => i.status },
            { header: 'Lead Score', accessor: (i) => i.leadScore },
            { header: 'Guests', accessor: (i) => i.guest_count },
            { header: 'Event Date', accessor: (i) => i.event_date },
            { header: 'Received', accessor: (i) => i.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {inquiries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No inquiries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Occasion
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Lead Score
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Guests
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Event Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Received
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 text-xs">
                          {inq.client_name ?? 'Unknown'}
                        </p>
                        <p className="text-stone-500 text-xs">{inq.client_email ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {inq.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-300 text-xs">{inq.occasion ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inq.status ?? ''] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {inq.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <LeadScoreBadge score={inq.leadScore} />
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {inq.guest_count ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {inq.event_date ? new Date(inq.event_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(inq.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={inq.tenant_id} />
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

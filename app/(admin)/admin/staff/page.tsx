// Admin Staff — All staff members across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminStaff } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Users } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-700',
  inactive: 'bg-stone-800 text-stone-500',
  pending: 'bg-yellow-900 text-yellow-700',
}

export default async function AdminStaffPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const staff = await getAdminStaff().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-950 rounded-lg">
          <Users size={18} className="text-purple-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Staff</h1>
          <p className="text-sm text-stone-500">
            {staff.length} staff member{staff.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={staff}
          filename="admin-staff"
          columns={[
            { header: 'Name', accessor: (s) => s.full_name },
            { header: 'Chef', accessor: (s) => s.chefBusinessName },
            { header: 'Email', accessor: (s) => s.email },
            { header: 'Role', accessor: (s) => s.role },
            { header: 'Status', accessor: (s) => s.status },
            { header: 'Added', accessor: (s) => s.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {staff.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No staff members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Added
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.full_name ?? 'Unnamed'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {s.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{s.email ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs capitalize">{s.role ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status ?? ''] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {s.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={s.chef_id} />
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

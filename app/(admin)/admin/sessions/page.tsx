// Admin Session Management - Active user sessions and login activity

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Users } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type SessionRow = {
  id: string
  business_name: string | null
  email: string | null
  last_sign_in: string | null
  role: string
  account_status: string | null
  loginCount: number
}

async function getSessionData(): Promise<SessionRow[]> {
  const supabase: any = createAdminClient()

  // Get all chefs with their auth user data
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, email, account_status, created_at')
    .order('created_at', { ascending: false })

  if (!chefs || chefs.length === 0) return []

  // Get user_roles for auth_user_id mapping + last sign-in from auth.users
  const { data: roles } = await supabase.from('user_roles').select('entity_id, auth_user_id, role')

  const roleMap = new Map<string, { auth_user_id: string; role: string }>()
  for (const r of roles ?? []) {
    roleMap.set(r.entity_id, { auth_user_id: r.auth_user_id, role: r.role })
  }

  // Get activity events for login counts (proxy for session activity)
  const chefIds = chefs.map((c: any) => c.id)
  const { data: activities } = await supabase
    .from('activity_events')
    .select('tenant_id, created_at')
    .in('tenant_id', chefIds)
    .order('created_at', { ascending: false })
    .limit(5000)

  // Last activity per chef and count
  const activityMap = new Map<string, { count: number; last: string | null }>()
  for (const a of activities ?? []) {
    if (!activityMap.has(a.tenant_id)) {
      activityMap.set(a.tenant_id, { count: 0, last: a.created_at })
    }
    activityMap.get(a.tenant_id)!.count++
  }

  return chefs.map((chef: any) => {
    const roleInfo = roleMap.get(chef.id)
    const activity = activityMap.get(chef.id)

    return {
      id: chef.id,
      business_name: chef.business_name,
      email: chef.email,
      last_sign_in: activity?.last ?? null,
      role: roleInfo?.role ?? 'chef',
      account_status: chef.account_status,
      loginCount: activity?.count ?? 0,
    }
  })
}

export default async function AdminSessionsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const sessions = await getSessionData()

  // Active in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 86400000
  const recentActive = sessions.filter(
    (s) => s.last_sign_in && new Date(s.last_sign_in).getTime() > sevenDaysAgo
  ).length

  // Never active
  const neverActive = sessions.filter((s) => !s.last_sign_in).length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Users size={18} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Session & Login Activity</h1>
          <p className="text-sm text-stone-500">
            {sessions.length} user{sessions.length !== 1 ? 's' : ''} · {recentActive} active (7d) ·{' '}
            {neverActive} never logged in
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Active (7d)</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{recentActive}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Inactive</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {sessions.length - recentActive - neverActive}
          </p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Never Active</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{neverActive}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={sessions}
          filename="admin-sessions"
          columns={[
            { header: 'Chef', accessor: (s) => s.business_name },
            { header: 'Email', accessor: (s) => s.email },
            { header: 'Role', accessor: (s) => s.role },
            { header: 'Status', accessor: (s) => s.account_status },
            { header: 'Last Active', accessor: (s) => s.last_sign_in },
            { header: 'Activity Count', accessor: (s) => s.loginCount },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Last Active
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Activity
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 text-xs">
                      {s.business_name ?? 'Unnamed'}
                    </p>
                    <p className="text-stone-500 text-xs">{s.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">{s.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.account_status === 'active' ? 'bg-green-900 text-green-400' : 'bg-stone-800 text-stone-400'}`}
                    >
                      {s.account_status ?? 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {s.last_sign_in
                      ? new Date(s.last_sign_in).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">{s.loginCount}</td>
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

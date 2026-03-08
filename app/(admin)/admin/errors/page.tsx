// Admin Error Monitoring - Aggregated errors from all log tables across the platform

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AlertTriangle } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type ErrorRow = {
  id: string
  source: string
  message: string | null
  tenant_id: string | null
  chefBusinessName: string | null
  created_at: string
}

async function getAggregatedErrors(): Promise<ErrorRow[]> {
  const supabase: any = createAdminClient()
  const errors: ErrorRow[] = []

  // Notification delivery failures
  const { data: deliveryErrors } = await supabase
    .from('notification_delivery_log')
    .select('id, error_message, tenant_id, sent_at')
    .eq('status', 'failed')
    .order('sent_at', { ascending: false })
    .limit(100)

  for (const e of deliveryErrors ?? []) {
    errors.push({
      id: `notif-${e.id}`,
      source: 'Notification Delivery',
      message: e.error_message,
      tenant_id: e.tenant_id,
      chefBusinessName: null,
      created_at: e.sent_at,
    })
  }

  // Gmail sync errors
  const { data: gmailErrors } = await supabase
    .from('gmail_sync_log')
    .select('id, error, tenant_id, synced_at')
    .not('error', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(100)

  for (const e of gmailErrors ?? []) {
    errors.push({
      id: `gmail-${e.id}`,
      source: 'Gmail Sync',
      message: e.error,
      tenant_id: e.tenant_id,
      chefBusinessName: null,
      created_at: e.synced_at,
    })
  }

  // Remy action errors
  const { data: remyErrors } = await supabase
    .from('remy_action_audit_log')
    .select('id, task_type, error_message, tenant_id, created_at')
    .eq('status', 'error')
    .order('created_at', { ascending: false })
    .limit(100)

  for (const e of remyErrors ?? []) {
    errors.push({
      id: `remy-${e.id}`,
      source: `Remy (${e.task_type ?? 'unknown'})`,
      message: e.error_message,
      tenant_id: e.tenant_id,
      chefBusinessName: null,
      created_at: e.created_at,
    })
  }

  // Automation execution errors
  const { data: autoErrors } = await supabase
    .from('automation_execution_log')
    .select('id, error_message, tenant_id, executed_at')
    .eq('status', 'error')
    .order('executed_at', { ascending: false })
    .limit(100)

  for (const e of autoErrors ?? []) {
    errors.push({
      id: `auto-${e.id}`,
      source: 'Automation',
      message: e.error_message,
      tenant_id: e.tenant_id,
      chefBusinessName: null,
      created_at: e.executed_at,
    })
  }

  // Sort all by date desc
  errors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Resolve chef names
  const tenantIds = [...new Set(errors.map((e) => e.tenant_id).filter(Boolean))] as string[]
  if (tenantIds.length > 0) {
    const { data: chefs } = await supabase
      .from('chefs')
      .select('id, business_name')
      .in('id', tenantIds)
    const chefMap = new Map((chefs ?? []).map((c: any) => [c.id, c.business_name]))
    for (const err of errors) {
      if (err.tenant_id) {
        err.chefBusinessName = chefMap.get(err.tenant_id) ?? null
      }
    }
  }

  return errors.slice(0, 200)
}

const SOURCE_COLORS: Record<string, string> = {
  'Notification Delivery': 'bg-orange-900 text-orange-400',
  'Gmail Sync': 'bg-blue-900 text-blue-400',
  Automation: 'bg-purple-900 text-purple-400',
}

export default async function AdminErrorsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const errors = await getAggregatedErrors()

  // Count by source
  const bySrc = new Map<string, number>()
  for (const e of errors) {
    const key = e.source.startsWith('Remy') ? 'Remy' : e.source
    bySrc.set(key, (bySrc.get(key) ?? 0) + 1)
  }

  // Last 24h errors
  const oneDayAgo = Date.now() - 86400000
  const recent = errors.filter((e) => new Date(e.created_at).getTime() > oneDayAgo).length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-950 rounded-lg">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Error Monitoring</h1>
          <p className="text-sm text-stone-500">
            {errors.length} error{errors.length !== 1 ? 's' : ''} · {recent} in last 24h
          </p>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...bySrc.entries()].map(([source, count]) => (
          <div key={source} className="bg-stone-900 rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">{source}</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{count}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={errors}
          filename="admin-errors"
          columns={[
            { header: 'Source', accessor: (e) => e.source },
            { header: 'Message', accessor: (e) => e.message },
            { header: 'Chef', accessor: (e) => e.chefBusinessName },
            { header: 'Date', accessor: (e) => e.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {errors.length === 0 ? (
          <div className="py-12 text-center text-green-400 text-sm">
            No errors found. All clear.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Error
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    When
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {errors.map((err) => (
                  <tr key={err.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[err.source] ?? (err.source.startsWith('Remy') ? 'bg-cyan-900 text-cyan-400' : 'bg-stone-800 text-stone-400')}`}
                      >
                        {err.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-md truncate">
                      {err.message ?? 'No details'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {err.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {new Date(err.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {err.tenant_id && <ViewAsChefButton chefId={err.tenant_id} />}
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

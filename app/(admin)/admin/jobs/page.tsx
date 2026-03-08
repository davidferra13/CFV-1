// Admin Background Job Monitor - Automation execution status and job health

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Zap } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type JobRow = {
  id: string
  automation_name: string | null
  trigger_type: string | null
  status: string
  error_message: string | null
  executed_at: string
  tenant_id: string
  chefBusinessName: string | null
}

async function getJobData(): Promise<JobRow[]> {
  const supabase: any = createAdminClient()

  const { data: jobs } = await supabase
    .from('automation_execution_log')
    .select('id, automation_name, trigger_type, status, error_message, executed_at, tenant_id')
    .order('executed_at', { ascending: false })
    .limit(500)

  if (!jobs || jobs.length === 0) return []

  const tenantIds = [...new Set(jobs.map((j: any) => j.tenant_id))]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c: any) => [c.id, c.business_name]))

  return jobs.map((j: any) => ({
    ...j,
    chefBusinessName: chefMap.get(j.tenant_id) ?? null,
  }))
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-900 text-green-400',
  error: 'bg-red-900 text-red-400',
  skipped: 'bg-stone-800 text-stone-500',
  running: 'bg-blue-900 text-blue-400',
  pending: 'bg-yellow-900 text-yellow-400',
}

export default async function AdminJobsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const jobs = await getJobData()

  const successCount = jobs.filter((j) => j.status === 'success').length
  const errorCount = jobs.filter((j) => j.status === 'error').length
  const successRate = jobs.length > 0 ? Math.round((successCount / jobs.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-950 rounded-lg">
          <Zap size={18} className="text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Background Jobs</h1>
          <p className="text-sm text-stone-500">
            {jobs.length} execution{jobs.length !== 1 ? 's' : ''} · {successRate}% success rate ·{' '}
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Success</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{successCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Errors</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{errorCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Success Rate</p>
          <p className="text-2xl font-bold text-stone-200 mt-1">{successRate}%</p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={jobs}
          filename="admin-jobs"
          columns={[
            { header: 'Job', accessor: (j) => j.automation_name },
            { header: 'Trigger', accessor: (j) => j.trigger_type },
            { header: 'Status', accessor: (j) => j.status },
            { header: 'Error', accessor: (j) => j.error_message },
            { header: 'Chef', accessor: (j) => j.chefBusinessName },
            { header: 'Executed At', accessor: (j) => j.executed_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {jobs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No job executions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Job Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Trigger
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
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
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`hover:bg-slate-50 transition-colors ${job.status === 'error' ? 'bg-red-950/20' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 text-xs">
                      {job.automation_name ?? 'Unnamed'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{job.trigger_type ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[job.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                      {job.error_message ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {job.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {new Date(job.executed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={job.tenant_id} />
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

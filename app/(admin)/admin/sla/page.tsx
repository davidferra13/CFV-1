// Admin SLA & Response Time Tracking - How fast chefs respond to inquiries

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Clock } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

type SlaRow = {
  chefId: string
  chefBusinessName: string | null
  totalInquiries: number
  avgResponseHours: number | null
  under1h: number
  under24h: number
  over24h: number
  slaGrade: 'A' | 'B' | 'C' | 'D' | 'F'
}

async function getSlaData(): Promise<SlaRow[]> {
  const supabase: any = createAdminClient()

  // Get inquiries with creation time and first response time (status change from 'new')
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, tenant_id, created_at, status, updated_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (!inquiries || inquiries.length === 0) return []

  // Group by tenant and compute response times
  const byTenant = new Map<
    string,
    { total: number; responseTimes: number[]; under1h: number; under24h: number; over24h: number }
  >()

  for (const inq of inquiries) {
    if (!byTenant.has(inq.tenant_id)) {
      byTenant.set(inq.tenant_id, {
        total: 0,
        responseTimes: [],
        under1h: 0,
        under24h: 0,
        over24h: 0,
      })
    }
    const agg = byTenant.get(inq.tenant_id)!
    agg.total++

    // If status is not 'new', the inquiry was responded to. Response time = updated_at - created_at
    if (inq.status !== 'new' && inq.updated_at) {
      const hours =
        (new Date(inq.updated_at).getTime() - new Date(inq.created_at).getTime()) / 3600000
      if (hours > 0) {
        agg.responseTimes.push(hours)
        if (hours <= 1) agg.under1h++
        else if (hours <= 24) agg.under24h++
        else agg.over24h++
      }
    }
  }

  const tenantIds = [...byTenant.keys()]
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name')
    .in('id', tenantIds)
  const chefMap = new Map((chefs ?? []).map((c: any) => [c.id, c.business_name]))

  return tenantIds
    .map((tid) => {
      const agg = byTenant.get(tid)!
      const avg =
        agg.responseTimes.length > 0
          ? agg.responseTimes.reduce((a, b) => a + b, 0) / agg.responseTimes.length
          : null

      let grade: SlaRow['slaGrade'] = 'F'
      if (avg !== null) {
        if (avg <= 2) grade = 'A'
        else if (avg <= 6) grade = 'B'
        else if (avg <= 12) grade = 'C'
        else if (avg <= 24) grade = 'D'
      }

      return {
        chefId: tid,
        chefBusinessName: chefMap.get(tid) ?? null,
        totalInquiries: agg.total,
        avgResponseHours: avg !== null ? Math.round(avg * 10) / 10 : null,
        under1h: agg.under1h,
        under24h: agg.under24h,
        over24h: agg.over24h,
        slaGrade: grade,
      }
    })
    .sort((a, b) => (a.avgResponseHours ?? 999) - (b.avgResponseHours ?? 999))
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-900 text-green-400',
  B: 'bg-blue-900 text-blue-400',
  C: 'bg-yellow-900 text-yellow-400',
  D: 'bg-orange-900 text-orange-400',
  F: 'bg-red-900 text-red-400',
}

function formatHours(h: number | null): string {
  if (h === null) return 'N/A'
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 24) return `${Math.round(h * 10) / 10}h`
  return `${Math.round(h / 24)}d`
}

export default async function AdminSlaPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const data = await getSlaData()

  const avgAll =
    data
      .filter((d) => d.avgResponseHours !== null)
      .reduce((s, d) => s + (d.avgResponseHours ?? 0), 0) /
      Math.max(1, data.filter((d) => d.avgResponseHours !== null).length) || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-950 rounded-lg">
          <Clock size={18} className="text-cyan-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Response Time & SLA</h1>
          <p className="text-sm text-stone-500">
            Inquiry response times across all chefs · Avg: {formatHours(avgAll)}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={data}
          filename="admin-sla"
          columns={[
            { header: 'Chef', accessor: (d) => d.chefBusinessName },
            { header: 'Total Inquiries', accessor: (d) => d.totalInquiries },
            { header: 'Avg Response (hrs)', accessor: (d) => d.avgResponseHours },
            { header: 'Under 1h', accessor: (d) => d.under1h },
            { header: 'Under 24h', accessor: (d) => d.under24h },
            { header: 'Over 24h', accessor: (d) => d.over24h },
            { header: 'Grade', accessor: (d) => d.slaGrade },
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
                <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Grade
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Avg Response
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Inquiries
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  &lt; 1h
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  &lt; 24h
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  &gt; 24h
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d) => (
                <tr key={d.chefId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 text-xs">
                    {d.chefBusinessName ?? 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[d.slaGrade]}`}
                    >
                      {d.slaGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">
                    {formatHours(d.avgResponseHours)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-stone-400">
                    {d.totalInquiries}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-green-400">{d.under1h}</td>
                  <td className="px-3 py-3 text-right text-xs text-yellow-400">{d.under24h}</td>
                  <td className="px-3 py-3 text-right text-xs text-red-400">{d.over24h}</td>
                  <td className="px-4 py-3">
                    <ViewAsChefButton chefId={d.chefId} />
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

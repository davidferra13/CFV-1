// Admin Beta Signups
// View and manage beta signup requests from the public /beta page.

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { BetaSignupsTable } from '@/components/admin/beta-signups-table'

export const metadata: Metadata = { title: 'Beta Signups - Admin' }

export default async function AdminBetaPage() {
  await requireAdmin()

  const supabase: any = createAdminClient()
  const { data: rows, error } = await supabase
    .from('beta_signups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 text-red-600 text-sm">Failed to load beta signups: {error.message}</div>
    )
  }

  const signups = rows ?? []

  const statusCounts = signups.reduce((acc: any, row: any) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Beta Signups</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage beta signup requests from the public /beta page.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-amber-900 text-amber-300">
          Pending — {statusCounts['pending'] ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-sky-900 text-sky-300">
          Invited — {statusCounts['invited'] ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-900 text-emerald-300">
          Onboarded — {statusCounts['onboarded'] ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-red-900 text-red-300">
          Declined — {statusCounts['declined'] ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-700 text-slate-200">
          Total — {signups.length}
        </span>
      </div>

      <BetaSignupsTable signups={signups} />
    </div>
  )
}

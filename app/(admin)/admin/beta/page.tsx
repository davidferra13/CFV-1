import type { Metadata } from 'next'
import { BetaSignupsTable } from '@/components/admin/beta-signups-table'
import { getBetaSignups } from '@/lib/beta/actions'

export const metadata: Metadata = { title: 'Beta Signups - Admin' }

export default async function AdminBetaPage() {
  const signups = await getBetaSignups()
  const statusCounts = signups.reduce<Record<string, number>>((acc, signup) => {
    acc[signup.status] = (acc[signup.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Beta Signups</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage beta signup requests from the public /beta page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-3 py-1 text-xs font-medium text-amber-300">
          Pending - {statusCounts.pending ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-900 px-3 py-1 text-xs font-medium text-sky-300">
          Invited - {statusCounts.invited ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1 text-xs font-medium text-emerald-300">
          Onboarded - {statusCounts.onboarded ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900 px-3 py-1 text-xs font-medium text-red-300">
          Declined - {statusCounts.declined ?? 0}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
          Total - {signups.length}
        </span>
      </div>

      <BetaSignupsTable signups={signups} />
    </div>
  )
}

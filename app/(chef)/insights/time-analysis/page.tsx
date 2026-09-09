import type { Metadata } from 'next'
import { getAdminTimeThisWeek, getMonthlyAdminTimeSummary } from '@/lib/admin-time/actions'
import { requireChef } from '@/lib/auth/get-user'
import { getWorkLedger } from '@/lib/work-ledger/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminTimeLogForm } from './admin-time-log-form'
import { WorkLedgerClient } from './work-ledger-client'

export const metadata: Metadata = { title: 'Work Ledger' }

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h ${remainder ? `${remainder}m` : ''}`.trim() : `${remainder}m`
}

export default async function TimeAnalysisPage() {
  await requireChef()
  const today = new Date()
  const [thisWeek, thisMonth, ledger] = await Promise.all([
    getAdminTimeThisWeek(),
    getMonthlyAdminTimeSummary(today.getFullYear(), today.getMonth() + 1),
    getWorkLedger().catch(() => null),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Work Ledger</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-500">
          One evidence-backed timeline for active work, supervision, agent runtime, and staff time.
          Only approved human time enters economics.
        </p>
      </div>

      {ledger ? (
        <WorkLedgerClient ledger={ledger} />
      ) : (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle>Ledger database setup required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-400">
            The interface is ready, but the work-ledger migration has not been applied to this
            environment. Existing admin time remains available below.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-stone-500">Legacy admin · this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(thisWeek.totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-stone-500">Legacy admin · this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(thisMonth.totalMinutes)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compatibility admin log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-stone-500">
            Existing admin logs remain intact while they are projected into the canonical ledger
            without double counting.
          </p>
          <AdminTimeLogForm />
        </CardContent>
      </Card>
    </div>
  )
}

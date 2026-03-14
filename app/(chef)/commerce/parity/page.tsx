import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getCloverParityDashboard } from '@/lib/commerce/parity-dashboard'

export const metadata: Metadata = { title: 'Clover Parity Dashboard - ChefFlow' }

function progressBarClass(percent: number) {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-stone-500'
}

function mvpStatusBadgeClass(status: 'done' | 'inProgress' | 'notStarted' | 'unknown') {
  if (status === 'done') return 'bg-emerald-500/20 text-emerald-300 border-emerald-600/40'
  if (status === 'inProgress') return 'bg-amber-500/20 text-amber-300 border-amber-600/40'
  if (status === 'notStarted') return 'bg-stone-700/40 text-stone-300 border-stone-600/40'
  return 'bg-rose-500/20 text-rose-300 border-rose-600/40'
}

function mvpStatusLabel(status: 'done' | 'inProgress' | 'notStarted' | 'unknown') {
  if (status === 'done') return 'Done'
  if (status === 'inProgress') return 'In Progress'
  if (status === 'notStarted') return 'Not Started'
  return 'Unknown'
}

export default async function CommerceParityDashboardPage() {
  await requireChef()
  await requirePro('commerce')

  const dashboard = await getCloverParityDashboard()
  const mvpUnresolved = dashboard.mvp.items.filter((item) => item.status !== 'done')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Clover Parity Dashboard</h1>
          <p className="text-sm text-stone-400 mt-1">
            Weighted completion across Clover modules (`done=1.0`, `in-progress=0.5`).
          </p>
        </div>
        <Link href="/commerce">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Commerce
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">
              {dashboard.overall.completionPercent}%
            </p>
            <p className="text-xs text-stone-500 mt-1">Overall Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{dashboard.overall.done}</p>
            <p className="text-xs text-stone-500 mt-1">Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{dashboard.overall.inProgress}</p>
            <p className="text-xs text-stone-500 mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{dashboard.overall.total}</p>
            <p className="text-xs text-stone-500 mt-1">Total CLV Items</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MVP Contract Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-stone-300">
              Pilot segment:{' '}
              <span className="font-medium text-stone-100">
                {dashboard.mvp.targetSegment ?? 'not defined'}
              </span>
            </p>
            <Badge variant="default">{dashboard.mvp.completionPercent}% complete</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-xs text-stone-400">Done</p>
              <p className="text-lg font-semibold text-emerald-300">{dashboard.mvp.done}</p>
            </div>
            <div className="rounded border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-xs text-stone-400">In Progress</p>
              <p className="text-lg font-semibold text-amber-300">{dashboard.mvp.inProgress}</p>
            </div>
            <div className="rounded border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-xs text-stone-400">Not Started</p>
              <p className="text-lg font-semibold text-stone-200">{dashboard.mvp.notStarted}</p>
            </div>
            <div className="rounded border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-xs text-stone-400">Unknown</p>
              <p className="text-lg font-semibold text-rose-300">{dashboard.mvp.unknown}</p>
            </div>
            <div className="rounded border border-stone-800 bg-stone-900/40 p-3">
              <p className="text-xs text-stone-400">Total MVP IDs</p>
              <p className="text-lg font-semibold text-stone-100">{dashboard.mvp.total}</p>
            </div>
          </div>

          {mvpUnresolved.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-stone-300 font-medium">Unresolved MVP IDs</p>
              <div className="grid gap-2">
                {mvpUnresolved.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border border-stone-800 bg-stone-900/30 px-3 py-2"
                  >
                    <p className="text-sm text-stone-100 font-mono">{item.id}</p>
                    <Badge className={mvpStatusBadgeClass(item.status)}>
                      {mvpStatusLabel(item.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-300">
              All MVP contract IDs are marked done in the master plan.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.sections.map((section) => (
            <div
              key={section.sectionId}
              className="rounded-lg border border-stone-800 bg-stone-900/40 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-stone-100 font-medium">
                    {section.sectionId}) {section.title}
                  </p>
                  <p className="text-xs text-stone-500">
                    {section.done} done / {section.inProgress} in progress / {section.notStarted}{' '}
                    not started
                  </p>
                </div>
                <Badge variant="default">{section.completionPercent}%</Badge>
              </div>
              <div className="h-2 w-full rounded bg-stone-800 overflow-hidden">
                <div
                  className={`h-full ${progressBarClass(section.completionPercent)}`}
                  style={{ width: `${Math.min(100, Math.max(0, section.completionPercent))}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

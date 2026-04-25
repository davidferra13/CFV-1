import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listServiceDays } from '@/lib/service-days/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Service Log' }

function formatCents(cents: number | null): string {
  if (cents == null) return '-'
  return '$' + (cents / 100).toFixed(2)
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'closed':
      return 'default' as const
    case 'active':
      return 'success' as const
    case 'prep':
      return 'warning' as const
    default:
      return 'info' as const
  }
}

export default async function ServiceLogPage() {
  await requireChef()
  const days = await listServiceDays()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Service Log</h1>
          <p className="mt-1 text-sm text-stone-500">
            Daily service records. Plan, run, and close out each day.
          </p>
        </div>
        <Link
          href="/stations/service-log/new"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          New Service Day
        </Link>
      </div>

      {days.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No service days yet. Create your first one to start tracking daily operations.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Link key={day.service_day_id} href={`/stations/service-log/${day.service_day_id}`}>
              <Card className="hover:border-stone-600 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-stone-100">
                          {new Date(day.service_date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-stone-500 capitalize">{day.shift_label}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(day.status)}>{day.status}</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-stone-400">
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Covers</p>
                        <p>{day.actual_covers ?? day.expected_covers ?? '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Revenue</p>
                        <p>{formatCents(day.revenue_cents)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Food Cost</p>
                        <p>{formatCents(day.food_cost_cents)}</p>
                      </div>
                      {day.total_prep_items != null && day.total_prep_items > 0 && (
                        <div className="text-right">
                          <p className="text-stone-500 text-xs">Prep</p>
                          <p>
                            {day.completed_prep_items}/{day.total_prep_items}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Service Day Detail' }

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  planning: 'info',
  prep: 'warning',
  active: 'warning',
  closed: 'success',
}

export default async function ServiceDayDetailPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data: day, error } = await db
    .from('service_days')
    .select('*')
    .eq('id', params.id)
    .eq('chef_id', chefId)
    .single()

  if (error || !day) notFound()

  const dateStr = new Date(day.service_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/stations/service-log"
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Service Log
          </Link>
          <h1 className="text-2xl font-bold text-stone-50 mt-1">{dateStr}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={statusVariant[day.status] ?? 'default'}>{day.status}</Badge>
            <span className="text-sm text-stone-400">{day.shift_label}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/stations/service-log/${day.id}/prep`}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
          >
            Prep Sheet
          </Link>
          <Link
            href={`/stations/service-log/${day.id}/sales`}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
          >
            Log Sales
          </Link>
        </div>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-stone-500">Expected Covers</dt>
              <dd className="text-stone-100 font-medium">{day.expected_covers ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Actual Covers</dt>
              <dd className="text-stone-100 font-medium">{day.actual_covers ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Items Sold</dt>
              <dd className="text-stone-100 font-medium">{day.items_sold ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Items 86d</dt>
              <dd className="text-stone-100 font-medium">{day.items_86d ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Notes */}
      {day.notes && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-300 text-sm whitespace-pre-wrap">{day.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

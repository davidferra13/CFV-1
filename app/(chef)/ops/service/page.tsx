// Service Day Management - View and manage today's service, link menus,
// see sales breakdown, manage covers, and review service history.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getOrCreateToday,
  getServiceMenus,
  listServiceDays,
} from '@/lib/restaurant/service-day-actions'
import { getServiceDaySales } from '@/lib/restaurant/sales-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ServiceDayClient } from './_components/service-day-client'

export const metadata: Metadata = { title: 'Service Day' }

export default async function ServiceDayPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = await getOrCreateToday()
  const [menus, sales, recentDays] = await Promise.all([
    getServiceMenus(today.id),
    getServiceDaySales(today.id),
    listServiceDays({ limit: 14 }),
  ])

  // Get available menus for linking
  const { data: availableMenus } = await db
    .from('menus')
    .select('id, name, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'shared', 'locked'])
    .order('name')

  const linkedMenuIds = menus.map((m: any) => m.menu_id)

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Service Day</h1>
          <p className="text-sm text-stone-500">
            {new Date(today.service_date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            / {today.shift_label}
          </p>
        </div>
        <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Ops
        </Link>
      </div>

      <ServiceDayClient
        serviceDay={today}
        menus={menus}
        sales={sales}
        availableMenus={(availableMenus || []).filter((m: any) => !linkedMenuIds.includes(m.id))}
      />

      {/* Recent Service Days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentDays.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-stone-900/40"
              >
                <div>
                  <p className="text-sm text-stone-200">
                    {new Date(d.service_date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-stone-500">{d.shift_label}</p>
                </div>
                <div className="flex items-center gap-3">
                  {d.total_revenue_cents != null && (
                    <span className="text-sm text-stone-300 tabular-nums">
                      {formatCurrency(d.total_revenue_cents)}
                    </span>
                  )}
                  <span className="text-xs text-stone-500">
                    {d.actual_covers ?? d.expected_covers ?? '-'} covers
                  </span>
                  <Badge
                    variant={
                      d.status === 'closed' ? 'default' : d.status === 'active' ? 'success' : 'info'
                    }
                  >
                    {d.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

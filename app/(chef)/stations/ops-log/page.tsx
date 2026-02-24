// Operations Log Page
// Persistent, append-only log of every kitchen action: check-ins, check-outs,
// prep completions, stock updates, orders, deliveries, waste, 86s.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOpsLog } from '@/lib/stations/ops-log-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Operations Log — ChefFlow' }

const ACTION_LABELS: Record<string, string> = {
  check_in: 'Check In',
  check_out: 'Check Out',
  prep_complete: 'Prep Complete',
  stock_update: 'Stock Update',
  order_request: 'Order Request',
  delivery_received: 'Delivery',
  waste: 'Waste',
  eighty_six: '86',
}

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  check_in: 'success',
  check_out: 'default',
  prep_complete: 'success',
  stock_update: 'info' as any,
  order_request: 'warning',
  delivery_received: 'success',
  waste: 'error',
  eighty_six: 'error',
}

export default async function OpsLogPage() {
  await requireChef()

  const entries = await getOpsLog({ limit: 100 })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/stations" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Stations
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Operations Log</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every kitchen action logged permanently — who, when, what. This data is append-only and
          never deleted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Activity
            <Badge variant="default" className="ml-2">
              {entries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-stone-500">
              No operations logged yet. Activity will appear here as you use station clipboards.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={ACTION_COLORS[entry.action_type] ?? 'default'}>
                      {ACTION_LABELS[entry.action_type] ?? entry.action_type}
                    </Badge>
                    <span className="text-stone-200">
                      {typeof entry.details === 'object' && entry.details?.description
                        ? entry.details.description
                        : JSON.stringify(entry.details).substring(0, 80)}
                    </span>
                  </div>
                  <span className="text-stone-500 text-xs whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

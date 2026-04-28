// Daily Inventory View - Real-time inventory with par levels, deficits,
// expiry alerts, and depletion tracking for restaurant operations.
// Links: inventory_counts (par levels), inventory_batches (expiry),
// inventory_transactions (movement history).

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Inventory Status' }

interface InventoryItem {
  id: string
  ingredient_id: string | null
  ingredient_name: string
  current_qty: number
  par_level: number | null
  unit: string
  deficit: number
  deficit_pct: number
  status: 'ok' | 'low' | 'critical' | 'out'
}

interface ExpiryAlert {
  id: string
  ingredient_name: string
  remaining_qty: number
  unit: string
  expiry_date: string
  days_until: number
}

export default async function InventoryPage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Parallel fetch
  const [countsResult, batchesResult, recentTxResult] = await Promise.all([
    // All inventory counts
    db
      .from('inventory_counts')
      .select('id, ingredient_id, ingredient_name, current_qty, par_level, unit')
      .eq('chef_id', user.tenantId!)
      .order('ingredient_name'),

    // Batches expiring within 7 days
    db
      .from('inventory_batches')
      .select('id, ingredient_name, remaining_qty, unit, expiry_date')
      .eq('chef_id', user.tenantId!)
      .eq('is_depleted', false)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0])
      .order('expiry_date'),

    // Recent transactions (last 24h)
    db
      .from('inventory_transactions')
      .select('id, ingredient_name, quantity, unit, transaction_type, notes, created_at')
      .eq('chef_id', user.tenantId!)
      .gte('created_at', new Date(today.getTime() - 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const counts: InventoryItem[] = (countsResult.data || []).map((c: any) => {
    const deficit = c.par_level ? Math.max(0, c.par_level - (c.current_qty || 0)) : 0
    const deficitPct = c.par_level ? Math.round((1 - (c.current_qty || 0) / c.par_level) * 100) : 0
    let status: 'ok' | 'low' | 'critical' | 'out' = 'ok'
    if (c.current_qty <= 0) status = 'out'
    else if (c.par_level && c.current_qty < c.par_level * 0.25) status = 'critical'
    else if (c.par_level && c.current_qty < c.par_level * 0.5) status = 'low'

    return {
      id: c.id,
      ingredient_id: c.ingredient_id,
      ingredient_name: c.ingredient_name,
      current_qty: c.current_qty || 0,
      par_level: c.par_level,
      unit: c.unit,
      deficit,
      deficit_pct: deficitPct,
      status,
    }
  })

  const expiryAlerts: ExpiryAlert[] = (batchesResult.data || []).map((b: any) => {
    const expiry = new Date(b.expiry_date + 'T12:00:00')
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
    return {
      id: b.id,
      ingredient_name: b.ingredient_name,
      remaining_qty: b.remaining_qty,
      unit: b.unit,
      expiry_date: b.expiry_date,
      days_until: daysUntil,
    }
  })

  const recentTx = recentTxResult.data || []

  // Summary stats
  const totalItems = counts.length
  const itemsAtPar = counts.filter((c) => c.status === 'ok').length
  const itemsLow = counts.filter((c) => c.status === 'low').length
  const itemsCritical = counts.filter((c) => c.status === 'critical').length
  const itemsOut = counts.filter((c) => c.status === 'out').length
  const parCoverage =
    totalItems > 0 ? Math.round((counts.filter((c) => c.par_level).length / totalItems) * 100) : 0

  // Sort: critical/out first, then low, then ok
  const statusOrder = { out: 0, critical: 1, low: 2, ok: 3 }
  const sorted = [...counts].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  const txTypeLabels: Record<string, string> = {
    receive: 'Received',
    event_deduction: 'Event',
    sale_deduction: 'Sale',
    waste: 'Waste',
    manual_adjustment: 'Adjustment',
    staff_meal: 'Staff Meal',
    transfer_out: 'Transfer Out',
    transfer_in: 'Transfer In',
    audit_adjustment: 'Audit',
    return_from_event: 'Returned',
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Inventory Status</h1>
          <p className="text-sm text-stone-500">Real-time stock levels against par</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Full Inventory
          </Link>
          <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
            Back to Ops
          </Link>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Items" value={totalItems} />
        <SummaryCard label="At Par" value={itemsAtPar} color="emerald" />
        <SummaryCard label="Low" value={itemsLow} color="amber" />
        <SummaryCard label="Critical" value={itemsCritical} color="red" />
        <SummaryCard label="Out of Stock" value={itemsOut} color={itemsOut > 0 ? 'red' : 'stone'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Inventory Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stock Levels</CardTitle>
                <span className="text-xs text-stone-500">{parCoverage}% have par levels set</span>
              </div>
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <p className="text-sm text-stone-500 py-8 text-center">
                  No inventory tracked yet. Add items from{' '}
                  <Link href="/inventory" className="text-amber-400 hover:underline">
                    Inventory Hub
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-stone-500 uppercase border-b border-stone-800">
                    <div className="col-span-4">Ingredient</div>
                    <div className="col-span-2 text-right">On Hand</div>
                    <div className="col-span-2 text-right">Par Level</div>
                    <div className="col-span-2 text-right">Deficit</div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>

                  {sorted.map((item) => {
                    const barPct = item.par_level
                      ? Math.min(100, (item.current_qty / item.par_level) * 100)
                      : 100
                    const barColor =
                      item.status === 'ok'
                        ? 'bg-emerald-500'
                        : item.status === 'low'
                          ? 'bg-amber-500'
                          : 'bg-red-500'

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg hover:bg-stone-900/40 items-center"
                      >
                        <div className="col-span-4">
                          <p className="text-sm text-stone-200">{item.ingredient_name}</p>
                          {item.par_level && (
                            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full ${barColor} rounded-full`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-stone-300 tabular-nums">
                            {item.current_qty} {item.unit}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-stone-500 tabular-nums">
                            {item.par_level ?? '-'} {item.par_level ? item.unit : ''}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          {item.deficit > 0 ? (
                            <span className="text-sm text-red-400 tabular-nums">
                              {item.deficit}
                            </span>
                          ) : (
                            <span className="text-sm text-stone-600">-</span>
                          )}
                        </div>
                        <div className="col-span-2 text-center">
                          <Badge
                            variant={
                              item.status === 'ok'
                                ? 'success'
                                : item.status === 'low'
                                  ? 'warning'
                                  : 'error'
                            }
                          >
                            {item.status === 'ok' ? 'OK' : item.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expiry Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-400">Expiry Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {expiryAlerts.length === 0 ? (
                <p className="text-sm text-stone-500">No items expiring within 7 days.</p>
              ) : (
                <div className="space-y-2">
                  {expiryAlerts.map((a) => (
                    <div key={a.id} className="py-2 border-b border-stone-900 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-200">{a.ingredient_name}</span>
                        <Badge
                          variant={
                            a.days_until <= 1 ? 'error' : a.days_until <= 3 ? 'warning' : 'default'
                          }
                        >
                          {a.days_until <= 0 ? 'Expired' : `${a.days_until}d`}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {a.remaining_qty} {a.unit} remaining
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTx.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No inventory movements in the last 24 hours.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTx.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 text-sm">
                      <div>
                        <span className="text-stone-300">{tx.ingredient_name}</span>
                        <span className="text-stone-500 ml-1.5 text-xs">
                          {txTypeLabels[tx.transaction_type] || tx.transaction_type}
                        </span>
                      </div>
                      <span
                        className={`tabular-nums ${tx.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {tx.quantity > 0 ? '+' : ''}
                        {tx.quantity} {tx.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color = 'stone',
}: {
  label: string
  value: number
  color?: string
}) {
  const textColor =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'amber'
        ? 'text-amber-400'
        : color === 'red'
          ? 'text-red-400'
          : 'text-stone-100'
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-center">
      <p className="text-xs text-stone-500 uppercase">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${textColor}`}>{value}</p>
    </div>
  )
}

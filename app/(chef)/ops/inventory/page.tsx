// Daily Inventory View with confidence-aware inventory positions.
// Links: inventory_transactions, inventory_counts, and inventory_batches.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getPantryStockPositions } from '@/lib/inventory/pantry-engine-actions'

export const metadata: Metadata = { title: 'Inventory Status' }

interface InventoryItem {
  key: string
  ingredientName: string
  currentQty: number
  parLevel: number | null
  unit: string
  deficit: number
  deficitPct: number
  status: 'ok' | 'low' | 'critical' | 'out' | 'unknown'
  confidenceStatus: string
  confidenceLabel: string
  confidenceReason: string
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

  const [stockResult, batchesResult, recentTxResult] = await Promise.all([
    getPantryStockPositions()
      .then((data) => ({ data, error: null as Error | null }))
      .catch((error: Error) => ({ data: [] as any[], error })),
    db
      .from('inventory_batches')
      .select('id, ingredient_name, remaining_qty, unit, expiry_date')
      .eq('chef_id', user.tenantId!)
      .eq('is_depleted', false)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0])
      .order('expiry_date'),
    db
      .from('inventory_transactions')
      .select(
        'id, ingredient_name, quantity, unit, transaction_type, notes, created_at, confidence_status, review_status'
      )
      .eq('chef_id', user.tenantId!)
      .gte('created_at', new Date(today.getTime() - 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const inventoryError = stockResult.error || batchesResult.error || recentTxResult.error

  const counts: InventoryItem[] = (stockResult.data || []).map((position: any) => ({
    key: position.key,
    ingredientName: position.ingredientName,
    currentQty: position.currentQty,
    parLevel: position.parLevel,
    unit: position.unit,
    deficit: position.deficit,
    deficitPct: position.deficitPct,
    status: position.status,
    confidenceStatus: position.confidenceStatus,
    confidenceLabel: position.confidenceLabel,
    confidenceReason: position.confidenceReason,
  }))

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
  const itemsUnknown = counts.filter((c) => c.status === 'unknown').length
  const parCoverage =
    totalItems > 0 ? Math.round((counts.filter((c) => c.parLevel).length / totalItems) * 100) : 0

  const statusOrder = { unknown: 0, out: 1, critical: 2, low: 3, ok: 4 }
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
          <p className="text-sm text-stone-500">Computed stock with confidence and provenance</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
            Full Inventory
          </Link>
          <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
            Back to Ops
          </Link>
        </div>
      </div>

      {inventoryError && (
        <Card className="border-red-900/60 bg-red-950/20">
          <CardContent className="p-5">
            <h2 className="font-semibold text-red-100">Inventory status could not be verified</h2>
            <p className="mt-1 text-sm text-red-100/80">
              ChefFlow could not load every inventory evidence source. Do not rely on stock levels
              until this page refreshes successfully.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Items" value={totalItems} />
        <SummaryCard label="Confirmed OK" value={itemsAtPar} color="emerald" />
        <SummaryCard label="Low" value={itemsLow} color="amber" />
        <SummaryCard label="Critical" value={itemsCritical} color="red" />
        <SummaryCard
          label="Out/Unknown"
          value={itemsUnknown + itemsOut}
          color={itemsUnknown + itemsOut > 0 ? 'red' : 'stone'}
        />
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
                    <div className="col-span-2 text-center">Confidence</div>
                  </div>

                  {sorted.map((item) => {
                    const barPct = item.parLevel
                      ? Math.min(100, (item.currentQty / item.parLevel) * 100)
                      : 100
                    const barColor =
                      item.status === 'ok'
                        ? 'bg-emerald-500'
                        : item.status === 'low'
                          ? 'bg-amber-500'
                          : 'bg-red-500'

                    return (
                      <div
                        key={item.key}
                        className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg hover:bg-stone-900/40 items-center"
                      >
                        <div className="col-span-4">
                          <p className="text-sm text-stone-200">{item.ingredientName}</p>
                          <p className="text-xs text-stone-500">{item.confidenceReason}</p>
                          {item.parLevel && item.status !== 'unknown' && (
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
                            {item.status === 'unknown' ? 'Review' : item.currentQty}{' '}
                            {item.status === 'unknown' ? '' : item.unit}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-stone-500 tabular-nums">
                            {item.parLevel ?? '-'} {item.parLevel ? item.unit : ''}
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
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={confidenceVariant(item.confidenceStatus)}>
                              {item.confidenceLabel}
                            </Badge>
                            {item.status !== 'unknown' && item.status !== 'ok' && (
                              <span className="text-[11px] uppercase text-stone-500">
                                {item.status}
                              </span>
                            )}
                          </div>
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
                        {tx.review_status === 'pending_review' && (
                          <Badge variant="warning" className="ml-2">
                            Review
                          </Badge>
                        )}
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

function confidenceVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'confirmed') return 'success'
  if (status === 'likely') return 'info'
  if (status === 'estimated' || status === 'stale') return 'warning'
  if (status === 'conflict' || status === 'unknown') return 'error'
  return 'default'
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

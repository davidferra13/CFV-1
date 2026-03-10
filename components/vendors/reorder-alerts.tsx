'use client'

// Reorder Alerts - Shows items below par with urgency, grouped by vendor.
// Includes "Generate PO" button per vendor group.

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ReorderAlert } from '@/lib/vendors/reorder-actions'
import { generateReorderPO } from '@/lib/vendors/reorder-actions'

type VendorGroup = {
  vendorId: string | null
  vendorName: string
  items: ReorderAlert[]
}

function groupByVendor(alerts: ReorderAlert[]): VendorGroup[] {
  const groups = new Map<string, VendorGroup>()

  for (const alert of alerts) {
    const key = alert.preferredVendorId || '__none__'
    if (!groups.has(key)) {
      groups.set(key, {
        vendorId: alert.preferredVendorId,
        vendorName: alert.preferredVendorName || 'No Vendor Assigned',
        items: [],
      })
    }
    groups.get(key)!.items.push(alert)
  }

  // Sort: named vendors first, unassigned last
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.vendorId) return 1
    if (!b.vendorId) return -1
    return a.vendorName.localeCompare(b.vendorName)
  })
}

function urgencyColor(urgency: string): string {
  if (urgency === 'critical') return 'bg-red-500/10 border-red-500/30 text-red-400'
  return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
}

export function ReorderAlerts({ alerts }: { alerts: ReorderAlert[] }) {
  const [isPending, startTransition] = useTransition()
  const [createdPOs, setCreatedPOs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo(() => groupByVendor(alerts), [alerts])

  const criticalCount = alerts.filter((a) => a.urgency === 'critical').length
  const lowCount = alerts.filter((a) => a.urgency === 'low').length

  function handleGeneratePO(group: VendorGroup) {
    if (!group.vendorId) return
    const vendorId = group.vendorId

    const previous = [...createdPOs]
    setError(null)

    startTransition(async () => {
      try {
        const result = await generateReorderPO(
          vendorId,
          group.items.map((item) => ({
            ingredientName: item.ingredientName,
            qty: item.reorderQty ?? item.shortfall,
            unit: item.unit,
            estimatedPriceCents: item.lastPriceCents ?? undefined,
          }))
        )
        setCreatedPOs((prev) => [...prev, vendorId])
      } catch (err) {
        setCreatedPOs(previous)
        setError(err instanceof Error ? err.message : 'Failed to create PO')
      }
    })
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-3xl mb-3">+</div>
          <p className="text-stone-400 text-sm">
            All inventory items are at or above par level. Nothing to reorder.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-stone-500">Below Par</p>
          <p className="text-lg font-semibold text-stone-100">{alerts.length}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-red-400">Critical</p>
          <p className="text-lg font-semibold text-red-400">{criticalCount}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-amber-400">Low</p>
          <p className="text-lg font-semibold text-amber-400">{lowCount}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Vendor groups */}
      {groups.map((group) => {
        const alreadyCreated = group.vendorId ? createdPOs.includes(group.vendorId) : false

        return (
          <Card key={group.vendorId || '__none__'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {group.vendorName}
                  <Badge variant="default">{group.items.length} items</Badge>
                </CardTitle>
                {group.vendorId && !alreadyCreated && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGeneratePO(group)}
                    disabled={isPending}
                  >
                    {isPending ? 'Creating...' : 'Generate PO'}
                  </Button>
                )}
                {alreadyCreated && (
                  <Link href="/inventory/purchase-orders">
                    <Badge variant="success">PO Created - View</Badge>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-800">
                {group.items.map((item, idx) => (
                  <div
                    key={`${item.ingredientName}-${idx}`}
                    className="px-6 py-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-100 truncate">
                          {item.ingredientName}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${urgencyColor(item.urgency)}`}
                        >
                          {item.urgency === 'critical' ? 'Critical' : 'Low'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                        <span>
                          On hand:{' '}
                          <span
                            className={`font-medium ${item.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'}`}
                          >
                            {item.currentStock} {item.unit}
                          </span>
                        </span>
                        <span>
                          Par: {item.parLevel} {item.unit}
                        </span>
                        {item.lastPriceCents != null && (
                          <span>
                            Last price: ${(item.lastPriceCents / 100).toFixed(2)}
                            {item.lastPriceUnit ? `/${item.lastPriceUnit}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-red-400">
                        -{item.shortfall.toFixed(1)} {item.unit}
                      </p>
                      {item.reorderQty != null && (
                        <p className="text-xs text-stone-400">
                          Reorder: {item.reorderQty} {item.unit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Configure link */}
      <div className="text-center">
        <Link
          href="/inventory/reorder?tab=settings"
          className="text-sm text-brand-400 hover:text-brand-300"
        >
          Configure par levels and preferred vendors
        </Link>
      </div>
    </div>
  )
}

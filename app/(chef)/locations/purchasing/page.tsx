// Centralized Purchasing Dashboard
// Aggregate ingredient needs across all locations, create unified purchase orders.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { computeCrossLocationNeeds, listCentralizedPOs } from '@/lib/locations/purchasing-actions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Centralized Purchasing' }

const statusColors: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'info',
  ordered: 'warning',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
}

export default async function PurchasingPage() {
  await requireChef()
  const [needs, orders] = await Promise.all([computeCrossLocationNeeds(), listCentralizedPOs()])

  const totalNeededItems = needs.length
  const totalEstimatedCost = needs.reduce((sum, n) => {
    return sum + (n.estimatedUnitCostCents ?? 0) * n.totalNeeded
  }, 0)
  const activeOrders = orders.filter((o) => !['received', 'cancelled'].includes(o.status))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/locations" className="text-stone-500 hover:text-stone-300 text-sm">
              Locations
            </Link>
            <span className="text-stone-600">/</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">Centralized Purchasing</h1>
          <p className="text-sm text-stone-500">
            Cross-location ingredient needs and unified purchase orders
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Items Below Par</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">{totalNeededItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Est. Order Value</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {formatCurrency(totalEstimatedCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Active Orders</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase">Locations Covered</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {new Set(needs.flatMap((n) => n.locations.map((l) => l.locationId))).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Location Needs */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">
          Cross-Location Needs
          {needs.length > 0 && (
            <span className="text-sm font-normal text-stone-500 ml-2">Items below par level</span>
          )}
        </h2>
        {needs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-stone-400">All locations are at or above par levels.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left p-3 text-stone-400 font-medium">Ingredient</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Total Needed</th>
                      <th className="text-left p-3 text-stone-400 font-medium">Unit</th>
                      <th className="text-right p-3 text-stone-400 font-medium">Est. Cost</th>
                      <th className="text-left p-3 text-stone-400 font-medium">Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needs.slice(0, 50).map((need, i) => (
                      <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/50">
                        <td className="p-3 text-stone-200 font-medium">{need.ingredientName}</td>
                        <td className="p-3 text-right text-stone-300 font-mono">
                          {need.totalNeeded.toFixed(1)}
                        </td>
                        <td className="p-3 text-stone-400">{need.unit}</td>
                        <td className="p-3 text-right text-stone-300">
                          {need.estimatedUnitCostCents
                            ? formatCurrency(
                                Math.round(need.estimatedUnitCostCents * need.totalNeeded)
                              )
                            : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {need.locations.map((loc) => (
                              <span
                                key={loc.locationId}
                                className="inline-flex items-center gap-1 text-xs bg-stone-700/50 rounded px-1.5 py-0.5"
                                title={`Stock: ${loc.currentStock.toFixed(1)} / Par: ${loc.parLevel.toFixed(1)}`}
                              >
                                <span className="text-stone-300">{loc.locationName}</span>
                                <span className="text-red-400">-{loc.needed.toFixed(1)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Purchase Orders */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Purchase Orders</h2>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-stone-400">No centralized purchase orders yet.</p>
              <p className="text-sm text-stone-500 mt-1">
                Create a purchase order from the cross-location needs above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((po) => (
              <Card key={po.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-stone-200">{po.title}</h3>
                      <p className="text-sm text-stone-500">
                        {po.vendorName && `${po.vendorName} \u00b7 `}
                        {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                        {' \u00b7 '}
                        {po.orderDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[po.status] ?? 'default'}>
                        {po.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm font-semibold text-stone-200">
                        {formatCurrency(po.totalEstimatedCents)}
                      </span>
                    </div>
                  </div>

                  {/* Item breakdown by location */}
                  {po.items.length > 0 && po.items.length <= 8 && (
                    <div className="mt-3 pt-3 border-t border-stone-700/50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {po.items.map((item) => (
                          <div key={item.id} className="text-xs">
                            <span className="text-stone-300">{item.ingredientName}</span>
                            <span className="text-stone-500 ml-1">
                              {Number(item.totalQuantity).toFixed(1)} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const URGENCY_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  expired: 'error',
  critical: 'error',
  warning: 'warning',
  ok: 'success',
}

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = { initialAlerts: any[] }

export function ExpiryClient({ initialAlerts }: Props) {
  const expired = initialAlerts.filter((a) => a.urgency === 'expired')
  const critical = initialAlerts.filter((a) => a.urgency === 'critical')
  const warning = initialAlerts.filter((a) => a.urgency === 'warning')

  const totalAtRisk = initialAlerts.reduce((sum, a) => sum + (a.atRiskCostCents ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{initialAlerts.length}</p>
          <p className="text-xs text-stone-500">Total Alerts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{expired.length}</p>
          <p className="text-xs text-stone-500">Expired</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{critical.length + warning.length}</p>
          <p className="text-xs text-stone-500">Expiring Soon</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{formatCents(totalAtRisk)}</p>
          <p className="text-xs text-stone-500">At-Risk Value</p>
        </Card>
      </div>

      {/* Alert list */}
      {initialAlerts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 text-sm">
            No expiry alerts. All batches are well within their shelf life.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400">
                  <th className="text-left px-4 py-3 font-medium">Urgency</th>
                  <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                  <th className="text-left px-4 py-3 font-medium">Expiry Date</th>
                  <th className="text-right px-4 py-3 font-medium">Remaining</th>
                  <th className="text-left px-4 py-3 font-medium">Unit</th>
                  <th className="text-right px-4 py-3 font-medium">At-Risk Cost</th>
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                </tr>
              </thead>
              <tbody>
                {initialAlerts.map((alert: any, idx: number) => (
                  <tr
                    key={alert.batchId ?? idx}
                    className="border-b border-stone-800 hover:bg-stone-800/50"
                  >
                    <td className="px-4 py-3">
                      <Badge variant={URGENCY_COLORS[alert.urgency] ?? 'default'}>
                        {(alert.urgency ?? 'unknown').charAt(0).toUpperCase() +
                          (alert.urgency ?? 'unknown').slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-stone-100 font-medium">{alert.ingredientName}</td>
                    <td className="px-4 py-3 text-stone-300">
                      {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {Number(alert.remainingQty ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-stone-400">{alert.unit}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(alert.atRiskCostCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{alert.locationName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

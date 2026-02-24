'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateAuditItem, finalizeAudit } from '@/lib/inventory/audit-actions'

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  in_progress: 'info',
  pending_review: 'warning',
  finalized: 'success',
}

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type Props = { audit: any }

export function AuditDetailClient({ audit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [counts, setCounts] = useState<Record<string, string>>({})

  const items = audit.items || []
  const isFinalized = audit.status === 'finalized'

  function handleCountChange(itemId: string, value: string) {
    setCounts((prev) => ({ ...prev, [itemId]: value }))
  }

  function handleSaveCount(itemId: string) {
    const val = parseFloat(counts[itemId] || '0')
    startTransition(async () => {
      try {
        await updateAuditItem(itemId, { actualQty: val })
      } catch (err) {
        console.error('Failed to update count', err)
      }
    })
  }

  function handleFinalize() {
    if (!confirm('Finalize this audit? This will post adjustment transactions for all variances.'))
      return
    startTransition(async () => {
      try {
        await finalizeAudit(audit.id)
        window.location.reload()
      } catch (err) {
        console.error('Failed to finalize audit', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={STATUS_COLORS[audit.status] ?? 'default'}>
            {formatLabel(audit.status)}
          </Badge>
          <span className="text-sm text-stone-400">{formatLabel(audit.auditType)} Audit</span>
          {audit.auditDate && (
            <span className="text-sm text-stone-400">
              {new Date(audit.auditDate).toLocaleDateString()}
            </span>
          )}
          {audit.totalItemsCounted > 0 && (
            <span className="text-sm text-stone-400">
              {audit.totalItemsCounted} items | {audit.itemsWithVariance ?? 0} variances
            </span>
          )}
        </div>
        {audit.notes && <p className="text-sm text-stone-500 mt-2">{audit.notes}</p>}
      </Card>

      {/* Count sheet */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-700">
          <h3 className="font-semibold text-stone-100">Count Sheet</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Enter the actual quantity you physically count for each item.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400">
                <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                <th className="text-right px-4 py-3 font-medium">Expected</th>
                <th className="text-right px-4 py-3 font-medium">Actual</th>
                <th className="text-left px-4 py-3 font-medium">Unit</th>
                <th className="text-right px-4 py-3 font-medium">Variance</th>
                {!isFinalized && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isFinalized ? 5 : 6}
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    No items in this audit.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const variance = (item.actualQty ?? 0) - (item.expectedQty ?? 0)
                  return (
                    <tr key={item.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                      <td className="px-4 py-3 text-stone-100 font-medium">
                        {item.ingredientName}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-400">
                        {Number(item.expectedQty ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isFinalized ? (
                          <span className="text-stone-300">
                            {Number(item.actualQty ?? 0).toFixed(2)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={
                              counts[item.id] ??
                              (item.actualQty != null ? String(item.actualQty) : '')
                            }
                            onChange={(e) => handleCountChange(item.id, e.target.value)}
                            placeholder="Count..."
                            className="w-24 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm text-stone-200 text-right"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-400">{item.unit}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          variance > 0
                            ? 'text-green-400'
                            : variance < 0
                              ? 'text-red-400'
                              : 'text-stone-500'
                        }`}
                      >
                        {item.actualQty != null
                          ? (variance > 0 ? '+' : '') + variance.toFixed(2)
                          : '—'}
                      </td>
                      {!isFinalized && (
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveCount(item.id)}
                            loading={isPending}
                          >
                            Save
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!isFinalized && items.length > 0 && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleFinalize} loading={isPending}>
            Finalize Audit &amp; Post Adjustments
          </Button>
        </div>
      )}
    </div>
  )
}

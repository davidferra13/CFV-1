'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  previewEventDeduction,
  executeEventDeduction,
} from '@/lib/inventory/event-deduction-actions'

function formatCents(cents: number | null) {
  if (cents == null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  eventId: string
  eventStatus: string
}

export function EventInventoryPanel({ eventId, eventStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<any | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const [showDeductConfirm, setShowDeductConfirm] = useState(false)

  const canDeduct = ['confirmed', 'paid'].includes(eventStatus)
  const isActive = eventStatus === 'in_progress'
  const isComplete = eventStatus === 'completed'
  const shortfallCount =
    preview?.items?.filter((item: any) => (item.shortfallQty ?? 0) > 0).length ?? 0

  function handlePreview() {
    setError('')
    startTransition(async () => {
      try {
        const result = await previewEventDeduction(eventId)
        setPreview(result)
        setShowPreview(true)
      } catch (err: any) {
        setError(err?.message || 'Failed to preview deduction')
      }
    })
  }

  function handleDeduct() {
    setShowDeductConfirm(true)
  }

  function handleConfirmedDeduct() {
    setShowDeductConfirm(false)
    setError('')
    startTransition(async () => {
      try {
        await executeEventDeduction(eventId)
        setShowPreview(false)
        setPreview(null)
      } catch (err: any) {
        setError(err?.message || 'Failed to execute deduction')
      }
    })
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-100">Inventory</h3>
        <Badge
          variant={canDeduct ? 'warning' : isActive ? 'info' : isComplete ? 'success' : 'default'}
        >
          {canDeduct ? 'Pre-Event' : isActive ? 'Active' : isComplete ? 'Complete' : eventStatus}
        </Badge>
      </div>

      {canDeduct && (
        <div>
          <p className="text-sm text-stone-400 mb-2">
            Preview what ingredients will be deducted from your stock when this event starts.
          </p>
          <Button variant="secondary" size="sm" onClick={handlePreview} loading={isPending}>
            Preview Deduction
          </Button>
        </div>
      )}

      {isActive && (
        <p className="text-sm text-stone-400">
          Ingredients have been deducted for this event. Return any unused items after the event.
        </p>
      )}

      {isComplete && (
        <p className="text-sm text-stone-400">
          Event complete. Check the variance report in the Inventory section to see expected vs
          actual usage.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showPreview && preview && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-200">Deduction Preview</h4>
          {preview.items && preview.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-stone-400 border-b border-stone-700">
                      <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                      <th className="text-right px-3 py-2 font-medium">Required</th>
                      <th className="text-right px-3 py-2 font-medium">In Stock</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-stone-800">
                        <td className="px-3 py-2 text-stone-100">{item.ingredientName}</td>
                        <td className="px-3 py-2 text-right text-stone-300">
                          {Number(item.neededQty ?? 0).toFixed(2)} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right text-stone-300">
                          {Number(item.onHandQty ?? 0).toFixed(2)} {item.unit}
                        </td>
                        <td className="px-3 py-2">
                          {(item.onHandQty ?? 0) >= (item.neededQty ?? 0) ? (
                            <Badge variant="success">OK</Badge>
                          ) : (
                            <Badge variant="error">Short</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shortfallCount > 0 && (
                <p className="text-sm text-yellow-400">
                  {shortfallCount} ingredient{shortfallCount !== 1 ? 's' : ''} below required
                  levels.
                </p>
              )}
              <p className="text-sm text-stone-400">
                Estimated food cost: {formatCents(preview.totalCostCents)}
              </p>
              <Button variant="primary" size="sm" onClick={handleDeduct} loading={isPending}>
                Execute Deduction
              </Button>
            </>
          ) : (
            <p className="text-sm text-stone-500">
              No ingredients to deduct (no recipes linked to menu).
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        open={showDeductConfirm}
        title="Execute inventory deduction?"
        description="This will remove ingredients from stock for this event."
        confirmLabel="Execute Deduction"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmedDeduct}
        onCancel={() => setShowDeductConfirm(false)}
      />
    </Card>
  )
}

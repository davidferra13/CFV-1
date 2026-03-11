// Order Status Tracker - auto-refreshes status every 15 seconds
'use client'

import { useState, useEffect } from 'react'
import { getOrderStatus, type OrderStatusResult } from '@/lib/commerce/online-order-actions'

type Props = {
  orderId: string
  chefSlug: string
  initialStatus: OrderStatusResult
}

const STATUS_STEPS = [
  { key: 'received', label: 'Order Received', description: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', description: 'Your order is being prepared' },
  { key: 'ready', label: 'Ready', description: 'Your order is ready for pickup' },
  { key: 'picked_up', label: 'Picked Up', description: 'Order complete' },
]

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

export function OrderStatusTracker({ orderId, chefSlug, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [refreshing, setRefreshing] = useState(false)

  // Auto-refresh every 15 seconds if order is not complete
  useEffect(() => {
    if (status.status === 'picked_up' || status.status === 'cancelled') return

    const interval = setInterval(async () => {
      setRefreshing(true)
      try {
        const updated = await getOrderStatus(orderId)
        if (updated) setStatus(updated)
      } catch {
        // Silently fail refresh
      } finally {
        setRefreshing(false)
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [orderId, status.status])

  const currentStep = getStepIndex(status.status)
  const isCancelled = status.status === 'cancelled'

  return (
    <div className="space-y-6">
      {/* Status timeline */}
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-200 font-medium">Order Cancelled</p>
          <p className="text-red-500 text-sm mt-1">This order has been cancelled.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 p-6">
          <div className="space-y-0">
            {STATUS_STEPS.map((step, i) => {
              const isComplete = i < currentStep
              const isCurrent = i === currentStep
              const isPending = i > currentStep

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                            ? 'bg-orange-500 text-white animate-pulse'
                            : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {isComplete ? '\u2713' : i + 1}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${isComplete ? 'bg-green-300' : 'bg-stone-200'}`}
                      />
                    )}
                  </div>

                  {/* Step info */}
                  <div className="pb-6">
                    <p
                      className={`font-medium ${
                        isComplete || isCurrent ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {(isComplete || isCurrent) && (
                      <p className="text-sm text-stone-500">{step.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Estimated ready time */}
          {status.estimatedReadyAt && status.status !== 'picked_up' && (
            <div className="mt-4 pt-4 border-t border-stone-100 text-center">
              <p className="text-sm text-stone-500">Estimated ready time</p>
              <p className="text-lg font-bold text-stone-900">
                {new Date(status.estimatedReadyAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <h3 className="font-medium text-stone-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          {status.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-stone-200">
                {item.quantity}x {item.name}
              </span>
              <span className="text-stone-900 font-medium">
                ${(item.lineTotalCents / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-stone-900">
          <span>Total</span>
          <span>${(status.totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Refresh indicator */}
      {refreshing && <p className="text-center text-xs text-stone-400">Refreshing...</p>}
      {!isCancelled && status.status !== 'picked_up' && (
        <p className="text-center text-xs text-stone-400">
          Status updates automatically every 15 seconds
        </p>
      )}
    </div>
  )
}

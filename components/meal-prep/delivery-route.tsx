'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Bell,
  User,
  Phone,
} from '@/components/ui/icons'
import type { MealPrepDelivery } from '@/lib/meal-prep/delivery-actions'
import {
  markDelivered,
  markNoAnswer,
  startDeliveryRun,
  updateDeliveryOrder,
  notifyClientDelivery,
  updateDeliveryCounts,
} from '@/lib/meal-prep/delivery-actions'

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  scheduled: { label: 'Scheduled', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  no_answer: { label: 'No Answer', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

interface DeliveryRouteProps {
  deliveries: MealPrepDelivery[]
  deliveryDate: string
}

export function DeliveryRoute({ deliveries: initialDeliveries, deliveryDate }: DeliveryRouteProps) {
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length
  const totalStops = deliveries.length
  const totalMeals = deliveries.reduce((sum, d) => sum + d.meal_count, 0)
  const totalContainers = deliveries.reduce((sum, d) => sum + d.container_count, 0)
  const allScheduled = deliveries.every((d) => d.status === 'scheduled')
  const runStarted = deliveries.some((d) => d.status !== 'scheduled')

  function handleStartRun() {
    const previous = [...deliveries]
    setDeliveries((prev) =>
      prev.map((d) => (d.status === 'scheduled' ? { ...d, status: 'in_transit' as const } : d))
    )
    startTransition(async () => {
      try {
        const result = await startDeliveryRun(deliveryDate)
        if (result.error) {
          setDeliveries(previous)
        }
      } catch {
        setDeliveries(previous)
      }
    })
  }

  function handleMarkDelivered(id: string) {
    const previous = [...deliveries]
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: 'delivered' as const, actual_delivery_time: new Date().toISOString() }
          : d
      )
    )
    startTransition(async () => {
      try {
        const result = await markDelivered(id)
        if (result.error) {
          setDeliveries(previous)
        }
      } catch {
        setDeliveries(previous)
      }
    })
  }

  function handleMarkNoAnswer(id: string) {
    const previous = [...deliveries]
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: 'no_answer' as const, actual_delivery_time: new Date().toISOString() }
          : d
      )
    )
    startTransition(async () => {
      try {
        const result = await markNoAnswer(id)
        if (result.error) {
          setDeliveries(previous)
        }
      } catch {
        setDeliveries(previous)
      }
    })
  }

  function handleNotify(id: string) {
    startTransition(async () => {
      try {
        await notifyClientDelivery(id)
      } catch (err) {
        console.error('[delivery] notify failed:', err)
      }
    })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const updated = [...deliveries]
    const temp = updated[index - 1]
    updated[index - 1] = { ...updated[index], delivery_order: updated[index - 1].delivery_order }
    updated[index] = { ...temp, delivery_order: updated[index].delivery_order }
    setDeliveries(updated)
    startTransition(async () => {
      try {
        await updateDeliveryOrder(updated.map((d, i) => ({ id: d.id, order: i + 1 })))
      } catch {
        // Will revalidate on next load
      }
    })
  }

  function handleMoveDown(index: number) {
    if (index >= deliveries.length - 1) return
    const updated = [...deliveries]
    const temp = updated[index + 1]
    updated[index + 1] = { ...updated[index], delivery_order: updated[index + 1].delivery_order }
    updated[index] = { ...temp, delivery_order: updated[index].delivery_order }
    setDeliveries(updated)
    startTransition(async () => {
      try {
        await updateDeliveryOrder(updated.map((d, i) => ({ id: d.id, order: i + 1 })))
      } catch {
        // Will revalidate on next load
      }
    })
  }

  function handleCountChange(id: string, field: 'meal_count' | 'container_count', value: number) {
    const previous = [...deliveries]
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
    const delivery = deliveries.find((d) => d.id === id)
    if (!delivery) return
    const mealCount = field === 'meal_count' ? value : delivery.meal_count
    const containerCount = field === 'container_count' ? value : delivery.container_count
    startTransition(async () => {
      try {
        const result = await updateDeliveryCounts(id, mealCount, containerCount)
        if (result.error) {
          setDeliveries(previous)
        }
      } catch {
        setDeliveries(previous)
      }
    })
  }

  if (deliveries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Truck className="w-12 h-12 text-stone-600 mx-auto mb-3" />
        <p className="text-stone-400">No deliveries scheduled for this date.</p>
        <p className="text-sm text-stone-600 mt-1">
          Click "Generate Route" to create delivery stops from your active meal prep programs.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm text-stone-400">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {deliveredCount}/{totalStops} delivered
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {totalMeals} meals
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {totalContainers} containers
          </span>
        </div>
        {allScheduled && totalStops > 0 && (
          <Button variant="primary" size="sm" onClick={handleStartRun} disabled={pending}>
            <Truck className="w-4 h-4 mr-1" />
            Start Run
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-stone-800 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all"
          style={{ width: `${totalStops > 0 ? (deliveredCount / totalStops) * 100 : 0}%` }}
        />
      </div>

      {/* Delivery stops */}
      <div className="space-y-2">
        {deliveries.map((delivery, index) => {
          const isExpanded = expandedId === delivery.id
          const statusConfig = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.scheduled
          const canAct = delivery.status === 'in_transit' || delivery.status === 'scheduled'
          const timeWindow = delivery.program
            ? `${delivery.program.delivery_window_start} - ${delivery.program.delivery_window_end}`
            : delivery.scheduled_time || ''

          return (
            <Card key={delivery.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Order number */}
                <div className="flex flex-col items-center gap-1 min-w-[28px]">
                  <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-200">
                    {index + 1}
                  </div>
                  {!runStarted && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || pending}
                        className="text-stone-500 hover:text-stone-300 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === deliveries.length - 1 || pending}
                        className="text-stone-500 hover:text-stone-300 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-stone-500 shrink-0" />
                      <span className="font-medium text-stone-200 truncate">
                        {delivery.client?.full_name || 'Unknown'}
                      </span>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                      className="text-stone-500 hover:text-stone-300"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[250px]">{delivery.delivery_address}</span>
                    </span>
                    {timeWindow && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeWindow}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                    <span>{delivery.meal_count} meals</span>
                    <span>{delivery.container_count} containers</span>
                  </div>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-800 space-y-3">
                      {/* Contact info */}
                      {delivery.client?.phone && (
                        <div className="flex items-center gap-2 text-sm text-stone-400">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${delivery.client.phone}`} className="hover:text-stone-200">
                            {delivery.client.phone}
                          </a>
                        </div>
                      )}

                      {/* Delivery instructions */}
                      {delivery.delivery_instructions && (
                        <div className="text-sm">
                          <span className="text-stone-500 font-medium">Instructions: </span>
                          <span className="text-stone-400">{delivery.delivery_instructions}</span>
                        </div>
                      )}

                      {/* Delivery notes (post-delivery) */}
                      {delivery.delivery_notes && (
                        <div className="text-sm">
                          <span className="text-stone-500 font-medium">Notes: </span>
                          <span className="text-stone-400">{delivery.delivery_notes}</span>
                        </div>
                      )}

                      {/* Count editors */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-stone-400">
                          Meals:
                          <input
                            type="number"
                            min={0}
                            value={delivery.meal_count}
                            onChange={(e) =>
                              handleCountChange(
                                delivery.id,
                                'meal_count',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-400">
                          Containers:
                          <input
                            type="number"
                            min={0}
                            value={delivery.container_count}
                            onChange={(e) =>
                              handleCountChange(
                                delivery.id,
                                'container_count',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm"
                          />
                        </label>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {canAct && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleMarkDelivered(delivery.id)}
                              disabled={pending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Delivered
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleMarkNoAnswer(delivery.id)}
                              disabled={pending}
                            >
                              No Answer
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNotify(delivery.id)}
                          disabled={pending}
                        >
                          <Bell className="w-4 h-4 mr-1" />
                          Notify Client
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

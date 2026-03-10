'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Truck, Calendar, ArrowLeft, Printer, Package, MapPin } from '@/components/ui/icons'
import { DeliveryRoute } from '@/components/meal-prep/delivery-route'
import { DeliveryManifestView } from '@/components/meal-prep/delivery-manifest'
import { generateDeliveryRoute } from '@/lib/meal-prep/delivery-actions'
import type { MealPrepDelivery } from '@/lib/meal-prep/delivery-actions'
import type { DeliveryManifest } from '@/lib/meal-prep/manifest-actions'
import Link from 'next/link'

interface DeliveryRouteClientProps {
  deliveries: MealPrepDelivery[]
  deliveryDate: string
  manifest: DeliveryManifest | null
}

export function DeliveryRouteClient({
  deliveries,
  deliveryDate,
  manifest,
}: DeliveryRouteClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState<'route' | 'manifest'>('route')
  const [error, setError] = useState<string | null>(null)

  const formattedDate = new Date(deliveryDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value
    if (newDate) {
      router.push(`/meal-prep/delivery?date=${newDate}`)
    }
  }

  function handleGenerateRoute() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await generateDeliveryRoute(deliveryDate)
        if (result.error) {
          setError(result.error)
        } else {
          router.refresh()
        }
      } catch {
        setError('Failed to generate route. Please try again.')
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/meal-prep">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Delivery Route
            </h1>
            <p className="text-sm text-stone-500 mt-1">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-400">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={deliveryDate}
              onChange={handleDateChange}
              className="bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-200 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {deliveries.length === 0 && (
            <Button variant="primary" size="sm" onClick={handleGenerateRoute} disabled={pending}>
              <MapPin className="w-4 h-4 mr-1" />
              {pending ? 'Generating...' : 'Generate Route'}
            </Button>
          )}
          {deliveries.length > 0 && (
            <div className="flex items-center bg-stone-800 rounded-lg">
              <button
                onClick={() => setView('route')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  view === 'route'
                    ? 'bg-stone-700 text-stone-100'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Truck className="w-4 h-4 inline mr-1" />
                Route
              </button>
              <button
                onClick={() => setView('manifest')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  view === 'manifest'
                    ? 'bg-stone-700 text-stone-100'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Printer className="w-4 h-4 inline mr-1" />
                Manifest
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="p-3 border-red-800 bg-red-900/20">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Summary cards */}
      {deliveries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-100">{deliveries.length}</p>
            <p className="text-xs text-stone-500">Total Stops</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-100">
              {deliveries.reduce((s, d) => s + d.meal_count, 0)}
            </p>
            <p className="text-xs text-stone-500">Total Meals</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-100">
              {deliveries.reduce((s, d) => s + d.container_count, 0)}
            </p>
            <p className="text-xs text-stone-500">Total Containers</p>
          </Card>
        </div>
      )}

      {/* Route or Manifest view */}
      {view === 'route' ? (
        <DeliveryRoute deliveries={deliveries} deliveryDate={deliveryDate} />
      ) : manifest ? (
        <DeliveryManifestView manifest={manifest} />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-stone-400">No manifest data available for this date.</p>
        </Card>
      )}
    </div>
  )
}

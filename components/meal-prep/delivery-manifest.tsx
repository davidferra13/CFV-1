'use client'

import { Button } from '@/components/ui/button'
import { Printer } from '@/components/ui/icons'
import type { DeliveryManifest } from '@/lib/meal-prep/manifest-actions'

interface DeliveryManifestProps {
  manifest: DeliveryManifest
}

export function DeliveryManifestView({ manifest }: DeliveryManifestProps) {
  function handlePrint() {
    window.print()
  }

  const formattedDate = new Date(manifest.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      {/* Print button (hidden in print) */}
      <div className="print:hidden mb-4 flex justify-end">
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" />
          Print Manifest
        </Button>
      </div>

      {/* Printable manifest */}
      <div className="bg-white text-black p-8 rounded-lg print:rounded-none print:p-4 print:shadow-none shadow-lg">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">{manifest.chefName}</h1>
          <h2 className="text-lg font-semibold mt-1">Delivery Manifest</h2>
          <p className="text-gray-600 mt-1">{formattedDate}</p>
          <div className="flex gap-6 mt-3 text-sm">
            <span>
              <strong>{manifest.totalStops}</strong> stops
            </span>
            <span>
              <strong>{manifest.totalMeals}</strong> meals
            </span>
            <span>
              <strong>{manifest.totalContainers}</strong> containers
            </span>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-6">
          {manifest.stops.map((stop) => (
            <div
              key={stop.order}
              className="border border-gray-300 rounded-lg p-4 break-inside-avoid"
            >
              <div className="flex items-start gap-3">
                {/* Checkbox for driver */}
                <div className="mt-1">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded" />
                </div>

                {/* Stop info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                      Stop #{stop.order}: {stop.clientName}
                    </h3>
                    <span className="text-sm text-gray-500">{stop.deliveryWindow}</span>
                  </div>

                  <p className="text-sm text-gray-700 mt-1">{stop.address}</p>

                  {stop.phone && <p className="text-sm text-gray-600 mt-1">Phone: {stop.phone}</p>}

                  <div className="flex gap-6 mt-2 text-sm">
                    <span>
                      <strong>{stop.mealCount}</strong> meals
                    </span>
                    <span>
                      <strong>{stop.containerCount}</strong> containers
                    </span>
                  </div>

                  {stop.specialNotes && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm">
                      <strong>Notes:</strong> {stop.specialNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-black">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-gray-400 rounded" />
            <span className="font-semibold">All deliveries complete</span>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Driver signature</p>
              <div className="border-b border-gray-400 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <div className="border-b border-gray-400 h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

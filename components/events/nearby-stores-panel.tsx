'use client'

import { useState, useCallback } from 'react'
import { MapPin, ShoppingCart } from '@/components/ui/icons'
import {
  getNearbyStores,
  type NearbyStore,
  type NearbyStoresResult,
} from '@/lib/events/nearby-stores-actions'

export function NearbyStoresPanel({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<NearbyStoresResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const handleToggle = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next && !fetched) {
      setLoading(true)
      getNearbyStores(eventId)
        .then((data) => {
          setResult(data)
          setFetched(true)
        })
        .catch(() => {
          setResult({ stores: [], message: 'Failed to load nearby stores' })
        })
        .finally(() => setLoading(false))
    }
  }, [open, fetched, eventId])

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-stone-400" />
          <span className="text-sm font-semibold text-white">Nearby Stores</span>
          {result && result.stores.length > 0 && (
            <span className="rounded-full bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300">
              {result.stores.length}
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-stone-700 px-4 py-3">
          {loading && (
            <div className="flex items-center gap-2 py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-600 border-t-stone-300" />
              <span className="text-xs text-stone-400">Finding stores...</span>
            </div>
          )}

          {!loading && result?.message && (
            <div className="rounded-md bg-stone-800 px-3 py-2 text-xs text-stone-400">
              {result.message}
            </div>
          )}

          {!loading && result && result.stores.length > 0 && (
            <div className="space-y-2">
              {result.stores.map((store, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-stone-800/50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{store.name}</span>
                      {store.isOpen != null && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${store.isOpen ? 'bg-green-500' : 'bg-red-500'}`}
                          title={store.isOpen ? 'Open now' : 'Closed'}
                        />
                      )}
                    </div>
                    <span className="text-xs text-stone-400 truncate block">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {store.distanceMiles != null && (
                      <span className="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300">
                        {store.distanceMiles} mi
                      </span>
                    )}
                    <a
                      href={store.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded bg-stone-700 px-2 py-1 text-xs text-blue-400 hover:bg-stone-600"
                    >
                      <MapPin size={12} />
                      Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

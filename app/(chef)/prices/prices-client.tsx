'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store } from '@/components/ui/icons'
import {
  getNearbyStores,
  type ChainInfo,
  type StoreWithDistance,
} from '@/lib/openclaw/store-catalog-actions'

// Common NE zip-to-lat/lng lookup (approximate centers)
const ZIP_COORDS: Record<string, [number, number]> = {
  '01835': [42.776, -71.077], // Haverhill
  '01915': [42.558, -70.88], // Beverly
  '01950': [42.812, -70.877], // Newburyport
  '01960': [42.525, -70.895], // Peabody
  '02101': [42.361, -71.057], // Boston
  '02138': [42.38, -71.129], // Cambridge
  '03801': [43.071, -70.762], // Portsmouth NH
  '04101': [43.661, -70.255], // Portland ME
}

function estimateCoords(zip: string): [number, number] | null {
  if (ZIP_COORDS[zip]) return ZIP_COORDS[zip]
  // Fallback: try 3-digit prefix match for rough area
  const prefix = zip.substring(0, 3)
  const match = Object.entries(ZIP_COORDS).find(([z]) => z.startsWith(prefix))
  if (match) return match[1]
  return null
}

function freshnessIndicator(lastSeen: string | null) {
  if (!lastSeen) return <span className="inline-block h-2 w-2 rounded-full bg-stone-600" />
  const hours = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60)
  if (hours < 24)
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Updated within 24h" />
    )
  if (hours < 168)
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-yellow-500"
        title="Updated within 7 days"
      />
    )
  return (
    <span className="inline-block h-2 w-2 rounded-full bg-stone-600" title="Older than 7 days" />
  )
}

type Props = {
  chains: ChainInfo[]
  hasData: boolean
}

export function PricesCatalogClient({ chains, hasData }: Props) {
  const [zip, setZip] = useState('')
  const [stores, setStores] = useState<StoreWithDistance[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSearch = () => {
    if (!zip || zip.length < 5) return
    setError(null)
    setSearched(true)

    const coords = estimateCoords(zip)
    if (!coords) {
      setError(`Could not determine location for zip code ${zip}. Try a New England zip code.`)
      setStores([])
      return
    }

    startTransition(async () => {
      try {
        const result = await getNearbyStores(coords[0], coords[1], 25)
        setStores(result)
      } catch {
        setError('Could not load nearby stores. Try again later.')
        setStores([])
      }
    })
  }

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="h-12 w-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-300">Store catalog is being built</h3>
          <p className="text-stone-500 mt-2 max-w-md mx-auto">
            The store data pipeline is still building coverage. Once the first sync completes,
            nearby stores and their inventories will appear here.
          </p>
          {chains.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-stone-500 mb-2">{chains.length} chains configured:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {chains.map((c) => (
                  <Badge key={c.slug} variant="default">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Zip search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Enter zip code (e.g., 01835)"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button onClick={handleSearch} disabled={pending || zip.length < 5}>
              {pending ? 'Searching...' : 'Find Stores'}
            </Button>
            {searched && stores.length > 0 && (
              <span className="text-xs text-stone-500">
                {stores.length} store{stores.length !== 1 ? 's' : ''} within 25 miles
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty search state */}
      {!searched && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-10 w-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400">
              Enter your zip code to find nearby stores and browse their inventory.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {searched && !pending && stores.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-400">
              No stores found within 25 miles of {zip}. Try a different zip code.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Store cards */}
      {stores.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Link key={store.id} href={`/prices/store/${store.id}`}>
              <Card className="hover:border-brand-700 transition-colors cursor-pointer h-full">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-stone-200">{store.name}</p>
                      <p className="text-xs text-stone-500">{store.chainName}</p>
                    </div>
                    {store.distanceMiles != null && (
                      <Badge variant="default">{store.distanceMiles} mi</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    {store.city}, {store.state} {store.zip}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-800">
                    <span className="text-xs text-stone-500">
                      {store.productCount.toLocaleString()} products
                    </span>
                    <div className="flex items-center gap-1.5">
                      {freshnessIndicator(store.lastCatalogedAt)}
                      <span className="text-xs text-stone-600">
                        {store.lastCatalogedAt
                          ? new Date(store.lastCatalogedAt).toLocaleDateString()
                          : 'Not cataloged'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

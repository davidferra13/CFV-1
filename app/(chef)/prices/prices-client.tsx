'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store } from '@/components/ui/icons'
import {
  getNearbyStoresByZip,
  type ChainInfo,
  type StoreWithDistance,
} from '@/lib/openclaw/store-catalog-actions'

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
  const [resolvedFrom, setResolvedFrom] = useState<'store_zip' | 'zip_centroid' | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSearch = () => {
    if (!zip || zip.length < 5) return
    setError(null)
    setSearched(true)
    setResolvedFrom(null)

    startTransition(async () => {
      try {
        const result = await getNearbyStoresByZip(zip, 25)
        setResolvedFrom(result.resolvedFrom)
        setStores(result.stores)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load nearby stores. Try again later.'
        )
        setStores([])
      }
    })
  }

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="h-12 w-12 text-stone-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-300">
            Store coverage is still in progress
          </h3>
          <p className="text-stone-500 mt-2 max-w-md mx-auto">
            Nearby store search will appear here as local coverage lands in the synced market
            mirror.
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
              placeholder="Enter ZIP code (e.g., 10001)"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-500 w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button onClick={handleSearch} disabled={pending || zip.length < 5}>
              {pending ? 'Searching...' : 'Find Stores'}
            </Button>
            {searched && stores.length > 0 && (
              <div className="text-xs text-stone-500">
                <span>
                  {stores.length} store{stores.length !== 1 ? 's' : ''} within 25 miles
                </span>
                {resolvedFrom === 'zip_centroid' && (
                  <span className="ml-2">resolved from ZIP centroid</span>
                )}
              </div>
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
              No stores found within 25 miles of {zip}. Coverage may not be nearby yet.
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

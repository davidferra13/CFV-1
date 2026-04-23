'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Star, Loader2, RefreshCw, Unlink } from '@/components/ui/icons'
import { NEUTRAL_LOCATION_TAG_PLACEHOLDER } from '@/lib/site/national-brand-copy'

type YelpBusiness = {
  id: string
  name: string
  location: { display_address: string[] }
  rating: number
  review_count: number
  url: string
}

export function YelpSettings({
  initialBusinessId,
  initialBusinessName,
  initialReviewCount,
}: {
  initialBusinessId: string | null
  initialBusinessName: string | null
  initialReviewCount: number
}) {
  const [businessId, setBusinessId] = useState(initialBusinessId)
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [reviewCount, setReviewCount] = useState(initialReviewCount)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchResults, setSearchResults] = useState<YelpBusiness[]>([])
  const [showSearch, setShowSearch] = useState(!initialBusinessId)

  function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error('Enter your business name')
      return
    }

    startTransition(async () => {
      try {
        const { searchYelpBusinessAction } = await import('@/lib/integrations/yelp/yelp-actions')
        const results = await searchYelpBusinessAction(
          searchQuery.trim(),
          searchLocation.trim() || undefined
        )
        setSearchResults(results)
        if (results.length === 0) {
          toast.error('No businesses found. Try a different name or location.')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Search failed')
      }
    })
  }

  function handleConnect(business: YelpBusiness) {
    startTransition(async () => {
      try {
        const { saveYelpBusinessId } = await import('@/lib/integrations/yelp/yelp-actions')
        await saveYelpBusinessId(business.id, business.name)
        setBusinessId(business.id)
        setBusinessName(business.name)
        setShowSearch(false)
        setSearchResults([])
        toast.success(`Connected to ${business.name} on Yelp`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect')
      }
    })
  }

  function handleDisconnect() {
    const prevId = businessId
    const prevName = businessName
    setBusinessId(null)
    setBusinessName(null)

    startTransition(async () => {
      try {
        const { removeYelpBusinessId } = await import('@/lib/integrations/yelp/yelp-actions')
        await removeYelpBusinessId()
        toast.success('Yelp disconnected')
        setShowSearch(true)
      } catch {
        setBusinessId(prevId)
        setBusinessName(prevName)
        toast.error('Failed to disconnect')
      }
    })
  }

  function handleSync() {
    if (!businessId) return

    startTransition(async () => {
      try {
        const { syncYelpReviewsAction } = await import('@/lib/integrations/yelp/yelp-actions')
        const result = await syncYelpReviewsAction(businessId)
        setReviewCount((prev) => prev + (result?.newCount ?? 0))
        toast.success(
          result?.newCount
            ? `Synced ${result.newCount} new review${result.newCount > 1 ? 's' : ''}`
            : 'Reviews are up to date'
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Sync failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-brand-400" />
            <CardTitle>Yelp Reviews</CardTitle>
          </div>
          <Badge variant={businessId ? 'success' : 'default'}>
            {businessId ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-400">
          Connect your Yelp business listing to automatically pull reviews into ChefFlow. Reviews
          appear alongside Google and internal reviews in your unified review dashboard.
        </p>

        {businessId && businessName && (
          <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-100">{businessName}</p>
                <p className="text-xs text-stone-500">
                  {reviewCount} review{reviewCount !== 1 ? 's' : ''} synced
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSync} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  className="text-stone-500 hover:text-red-400"
                >
                  <Unlink className="h-3.5 w-3.5 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSearch && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400 mb-1 block">
                  Business Name
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Your business name"
                  className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400 mb-1 block">
                  Location (city, state)
                </label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={NEUTRAL_LOCATION_TAG_PLACEHOLDER}
                  className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
                />
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handleSearch} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1" />
              )}
              Search Yelp
            </Button>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-stone-400">Select your business:</p>
                {searchResults.map((biz) => (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => handleConnect(biz)}
                    disabled={isPending}
                    className="w-full text-left rounded-lg border border-stone-700 p-3 hover:bg-stone-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-stone-100">{biz.name}</p>
                        <p className="text-xs text-stone-500">
                          {biz.location.display_address.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm text-stone-300">{biz.rating}</span>
                        </div>
                        <p className="text-xs text-stone-500">{biz.review_count} reviews</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!showSearch && !businessId && (
          <Button variant="primary" size="sm" onClick={() => setShowSearch(true)}>
            <Search className="h-3.5 w-3.5 mr-1" />
            Connect Yelp Business
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

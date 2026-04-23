'use client'

import { useState, useMemo } from 'react'
import { Search, Star, MapPin, Clock } from '@/components/ui/icons'
import type { CatalogStore } from '@/lib/openclaw/catalog-actions'
import type { PreferredStore } from '@/lib/grocery/store-shopping-actions'
import { canonicalizeStoreName } from '@/lib/openclaw/catalog-store-selection'

// Store branding - consistent colors for known chains
const STORE_BRANDING: Record<string, { color: string; initials: string }> = {
  'whole foods': { color: '#00674b', initials: 'WF' },
  'market basket': { color: '#e31837', initials: 'MB' },
  walmart: { color: '#0071dc', initials: 'W' },
  target: { color: '#cc0000', initials: 'T' },
  hannaford: { color: '#e21836', initials: 'H' },
  'stop & shop': { color: '#e31837', initials: 'S&S' },
  "shaw's": { color: '#e4002b', initials: 'S' },
  costco: { color: '#e31837', initials: 'C' },
  "bj's": { color: '#00529b', initials: 'BJ' },
  aldi: { color: '#00005f', initials: 'A' },
  'trader joe': { color: '#ba2225', initials: 'TJ' },
}

// Canonicalize store names: strip "(via X)", map slug forms to display names
function cleanStoreName(name: string): string {
  return canonicalizeStoreName(name)
}

function getStoreBrand(name: string) {
  const lower = cleanStoreName(name).toLowerCase()
  for (const [key, val] of Object.entries(STORE_BRANDING)) {
    if (lower.includes(key)) return val
  }
  return { color: '#6b7280', initials: cleanStoreName(name).charAt(0).toUpperCase() }
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface CatalogStorePickerProps {
  stores: CatalogStore[]
  preferredStoreNames: string[]
  onSelectStore: (storeId: string, storeName: string) => void
  onBrowseAll: () => void
  isLoading?: boolean
}

export function CatalogStorePicker({
  stores,
  preferredStoreNames,
  onSelectStore,
  onBrowseAll,
  isLoading,
}: CatalogStorePickerProps) {
  const [search, setSearch] = useState('')

  const preferredSet = useMemo(
    () => new Set(preferredStoreNames.map((n) => n.toLowerCase())),
    [preferredStoreNames]
  )

  // Deduplicate stores by clean name (merge "ALDI (via Flipp)" + "Aldi (via Instacart)" into one card)
  const activeStores = useMemo(() => {
    const active = stores.filter((s) => s.status === 'active')
    const seen = new Map<string, CatalogStore & { _sourceIds: string[] }>()
    for (const s of active) {
      const key = cleanStoreName(s.name).toLowerCase()
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, { ...s, _sourceIds: [s.id] })
      } else {
        // Merge: keep whichever has more data (logo, city), collect all source IDs
        existing._sourceIds.push(s.id)
        if (!existing.logoUrl && s.logoUrl) existing.logoUrl = s.logoUrl
        if (!existing.city && s.city) {
          existing.city = s.city
          existing.state = s.state
        }
      }
    }
    return Array.from(seen.values())
  }, [stores])

  const filteredStores = useMemo(() => {
    if (!search) return activeStores
    const q = search.toLowerCase()
    return activeStores.filter(
      (s) =>
        cleanStoreName(s.name).toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.state && s.state.toLowerCase().includes(q))
    )
  }, [activeStores, search])

  const myStores = useMemo(
    () => filteredStores.filter((s) => preferredSet.has(cleanStoreName(s.name).toLowerCase())),
    [filteredStores, preferredSet]
  )

  const otherStores = useMemo(
    () => filteredStores.filter((s) => !preferredSet.has(cleanStoreName(s.name).toLowerCase())),
    [filteredStores, preferredSet]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-stone-800 bg-stone-900/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search + Browse All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <button
          onClick={onBrowseAll}
          className="px-4 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors whitespace-nowrap"
        >
          Browse All Stores
        </button>
      </div>

      {/* My Stores */}
      {myStores.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            My Stores
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {myStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                displayName={cleanStoreName(store.name)}
                isPreferred
                onClick={() => {
                  const displayName = cleanStoreName(store.name)
                  onSelectStore(displayName, displayName)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other stores: only show when searching (don't dump hundreds of stores) */}
      <div>
        {search ? (
          <>
            {otherStores.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Search Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {otherStores.slice(0, 12).map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      displayName={cleanStoreName(store.name)}
                      onClick={() => {
                        const displayName = cleanStoreName(store.name)
                        onSelectStore(displayName, displayName)
                      }}
                    />
                  ))}
                </div>
                {otherStores.length > 12 && (
                  <p className="text-xs text-stone-500 mt-2 text-center">
                    {otherStores.length - 12} more stores match. Narrow your search to find a
                    specific store.
                  </p>
                )}
              </>
            )}
            {filteredStores.length === 0 && (
              <div className="text-center py-8 text-stone-500 text-sm">
                No stores matching &ldquo;{search}&rdquo;
              </div>
            )}
          </>
        ) : myStores.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm">
            <p>Search for a store above, or browse all stores.</p>
            <p className="mt-1 text-xs text-stone-600">
              {activeStores.length.toLocaleString()} stores available
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StoreCard({
  store,
  displayName,
  isPreferred,
  onClick,
}: {
  store: CatalogStore
  displayName: string
  isPreferred?: boolean
  onClick: () => void
}) {
  const brand = getStoreBrand(displayName)

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-3 p-4 rounded-xl border transition-all text-left ${
        isPreferred
          ? 'border-amber-800/50 bg-amber-950/20 hover:border-amber-700/60 hover:bg-amber-950/30'
          : 'border-stone-800 bg-stone-900/50 hover:border-stone-600 hover:bg-stone-800/50'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 w-full">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoUrl}
            alt={displayName}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: brand.color }}
          >
            {brand.initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-100 truncate">{displayName}</h4>
          {store.city && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <MapPin className="w-3 h-3" />
              {[store.city, store.state].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Tier badge (subtle) */}
      {store.tier === 'wholesale' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/30">
          Wholesale
        </span>
      )}
    </button>
  )
}

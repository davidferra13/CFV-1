'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import {
  searchCatalogV2,
  getCatalogStores,
  getCatalogCategories,
} from '@/lib/openclaw/catalog-actions'
import type { CatalogItemV2, CatalogStore } from '@/lib/openclaw/catalog-actions'
import { ProductCard } from './product-card'

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
}

function getStoreBrand(name: string) {
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(STORE_BRANDING)) {
    if (lower.includes(key)) return val
  }
  return { color: '#6b7280', initials: name.charAt(0).toUpperCase() }
}

interface StoreAisleBrowserProps {
  onAddToCart?: (item: CatalogItemV2) => void
  cartItemIds?: Set<string>
  onItemExpand?: (item: CatalogItemV2) => void
}

export function StoreAisleBrowser({
  onAddToCart,
  cartItemIds,
  onItemExpand,
}: StoreAisleBrowserProps) {
  const [stores, setStores] = useState<CatalogStore[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<CatalogItemV2[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [sort, setSort] = useState<string>('name')
  const [region, setRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cf-region') || 'haverhill-ma'
    }
    return 'haverhill-ma'
  })
  const observerRef = useRef<HTMLDivElement>(null)

  // Load stores and categories on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const [storeData, catData] = await Promise.all([getCatalogStores(), getCatalogCategories()])
        setStores(storeData.filter((s) => s.status === 'active'))
        setCategories(catData.filter((c) => c && c !== 'uncategorized' && c !== 'suggested'))
      } catch (err) {
        console.error('[store-aisle] Failed to load stores/categories:', err)
      }
    })
  }, [])

  // Filter stores by region
  const regionStores = stores.filter((s) => {
    if (!region) return true
    if (s.region) return s.region === region
    // Fallback: match by city/state keywords
    const id = s.id.toLowerCase()
    if (region === 'haverhill-ma') {
      return (
        id.includes('haverhill') ||
        id.includes('methuen') ||
        id.includes('merrimack') ||
        !id.includes('portland')
      )
    }
    if (region === 'portland-me') {
      return id.includes('portland')
    }
    return true
  })

  // Load items when store/category/search/sort changes
  const loadItems = useCallback(
    async (append = false) => {
      if (append) setIsLoadingMore(true)
      startTransition(async () => {
        try {
          const result = await searchCatalogV2({
            search: search || undefined,
            category: selectedCategory || undefined,
            store: selectedStore || undefined,
            pricedOnly: true,
            sort,
            limit: 48,
            after: append ? nextCursor : undefined,
          })
          if (append) {
            setItems((prev) => [...prev, ...result.items])
          } else {
            setItems(result.items)
          }
          setTotal(result.total)
          setHasMore(result.hasMore)
          setNextCursor(result.nextCursor)
        } catch (err) {
          console.error('[store-aisle] Failed to load items:', err)
          if (!append) {
            setItems([])
            setTotal(0)
          }
        } finally {
          setIsLoadingMore(false)
        }
      })
    },
    [search, selectedCategory, selectedStore, sort, nextCursor]
  )

  useEffect(() => {
    loadItems(false)
  }, [search, selectedCategory, selectedStore, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || isPending || isLoadingMore) return
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isPending && !isLoadingMore) {
          loadItems(true)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isPending, isLoadingMore, loadItems])

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cf-region', newRegion)
    }
    setSelectedStore('')
  }

  return (
    <div className="space-y-4">
      {/* Header: Region + Store selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300"
        >
          <option value="haverhill-ma">Haverhill / Merrimack Valley, MA</option>
          <option value="portland-me">Portland, ME</option>
          <option value="">All Regions</option>
        </select>

        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300"
        >
          <option value="">All Stores ({regionStores.length})</option>
          {regionStores.map((s) => {
            const brand = getStoreBrand(s.name)
            return (
              <option key={s.id} value={s.name}>
                {s.name}
                {s.city ? ` - ${s.city}` : ''}
              </option>
            )
          })}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-300"
        >
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price (low)</option>
          <option value="stores">Sort: Most Stores</option>
          <option value="updated">Sort: Recently Updated</option>
        </select>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-500"
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedCategory
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              selectedCategory === cat
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>{total.toLocaleString()} items</span>
        {selectedStore && <span>at {selectedStore}</span>}
        {selectedCategory && <span>in {selectedCategory}</span>}
        {isPending && <span className="text-amber-500">Loading...</span>}
      </div>

      {/* Product grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onAddToCart={onAddToCart}
              onExpand={onItemExpand}
              isInCart={cartItemIds?.has(item.id)}
            />
          ))}
        </div>
      ) : !isPending ? (
        <div className="text-center py-12 text-stone-500">
          {search
            ? `No items found for "${search}"${selectedStore ? ` at ${selectedStore}` : ''}. Try a different search or store.`
            : selectedStore
              ? 'No catalog data for this store yet. Coverage for this store is still in progress.'
              : 'Select a store or search to browse the catalog.'}
        </div>
      ) : (
        /* Skeleton grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-stone-800 bg-stone-900/50 overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-stone-800" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-stone-800 rounded w-2/3" />
                <div className="h-4 bg-stone-800 rounded w-full" />
                <div className="h-5 bg-stone-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerRef} className="flex justify-center py-4">
          {isLoadingMore && <span className="text-xs text-stone-500">Loading more...</span>}
        </div>
      )}
    </div>
  )
}

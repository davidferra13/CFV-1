'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import {
  searchCatalogV2,
  getCatalogDetail,
  getCatalogCategories,
  getCatalogStores,
  addCatalogIngredientToLibrary,
  type CatalogItemV2,
  type CatalogDetailResult,
  type CatalogDetailPrice,
} from '@/lib/openclaw/catalog-actions'
import { getPriceHistory } from '@/lib/openclaw/price-intelligence-actions'
import { StockBadge } from '@/components/pricing/stock-badge'
import { FreshnessDot } from '@/components/pricing/freshness-dot'
import { PriceSparkline } from '@/components/pricing/price-sparkline'
import { formatCurrency } from '@/lib/utils/currency'
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Filter,
  Store,
  ArrowUpDown,
  Plus,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import type { PriceHistoryPoint } from '@/lib/openclaw/price-intelligence-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function confidenceBadge(confidence: string) {
  const c = confidence.toLowerCase()
  let bg = 'bg-stone-700 text-stone-300'
  if (c === 'exact_receipt' || c === 'direct_scrape') bg = 'bg-emerald-900/60 text-emerald-300'
  else if (c === 'instacart_adjusted' || c === 'instacart_catalog')
    bg = 'bg-blue-900/60 text-blue-300'
  else if (c === 'flyer_scrape') bg = 'bg-amber-900/60 text-amber-300'
  else if (c === 'government_baseline') bg = 'bg-stone-800 text-stone-400'

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${bg}`}>
      {confidence.replace(/_/g, ' ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogBrowser() {
  // Data
  const [items, setItems] = useState<CatalogItemV2[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  // Filters
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [stores, setStores] = useState<
    { id: string; name: string; tier: string; status: string }[]
  >([])
  const [category, setCategory] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [tier, setTier] = useState<string | null>(null)
  const [sort, setSort] = useState<'name' | 'price' | 'stores' | 'updated'>('name')
  const [pricedOnly, setPricedOnly] = useState(false)

  // Expansion / detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<CatalogDetailResult | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([])

  // UI state
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addingId, setAddingId] = useState<string | null>(null)

  // Dropdowns
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  const [storeSearch, setStoreSearch] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null)
  const storeDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch categories and stores on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getCatalogCategories()
      .then(setCategories)
      .catch(() => {})
    getCatalogStores()
      .then(setStores)
      .catch(() => {})
  }, [])

  // ---------------------------------------------------------------------------
  // Search with debounce
  // ---------------------------------------------------------------------------
  const doSearch = useCallback(
    (resetItems: boolean, cursor?: string) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const params = {
        search: search || undefined,
        category: category || undefined,
        store: selectedStore || undefined,
        pricedOnly: pricedOnly || undefined,
        inStockOnly: inStockOnly || undefined,
        tier: tier || undefined,
        sort,
        limit: 50,
        // For sorts other than 'name', skip cursor pagination
        after: sort === 'name' ? cursor : undefined,
      }

      const action = async () => {
        try {
          const result = await searchCatalogV2(params)
          if (controller.signal.aborted) return

          if (resetItems) {
            setItems(result.items)
          } else {
            setItems((prev) => [...prev, ...result.items])
          }
          setTotal(result.total)
          setHasMore(result.hasMore)
          setNextCursor(result.nextCursor)
          setError(null)
        } catch (err) {
          if (controller.signal.aborted) return
          setError('Failed to load catalog. Check that the Pi is reachable.')
        }
      }

      if (resetItems) {
        startTransition(action)
      } else {
        setIsLoadingMore(true)
        action().finally(() => setIsLoadingMore(false))
      }
    },
    [search, category, selectedStore, pricedOnly, inStockOnly, tier, sort]
  )

  // Trigger search on filter changes (debounced for search input)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setExpandedId(null)
      setExpandedDetail(null)
      setPriceHistory([])
      doSearch(true)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, category, selectedStore, pricedOnly, inStockOnly, tier, sort, doSearch])

  // ---------------------------------------------------------------------------
  // Infinite scroll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isPending) {
          doSearch(false, nextCursor)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, isPending, nextCursor, doSearch])

  // ---------------------------------------------------------------------------
  // Outside-click handlers for dropdowns
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setShowStoreDropdown(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ---------------------------------------------------------------------------
  // Expand row / detail
  // ---------------------------------------------------------------------------
  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        setExpandedDetail(null)
        setPriceHistory([])
        return
      }

      setExpandedId(id)
      setExpandedDetail(null)
      setPriceHistory([])

      try {
        const [detail, history] = await Promise.all([getCatalogDetail(id), getPriceHistory(id)])
        setExpandedDetail(detail)
        setPriceHistory(history.daily || [])
      } catch {
        setExpandedDetail(null)
      }
    },
    [expandedId]
  )

  // ---------------------------------------------------------------------------
  // Add to pantry
  // ---------------------------------------------------------------------------
  const handleAddToPantry = useCallback(async (item: CatalogItemV2) => {
    setAddingId(item.id)
    try {
      const result = await addCatalogIngredientToLibrary({
        name: item.name,
        category: item.category,
        defaultUnit: item.standardUnit || item.bestPriceUnit || 'lb',
        priceCents: item.bestPriceCents ?? undefined,
        priceStore: item.bestPriceStore ?? undefined,
      })
      if (result.success) {
        setAddedIds((prev) => new Set(prev).add(item.id))
      } else {
        // Already exists counts as success for UI
        if (result.error === 'Already in your library') {
          setAddedIds((prev) => new Set(prev).add(item.id))
        }
      }
    } catch {
      // Silent - non-blocking
    } finally {
      setAddingId(null)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Clear all filters
  // ---------------------------------------------------------------------------
  const clearAllFilters = useCallback(() => {
    setSearch('')
    setCategory(null)
    setSelectedStore(null)
    setInStockOnly(false)
    setTier(null)
    setSort('name')
    setPricedOnly(false)
  }, [])

  const hasActiveFilters =
    search || category || selectedStore || inStockOnly || tier || pricedOnly || sort !== 'name'

  // Filtered lists for searchable dropdowns
  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(storeSearch.toLowerCase())
  )
  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  )

  // Active filter pills
  const activeFilters: { label: string; onClear: () => void }[] = []
  if (search) activeFilters.push({ label: `Search: "${search}"`, onClear: () => setSearch('') })
  if (category)
    activeFilters.push({ label: `Category: ${category}`, onClear: () => setCategory(null) })
  if (selectedStore) {
    const storeName = stores.find((s) => s.id === selectedStore)?.name || selectedStore
    activeFilters.push({ label: `Store: ${storeName}`, onClear: () => setSelectedStore(null) })
  }
  if (inStockOnly)
    activeFilters.push({ label: 'In Stock Only', onClear: () => setInStockOnly(false) })
  if (tier) activeFilters.push({ label: `Tier: ${tier}`, onClear: () => setTier(null) })
  if (pricedOnly) activeFilters.push({ label: 'Priced Only', onClear: () => setPricedOnly(false) })
  if (sort !== 'name')
    activeFilters.push({ label: `Sort: ${sort}`, onClear: () => setSort('name') })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* ---- Filter Bar ---- */}
      <div className="bg-stone-900 rounded-lg border border-stone-800 p-3 space-y-3">
        {/* Row 1: search + dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown)
                setShowStoreDropdown(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 hover:bg-stone-700"
            >
              <Filter className="w-3.5 h-3.5" />
              {category || 'Category'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute z-40 mt-1 w-64 bg-stone-800 border border-stone-700 rounded-md shadow-xl overflow-hidden">
                <div className="p-2 border-b border-stone-700">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full px-2 py-1 text-sm bg-stone-900 border border-stone-600 rounded text-stone-100 placeholder:text-stone-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setCategory(null)
                      setShowCategoryDropdown(false)
                      setCategorySearch('')
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-stone-700 ${!category ? 'text-brand-400' : 'text-stone-300'}`}
                  >
                    All Categories
                  </button>
                  {filteredCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(c)
                        setShowCategoryDropdown(false)
                        setCategorySearch('')
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm capitalize hover:bg-stone-700 ${category === c ? 'text-brand-400' : 'text-stone-300'}`}
                    >
                      {c}
                    </button>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div className="px-3 py-2 text-xs text-stone-500">No categories match</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Store dropdown */}
          <div className="relative" ref={storeDropdownRef}>
            <button
              onClick={() => {
                setShowStoreDropdown(!showStoreDropdown)
                setShowCategoryDropdown(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 hover:bg-stone-700"
            >
              <Store className="w-3.5 h-3.5" />
              {selectedStore
                ? stores.find((s) => s.id === selectedStore)?.name || 'Store'
                : 'Store'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showStoreDropdown && (
              <div className="absolute z-40 mt-1 w-64 bg-stone-800 border border-stone-700 rounded-md shadow-xl overflow-hidden">
                <div className="p-2 border-b border-stone-700">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search stores..."
                    className="w-full px-2 py-1 text-sm bg-stone-900 border border-stone-600 rounded text-stone-100 placeholder:text-stone-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedStore(null)
                      setShowStoreDropdown(false)
                      setStoreSearch('')
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-stone-700 ${!selectedStore ? 'text-brand-400' : 'text-stone-300'}`}
                  >
                    All Stores
                  </button>
                  {filteredStores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStore(s.id)
                        setShowStoreDropdown(false)
                        setStoreSearch('')
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-stone-700 ${selectedStore === s.id ? 'text-brand-400' : 'text-stone-300'}`}
                    >
                      <span>{s.name}</span>
                      <span className="ml-2 text-xs text-stone-500 capitalize">{s.tier}</span>
                    </button>
                  ))}
                  {filteredStores.length === 0 && (
                    <div className="px-3 py-2 text-xs text-stone-500">No stores match</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* In-stock toggle */}
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`px-3 py-1.5 text-sm border rounded-md ${
              inStockOnly
                ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            In Stock
          </button>

          {/* Tier dropdown */}
          <select
            value={tier || ''}
            onChange={(e) => setTier(e.target.value || null)}
            className="px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="">All Tiers</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="px-2 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stores">Stores</option>
              <option value="updated">Updated</option>
            </select>
          </div>

          {/* Priced only */}
          <button
            onClick={() => setPricedOnly(!pricedOnly)}
            className={`px-3 py-1.5 text-sm border rounded-md ${
              pricedOnly
                ? 'bg-blue-900/40 border-blue-700 text-blue-300'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            Priced
          </button>
        </div>

        {/* Row 2: result count + clear */}
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            {isPending
              ? 'Searching...'
              : `${total.toLocaleString()} ingredient${total !== 1 ? 's' : ''}`}
            {items.length > 0 && items.length < total && ` (showing ${items.length})`}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-stone-400 hover:text-stone-200 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-stone-800 border border-stone-700 rounded-full text-stone-300"
              >
                {f.label}
                <button onClick={f.onClear} className="text-stone-500 hover:text-stone-200">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ---- Loading skeleton (initial) ---- */}
      {isPending && items.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-stone-900 rounded-lg border border-stone-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!isPending && !error && items.length === 0 && (
        <div className="bg-stone-900 rounded-lg border border-stone-800 p-8 text-center">
          <Search className="w-8 h-8 text-stone-600 mx-auto mb-2" />
          <p className="text-sm text-stone-400">No ingredients found</p>
          <p className="text-xs text-stone-500 mt-1">Try adjusting your filters or search term</p>
        </div>
      )}

      {/* ---- Desktop table ---- */}
      {items.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-right px-4 py-2 font-medium">Best Price</th>
                  <th className="text-left px-4 py-2 font-medium">Stock</th>
                  <th className="text-center px-4 py-2 font-medium">Stores</th>
                  <th className="text-left px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <DesktopRow
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    expandedDetail={expandedId === item.id ? expandedDetail : null}
                    priceHistory={expandedId === item.id ? priceHistory : []}
                    onToggle={() => toggleExpand(item.id)}
                    onAddToPantry={() => handleAddToPantry(item)}
                    isAdded={addedIds.has(item.id)}
                    isAdding={addingId === item.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <MobileCard
                key={item.id}
                item={item}
                isExpanded={expandedId === item.id}
                expandedDetail={expandedId === item.id ? expandedDetail : null}
                priceHistory={expandedId === item.id ? priceHistory : []}
                onToggle={() => toggleExpand(item.id)}
                onAddToPantry={() => handleAddToPantry(item)}
                isAdded={addedIds.has(item.id)}
                isAdding={addingId === item.id}
              />
            ))}
          </div>
        </>
      )}

      {/* ---- Infinite scroll sentinel ---- */}
      <div ref={sentinelRef} className="h-1" />

      {/* ---- Loading more indicator ---- */}
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 py-4 text-stone-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading more...
        </div>
      )}

      {/* ---- Pending overlay on filter change ---- */}
      {isPending && items.length > 0 && (
        <div className="fixed inset-0 bg-black/10 pointer-events-none z-10" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop Table Row
// ---------------------------------------------------------------------------

function DesktopRow({
  item,
  isExpanded,
  expandedDetail,
  priceHistory,
  onToggle,
  onAddToPantry,
  isAdded,
  isAdding,
}: {
  item: CatalogItemV2
  isExpanded: boolean
  expandedDetail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  onToggle: () => void
  onAddToPantry: () => void
  isAdded: boolean
  isAdding: boolean
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-stone-800/50 hover:bg-stone-800/50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
            )}
            <span className="text-stone-100 font-medium">{item.name}</span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
            {item.category}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          {item.bestPriceCents != null ? (
            <span className="text-stone-100">
              {formatCurrency(item.bestPriceCents)}
              <span className="text-stone-500 text-xs ml-1">/{item.bestPriceUnit || 'ea'}</span>
            </span>
          ) : (
            <span className="text-stone-600">-</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <StockBadge inStockCount={item.inStockCount} outOfStockCount={item.outOfStockCount} />
        </td>
        <td className="px-4 py-2.5 text-center text-stone-300">{item.priceCount}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <FreshnessDot date={item.lastUpdated} />
            <span className="text-xs text-stone-400">{relativeTime(item.lastUpdated)}</span>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-stone-950/60">
            <ExpandedDetail
              detail={expandedDetail}
              priceHistory={priceHistory}
              item={item}
              onAddToPantry={onAddToPantry}
              isAdded={isAdded}
              isAdding={isAdding}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function MobileCard({
  item,
  isExpanded,
  expandedDetail,
  priceHistory,
  onToggle,
  onAddToPantry,
  isAdded,
  isAdding,
}: {
  item: CatalogItemV2
  isExpanded: boolean
  expandedDetail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  onToggle: () => void
  onAddToPantry: () => void
  isAdded: boolean
  isAdding: boolean
}) {
  return (
    <div className="bg-stone-900 rounded-lg border border-stone-800">
      <button onClick={onToggle} className="w-full text-left p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              )}
              <span className="text-stone-100 font-medium text-sm truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-5">
              <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
                {item.category}
              </span>
              <StockBadge
                inStockCount={item.inStockCount}
                outOfStockCount={item.outOfStockCount}
                compact
              />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {item.bestPriceCents != null ? (
              <div>
                <span className="text-stone-100 text-sm font-medium">
                  {formatCurrency(item.bestPriceCents)}
                </span>
                <span className="text-stone-500 text-xs ml-0.5">/{item.bestPriceUnit || 'ea'}</span>
              </div>
            ) : (
              <span className="text-stone-600 text-sm">-</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between ml-5 text-xs text-stone-500">
          <span>
            {item.priceCount} store{item.priceCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <FreshnessDot date={item.lastUpdated} />
            <span>{relativeTime(item.lastUpdated)}</span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-stone-800 p-3">
          <ExpandedDetail
            detail={expandedDetail}
            priceHistory={priceHistory}
            item={item}
            onAddToPantry={onAddToPantry}
            isAdded={isAdded}
            isAdding={isAdding}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expanded Detail (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function ExpandedDetail({
  detail,
  priceHistory,
  item,
  onAddToPantry,
  isAdded,
  isAdding,
}: {
  detail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  item: CatalogItemV2
  onAddToPantry: () => void
  isAdded: boolean
  isAdding: boolean
}) {
  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading price details...
      </div>
    )
  }

  const { prices, summary } = detail

  return (
    <div className="space-y-4">
      {/* Summary row + sparkline */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-xs text-stone-400">
          {summary.storeCount} store{summary.storeCount !== 1 ? 's' : ''} carrying this item
        </div>
        {summary.cheapestCents != null && (
          <div className="text-xs text-stone-400">
            Best:{' '}
            <span className="text-emerald-400 font-medium">
              {formatCurrency(summary.cheapestCents)}
            </span>
            {summary.cheapestStore && (
              <span className="text-stone-500 ml-1">at {summary.cheapestStore}</span>
            )}
          </div>
        )}
        {summary.avgCents != null && (
          <div className="text-xs text-stone-400">
            Avg: <span className="text-stone-200">{formatCurrency(summary.avgCents)}</span>
          </div>
        )}
        {priceHistory.length >= 2 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500">90d trend:</span>
            <PriceSparkline data={priceHistory} width={80} height={24} />
          </div>
        )}
      </div>

      {/* Per-store price table */}
      {prices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-800">
                <th className="text-left py-1.5 pr-3 font-medium">Store</th>
                <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Location</th>
                <th className="text-right py-1.5 pr-3 font-medium">Price</th>
                <th className="text-left py-1.5 pr-3 font-medium">Stock</th>
                <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left py-1.5 pr-3 font-medium hidden lg:table-cell">
                  Confidence
                </th>
                <th className="text-left py-1.5 pr-3 font-medium hidden lg:table-cell">
                  Freshness
                </th>
                <th className="text-right py-1.5 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p: CatalogDetailPrice, idx: number) => {
                const link = p.sourceUrl || p.storeWebsite || null
                return (
                  <tr key={idx} className="border-b border-stone-800/30 hover:bg-stone-800/30">
                    <td className="py-1.5 pr-3 text-stone-200">{p.store}</td>
                    <td className="py-1.5 pr-3 text-stone-400 hidden sm:table-cell">
                      {[p.storeCity, p.storeState].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-stone-100 font-medium">
                      {formatCurrency(p.priceCents)}
                      <span className="text-stone-500 ml-0.5">/{p.priceUnit || 'ea'}</span>
                    </td>
                    <td className="py-1.5 pr-3">
                      {p.inStock ? (
                        <span className="text-emerald-400">In Stock</span>
                      ) : (
                        <span className="text-red-400">Out</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-stone-400 capitalize hidden sm:table-cell">
                      {p.priceType?.replace(/_/g, ' ') || '-'}
                    </td>
                    <td className="py-1.5 pr-3 hidden lg:table-cell">
                      {confidenceBadge(p.confidence)}
                    </td>
                    <td className="py-1.5 pr-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <FreshnessDot date={p.lastConfirmedAt} />
                        <span className="text-stone-400">{relativeTime(p.lastConfirmedAt)}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {prices.length === 0 && (
        <div className="text-xs text-stone-500 py-2">No per-store price data available</div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddToPantry()
          }}
          disabled={isAdded || isAdding}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            isAdded
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300 cursor-default'
              : isAdding
                ? 'bg-stone-800 border border-stone-700 text-stone-400 cursor-wait'
                : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {isAdded ? 'Added to Pantry' : isAdding ? 'Adding...' : 'Add to My Pantry'}
        </button>
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 border border-stone-700 text-stone-500 rounded-md cursor-not-allowed"
          title="Coming soon"
        >
          Watch Price
        </button>
      </div>
    </div>
  )
}

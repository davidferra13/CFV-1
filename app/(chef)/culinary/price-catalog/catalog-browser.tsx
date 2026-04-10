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
  type CatalogStore,
} from '@/lib/openclaw/catalog-actions'
import { getPriceHistory } from '@/lib/openclaw/price-intelligence-actions'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'
import { classifyFromCatalogDetail, classifyFromItemData } from '@/lib/pricing/sourceability'
import { AvailabilityBadge, AvailabilityDetail } from '@/components/pricing/availability-badge'
import { StockBadge } from '@/components/pricing/stock-badge'
import { FreshnessDot } from '@/components/pricing/freshness-dot'
import { ImageWithFallback } from '@/components/pricing/image-with-fallback'
import { PriceSparkline } from '@/components/pricing/price-sparkline'
import { ProductCard } from '@/components/pricing/product-card'
import { StoreAisleBrowser } from '@/components/pricing/store-aisle-browser'
import { ShoppingCartSidebar } from '@/components/pricing/shopping-cart-sidebar'
import { CartSummaryBar } from '@/components/pricing/cart-summary-bar'
import { CatalogStorePicker } from '@/components/pricing/catalog-store-picker'
import { getCarts, getCartWithItems, createCart, addToCart } from '@/lib/openclaw/cart-actions'
import { formatCurrency } from '@/lib/utils/currency'
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Plus,
  ExternalLink,
  Loader2,
  LayoutGrid,
  List,
  ShoppingBag,
  ArrowLeft,
  Check,
  Tag,
  Info,
} from 'lucide-react'
import type { PriceHistoryPoint } from '@/lib/openclaw/price-intelligence-actions'

type ViewMode = 'table' | 'grid' | 'store-aisle'
type CatalogView = 'store-picker' | 'browsing'

// ---------------------------------------------------------------------------
// Confidence display (chef-friendly)
// ---------------------------------------------------------------------------

function ConfidenceIcon({ confidence }: { confidence: string }) {
  const c = confidence.toLowerCase()
  let icon: React.ReactNode
  let label: string
  let colorClass: string

  if (c === 'exact_receipt' || c === 'receipt') {
    label = 'Verified price'
    colorClass = 'text-emerald-400'
    icon = <Check className="w-3 h-3" />
  } else if (c === 'direct_scrape' || c === 'store_api') {
    label = 'Current price'
    colorClass = 'text-blue-400'
    icon = <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
  } else if (c === 'instacart_adjusted' || c === 'instacart_catalog') {
    label = 'Estimated price'
    colorClass = 'text-amber-400'
    icon = <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
  } else if (c === 'flyer_scrape' || c === 'flyer') {
    label = 'Sale price'
    colorClass = 'text-rose-400'
    icon = <Tag className="w-3 h-3" />
  } else {
    label = 'Average price'
    colorClass = 'text-stone-400'
    icon = <span className="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block" />
  }

  return (
    <span className={`inline-flex items-center gap-1 ${colorClass}`} title={label}>
      {icon}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Web Sourcing Panel
// Shown when a catalog search returns zero results. When BRAVE_SEARCH_API_KEY
// is set, fetches live product pages from trusted specialty retailers.
// Falls back to static deep-link buttons when the key is absent.
// ---------------------------------------------------------------------------

import { searchIngredientOnline, type SourcingResult } from '@/lib/pricing/web-sourcing-actions'

const STATIC_RETAILERS = [
  {
    name: 'Eataly',
    url: (q: string) => `https://www.eataly.com/us_en/search?q=${encodeURIComponent(q)}`,
    note: 'Italian specialty',
  },
  {
    name: 'Whole Foods',
    url: (q: string) => `https://www.wholefoodsmarket.com/search?q=${encodeURIComponent(q)}`,
    note: 'Specialty produce',
  },
  {
    name: 'Instacart',
    url: (q: string) =>
      `https://www.instacart.com/store/items/item_page?q=${encodeURIComponent(q)}`,
    note: 'Same-day delivery',
  },
  {
    name: 'Formaggio Kitchen',
    url: (q: string) => `https://www.formaggiokitchen.com/search?q=${encodeURIComponent(q)}`,
    note: 'Gourmet specialty',
  },
  {
    name: 'Amazon Fresh',
    url: (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&rh=n%3A16310101`,
    note: 'National delivery',
  },
]

function WebSourcingPanel({ query }: { query: string }) {
  const [liveResults, setLiveResults] = useState<SourcingResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) return
    let cancelled = false
    setIsSearching(true)
    setLiveResults(null)

    searchIngredientOnline(query)
      .then((res) => {
        if (cancelled) return
        if (res.source === 'live') {
          setLiveResults(res.results)
        } else {
          setLiveResults([])
        }
      })
      .catch(() => {
        if (!cancelled) setLiveResults([])
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="bg-stone-900 rounded-lg border border-stone-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          Not in catalog - sourcing search
        </p>
        {isSearching && <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin" />}
      </div>

      {/* Live results from Brave Search */}
      {liveResults && liveResults.length > 0 && (
        <div className="space-y-2 mb-3">
          {liveResults.map((result) => (
            <a
              key={result.url}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between px-3 py-2.5 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-stone-600 transition-colors group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-brand-400">{result.retailer}</span>
                </div>
                <p className="text-sm text-stone-200 group-hover:text-white truncate">
                  {result.title}
                </p>
                {result.description && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{result.description}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0 mt-1" />
            </a>
          ))}
        </div>
      )}

      {/* Static fallback - shown while searching or when live search unavailable */}
      {(!liveResults || liveResults.length === 0) && !isSearching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {STATIC_RETAILERS.map((retailer) => (
            <a
              key={retailer.name}
              href={retailer.url(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-stone-600 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-stone-200 group-hover:text-white">
                  {retailer.name}
                </p>
                <p className="text-xs text-stone-500">{retailer.note}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-600">
        Searching for: <span className="text-stone-400 italic">{query}</span>
      </p>
    </div>
  )
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogBrowser() {
  // View state
  const [catalogView, setCatalogView] = useState<CatalogView>('store-picker')
  const [activeStoreName, setActiveStoreName] = useState<string | null>(null)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  // Data
  const [items, setItems] = useState<CatalogItemV2[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  // Filters
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [allStores, setAllStores] = useState<CatalogStore[]>([])
  const [preferredStoreNames, setPreferredStoreNames] = useState<string[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<'name' | 'price' | 'stores' | 'updated'>('name')
  const [onSaleOnly, setOnSaleOnly] = useState(false)

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
  const [storesLoading, setStoresLoading] = useState(true)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Cart state
  const [cartOpen, setCartOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [cartTotalCents, setCartTotalCents] = useState(0)
  const [activeCartId, setActiveCartId] = useState<string | null>(null)
  const [cartItemIds, setCartItemIds] = useState<Set<string>>(new Set())

  // Dropdowns
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch categories, stores, and preferred stores on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setStoresLoading(true)
    Promise.all([
      getCatalogCategories().catch(() => []),
      getCatalogStores().catch(() => []),
      getPreferredStores().catch(() => []),
    ]).then(([cats, stores, preferred]) => {
      setCategories(cats.filter((c: string) => c && c !== 'uncategorized' && c !== 'suggested'))
      setAllStores(stores)
      setPreferredStoreNames(preferred.map((p: { store_name: string }) => p.store_name))
      setStoresLoading(false)
    })
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
        pricedOnly: true,
        inStockOnly: inStockOnly || undefined,
        sort,
        limit: 50,
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
          setError('Live catalog search is unavailable right now. Try again shortly.')
        }
      }

      if (resetItems) {
        startTransition(action)
      } else {
        setIsLoadingMore(true)
        action().finally(() => setIsLoadingMore(false))
      }
    },
    [search, category, selectedStore, inStockOnly, sort]
  )

  // Trigger search on filter changes (debounced for search input)
  useEffect(() => {
    if (catalogView !== 'browsing') return
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
  }, [search, category, selectedStore, inStockOnly, sort, catalogView, doSearch])

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
      if (result.success || result.error === 'Already in your library') {
        setAddedIds((prev) => new Set(prev).add(item.id))
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
    setInStockOnly(false)
    setSort('name')
    setOnSaleOnly(false)
  }, [])

  // Load default cart on mount
  useEffect(() => {
    getCarts()
      .then((carts) => {
        if (carts.length > 0) {
          setActiveCartId(carts[0].id)
          getCartWithItems(carts[0].id)
            .then((full) => {
              if (full) {
                setCartItemCount(full.items.length)
                setCartTotalCents(full.totalCents)
                setCartItemIds(
                  new Set(
                    full.items.map((i) => i.canonicalIngredientId).filter(Boolean) as string[]
                  )
                )
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const handleAddToCart = useCallback(
    async (item: CatalogItemV2) => {
      let cartId = activeCartId
      if (!cartId) {
        try {
          const result = await createCart({ name: 'Shopping List' })
          if (result.success && result.cart) {
            cartId = result.cart.id
            setActiveCartId(cartId)
          } else {
            return
          }
        } catch {
          return
        }
      }

      try {
        const result = await addToCart({
          cartId,
          ingredientName: item.name,
          canonicalId: item.id,
          unit: item.standardUnit || item.bestPriceUnit || 'each',
          priceCents: item.bestPriceCents ?? undefined,
          priceSource: item.bestPriceStore ?? undefined,
          imageUrl: item.imageUrl ?? undefined,
        })
        if (result.success) {
          setCartItemCount((prev) => prev + 1)
          if (result.item?.priceCents != null) {
            setCartTotalCents(
              (prev) => prev + Math.round(result.item!.quantity * result.item!.priceCents!)
            )
          }
          setCartItemIds((prev) => {
            const next = new Set(prev)
            if (item.id) next.add(item.id)
            return next
          })
        }
      } catch {
        // Non-blocking
      }
    },
    [activeCartId]
  )

  const handleCartCountChange = useCallback((count: number) => {
    setCartItemCount(count)
  }, [])

  // Store picker handlers
  const handleSelectStore = useCallback((storeId: string, storeName: string) => {
    setSelectedStore(storeId)
    setActiveStoreName(storeName)
    setActiveStoreId(storeId)
    setCatalogView('browsing')
  }, [])

  const handleBrowseAll = useCallback(() => {
    setSelectedStore(null)
    setActiveStoreName(null)
    setActiveStoreId(null)
    setCatalogView('browsing')
  }, [])

  const handleBackToStores = useCallback(() => {
    setCatalogView('store-picker')
    setItems([])
    setTotal(0)
    setSelectedStore(null)
    setActiveStoreName(null)
    setActiveStoreId(null)
    clearAllFilters()
  }, [clearAllFilters])

  const hasActiveFilters = search || category || inStockOnly || onSaleOnly || sort !== 'name'

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  )

  // Active filter pills
  const activeFilters: { label: string; onClear: () => void }[] = []
  if (search) activeFilters.push({ label: `Search: "${search}"`, onClear: () => setSearch('') })
  if (category)
    activeFilters.push({ label: `Category: ${category}`, onClear: () => setCategory(null) })
  if (inStockOnly)
    activeFilters.push({ label: 'In Stock Only', onClear: () => setInStockOnly(false) })
  if (onSaleOnly) activeFilters.push({ label: 'On Sale', onClear: () => setOnSaleOnly(false) })
  if (sort !== 'name')
    activeFilters.push({ label: `Sort: ${sort}`, onClear: () => setSort('name') })

  // ---------------------------------------------------------------------------
  // Render: Store Picker View
  // ---------------------------------------------------------------------------
  if (catalogView === 'store-picker') {
    return (
      <div>
        <CatalogStorePicker
          stores={allStores}
          preferredStoreNames={preferredStoreNames}
          onSelectStore={handleSelectStore}
          onBrowseAll={handleBrowseAll}
          isLoading={storesLoading}
        />

        {/* Cart summary bar (always visible) */}
        <CartSummaryBar
          itemCount={cartItemCount}
          totalCents={cartTotalCents}
          onOpen={() => setCartOpen(true)}
        />
        <ShoppingCartSidebar
          open={cartOpen}
          onClose={() => {
            setCartOpen(false)
            if (activeCartId) {
              getCartWithItems(activeCartId)
                .then((full) => {
                  if (full) {
                    setCartItemCount(full.items.length)
                    setCartTotalCents(full.totalCents)
                    setCartItemIds(
                      new Set(
                        full.items.map((i) => i.canonicalIngredientId).filter(Boolean) as string[]
                      )
                    )
                  }
                })
                .catch(() => {})
            }
          }}
          onCartCountChange={handleCartCountChange}
        />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Browsing View
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* ---- Store context bar ---- */}
      <div className="flex items-center gap-3 bg-stone-900 rounded-lg border border-stone-800 px-4 py-2.5">
        <button
          onClick={handleBackToStores}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Stores
        </button>
        <div className="h-4 w-px bg-stone-700" />
        <span className="text-sm font-medium text-stone-100">
          {activeStoreName || 'All Stores'}
        </span>
        <span className="text-xs text-stone-500">
          {isPending ? 'Searching...' : `${total.toLocaleString()} items`}
        </span>
      </div>

      {/* ---- View Toggle ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-stone-700 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-stone-700 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('store-aisle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'store-aisle'
                ? 'bg-stone-700 text-white'
                : 'text-stone-400 hover:text-stone-300'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Store Aisle
          </button>
        </div>
      </div>

      {/* Store Aisle view is self-contained */}
      {viewMode === 'store-aisle' ? (
        <StoreAisleBrowser onAddToCart={handleAddToCart} cartItemIds={cartItemIds} />
      ) : (
        <>
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
                    title="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category dropdown */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 hover:bg-stone-700"
                >
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

              {/* On Sale toggle */}
              <button
                onClick={() => setOnSaleOnly(!onSaleOnly)}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md ${
                  onSaleOnly
                    ? 'bg-rose-900/40 border-rose-700 text-rose-300'
                    : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <Tag className="w-3 h-3" />
                On Sale
              </button>

              {/* Sort dropdown */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                aria-label="Sort order"
                className="px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="name">Sort: Name</option>
                <option value="price">Sort: Price</option>
                <option value="stores">Sort: Most Stores</option>
                <option value="updated">Sort: Recently Updated</option>
              </select>
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
                    <button
                      onClick={f.onClear}
                      title="Remove filter"
                      className="text-stone-500 hover:text-stone-200"
                    >
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
            <div className="space-y-3">
              <div className="bg-stone-900 rounded-lg border border-stone-800 p-8 text-center">
                <Search className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No ingredients found</p>
                <p className="text-xs text-stone-500 mt-1">
                  {activeStoreName
                    ? `No catalog data for ${activeStoreName} yet. Coverage for this store is still in progress.`
                    : 'Try adjusting your filters or search term'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-3 text-xs text-brand-400 hover:text-brand-300 underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* ---- Web sourcing fallback ---- */}
              {search.trim().length > 1 && <WebSourcingPanel query={search.trim()} />}
            </div>
          )}

          {/* ---- Table view ---- */}
          {viewMode === 'table' && items.length > 0 && (
            <>
              {/* Desktop */}
              <div className="hidden md:block bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2 font-medium w-10">
                        <span className="sr-only">Image</span>
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">Category</th>
                      <th className="text-right px-4 py-2 font-medium">Best Price</th>
                      <th className="text-left px-4 py-2 font-medium">Stock</th>
                      <th className="text-left px-4 py-2 font-medium">Sourceability</th>
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
                        onAddToCart={() => handleAddToCart(item)}
                        isAdded={addedIds.has(item.id)}
                        isAdding={addingId === item.id}
                        isInCart={cartItemIds.has(item.id)}
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
                    onAddToCart={() => handleAddToCart(item)}
                    isAdded={addedIds.has(item.id)}
                    isAdding={addingId === item.id}
                    isInCart={cartItemIds.has(item.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onAddToCart={handleAddToCart}
                  isInCart={cartItemIds.has(item.id)}
                  onExpand={(item) => {
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }}
                />
              ))}
            </div>
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
        </>
      )}

      {/* Cart summary bar (floating) */}
      <CartSummaryBar
        itemCount={cartItemCount}
        totalCents={cartTotalCents}
        onOpen={() => setCartOpen(true)}
      />

      {/* Cart sidebar */}
      <ShoppingCartSidebar
        open={cartOpen}
        onClose={() => {
          setCartOpen(false)
          if (activeCartId) {
            getCartWithItems(activeCartId)
              .then((full) => {
                if (full) {
                  setCartItemCount(full.items.length)
                  setCartTotalCents(full.totalCents)
                  setCartItemIds(
                    new Set(
                      full.items.map((i) => i.canonicalIngredientId).filter(Boolean) as string[]
                    )
                  )
                }
              })
              .catch(() => {})
          }
        }}
        onCartCountChange={handleCartCountChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop Table Row (with image thumbnail)
// ---------------------------------------------------------------------------

function DesktopRow({
  item,
  isExpanded,
  expandedDetail,
  priceHistory,
  onToggle,
  onAddToPantry,
  onAddToCart,
  isAdded,
  isAdding,
  isInCart,
}: {
  item: CatalogItemV2
  isExpanded: boolean
  expandedDetail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  onToggle: () => void
  onAddToPantry: () => void
  onAddToCart: () => void
  isAdded: boolean
  isAdding: boolean
  isInCart: boolean
}) {
  const isOutOfStock = item.outOfStockCount > 0 && item.inStockCount === 0
  const rowOpacity = isOutOfStock ? 'opacity-50' : ''

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-stone-800/50 hover:bg-stone-800/50 cursor-pointer transition-colors ${rowOpacity}`}
      >
        {/* Image thumbnail */}
        <td className="px-4 py-2">
          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.name}
              category={item.category}
              className="w-8 h-8"
            />
          </div>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
            )}
            <div>
              <span className="text-stone-100 font-medium">{item.name}</span>
              {item.brand && <span className="ml-2 text-xs text-stone-500">{item.brand}</span>}
            </div>
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
        <td className="px-4 py-2.5">
          <AvailabilityBadge
            report={classifyFromItemData(
              item.priceCount,
              item.inStockCount,
              item.outOfStockCount,
              item.lastUpdated
            )}
            variant="compact"
          />
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
          <td colSpan={8} className="px-4 py-4 bg-stone-950/60">
            <ExpandedDetail
              detail={expandedDetail}
              priceHistory={priceHistory}
              item={item}
              onAddToPantry={onAddToPantry}
              onAddToCart={onAddToCart}
              isAdded={isAdded}
              isAdding={isAdding}
              isInCart={isInCart}
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
  onAddToCart,
  isAdded,
  isAdding,
  isInCart,
}: {
  item: CatalogItemV2
  isExpanded: boolean
  expandedDetail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  onToggle: () => void
  onAddToPantry: () => void
  onAddToCart: () => void
  isAdded: boolean
  isAdding: boolean
  isInCart: boolean
}) {
  const isOutOfStock = item.outOfStockCount > 0 && item.inStockCount === 0

  return (
    <div
      className={`bg-stone-900 rounded-lg border border-stone-800 ${isOutOfStock ? 'opacity-50' : ''}`}
    >
      <button onClick={onToggle} className="w-full text-left p-3 space-y-2">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.name}
              category={item.category}
              className="w-10 h-10"
            />
          </div>
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
        <div className="flex items-center justify-between ml-[52px] text-xs text-stone-500">
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
            onAddToCart={onAddToCart}
            isAdded={isAdded}
            isAdding={isAdding}
            isInCart={isInCart}
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
  onAddToCart,
  isAdded,
  isAdding,
  isInCart,
}: {
  detail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  item: CatalogItemV2
  onAddToPantry: () => void
  onAddToCart: () => void
  isAdded: boolean
  isAdding: boolean
  isInCart: boolean
}) {
  const [linkCopied, setLinkCopied] = useState(false)

  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading price details...
      </div>
    )
  }

  const { prices, summary } = detail
  const sourceability = classifyFromCatalogDetail(detail)

  function handleCopyShareLink(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/ingredient/${item.id}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Sourceability analysis */}
      <AvailabilityDetail report={sourceability} />

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

      {/* Per-store price table (chef-friendly) */}
      {prices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-800">
                <th className="text-left py-1.5 pr-3 font-medium">Store</th>
                <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Location</th>
                <th className="text-right py-1.5 pr-3 font-medium">Price</th>
                <th className="text-left py-1.5 pr-3 font-medium">Availability</th>
                <th className="text-center py-1.5 pr-3 font-medium" title="Price reliability">
                  <span className="sr-only">Reliability</span>
                  <Info className="w-3 h-3 inline" />
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
                    <td className="py-1.5 pr-3 text-stone-200">
                      {p.store.replace(/\s*\(via\s+[^)]+\)/gi, '')}
                    </td>
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
                        <span className="text-red-400">Out of Stock</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      <ConfidenceIcon confidence={p.confidence} />
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
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart()
          }}
          disabled={isInCart}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            isInCart
              ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300 cursor-default'
              : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}
        >
          {isInCart ? (
            <>
              <Check className="w-3.5 h-3.5" />
              In Cart
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Add to Cart
            </>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddToPantry()
          }}
          disabled={isAdded || isAdding}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            isAdded
              ? 'bg-stone-800 border border-stone-700 text-stone-400 cursor-default'
              : isAdding
                ? 'bg-stone-800 border border-stone-700 text-stone-400 cursor-wait'
                : 'bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700'
          }`}
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isAdded ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {isAdded ? 'In Pantry' : isAdding ? 'Adding...' : 'Add to Pantry'}
        </button>

        {/* Share link - copies /ingredient/[id] to clipboard */}
        <button
          type="button"
          onClick={handleCopyShareLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors ml-auto"
          title="Copy shareable link to this ingredient"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Link copied
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5" />
              Share ingredient
            </>
          )}
        </button>
      </div>
    </div>
  )
}

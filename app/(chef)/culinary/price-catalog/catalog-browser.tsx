'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import {
  searchCatalogV2,
  getCatalogDetail,
  getCatalogCategories,
  getCatalogStores,
  addCatalogIngredientToLibrary,
  searchSystemIngredients,
  addSystemIngredientToLibrary,
  getIngredientKnowledgeForCatalog,
  type CatalogItemV2,
  type CatalogDetailResult,
  type CatalogDetailPrice,
  type CatalogStore,
  type SystemIngredientMatch,
  type CatalogIngredientKnowledge,
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
  Phone,
  Copy,
  CheckCheck,
  Store,
} from 'lucide-react'
import type { PriceHistoryPoint } from '@/lib/openclaw/price-intelligence-actions'
import { getVendorCallQueue, type VendorCallCandidate } from '@/lib/vendors/sourcing-actions'
import {
  initiateSupplierCall,
  initiateAdHocCall,
  getCallStatus,
} from '@/lib/calling/twilio-actions'

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

import { WebSourcingPanel } from '@/components/pricing/web-sourcing-panel'
import { UpgradePrompt } from '@/components/billing/upgrade-prompt'

// ---------------------------------------------------------------------------
// Vendor Call Queue Panel
// Shown as a last resort when catalog + web sourcing both return nothing.
// Pulls the chef's saved vendor contacts, ranks them by specialty relevance,
// and presents a click-to-copy phone list so the chef knows exactly who to
// call and in what order.
// ---------------------------------------------------------------------------

const VENDOR_TYPE_LABELS: Record<string, string> = {
  specialty: 'Specialty',
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  farm: 'Farm',
  produce: 'Produce',
  dairy: 'Dairy',
  bakery: 'Bakery',
  grocery: 'Grocery',
  liquor: 'Liquor',
  equipment: 'Equipment',
  other: 'Other',
}

type CallState =
  | { phase: 'idle' }
  | { phase: 'calling' }
  | {
      phase: 'done'
      result: 'yes' | 'no' | null
      status: string
      priceQuoted?: string | null
      quantityAvailable?: string | null
    }

function VendorCallQueuePanel({ query }: { query: string }) {
  const [vendors, setVendors] = useState<VendorCallCandidate[]>([])
  const [callingEnabled, setCallingEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [callStates, setCallStates] = useState<Record<string, CallState>>({})
  const [callingAll, setCallingAll] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      getVendorCallQueue(query),
      // Check if supplier_calling flag is on by attempting a dry-run gate check
      // We detect this by checking if initiateSupplierCall would pass the gate.
      // Simpler: fetch /api/calling/enabled which checks the flag server-side.
      fetch('/api/calling/enabled')
        .then((r) => r.json())
        .then((d) => d?.enabled === true)
        .catch(() => false),
    ])
      .then(([results, enabled]) => {
        if (!cancelled) {
          setVendors(results)
          setCallingEnabled(enabled)
        }
      })
      .catch(() => {
        if (!cancelled) setVendors([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  function copyPhone(vendor: VendorCallCandidate) {
    navigator.clipboard.writeText(vendor.phone).then(() => {
      setCopiedId(vendor.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  async function placeCall(vendor: VendorCallCandidate) {
    setCallStates((prev) => ({ ...prev, [vendor.id]: { phase: 'calling' } }))
    try {
      const result =
        vendor.source === 'national'
          ? await initiateAdHocCall(vendor.phone, vendor.name, query)
          : await initiateSupplierCall(vendor.id, query)
      if (!result.success) {
        setCallStates((prev) => ({
          ...prev,
          [vendor.id]: { phase: 'done', result: null, status: result.error ?? 'Failed' },
        }))
        return
      }

      // Poll for result every 3s, up to 60s
      const callId = result.callId!
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const status = await getCallStatus(callId)
        if (!status) return
        if (['completed', 'failed', 'no_answer', 'busy'].includes(status.status)) {
          clearInterval(poll)
          setCallStates((prev) => ({
            ...prev,
            [vendor.id]: {
              phase: 'done',
              result: status.result,
              status: status.status,
              priceQuoted: status.price_quoted,
              quantityAvailable: status.quantity_available,
            },
          }))
        }
        if (attempts >= 20) clearInterval(poll)
      }, 3000)
    } catch {
      setCallStates((prev) => ({
        ...prev,
        [vendor.id]: { phase: 'done', result: null, status: 'Error placing call' },
      }))
    }
  }

  async function callAll() {
    const callable = vendors.filter((v) => !callStates[v.id] || callStates[v.id].phase === 'idle')
    if (callable.length === 0) return
    setCallingAll(true)
    // Fire all calls simultaneously - each result streams back independently via SSE poll
    await Promise.allSettled(callable.map((v) => placeCall(v)))
    setCallingAll(false)
  }

  // Don't render if still loading or no vendors have phone numbers
  if (loading || vendors.length === 0) return null

  return (
    <div className="bg-stone-900 rounded-lg border border-stone-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-200">Call Sheet</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} with phones
            </p>
          </div>
        </div>
        {callingEnabled && (
          <button
            type="button"
            onClick={callAll}
            disabled={callingAll || vendors.every((v) => callStates[v.id]?.phase === 'calling')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
              bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {callingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Calling all...
              </>
            ) : (
              <>
                <Phone className="w-3.5 h-3.5" />
                Call All ({vendors.length})
              </>
            )}
          </button>
        )}
      </div>

      <ul className="divide-y divide-stone-800">
        {vendors.map((vendor) => {
          const callState = callStates[vendor.id] ?? { phase: 'idle' }
          return (
            <li key={vendor.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                  <Store className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-200 truncate">
                      {vendor.name}
                    </span>
                    {vendor.is_preferred && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand-900/50 text-brand-400 border border-brand-800/50 flex-shrink-0">
                        Preferred
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700 flex-shrink-0 capitalize">
                      {VENDOR_TYPE_LABELS[vendor.vendor_type] ?? vendor.vendor_type}
                    </span>
                  </div>
                  {vendor.contact_name && (
                    <p className="text-xs text-stone-500 mt-0.5">Attn: {vendor.contact_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Copy phone button - always visible */}
                <button
                  type="button"
                  onClick={() => copyPhone(vendor)}
                  title={`Copy ${vendor.phone}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors
                    border-stone-700 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200
                    data-[copied=true]:border-emerald-700 data-[copied=true]:bg-emerald-900/30 data-[copied=true]:text-emerald-400"
                  data-copied={copiedId === vendor.id ? 'true' : undefined}
                >
                  {copiedId === vendor.id ? (
                    <CheckCheck className="w-3.5 h-3.5" />
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {vendor.phone}
                    </>
                  )}
                </button>

                {/* AI Call button - only visible when supplier_calling flag is on */}
                {callingEnabled && (
                  <>
                    {callState.phase === 'idle' && (
                      <button
                        type="button"
                        onClick={() => placeCall(vendor)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors
                          border-brand-700 bg-brand-900/40 text-brand-300 hover:bg-brand-800/50 hover:text-brand-200"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Auto-call
                      </button>
                    )}
                    {callState.phase === 'calling' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium border-amber-700 bg-amber-900/30 text-amber-300">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Calling...
                      </span>
                    )}
                    {callState.phase === 'done' && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium
                            ${callState.result === 'yes' ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300' : ''}
                            ${callState.result === 'no' ? 'border-rose-800 bg-rose-900/20 text-rose-400' : ''}
                            ${callState.result === null ? 'border-stone-700 bg-stone-800 text-stone-400' : ''}`}
                        >
                          {callState.result === 'yes' && (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              In stock
                            </>
                          )}
                          {callState.result === 'no' && (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Not available
                            </>
                          )}
                          {callState.result === null && <>No answer</>}
                        </span>
                        {callState.result === 'yes' &&
                          (callState.priceQuoted || callState.quantityAvailable) && (
                            <span className="text-[10px] text-stone-400 text-right leading-tight">
                              {[callState.priceQuoted, callState.quantityAvailable]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="px-5 py-2.5 border-t border-stone-800 bg-stone-950/50">
        <p className="text-xs text-stone-600">
          <a
            href="/culinary/call-sheet"
            className="text-stone-500 hover:text-stone-400 underline underline-offset-2"
          >
            Open Call Sheet
          </a>
          {' for full calling controls and call history.'}
        </p>
      </div>
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

export function CatalogBrowser({ initialSearch = '' }: { initialSearch?: string }) {
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
  const [search, setSearch] = useState(initialSearch)
  const [categories, setCategories] = useState<string[]>([])
  const [allStores, setAllStores] = useState<CatalogStore[]>([])
  const [preferredStoreNames, setPreferredStoreNames] = useState<string[]>([])
  const [autoSelectedStoreName, setAutoSelectedStoreName] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [locationCity, setLocationCity] = useState('')
  const [locationState, setLocationState] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sort, setSort] = useState<'name' | 'price' | 'stores' | 'updated'>('name')
  const [onSaleOnly, setOnSaleOnly] = useState(false)

  // Expansion / detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<CatalogDetailResult | null>(null)
  const [expandedKnowledge, setExpandedKnowledge] = useState<CatalogIngredientKnowledge | null>(
    null
  )
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

  // System ingredient fallback (shown when catalog has no market price data)
  const [systemMatches, setSystemMatches] = useState<SystemIngredientMatch[]>([])
  const [systemMatchAdded, setSystemMatchAdded] = useState<Set<string>>(new Set())
  const [systemMatchAdding, setSystemMatchAdding] = useState<string | null>(null)
  const [resultSource, setResultSource] = useState<'openclaw' | 'system' | undefined>(undefined)

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
      const preferredNames = preferred.map((p: { store_name: string }) => p.store_name)
      setPreferredStoreNames(preferredNames)
      setStoresLoading(false)

      // Auto-select the default preferred store to skip the store picker
      const defaultPreferred = (preferred as { store_name: string; is_default: boolean }[]).find(
        (p) => p.is_default
      )
      if (defaultPreferred) {
        const defaultName = defaultPreferred.store_name.toLowerCase()
        // Match against catalog stores by name (case-insensitive partial match)
        const matched = (stores as { id: string; name: string; status: string }[]).find(
          (s) =>
            s.status === 'active' &&
            (s.name.toLowerCase().includes(defaultName) ||
              defaultName.includes(
                s.name
                  .toLowerCase()
                  .replace(/\s*\(via[^)]+\)/gi, '')
                  .trim()
              ))
        )
        if (matched) {
          setSelectedStore(matched.id)
          setActiveStoreName(defaultPreferred.store_name)
          setActiveStoreId(matched.id)
          setAutoSelectedStoreName(defaultPreferred.store_name)
          setCatalogView('browsing')
        }
      }
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
        city: locationCity.trim() || undefined,
        state: locationState.trim() || undefined,
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
          setResultSource(result.source)
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
    [search, category, selectedStore, locationCity, locationState, inStockOnly, sort]
  )

  // Trigger search on filter changes (debounced for search input)
  useEffect(() => {
    if (catalogView !== 'browsing') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setExpandedId(null)
      setExpandedDetail(null)
      setExpandedKnowledge(null)
      setPriceHistory([])
      doSearch(true)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [
    search,
    category,
    selectedStore,
    locationCity,
    locationState,
    inStockOnly,
    sort,
    catalogView,
    doSearch,
  ])

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
  // System ingredient fallback: fires when catalog returns 0 results
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isPending || items.length > 0 || search.trim().length < 2) {
      setSystemMatches([])
      return
    }
    let cancelled = false
    searchSystemIngredients(search.trim())
      .then((results) => {
        if (!cancelled) setSystemMatches(results)
      })
      .catch(() => {
        if (!cancelled) setSystemMatches([])
      })
    return () => {
      cancelled = true
    }
  }, [isPending, items.length, search])

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
        setExpandedKnowledge(null)
        setPriceHistory([])
        return
      }

      setExpandedId(id)
      setExpandedDetail(null)
      setExpandedKnowledge(null)
      setPriceHistory([])

      try {
        // Find item name for knowledge lookup
        const item = items.find((it) => it.id === id)
        const [detail, history, knowledge] = await Promise.all([
          getCatalogDetail(id),
          getPriceHistory(id),
          item ? getIngredientKnowledgeForCatalog(item.name) : Promise.resolve(null),
        ])
        setExpandedDetail(detail)
        setPriceHistory(history.daily || [])
        setExpandedKnowledge(knowledge)
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
    setLocationCity('')
    setLocationState('')
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

  const hasActiveFilters =
    search ||
    category ||
    locationCity ||
    locationState ||
    inStockOnly ||
    onSaleOnly ||
    sort !== 'name'

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  )

  // Active filter pills
  const activeFilters: { label: string; onClear: () => void }[] = []
  if (search) activeFilters.push({ label: `Search: "${search}"`, onClear: () => setSearch('') })
  if (category)
    activeFilters.push({ label: `Category: ${category}`, onClear: () => setCategory(null) })
  if (locationCity)
    activeFilters.push({ label: `City: ${locationCity}`, onClear: () => setLocationCity('') })
  if (locationState)
    activeFilters.push({
      label: `State: ${locationState.toUpperCase()}`,
      onClear: () => setLocationState(''),
    })
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
      {/* ---- Personalization banner (auto-filtered to preferred store) ---- */}
      {autoSelectedStoreName && (
        <div className="flex items-center justify-between rounded-lg border border-brand-800/40 bg-brand-950/30 px-4 py-2.5 text-sm">
          <span className="text-stone-300">
            Filtered to your preferred store:{' '}
            <span className="font-medium text-brand-400">{autoSelectedStoreName}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setAutoSelectedStoreName(null)
              handleBrowseAll()
            }}
            className="text-stone-400 hover:text-stone-200 transition-colors ml-4 text-xs underline underline-offset-2"
          >
            Show all stores
          </button>
        </div>
      )}

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

              {/* Location: State */}
              <input
                type="text"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                placeholder="State (e.g. KS)"
                maxLength={2}
                className="w-24 px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600 uppercase"
              />

              {/* Location: City */}
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="City (optional)"
                className="w-36 px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-md text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />

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
                {resultSource === 'system' && items.length > 0 && (
                  <span className="ml-2 text-amber-500">
                    (from ingredient database - store prices pending)
                  </span>
                )}
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
                  {locationState && !activeStoreName
                    ? `Price data for ${locationState.toUpperCase()} stores is still being collected. Showing national estimates may help.`
                    : activeStoreName
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

              {/* ---- System ingredient matches (no market price yet) ---- */}
              {systemMatches.length > 0 && (
                <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <p className="text-sm text-stone-300 font-medium">
                      In our ingredient catalog - no market price data yet
                    </p>
                  </div>
                  <ul className="divide-y divide-stone-800">
                    {systemMatches.map((match) => (
                      <li
                        key={match.id}
                        className="flex items-center justify-between px-4 py-3 gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-stone-200 font-medium truncate">
                            {match.name}
                          </p>
                          <p className="text-xs text-stone-500 capitalize mt-0.5">
                            {match.category.replace(/_/g, ' ')}
                            {match.subcategory ? ` - ${match.subcategory.replace(/_/g, ' ')}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={
                            systemMatchAdded.has(match.id) || systemMatchAdding === match.id
                          }
                          onClick={async () => {
                            setSystemMatchAdding(match.id)
                            try {
                              const result = await addSystemIngredientToLibrary(match.id)
                              if (result.success || result.error === 'Already in your library') {
                                setSystemMatchAdded((prev) => new Set(prev).add(match.id))
                              }
                            } catch {
                              // Non-blocking
                            } finally {
                              setSystemMatchAdding(null)
                            }
                          }}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                            disabled:opacity-60 disabled:cursor-default
                            bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100
                            data-[added=true]:bg-emerald-900/40 data-[added=true]:text-emerald-400"
                          data-added={systemMatchAdded.has(match.id) ? 'true' : undefined}
                        >
                          {systemMatchAdded.has(match.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Added
                            </>
                          ) : systemMatchAdding === match.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Adding
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Add to my library
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ---- Web sourcing fallback ---- */}
              {search.trim().length > 1 && <WebSourcingPanel query={search.trim()} />}

              {/* ---- Vendor call queue (Tier 3 last resort) ---- */}
              {search.trim().length > 1 && <VendorCallQueuePanel query={search.trim()} />}
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
                        knowledge={expandedId === item.id ? expandedKnowledge : null}
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
                    knowledge={expandedId === item.id ? expandedKnowledge : null}
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
  knowledge,
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
  knowledge: CatalogIngredientKnowledge | null
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
              knowledge={knowledge}
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
  knowledge,
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
  knowledge: CatalogIngredientKnowledge | null
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
            knowledge={knowledge}
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
  knowledge,
  item,
  onAddToPantry,
  onAddToCart,
  isAdded,
  isAdding,
  isInCart,
}: {
  detail: CatalogDetailResult | null
  priceHistory: PriceHistoryPoint[]
  knowledge: CatalogIngredientKnowledge | null
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

      {/* Ingredient knowledge panel */}
      {knowledge &&
        (knowledge.wikiSummary || knowledge.flavorProfile || knowledge.culinaryUses) && (
          <div className="border border-stone-800 rounded-lg p-3 space-y-2 bg-stone-900/40">
            {knowledge.wikiSummary && (
              <p className="text-xs text-stone-300 leading-relaxed">{knowledge.wikiSummary}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {knowledge.flavorProfile && (
                <div className="text-xs">
                  <span className="text-stone-500">Flavor: </span>
                  <span className="text-stone-300">{knowledge.flavorProfile}</span>
                </div>
              )}
              {knowledge.originCountries.length > 0 && (
                <div className="text-xs">
                  <span className="text-stone-500">Origin: </span>
                  <span className="text-stone-300">
                    {knowledge.originCountries.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
              {knowledge.taxonName && (
                <div className="text-xs">
                  <span className="text-stone-500">Species: </span>
                  <span className="text-stone-400 italic">{knowledge.taxonName}</span>
                </div>
              )}
            </div>
            {knowledge.culinaryUses && (
              <p className="text-xs text-stone-400 leading-relaxed">{knowledge.culinaryUses}</p>
            )}
            {knowledge.typicalPairings.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-stone-500 self-center">Pairs with:</span>
                {knowledge.typicalPairings.slice(0, 6).map((p) => (
                  <span
                    key={p}
                    className="text-xs bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            {knowledge.dietaryFlags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {knowledge.dietaryFlags.map((f) => (
                  <span
                    key={f}
                    className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
            {knowledge.wikipediaUrl && (
              <a
                href={knowledge.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
              >
                Wikipedia
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

      {/* Upgrade prompt - show after price history is visible */}
      <UpgradePrompt
        featureSlug="price-intel-advanced"
        show={priceHistory.length > 0}
        className="mt-2"
      />

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

'use client'

/**
 * CatalogTab - Browse the full 9,000+ OpenClaw ingredient catalog.
 * Admin-only. Calls the Pi directly for data.
 *
 * Power Tools:
 * 1. Price comparison bars (expanded row)
 * 2. CSV export
 * 3. Bulk price checker
 * 4. Freshness dots
 * 5. Click-to-filter on category/store
 * 6. Category coverage breakdown
 * 7. Price trend indicators
 * 8. Keyboard navigation
 * 9. URL-synced filters
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  searchCatalog,
  getCatalogStats,
  getCatalogStores,
  getCatalogItemPrices,
  getCategoryCoverage,
  type CatalogItem,
  type CatalogItemDetail,
  type CatalogStats,
  type CatalogStore,
  type CategoryCoverage,
} from '@/lib/openclaw/catalog-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { FreshnessDot } from '@/components/pricing/freshness-dot'
import { PriceComparisonBars } from '@/components/pricing/price-comparison-bars'
import { CategoryCoverageChart } from '@/components/pricing/category-coverage-chart'
import { BulkPriceChecker } from '@/components/pricing/bulk-price-checker'
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Store,
  Filter,
  X,
  Download,
  ListChecks,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

const CATEGORIES = [
  'Beef',
  'Poultry',
  'Seafood',
  'Pork',
  'Dairy',
  'Produce',
  'Pantry',
  'Grains',
  'Oils',
  'Spices',
  'Herbs',
  'Beverages',
  'Eggs',
  'Uncategorized',
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'price', label: 'Price (low first)' },
  { value: 'stores', label: 'Most stores' },
  { value: 'updated', label: 'Recently updated' },
] as const

type SortOption = (typeof SORT_OPTIONS)[number]['value']

// --- Feature 9: URL param helpers ---

function readFiltersFromURL(sp: URLSearchParams) {
  return {
    search: sp.get('q') || '',
    category: sp.get('cat') || null,
    selectedStore: sp.get('store') || null,
    pricedOnly: sp.get('priced') === '1',
    sort: (sp.get('sort') as SortOption) || 'name',
    page: parseInt(sp.get('page') || '1', 10) || 1,
  }
}

function buildURLParams(filters: {
  search: string
  category: string | null
  selectedStore: string | null
  pricedOnly: boolean
  sort: SortOption
  page: number
}): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.category) params.set('cat', filters.category)
  if (filters.selectedStore) params.set('store', filters.selectedStore)
  if (filters.pricedOnly) params.set('priced', '1')
  if (filters.sort !== 'name') params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  const str = params.toString()
  return str ? `?${str}` : ''
}

export function CatalogTab() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initFilters = readFiltersFromURL(searchParams)

  const [stats, setStats] = useState<CatalogStats | null>(null)
  const [stores, setStores] = useState<CatalogStore[]>([])
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(initFilters.search)
  const [category, setCategory] = useState<string | null>(initFilters.category)
  const [selectedStore, setSelectedStore] = useState<string | null>(initFilters.selectedStore)
  const [pricedOnly, setPricedOnly] = useState(initFilters.pricedOnly)
  const [sort, setSort] = useState<SortOption>(initFilters.sort)
  const [page, setPage] = useState(initFilters.page)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedPrices, setExpandedPrices] = useState<CatalogItemDetail[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  const [storeSearch, setStoreSearch] = useState('')

  // Feature 3: Bulk checker
  const [showBulkChecker, setShowBulkChecker] = useState(false)

  // Feature 6: Category coverage
  const [coverageData, setCoverageData] = useState<CategoryCoverage[]>([])
  const [showCoverageBreakdown, setShowCoverageBreakdown] = useState(false)

  // Feature 8: Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const tableWrapperRef = useRef<HTMLDivElement>(null)

  // Feature fix: Store dropdown outside-click close
  const storeDropdownRef = useRef<HTMLDivElement>(null)

  // --- URL sync helper ---
  const syncURL = useCallback(
    (filters: {
      search: string
      category: string | null
      selectedStore: string | null
      pricedOnly: boolean
      sort: SortOption
      page: number
    }) => {
      const url = pathname + buildURLParams(filters)
      router.replace(url, { scroll: false })
    },
    [pathname, router]
  )

  const doSearch = useCallback(
    (
      searchTerm: string,
      cat: string | null,
      store: string | null,
      priced: boolean,
      sortBy: SortOption,
      pg: number
    ) => {
      setError(null)
      startTransition(async () => {
        try {
          const result = await searchCatalog({
            search: searchTerm || undefined,
            category: cat || undefined,
            store: store || undefined,
            pricedOnly: priced,
            sort: sortBy,
            page: pg,
            limit: 50,
          })
          setItems(result.items)
          setTotal(result.total)
        } catch {
          setError('Cannot reach OpenClaw Pi. Check that the Pi is online and sync-api is running.')
        }
      })
    },
    []
  )

  // Load stats + stores + coverage on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const [s, st, cov] = await Promise.all([
          getCatalogStats(),
          getCatalogStores(),
          getCategoryCoverage(),
        ])
        setStats(s)
        setStores(st)
        setCoverageData(cov)
      } catch {
        // Non-blocking
      }
    })
    doSearch(
      initFilters.search,
      initFilters.category,
      initFilters.selectedStore,
      initFilters.pricedOnly,
      initFilters.sort,
      initFilters.page
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doSearch])

  // Fix: Close store dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setShowStoreDropdown(false)
      }
    }
    if (showStoreDropdown) {
      document.addEventListener('mousedown', handleMouseDown)
      return () => document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [showStoreDropdown])

  // Feature 8: Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture keys when input/textarea is focused
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Only activate when table area has focus
      if (!tableWrapperRef.current?.contains(document.activeElement)) return

      if (isPending) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            handleExpand(items[focusedIndex].id)
          }
          break
        case 'Escape':
          if (expandedId) {
            setExpandedId(null)
            setExpandedPrices([])
          } else if (showBulkChecker) {
            setShowBulkChecker(false)
          } else {
            ;(document.activeElement as HTMLElement)?.blur()
          }
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(items.length - 1)
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items.length, focusedIndex, expandedId, showBulkChecker, isPending])

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const row = tableWrapperRef.current?.querySelector(`[data-index="${focusedIndex}"]`)
      row?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  // Debounced search
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(
      setTimeout(() => {
        setPage(1)
        setFocusedIndex(-1)
        doSearch(value, category, selectedStore, pricedOnly, sort, 1)
        syncURL({ search: value, category, selectedStore, pricedOnly, sort, page: 1 })
      }, 500)
    )
  }

  function handleCategoryClick(cat: string) {
    const newCat = category === cat ? null : cat
    setCategory(newCat)
    setPage(1)
    setFocusedIndex(-1)
    doSearch(search, newCat, selectedStore, pricedOnly, sort, 1)
    syncURL({ search, category: newCat, selectedStore, pricedOnly, sort, page: 1 })
  }

  function handleStoreSelect(storeId: string | null) {
    setSelectedStore(storeId)
    setShowStoreDropdown(false)
    setStoreSearch('')
    setPage(1)
    setFocusedIndex(-1)
    doSearch(search, category, storeId, pricedOnly, sort, 1)
    syncURL({ search, category, selectedStore: storeId, pricedOnly, sort, page: 1 })
  }

  // Feature 5: Click store name in expanded row to filter
  function handleStoreSelectByName(storeName: string) {
    const match = stores.find((s) => s.name.toLowerCase() === storeName.toLowerCase())
    if (match) {
      handleStoreSelect(match.id)
    } else {
      // Fallback: set search to store name
      handleSearchChange(storeName)
    }
  }

  function handlePricedToggle() {
    const next = !pricedOnly
    setPricedOnly(next)
    setPage(1)
    setFocusedIndex(-1)
    doSearch(search, category, selectedStore, next, sort, 1)
    syncURL({ search, category, selectedStore, pricedOnly: next, sort, page: 1 })
  }

  function handleSortChange(newSort: SortOption) {
    setSort(newSort)
    setPage(1)
    setFocusedIndex(-1)
    doSearch(search, category, selectedStore, pricedOnly, newSort, 1)
    syncURL({ search, category, selectedStore, pricedOnly, sort: newSort, page: 1 })
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setFocusedIndex(-1)
    doSearch(search, category, selectedStore, pricedOnly, sort, newPage)
    syncURL({ search, category, selectedStore, pricedOnly, sort, page: newPage })
  }

  function clearAllFilters() {
    setSearch('')
    setCategory(null)
    setSelectedStore(null)
    setPricedOnly(false)
    setSort('name')
    setPage(1)
    setFocusedIndex(-1)
    doSearch('', null, null, false, 'name', 1)
    syncURL({
      search: '',
      category: null,
      selectedStore: null,
      pricedOnly: false,
      sort: 'name',
      page: 1,
    })
  }

  async function handleExpand(itemId: string) {
    if (expandedId === itemId) {
      setExpandedId(null)
      setExpandedPrices([])
      return
    }
    setExpandedId(itemId)
    setExpandedPrices([])
    try {
      const prices = await getCatalogItemPrices(itemId)
      setExpandedPrices(prices)
    } catch {
      setExpandedPrices([])
    }
  }

  // Feature 2: CSV export URL builder
  function getCsvExportUrl() {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (category) params.set('cat', category)
    if (selectedStore) params.set('store', selectedStore)
    if (pricedOnly) params.set('priced', '1')
    if (sort !== 'name') params.set('sort', sort)
    const qs = params.toString()
    return `/admin/price-catalog/csv-export${qs ? `?${qs}` : ''}`
  }

  const totalPages = Math.ceil(total / 50)
  const coveragePct = stats && stats.total > 0 ? Math.round((stats.priced / stats.total) * 100) : 0
  const hasActiveFilters =
    !!search || !!category || !!selectedStore || pricedOnly || sort !== 'name'

  const filteredStores = stores.filter(
    (s) => !storeSearch || s.name.toLowerCase().includes(storeSearch.toLowerCase())
  )

  const selectedStoreName = selectedStore
    ? stores.find((s) => s.id === selectedStore)?.name || selectedStore
    : null

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{stats.total.toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">Total ingredients</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.priced.toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">With prices</p>
          </Card>
          {/* Feature 6: Coverage with breakdown toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-stone-100">{coveragePct}%</p>
                <p className="text-sm text-stone-500 mt-1">Coverage</p>
              </div>
              {coverageData.length > 0 && (
                <button
                  onClick={() => setShowCoverageBreakdown(!showCoverageBreakdown)}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showCoverageBreakdown ? 'Hide' : 'Show'} breakdown
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Feature 6: Category coverage breakdown */}
      {showCoverageBreakdown && coverageData.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-stone-300 mb-1">Coverage by category</p>
          <CategoryCoverageChart
            data={coverageData}
            onCategoryClick={(cat) => handleCategoryClick(cat.toLowerCase())}
          />
        </Card>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat.toLowerCase())}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              category === cat.toLowerCase()
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />

        {/* Store dropdown (with outside-click fix) */}
        <div className="relative" ref={storeDropdownRef}>
          <button
            onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
              selectedStore
                ? 'bg-blue-900 text-blue-400'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <Store className="w-3 h-3" />
            {selectedStoreName ? selectedStoreName : 'All stores'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showStoreDropdown && (
            <div className="absolute z-50 mt-1 w-72 bg-stone-900 border border-stone-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              <div className="p-2 border-b border-stone-700">
                <Input
                  placeholder="Search stores..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="text-xs h-8"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-60">
                <button
                  onClick={() => handleStoreSelect(null)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-800 ${
                    !selectedStore ? 'text-blue-400 font-medium' : 'text-stone-300'
                  }`}
                >
                  All stores
                </button>
                {filteredStores.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStoreSelect(s.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-800 flex items-center justify-between ${
                      selectedStore === s.id ? 'text-blue-400 font-medium' : 'text-stone-300'
                    }`}
                  >
                    <span>{s.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.tier === 'wholesale'
                          ? 'bg-purple-900/50 text-purple-400'
                          : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {s.tier}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Priced toggle */}
        <button
          onClick={handlePricedToggle}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            pricedOnly
              ? 'bg-emerald-900 text-emerald-400'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          {pricedOnly ? 'Priced only' : 'All ingredients'}
        </button>

        {/* Sort dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-stone-800 text-stone-400 hover:bg-stone-700 transition-colors">
            <ArrowUpDown className="w-3 h-3" />
            {SORT_OPTIONS.find((s) => s.value === sort)?.label}
          </button>
          <div className="absolute z-40 mt-1 w-44 bg-stone-900 border border-stone-700 rounded-lg shadow-xl hidden group-hover:block">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-800 ${
                  sort === opt.value ? 'text-blue-400 font-medium' : 'text-stone-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-stone-500">{total.toLocaleString()} results</span>

        {/* Feature 2: CSV Export */}
        <button
          onClick={() => window.open(getCsvExportUrl(), '_blank')}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md bg-stone-800 text-stone-400 hover:bg-stone-700 transition-colors disabled:opacity-50"
          title="Export filtered results as CSV"
        >
          <Download className="w-3 h-3" />
        </button>

        {/* Feature 3: Bulk checker toggle */}
        <button
          onClick={() => setShowBulkChecker(!showBulkChecker)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
            showBulkChecker
              ? 'bg-blue-900 text-blue-400'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          <ListChecks className="w-3 h-3" />
          Bulk Check
        </button>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {category && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-900/30 text-brand-400 rounded-full">
              <Filter className="w-3 h-3" />
              {category}
              <button
                onClick={() => handleCategoryClick(category)}
                className="hover:text-white"
                title="Remove category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedStore && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-900/30 text-blue-400 rounded-full">
              <Store className="w-3 h-3" />
              {selectedStoreName}
              <button
                onClick={() => handleStoreSelect(null)}
                className="hover:text-white"
                title="Remove store filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {pricedOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-900/30 text-emerald-400 rounded-full">
              Priced only
              <button
                onClick={handlePricedToggle}
                className="hover:text-white"
                title="Remove priced-only filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Feature 3: Bulk price checker panel */}
      {showBulkChecker && (
        <BulkPriceChecker onFilterByIngredient={(name) => handleSearchChange(name)} />
      )}

      {/* Error state */}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-amber-400 font-medium mb-2">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => doSearch(search, category, selectedStore, pricedOnly, sort, page)}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Results table */}
      {!error && (
        <Card>
          <div className="overflow-x-auto" ref={tableWrapperRef} tabIndex={0}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left py-3 px-4 font-medium text-stone-300">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-stone-300">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-300">Best Price</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-300">Stores</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-300">Last Updated</th>
                </tr>
              </thead>
              {isPending && items.length === 0 && (
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-stone-800">
                      <td className="py-3 px-4">
                        <div className="h-4 loading-bone loading-bone-muted w-32" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 loading-bone loading-bone-muted w-16" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 loading-bone loading-bone-muted w-16 ml-auto" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 loading-bone loading-bone-muted w-8 ml-auto" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 loading-bone loading-bone-muted w-20 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
              {!isPending && items.length === 0 && !error && (
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">
                      No ingredients match your filters
                    </td>
                  </tr>
                </tbody>
              )}
              {items.map((item, idx) => (
                <tbody key={item.id}>
                  <tr
                    data-index={idx}
                    className={`border-b border-stone-800 hover:bg-stone-800/50 cursor-pointer ${
                      focusedIndex === idx ? 'ring-1 ring-brand-500 ring-inset' : ''
                    }`}
                    onClick={() => handleExpand(item.id)}
                  >
                    <td className="py-3 px-4 text-stone-100 font-medium">
                      <div className="flex items-center gap-2">
                        {expandedId === item.id ? (
                          <ChevronUp className="w-4 h-4 text-stone-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />
                        )}
                        {item.name}
                      </div>
                    </td>
                    {/* Feature 5: Click-to-filter on category */}
                    <td className="py-3 px-4">
                      <span
                        className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize cursor-pointer hover:ring-1 hover:ring-brand-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategoryClick(item.category)
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.bestPriceCents != null ? (
                        <span className="text-stone-100 font-medium inline-flex items-center gap-1 justify-end">
                          {formatCurrency(item.bestPriceCents)}
                          {item.bestPriceUnit && (
                            <span className="text-stone-500">/{item.bestPriceUnit}</span>
                          )}
                          {item.bestPriceStore && (
                            <span className="text-xs text-stone-500 ml-1">
                              at {item.bestPriceStore}
                            </span>
                          )}
                          {/* Feature 7: Price trend indicator */}
                          {item.trendPct != null && item.trendPct !== 0 && (
                            <>
                              {item.trendPct > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-red-400">
                                  <TrendingUp className="w-3 h-3" />
                                  <span className="text-xs">
                                    +{Math.abs(item.trendPct).toFixed(1)}%
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-emerald-400">
                                  <TrendingDown className="w-3 h-3" />
                                  <span className="text-xs">{item.trendPct.toFixed(1)}%</span>
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-stone-600">No price</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-400">{item.priceCount}</td>
                    {/* Feature 4: Freshness dot */}
                    <td className="py-3 px-4 text-right text-stone-500 text-xs">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <FreshnessDot date={item.lastUpdated} />
                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'}
                      </span>
                    </td>
                  </tr>
                  {/* Feature 1: Price comparison bars in expanded row */}
                  {expandedId === item.id && (
                    <tr className="border-b border-stone-800">
                      <td colSpan={5} className="px-4 py-3 bg-stone-900/50">
                        {expandedPrices.length === 0 ? (
                          <p className="text-sm text-stone-500">Loading store prices...</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-stone-400 mb-2">
                              All store prices (sorted cheapest first)
                            </p>
                            <PriceComparisonBars prices={expandedPrices} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </table>
          </div>
          {/* Feature 8: Keyboard nav hint */}
          {items.length > 0 && (
            <p className="text-xs text-stone-600 px-4 py-2 border-t border-stone-800">
              Arrow keys to navigate, Enter to expand
            </p>
          )}
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-stone-400 py-1.5">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

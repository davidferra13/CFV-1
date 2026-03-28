'use client'

/**
 * CatalogTab - Browse the full 9,000+ OpenClaw ingredient catalog.
 * Admin-only. Calls the Pi directly for data.
 */

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  searchCatalog,
  getCatalogStats,
  getCatalogItemPrices,
  type CatalogItem,
  type CatalogItemDetail,
  type CatalogStats,
} from '@/lib/openclaw/catalog-actions'
import { formatCurrency } from '@/lib/utils/currency'

const CATEGORIES = [
  'Beef',
  'Poultry',
  'Seafood',
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

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-900 text-emerald-400',
  medium: 'bg-amber-900 text-amber-400',
  low: 'bg-stone-800 text-stone-400',
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const norm = confidence.toLowerCase()
  const color = CONFIDENCE_COLORS[norm] || CONFIDENCE_COLORS.medium
  return <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>{confidence}</span>
}

export function CatalogTab() {
  const [stats, setStats] = useState<CatalogStats | null>(null)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [pricedOnly, setPricedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedPrices, setExpandedPrices] = useState<CatalogItemDetail[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    (searchTerm: string, cat: string | null, priced: boolean, pg: number) => {
      setError(null)
      startTransition(async () => {
        try {
          const result = await searchCatalog({
            search: searchTerm || undefined,
            category: cat || undefined,
            pricedOnly: priced,
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

  // Load stats on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const s = await getCatalogStats()
        setStats(s)
      } catch {
        // Stats load failure is non-blocking
      }
    })
    doSearch('', null, false, 1)
  }, [doSearch])

  // Debounced search
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(
      setTimeout(() => {
        setPage(1)
        doSearch(value, category, pricedOnly, 1)
      }, 500)
    )
  }

  function handleCategoryClick(cat: string) {
    const newCat = category === cat ? null : cat
    setCategory(newCat)
    setPage(1)
    doSearch(search, newCat, pricedOnly, 1)
  }

  function handlePricedToggle() {
    const next = !pricedOnly
    setPricedOnly(next)
    setPage(1)
    doSearch(search, category, next, 1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    doSearch(search, category, pricedOnly, newPage)
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

  const totalPages = Math.ceil(total / 50)
  const coveragePct = stats && stats.total > 0 ? Math.round((stats.priced / stats.total) * 100) : 0

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
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{coveragePct}%</p>
            <p className="text-sm text-stone-500 mt-1">Coverage</p>
          </Card>
        </div>
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

      {/* Search + filters */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
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
        <span className="text-xs text-stone-500">{total.toLocaleString()} results</span>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-6 text-center">
          <p className="text-amber-400 font-medium mb-2">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => doSearch(search, category, pricedOnly, page)}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Results table */}
      {!error && (
        <Card>
          <div className="overflow-x-auto">
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
              <tbody>
                {isPending && items.length === 0 && (
                  <>
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
                  </>
                )}
                {!isPending && items.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">
                      No ingredients match your search
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      className="border-b border-stone-800 hover:bg-stone-800/50 cursor-pointer"
                      onClick={() => handleExpand(item.id)}
                    >
                      <td className="py-3 px-4 text-stone-100 font-medium">
                        {item.name}
                        {expandedId === item.id && (
                          <span className="ml-2 text-xs text-stone-500">(click to collapse)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.bestPriceCents != null ? (
                          <span className="text-stone-100 font-medium">
                            {formatCurrency(item.bestPriceCents)}
                            {item.bestPriceUnit && (
                              <span className="text-stone-500">/{item.bestPriceUnit}</span>
                            )}
                            {item.bestPriceStore && (
                              <span className="text-xs text-stone-500 ml-1">
                                at {item.bestPriceStore}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-500">No price</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-400">{item.priceCount}</td>
                      <td className="py-3 px-4 text-right text-stone-500 text-xs">
                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr key={`${item.id}-detail`} className="border-b border-stone-800">
                        <td colSpan={5} className="px-4 py-3 bg-stone-900/50">
                          {expandedPrices.length === 0 ? (
                            <p className="text-sm text-stone-500">Loading store prices...</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-stone-400 mb-2">
                                All store prices (sorted cheapest first)
                              </p>
                              {expandedPrices.map((price, i) => (
                                <div key={i} className="flex items-center gap-4 text-sm py-1">
                                  <span className="text-stone-100 w-40 truncate">
                                    {price.store}
                                  </span>
                                  <span className="font-medium text-stone-200">
                                    {formatCurrency(price.priceCents)}
                                    <span className="text-stone-500">/{price.unit}</span>
                                  </span>
                                  <ConfidenceBadge confidence={price.confidence} />
                                  <span className="text-xs text-stone-500">{price.tier}</span>
                                  <span className="text-xs text-stone-500">
                                    {price.lastConfirmedAt
                                      ? new Date(price.lastConfirmedAt).toLocaleDateString()
                                      : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
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

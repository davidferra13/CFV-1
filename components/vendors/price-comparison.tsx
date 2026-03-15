'use client'

import { useState, useTransition } from 'react'
import { comparePrices } from '@/lib/vendors/vendor-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Star } from 'lucide-react'

type ComparisonEntry = {
  id: string
  vendor_id: string
  item_name: string
  price_cents: number
  unit: string
  recorded_at: string
  notes: string | null
  vendors: {
    id: string
    name: string
    is_preferred: boolean
    category: string
  }
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function PriceComparison() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<ComparisonEntry[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setError(null)
    startTransition(async () => {
      try {
        const data = await comparePrices(searchTerm.trim())
        setResults(data as ComparisonEntry[])
        setSearched(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
        setSearched(true)
      }
    })
  }

  const cheapest = results.length > 0 ? results[0].price_cents : null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Price Comparison</h2>
      <p className="text-sm text-muted-foreground">
        Search for an item to compare prices across all your vendors.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search item name (e.g. Ribeye, Olive Oil)..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
          />
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Searching...' : 'Compare'}
        </Button>
      </form>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {searched && results.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          No price entries found for &quot;{searchTerm}&quot;. Log prices from the vendor detail
          view first.
        </div>
      )}

      {results.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Vendor</th>
                <th className="text-right px-4 py-2 font-medium">Price</th>
                <th className="text-left px-4 py-2 font-medium">Unit</th>
                <th className="text-left px-4 py-2 font-medium">Date Recorded</th>
                <th className="text-left px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((entry, i) => {
                const isCheapest = entry.price_cents === cheapest
                const vendorData = entry.vendors

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-muted/30 ${isCheapest ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{vendorData.name}</span>
                        {vendorData.is_preferred && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {isCheapest && <Badge variant="success">Best Price</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatPrice(entry.price_cents)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">/{entry.unit}</td>
                    <td className="px-4 py-2 text-muted-foreground">{entry.recorded_at}</td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { searchDirectory, type DirectorySearchFilters } from '@/lib/community/directory-actions'
import { DirectoryListingCard } from './directory-listing-card'

const CUISINE_OPTIONS = [
  'American', 'Italian', 'French', 'Japanese', 'Mexican', 'Thai',
  'Indian', 'Mediterranean', 'Chinese', 'Korean', 'Caribbean',
  'Southern', 'BBQ', 'Seafood', 'Vegan', 'Farm-to-Table',
]

const DIETARY_OPTIONS = [
  'Gluten-Free', 'Vegan', 'Vegetarian', 'Keto', 'Paleo',
  'Halal', 'Kosher', 'Nut-Free', 'Dairy-Free', 'Low-Sodium',
]

const SERVICE_TYPE_OPTIONS = [
  'Private Dinner', 'Meal Prep', 'Catering', 'Cooking Class',
  'Event Chef', 'Personal Chef', 'Pop-Up', 'Corporate',
]

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
] as const

type SortOption = typeof SORT_OPTIONS[number]['value']

export function DirectorySearch() {
  const [results, setResults] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [hasSearched, setHasSearched] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('rating')

  // Filter state
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [dietarySpecialty, setDietarySpecialty] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [maxPriceDollars, setMaxPriceDollars] = useState('')

  function handleSearch() {
    const filters: DirectorySearchFilters = {}
    if (city.trim()) filters.city = city.trim()
    if (state.trim()) filters.state = state.trim()
    if (cuisine) filters.cuisine = cuisine
    if (dietarySpecialty) filters.dietarySpecialty = dietarySpecialty
    if (serviceType) filters.serviceType = serviceType
    if (maxPriceDollars) filters.maxPrice = Math.round(parseFloat(maxPriceDollars) * 100)

    startTransition(async () => {
      try {
        const data = await searchDirectory(filters)
        setResults(data)
        setHasSearched(true)
      } catch (err) {
        console.error('[directory-search] Search failed', err)
        setResults([])
        setHasSearched(true)
      }
    })
  }

  function handleClear() {
    setCity('')
    setState('')
    setCuisine('')
    setDietarySpecialty('')
    setServiceType('')
    setMaxPriceDollars('')
    setResults([])
    setHasSearched(false)
  }

  // Client-side sort
  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.rating_avg ?? 0) - (a.rating_avg ?? 0)
    }
    if (sortBy === 'price_low') {
      return (a.min_price_cents ?? 0) - (b.min_price_cents ?? 0)
    }
    if (sortBy === 'price_high') {
      return (b.max_price_cents ?? 0) - (a.max_price_cents ?? 0)
    }
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-lg font-semibold">Find a Chef</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Location */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Texas"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cuisine</label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Any cuisine</option>
              {CUISINE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Dietary */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Dietary Specialty</label>
            <select
              value={dietarySpecialty}
              onChange={(e) => setDietarySpecialty(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Any dietary need</option>
              {DIETARY_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Any service</option>
              {SERVICE_TYPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Max Price */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Max Price ($/person)</label>
            <input
              type="number"
              value={maxPriceDollars}
              onChange={(e) => setMaxPriceDollars(e.target.value)}
              placeholder="e.g. 150"
              min="0"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={handleClear}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sort + Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} chef{results.length !== 1 ? 's' : ''} found
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No chefs match your search. Try broadening your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((listing) => (
                <DirectoryListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

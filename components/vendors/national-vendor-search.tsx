'use client'

/**
 * National Vendor Search
 *
 * Search the national vendor directory (OSM specialty food data)
 * and add vendors to the chef's personal Call Sheet with one click.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createVendor } from '@/lib/vendors/actions'
import { NEUTRAL_VENDOR_SEARCH_PLACEHOLDER } from '@/lib/site/national-brand-copy'
import { Search, MapPin, Phone, Globe, Plus, Check, Map, List } from '@/components/ui/icons'
import { AddressHandoff, PhoneHandoff } from '@/components/ui/handoff-actions'
import { toast } from 'sonner'
import { VendorMapDynamic } from './vendor-map-dynamic'

type NationalVendor = {
  id: string
  name: string
  vendor_type: string
  address: string | null
  city: string
  state: string
  zip: string | null
  phone: string | null
  website: string | null
  lat: number | null
  lng: number | null
}

const VENDOR_TYPE_LABELS: Record<string, string> = {
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  greengrocer: 'Produce',
  farm: 'Farm',
  deli: 'Deli',
  cheese: 'Cheese',
  organic: 'Organic',
  specialty: 'Specialty',
  liquor: 'Liquor',
  bakery: 'Bakery',
  other: 'Other',
}

const VENDOR_TYPE_TO_DB: Record<string, string> = {
  butcher: 'butcher',
  fishmonger: 'fishmonger',
  greengrocer: 'produce',
  farm: 'farm',
  deli: 'specialty',
  cheese: 'specialty',
  organic: 'specialty',
  specialty: 'specialty',
  liquor: 'liquor',
  bakery: 'bakery',
  other: 'other',
}

const TYPE_COLORS: Record<string, string> = {
  butcher: 'bg-red-900/30 text-red-400',
  fishmonger: 'bg-blue-900/30 text-blue-400',
  greengrocer: 'bg-green-900/30 text-green-400',
  farm: 'bg-lime-900/30 text-lime-400',
  deli: 'bg-orange-900/30 text-orange-400',
  cheese: 'bg-yellow-900/30 text-yellow-400',
  organic: 'bg-emerald-900/30 text-emerald-400',
  specialty: 'bg-violet-900/30 text-violet-400',
  liquor: 'bg-purple-900/30 text-purple-400',
  bakery: 'bg-amber-900/30 text-amber-400',
}

const US_STATE_CODES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

export function NationalVendorSearch({ addedVendorIds }: { addedVendorIds?: Set<string> }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [results, setResults] = useState<NationalVendor[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState<Set<string>>(new Set(addedVendorIds))
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2 && !stateFilter) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (typeFilter) params.set('type', typeFilter)
        if (stateFilter) params.set('state', stateFilter)
        const res = await fetch(`/api/vendors/national-search?${params}`)
        const data = await res.json()
        setResults(data.vendors || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query, typeFilter, stateFilter])

  async function handleAdd(vendor: NationalVendor) {
    setAdding((prev) => ({ ...prev, [vendor.id]: true }))
    try {
      await createVendor({
        name: vendor.name,
        vendor_type: VENDOR_TYPE_TO_DB[vendor.vendor_type] || 'other',
        phone: vendor.phone || '',
        email: '',
        address: [vendor.address, vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', '),
        website: vendor.website || '',
        notes: `Added from national directory. OSM source.`,
        is_preferred: false,
      })
      setAdded((prev) => new Set([...prev, vendor.id]))
      toast.success(`${vendor.name} added to your vendors`)
      router.refresh()
    } catch (err) {
      toast.error('Failed to add vendor')
    } finally {
      setAdding((prev) => ({ ...prev, [vendor.id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Search controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={NEUTRAL_VENDOR_SEARCH_PLACEHOLDER}
            className="w-full pl-9 pr-3 py-2 text-sm bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by vendor type"
          className="text-sm bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All types</option>
          {Object.entries(VENDOR_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter by state"
          className="text-sm bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All states</option>
          {US_STATE_CODES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {/* List / Map toggle */}
        <div className="flex rounded-lg border border-stone-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-stone-700 text-stone-100'
                : 'bg-stone-900 text-stone-500 hover:text-stone-300'
            }`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-stone-700 text-stone-100'
                : 'bg-stone-900 text-stone-500 hover:text-stone-300'
            }`}
            aria-label="Map view"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && <p className="text-sm text-stone-500">Searching...</p>}

      {!loading && results.length === 0 && (query.length >= 2 || stateFilter) && (
        <p className="text-sm text-stone-500">
          No vendors found. Try a different search or state filter.
        </p>
      )}

      {/* Map view */}
      {viewMode === 'map' && !loading && (
        <VendorMapDynamic vendors={results} addedVendorIds={added} />
      )}

      {/* List view */}
      {viewMode === 'list' && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            {results.length} results
            {results.length === 30 ? ' (showing top 30, refine your search)' : ''}
          </p>
          <ul className="divide-y divide-stone-800 bg-stone-900 rounded-lg border border-stone-700 overflow-hidden">
            {results.map((vendor) => {
              const isAdded = added.has(vendor.id)
              const isAdding = adding[vendor.id]
              const typeColor = TYPE_COLORS[vendor.vendor_type] || 'bg-stone-800 text-stone-400'
              const vendorAddress = [vendor.address, vendor.city, vendor.state, vendor.zip]
                .filter(Boolean)
                .join(', ')
              return (
                <li key={vendor.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-200 truncate">
                        {vendor.name}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor}`}>
                        {VENDOR_TYPE_LABELS[vendor.vendor_type] || vendor.vendor_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <MapPin className="w-3 h-3" />
                        <AddressHandoff address={vendorAddress} lat={vendor.lat} lng={vendor.lng} />
                      </span>
                      {vendor.phone && (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Phone className="w-3 h-3" />
                          <PhoneHandoff phone={vendor.phone} />
                        </span>
                      )}
                      {vendor.website && (
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                        >
                          <Globe className="w-3 h-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => !isAdded && handleAdd(vendor)}
                    disabled={isAdded || isAdding}
                    className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                      isAdded
                        ? 'bg-emerald-900/30 text-emerald-400 cursor-default'
                        : isAdding
                          ? 'bg-stone-800 text-stone-500 cursor-wait'
                          : vendor.phone
                            ? 'bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 cursor-pointer'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700 cursor-pointer'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" /> Added
                      </>
                    ) : isAdding ? (
                      'Adding...'
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Add
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!query && !stateFilter && viewMode === 'list' && (
        <p className="text-sm text-stone-600">
          Search by vendor name, city, or filter by state to find specialty food suppliers near you.
        </p>
      )}
    </div>
  )
}

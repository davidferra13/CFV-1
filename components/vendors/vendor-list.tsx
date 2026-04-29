'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { getVendors, togglePreferred, deleteVendor } from '@/lib/vendors/vendor-actions'
import type { VendorCategory } from '@/lib/vendors/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Plus, Trash2, Search } from '@/components/ui/icons'
import {
  AddressHandoff,
  EmailHandoff,
  ExternalUrlHandoff,
  PhoneHandoff,
} from '@/components/ui/handoff-actions'
import { toast } from 'sonner'

type Vendor = {
  id: string
  name: string
  category: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  notes: string | null
  is_preferred: boolean
  rating: number | null
  created_at: string
  updated_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'Grocery',
  specialty: 'Specialty',
  farmers_market: 'Farmers Market',
  wholesale: 'Wholesale',
  equipment: 'Equipment',
  rental: 'Rental',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  grocery: 'success',
  specialty: 'info',
  farmers_market: 'success',
  wholesale: 'warning',
  equipment: 'default',
  rental: 'default',
  other: 'default',
}

export function VendorList({
  onEdit,
  onViewPrices,
  onAddNew,
}: {
  onEdit: (vendor: Vendor) => void
  onViewPrices: (vendor: Vendor) => void
  onAddNew: () => void
}) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | ''>('')
  const [preferredFilter, setPreferredFilter] = useState<boolean | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  const loadVendors = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getVendors({
        category: categoryFilter || undefined,
        isPreferred: preferredFilter,
      })
      setVendors(data as Vendor[])
    } catch (err) {
      console.error('Failed to load vendors:', err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, preferredFilter])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  function handleTogglePreferred(id: string) {
    const previous = [...vendors]
    setVendors((v) =>
      v.map((vendor) =>
        vendor.id === id ? { ...vendor, is_preferred: !vendor.is_preferred } : vendor
      )
    )
    startTransition(async () => {
      try {
        await togglePreferred(id)
      } catch {
        setVendors(previous)
        toast.error('Failed to update vendor preference')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this vendor? This will also remove all price history.')) return
    const previous = [...vendors]
    setVendors((v) => v.filter((vendor) => vendor.id !== id))
    startTransition(async () => {
      try {
        await deleteVendor(id)
      } catch {
        setVendors(previous)
        toast.error('Failed to delete vendor')
      }
    })
  }

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name && v.contact_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | '')}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={preferredFilter === undefined ? '' : preferredFilter ? 'yes' : 'no'}
          onChange={(e) => {
            const val = e.target.value
            setPreferredFilter(val === '' ? undefined : val === 'yes')
          }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All</option>
          <option value="yes">Preferred Only</option>
          <option value="no">Non-Preferred</option>
        </select>
        <Button variant="primary" onClick={onAddNew}>
          <Plus className="h-4 w-4 mr-1" />
          Add Vendor
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading vendors...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {vendors.length === 0
            ? 'No vendors yet. Add your first supplier to get started.'
            : 'No vendors match your filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => (
            <div
              key={vendor.id}
              className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onEdit(vendor)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base truncate flex-1 mr-2">{vendor.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTogglePreferred(vendor.id)
                  }}
                  className="shrink-0"
                  title={vendor.is_preferred ? 'Remove preferred' : 'Mark as preferred'}
                >
                  <Star
                    className={`h-5 w-5 ${
                      vendor.is_preferred
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              </div>

              <Badge variant={CATEGORY_COLORS[vendor.category] || 'default'}>
                {CATEGORY_LABELS[vendor.category] || vendor.category}
              </Badge>

              {vendor.rating && (
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < vendor.rating!
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              )}

              {vendor.contact_name && (
                <p className="text-sm text-muted-foreground mt-2 truncate">{vendor.contact_name}</p>
              )}
              {(vendor.phone || vendor.email || vendor.address || vendor.website) && (
                <div
                  className="mt-2 space-y-1 text-sm text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  {vendor.phone && <PhoneHandoff phone={vendor.phone} />}
                  {vendor.email && <EmailHandoff email={vendor.email} />}
                  {vendor.address && <AddressHandoff address={vendor.address} />}
                  {vendor.website && (
                    <ExternalUrlHandoff href={vendor.website} label="Open vendor website" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onViewPrices(vendor)
                  }}
                >
                  Prices
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleDelete(vendor.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

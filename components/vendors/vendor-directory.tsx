'use client'

// Vendor Directory — Client component with search, filter, reliability badges.
// Wraps server-provided vendor data with client-side interactivity.

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Vendor = {
  id: string
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  status: string
  payment_terms?: string | null
  delivery_days?: string[] | null
  reliability_score?: number | null
  minimum_order_cents?: number | null
  is_preferred?: boolean
  vendor_type?: string
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

function reliabilityBadge(score: number | null | undefined) {
  if (score == null) return null
  const rounded = Math.round(score)
  if (rounded >= 95) return <Badge variant="success">{rounded}% reliable</Badge>
  if (rounded >= 80) return <Badge variant="warning">{rounded}% reliable</Badge>
  return <Badge variant="error">{rounded}% reliable</Badge>
}

function formatTerms(terms: string | null | undefined): string {
  if (!terms) return ''
  const labels: Record<string, string> = {
    cod: 'COD',
    net_7: 'Net 7',
    net_15: 'Net 15',
    net_30: 'Net 30',
    prepaid: 'Prepaid',
  }
  return labels[terms] || terms
}

export function VendorDirectory({ vendors }: { vendors: Vendor[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.contact_name && v.contact_name.toLowerCase().includes(q)) ||
        (v.vendor_type && v.vendor_type.toLowerCase().includes(q))
    )
  }, [vendors, query])

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search vendors by name, contact, or type..."
        aria-label="Search vendors"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-500">
          {query ? 'No vendors match your search.' : 'No vendors yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
              <Card interactive className="mb-3">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-100">{vendor.name}</span>
                        <Badge variant={vendor.status === 'active' ? 'success' : 'default'}>
                          {vendor.status}
                        </Badge>
                        {vendor.is_preferred && <Badge variant="info">Preferred</Badge>}
                        {reliabilityBadge(vendor.reliability_score)}
                      </div>
                      {vendor.contact_name && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          Contact: {vendor.contact_name}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-stone-500">
                        {vendor.phone && <span>{vendor.phone}</span>}
                        {vendor.email && <span>{vendor.email}</span>}
                        {vendor.payment_terms && (
                          <span>Terms: {formatTerms(vendor.payment_terms)}</span>
                        )}
                        {vendor.minimum_order_cents != null && vendor.minimum_order_cents > 0 && (
                          <span>Min order: ${(vendor.minimum_order_cents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      {vendor.delivery_days && vendor.delivery_days.length > 0 && (
                        <div className="flex gap-1">
                          {vendor.delivery_days.map((day: string) => (
                            <span
                              key={day}
                              className="text-xs bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded"
                            >
                              {DAY_LABELS[day] || day}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

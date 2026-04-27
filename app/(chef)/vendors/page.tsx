// Vendor Directory - List all vendors with contact info, status, delivery days
// Part of the Vendor & Food Cost System

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listVendors } from '@/lib/vendors/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VendorFormWrapper } from '@/components/vendors/vendor-form-wrapper'

export const metadata: Metadata = { title: 'Vendors' }

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { q?: string; all?: string }
}) {
  await requireChef()

  const showAll = searchParams.all === '1'
  const allVendors = await listVendors(!showAll)
  const query = (searchParams.q ?? '').toLowerCase().trim()

  const vendors = query
    ? allVendors.filter(
        (v: any) =>
          v.name?.toLowerCase().includes(query) || v.contact_name?.toLowerCase().includes(query)
      )
    : allVendors

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Vendors</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your suppliers, track deliveries, and compare prices.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/food-cost">
            <Button variant="secondary" size="sm">
              Food Cost Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" action="/vendors" className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search vendors by name..."
            className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {showAll && <input type="hidden" name="all" value="1" />}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Search
          </button>
        </form>
        {showAll ? (
          <Link href="/vendors" className="text-sm text-brand-400 hover:text-brand-300">
            Active Only
          </Link>
        ) : (
          <Link href="/vendors?all=1" className="text-sm text-stone-400 hover:text-stone-300">
            Show Inactive
          </Link>
        )}
      </div>

      {/* Vendor list */}
      {vendors.length === 0 ? (
        <Card className="p-8 text-center">
          <svg
            className="h-10 w-10 mx-auto text-stone-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.99 2.99 0 00.62-1.098L4.8 4.5h14.4l1.18 3.75A2.99 2.99 0 0021 9.349"
            />
          </svg>
          <p className="text-stone-400 font-medium">
            {query ? 'No vendors match your search' : 'No vendors yet'}
          </p>
          <p className="text-xs text-stone-600 mt-1">
            {query ? 'Try a different search term' : 'Track your suppliers, farmers, and purveyors'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor: any) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
              <Card interactive className="mb-3">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {vendor.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vendor.logo_url}
                          alt={`${vendor.name} logo`}
                          className="h-8 w-8 rounded object-cover flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-stone-500">
                          {vendor.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-100">{vendor.name}</span>
                          <Badge variant={vendor.status === 'active' ? 'success' : 'default'}>
                            {vendor.status}
                          </Badge>
                        </div>
                        {vendor.contact_name && (
                          <p className="text-xs text-stone-400 mt-0.5">
                            Contact: {vendor.contact_name}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-stone-500">
                          {vendor.phone && <span>{vendor.phone}</span>}
                          {vendor.email && <span>{vendor.email}</span>}
                          {vendor.payment_terms && <span>Terms: {vendor.payment_terms}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
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

      {/* Add new vendor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorFormWrapper />
        </CardContent>
      </Card>
    </div>
  )
}

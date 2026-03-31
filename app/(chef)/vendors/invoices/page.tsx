// Vendor Invoices Page
// Log and view all vendor invoices across all vendors.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listInvoices } from '@/lib/vendors/invoice-actions'
import { listVendors } from '@/lib/vendors/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InvoiceForm } from '@/components/vendors/invoice-form'
import { InvoiceCsvUpload } from '@/components/vendors/invoice-csv-upload'

export const metadata: Metadata = { title: 'Vendor Invoices' }

export default async function VendorInvoicesPage({
  searchParams,
}: {
  searchParams: { vendor?: string }
}) {
  await requireChef()

  const [invoices, vendors] = await Promise.all([listInvoices(searchParams.vendor), listVendors()])

  // Build vendor name lookup
  const vendorMap = new Map(vendors.map((v: any) => [v.id, v.name]))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/vendors" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Vendor Directory
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Vendor Invoices</h1>
          <p className="mt-1 text-sm text-stone-500">
            Log purchases from vendors. Line items feed into food cost calculations.
          </p>
        </div>
        <Link href="/food-cost">
          <Button variant="secondary" size="sm">
            Food Cost Dashboard
          </Button>
        </Link>
      </div>

      {/* Filter by vendor */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/vendors/invoices">
          <Button variant={!searchParams.vendor ? 'primary' : 'ghost'} size="sm">
            All Vendors
          </Button>
        </Link>
        {vendors.map((v: any) => (
          <Link key={v.id} href={`/vendors/invoices?vendor=${v.id}`}>
            <Button variant={searchParams.vendor === v.id ? 'primary' : 'ghost'} size="sm">
              {v.name}
            </Button>
          </Link>
        ))}
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Invoices
            <Badge variant="default" className="ml-2">
              {invoices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-stone-500">No invoices logged yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between text-sm border-b border-stone-800 pb-2"
                >
                  <div>
                    <span className="text-stone-200 font-medium">
                      {String(vendorMap.get(invoice.vendor_id) ?? 'Unknown Vendor')}
                    </span>
                    {invoice.invoice_number && (
                      <span className="text-stone-400 ml-2">#{invoice.invoice_number}</span>
                    )}
                    <span className="text-stone-500 ml-2">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </span>
                    {invoice.notes && <span className="text-stone-400 ml-2">{invoice.notes}</span>}
                  </div>
                  <span className="text-stone-200 font-medium">
                    ${(invoice.total_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Invoice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceForm vendors={vendors} />
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import from CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceCsvUpload vendors={vendors} />
        </CardContent>
      </Card>
    </div>
  )
}

// Vendor Invoices Page
// List of uploaded invoices with status badges and links to individual matching views.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getVendorInvoices } from '@/lib/inventory/vendor-invoice-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UploadVendorInvoiceForm } from '@/components/inventory/upload-vendor-invoice-form'

export const metadata: Metadata = { title: 'Vendor Invoices - ChefFlow' }

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'matched':
      return 'success'
    case 'disputed':
      return 'error'
    case 'pending':
    default:
      return 'warning'
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default async function VendorInvoicesPage() {
  await requireChef()

  const invoices = await getVendorInvoices().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Inventory
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Vendor Invoices</h1>
          <p className="text-stone-500 mt-1">
            Upload vendor invoices, match line items to tracked ingredients, and flag price changes.
          </p>
        </div>
        <UploadVendorInvoiceForm />
      </div>

      {(invoices as any[]).length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No vendor invoices uploaded yet. Upload your first invoice to start matching line items
            to ingredients and tracking price changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(invoices as any[]).map((invoice: any) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100">
                      {invoice.invoiceNumber || 'No invoice number'}
                    </span>
                    <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-stone-500">
                    <span>{formatDate(invoice.invoiceDate)}</span>
                    <span>{formatMoney(invoice.totalCents)}</span>
                    <span>
                      {invoice.itemCount ?? invoice.items?.length ?? 0} item
                      {(invoice.itemCount ?? invoice.items?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/inventory/vendor-invoices/${invoice.id}`}
                  className="text-sm text-brand-600 hover:text-brand-400 font-medium shrink-0 ml-4"
                >
                  View &rarr;
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

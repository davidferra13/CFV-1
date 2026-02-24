// Vendor Detail — Vendor info, price list, invoice history
// Part of the Vendor & Food Cost System

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getVendor, deactivateVendor, listVendors } from '@/lib/vendors/actions'
import { listInvoices } from '@/lib/vendors/invoice-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VendorForm } from '@/components/vendors/vendor-form'
import { VendorPriceList } from '@/components/vendors/vendor-price-list'
import { InvoiceForm } from '@/components/vendors/invoice-form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Vendor Detail — ChefFlow' }

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export default async function VendorDetailPage({ params }: { params: { id: string } }) {
  await requireChef()

  const vendor = await getVendor(params.id)
  const invoices = await listInvoices(params.id)
  const allVendors = await listVendors()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/vendors" className="hover:text-stone-300">
          Vendors
        </Link>
        <span>/</span>
        <span className="text-stone-300">{vendor.name}</span>
      </div>

      {/* Vendor info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{vendor.name}</CardTitle>
            <Badge variant={vendor.status === 'active' ? 'success' : 'default'}>
              {vendor.status}
            </Badge>
          </div>
          {vendor.status === 'active' && (
            <form
              action={async () => {
                'use server'
                await deactivateVendor(vendor.id)
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="text-stone-400">
                Deactivate
              </Button>
            </form>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {vendor.contact_name && (
              <div>
                <span className="text-stone-500">Contact</span>
                <p className="text-stone-200">{vendor.contact_name}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <span className="text-stone-500">Phone</span>
                <p className="text-stone-200">{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <span className="text-stone-500">Email</span>
                <p className="text-stone-200">{vendor.email}</p>
              </div>
            )}
            {vendor.account_number && (
              <div>
                <span className="text-stone-500">Account #</span>
                <p className="text-stone-200">{vendor.account_number}</p>
              </div>
            )}
            {vendor.payment_terms && (
              <div>
                <span className="text-stone-500">Payment Terms</span>
                <p className="text-stone-200">{vendor.payment_terms}</p>
              </div>
            )}
            {vendor.delivery_days && vendor.delivery_days.length > 0 && (
              <div>
                <span className="text-stone-500">Delivery Days</span>
                <p className="text-stone-200">
                  {vendor.delivery_days.map((d: string) => DAY_LABELS[d] || d).join(', ')}
                </p>
              </div>
            )}
          </div>
          {vendor.notes && (
            <div>
              <span className="text-stone-500 text-sm">Notes</span>
              <p className="text-stone-300 text-sm mt-0.5">{vendor.notes}</p>
            </div>
          )}

          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-brand-400 hover:text-brand-300">
              Edit Vendor Info
            </summary>
            <div className="mt-3">
              <VendorForm vendor={vendor} />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Price list */}
      <VendorPriceList vendorId={vendor.id} items={vendor.items ?? []} />

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-stone-500">No invoices recorded for this vendor yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-stone-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Invoice #</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-stone-800">
                      <td className="py-2 pr-4 text-stone-300">{inv.invoice_date}</td>
                      <td className="py-2 pr-4 text-stone-400">{inv.invoice_number || '—'}</td>
                      <td className="py-2 pr-4 text-stone-200 font-medium">
                        ${(inv.total_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-stone-500 text-xs truncate max-w-[200px]">
                        {inv.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add invoice */}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-400 hover:text-brand-300">
          + Log New Invoice
        </summary>
        <div className="mt-4">
          <InvoiceForm vendors={allVendors} defaultVendorId={vendor.id} />
        </div>
      </details>
    </div>
  )
}

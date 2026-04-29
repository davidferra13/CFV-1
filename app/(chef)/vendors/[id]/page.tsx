// Vendor Detail - Vendor info, price list, invoice history
// Part of the Vendor & Food Cost System

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getVendor, deactivateVendor, listVendors } from '@/lib/vendors/actions'
import { listInvoices } from '@/lib/vendors/invoice-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VendorFormWrapper } from '@/components/vendors/vendor-form-wrapper'
import { VendorPriceList } from '@/components/vendors/vendor-price-list'
import { VendorCatalogReviewQueue } from '@/components/vendors/vendor-catalog-review-queue'
import { listVendorCatalogQueue } from '@/lib/vendors/catalog-import-actions'
import { VendorDocumentIntake } from '@/components/vendors/vendor-document-intake'
import { listVendorDocumentUploads } from '@/lib/vendors/document-intake-actions'
import { getVendorPriceInsights } from '@/lib/vendors/price-insights-actions'
import { VendorPriceInsights } from '@/components/vendors/vendor-price-insights'
import { VendorPriceAlertSettings } from '@/components/vendors/vendor-price-alert-settings'
import { InvoiceForm } from '@/components/vendors/invoice-form'
import { VendorComparisonPanel } from '@/components/inventory/vendor-comparison-panel'
import { EntityPhotoUpload } from '@/components/entities/entity-photo-upload'
import {
  AddressHandoff,
  EmailHandoff,
  ExternalUrlHandoff,
  PhoneHandoff,
} from '@/components/ui/handoff-actions'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Vendor Detail' }

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params

  let vendor: Awaited<ReturnType<typeof getVendor>>
  try {
    vendor = await getVendor(id)
  } catch {
    notFound()
  }
  const [invoices, allVendors, pendingCatalogRows, vendorUploads, vendorInsights] =
    await Promise.all([
      listInvoices(id),
      listVendors(),
      listVendorCatalogQueue(vendor.id, 'pending'),
      listVendorDocumentUploads(vendor.id, 30),
      getVendorPriceInsights({
        vendorId: vendor.id,
        limit: 10,
        trendItems: 6,
        pointsPerTrend: 8,
        lookbackDays: 180,
      }),
    ])

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
            <EntityPhotoUpload
              entityType="vendor"
              entityId={vendor.id}
              currentPhotoUrl={(vendor as any).logo_url ?? null}
              compact
              label="Add logo"
            />
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
            {(vendor as any).contact_name && (
              <div>
                <span className="text-stone-500">Contact</span>
                <p className="text-stone-200">{(vendor as any).contact_name}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <span className="text-stone-500">Phone</span>
                <p className="text-stone-200">
                  <PhoneHandoff phone={vendor.phone} />
                </p>
              </div>
            )}
            {vendor.email && (
              <div>
                <span className="text-stone-500">Email</span>
                <p className="text-stone-200">
                  <EmailHandoff
                    email={vendor.email}
                    subject={`ChefFlow order for ${vendor.name}`}
                  />
                </p>
              </div>
            )}
            {(vendor as any).address && (
              <div>
                <span className="text-stone-500">Address</span>
                <p className="text-stone-200">
                  <AddressHandoff address={(vendor as any).address} />
                </p>
              </div>
            )}
            {(vendor as any).website && (
              <div>
                <span className="text-stone-500">Website</span>
                <p className="text-stone-200">
                  <ExternalUrlHandoff href={(vendor as any).website} label="Open vendor website" />
                </p>
              </div>
            )}
            {(vendor as any).account_number && (
              <div>
                <span className="text-stone-500">Account #</span>
                <p className="text-stone-200">{(vendor as any).account_number}</p>
              </div>
            )}
            {(vendor as any).payment_terms && (
              <div>
                <span className="text-stone-500">Payment Terms</span>
                <p className="text-stone-200">{(vendor as any).payment_terms}</p>
              </div>
            )}
            {(vendor as any).delivery_days && (vendor as any).delivery_days.length > 0 && (
              <div>
                <span className="text-stone-500">Delivery Days</span>
                <p className="text-stone-200">
                  {(vendor as any).delivery_days.map((d: string) => DAY_LABELS[d] || d).join(', ')}
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
              <VendorFormWrapper vendor={vendor} />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Price list */}
      <VendorPriceList vendorId={vendor.id} items={vendor.items ?? []} />

      {/* Cross-vendor price comparison for this vendor's top ingredient */}
      {(vendor.items ?? []).length > 0 && (
        <VendorComparisonPanel
          ingredientName={(vendor.items as any[])[0]?.ingredient_name ?? ''}
          ingredientId={(vendor.items as any[])[0]?.ingredient_id}
        />
      )}

      {/* Price alerts + trend */}
      <VendorPriceInsights
        alerts={vendorInsights.alerts}
        trends={vendorInsights.trends}
        title="This Vendor Price Alerts & Trends"
        thresholdPercent={vendorInsights.thresholdPercent}
      />
      <VendorPriceAlertSettings
        vendorId={vendor.id}
        thresholdPercent={vendorInsights.thresholdPercent}
      />

      {/* Supplier file intake */}
      <VendorDocumentIntake vendorId={vendor.id} uploads={vendorUploads} />

      {/* Catalog review queue */}
      <VendorCatalogReviewQueue vendorId={vendor.id} rows={pendingCatalogRows} />

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-6">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-sm text-stone-400 font-medium">No invoices recorded yet</p>
              <p className="text-xs text-stone-600 mt-1">Upload or log invoices from this vendor</p>
            </div>
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
                      <td className="py-2 pr-4 text-stone-400">{inv.invoice_number || '-'}</td>
                      <td className="py-2 pr-4 text-stone-200 font-medium">
                        ${(inv.total_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-stone-500 text-xs truncate max-w-[200px]">
                        {inv.notes || '-'}
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

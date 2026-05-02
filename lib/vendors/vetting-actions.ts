'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// Supplier Vetting Checklist - derived from existing vendor data.
// Module: operations (supply-chain nav group)
// No new tables. Checklist items computed from what data exists.

export type VettingItem = {
  key: string
  label: string
  description: string
  met: boolean
  detail: string | null
}

export type VettingStatus = 'unvetted' | 'partial' | 'vetted'

export type VendorVettingResult = {
  vendorId: string
  vendorName: string
  status: VettingStatus
  completedCount: number
  totalCount: number
  completionPct: number
  items: VettingItem[]
}

/**
 * Compute supplier vetting checklist from existing vendor data.
 * Each item checks whether a real data point exists.
 * Formula > AI: all checks are deterministic lookups.
 */
export async function getVendorVetting(vendorId: string): Promise<VendorVettingResult | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const vendorRows = await db
    .from('vendors')
    .select('id, name, phone, email, contact_name, website, address, notes, is_preferred, status')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)

  if (!vendorRows.length) return null
  const vendor = vendorRows[0] as any

  // Parallel data checks
  const [invoiceRows, itemRows, docRows] = await Promise.all([
    db.from('vendor_invoices').select('id').eq('vendor_id', vendorId).eq('chef_id', tenantId),
    db.from('vendor_items').select('id').eq('vendor_id', vendorId).eq('chef_id', tenantId),
    db
      .from('vendor_document_uploads')
      .select('id, document_type, status')
      .eq('vendor_id', vendorId)
      .eq('chef_id', tenantId),
  ])

  const hasSupplierDocs = docRows.some(
    (d: any) => d.document_type === 'supplier_doc' && d.status === 'completed'
  )
  const hasCatalog = docRows.some((d: any) => d.document_type === 'catalog') || itemRows.length >= 3
  const hasInvoiceHistory = invoiceRows.length >= 1

  const items: VettingItem[] = [
    {
      key: 'contact_info',
      label: 'Contact Information',
      description: 'Phone and email on file',
      met: !!(vendor.phone && vendor.email),
      detail:
        vendor.phone && vendor.email
          ? `${vendor.phone}, ${vendor.email}`
          : vendor.phone || vendor.email || null,
    },
    {
      key: 'contact_person',
      label: 'Contact Person',
      description: 'Named contact at the vendor',
      met: !!vendor.contact_name,
      detail: vendor.contact_name || null,
    },
    {
      key: 'address',
      label: 'Business Address',
      description: 'Physical address on file',
      met: !!vendor.address,
      detail: vendor.address || null,
    },
    {
      key: 'catalog',
      label: 'Product Catalog',
      description: 'At least 3 items tracked or catalog uploaded',
      met: hasCatalog,
      detail: hasCatalog ? `${itemRows.length} items tracked` : null,
    },
    {
      key: 'invoice_history',
      label: 'Invoice History',
      description: 'At least one invoice on record',
      met: hasInvoiceHistory,
      detail: hasInvoiceHistory ? `${invoiceRows.length} invoices` : null,
    },
    {
      key: 'supplier_docs',
      label: 'Supplier Documentation',
      description: 'Insurance, food safety cert, or license uploaded',
      met: hasSupplierDocs,
      detail: hasSupplierDocs ? 'Documents verified' : null,
    },
    {
      key: 'website',
      label: 'Website / Online Presence',
      description: 'Website URL on file',
      met: !!vendor.website,
      detail: vendor.website || null,
    },
    {
      key: 'preferred',
      label: 'Preferred Status',
      description: 'Marked as preferred vendor',
      met: !!vendor.is_preferred,
      detail: vendor.is_preferred ? 'Preferred' : null,
    },
  ]

  const completedCount = items.filter((i) => i.met).length
  const totalCount = items.length
  const completionPct = Math.round((completedCount / totalCount) * 100)

  const status: VettingStatus =
    completionPct >= 75 ? 'vetted' : completionPct >= 37 ? 'partial' : 'unvetted'

  return {
    vendorId,
    vendorName: vendor.name,
    status,
    completedCount,
    totalCount,
    completionPct,
    items,
  }
}

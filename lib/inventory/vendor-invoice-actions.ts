// Vendor Invoice Server Actions
// Chef-only: Upload invoices, match line items to ingredients, flag price changes

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type VendorInvoiceItem = {
  id: string
  vendorInvoiceId: string
  itemName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  matchedIngredientId: string | null
  priceChanged: boolean
}

export type VendorInvoice = {
  id: string
  chefId: string
  vendorId: string | null
  invoiceNumber: string
  invoiceDate: string
  totalCents: number
  photoUrl: string | null
  status: 'pending' | 'matched' | 'disputed'
  items: VendorInvoiceItem[]
  createdAt: string
  updatedAt: string
}

export type VendorInvoiceListItem = Omit<VendorInvoice, 'items'> & {
  itemCount: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const InvoiceItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPriceCents: z.number().int().min(0, 'Unit price cannot be negative'),
  totalCents: z.number().int().min(0, 'Total cannot be negative'),
})

const UploadVendorInvoiceSchema = z.object({
  vendorId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  totalCents: z.number().int().min(0, 'Total cannot be negative'),
  photoUrl: z.string().url().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
})

export type UploadVendorInvoiceInput = z.infer<typeof UploadVendorInvoiceSchema>

const MatchItemSchema = z.object({
  itemId: z.string().uuid(),
  ingredientId: z.string().uuid(),
})

const MatchInvoiceItemsSchema = z.object({
  invoiceId: z.string().uuid(),
  matches: z.array(MatchItemSchema).min(1, 'At least one match is required'),
})

const InvoiceFilterSchema = z.object({
  vendorId: z.string().uuid().optional(),
  status: z.enum(['pending', 'matched', 'disputed']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type InvoiceFilters = z.infer<typeof InvoiceFilterSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Upload a vendor invoice with line items.
 * Inserts the invoice header and all line items in sequence.
 */
export async function uploadVendorInvoice(input: UploadVendorInvoiceInput): Promise<VendorInvoice> {
  const user = await requireChef()
  const parsed = UploadVendorInvoiceSchema.parse(input)
  const db: any = createServerClient()

  // Insert the invoice header
  // vendor_invoices.invoice_number is nullable in DB but we require it in schema
  const { data: invoice, error: invoiceError } = await (db.from('vendor_invoices') as any)
    .insert({
      chef_id: user.tenantId!,
      vendor_id: parsed.vendorId ?? null,
      invoice_number: parsed.invoiceNumber,
      invoice_date: parsed.invoiceDate,
      total_cents: parsed.totalCents,
      photo_url: parsed.photoUrl ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (invoiceError) throw new Error(`Failed to create invoice: ${(invoiceError as any).message}`)

  // Insert line items
  const itemRows = parsed.items.map((item) => ({
    vendor_invoice_id: (invoice as any).id,
    item_name: item.itemName,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    total_cents: item.totalCents,
    matched_ingredient_id: null,
    price_changed: false,
  }))

  const { data: items, error: itemsError } = await (db.from('vendor_invoice_items') as any)
    .insert(itemRows)
    .select()

  if (itemsError) throw new Error(`Failed to create invoice items: ${(itemsError as any).message}`)

  revalidatePath('/inventory/invoices')

  return {
    id: (invoice as any).id,
    chefId: (invoice as any).chef_id,
    vendorId: (invoice as any).vendor_id,
    invoiceNumber: (invoice as any).invoice_number,
    invoiceDate: (invoice as any).invoice_date,
    totalCents: (invoice as any).total_cents,
    photoUrl: (invoice as any).photo_url,
    status: (invoice as any).status,
    items: ((items || []) as any[]).map((row: any) => ({
      id: row.id,
      vendorInvoiceId: row.vendor_invoice_id,
      itemName: row.item_name,
      quantity: Number(row.quantity),
      unitPriceCents: row.unit_price_cents,
      totalCents: row.total_cents,
      matchedIngredientId: row.matched_ingredient_id,
      priceChanged: row.price_changed,
    })),
    createdAt: (invoice as any).created_at,
    updatedAt: (invoice as any).updated_at,
  }
}

/**
 * Match invoice line items to ingredients in the system.
 * Updates the matched_ingredient_id on each specified item.
 */
export async function matchInvoiceItems(
  invoiceId: string,
  matches: { itemId: string; ingredientId: string }[]
): Promise<void> {
  const user = await requireChef()
  const parsed = MatchInvoiceItemsSchema.parse({ invoiceId, matches })
  const db: any = createServerClient()

  // Verify the invoice belongs to this chef
  const { data: invoice, error: verifyError } = await (db.from('vendor_invoices') as any)
    .select('id')
    .eq('id', parsed.invoiceId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (verifyError || !invoice) throw new Error('Invoice not found or access denied')

  // Update each item's matched_ingredient_id
  for (const match of parsed.matches) {
    const { error } = await (db.from('vendor_invoice_items') as any)
      .update({ matched_ingredient_id: match.ingredientId })
      .eq('id', match.itemId)
      .eq('vendor_invoice_id', parsed.invoiceId)

    if (error) throw new Error(`Failed to match item ${match.itemId}: ${(error as any).message}`)
  }

  // Check if all items on the invoice are now matched
  const { data: allItems } = await (db.from('vendor_invoice_items') as any)
    .select('matched_ingredient_id')
    .eq('vendor_invoice_id', parsed.invoiceId)

  const allMatched = ((allItems || []) as any[]).every(
    (item: any) => item.matched_ingredient_id !== null
  )

  // If all items are matched, update invoice status to 'matched'
  if (allMatched) {
    await (db.from('vendor_invoices') as any)
      .update({ status: 'matched' })
      .eq('id', parsed.invoiceId)
      .eq('chef_id', user.tenantId!)
  }

  revalidatePath('/inventory/invoices')
}

/**
 * Get vendor invoices with optional filters.
 * Returns invoices with their line items embedded.
 */
export async function getVendorInvoices(filters?: InvoiceFilters): Promise<VendorInvoice[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db.from('vendor_invoices') as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('invoice_date', { ascending: false })
    .limit(200)

  if (filters?.vendorId) query = query.eq('vendor_id', filters.vendorId)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.startDate) query = query.gte('invoice_date', filters.startDate)
  if (filters?.endDate) query = query.lte('invoice_date', filters.endDate)

  const { data: invoices, error } = await query

  if (error) throw new Error(`Failed to fetch invoices: ${(error as any).message}`)

  // Fetch items for all invoices in one query
  const invoiceIds = ((invoices || []) as any[]).map((inv: any) => inv.id)

  if (invoiceIds.length === 0) return []

  const { data: allItems, error: itemsError } = await (db.from('vendor_invoice_items') as any)
    .select('*')
    .in('vendor_invoice_id', invoiceIds)

  if (itemsError) throw new Error(`Failed to fetch invoice items: ${(itemsError as any).message}`)

  // Group items by invoice_id
  const itemsByInvoice = new Map<string, any[]>()
  for (const item of (allItems || []) as any[]) {
    const list = itemsByInvoice.get(item.vendor_invoice_id) || []
    list.push(item)
    itemsByInvoice.set(item.vendor_invoice_id, list)
  }

  return ((invoices || []) as any[]).map((inv: any) => ({
    id: inv.id,
    chefId: inv.chef_id,
    vendorId: inv.vendor_id,
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    totalCents: inv.total_cents,
    photoUrl: inv.photo_url,
    status: inv.status,
    items: (itemsByInvoice.get(inv.id) || []).map((row: any) => ({
      id: row.id,
      vendorInvoiceId: row.vendor_invoice_id,
      itemName: row.item_name,
      quantity: Number(row.quantity),
      unitPriceCents: row.unit_price_cents,
      totalCents: row.total_cents,
      matchedIngredientId: row.matched_ingredient_id,
      priceChanged: row.price_changed,
    })),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  }))
}

/**
 * Flag a specific invoice line item as having a price change.
 */
export async function flagPriceChange(invoiceItemId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the item belongs to an invoice owned by this chef
  const { data: item, error: fetchError } = await (db.from('vendor_invoice_items') as any)
    .select('vendor_invoice_id')
    .eq('id', invoiceItemId)
    .single()

  if (fetchError || !item) throw new Error('Invoice item not found')

  const { data: invoice, error: verifyError } = await (db.from('vendor_invoices') as any)
    .select('id')
    .eq('id', (item as any).vendor_invoice_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (verifyError || !invoice) throw new Error('Invoice not found or access denied')

  const { error } = await (db.from('vendor_invoice_items') as any)
    .update({ price_changed: true })
    .eq('id', invoiceItemId)

  if (error) throw new Error(`Failed to flag price change: ${(error as any).message}`)

  revalidatePath('/inventory/invoices')
}

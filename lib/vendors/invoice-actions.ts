'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0),
  unit_price_cents: z.number().int().min(0),
  total_cents: z.number().int().min(0),
})

const CreateInvoiceSchema = z.object({
  vendor_id: z.string().uuid(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  total_cents: z.number().int().min(0),
  notes: z.string().optional(),
  line_items: z.array(InvoiceLineItemSchema).default([]),
})

export type InvoiceLineItemInput = z.infer<typeof InvoiceLineItemSchema>
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>

// ============================================
// INVOICE CRUD
// ============================================

export async function createInvoice(input: CreateInvoiceInput) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = CreateInvoiceSchema.parse(input)

  // Insert the invoice
  const { data: invoice, error: invoiceError } = await db
    .from('vendor_invoices')
    .insert({
      vendor_id: data.vendor_id,
      invoice_number: data.invoice_number || null,
      invoice_date: data.invoice_date,
      total_cents: data.total_cents,
      notes: data.notes || null,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (invoiceError) {
    console.error('[invoices] createInvoice error:', invoiceError)
    throw new Error('Failed to create invoice')
  }

  // Insert line items if any
  if (data.line_items.length > 0) {
    const lineItemRows = data.line_items.map((li) => ({
      invoice_id: invoice.id,
      description: li.description,
      quantity: li.quantity,
      unit_price_cents: li.unit_price_cents,
      total_cents: li.total_cents,
      chef_id: user.tenantId!,
    }))

    const { error: lineError } = await db.from('vendor_invoice_line_items').insert(lineItemRows)

    if (lineError) {
      console.error('[invoices] createInvoice lineItems error:', lineError)
      // Invoice was created, but line items failed - log and continue
    }
  }

  revalidatePath('/vendors')
  revalidatePath('/food-cost')
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'vendor_invoices',
      action: 'insert',
      reason: 'Invoice created',
    })
  } catch {}
  return invoice
}

export async function listInvoices(vendorId?: string, startDate?: string, endDate?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  let q = db
    .from('vendor_invoices')
    .select('*, vendors(name)')
    .eq('chef_id', user.tenantId!)
    .order('invoice_date', { ascending: false })

  if (vendorId) {
    q = q.eq('vendor_id', vendorId)
  }
  if (startDate) {
    q = q.gte('invoice_date', startDate)
  }
  if (endDate) {
    q = q.lte('invoice_date', endDate)
  }

  const { data, error } = await q

  if (error) {
    console.error('[invoices] listInvoices error:', error)
    throw new Error('Failed to list invoices')
  }

  return data ?? []
}

export async function getInvoice(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: invoice, error } = await db
    .from('vendor_invoices')
    .select('*, vendors(name)')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[invoices] getInvoice error:', error)
    throw new Error('Invoice not found')
  }

  // Fetch line items
  const { data: lineItems } = await db
    .from('vendor_invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: true })

  return { ...invoice, line_items: lineItems ?? [] }
}

export async function deleteInvoice(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Delete line items first (cascade may handle this, but be explicit)
  await db
    .from('vendor_invoice_line_items')
    .delete()
    .eq('invoice_id', id)
    .eq('chef_id', user.tenantId!)

  const { error } = await db
    .from('vendor_invoices')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[invoices] deleteInvoice error:', error)
    throw new Error('Failed to delete invoice')
  }

  revalidatePath('/vendors')
  revalidatePath('/food-cost')
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'vendor_invoices',
      action: 'delete',
      reason: 'Invoice deleted',
    })
  } catch {}
}

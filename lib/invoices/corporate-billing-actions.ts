'use server'

// Corporate Billing Actions
// Manage "Bill To" fields on events and chef invoice settings.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ─── Update Corporate Billing on Event ──────────────────────────────────────

const CorporateBillingSchema = z.object({
  eventId: z.string().uuid(),
  billToCompany: z.string().max(200).nullable(),
  billToAttention: z.string().max(200).nullable(),
  billToPoNumber: z.string().max(100).nullable(),
})

export async function updateEventCorporateBilling(input: z.infer<typeof CorporateBillingSchema>) {
  const user = await requireChef()
  const parsed = CorporateBillingSchema.parse(input)
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      bill_to_company: parsed.billToCompany || null,
      bill_to_attention: parsed.billToAttention || null,
      bill_to_po_number: parsed.billToPoNumber || null,
    })
    .eq('id', parsed.eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to update corporate billing fields')
  }

  revalidatePath(`/events/${parsed.eventId}/invoice`)
  revalidatePath(`/events/${parsed.eventId}`)
}

// ─── Update Chef Invoice Settings ──────────────────────────────────────────

const InvoiceSettingsSchema = z.object({
  paymentTerms: z.string().max(200).nullable(),
  taxId: z.string().max(50).nullable(),
  footerNote: z.string().max(500).nullable(),
})

export type ChefInvoiceSettings = {
  paymentTerms: string | null
  taxId: string | null
  footerNote: string | null
}

export async function getChefInvoiceSettings(): Promise<ChefInvoiceSettings> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chefs')
    .select('invoice_payment_terms, invoice_tax_id, invoice_footer_note')
    .eq('id', user.entityId)
    .single()

  return {
    paymentTerms: data?.invoice_payment_terms ?? null,
    taxId: data?.invoice_tax_id ?? null,
    footerNote: data?.invoice_footer_note ?? null,
  }
}

export async function updateChefInvoiceSettings(
  input: z.infer<typeof InvoiceSettingsSchema>
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const parsed = InvoiceSettingsSchema.parse(input)
  const db: any = createServerClient()

  const { error } = await db
    .from('chefs')
    .update({
      invoice_payment_terms: parsed.paymentTerms || null,
      invoice_tax_id: parsed.taxId || null,
      invoice_footer_note: parsed.footerNote || null,
    })
    .eq('id', user.entityId)

  if (error) {
    throw new Error('Failed to update invoice settings')
  }

  revalidatePath('/settings/invoice')
  return { success: true }
}

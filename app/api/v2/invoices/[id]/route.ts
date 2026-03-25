// API v2: Invoices - Get & Update by ID
// GET   /api/v2/invoices/:id
// PATCH /api/v2/invoices/:id
//
// Invoices are computed views over events + ledger_entries.
// The "id" here is the event ID. PATCH can assign/update invoice metadata.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateInvoiceBody = z
  .object({
    invoice_number: z.string().min(1).optional(),
    invoice_issued_at: z.string().optional(),
    invoice_notes: z.string().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Invoice')

    const { data, error } = await ctx.db
      .from('events')
      .select(
        'id, status, occasion, event_date, guest_count, quoted_price_cents, invoice_number, invoice_issued_at, invoice_notes, client:clients(id, full_name, email)'
      )
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .not('invoice_number', 'is', null)
      .single()

    if (error || !data) return apiNotFound('Invoice')
    return apiSuccess(data)
  },
  { scopes: ['finance:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Invoice')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateInvoiceBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify event belongs to tenant and has an invoice
    const { data: existing } = await ctx.db
      .from('events')
      .select('id, invoice_number')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Invoice')

    // If no invoice_number yet and one is being set, allow it.
    // If no invoice_number yet and none is being set, reject.
    if (!existing.invoice_number && !parsed.data.invoice_number) {
      return apiError(
        'no_invoice',
        'This event does not have an invoice yet. Provide invoice_number to assign one.',
        422
      )
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.invoice_number !== undefined) {
      updatePayload.invoice_number = parsed.data.invoice_number
    }
    if (parsed.data.invoice_issued_at !== undefined) {
      updatePayload.invoice_issued_at = parsed.data.invoice_issued_at
    }
    if (parsed.data.invoice_notes !== undefined) {
      updatePayload.invoice_notes = parsed.data.invoice_notes
    }

    const { data, error } = await ctx.db
      .from('events')
      .update(updatePayload as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select(
        'id, status, occasion, event_date, guest_count, quoted_price_cents, invoice_number, invoice_issued_at, invoice_notes, client:clients(id, full_name, email)'
      )
      .single()

    if (error) {
      console.error('[api/v2/invoices] Update error:', error)
      return apiError('update_failed', 'Failed to update invoice', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['finance:write'] }
)

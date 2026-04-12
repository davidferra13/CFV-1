// API v2: Document Generation
// POST /api/v2/documents/generate
// Body: { event_id: "...", type: "invoice" | "receipt" | "quote" | "contract" | "summary" | ... | "all" }
//
// Returns a PDF binary for document types (invoice, receipt, quote, contract).
// Returns JSON snapshot status for operational event packet types.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  SNAPSHOT_DOCUMENT_TYPES,
  isSnapshotDocumentType,
} from '@/lib/documents/document-definitions'
import { withApiAuth, apiSuccess, apiValidationError, apiError, apiNotFound } from '@/lib/api/v2'
import { getInvoiceDataByTenant } from '@/lib/events/invoice-actions'
import { generateInvoicePDF } from '@/lib/documents/generate-invoice'
import { generateReceiptByTenant } from '@/lib/documents/generate-receipt'
import { fetchQuoteDocumentDataByTenant, renderQuote } from '@/lib/documents/generate-quote'
import { fetchContractData, renderContract } from '@/lib/documents/generate-contract'
import { PDFLayout } from '@/lib/documents/pdf-layout'

const SnapshotDocumentTypeSchema = z.enum(SNAPSHOT_DOCUMENT_TYPES)
const LegacyDocumentTypeSchema = z.enum([
  'invoice',
  'quote',
  'receipt',
  'contract',
  'menu',
  'prep_list',
  'grocery_list',
  'timeline',
])

const GenerateDocBody = z.object({
  event_id: z.string().uuid(),
  type: z.union([SnapshotDocumentTypeSchema, LegacyDocumentTypeSchema]),
})

// Legacy aliases that map to operational snapshot types
const LEGACY_ALIAS: Record<string, string> = {
  menu: 'foh',
  prep_list: 'prep',
  grocery_list: 'grocery',
  timeline: 'execution',
}

function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = GenerateDocBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    let { event_id, type } = parsed.data

    // Verify event belongs to tenant
    const { data: event } = await ctx.db
      .from('events')
      .select('id, status, tenant_id')
      .eq('id', event_id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) return apiNotFound('Event')

    // Remap legacy aliases to operational snapshot types
    if (LEGACY_ALIAS[type]) {
      type = LEGACY_ALIAS[type] as typeof type
    }

    // Operational snapshot types - return JSON status
    if (isSnapshotDocumentType(type)) {
      const { data: existing } = await ctx.db
        .from('event_document_snapshots' as any)
        .select('id, document_type, version_number, filename, generated_at')
        .eq('event_id', event_id)
        .eq('document_type', type)
        .eq('tenant_id', ctx.tenantId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return apiSuccess({
        event_id,
        document_type: type,
        existing_snapshot: existing ?? null,
        supported: true,
        message: existing
          ? `Existing ${type} snapshot found. Use GET /api/v2/documents to inspect archived snapshots.`
          : `No ${type} snapshot exists yet. Use the internal document generation UI to generate one.`,
        internal_generation_endpoint: `/api/documents/${event_id}?type=${type}`,
        supported_types: SNAPSHOT_DOCUMENT_TYPES,
      })
    }

    // PDF document types - generate and return binary PDF
    try {
      if (type === 'invoice') {
        const data = await getInvoiceDataByTenant(event_id, ctx.tenantId)
        if (!data) return apiNotFound('Invoice data')
        const buffer = generateInvoicePDF(data)
        const filename = `invoice-${event_id.slice(0, 8)}.pdf`
        return pdfResponse(buffer, filename)
      }

      if (type === 'receipt') {
        const buffer = await generateReceiptByTenant(event_id, ctx.tenantId)
        const filename = `receipt-${event_id.slice(0, 8)}.pdf`
        return pdfResponse(buffer, filename)
      }

      if (type === 'quote') {
        // Look up latest quote for this event
        const { data: quoteRow } = await ctx.db
          .from('quotes')
          .select('id')
          .eq('event_id', event_id)
          .eq('tenant_id', ctx.tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!quoteRow) return apiNotFound('Quote for this event')

        const data = await fetchQuoteDocumentDataByTenant(quoteRow.id, ctx.tenantId)
        if (!data) return apiNotFound('Quote document data')

        const pdf = new PDFLayout()
        renderQuote(pdf, data)
        const buffer = pdf.toBuffer()
        const filename = `quote-${event_id.slice(0, 8)}.pdf`
        return pdfResponse(buffer, filename)
      }

      if (type === 'contract') {
        // Look up latest contract for this event scoped to this chef
        const { data: contractRow } = await ctx.db
          .from('event_contracts')
          .select('id')
          .eq('event_id', event_id)
          .eq('chef_id', ctx.tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!contractRow) return apiNotFound('Contract for this event')

        const data = await fetchContractData(contractRow.id, {
          chefId: ctx.tenantId,
          clientEntityId: null,
        })
        if (!data) return apiNotFound('Contract document data')

        const pdf = new PDFLayout()
        renderContract(pdf, data)
        const buffer = pdf.toBuffer()
        const filename = `contract-${event_id.slice(0, 8)}.pdf`
        return pdfResponse(buffer, filename)
      }
    } catch (err) {
      console.error('[v2/documents/generate] PDF generation error:', err)
      return apiError('generation_failed', 'PDF generation failed', 500)
    }

    return apiError('unsupported_type', `Document type '${type}' is not supported`, 400)
  },
  { scopes: ['documents:write'] }
)

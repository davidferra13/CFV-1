import { z } from 'zod'
import type { QueueVendorCatalogResult } from '@/lib/vendors/catalog-import-actions'

export const VendorDocumentTypeSchema = z.enum([
  'catalog',
  'invoice',
  'expense',
  'supplier_doc',
  'other',
])

export type VendorDocumentType = z.infer<typeof VendorDocumentTypeSchema>

export type VendorDocumentStatus = 'uploaded' | 'processing' | 'review' | 'completed' | 'failed'

export type VendorDocumentUploadRow = {
  id: string
  vendor_id: string
  document_type: VendorDocumentType
  source_filename: string
  file_mime_type: string | null
  file_size_bytes: number
  file_hash: string | null
  status: VendorDocumentStatus
  parse_summary: Record<string, unknown>
  error_message: string | null
  created_at: string
  processed_at: string | null
  download_url: string | null
}

export type UploadVendorDocumentResult =
  | {
      success: true
      uploadId: string
      status: VendorDocumentStatus
      message: string
      queueResult?: QueueVendorCatalogResult
    }
  | { success: false; error: string; existingUploadId?: string }

export const ApplyVendorDocumentDraftSchema = z.object({
  upload_id: z.string().uuid(),
  preview_only: z.boolean().default(false),
  force_apply: z.boolean().default(false),
})

export type ApplyVendorDocumentDraftInput = z.input<typeof ApplyVendorDocumentDraftSchema>

export type ApplyVendorDocumentDraftResult =
  | {
      success: true
      documentType: 'invoice' | 'expense'
      previewOnly?: boolean
      createdInvoiceId?: string
      createdExpenseIds?: string[]
      duplicateWarnings?: string[]
      draftSummary?: Record<string, unknown>
      message: string
    }
  | { success: false; error: string }

export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export type ParsedCatalogRows = {
  rows: {
    vendor_item_name: string
    vendor_sku: string | null
    unit_price_cents: number
    unit_size: number | null
    unit_measure: string | null
    notes: string | null
    source_row_number: number
  }[]
  totalRows: number
  skippedRows: number
  lineErrors: string[]
  priceFormat: 'dollars' | 'cents'
}

export type DraftInvoiceLineItem = {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export type DraftInvoiceSummary = {
  line_items_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  invoice_date_guess: string | null
  invoice_number_guess: string | null
  line_items: DraftInvoiceLineItem[]
  line_items_preview: DraftInvoiceLineItem[]
  warnings: string[]
}

export type DraftExpenseRow = {
  description: string
  amount_cents: number
  expense_date: string | null
  category: string
}

export type DraftExpenseSummary = {
  expense_rows_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  rows: DraftExpenseRow[]
  rows_preview: DraftExpenseRow[]
  warnings: string[]
}

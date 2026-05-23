// lib/openclaw/archive-digester-types.ts
// Types for OpenClaw Archive Digester pipeline (OPENCLAW #2)

export type DigesterJobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type DigesterFileType = 'invoice' | 'receipt' | 'price_list' | 'catalog' | 'menu' | 'unknown'

export interface ArchiveDigesterJob {
  jobId: string
  filePath: string
  fileType: DigesterFileType
  status: DigesterJobStatus
  extractedData: DigesterExtractedData | null
  tenantId: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface DigesterExtractedData {
  fileType: DigesterFileType
  items: ExtractedLineItem[]
  vendor?: string
  invoiceDate?: string
  totalAmount?: number
  currency?: string
  rawText?: string
  confidence: number
}

export interface ExtractedLineItem {
  name: string
  quantity?: number
  unit?: string
  unitPrice?: number
  totalPrice?: number
  sku?: string
  category?: string
}

export interface CreateDigesterJobInput {
  filePath: string
  tenantId?: string
}

export interface DigesterJobListResult {
  jobs: ArchiveDigesterJob[]
  total: number
  runAt: string
}

export interface DigesterProcessResult {
  jobId: string
  success: boolean
  extractedItemCount: number
  error?: string
}

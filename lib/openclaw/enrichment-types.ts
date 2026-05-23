// lib/openclaw/enrichment-types.ts
// Types for OpenClaw Scraper Enrichment pipeline (OPENCLAW #1)

export type EnrichmentJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export interface EnrichmentJob {
  jobId: string
  ingredientId: string
  ingredientName: string
  status: EnrichmentJobStatus
  qualityScore: number | null
  gapFlags: string[]
  enrichedFields: EnrichedFields | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface EnrichedFields {
  canonicalName?: string
  aliases?: string[]
  category?: string
  subcategory?: string
  unitOptions?: string[]
  season?: string
  availability?: string
  confidenceScore: number
}

export interface EnrichmentGap {
  ingredientId: string
  ingredientName: string
  gapType: 'missing_category' | 'missing_unit' | 'missing_canonical' | 'low_confidence' | 'no_price'
  severity: 'high' | 'medium' | 'low'
}

export interface EnrichmentBatchResult {
  totalQueued: number
  processed: number
  enriched: number
  failed: number
  skipped: number
  gaps: EnrichmentGap[]
  runAt: string
}

export interface EnrichmentQualityReport {
  totalIngredients: number
  fullyEnriched: number
  partiallyEnriched: number
  unenriched: number
  averageQualityScore: number
  topGaps: EnrichmentGap[]
  runAt: string
}

// ---------------------------------------------------------------------------
// P14: Enrichment job tracking, source provenance, quality scoring
// ---------------------------------------------------------------------------

export type EnrichmentSource =
  | 'openclaw_scraper'
  | 'openclaw_synthesizer'
  | 'pie_bridge'
  | 'manual_import'
  | 'archive_digester'

export interface EnrichmentJobRow {
  id: string
  batchName: string
  source: EnrichmentSource
  status: EnrichmentJobStatus
  totalRecords: number
  enrichedCount: number
  qualityScore: number | null
  startedAt: string | null
  completedAt: string | null
  tenantId: string
  createdAt: string
}

export interface EnrichmentQualityScore {
  jobId: string
  completeness: number
  accuracy: number
  freshness: number
  overall: number
  gradedAt: string
}

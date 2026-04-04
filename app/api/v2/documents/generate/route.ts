// API v2: Document Generation
// POST /api/v2/documents/generate
// Body: { event_id: "...", type: "summary" | "grocery" | ... | "all" }
//
// Reports current snapshot status for operational event documents.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  SNAPSHOT_DOCUMENT_TYPES,
  isSnapshotDocumentType,
} from '@/lib/documents/document-definitions'
import { withApiAuth, apiSuccess, apiValidationError, apiError, apiNotFound } from '@/lib/api/v2'

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

    const { event_id, type } = parsed.data

    // Verify event belongs to tenant
    const { data: event } = await ctx.db
      .from('events')
      .select('id, status, tenant_id')
      .eq('id', event_id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) return apiNotFound('Event')

    if (!isSnapshotDocumentType(type)) {
      return apiSuccess({
        event_id,
        requested_type: type,
        supported: false,
        message:
          'API v2 document generation is currently wired only for operational event packet documents.',
        supported_types: SNAPSHOT_DOCUMENT_TYPES,
      })
    }

    // Check if document already exists for this event + type
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
        : `API-triggered generation is not wired yet. Use the internal document generation UI for ${type}.`,
      internal_generation_endpoint: `/api/documents/${event_id}?type=${type}`,
      supported_types: SNAPSHOT_DOCUMENT_TYPES,
    })
  },
  { scopes: ['documents:write'] }
)

// API v2: Document Generation
// POST /api/v2/documents/generate
// Body: { event_id: "...", type: "invoice" | "quote" | "receipt" | "contract" }
//
// Triggers document generation for a given event.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError, apiNotFound } from '@/lib/api/v2'

const GenerateDocBody = z.object({
  event_id: z.string().uuid(),
  type: z.enum([
    'invoice',
    'quote',
    'receipt',
    'contract',
    'menu',
    'prep_list',
    'grocery_list',
    'timeline',
  ]),
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

    // Check if document already exists for this event + type
    const { data: existing } = await ctx.db
      .from('document_snapshots' as any)
      .select('id, document_type, created_at')
      .eq('event_id', event_id)
      .eq('document_type', type)
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return apiSuccess({
      event_id,
      document_type: type,
      existing_snapshot: existing ?? null,
      message: existing
        ? `Existing ${type} snapshot found. Use GET /api/v2/documents to list all.`
        : `Document generation for ${type} is available through the UI. API-triggered generation coming soon.`,
      _note:
        'Full programmatic document generation will be available in a future update. Currently, document snapshots can be read via the documents list endpoint.',
    })
  },
  { scopes: ['documents:write'] }
)

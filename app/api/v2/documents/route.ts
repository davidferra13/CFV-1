// API v2: Event Document Snapshots - List
// GET /api/v2/documents?event_id=...&type=summary&page=1&per_page=50

import { isSnapshotDocumentType } from '@/lib/documents/document-definitions'
import { withApiAuth, apiSuccess, apiError, parsePagination, paginationMeta } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const eventId = url.searchParams.get('event_id')
    const type = url.searchParams.get('type')?.trim().toLowerCase() ?? null

    if (type && !isSnapshotDocumentType(type)) {
      return apiError(
        'unsupported_type',
        'Supported document types are summary, grocery, foh, prep, execution, checklist, packing, reset, travel, shots, and all.',
        422
      )
    }

    let query = ctx.db
      .from('event_document_snapshots' as any)
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('generated_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (type) query = query.eq('document_type', type)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch documents', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['documents:read'] }
)

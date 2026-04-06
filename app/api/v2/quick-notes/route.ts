// API v2: Quick Notes - List & Create
// GET  /api/v2/quick-notes?status=raw&limit=20
// POST /api/v2/quick-notes  { text: "..." }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'

const CreateNoteBody = z.object({
  text: z.string().min(1).max(1000),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'raw'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)

    const { data, error } = await (ctx.db as any)
      .from('chef_quick_notes')
      .select('id, text, status, triaged_to, triaged_ref_id, created_at, updated_at')
      .eq('chef_id', ctx.tenantId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return apiError('fetch_failed', 'Failed to fetch notes', 500)
    }

    return apiSuccess({ notes: data ?? [], count: data?.length ?? 0 })
  },
  { scopes: ['quick-notes:read'] }
)

export const POST = withApiAuth(
  async (req, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Invalid JSON body', 400)
    }

    const parsed = CreateNoteBody.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error)
    }

    const { data: created, error } = await (ctx.db as any)
      .from('chef_quick_notes')
      .insert({
        chef_id: ctx.tenantId,
        text: parsed.data.text.trim(),
        status: 'raw',
      })
      .select('id, text, status, created_at')
      .single()

    if (error || !created) {
      return apiError('create_failed', 'Failed to create note', 500)
    }

    return apiCreated(created)
  },
  { scopes: ['quick-notes:write'] }
)

// API v2: Clients - Get & Update by ID
// GET   /api/v2/clients/:id
// PATCH /api/v2/clients/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateClientBody = z
  .object({
    full_name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.enum(['active', 'inactive', 'lead', 'archived']).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    notes: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    const { data, error } = await ctx.db
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Client')
    return apiSuccess(data)
  },
  { scopes: ['clients:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateClientBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify client belongs to tenant
    const { data: existing } = await ctx.db
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Client')

    const { data, error } = await ctx.db
      .from('clients')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/clients] Update error:', error)
      return apiError('update_failed', 'Failed to update client', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['clients:write'] }
)

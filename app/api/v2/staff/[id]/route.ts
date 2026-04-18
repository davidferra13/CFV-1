// API v2: Staff - Get, Update & Deactivate by ID
// GET    /api/v2/staff/:id
// PATCH  /api/v2/staff/:id
// DELETE /api/v2/staff/:id (deactivates, not hard delete)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNoContent,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/v2'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { revokeAllSessionsForUser } from '@/lib/auth/account-access'

const UpdateStaffBody = z
  .object({
    name: z.string().min(1).optional(),
    role: z
      .enum([
        'sous_chef',
        'kitchen_assistant',
        'service_staff',
        'server',
        'bartender',
        'dishwasher',
        'other',
      ])
      .optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    hourly_rate_cents: z.number().int().min(0).optional(),
    notes: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Staff member')

    const { data, error } = await (ctx.db as any)
      .from('staff_members')
      .select('*')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Staff member')
    return apiSuccess(data)
  },
  { scopes: ['staff:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Staff member')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateStaffBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.db as any)
      .from('staff_members')
      .select('id')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Staff member')

    const { data, error } = await (ctx.db as any)
      .from('staff_members')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/staff] Update error:', error)
      return apiError('update_failed', 'Failed to update staff member', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['staff:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Staff member')

    // Soft deactivate (not hard delete)
    const { error } = await (ctx.db as any)
      .from('staff_members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/staff] Deactivate error:', error)
      return apiError('delete_failed', 'Failed to deactivate staff member', 500)
    }

    // Revoke active JWT sessions so deactivated staff cannot continue accessing the portal
    try {
      const [roleRow] = await db
        .select({ authUserId: userRoles.authUserId })
        .from(userRoles)
        .where(and(eq(userRoles.entityId, id), eq(userRoles.role, 'staff')))
        .limit(1)

      if (roleRow?.authUserId) {
        await revokeAllSessionsForUser(roleRow.authUserId)
      }
    } catch (err) {
      console.error('[non-blocking] Failed to revoke staff sessions on deactivation', err)
    }

    return apiNoContent()
  },
  { scopes: ['staff:write'] }
)

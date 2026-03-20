// API v2: Safety Backup Contact by ID
// PATCH  /api/v2/safety/backup-contacts/:id
// DELETE /api/v2/safety/backup-contacts/:id  (deactivate)

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
import { updateBackupContact, deactivateBackupContact } from '@/lib/safety/backup-chef-actions'

const UpdateBody = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  })
  .passthrough()

export const PATCH = withApiAuth(
  async (req: NextRequest, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Backup contact')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    try {
      await updateBackupContact(id, parsed.data as any)
      return apiSuccess({ updated: true })
    } catch (err: any) {
      return apiError('update_failed', err.message ?? 'Failed to update contact', 500)
    }
  },
  { scopes: ['safety:write'] }
)

export const DELETE = withApiAuth(
  async (_req, _ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Backup contact')

    try {
      await deactivateBackupContact(id)
      return apiNoContent()
    } catch (err: any) {
      return apiError('deactivate_failed', err.message ?? 'Failed to deactivate contact', 500)
    }
  },
  { scopes: ['safety:write'] }
)

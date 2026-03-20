// API v2: Commerce Register - Get current session & manage register
// GET  /api/v2/commerce/register
// POST /api/v2/commerce/register  { action: 'open' | 'close' | 'suspend' | 'resume', ...data }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import {
  getCurrentRegisterSession,
  openRegister,
  closeRegister,
  suspendRegister,
  resumeRegister,
} from '@/lib/commerce/register-actions'

const OpenBody = z.object({
  action: z.literal('open'),
  sessionName: z.string().optional(),
  openingCashCents: z.number().int().nonnegative(),
})

const CloseBody = z.object({
  action: z.literal('close'),
  sessionId: z.string().uuid(),
  closingCashCents: z.number().int().nonnegative(),
  closeNotes: z.string().optional(),
})

const SuspendBody = z.object({
  action: z.literal('suspend'),
  sessionId: z.string().uuid(),
  notes: z.string().optional(),
})

const ResumeBody = z.object({
  action: z.literal('resume'),
  sessionId: z.string().uuid(),
})

const RegisterActionBody = z.discriminatedUnion('action', [
  OpenBody,
  CloseBody,
  SuspendBody,
  ResumeBody,
])

export const GET = withApiAuth(
  async (_req, _ctx) => {
    try {
      const session = await getCurrentRegisterSession()
      return apiSuccess(session)
    } catch (err: any) {
      return apiError('fetch_failed', err.message ?? 'Failed to fetch register session', 500)
    }
  },
  { scopes: ['commerce:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, _ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RegisterActionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const data = parsed.data

    try {
      switch (data.action) {
        case 'open': {
          const result = await openRegister({
            sessionName: data.sessionName,
            openingCashCents: data.openingCashCents,
          })
          return apiSuccess(result)
        }
        case 'close': {
          const result = await closeRegister(data.sessionId, data.closingCashCents, data.closeNotes)
          return apiSuccess(result)
        }
        case 'suspend': {
          await suspendRegister(data.sessionId, data.notes)
          return apiSuccess({ status: 'suspended' })
        }
        case 'resume': {
          await resumeRegister(data.sessionId)
          return apiSuccess({ status: 'resumed' })
        }
      }
    } catch (err: any) {
      return apiError('register_action_failed', err.message ?? 'Register action failed', 500)
    }
  },
  { scopes: ['commerce:write'] }
)

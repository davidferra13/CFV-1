import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiGuard } from '@/lib/api/guard'
import type { AuthUser } from '@/lib/auth/get-user'
import { sendConversionEvent, type CAPIEvent } from '@/lib/tracking/meta-capi'

// Client collection is authenticated and cannot originate financial events.
// Authoritative payment conversions belong to the server payment workflow.
const collectionSchema = z.object({
  event_name: z.enum(['PageView', 'ViewContent', 'Lead', 'Contact', 'CompleteRegistration']),
  event_id: z.string().min(1).max(128).optional(),
  event_source_url: z.string().url().max(2048).optional(),
  user_data: z
    .object({
      fbc: z.string().max(256).optional(),
      fbp: z.string().max(256).optional(),
    })
    .optional(),
  custom_data: z
    .object({
      content_name: z.string().max(200).optional(),
      content_category: z.string().max(200).optional(),
    })
    .optional(),
})
type Collection = z.infer<typeof collectionSchema>

export const POST = withApiGuard<AuthUser, Record<string, string | string[]>, Collection>({
  auth: 'auth',
  bodySchema: collectionSchema,
  rateLimit: {
    key: ({ request }) =>
      'meta-capi:' +
      (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        'unknown'),
    max: 30,
    windowMs: 60_000,
  },
  handler: async ({ request, body }) => {
    if (body.event_source_url) {
      const source = new URL(body.event_source_url)
      if (
        !['http:', 'https:'].includes(source.protocol) ||
        source.username ||
        source.password ||
        source.origin !== new URL(request.url).origin
      ) {
        return NextResponse.json({ error: 'Invalid event source' }, { status: 400 })
      }
    }
    const event: CAPIEvent = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      user_data: {
        ip:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        fbc: body.user_data?.fbc,
        fbp: body.user_data?.fbp,
      },
      custom_data: body.custom_data,
    }
    const result = await sendConversionEvent(event)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Tracking event could not be sent' },
        { status: 502 }
      )
    }
    return NextResponse.json(result)
  },
})

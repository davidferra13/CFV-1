import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiGuard } from '@/lib/api/guard'
import { createServerClient } from '@/lib/db/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const confirmationSchema = z.object({
  dietary_restrictions: z.array(z.string().trim().min(1).max(100)).max(50),
  allergies: z.array(z.string().trim().min(1).max(100)).max(50),
  allergy_severity: z
    .enum(['preference', 'intolerance', 'allergy', 'life_threatening'])
    .nullable()
    .default(null),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'extra_hot']).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
})
type Confirmation = z.infer<typeof confirmationSchema>
type Outreach = {
  id: string
  guest_id: string
  event_id: string
  tenant_id: string
  status: 'sent' | 'opened' | 'responded' | 'expired'
  expires_at: string
}
type OutreachAccess =
  | { response: NextResponse }
  | {
      db: ReturnType<typeof createServerClient>
      outreach: Outreach
      token: string
    }

function privateJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer',
    },
  })
}

// The UUID is the guest's capability. Tenant and event ownership always come
// from that capability record, never from URL/body IDs or a guest account.
async function loadOutreach(token: string): Promise<OutreachAccess> {
  if (!z.string().uuid().safeParse(token).success) {
    return { response: privateJson({ error: 'Invalid or expired link' }, 404) }
  }
  const db = createServerClient()
  const { data, error } = await db
    .from('dietary_outreach')
    .select('id, guest_id, event_id, tenant_id, status, expires_at')
    .eq('token', token)
    .single()
  const outreach = data as Outreach | null
  if (
    error ||
    !outreach ||
    ![outreach.id, outreach.guest_id, outreach.event_id, outreach.tenant_id].every(
      (value) => typeof value === 'string' && value.length > 0
    )
  ) {
    return { response: privateJson({ error: 'Invalid or expired link' }, 404) }
  }
  const expiresAt = new Date(outreach.expires_at).getTime()
  if (outreach.status === 'expired' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return {
      response: privateJson(
        { error: 'This link has expired. Please contact your host for a new one.' },
        410
      ),
    }
  }
  if (!['sent', 'opened', 'responded'].includes(outreach.status)) {
    return { response: privateJson({ error: 'Invalid or expired link' }, 404) }
  }
  return { db, outreach, token }
}

function scopedOutreach(
  access: Exclude<OutreachAccess, { response: NextResponse }>,
  values: Record<string, unknown>
) {
  return access.db
    .from('dietary_outreach')
    .update(values)
    .eq('id', access.outreach.id)
    .eq('token', access.token)
    .eq('tenant_id', access.outreach.tenant_id)
    .eq('event_id', access.outreach.event_id)
    .eq('guest_id', access.outreach.guest_id)
}

function guestQuery(access: Exclude<OutreachAccess, { response: NextResponse }>) {
  return access.db
    .from('event_guests')
    .select('id, full_name, dietary_restrictions, allergies, allergy_severity, spice_tolerance')
    .eq('id', access.outreach.guest_id)
    .eq('tenant_id', access.outreach.tenant_id)
    .eq('event_id', access.outreach.event_id)
}

const guestRateLimit = {
  key: ({ request }: { request: Request }) =>
    'dietary-confirm:' +
    (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'),
  max: 30,
  windowMs: 60_000,
}

export const GET = withApiGuard<null>({
  auth: 'none',
  rateLimit: guestRateLimit,
  handler: async ({ params }) => {
    const access = await loadOutreach(params.token)
    if ('response' in access) return access.response
    const { data: guest, error } = await guestQuery(access).single()
    if (error || !guest) return privateJson({ error: 'Guest record not found' }, 404)
    if (access.outreach.status === 'sent') {
      const { error: openedError } = await scopedOutreach(access, {
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
        .select('id')
        .single()
      if (openedError)
        return privateJson({ error: 'Unable to open this confirmation. Please retry.' }, 500)
    }
    return privateJson({
      guest_name: guest.full_name,
      dietary_restrictions: guest.dietary_restrictions || [],
      allergies: guest.allergies || [],
      allergy_severity: guest.allergy_severity || null,
      spice_tolerance: guest.spice_tolerance || null,
      already_responded: access.outreach.status === 'responded',
    })
  },
})

export const POST = withApiGuard<null, Record<string, string | string[]>, Confirmation>({
  auth: 'none',
  bodySchema: confirmationSchema,
  rateLimit: guestRateLimit,
  handler: async ({ params, body }) => {
    const access = await loadOutreach(params.token)
    if ('response' in access) return access.response
    const { data: guest, error: guestLookupError } = await guestQuery(access).single()
    if (guestLookupError || !guest) return privateJson({ error: 'Guest record not found' }, 404)
    const { error: guestError, data: savedGuest } = await access.db
      .from('event_guests')
      .update({
        dietary_restrictions: body.dietary_restrictions,
        allergies: body.allergies,
        allergy_severity: body.allergy_severity,
        spice_tolerance: body.spice_tolerance,
        dietary_confirmed_at: new Date().toISOString(),
        dietary_confirmed_via: 'email_outreach',
      })
      .eq('id', access.outreach.guest_id)
      .eq('tenant_id', access.outreach.tenant_id)
      .eq('event_id', access.outreach.event_id)
      .select('id')
      .single()
    if (guestError || !savedGuest) {
      return privateJson({ error: 'Failed to save dietary information' }, 500)
    }
    const { error: receiptError, data: receipt } = await scopedOutreach(access, {
      status: 'responded',
      responded_at: new Date().toISOString(),
      response_data: body,
    })
      .select('id')
      .single()
    if (receiptError || !receipt) {
      return privateJson(
        {
          error:
            'Dietary information was saved, but the confirmation could not be recorded. Please retry.',
        },
        500
      )
    }
    return privateJson({ success: true })
  },
})

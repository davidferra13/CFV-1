// Wix Webhook Handler
// Receives form submissions from Wix Automations (HTTP POST action).
// Accepts payload immediately (within 1250ms Wix deadline), queues for async processing.
// Follows the same pattern as app/api/webhooks/stripe/route.ts.
//
// Authentication note:
// Wix Automations HTTP Action does not support HMAC payload signing (unlike Stripe).
// We authenticate via a per-chef webhook_secret stored in wix_connections.
// The secret MUST be passed in the X-Wix-Webhook-Secret header.
// Query param ?secret= was removed in security round 6 - secrets in URLs leak to logs.

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { processWixSubmission } from '@/lib/wix/process'
import { logWebhookEvent } from '@/lib/webhooks/audit-log'
import crypto from 'crypto'

export async function POST(req: Request) {
  let body: string
  let payload: Record<string, unknown>

  try {
    body = await req.text()
    payload = JSON.parse(body)
  } catch {
    console.error('[Wix Webhook] Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract submission ID for idempotency
  // Wix payloads may include submissionId at top level or nested
  const wixSubmissionId = extractSubmissionId(payload)
  if (!wixSubmissionId) {
    console.error('[Wix Webhook] No submission ID found in payload')
    return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 })
  }

  // Authenticate: find the chef connection using webhook secret (header only).
  // Query param ?secret= removed - secrets in URLs leak to server logs and CDN logs.
  const secret = req.headers.get('x-wix-webhook-secret')

  if (!secret) {
    console.error('[Wix Webhook] No X-Wix-Webhook-Secret header provided')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })

  // Look up the connection by webhook secret
  const { data: connection, error: connError } = await supabase
    .from('wix_connections')
    .select('chef_id, tenant_id, auto_create_inquiry, webhook_secret')
    .eq('webhook_secret', secret)
    .single()

  if (connError || !connection) {
    console.error('[Wix Webhook] Invalid webhook secret')
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  // Secondary constant-time comparison to prevent timing attacks.
  // The DB query already validates the secret, but this adds defense-in-depth
  // against any timing side-channel in application-level secret handling.
  const secretBuf = Buffer.from(secret)
  const storedBuf = Buffer.from(connection.webhook_secret ?? '')
  const secretValid =
    secretBuf.length === storedBuf.length && crypto.timingSafeEqual(secretBuf, storedBuf)
  if (!secretValid) {
    console.error('[Wix Webhook] Constant-time secret check failed')
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  console.log(
    '[Wix Webhook] Received submission:',
    wixSubmissionId,
    'for tenant:',
    connection.tenant_id
  )

  // Idempotency check: has this submission already been received?
  const { data: existing } = await supabase
    .from('wix_submissions')
    .select('id, status')
    .eq('tenant_id', connection.tenant_id)
    .eq('wix_submission_id', wixSubmissionId)
    .single()

  if (existing) {
    console.log('[Wix Webhook] Submission already received (idempotent):', wixSubmissionId)
    return NextResponse.json({ received: true, cached: true })
  }

  // Insert the raw submission into staging table (fast - meets 1250ms deadline)
  const { data: submission, error: insertError } = await supabase
    .from('wix_submissions')
    .insert({
      tenant_id: connection.tenant_id,
      wix_submission_id: wixSubmissionId,
      wix_form_id: (payload.formId as string) || null,
      raw_payload: payload as any,
      status: 'pending',
    } as any)
    .select('id')
    .single()

  if (insertError) {
    // Handle unique constraint violation (race condition)
    if (insertError.code === '23505') {
      console.log('[Wix Webhook] Duplicate submission (race):', wixSubmissionId)
      return NextResponse.json({ received: true, cached: true })
    }
    console.error('[Wix Webhook] Insert failed:', insertError.message)
    return NextResponse.json({ error: 'Storage failed' }, { status: 500 })
  }

  // Return 200 immediately (within Wix's 1250ms deadline)
  // Process async - don't await this in the response path
  if (connection.auto_create_inquiry && submission) {
    // Fire-and-forget: process the submission asynchronously
    // In self-hosted, use waitUntil if available; otherwise the cron picks it up
    processWixSubmission(submission.id).catch((err) => {
      console.error('[Wix Webhook] Async processing failed (cron will retry):', err)
    })
  }

  await logWebhookEvent({
    provider: 'wix',
    eventType: 'form_submission',
    providerEventId: wixSubmissionId,
    status: 'processed',
    result: { submissionId: submission?.id, tenantId: connection.tenant_id },
    payloadSizeBytes: body.length,
  })
  return NextResponse.json({ received: true, submissionId: submission?.id })
}

// ─── Extract Submission ID ───────────────────────────────────────────────
// Wix payloads vary; look for common ID field patterns.
// Falls back to generating a hash-based ID for dedup.

function extractSubmissionId(payload: Record<string, unknown>): string | null {
  // Direct ID fields
  if (typeof payload.submissionId === 'string') return payload.submissionId
  if (typeof payload.submission_id === 'string') return payload.submission_id
  if (typeof payload.id === 'string') return payload.id

  // Nested in data
  if (payload.data && typeof payload.data === 'object') {
    const data = payload.data as Record<string, unknown>
    if (typeof data.submissionId === 'string') return data.submissionId
    if (typeof data.id === 'string') return data.id
  }

  // Fallback: generate deterministic ID from payload hash
  // This ensures the same payload produces the same ID for idempotency
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 32)

  return `wix_hash_${hash}`
}

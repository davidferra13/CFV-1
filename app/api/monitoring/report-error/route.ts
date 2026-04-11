// API route for client-side error reporting
// Accepts error details from the browser and forwards to Sentry via the REST reporter.
// Keeps the DSN server-side only (more secure than exposing NEXT_PUBLIC_SENTRY_DSN).

import { NextRequest, NextResponse } from 'next/server'
import { reportError } from '@/lib/monitoring/sentry-reporter'
import { checkRateLimit } from '@/lib/rateLimit'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 reports per minute per IP to prevent flooding
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    try {
      await checkRateLimit(`error-report:${ip}`, 20, 60_000)
    } catch {
      return NextResponse.json({ ok: false, error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json()
    const { message, stack, name, digest, tags } = body as {
      message?: string
      stack?: string
      name?: string
      digest?: string
      tags?: Record<string, string>
    }

    if (!message) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Reconstruct an Error object from the client payload
    const error = new Error(message)
    error.name = name || 'ClientError'
    if (stack) error.stack = stack

    const mergedTags: Record<string, string> = {
      source: 'client',
      boundary: 'error-boundary',
      ...tags,
    }
    if (digest) mergedTags.digest = digest

    await reportError(error, { tags: mergedTags })

    await recordPlatformEvent({
      eventKey: 'system.client_error_reported',
      source: 'system_monitoring',
      actorType: 'system',
      subjectType: 'client_error',
      subjectId: digest ?? `${error.name}:${message}`.slice(0, 120),
      summary: `${error.name}: ${message}`.slice(0, 180),
      details: stack?.slice(0, 1200) ?? null,
      metadata: {
        ...extractRequestMetadata(request.headers),
        digest,
        tags: mergedTags,
      },
      alertDedupeKey: `client-error:${digest ?? `${error.name}:${message}`}`,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never fail - this is a best-effort endpoint
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

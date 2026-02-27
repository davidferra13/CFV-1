// API route for client-side error reporting
// Accepts error details from the browser and forwards to Sentry via the REST reporter.
// Keeps the DSN server-side only (more secure than exposing NEXT_PUBLIC_SENTRY_DSN).

import { NextRequest, NextResponse } from 'next/server'
import { reportError } from '@/lib/monitoring/sentry-reporter'

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ ok: true })
  } catch {
    // Never fail — this is a best-effort endpoint
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

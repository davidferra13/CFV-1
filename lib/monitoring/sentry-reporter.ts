// Lightweight Sentry error reporter — no SDK dependency
// Sends errors to Sentry via the envelope REST API
// Fire-and-forget, non-blocking — failures never affect the app

type SentryDsnParts = {
  publicKey: string
  host: string
  projectId: string
}

/**
 * Parse a Sentry DSN into its components.
 * DSN format: https://<key>@<host>/<project_id>
 */
function parseDsn(dsn: string): SentryDsnParts | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const host = url.hostname
    // Project ID is the last segment of the path
    const projectId = url.pathname.replace(/^\//, '')
    if (!publicKey || !host || !projectId) return null
    return { publicKey, host, projectId }
  } catch {
    return null
  }
}

let cachedDsn: SentryDsnParts | null | undefined

function getDsn(): SentryDsnParts | null {
  if (cachedDsn !== undefined) return cachedDsn
  const raw = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  cachedDsn = raw ? parseDsn(raw) : null
  return cachedDsn
}

/**
 * Build a Sentry envelope payload for an error event.
 * Sentry envelopes use newline-delimited JSON:
 *   line 1: envelope header
 *   line 2: item header
 *   line 3: item payload (the event)
 */
function buildEnvelope(
  dsn: SentryDsnParts,
  error: Error,
  tags?: Record<string, string>,
  extra?: Record<string, unknown>
): string {
  const eventId = crypto.randomUUID().replace(/-/g, '')
  const timestamp = new Date().toISOString()

  // Parse stack trace into Sentry frames
  const frames = parseStackTrace(error.stack)

  const event: Record<string, unknown> = {
    event_id: eventId,
    timestamp,
    platform: 'node',
    level: 'error',
    server_name: 'chefflow',
    environment: process.env.NODE_ENV || 'development',
    exception: {
      values: [
        {
          type: error.name || 'Error',
          value: error.message,
          stacktrace: frames.length > 0 ? { frames } : undefined,
        },
      ],
    },
    tags: {
      runtime: 'node',
      app: 'chefflow',
      ...tags,
    },
    extra,
  }

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: timestamp,
    dsn: `https://${dsn.publicKey}@${dsn.host}/${dsn.projectId}`,
  })

  const itemHeader = JSON.stringify({
    type: 'event',
    content_type: 'application/json',
  })

  const itemPayload = JSON.stringify(event)

  return `${envelopeHeader}\n${itemHeader}\n${itemPayload}`
}

type SentryFrame = {
  filename?: string
  function?: string
  lineno?: number
  colno?: number
  in_app?: boolean
}

/**
 * Parse a JS stack trace string into Sentry-compatible frames.
 * Sentry expects frames in reverse order (oldest first).
 */
function parseStackTrace(stack?: string): SentryFrame[] {
  if (!stack) return []

  const lines = stack.split('\n').slice(1) // Skip the first line (error message)
  const frames: SentryFrame[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match "at functionName (file:line:col)" or "at file:line:col"
    const match = trimmed.match(/^at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/)
    if (match) {
      frames.push({
        function: match[1] || '<anonymous>',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
        in_app: !match[2]?.includes('node_modules'),
      })
    }
  }

  // Sentry wants oldest frame first
  return frames.reverse()
}

/**
 * Send an error to Sentry via the envelope API.
 * Non-blocking — fire and forget. Failures are silently logged.
 *
 * @param error - The error to report
 * @param context - Optional tags and extra data
 */
export async function reportError(
  error: Error,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const dsn = getDsn()
    if (!dsn) return // No DSN configured — skip silently

    const envelope = buildEnvelope(dsn, error, context?.tags, context?.extra)
    const url = `https://${dsn.host}/api/${dsn.projectId}/envelope/`

    // Fire and forget — don't await in production usage
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=chefflow-reporter/1.0`,
      },
      body: envelope,
    }).catch((fetchErr) => {
      // Swallow fetch errors — never let reporting break the app
      console.warn('[sentry-reporter] Failed to send error:', fetchErr?.message)
    })
  } catch (err) {
    // Swallow all errors — reporting must never affect the app
    console.warn('[sentry-reporter] Envelope build failed:', (err as Error)?.message)
  }
}

/**
 * Report an error with ChefFlow-specific business context.
 * This is the main entry point for server action error reporting.
 */
export function reportAppError(
  error: Error,
  context?: {
    tenantId?: string
    chefId?: string
    eventId?: string
    action?: string
    page?: string
    category?: string
  }
): void {
  const tags: Record<string, string> = {}
  const extra: Record<string, unknown> = {}

  if (context?.action) tags.action = context.action
  if (context?.page) tags.page = context.page
  if (context?.category) tags.category = context.category
  if (context?.tenantId) extra.tenantId = context.tenantId
  if (context?.chefId) extra.chefId = context.chefId
  if (context?.eventId) extra.eventId = context.eventId

  // Add AppError-specific fields if present
  const appErr = error as any
  if (appErr.code) tags.error_code = appErr.code
  if (appErr.category) tags.error_category = appErr.category
  if (appErr.traceId) extra.traceId = appErr.traceId

  // Fire and forget — never block the caller
  reportError(error, { tags, extra }).catch(() => {
    // Already handled inside reportError, but just in case
  })
}

import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { checkRateLimit } from '@/lib/rateLimit'
import { readJsonBodyWithLimit } from '@/lib/api/request-body'
import { verifyTurnstileToken } from '@/lib/security/turnstile'

type HeaderReader = {
  get(name: string): string | null
}

type PublicIntentRateLimitOptions = {
  keyPrefix: string
  max: number
  windowMs: number
  message?: string
}

type PublicIntentEmailRateLimitOptions<TBody> = PublicIntentRateLimitOptions & {
  value?: unknown
  getValue?: (body: TBody | undefined) => unknown
}

type PublicIntentJsonBodyOptions = {
  maxBytes: number
  invalidJsonMessage?: string
  payloadTooLargeMessage?: string
  emptyBodyMessage?: string
}

type PublicIntentHoneypotOptions<TBody> = {
  field?: string
  value?: unknown
  getValue?: (body: TBody | undefined) => unknown
  message?: string
}

type PublicIntentTurnstileOptions<TBody> = {
  token?: unknown
  getToken?: (body: TBody | undefined) => unknown
  required?: boolean
  message?: string
}

export type PublicIntentRequestMetadata = {
  ip: string
  host: string | null
  origin: string | null
  referer: string | null
  userAgent: string | null
}

export type PublicIntentGuardErrorCode =
  | 'payload_too_large'
  | 'invalid_json'
  | 'rate_limited'
  | 'honeypot'
  | 'captcha_failed'

export type PublicIntentGuardError = {
  code: PublicIntentGuardErrorCode
  status: 200 | 400 | 413 | 429
  message: string
}

export type PublicIntentGuardSuccess<TBody> = {
  ok: true
  metadata: PublicIntentRequestMetadata
  body: TBody | undefined
}

export type PublicIntentGuardFailure<TBody> = {
  ok: false
  metadata: PublicIntentRequestMetadata
  body: TBody | undefined
  error: PublicIntentGuardError
}

export type PublicIntentGuardResult<TBody> =
  | PublicIntentGuardSuccess<TBody>
  | PublicIntentGuardFailure<TBody>

export type PublicIntentGuardOptions<TBody> = {
  action: string
  request?: Request
  headers?: HeaderReader
  body?: PublicIntentJsonBodyOptions
  rateLimit?: {
    ip?: PublicIntentRateLimitOptions
    email?: PublicIntentEmailRateLimitOptions<TBody>
  }
  honeypot?: PublicIntentHoneypotOptions<TBody>
  turnstile?: PublicIntentTurnstileOptions<TBody>
}

function getHeader(headers: HeaderReader | undefined, name: string): string | null {
  return headers?.get(name) ?? null
}

function cleanHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 300)
}

function normalizeIpCandidate(value: string): string | null {
  let candidate = value.trim()
  if (!candidate) return null

  if (candidate.startsWith('[')) {
    const end = candidate.indexOf(']')
    if (end > 0) candidate = candidate.slice(1, end)
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.replace(/:\d+$/, '')
  }

  return isIP(candidate) ? candidate : null
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null
  for (const part of value.split(',')) {
    const ip = normalizeIpCandidate(part)
    if (ip) return ip
  }
  return null
}

export function extractPublicIntentMetadata(
  source: Request | HeaderReader | undefined
): PublicIntentRequestMetadata {
  const headers = source instanceof Request ? source.headers : source
  const ip =
    firstForwardedIp(getHeader(headers, 'cf-connecting-ip')) ||
    firstForwardedIp(getHeader(headers, 'fly-client-ip')) ||
    firstForwardedIp(getHeader(headers, 'x-real-ip')) ||
    firstForwardedIp(getHeader(headers, 'x-forwarded-for')) ||
    'unknown'

  return {
    ip,
    host: cleanHeaderValue(getHeader(headers, 'host')),
    origin: cleanHeaderValue(getHeader(headers, 'origin')),
    referer: cleanHeaderValue(getHeader(headers, 'referer')),
    userAgent: cleanHeaderValue(getHeader(headers, 'user-agent')),
  }
}

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

export function normalizePublicIntentEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return null
  return normalized
}

function publicIntentRateLimitKey(prefix: string, subject: string): string {
  return `${prefix}:${stableHash(subject)}`
}

async function runRateLimit(
  options: PublicIntentRateLimitOptions,
  subject: string
): Promise<PublicIntentGuardError | null> {
  try {
    await checkRateLimit(
      publicIntentRateLimitKey(options.keyPrefix, subject),
      options.max,
      options.windowMs
    )
    return null
  } catch {
    return {
      code: 'rate_limited',
      status: 429,
      message: options.message ?? 'Too many submissions. Please try again later.',
    }
  }
}

function readHoneypotValue<TBody>(
  body: TBody | undefined,
  options: PublicIntentHoneypotOptions<TBody>
): unknown {
  if (options.value !== undefined) return options.value
  if (options.getValue) return options.getValue(body)
  const field = options.field ?? 'website_url'
  if (body && typeof body === 'object' && field in body) {
    return (body as Record<string, unknown>)[field]
  }
  return undefined
}

function hasHoneypotValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function readTokenValue<TBody>(
  body: TBody | undefined,
  options: PublicIntentTurnstileOptions<TBody>
): string {
  const raw = options.token !== undefined ? options.token : options.getToken?.(body)
  return typeof raw === 'string' ? raw.trim() : ''
}

export async function guardPublicIntent<TBody = unknown>(
  options: PublicIntentGuardOptions<TBody>
): Promise<PublicIntentGuardResult<TBody>> {
  const request = options.request
  const headers = request?.headers ?? options.headers
  const metadata = extractPublicIntentMetadata(request ?? headers)
  let body: TBody | undefined

  if (options.rateLimit?.ip) {
    const error = await runRateLimit(options.rateLimit.ip, metadata.ip)
    if (error) return { ok: false, metadata, body, error }
  }

  if (options.body) {
    if (!request) {
      return {
        ok: false,
        metadata,
        body,
        error: {
          code: 'invalid_json',
          status: 400,
          message: options.body.invalidJsonMessage ?? 'Invalid request body',
        },
      }
    }

    const bodyResult = await readJsonBodyWithLimit<TBody>(request, options.body)
    if (!bodyResult.ok) {
      return {
        ok: false,
        metadata,
        body,
        error: {
          code: bodyResult.status === 413 ? 'payload_too_large' : 'invalid_json',
          status: bodyResult.status,
          message: bodyResult.error,
        },
      }
    }
    body = bodyResult.data
  }

  if (options.honeypot && hasHoneypotValue(readHoneypotValue(body, options.honeypot))) {
    return {
      ok: false,
      metadata,
      body,
      error: {
        code: 'honeypot',
        status: 200,
        message: options.honeypot.message ?? 'Submission received.',
      },
    }
  }

  if (options.rateLimit?.email) {
    const rawEmail =
      options.rateLimit.email.value !== undefined
        ? options.rateLimit.email.value
        : options.rateLimit.email.getValue?.(body)
    const email = normalizePublicIntentEmail(rawEmail)
    if (email) {
      const error = await runRateLimit(options.rateLimit.email, email)
      if (error) return { ok: false, metadata, body, error }
    }
  }

  if (options.turnstile && (options.turnstile.required !== false || options.turnstile.getToken)) {
    const token = readTokenValue(body, options.turnstile)
    const captcha = await verifyTurnstileToken(token, {
      ip: metadata.ip === 'unknown' ? undefined : metadata.ip,
      host: metadata.host ?? undefined,
    })
    if (!captcha.success) {
      return {
        ok: false,
        metadata,
        body,
        error: {
          code: 'captcha_failed',
          status: 400,
          message:
            options.turnstile.message ??
            captcha.error ??
            'CAPTCHA verification failed. Please refresh and try again.',
        },
      }
    }
  }

  return { ok: true, metadata, body }
}
